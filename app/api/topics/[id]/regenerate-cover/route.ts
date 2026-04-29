import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'
import { uploadCoverFromDataUri } from '@/lib/supabase/storage'

export const maxDuration = 60

// POST /api/topics/{id}/regenerate-cover
// 用 topic.title + hook + campaign 信息重新生成封面，覆盖到 topic 自己 ID 的 Storage 路径下
// （不动 demo/ 共享池，避免影响其他还在用同一张 demo 封面的 topic）
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: topic, error: tErr } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .single()
  if (tErr || !topic) {
    return Response.json({ error: '未找到选题' }, { status: 404 })
  }

  if (!process.env.NANO_BANANA_API_KEY) {
    return Response.json({ error: 'NANO_BANANA_API_KEY 未配置' }, { status: 500 })
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('brand_name, ip_name, tone')
    .eq('id', topic.campaign_id)
    .single()

  const prompt = buildCoverPrompt({
    brand: campaign?.brand_name ?? '星巴克',
    ip: campaign?.ip_name ?? undefined,
    title: topic.title,
    hook: topic.hook ?? '',
    tone: campaign?.tone ?? undefined,
  })

  const { dataUri, error: genErr } = await generateCoverImage(prompt)
  if (!dataUri) {
    return Response.json({ error: genErr ?? '生成失败' }, { status: 500 })
  }

  const newUrl = await uploadCoverFromDataUri(id, dataUri)
  if (!newUrl) {
    return Response.json({ error: '上传失败' }, { status: 500 })
  }

  const { error: updErr } = await supabase
    .from('topics')
    .update({ cover_image: newUrl })
    .eq('id', id)
  if (updErr) {
    return Response.json({ error: updErr.message }, { status: 500 })
  }

  return Response.json({ cover_image: newUrl })
}
