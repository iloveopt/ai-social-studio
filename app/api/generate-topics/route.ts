import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

const TOPIC_SYSTEM_PROMPT = `你是一位资深中国社交媒体内容策划总监，有15年品牌联名Campaign经验。
你擅长洞察中国消费者心理，熟悉小红书、抖音、微博的内容传播规律。
你的选题风格：接地气、有共鸣、有传播钩子，不说废话。`

const EVAL_SYSTEM_PROMPT = `你是5位社媒内容专家组成的评审团，需要用各自固定的人设口吻对选题打分。
评审专家（固定角色，每次必须用这5位）：
- 小林（😤）：25岁运营打工人，关注共鸣感和UGC传播
- 王女士（👩‍💼）：32岁职场精英，关注品质感和口碑传播
- Mia（🎨）：时尚KOL，关注视觉表现和KOL传播力
- 沈浩（👨‍💻）：创意总监，关注战略价值和执行可行性
- Lily（🎓）：大学生Z世代，关注年轻感和社交裂变`

interface RawTopic {
  title: string
  hook: string
  thinking: string
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

function extractJsonArray(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : content
  const match = body.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI 未返回有效 JSON 数组')
  return match[0]
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

  const userPrompt = `请为以下品牌联名Campaign生成5个社媒选题：

品牌：${brand}
联名IP：${ip}
目标人群：${audience}
Campaign目标：${goal}
主要平台：${platformStr}
品牌语气：${tone}

要求：
1. 每个选题必须有强烈的「第一眼钩子」，标题要让人想点进去
2. Hook文案要有画面感，不超过60字
3. 选题思考要说清楚：切入点是什么、为什么这个人群会共鸣、传播机制是什么
4. 参考案例要真实，不要编造不存在的数据
5. 风格要接地气，像人写的，不像AI写的

输出格式（严格JSON数组，5个元素）：
[{
  "title": "标题",
  "hook": "hook文案",
  "thinking": "选题思考（200字，说清楚切入点+人群共鸣+传播机制）",
  "exec_plan": {"format": "内容格式", "cta": "互动引导语", "best_time": "最佳发布时间", "execution": "具体执行说明"},
  "handoff": [{"step": "STEP N", "head": "步骤标题", "body": "具体说明", "tag": "标签"}],
  "persona": {"primary": "主要人群", "secondary": "次要人群", "platform": "平台", "cta": "期待行动"},
  "refs": [{"brand": "品牌名", "desc": "案例说明", "result": "效果数据"}],
  "tags": ["标签1", "标签2", "标签3"]
}]

只输出JSON，不要任何其他文字。`

  const response = await openai.chat.completions.create({
    model: 'claude-sonnet-4-5',
    messages: [
      { role: 'system', content: TOPIC_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
  })

  const content = response.choices[0]?.message?.content ?? ''
  return JSON.parse(extractJsonArray(content)) as RawTopic[]
}

async function evaluateTopicsBatch(topics: RawTopic[]): Promise<RawEval[][]> {
  const topicsJson = JSON.stringify(
    topics.map((t, i) => ({ idx: i + 1, title: t.title, hook: t.hook })),
    null,
    2
  )

  const userPrompt = `下面有 ${topics.length} 个选题，请以5位评委的身份分别对每个选题打分。

选题列表：
${topicsJson}

对每个选题，5位专家各给出：
- score：0.0-5.0分（精确到0.5分）
- quote：15字以内的点评（要有个性，符合各自角色）
- verdict：简短标签（如"强推""需确认""品牌向"）

输出格式（严格JSON，外层是数组，对应每个选题；内层是5个评委结果）：
[[评委1结果, 评委2结果, 评委3结果, 评委4结果, 评委5结果], ...]

每个评委结果：{"name": "小林", "emoji": "😤", "desc": "25岁·运营打工人", "score": 4.5, "quote": "...", "verdict": "..."}

只输出JSON。`

  const response = await openai.chat.completions.create({
    model: 'claude-sonnet-4-5',
    messages: [
      { role: 'system', content: EVAL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(extractJsonArray(content)) as RawEval[][]
  if (!Array.isArray(parsed) || parsed.length !== topics.length) {
    throw new Error('AI 评审返回数量不匹配')
  }
  return parsed
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

    // Evaluate all topics in a single batched call
    const evalResults = await evaluateTopicsBatch(rawTopics)

    // Insert topics + evaluations
    const topicIds: string[] = []

    for (let i = 0; i < rawTopics.length; i++) {
      const raw = rawTopics[i]
      const evals = evalResults[i] ?? []
      const avgScore = evals.length
        ? evals.reduce((sum, e) => sum + (e.score ?? 0), 0) / evals.length
        : 0

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

      if (evalRows.length > 0) {
        const { error: evalError } = await supabase.from('ai_evaluations').insert(evalRows)
        if (evalError) throw new Error(evalError.message)
      }
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
