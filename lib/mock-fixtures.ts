import type { InspirationSuggestion } from '@/types'

export interface MockTopic {
  slug: string
  title: string
  hook: string
  thinking: string
  exec_plan: { format: string; cta: string; best_time: string; execution?: string }
  handoff: { step: string; head: string; body: string; tag: string }[]
  persona: { primary: string; secondary: string; platform: string; cta: string }
  refs: { brand: string; desc: string; result: string }[]
  tags: string[]
}

export interface MockInspiration {
  analysis: string
  suggestions: InspirationSuggestion[]
}

// ============================================================
// 15 条预备星巴克选题（轮换池），覆盖不同切入角度
// ============================================================

export const DEMO_TOPICS: MockTopic[] = [
  {
    slug: 'demo-01',
    title: '早八打工人续命指南：这杯不喝今天就废',
    hook: '七点半地铁口的星巴克，是当代打工人的能量补给站。',
    thinking:
      '切入「早八通勤」这个最具共鸣的高频场景。打工人最焦虑的不是工作本身，而是早晨那段意识尚未上线的时间。把星巴克定位为「让你按时上线」的仪式感工具，传播机制是「我也是这样」的自嘲式认同。',
    exec_plan: {
      format: '九宫格图文 + 短视频',
      cta: '评论区打卡你今天点了哪一杯',
      best_time: '工作日 7:00–8:30',
      execution: 'KOC 实拍通勤路上的星巴克场景，文案突出「续命」「按时上线」等情绪关键词。',
    },
    handoff: [
      { step: 'STEP 1', head: '场景拍摄', body: '地铁口、写字楼电梯、工位三连镜头', tag: '通勤' },
      { step: 'STEP 2', head: '文案打磨', body: '主标题强情绪，副标题埋产品卖点', tag: '文案' },
      { step: 'STEP 3', head: '投放', body: '工作日早高峰小红书+抖音双开', tag: '投放' },
    ],
    persona: {
      primary: '25–32 岁一二线城市职场人',
      secondary: '应届毕业生',
      platform: '小红书 / 抖音',
      cta: '想喝一杯',
    },
    refs: [
      { brand: '瑞幸', desc: '早C晚A话题营销', result: '相关话题阅读破亿' },
      { brand: 'Manner', desc: '上海早高峰社区咖啡', result: '门店复购 60%+' },
    ],
    tags: ['打工人', '早八', '通勤', '情绪共鸣'],
  },
  {
    slug: 'demo-02',
    title: '城市探店地图：周末就泡这家星巴克',
    hook: '不是所有星巴克都长一样，这 5 家藏着设计师的小心思。',
    thinking:
      '差异化切入「门店本身」而非饮品。一二线城市星巴克密度高，臻选店、烘焙工坊、海景店有强烈的视觉记忆点，刚好适合「拍照出片+周末探索」的小红书心智。机制是收藏型内容自带长尾流量。',
    exec_plan: {
      format: '横版长图 + 探店 vlog',
      cta: '你去过哪一家？想去哪一家？',
      best_time: '周五晚 / 周六上午',
      execution: '统一构图风格的 5 家门店实拍，每家配一段「设计师笔记」式短文。',
    },
    handoff: [
      { step: 'STEP 1', head: '门店选址', body: '挑 5 家差异化最强的特色店', tag: '选址' },
      { step: 'STEP 2', head: '视觉拍摄', body: '统一横构图 + 暖色调', tag: '视觉' },
      { step: 'STEP 3', head: '收藏型分发', body: '埋"周末计划"关键词', tag: 'SEO' },
    ],
    persona: {
      primary: '25–35 岁一线城市生活方式人群',
      secondary: '城市探索博主',
      platform: '小红书',
      cta: '想去打卡',
    },
    refs: [
      { brand: 'Blue Bottle', desc: '上海首店开业话题', result: '小红书笔记破 2 万' },
      { brand: '% Arabica', desc: '门店空间拍照打卡', result: '门店打卡笔记累计 50 万+' },
    ],
    tags: ['探店', '城市', '周末', '出片'],
  },
  {
    slug: 'demo-03',
    title: '七夕限定：和 TA 的杯子要不要拼对？',
    hook: '一杯写「我」，一杯写「们」，合在一起才是完整答案。',
    thinking:
      '抓住七夕节点 + 情侣同款心智，用「拼图杯」这种产品形态强制制造社交分享。两个杯子必须凑在一起才有完整画面，本质上是把购买行为变成 UGC 触发器，传播机制天然是双倍曝光。',
    exec_plan: {
      format: '主视觉海报 + UGC 互动',
      cta: '上传你和 TA 的拼图杯，抽限定周边',
      best_time: '七夕前 5 天 / 当天',
      execution: '产品端推出双杯套装，内容端发起 #拼图杯 挑战话题。',
    },
    handoff: [
      { step: 'STEP 1', head: '产品设计', body: '两杯拼合后形成完整图案', tag: '产品' },
      { step: 'STEP 2', head: '话题发起', body: '邀请头部情侣博主开题', tag: 'KOL' },
      { step: 'STEP 3', head: 'UGC 收集', body: '小红书话题 + 评论抽奖', tag: '互动' },
    ],
    persona: {
      primary: '20–30 岁情侣 / 暧昧期人群',
      secondary: '送礼场景人群',
      platform: '小红书 / 抖音',
      cta: '想买一对',
    },
    refs: [
      { brand: '喜茶', desc: '情人节双杯礼盒', result: '当日销量破 30 万杯' },
      { brand: '可口可乐', desc: '昵称瓶系列', result: '社交媒体声量破 10 亿' },
    ],
    tags: ['七夕', '情侣', 'UGC', '限定'],
  },
  {
    slug: 'demo-04',
    title: '第三空间夜读：晚上九点的星巴克在干嘛？',
    hook: '当便利店都开始打烊，这里灯还亮着，键盘还在响。',
    thinking:
      '反向切入「夜晚」这个被忽视的时段。星巴克的「第三空间」概念在白天是社交，在夜晚是孤独的庇护所——自由职业者、学生、加班党的精神角落。情绪是疲惫但温暖，传播机制是少数派的强烈共鸣。',
    exec_plan: {
      format: '长图文 + 真实人物访谈',
      cta: '你最近一次在咖啡馆熬到几点？',
      best_time: '工作日 21:00–23:00',
      execution: '采访 5 位常驻夜场星巴克的真实顾客，用纪实摄影风呈现。',
    },
    handoff: [
      { step: 'STEP 1', head: '人物筛选', body: '不同职业 5 位代表性顾客', tag: '人物' },
      { step: 'STEP 2', head: '访谈拍摄', body: '弱光纪实风格，保留真实环境音', tag: '拍摄' },
      { step: 'STEP 3', head: '长图文叙事', body: '每人一段独立故事 + 情绪 hook', tag: '内容' },
    ],
    persona: {
      primary: '自由职业者 / 加班族',
      secondary: '夜读学生',
      platform: '小红书 / 微博',
      cta: '想去坐坐',
    },
    refs: [
      { brand: '诚品书店', desc: '24 小时书店纪实', result: '长尾流量持续 5 年' },
      { brand: '麦当劳', desc: '夜班族纪实广告', result: '日剧风刷屏' },
    ],
    tags: ['夜晚', '第三空间', '纪实', '情感'],
  },
  {
    slug: 'demo-05',
    title: '秋天的第一杯燕麦拿铁：今年拍照怎么不一样了',
    hook: '南瓜香料退场，谷物风上桌，这秋天的味道更"温吞"了。',
    thinking:
      '借势「秋天的第一杯」已被网友玩成成熟梗，但每年具体喝什么需要新角度。今年押注「燕麦/谷物」赛道——既贴合健康趋势，也避开了被玩烂的南瓜香料。机制是把节令心智 + 产品创新打包。',
    exec_plan: {
      format: '产品种草图文 + 美食博主合作',
      cta: '你今年第一杯打算喝什么？',
      best_time: '秋分前后一周',
      execution: '联合 10 位美食/生活博主统一节奏出内容，建立「燕麦秋天」记忆点。',
    },
    handoff: [
      { step: 'STEP 1', head: '产品上新', body: '燕麦拿铁 + 季节限定杯', tag: '产品' },
      { step: 'STEP 2', head: 'KOL 排期', body: '10 位博主在 7 天内集中释放', tag: 'KOL' },
      { step: 'STEP 3', head: '门店物料', body: '杯套、海报、立牌统一秋色', tag: '门店' },
    ],
    persona: {
      primary: '23–32 岁注重健康的女性',
      secondary: '咖啡爱好者',
      platform: '小红书',
      cta: '想试新品',
    },
    refs: [
      { brand: '瑞幸', desc: '生椰拿铁夏日营销', result: '上市当年销量破 1 亿杯' },
      { brand: '喜茶', desc: '当季限定营销', result: '季节产品占比超 30%' },
    ],
    tags: ['秋天', '新品', '燕麦', '节令'],
  },
  {
    slug: 'demo-06',
    title: '隐藏菜单：星巴克老顾客才知道的 7 种点法',
    hook: '不在菜单上，但店员都会做——这是属于熟客的暗号。',
    thinking:
      '切「内部人感」这个心理。隐藏菜单类内容自带"我知道你不知道"的优越感，传播力极强。把这种 UGC 自发传播过的素材体系化输出，等于官方背书隐藏文化，让普通顾客也能体验到老顾客的待遇。',
    exec_plan: {
      format: '清单图文 + 实拍点单视频',
      cta: '你最爱的隐藏点法是？',
      best_time: '周三/周四 19:00 后',
      execution: '正式官方化 7 种最受欢迎的非菜单饮品，附详细点单话术。',
    },
    handoff: [
      { step: 'STEP 1', head: '隐藏菜单整理', body: '从社群内部收集筛选 7 款', tag: '产品' },
      { step: 'STEP 2', head: '点单话术', body: '每款给一句完整话术', tag: '执行' },
      { step: 'STEP 3', head: '门店培训', body: '确保每家店都能做', tag: '门店' },
    ],
    persona: {
      primary: '星巴克常客',
      secondary: '咖啡尝鲜党',
      platform: '小红书 / 抖音',
      cta: '收藏待用',
    },
    refs: [
      { brand: '麦当劳', desc: '隐藏点法 hack', result: '抖音话题播放破 2 亿' },
      { brand: '海底捞', desc: '员工 hack 菜单', result: 'UGC 持续两年' },
    ],
    tags: ['隐藏菜单', '老顾客', '攻略', '收藏'],
  },
  {
    slug: 'demo-07',
    title: '城市限定：成都人专属的"巴适"杯',
    hook: '只在成都门店能买到，外地朋友哭着问能不能代购。',
    thinking:
      '切城市限定 + 方言文化。城市归属感是社交货币之一，用方言「巴适」做杯型印花，让买杯变成本地人骄傲的展示。外地人的「想要却买不到」反而强化稀缺感，机制是地域 FOMO。',
    exec_plan: {
      format: '城市快闪 + 主视觉海报',
      cta: '哪个城市该出下一款？',
      best_time: '周末城市发布会',
      execution: '首发成都，根据用户反馈滚动开放重庆、武汉、西安等城市。',
    },
    handoff: [
      { step: 'STEP 1', head: '城市文化研究', body: '提炼一个最有辨识度的方言/符号', tag: '研究' },
      { step: 'STEP 2', head: '杯型设计', body: '方言+本地图腾的视觉化', tag: '设计' },
      { step: 'STEP 3', head: '城市快闪', body: '首发城市办一场打卡活动', tag: '活动' },
    ],
    persona: {
      primary: '本地年轻人',
      secondary: '城市旅行者',
      platform: '小红书 / 抖音',
      cta: '想买想代购',
    },
    refs: [
      { brand: '茶颜悦色', desc: '长沙限定话题', result: '外地代购市场年 GMV 千万级' },
      { brand: 'M Stand', desc: '城市限定门店', result: '门店周边产品复购 50%' },
    ],
    tags: ['城市限定', '方言', '地域', '稀缺'],
  },
  {
    slug: 'demo-08',
    title: '雨天暖饮指南：这种天气就是要点这一杯',
    hook: '玻璃起雾的下午，热可可比任何安慰话都管用。',
    thinking:
      '抓「天气情绪」这个高频但少有品牌系统化经营的触点。雨天 = 慢下来 = 想要被温暖，把「下雨天点这杯」做成条件反射的心智，能持续在每年雨季激活。机制是天气触发的自动联想。',
    exec_plan: {
      format: '气氛短视频 + 文艺图文',
      cta: '你雨天最爱点哪一杯？',
      best_time: '雨季 / 寒潮预警当天',
      execution: '气象 API 触发推送，下雨当天向附近用户推送暖饮卡券。',
    },
    handoff: [
      { step: 'STEP 1', head: '产品挑选', body: '锁定 3 款最适合雨天的暖饮', tag: '产品' },
      { step: 'STEP 2', head: '气氛拍摄', body: '玻璃水雾、暖灯、热气腾腾镜头', tag: '视觉' },
      { step: 'STEP 3', head: 'LBS 推送', body: '气象触发的优惠券分发', tag: '增长' },
    ],
    persona: {
      primary: '都市办公人群',
      secondary: '居家女性',
      platform: '小红书 / 微信',
      cta: '点一杯',
    },
    refs: [
      { brand: '7-11', desc: '关东煮天气推送', result: '雨天客流提升 40%' },
      { brand: '喜茶', desc: '冬日热饮季', result: '冬季热饮占比超 35%' },
    ],
    tags: ['雨天', '暖饮', '天气', '情绪'],
  },
  {
    slug: 'demo-09',
    title: '咖啡师独白：每天给陌生人写一句话',
    hook: '杯子上歪歪扭扭那行字，不是模板，是他今天最想说的话。',
    thinking:
      '把品牌人格落到具体的个体——咖啡师。手写一句话本来就是星巴克的隐性温暖触点，把它显性化、内容化。一线员工自己讲故事最真实，机制是「品牌不再是 logo，而是有温度的人」。',
    exec_plan: {
      format: '系列短视频纪录片',
      cta: '今天你最想被一句话治愈的话是？',
      best_time: '系列每周一更，连发 8 周',
      execution: '挑 8 位有代表性的咖啡师，每人一集 90 秒短片。',
    },
    handoff: [
      { step: 'STEP 1', head: '人物筛选', body: '老带新、跨城市、不同性格', tag: '人物' },
      { step: 'STEP 2', head: '内容录制', body: '现场记录而非剧本拍摄', tag: '拍摄' },
      { step: 'STEP 3', head: '社交分发', body: '短视频 + 长图文双形态', tag: '分发' },
    ],
    persona: {
      primary: '寻找情感共鸣的年轻人',
      secondary: '品牌好感人群',
      platform: '抖音 / 小红书',
      cta: '关注品牌',
    },
    refs: [
      { brand: '京东快递', desc: '快递员系列纪录片', result: '播放破 5 亿' },
      { brand: '宜家', desc: '员工故事广告', result: '品牌好感度 +12%' },
    ],
    tags: ['人物', '咖啡师', '温暖', '纪录'],
  },
  {
    slug: 'demo-10',
    title: '元气早餐组合：3 分钟搞定一顿能上班的早饭',
    hook: '一杯燕麦拿铁 + 一份贝果，比任何减脂餐都好吃。',
    thinking:
      '从单品延伸到「早餐场景」整体解决方案。年轻人不愿做饭但又想吃好，星巴克早餐组合的客单价低、门店密度高、出餐快，是真正能成为日常选择的产品。机制是「场景占领」打卡日常化。',
    exec_plan: {
      format: '美食 vlog + 套餐推荐',
      cta: '你的早餐是什么？',
      best_time: '工作日 7:30–9:00',
      execution: '上线 5 套早餐组合，对应不同需求（轻断食、能量、补充蛋白等）。',
    },
    handoff: [
      { step: 'STEP 1', head: '套餐设计', body: '5 套差异化早餐组合', tag: '产品' },
      { step: 'STEP 2', head: '美食博主背书', body: '健身/职场博主联合背书', tag: 'KOL' },
      { step: 'STEP 3', head: '小程序入口', body: '提前下单店内自取', tag: '体验' },
    ],
    persona: {
      primary: '25–35 岁职场新人',
      secondary: '健身人群',
      platform: '小红书 / 微信',
      cta: '想试套餐',
    },
    refs: [
      { brand: '麦当劳', desc: '早餐心智广告', result: '中国早餐时段占比超 25%' },
      { brand: 'Tims', desc: '咖啡 + 贝果套餐', result: '套餐复购率 50%+' },
    ],
    tags: ['早餐', '套餐', '场景', '日常'],
  },
  {
    slug: 'demo-11',
    title: '手冲工作坊：周末两小时，你也能在家做一杯',
    hook: '不是教你买更贵的器具，是教你做出懂自己的那杯。',
    thinking:
      '把品牌从消费场景延伸到学习场景。手冲教学满足年轻人「精致生活」「DIY 满足感」的需求，门店做为知识载体而非单纯卖点。机制是「教育型内容」带来更深的品牌认同。',
    exec_plan: {
      format: '门店活动 + 录播课程',
      cta: '想报名哪一场？',
      best_time: '周六下午 14:00–16:00',
      execution: '在 10 家臻选门店开设付费工作坊，配套小红书报名入口。',
    },
    handoff: [
      { step: 'STEP 1', head: '课程设计', body: '基础+进阶两档，2 小时内完成', tag: '内容' },
      { step: 'STEP 2', head: '门店选址', body: '挑 10 家空间合适的臻选店', tag: '运营' },
      { step: 'STEP 3', head: '内容化', body: '现场拍摄发布"在家也能做"教学短视频', tag: '内容' },
    ],
    persona: {
      primary: '咖啡爱好者',
      secondary: '生活方式探索者',
      platform: '小红书 / B站',
      cta: '想报名',
    },
    refs: [
      { brand: 'lululemon', desc: '门店瑜伽课', result: '社群留存 70%+' },
      { brand: '茑屋书店', desc: '生活方式课程', result: '会员复购 60%' },
    ],
    tags: ['手冲', '工作坊', '体验', '教育'],
  },
  {
    slug: 'demo-12',
    title: '联名限定：当星巴克遇上《穿 Prada 的女魔头 2》',
    hook: '"那杯无糖低脂浓咖啡" 18 年后，又回到了我们手里。',
    thinking:
      '借势经典 IP 续作话题。原作中星巴克外卖梗已是经典，续集是天然的内容资产。把这层 IP 联想做实——联名杯+特调饮品+台词印花，让粉丝怀旧的同时为新作热度续命。机制是 IP × 品牌的双向背书。',
    exec_plan: {
      format: '主视觉海报 + 限定上市',
      cta: '哪一句台词是你的青春？',
      best_time: '电影上映前后 14 天',
      execution: '上线 3 款 IP 联名杯+1 款致敬原作的特调，门店统一更换主视觉。',
    },
    handoff: [
      { step: 'STEP 1', head: 'IP 授权', body: '取得电影方台词/视觉授权', tag: '法务' },
      { step: 'STEP 2', head: '产品开发', body: '联名杯 + 致敬款饮品', tag: '产品' },
      { step: 'STEP 3', head: '点映合作', body: '关键城市点映场赠饮', tag: '活动' },
    ],
    persona: {
      primary: '25–40 岁电影怀旧人群',
      secondary: '时尚爱好者',
      platform: '小红书 / 微博',
      cta: '想收藏一套',
    },
    refs: [
      { brand: 'KFC × 原神', desc: 'IP 联名限定套餐', result: '当日销量破日常 3 倍' },
      { brand: '喜茶 × 原神', desc: '主题门店', result: '话题阅读破 5 亿' },
    ],
    tags: ['联名', 'IP', '电影', '怀旧'],
  },
  {
    slug: 'demo-13',
    title: '校园专场：开学季的第一杯请客',
    hook: '凭学生证一杯半价——给重新开学的你打一针元气。',
    thinking:
      '锁定 9 月开学季的高峰流量。学生群体客单价低但社交属性强，半价请客一方面降低尝试门槛，一方面靠"晒学生证半价"的内容形成校园 UGC。机制是低门槛 × 强社交 = 自然裂变。',
    exec_plan: {
      format: '校园活动 + UGC 互动',
      cta: '晒出你的开学第一杯',
      best_time: '8 月底 - 9 月中',
      execution: '联动 200 所大学城周边门店，凭学生证享指定饮品半价。',
    },
    handoff: [
      { step: 'STEP 1', head: '门店圈定', body: '锁定大学城周边 200 家门店', tag: '运营' },
      { step: 'STEP 2', head: '校园 KOC', body: '招募 50 位校园博主开题', tag: 'KOL' },
      { step: 'STEP 3', head: '话题运营', body: '#开学第一杯 全平台铺开', tag: '话题' },
    ],
    persona: {
      primary: '大学生',
      secondary: '研究生新生',
      platform: '小红书 / 抖音',
      cta: '想去打卡',
    },
    refs: [
      { brand: '蜜雪冰城', desc: '校园低价策略', result: '校园门店占比超 40%' },
      { brand: '麦当劳', desc: '开学季套餐', result: '9 月销量同比 +20%' },
    ],
    tags: ['开学季', '校园', '学生', '半价'],
  },
  {
    slug: 'demo-14',
    title: '咖啡渣再利用：你喝完的杯，能种出一盆植物',
    hook: '原来每天的咖啡渣，比花店买的肥料还要好用。',
    thinking:
      '切「可持续生活」议题。咖啡渣的园艺/家清用法是自带搜索的实用内容，把它和环保人设打包，建立「环保不只是口号」的品牌印象。机制是实用价值 + 价值观传播。',
    exec_plan: {
      format: '生活技巧图文 + 环保短片',
      cta: '你还有什么咖啡渣妙用？',
      best_time: '世界地球日前后',
      execution: '上线门店免费索取的「咖啡渣再生套装」，配生活博主联合发布技巧。',
    },
    handoff: [
      { step: 'STEP 1', head: '套装设计', body: '咖啡渣 + 简易种植包', tag: '产品' },
      { step: 'STEP 2', head: '内容矩阵', body: '5 种用法各拍一条短视频', tag: '内容' },
      { step: 'STEP 3', head: '门店领取', body: '免费索取限量发放', tag: '运营' },
    ],
    persona: {
      primary: '环保意识的城市青年',
      secondary: '园艺爱好者',
      platform: '小红书',
      cta: '想试试看',
    },
    refs: [
      { brand: 'Patagonia', desc: '可持续讲故事', result: '品牌好感度持续行业第一' },
      { brand: 'lululemon', desc: '回收旧衣项目', result: '社群参与超百万' },
    ],
    tags: ['可持续', '环保', '生活技巧', '价值观'],
  },
  {
    slug: 'demo-15',
    title: '新店预告：下个月你家楼下要开第几家了？',
    hook: '一城两店、三店、五店——星巴克密度地图正在更新。',
    thinking:
      '把开店节奏本身作为内容。把每一次新店开业拍成「城市生活方式更新」事件，建立「我家楼下开了一家」的归属感期待。机制是把品牌扩张转化为本地话题。',
    exec_plan: {
      format: '本地推送 + 开业打卡',
      cta: '你家楼下开第几家了？',
      best_time: '新店开业前 3 天 / 当天',
      execution: '建立全国新店地图小程序，开业前 3 天本地推送 + 开业首日赠饮。',
    },
    handoff: [
      { step: 'STEP 1', head: '地图建设', body: '全国新店地图小程序', tag: '产品' },
      { step: 'STEP 2', head: '本地 KOL', body: '每个新店配 3 位本地博主提前体验', tag: 'KOL' },
      { step: 'STEP 3', head: '开业活动', body: '前 100 杯赠送限定杯套', tag: '运营' },
    ],
    persona: {
      primary: '本地居民',
      secondary: '咖啡尝鲜者',
      platform: '小红书 / 微信',
      cta: '想去打卡',
    },
    refs: [
      { brand: '瑞幸', desc: '万店地图营销', result: '门店覆盖密度心智第一' },
      { brand: '麦当劳', desc: '新店开业话题', result: '本地热搜常客' },
    ],
    tags: ['新店', '本地', '密度', '开业'],
  },
]

