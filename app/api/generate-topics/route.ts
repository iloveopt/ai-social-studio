import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

interface RawTopic {
  title: string
  hook: string
  thinking: string
  why_items?: string[]
  exec_plan: { format: string; cta: string; best_time: string; execution?: string }
  handoff: { step: string; head: string; body: string; tag: string }[]
  persona: { primary: string; secondary: string; platform: string; cta: string }
  refs: { brand: string; desc: string; result: string }[]
  tags?: string[]
}

interface RawEval {
  name: string
  desc: string
  emoji: string
  score: number
  quote: string
  verdict: string
}

async function generateTopics(params: {
  brand: string
  ip: string
  audience: string
  goal: string
  platforms: string[]
  tone: string
}): Promise<RawTopic[]> {
  const { brand, ip, audience, goal, platforms, tone } = params
  const platformStr = platforms.join('、')

  const response = await openai.chat.completions.create({
    model: 'claude-sonnet-4-5',
    messages: [
      {
        role: 'user',
        content: `你是一位资深中国社交媒体内容策划总监，专注品牌联名Campaign内容创意。
品牌：${brand}，合作IP：${ip}，目标人群：${audience}，Campaign目标：${goal}，平台：${platformStr}，语气：${tone}
生成5个选题，每个包含：title, hook, thinking, why_items(3条), exec_plan{format,cta,best_time,execution}, handoff([{step,head,body,tag}]3步), persona{primary,secondary,platform,cta}, refs([{brand,desc,result}]3个), tags(3个)
以JSON数组输出，不要额外文字。`,
      },
    ],
    max_tokens: 4000,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 未返回有效 JSON')
  return JSON.parse(jsonMatch[0]) as RawTopic[]
}

async function evaluateTopic(title: string): Promise<RawEval[]> {
  const response = await openai.chat.completions.create({
    model: 'claude-sonnet-4-5',
    messages: [
      {
        role: 'user',
        content: `对选题「${title}」打分。5位评委固定：小林(😤,25岁打工人), 王女士(👩‍💼,32岁职场精英), Mia(🎨,时尚KOL), 沈浩(👨‍💻,创意总监), Lily(🎓,大学生Z世代)
每位给出 score(0-5), quote(15字内), verdict(简短标签)。JSON数组格式输出，字段：name, desc, emoji, score, quote, verdict。不要额外文字。`,
      },
    ],
    max_tokens: 800,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 评审未返回有效 JSON')
  return JSON.parse(jsonMatch[0]) as RawEval[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, brand, ip, audience, goal, platforms, tone } = body

    if (!campaignId || !brand || !ip || !audience || !goal || !platforms || !tone) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Delete existing topics for this campaign
    await supabase.from('topics').delete().eq('campaign_id', campaignId)

    // Generate 5 topics
    const rawTopics = await generateTopics({ brand, ip, audience, goal, platforms, tone })

    // Evaluate all topics in parallel
    const evalResults = await Promise.all(rawTopics.map((t) => evaluateTopic(t.title)))

    // Insert topics + evaluations
    const topicIds: string[] = []

    for (let i = 0; i < rawTopics.length; i++) {
      const raw = rawTopics[i]
      const evals = evalResults[i]
      const avgScore = evals.reduce((sum, e) => sum + (e.score ?? 0), 0) / evals.length

      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert({
          campaign_id: campaignId,
          seq_num: i + 1,
          title: raw.title,
          hook: raw.hook,
          thinking: raw.thinking,
          exec_plan: raw.exec_plan,
          handoff: raw.handoff,
          persona: raw.persona,
          refs: raw.refs,
          status: 'pending',
          ai_avg_score: Math.round(avgScore * 10) / 10,
        })
        .select('id')
        .single()

      if (topicError) throw new Error(topicError.message)
      topicIds.push(topicData.id)

      const evalRows = evals.map((e) => ({
        topic_id: topicData.id,
        persona_name: e.name,
        persona_desc: e.desc,
        emoji: e.emoji,
        score: e.score,
        quote: e.quote,
        verdict: e.verdict,
      }))

      const { error: evalError } = await supabase.from('ai_evaluations').insert(evalRows)
      if (evalError) throw new Error(evalError.message)
    }

    // Update campaign status
    await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaignId)

    return Response.json({ topicIds }, { status: 201 })
  } catch (err) {
    console.error('[generate-topics]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : '生成失败' },
      { status: 500 }
    )
  }
}
