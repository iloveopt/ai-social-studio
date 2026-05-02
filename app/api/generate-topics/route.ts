import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { claudeComplete } from '@/lib/anthropic-client'
import {
  isDemoMode,
  sampleTopics,
  demoCoverBucket,
  demoCoverStoragePath,
  type MockTopic,
} from '@/lib/mock-fixtures'
import type { TopicCategory, TopicWorkspace } from '@/types'

// 生成是真实 Claude 调用 (~10-20s)；评委打分 demo 阶段 mock 即可
export const maxDuration = 60

const JUDGES: {
  name: string
  desc: string
  emoji: string
  quotes: string[]
  verdicts: string[]
  reasonings: string[]
}[] = [
  {
    name: '小林',
    desc: '25岁·运营打工人',
    emoji: '😤',
    quotes: ['共鸣感拉满', '朋友圈必刷', '打工人狂喜', '太能懂了', '帮我说了'],
    verdicts: ['强推', '共鸣型', '打工人向', '情绪到位', '可落地'],
    reasonings: [
      '标题第一秒就把我拉回工位现场，加班党看完直接转给同事的那种。',
      '情绪到位但没有刻意卖惨，这个尺度拿捏得我服。',
      '看完已经在脑子里写自己的版本了，复用度真的高。',
      '我现在缺的就是这种「懂我」的内容，不是高大上的品牌话术。',
      '痛点找得准，发完不愁互动，评论区会自动炸。',
      '没有装腔作势，像同事工位飘过来的吐槽，太能 get 了。',
    ],
  },
  {
    name: '王女士',
    desc: '32岁·职场精英',
    emoji: '👩‍💼',
    quotes: ['调性在线', '可品可读', '品牌感够', '口碑可期', '稳中有新意'],
    verdicts: ['品牌向', '安全牌', '口碑型', '质感足', '可放心推'],
    reasonings: [
      '调性稳，发出来不会让品牌掉价，老板看了不会皱眉。',
      '议题选得不偏激，给后续多个 campaign 留了接续空间。',
      '风险控制到位，没有那种为了流量豁出去的痕迹。',
      '文案能看出有打磨，不是博主随手发的水平，对得起品牌。',
      '受众覆盖面够广，目标人群之外的人看了也不会反感。',
      '这种内容是品牌长期资产，不只是一波流的话题。',
    ],
  },
  {
    name: 'Mia',
    desc: '时尚KOL',
    emoji: '🎨',
    quotes: ['画面抓人', '视觉有记忆点', 'KOL 愿意接', '拍着爽', '构图可玩'],
    verdicts: ['视觉型', 'KOL友好', '可延展', '有潜力', '颜值在线'],
    reasonings: [
      '拍照画面在我脑里已经有了，构图、光线、道具都能自洽。',
      '作为 KOL 会主动接，这种内容自带种草溢价，不用硬推。',
      '视觉记忆点强，发完之后评论区一定有人问"这是哪家"。',
      '配图思路清晰，不需要再花力气想视觉，省时间。',
      '颜值在线又不悬浮，能落到日常审美里。',
      '是 KOL 们梦寐以求的「拍着也开心」型脚本。',
    ],
  },
  {
    name: '沈浩',
    desc: '创意总监',
    emoji: '👨‍💻',
    quotes: ['战略清晰', '切入精准', '钩子有张力', '执行路径顺', '有复用空间'],
    verdicts: ['战略型', '执行稳', '可复用', '结构好', '思路清'],
    reasonings: [
      '切入角度是清晰的策略支点，不是孤立的噱头。',
      '能看到后续 N 期的延展空间，不是一锤子买卖。',
      '钩子有张力但没失控，落点和品牌资产对得上。',
      '执行链路顺，KOL/物料/门店三方需要的东西都讲得清。',
      '创意密度对，不会让看的人觉得用力过猛或者偷懒。',
      '思路清，看一眼就知道为什么是这条而不是别的。',
    ],
  },
  {
    name: 'Lily',
    desc: '大学生·Z世代',
    emoji: '🎓',
    quotes: ['Z世代买单', '我会转发', '梗够新', '同学群必炸', '青春共鸣'],
    verdicts: ['裂变强', 'Z世代向', '梗到位', '社交属性足', '年轻化'],
    reasonings: [
      '我就是会发这条到同学群的那个人，看完很有梗。',
      '钩子够新，没有那种"你们这些大人想讨好我们"的尴尬感。',
      '同学群一发出来，下一节课大家就开始模仿了那种。',
      '不端着不油腻，难得能看出是用心和我们这代人对话。',
      '梗到位但不刻意，真实感拉满，会有人主动 cosplay。',
      '我们 Z 世代主动转发的内容大多长这样，比硬投放有效。',
    ],
  },
]

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function mockEvals(topicIndex: number, title: string): RawEval[] {
  const seed = (title.length + topicIndex * 7) * 13
  return JUDGES.map((j, idx) => {
    // 3.8–5.0 之间以 0.1 步长抖动，保证看上去真实
    const raw = 3.8 + ((seed + idx * 11) % 13) * 0.1
    const score = Math.round(raw * 10) / 10
    return {
      name: j.name,
      desc: j.desc,
      emoji: j.emoji,
      score,
      quote: pick(j.quotes, seed + idx),
      verdict: pick(j.verdicts, seed + idx * 3),
      reasoning: pick(j.reasonings, seed + idx * 5),
    }
  })
}

