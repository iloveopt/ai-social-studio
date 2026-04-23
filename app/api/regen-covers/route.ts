import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'

export const maxDuration = 60

const BRAND = '星巴克'
const IP = '穿Prada的女魔头2'
const TONE = '情感共鸣'

export async function POST() {
  if (!process.env.NANO_BANANA_API_KEY) {
    return Response.json({ error: 'NANO_BANANA_API_KEY 未配置' }, { status: 500 })
  }

  const supabase = createServiceClient()

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('id')
    .eq('brand_name', BRAND)
    .maybeSingle()

  if (campErr || !campaign?.id) {
    return Response.json({ error: `未找到 ${BRAND} campaign` }, { status: 404 })
  }

  const { data: topics, error: topicsErr } = await supabase
    .from('topics')
    .select('id, seq_num, title, hook')
    .eq('campaign_id', campaign.id)
    .is('deleted_at', null)
    .order('seq_num', { ascending: true })

  if (topicsErr || !topics?.length) {
    return Response.json({ error: topicsErr?.message ?? '没有 topic 可以出图' }, { status: 404 })
  }

  const results = await Promise.allSettled(
    topics.map(async (t) => {
      const prompt = buildCoverPrompt({
        brand: BRAND,
        ip: IP,
        title: t.title,
        hook: t.hook,
        tone: TONE,
      })
      const { dataUri, error } = await generateCoverImage(prompt)
      if (!dataUri) {
        return { seq: t.seq_num, ok: false as const, error: error ?? 'unknown' }
      }
      await supabase.from('topics').update({ cover_image: dataUri }).eq('id', t.id)
      return { seq: t.seq_num, ok: true as const }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { seq: topics[i].seq_num, ok: false as const, error: String(r.reason) }
  )

  const firstError = summary.find((s) => !s.ok) as
    | { error: string }
    | undefined

  return Response.json({
    regenerated: summary.filter((s) => s.ok).length,
    total: topics.length,
    firstError: firstError?.error,
    details: summary,
  })
}
