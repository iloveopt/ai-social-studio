import { createServiceClient } from '@/lib/supabase/server'
import { buildCoverPrompt, generateCoverImage } from '@/lib/nano-banana'

// Allow up to 60s for parallel cover generation on Vercel
export const maxDuration = 60

interface SeedTopic {
  seq_num: number
  title: string
  hook: string
  ai_avg_score: number
  status: 'pending' | 'approved' | 'discussing' | 'rejected'
  thinking: string
  exec_plan: { format: string; cta: string; best_time: string; execution: string }
  handoff: { step: string; head: string; body: string; tag: string }[]
  persona: { primary: string; secondary: string; platform: string; cta: string }
  refs: { brand: string; desc: string; result: string }[]
  tags: string[]
}

const SEED_TOPICS: SeedTopic[] = [
  {
    seq_num: 1,
    title: '你拿着双杯拿铁冲进去过哪里？',
    hook: 'Andy 上班第一天两手端着咖啡冲进 Runway——这一幕像极了所有打工人的早晨。打卡前那杯星巴克，是入场券也是盔甲。',
    ai_avg_score: 4.8,
    status: 'approved',
    thinking:
      '电影里 Andy 双手端咖啡冲进 Runway 是全片最高辨识度的画面之一，天然匹配"上班打工人"情境。用"冲进去过哪里"作为反问，把观众从旁观者带入自我投射，情绪入口极强。',
    exec_plan: {
      format: '图文笔记（9宫格）+ 短视频剧情复刻',
      cta: '打卡你的入场拿铁，晒图抽联名杯套',
      best_time: '工作日早 7:30–9:00',
      execution: '达人复刻 Andy 双杯冲进公司场景，粉丝接力"我的入场拿铁"UGC。',
    },
    handoff: [
      { step: '1', head: '情绪共振', body: '电影梗 + 打工人早晨场景', tag: '共鸣' },
      { step: '2', head: 'UGC 接力', body: '粉丝晒自己的"入场拿铁"', tag: '裂变' },
      { step: '3', head: '到店转化', body: '持图到店兑换联名杯套', tag: '转化' },
    ],
    persona: {
      primary: '25-35岁职场女性',
      secondary: '电影情怀党',
      platform: '小红书 / 抖音',
      cta: '到店打卡 + 话题分享',
    },
    refs: [
      { brand: '瑞幸 × 椰树', desc: '情怀梗 + 高辨识度视觉', result: '首日销量破 66 万杯' },
      { brand: 'Manner × LV', desc: '联名周边驱动打卡', result: '门店排队 3 小时' },
      { brand: '星巴克 × 芭比', desc: '电影 IP 联名', result: '杯型售罄' },
    ],
    tags: ['打工人', '电影联名', 'UGC'],
  },
  {
    seq_num: 2,
    title: '她回来了，你也回来了',
    hook: 'Miranda 时隔 18 年重新出现。第一次看，你是 Andy；再看一次，你终于懂 Miranda 了。那杯咖啡，是她从未改变的仪式感。',
    ai_avg_score: 4.6,
    status: 'approved',
    thinking:
      '观众和角色一起长大了。利用时间跨度制造情感锚点：当年你是 Andy，如今你懂 Miranda。咖啡作为贯穿 18 年的仪式感符号，承接情感。',
    exec_plan: {
      format: '图文长文 + 双时代对比短视频',
      cta: '说出你的 Miranda 时刻',
      best_time: '周末晚 20:00–22:00',
      execution: '用老电影片段 + 今日职场画面对照剪辑，文案聚焦成长弧。',
    },
    handoff: [
      { step: '1', head: '情感勾起', body: '18年时间差 + 角色成长', tag: '共鸣' },
      { step: '2', head: '自我投射', body: '你是今天的 Miranda 吗？', tag: '互动' },
      { step: '3', head: '产品承接', body: 'Miranda 同款 skinny latte', tag: '转化' },
    ],
    persona: {
      primary: '30-38岁职场精英女性',
      secondary: '电影爱好者',
      platform: '小红书 / 微博',
      cta: '下单 Miranda 同款',
    },
    refs: [
      { brand: '雅诗兰黛 × 实习生', desc: '角色成长叙事', result: '情感话题破亿阅读' },
      { brand: '欧莱雅 × 穿Prada的女魔头', desc: '职场女性赋能', result: '品牌好感度 +23%' },
      { brand: '星巴克 × 摩登家庭', desc: '时间跨度情怀', result: '老用户唤醒率 45%' },
    ],
    tags: ['怀旧', '职场女性', '成长'],
  },
  {
    seq_num: 3,
    title: "That's all.",
    hook: 'Miranda 说完这两个字，所有人立刻散去。她不需要解释，不需要等任何人。这杯咖啡在她手里，是结束，也是开始。',
    ai_avg_score: 4.2,
    status: 'discussing',
    thinking:
      '"That\'s all" 是 Miranda 最高光的台词之一，自带气场和梗属性。把咖啡与"句点/结束"绑定，既酷又有记忆点，但风险是太硬，离产品利益点稍远。',
    exec_plan: {
      format: '短视频 15s 高燃片段剪辑',
      cta: '说完这句话，喝完这杯',
      best_time: '工作日午间 12:00–13:30',
      execution: '达人对镜头复刻 Miranda 经典台词 + 放下咖啡杯动作。',
    },
    handoff: [
      { step: '1', head: '高光台词', body: 'Miranda 名场面复刻', tag: '共鸣' },
      { step: '2', head: '气场输出', body: '职场女性情绪出口', tag: '互动' },
      { step: '3', head: '产品关联', body: '手里那杯就是她的底气', tag: '转化' },
    ],
    persona: {
      primary: '28-35岁职场女性',
      secondary: '电影台词党',
      platform: '抖音 / 小红书',
      cta: '复刻视频挑战',
    },
    refs: [
      { brand: '喜茶 × 原神', desc: '二次元台词梗', result: '话题播放 2亿+' },
      { brand: '瑞幸 × 茅台', desc: '反差营销', result: '首日 GMV 破亿' },
      { brand: '星巴克 × 黑白艺术', desc: '气场型视觉', result: '高端化心智 +18%' },
    ],
    tags: ['职场', '气场', '台词梗'],
  },
  {
    seq_num: 4,
    title: '我是 Miranda？Andy？还是 Emily？',
    hook: '三个人，三种选择，三种咖啡。Miranda 喝 skinny latte，Andy 要两杯，Emily 快饿晕了。你是今天哪一个？',
    ai_avg_score: 4.4,
    status: 'pending',
    thinking:
      '人格测试型互动一直在社交平台极具穿透力。把三位核心角色与三种饮品人设绑定，让用户自然产生"测一下我是谁"的动机，天然裂变。',
    exec_plan: {
      format: 'H5 互动测试 + 图文笔记',
      cta: '测一测你是哪位，晒结果领优惠券',
      best_time: '周五晚 19:00–22:00',
      execution: 'H5 10题互动 → 3种角色结果 → 对应饮品到店券发放。',
    },
    handoff: [
      { step: '1', head: '互动测试', body: '10题 H5 人格测试', tag: '互动' },
      { step: '2', head: '身份标签', body: '三种人设 × 三款饮品', tag: '共鸣' },
      { step: '3', head: '到店核销', body: '结果页领饮品券', tag: '转化' },
    ],
    persona: {
      primary: '22-32岁女性',
      secondary: 'H5 测试爱好者',
      platform: '小红书 / 微信',
      cta: 'H5 测试 + 优惠券核销',
    },
    refs: [
      { brand: '网易云 × 人格测试', desc: 'MBTI 式测试裂变', result: '刷屏朋友圈' },
      { brand: '麦当劳 × 薯条人格', desc: '产品拟人化', result: 'UGC 超 10万' },
      { brand: '星巴克 × 星座', desc: '身份标签营销', result: '到店券核销率 38%' },
    ],
    tags: ['人格测试', 'H5', '裂变'],
  },
  {
    seq_num: 5,
    title: 'Emily 精神，但今天先喝这杯',
    hook: '"我距离目标体重只差一场胃流感。"——Emily，2006。2026年，我们喝低卡拿铁，继续努力，同样帅气。',
    ai_avg_score: 4.3,
    status: 'pending',
    thinking:
      'Emily 是全片最有梗的角色之一，但对"瘦"的自嘲式台词放在 2026 需要审慎处理。用"今天先喝这杯"的温柔反转，把自嘲转为健康选择，既保留梗味又规避争议。',
    exec_plan: {
      format: '图文笔记 + KOL 测评',
      cta: '晒你的低卡拿铁，参与#Emily精神挑战',
      best_time: '工作日午后 14:00–17:00',
      execution: 'KOL 主导"今天我选低卡"话题，品牌官方账号发梗图。',
    },
    handoff: [
      { step: '1', head: '台词勾引', body: 'Emily 经典梗 + 反转温柔', tag: '共鸣' },
      { step: '2', head: '健康主张', body: '低卡拿铁产品卖点', tag: '产品' },
      { step: '3', head: '挑战话题', body: '#Emily精神 UGC 活动', tag: '裂变' },
    ],
    persona: {
      primary: '25-35岁注重健康的女性',
      secondary: '电影梗爱好者',
      platform: '小红书 / 抖音',
      cta: '到店下单低卡拿铁',
    },
    refs: [
      { brand: '元气森林 × 健康梗', desc: '健康自嘲营销', result: '0糖心智稳固' },
      { brand: '星巴克燕麦拿铁', desc: '植物基健康化', result: '销售占比 +15%' },
      { brand: '麦当劳 × 减脂沙拉', desc: '梗图式沟通', result: '年轻女性 +12%' },
    ],
    tags: ['低卡', '健康', '梗营销'],
  },
]