const TOPIC_SYSTEM_PROMPT = `你是一位资深中国社交媒体内容策划总监，有15年品牌联名Campaign经验。
你擅长洞察中国消费者心理，熟悉小红书、抖音、微博的内容传播规律。
你的选题风格：接地气、有共鸣、有传播钩子，不说废话。`

interface RawTopic {
  title: string
  hook: string
  body?: string
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
  reasoning: string
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

  const userPrompt = `请为「${brand}」品牌生成 5 个社媒选题。

品牌：${brand}
${ip ? `可参考的 IP / 季节性话题：${ip}（仅作为可选灵感之一，不强求每条都用）` : ''}
目标人群：${audience}
Campaign目标：${goal}
主要平台：${platformStr}
品牌语气：${tone}

5 条选题请尽量覆盖不同切入角度，例如（不限于）：
- 新品 / 季节限定 / 城市限定
- 用户生活场景与情绪共鸣（早八、加班、周末、独处、社交等）
- 节日 / 节气 / 热点事件
- 跨界联名（IP / 艺术家 / 其他品牌，可以不同于上面给的 IP）
- 产品工艺 / 原料故事 / 门店体验
- UGC / 互动玩法 / 用户共创

要求：
1. 每个选题必须有强烈的「第一眼钩子」，标题要让人想点进去
2. Hook文案要有画面感，不超过60字
3. 选题思考要说清楚：切入点是什么、为什么这个人群会共鸣、传播机制是什么
4. 参考案例要真实，不要编造不存在的数据
5. 风格要接地气，像人写的，不像AI写的
6. 5 条之间角度要明显有差异，不要全部都是同一个套路

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

  const content = await claudeComplete({
    system: TOPIC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: 4000,
  })
  return JSON.parse(extractJsonArray(content)) as RawTopic[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      campaignId,
      brand,
      ip,
      audience,
      goal,
      platforms,
      tone,
      category,
      seedText,
      limit,
      workspace,
    } = body as {
      campaignId?: string
      brand?: string
      ip?: string
      audience?: string
      goal?: string
      platforms?: string[]
      tone?: string
      category?: TopicCategory
      seedText?: string
      limit?: number
      workspace?: TopicWorkspace
    }

    if (!campaignId || !brand || !ip || !audience || !goal || !platforms || !tone) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const targetWorkspace: TopicWorkspace = workspace === 'review' ? 'review' : 'draft'
    const requestedLimit = typeof limit === 'number' && limit > 0 && limit <= 10 ? limit : 5

    const supabase = createServiceClient()

    // 查现有：seq_num 用于 append-only；同时收集已有 demo slug 用于去重
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('seq_num, title')
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)
    const baseSeq = (existingTopics ?? []).reduce(
      (max, t) => Math.max(max, t.seq_num ?? 0),
      0
    )

    // Demo 模式：从 fixtures 按栏目抽，排除已使用的 slug
    let rawTopics: RawTopic[]
    let demoSampled: MockTopic[] = []
    if (isDemoMode()) {
      // 模拟 ~5.5s 算法时间，给打字机阶段文案完整播放空间
      await new Promise((r) => setTimeout(r, 5500))
      // 用 title 反查池里 slug 来构造 exclude 集合（避免拉到底重复）
      const usedTitles = new Set((existingTopics ?? []).map((t) => t.title))
      // 注：sampleTopics 内部按 slug 排除；此处用 title 间接排除
      demoSampled = sampleTopics(requestedLimit, { category })
        .filter((t) => !usedTitles.has(t.title))
        .slice(0, requestedLimit)
      // seedText 进入 thinking 字段开头作为「客户提示」
      rawTopics = demoSampled.map((t) => ({
        title: t.title,
        hook: t.hook,
        body: t.body,
        thinking: seedText ? `「客户提示」${seedText}\n\n${t.thinking}` : t.thinking,
        exec_plan: t.exec_plan,
        handoff: t.handoff,
        persona: t.persona,
        refs: t.refs,
        tags: t.tags,
      }))
    } else {
      rawTopics = await generateTopics({ brand, ip, audience, goal, platforms, tone })
    }

    // Insert topics + mock evaluations（Demo 阶段评委打分 mock 省一次 Claude）
    const topicIds: string[] = []

    for (let i = 0; i < rawTopics.length; i++) {
      const raw = rawTopics[i]
      const evals = mockEvals(i, raw.title)
      const avgScore = evals.length
        ? evals.reduce((sum, e) => sum + (e.score ?? 0), 0) / evals.length
        : 0

      // Demo 模式：从预生成的 demo 封面取 URL
      let demoCoverUrl: string | null = null
      if (demoSampled[i]) {
        const path = demoCoverStoragePath(demoSampled[i].slug)
        const { data: pub } = supabase.storage.from(demoCoverBucket()).getPublicUrl(path)
        demoCoverUrl = pub?.publicUrl ? `${pub.publicUrl}?v=${Date.now()}` : null
      }

      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert({
          campaign_id: campaignId,
          seq_num: baseSeq + i + 1,
          title: raw.title,
          hook: raw.hook,
          body: raw.body ?? null,
          thinking: raw.thinking,
          exec_plan: raw.exec_plan,
          handoff: raw.handoff,
          persona: raw.persona,
          refs: raw.refs,
          status: 'pending',
          ai_avg_score: Math.round(avgScore * 10) / 10,
          cover_image: demoCoverUrl,
          category: demoSampled[i]?.category ?? category ?? null,
          workspace: targetWorkspace,
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
        reasoning: e.reasoning,
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
