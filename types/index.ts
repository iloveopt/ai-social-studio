export interface Campaign {
  id: string
  created_at: string
  user_id: string | null
  brand_name: string
  ip_name: string
  target_audience: string
  campaign_goal: string
  platforms: string[]
  tone: string
  deadline: string | null
  status: string
}

export interface ExecPlan {
  format: string
  cta: string
  best_time: string
  execution?: string
}

export interface HandoffStep {
  step: string
  head: string
  body: string
  tag: string
}

export interface Persona {
  primary: string
  secondary: string
  platform: string
  cta: string
}

export interface Ref {
  brand: string
  desc: string
  result: string
}

export interface Topic {
  id: string
  created_at: string
  campaign_id: string
  seq_num: number
  title: string
  hook: string
  thinking: string | null
  exec_plan: ExecPlan | null
  handoff: HandoffStep[] | null
  refs: Ref[] | null
  persona: Persona | null
  status: string
  ai_avg_score: number | null
  deleted_at: string | null
}

export interface AiEvaluation {
  id: string
  created_at: string
  topic_id: string
  persona_name: string
  persona_desc: string | null
  emoji: string | null
  score: number
  quote: string
  verdict: string | null
  reasoning: string | null
}

export interface Comment {
  id: string
  created_at: string
  topic_id: string
  user_name: string
  user_role: string | null
  content: string
  deleted_at: string | null
}

export interface TopicWithEvals extends Topic {
  ai_evaluations: AiEvaluation[]
}

export interface InspirationSuggestion {
  title: string
  hook: string
  why: string
  format: string
}

export interface Inspiration {
  id: string
  created_at: string
  campaign_id: string
  image_url: string | null
  image_base64: string | null
  analysis: string | null
  suggestions: InspirationSuggestion[]
  status: "pending" | "done" | "error"
}
