# PRD — AI Social Studio · Week 1 骨架

## 产品定位

AI-powered social content review studio for brand teams.

帮助品牌市场团队把「内容选题会议」从人工碰运气变成结构化 AI 辅助决策流程。

核心循环：
`输入 Campaign 参数 → AI 生成选题 → 数字人评审打分 → 团队协作审批 → 出街预览 → 执行`

---

## Tech Stack

- **前端**：Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **后端**：Supabase (PostgreSQL + Auth + Realtime)
- **AI**：Anthropic Claude API（选题生成 + 评审打分）
- **部署**：Vercel
- **Auth**：Supabase Auth（邮箱/GitHub OAuth）

---

## 数据库 Schema

### campaigns
```sql
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  brand_name text not null,           -- 品牌名，如「星巴克」
  ip_name text not null,              -- 合作 IP，如「穿Prada的女魔头2」
  target_audience text not null,      -- 目标人群描述
  campaign_goal text not null,        -- Campaign 目标
  platforms text[] not null,          -- 发布平台，如 ['xhs', 'douyin']
  tone text not null,                 -- 品牌语气，如「年轻/情感/高级感」
  deadline date,
  status text default 'draft'         -- draft / active / archived
);
```

### topics
```sql
create table topics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  campaign_id uuid references campaigns(id) on delete cascade,
  seq_num int not null,               -- #01 #02 排序
  title text not null,
  hook text not null,                 -- 一句话 hook 文案
  thinking text,                      -- AI 生成的选题思考
  exec_plan jsonb,                    -- 执行方案（格式、时间等）
  handoff jsonb,                      -- 承接路径三步
  refs jsonb,                         -- 参考案例
  persona jsonb,                      -- 人群锁定
  status text default 'pending',      -- pending / approved / discussing / rejected
  ai_avg_score numeric(3,1),          -- AI 平均分（冗余字段，便于排序）
  deleted_at timestamptz              -- 软删除
);
```

### ai_evaluations
```sql
create table ai_evaluations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  topic_id uuid references topics(id) on delete cascade,
  persona_name text not null,         -- 小林 / 王女士 / Mia / 沈浩 / Lily
  persona_desc text,                  -- 25岁 · 运营打工人
  emoji text,
  score numeric(3,1) not null,
  quote text not null,                -- 评委引言
  verdict text,                       -- 5.0 强推 / 4.0 召回+拉新
  reasoning text                      -- 完整推理（可选展开）
);
```

### comments
```sql
create table comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  topic_id uuid references topics(id) on delete cascade,
  user_name text not null,            -- 不强制登录，允许匿名填名字
  user_role text,                     -- Agency / 社媒团队 / CGO 等
  content text not null,
  deleted_at timestamptz
);
```

---

## Week 1 任务范围（骨架）

### 1. 项目基础设置
- [ ] 配置 Supabase 环境变量（`.env.local`）
- [ ] 安装 Supabase JS client：`@supabase/supabase-js @supabase/ssr`
- [ ] 安装 Anthropic SDK：`@anthropic-ai/sdk`
- [ ] 跑 SQL 在 Supabase 建4张表（含 RLS 策略）
- [ ] 配置 Tailwind 主题色（green: #00ae66，yellow: #ff9500，blue: #3d7eff）

### 2. 页面路由
```
/                   → 首页/营销落地页（简单，有「开始创建」按钮）
/campaigns          → Campaign 列表
/campaigns/new      → 创建 Campaign 表单
/campaigns/[id]     → Campaign 详情（选题评审主界面）
/campaigns/[id]/topics/[topicId]  → 单个选题详情（可选，Detail Sheet 也可用抽屉）
```

### 3. Campaign 创建表单（`/campaigns/new`）
字段：
- 品牌名（text，必填）
- 合作 IP / 主题（text，必填）
- 目标人群（textarea，必填）
- Campaign 目标（textarea，必填）
- 发布平台（多选：小红书 / 抖音 / 微博 / 微信）
- 品牌语气（单选：年轻活泼 / 情感共鸣 / 高级感 / 自嘲幽默）
- 截止日期（date，选填）

