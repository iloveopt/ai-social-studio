import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { claudeComplete, type ContentBlock } from '@/lib/anthropic-client'
import type { InspirationSuggestion } from '@/types'
import { isDemoMode, sampleInspiration } from '@/lib/mock-fixtures'

const MAX_SIZE = 5 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg'])

function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : content
  const match = body.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI 未返回有效 JSON')
  return match[0]
}

interface AnalyzeResult {
  analysis: string
  suggestions: InspirationSuggestion[]
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const campaignId = form.get('campaignId')
    const image = form.get('image')

    if (typeof campaignId !== 'string' || !campaignId) {
      return Response.json({ error: '缺少 campaignId' }, { status: 400 })
    }
    if (!(image instanceof File)) {
      return Response.json({ error: '缺少图片' }, { status: 400 })
    }
    if (!ALLOWED_MIME.has(image.type)) {
      return Response.json({ error: '图片格式不支持，仅支持 PNG/JPEG' }, { status: 400 })
    }
    if (image.size > MAX_SIZE) {
      return Response.json({ error: '图片太大，请压缩后重试' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campErr || !campaign) {
      return Response.json({ error: '未找到 Campaign' }, { status: 404 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const rawMime = image.type || 'image/jpeg'
    const mime: 'image/jpeg' | 'image/png' = rawMime === 'image/png' ? 'image/png' : 'image/jpeg'
    const dataUri = `data:${mime};base64,${base64}`

    // Demo 模式：跳过 Vision 调用，直接用预备 fixture
    if (isDemoMode()) {
      await new Promise((r) => setTimeout(r, 1500))
      const mock = sampleInspiration()
      const { data: insertedDemo, error: demoErr } = await supabase
        .from('inspirations')
        .insert({
          campaign_id: campaignId,
          image_base64: dataUri,
          analysis: mock.analysis,
          suggestions: mock.suggestions,
          status: 'done',
        })
        .select('id')
        .single()
      if (demoErr) throw new Error(demoErr.message)
      return Response.json({
        id: insertedDemo.id,
        analysis: mock.analysis,
        suggestions: mock.suggestions,
      })
    }

    const platforms = Array.isArray(campaign.platforms)
      ? campaign.platforms.join('、')
      : String(campaign.platforms ?? '')

    const userText = `这是一张小红书帖子截图。
当前Campaign信息：品牌=${campaign.brand_name}，联名IP=${campaign.ip_name}，目标人群=${campaign.target_audience}，Campaign目标=${campaign.campaign_goal}，平台=${platforms}，语气=${campaign.tone}

请：
1. 分析这张截图的内容形式、文案风格、视觉风格、话题方向（100字以内）
2. 基于截图风格，结合以上Campaign信息，生成2个类似方向但针对此Campaign的创意方向

输出JSON格式：
{
  "analysis": "截图分析（100字）",
  "suggestions": [
    {"title": "创意标题", "hook": "一句话钩子（50字内）", "why": "为什么和截图风格相似（30字）", "format": "内容格式"},
    {"title": "...", "hook": "...", "why": "...", "format": "..."}
  ]
}

只输出JSON。`

    const content: ContentBlock[] = [
      { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
      { type: 'text', text: userText },
    ]

    const raw = await claudeComplete({
      messages: [{ role: 'user', content }],
      max_tokens: 1000,
    })

    const parsed = JSON.parse(extractJsonObject(raw)) as AnalyzeResult

    const { data: inserted, error: insErr } = await supabase
      .from('inspirations')
      .insert({
        campaign_id: campaignId,
        image_base64: dataUri,
        analysis: parsed.analysis,
        suggestions: parsed.suggestions ?? [],
        status: 'done',
      })
      .select('id')
      .single()

    if (insErr) throw new Error(insErr.message)

    return Response.json({
      id: inserted.id,
      analysis: parsed.analysis,
      suggestions: parsed.suggestions ?? [],
    })
  } catch (err) {
    console.error('[inspirations]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : '分析失败' },
      { status: 500 }
    )
  }
}
