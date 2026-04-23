import { createServiceClient } from '@/lib/supabase/server'
import { uploadCoverFromDataUri } from '@/lib/supabase/storage'

// 一次性迁移：把 topics.cover_image 里以 data:image/... 开头的 base64
// 搬到 Supabase Storage，把 DB 值改成 public URL，释放 iOS Safari 的
// 内存压力
export const maxDuration = 60

export async function POST() {
  const supabase = createServiceClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, cover_image')
    .like('cover_image', 'data:%')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!topics || topics.length === 0) {
    return Response.json({ migrated: 0, total: 0, message: '没有需要迁移的 base64 封面' })
  }

  const results = await Promise.allSettled(
    topics.map(async (t) => {
      const dataUri = t.cover_image as string
      const url = await uploadCoverFromDataUri(t.id as string, dataUri)
      if (!url) return { id: t.id, ok: false as const, error: 'upload failed' }
      const { error: updErr } = await supabase
        .from('topics')
        .update({ cover_image: url })
        .eq('id', t.id)
      if (updErr) return { id: t.id, ok: false as const, error: updErr.message }
      return { id: t.id, ok: true as const }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { id: topics[i].id, ok: false as const, error: String(r.reason) }
  )

  return Response.json({
    migrated: summary.filter((s) => s.ok).length,
    total: topics.length,
    firstError: summary.find((s) => !s.ok) as { error?: string } | undefined,
  })
}