// ============================================================
// 4 套预备灵感分析（轮换）
// ============================================================

export const DEMO_INSPIRATIONS: MockInspiration[] = [
  {
    analysis:
      '高饱和暖色调 + 大字标题排版，主视觉聚焦在饮品本身，文案走"情绪化生活流"。这类内容靠强对比色和直白情绪文案抓眼，适合做产品种草和情绪共鸣类话题。',
    suggestions: [
      {
        title: '深秋第一口暖：星巴克燕麦拿铁出片实录',
        hook: '杯壁有水雾，桌子是木的，今天的天气适合慢一点。',
        why: '同样的高饱和暖调和大字标题',
        format: '九宫格图文',
      },
      {
        title: '工位救命三件套：杯子、键盘、不愿崩溃的我',
        hook: '只要这杯还热着，今天就还有救。',
        why: '复刻情绪化文案 + 产品强主体',
        format: '横版图文',
      },
    ],
  },
  {
    analysis:
      'ins 风极简构图，大量留白 + 文艺长图叙事，色调统一在莫兰迪/裸色系。这类内容靠氛围和文字密度建立"高级感"和"慢生活"心智，适合品牌调性和门店空间。',
    suggestions: [
      {
        title: '星巴克臻选：午后两点钟的城市留白',
        hook: '不是所有时间都需要被填满，比如这两个小时。',
        why: '保留极简构图和大量留白',
        format: '长图文',
      },
      {
        title: '一个人的咖啡馆：周末下午的 5 种坐姿',
        hook: '靠窗、靠墙、靠书堆、靠自己——你今天选哪一种？',
        why: '复刻文艺长图的叙事节奏',
        format: '横版组图',
      },
    ],
  },
  {
    analysis:
      '对比拼贴 + 数字标题（"3 件事"、"5 种点法"），信息密度高、收藏率高。这类内容是清单型工具笔记，强调实用价值，传播机制是"我先收藏再说"。',
    suggestions: [
      {
        title: '星巴克隐藏点单 7 招：店员都默认你懂',
        hook: '不在菜单上但每家都会做，看完照念就行。',
        why: '复刻数字清单的工具感',
        format: '清单图文',
      },
      {
        title: '一杯咖啡的 5 种打开方式：通勤/办公/约会/独处/失眠',
        hook: '同一杯不同场景，喝法和心情完全不一样。',
        why: '保留对比拼贴的密度',
        format: '九宫格图文',
      },
    ],
  },
  {
    analysis:
      '九宫格 + emoji 贴纸 + 手写体字幕，整体偏"日常分享"年轻语态。这类内容轻松、不端着，UGC 感很强，适合互动型话题和年轻人群破圈。',
    suggestions: [
      {
        title: '今日份续命：星巴克打卡日记 day7',
        hook: '连续打卡一周后，我对店员的脸都熟了',
        why: '复刻日常分享的随性语态',
        format: '九宫格 + emoji',
      },
      {
        title: '记录我的星巴克小怪癖：每杯都要加这一勺',
        hook: '不是必须，但加了之后就回不去了。',
        why: '保留手写体 + 年轻语态',
        format: '短视频 + 字幕',
      },
    ],
  },
]

// ============================================================
// 工具函数
// ============================================================

const COVER_BUCKET = 'topic-covers'
const COVER_PATH_PREFIX = 'demo'

export function demoCoverStoragePath(slug: string): string {
  return `${COVER_PATH_PREFIX}/${slug}.png`
}

export function demoCoverBucket(): string {
  return COVER_BUCKET
}

// 从 池中随机抽 n 条不重复
export function sampleTopics(n: number): MockTopic[] {
  const pool = [...DEMO_TOPICS]
  const out: MockTopic[] = []
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

export function sampleInspiration(): MockInspiration {
  return DEMO_INSPIRATIONS[Math.floor(Math.random() * DEMO_INSPIRATIONS.length)]
}

export function isDemoMode(): boolean {
  // 默认 ON：未设置或非 'false' 都视为 demo 模式
  return process.env.DEMO_MODE !== 'false'
}