const EVAL_MATRIX: { name: string; desc: string; emoji: string; scores: number[] }[] = [
  {
    name: '小林',
    desc: '25岁打工人',
    emoji: '😤',
    scores: [5.0, 4.0, 4.0, 5.0, 5.0],
  },
  {
    name: '王女士',
    desc: '32岁职场精英',
    emoji: '👩‍💼',
    scores: [5.0, 5.0, 5.0, 4.5, 4.0],
  },
  {
    name: 'Mia',
    desc: '时尚KOL',
    emoji: '🎨',
    scores: [4.5, 5.0, 4.5, 4.0, 4.5],
  },
  {
    name: '沈浩',
    desc: '创意总监',
    emoji: '👨‍💻',
    scores: [5.0, 5.0, 4.0, 4.0, 3.5],
  },
  {
    name: 'Lily',
    desc: '大学生Z世代',
    emoji: '🎓',
    scores: [4.5, 4.0, 3.5, 4.5, 4.5],
  },
]

const EVAL_TEXTS: { quote: string; verdict: string }[][] = [
  [
    { quote: '就是我每天早上！', verdict: '强共鸣' },
    { quote: '情境太精准了', verdict: '高质感' },
    { quote: '视觉符号经典', verdict: '可复刻' },
    { quote: '入场仪式感拉满', verdict: '转化友好' },
    { quote: '爷青回！', verdict: '破圈' },
  ],
  [
    { quote: '看完想再刷一遍电影', verdict: '情感价值' },
    { quote: '18年跨度太戳人', verdict: '高级感' },
    { quote: '叙事弧完整', verdict: '品牌向' },
    { quote: 'Miranda 同款必买', verdict: '购买动机' },
    { quote: '有点深但我爱', verdict: '口碑向' },
  ],
  [
    { quote: '气场确实强', verdict: '记忆点' },
    { quote: 'Miranda 天花板', verdict: '高级' },
    { quote: '视觉冲击够', verdict: '可传播' },
    { quote: '离产品有点远', verdict: '偏品牌' },
    { quote: '不太懂这个梗', verdict: '年轻人慎入' },
  ],
  [
    { quote: '一定要测一下', verdict: '强裂变' },
    { quote: '互动性很好', verdict: '社交货币' },
    { quote: '结果页设计可玩', verdict: '可执行' },
    { quote: '券核销路径清晰', verdict: '转化强' },
    { quote: '朋友圈刷屏预定', verdict: '爆款潜质' },
  ],
  [
    { quote: 'Emily 本e', verdict: '梗到位' },
    { quote: '反转处理得不错', verdict: '安全牌' },
    { quote: '视觉可玩空间大', verdict: '可复用' },
    { quote: '健康卖点清晰', verdict: '产品向' },
    { quote: '有点自嘲但我笑了', verdict: '好感' },
  ],
]

