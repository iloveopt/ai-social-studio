import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'
import {
  DEMO_TOPICS,
  demoCoverBucket,
  demoCoverStoragePath,
  type MockTopic,
} from '@/lib/mock-fixtures'

export const maxDuration = 60

// 并行预生成 demo 封面（Vercel 60s 内能挤完一批）
// 调用方式：POST /api/admin/seed-demo-covers?confirm=yes&limit=5&force=false
//   confirm=yes 必填，防误触发
//   limit  默认 5，单次并行处理多少张
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
  const limitParam = parseInt(url.searchParams.get('limit') ?? '5', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 5

  if (!process.env.NANO_BANANA_API_KEY) {
    return Response.json({ error: 'NANO_BANANA_API_KEY 未配置' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const bucket = demoCoverBucket()

  // 一次性 list 已存在文件
  const { data: existingFiles } = await supabase.storage.from(bucket).list('demo', { limit: 1000 })
  const existingSet = new Set((existingFiles ?? []).map((f) => f.name))

  // 拆分：要 skip 的 + 要生成的（最多 limit 个）
  const skipped: typeof DEMO_TOPICS = []
  const toGenerate: typeof DEMO_TOPICS = []
  for (const t of DEMO_TOPICS) {
    if (!force && existingSet.has(`${t.slug}.png`)) {
      skipped.push(t)
    } else if (toGenerate.length < limit) {
      toGenerate.push(t)
    }
  }

  type Result = {
    slug: string
    status: 'created' | 'skipped' | 'failed'
    url?: string
    error?: string
  }

  const skipResults: Result[] = skipped.map((t) => {
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(demoCoverStoragePath(t.slug))
    return { slug: t.slug, status: 'skipped', url: pub.publicUrl }
  })

  // 并行处理一批
  async function processOne(topic: MockTopic): Promise<Result> {
    const path = demoCoverStoragePath(topic.slug)
    const prompt = buildCoverPrompt({
      brand: '星巴克',
      title: topic.title,
      hook: topic.hook,
      tone: '情感共鸣',
    })
    const { dataUri, error } = await generateCoverImage(prompt)
    if (!dataUri) return { slug: topic.slug, status: 'failed', error: error ?? 'no image' }

    const match = dataUri.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i)
    if (!match) return { slug: topic.slug, status: 'failed', error: 'dataUri 格式不识别' }

    const buffer = Buffer.from(match[2], 'base64')
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: match[1], upsert: true })
    if (upErr) return { slug: topic.slug, status: 'failed', error: upErr.message }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    return { slug: topic.slug, status: 'created', url: pub.publicUrl }
  }

  const settled = await Promise.allSettled(toGenerate.map(processOne))
  const genResults: Result[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    return {
      slug: toGenerate[i].slug,
      status: 'failed',
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
    }
  })

  const results = [...skipResults, ...genResults]
  const created = results.filter((r) => r.status === 'created').length
  const remaining = DEMO_TOPICS.length - existingSet.size - created

  return Response.json({
    summary: {
      total: DEMO_TOPICS.length,
      created,
      skipped: skipResults.length,
      failed: results.filter((r) => r.status === 'failed').length,
      remaining: Math.max(0, remaining),
    },
    results,
  })
}
