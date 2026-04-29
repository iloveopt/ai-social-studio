import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'
import {
  DEMO_TOPICS,
  demoCoverBucket,
  demoCoverStoragePath,
} from '@/lib/mock-fixtures'

export const maxDuration = 300

// 一次性预生成 15 张 demo 封面，存到 Storage 的 demo/ 目录
// 调用方式：POST /api/admin/seed-demo-covers?confirm=yes&force=false
//   confirm=yes 必填，防止误触发（每次会调 nano-banana 15 次，要花钱）
//   force=true 时强制重新生成已存在的封面，默认跳过
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  if (url.searchParams.get('confirm') !== 'yes') {
    return Response.json(
      { error: '需要 ?confirm=yes 防止误触发（会消耗 nano-banana 配额）' },
      { status: 400 }
    )
  }
  const force = url.searchParams.get('force') === 'true'

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

  for (const topic of DEMO_TOPICS) {
    const path = demoCoverStoragePath(topic.slug)

    // 检查是否已存在
    if (!force) {
      const { data: existing } = await supabase.storage.from(bucket).list('demo', {
        search: `${topic.slug}.png`,
      })
      const exists = (existing ?? []).some((f) => f.name === `${topic.slug}.png`)
      if (exists) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
        results.push({ slug: topic.slug, status: 'skipped', url: pub.publicUrl })
        continue
      }
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
  }

  const summary = {
    total: DEMO_TOPICS.length,
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  }

  return Response.json({ summary, results })
}