提交后 → 写入 `campaigns` 表 → 跳转 `/campaigns/[id]`

### 4. 主评审界面（`/campaigns/[id]`）
- 从 DB 读 topics（初始为空，有「生成选题」按钮）
- 点击「生成选题」→ 调用 `/api/generate-topics` → 写入 topics + ai_evaluations
- 展示选题卡片列表（参考现有 HTML 的卡片设计）
- 卡片操作：通过 / 讨论 / 拒绝（更新 status）
- 点击卡片 → 打开 Detail Sheet（标签页：选题思考 / AI评分 / 执行方案 / 参考案例 / 点评）
- 点评区：输入名字+内容 → 写入 comments 表（Realtime 实时刷新）

### 5. AI 生成接口（`/api/generate-topics`）

**输入**（POST body）：
```json
{
  "campaignId": "uuid",
  "brand": "星巴克",
  "ip": "穿Prada的女魔头2",
  "audience": "职场女性 25-38岁",
  "goal": "联名新品推广+品牌情感联结",
  "platforms": ["xhs", "douyin"],
  "tone": "情感共鸣"
}
```

**Claude prompt 结构**：
1. System：你是资深社交媒体内容策划，帮品牌生成适合中国社媒平台的选题
2. User：给定以上 Campaign 参数，生成5个选题，每个包含：
   - title（标题）
   - hook（一句话 hook）
   - thinking（选题思考，为什么这个方向会赢，150字）
   - exec_plan（执行方案 JSON：format/cta/best_time）
   - handoff（承接路径：触达/激活/转化三步）
   - persona（人群：主/辅/平台/cta）
3. 要求 JSON 格式输出（structured output）

**AI 评审 prompt**：
生成选题后，对每个 topic 调用一次 Claude，模拟5位数字人评委打分，返回：
```json
[
  { "name": "小林", "desc": "25岁 · 运营打工人", "emoji": "😤", "score": 5.0, "quote": "...", "verdict": "5.0 强推" },
  ...
]
```

**输出**：写入 `topics` + `ai_evaluations` 表，返回 topic IDs。

---

## 不在范围内（Week 1）

- ❌ 图片/海报生成（mock 图片代替）
- ❌ 出街预览（Week 2）
- ❌ 用户登录认证（先不做，Week 3）
- ❌ 数据复盘 tab
- ❌ 邮件通知
- ❌ 多 workspace / 团队权限

---

## 验收标准

- [ ] `npm run dev` 本地启动无报错
- [ ] `/campaigns/new` 填表提交后，数据写入 Supabase `campaigns` 表
- [ ] 点击「生成选题」，Claude API 返回结果，5个 topic + 25条 ai_evaluation 写入 DB
- [ ] `/campaigns/[id]` 能展示 topic 卡片列表，从 DB 读取（不是 hardcode）
- [ ] 卡片通过/讨论/拒绝操作，status 更新到 DB
- [ ] 详情 Sheet 5个标签页正常切换，数据来自 DB
- [ ] 点评区提交 → 实时出现（Supabase Realtime）
- [ ] TypeScript 无 `any` 类型（允许 `unknown`）
- [ ] 移动端（375px）可用，卡片不溢出

---

## 环境变量（需在 Vercel + `.env.local` 配置）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

---

## 参考资源

- 现有 HTML 原型：`noa-pages/starbucks/starbucks-topic-review.html`
  - 这是已验证的 UI 设计，颜色/卡片结构/交互逻辑全参考它
  - 色值：`--green:#00ae66; --yellow:#ff9500; --blue:#3d7eff`
- Supabase JS 文档：https://supabase.com/docs/reference/javascript
- Claude API：https://docs.anthropic.com/en/api/messages
