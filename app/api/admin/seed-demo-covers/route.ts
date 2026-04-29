import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'
import {
  DEMO_TOPICS,
  demoCoverBucket,
  demoCoverStoragePath,
} from '@/lib/mock-fixtures'

export const maxDuration = 60

// 分批预生成 demo 封面（Vercel Hobby 60s 限额，单次最多处理 limit 张）
// 调用方式：POST /api/admin/seed-demo-covers?confirm=yes&limit=3&force=false
//   confirm=yes 必填，防误触发
//   limit  默认 3，单次处理多少张（每张 ~15s）
//   force=true 强制重新生成已存在的，默认跳过
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  if (url.searchParams.get('confirm') !== 'yes') {
    return Response.json(
      { error: '需要 ?confirm=yes 防止误触发（会消耗 nano-banana 配额）' },
      { status: 400 }
    )
  }
  const force = url.searchParams.get('force') === 'true'
  const limitParam = parseInt(url.searchParams.get('limit') ?? '3', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 3

  if (!process.env.NANO_BANANA_API_KEY) {
    return Response.json({ error: 'NANO_BANANA_API_KEY 未配置' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const bucket = demoCoverBucket()

  const results: Array<{
    slug: string
    status: 'created' | 'skipped' | 'failed'
    url?: string
    error?: string
  }> = []

  // 先一次性拿 demo/ 目录下所有已存在文件，避免每个 slug 单独 list
  const { data: existingFiles } = await supabase.storage.from(bucket).list('demo', { limit: 1000 })
  const existingSet = new Set((existingFiles ?? []).map((f) => f.name))

  let createdCount = 0
  for (const topic of DEMO_TOPICS) {
    if (createdCount >= limit) break
    const path = demoCoverStoragePath(topic.slug)
    const fileName = `${topic.slug}.png`

    if (!force && existingSet.has(fileName)) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
      results.push({ slug: topic.slug, status: 'skipped', url: pub.publicUrl })
      continue
    }

    const prompt = buildCoverPrompt({
      brand: '星巴克',
      title: topic.title,
      hook: topic.hook,
      tone: '情感共鸣',
    })

    const { dataUri, error } = await generateCoverImage(prompt)
    if (!dataUri) {
      results.push({ slug: topic.slug, status: 'failed', error: error ?? 'no image' })
      continue
    }

    const match = dataUri.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i)
    if (!match) {
      results.push({ slug: topic.slug, status: 'failed', error: 'dataUri 格式不识别' })
      continue
    }
    const buffer = Buffer.from(match[2], 'base64')
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: match[1], upsert: true })

    if (upErr) {
      results.push({ slug: topic.slug, status: 'failed', error: upErr.message })
      continue
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    results.push({ slug: topic.slug, status: 'created', url: pub.publicUrl })
    createdCount++
  }

  const remaining = DEMO_TOPICS.length - existingSet.size - createdCount

  const summary = {
    total: DEMO_TOPICS.length,
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    remaining: Math.max(0, remaining),
  }

  return Response.json({ summary, results })
}