export async function POST() {
  try {
    const supabase = createServiceClient()

    // 1. 查或创建 campaign
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('brand_name', '星巴克')
      .maybeSingle()

    let campaignId: string
    if (existing?.id) {
      campaignId = existing.id
    } else {
      const { data: campaign, error: campError } = await supabase
        .from('campaigns')
        .insert({
          brand_name: '星巴克',
          ip_name: '穿Prada的女魔头2',
          target_audience: '职场女性25-38岁',
          campaign_goal: '联名新品推广+品牌情感联结',
          platforms: ['xhs', 'douyin'],
          tone: '情感共鸣',
          status: 'active',
        })
        .select('id')
        .single()

      if (campError || !campaign) {
        return Response.json({ error: campError?.message ?? '创建 campaign 失败' }, { status: 500 })
      }
      campaignId = campaign.id
    }

    // 2. 查已有的 seq_num，只补种缺失的
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('seq_num')
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)

    const existingSeqs = new Set((existingTopics ?? []).map((t) => t.seq_num))

    for (let i = 0; i < SEED_TOPICS.length; i++) {
      const t = SEED_TOPICS[i]
      if (existingSeqs.has(t.seq_num)) continue

      const { data: topicRow, error: topicError } = await supabase
        .from('topics')
        .insert({
          campaign_id: campaignId,
          seq_num: t.seq_num,
          title: t.title,
          hook: t.hook,
          thinking: t.thinking,
          exec_plan: t.exec_plan,
          handoff: t.handoff,
          persona: t.persona,
          refs: t.refs,
          status: t.status,
          ai_avg_score: t.ai_avg_score,
        })
        .select('id')
        .single()

      if (topicError || !topicRow) {
        console.error('[seed-demo] topic insert failed', { seq_num: t.seq_num, error: topicError })
        return Response.json(
          { error: topicError?.message ?? '创建 topic 失败', failedAt: t.seq_num },
          { status: 500 }
        )
      }

      const evalRows = EVAL_MATRIX.map((judge, judgeIdx) => ({
        topic_id: topicRow.id,
        persona_name: judge.name,
        persona_desc: judge.desc,
        emoji: judge.emoji,
        score: judge.scores[i],
        quote: EVAL_TEXTS[i][judgeIdx].quote,
        verdict: EVAL_TEXTS[i][judgeIdx].verdict,
      }))

      const { error: evalError } = await supabase.from('ai_evaluations').insert(evalRows)
      if (evalError) {
        console.error('[seed-demo] eval insert failed', { seq_num: t.seq_num, error: evalError })
        return Response.json({ error: evalError.message, failedAt: t.seq_num }, { status: 500 })
      }
    }

    // 4. 给所有缺封面的 demo topic 生成封面（包含历史遗留的 null 行）
    if (process.env.NANO_BANANA_API_KEY) {
      const seedBySeq = new Map(SEED_TOPICS.map((t) => [t.seq_num, t]))
      const { data: missingCovers } = await supabase
        .from('topics')
        .select('id, seq_num')
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)
        .is('cover_image', null)

      if (missingCovers && missingCovers.length > 0) {
        await Promise.allSettled(
          missingCovers.map(async (row) => {
            const seed = seedBySeq.get(row.seq_num)
            if (!seed) return
            const prompt = buildCoverPrompt({
              brand: '星巴克',
              ip: '穿Prada的女魔头2',
              title: seed.title,
              hook: seed.hook,
              tone: '情感共鸣',
            })
            const { dataUri } = await generateCoverImage(prompt)
            if (!dataUri) return
            await supabase.from('topics').update({ cover_image: dataUri }).eq('id', row.id)
          })
        )
      }
    }

    return Response.json({ campaignId })
  } catch (err) {
    console.error('[seed-demo]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : '服务器错误' },
      { status: 500 }
    )
  }
}
