import { createServiceClient } from '@/lib/supabase/server'
import { parseImageDimensions } from '@/lib/image-meta'

// 给已有 cover_image 但缺 cover_width/height 的 topic 回填尺寸：
// 拉前 64KB 头部，用 image-meta 解析。失败的留 NULL，前端继续走 3:4 回退。
export const maxDuration = 60

const HEAD_BYTES = 64 * 1024

async function fetchHead(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
    })
    if (!res.ok && res.status !== 206) return null
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } catch (err) {
    console.error('[backfill] fetch failed', url, err)
    return null
  }
}

export async function POST() {
  const supabase = createServiceClient()

  const { data: rows, error } = await supabase
    .from('topics')
    .select('id, cover_image')
    .not('cover_image', 'is', null)
    .or('cover_width.is.null,cover_height.is.null')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (!rows?.length) {
    return Response.json({ updated: 0, total: 0, message: '没有需要回填的封面' })
  }

  const results = await Promise.allSettled(
    rows.map(async (t) => {
      const url = t.cover_image as string
      // data URI 直接解
      let buf: Buffer | null = null
      if (url.startsWith('data:')) {
        const m = url.match(/^data:image\/[a-z0-9+.-]+;base64,(.+)$/i)
        if (m) buf = Buffer.from(m[1], 'base64')
      } else {
        buf = await fetchHead(url)
      }
      if (!buf) return { id: t.id, ok: false as const, error: 'fetch failed' }
      const dim = parseImageDimensions(buf)
      if (!dim) return { id: t.id, ok: false as const, error: 'parse failed' }
      const { error: updErr } = await supabase
        .from('topics')
        .update({ cover_width: dim.width, cover_height: dim.height })
        .eq('id', t.id)
      if (updErr) return { id: t.id, ok: false as const, error: updErr.message }
      return { id: t.id, ok: true as const, width: dim.width, height: dim.height }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { id: rows[i].id, ok: false as const, error: String(r.reason) }
  )

  return Response.json({
    updated: summary.filter((s) => s.ok).length,
    total: rows.length,
    failures: summary.filter((s) => !s.ok),
  })
}
