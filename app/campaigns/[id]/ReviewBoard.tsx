'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { use } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, TopicWithEvals, Comment, AiEvaluation } from '@/types'

const GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-orange-400 to-rose-500',
  'from-blue-500 to-cyan-500',
  'from-pink-500 to-fuchsia-600',
]

const STATUS_ACTIONS = [
  { status: 'approved', label: '通过', color: 'bg-brand-green text-white hover:opacity-90' },
  { status: 'discussing', label: '讨论', color: 'bg-brand-yellow text-white hover:opacity-90' },
  { status: 'rejected', label: '拒绝', color: 'bg-red-500 text-white hover:opacity-90' },
] as const

const TABS = [
  { key: 'thinking', label: '选题思考' },
  { key: 'ai-score', label: 'AI评分' },
  { key: 'exec-plan', label: '执行方案' },
  { key: 'refs', label: '参考案例' },
  { key: 'comments', label: '点评' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  campaign: Campaign
  initialTopics: TopicWithEvals[]
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color = score >= 4 ? 'text-brand-green' : score >= 3 ? 'text-brand-yellow' : 'text-red-500'
  return <span className={`text-4xl font-black tabular-nums ${color}`}>{score.toFixed(1)}</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    approved: 'bg-green-100 text-brand-green',
    discussing: 'bg-yellow-100 text-brand-yellow',
    rejected: 'bg-red-100 text-red-500',
  }
  const labels: Record<string, string> = {
    pending: '待评审',
    approved: '已通过',
    discussing: '讨论中',
    rejected: '已拒绝',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}

function EvalCard({ ev }: { ev: AiEvaluation }) {
  const color = ev.score >= 4 ? 'text-brand-green' : ev.score >= 3 ? 'text-brand-yellow' : 'text-red-500'
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
      <span className="text-xl flex-shrink-0">{ev.emoji ?? '👤'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900">{ev.persona_name}</span>
          <span className={`text-sm font-bold ${color}`}>{ev.score.toFixed(1)}</span>
        </div>
        {ev.persona_desc && <p className="text-xs text-gray-400 mt-0.5">{ev.persona_desc}</p>}
        <p className="text-sm text-gray-700 mt-1.5 italic">"{ev.quote}"</p>
        {ev.verdict && (
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">
            {ev.verdict}
          </span>
        )}
      </div>
    </div>
  )
}

function CommentsTab({ topicId }: { topicId: string }) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('comments')
      .select('*')
      .eq('topic_id', topicId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data as Comment[]) ?? []))

    const channel = supabase
      .channel(`comments:${topicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `topic_id=eq.${topicId}` },
        (payload) => setComments((prev) => [...prev, payload.new as Comment])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [topicId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return
    setSubmitting(true)
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId, user_name: name.trim(), user_role: role.trim() || undefined, content: text.trim() }),
    })
    setText('')
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[120px]">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">还没有点评，来说两句吧</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">{c.user_name}</span>
              {c.user_role && <span className="text-xs text-gray-400">{c.user_role}</span>}
              <span className="text-xs text-gray-300 ml-auto">
                {new Date(c.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-gray-700">{c.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2 border-t border-gray-100 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字 *"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="角色（选填）"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="写下你的点评..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim() || !text.trim()}
            className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 self-end"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}

function DetailSheet({
  topic,
  onClose,
}: {
  topic: TopicWithEvals
  onClose: () => void
}) {
  const [tab, setTab] = useState<TabKey>('thinking')

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">
                #{String(topic.seq_num).padStart(2, '0')}
              </p>
              <h2 className="text-base font-bold text-gray-900 leading-snug">{topic.title}</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{topic.hook}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mt-3 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-brand-green text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'thinking' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">{topic.thinking ?? '暂无'}</p>
            </div>
          )}

          {tab === 'ai-score' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">综合评分</span>
                {topic.ai_avg_score !== null && (
                  <span className="text-2xl font-black text-brand-green">{topic.ai_avg_score.toFixed(1)}</span>
                )}
              </div>
              {topic.ai_evaluations.map((ev) => (
                <EvalCard key={ev.id} ev={ev} />
              ))}
            </div>
          )}

          {tab === 'exec-plan' && topic.exec_plan && (
            <div className="space-y-4">
              {[
                { label: '内容格式', value: topic.exec_plan.format },
                { label: 'CTA', value: topic.exec_plan.cta },
                { label: '最佳发布时间', value: topic.exec_plan.best_time },
                topic.exec_plan.execution ? { label: '执行说明', value: topic.exec_plan.execution } : null,
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item!.label} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">{item!.label}</p>
                    <p className="text-sm text-gray-800">{item!.value}</p>
                  </div>
                ))}
              {topic.handoff && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">承接路径</p>
                  {topic.handoff.map((step, i) => (
                    <div key={i} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="text-xs font-semibold text-brand-blue">{step.head}</span>
                        <span className="ml-auto text-xs px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded">{step.tag}</span>
                      </div>
                      <p className="text-sm text-gray-700 pl-7">{step.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {topic.persona && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">人群锁定</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 text-xs">主要人群</span><p className="text-gray-800">{topic.persona.primary}</p></div>
                    <div><span className="text-gray-400 text-xs">次要人群</span><p className="text-gray-800">{topic.persona.secondary}</p></div>
                    <div><span className="text-gray-400 text-xs">平台</span><p className="text-gray-800">{topic.persona.platform}</p></div>
                    <div><span className="text-gray-400 text-xs">CTA</span><p className="text-gray-800">{topic.persona.cta}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'refs' && (
            <div className="space-y-3">
              {(topic.refs ?? []).map((ref, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900">{ref.brand}</p>
                  <p className="text-sm text-gray-600 mt-1">{ref.desc}</p>
                  <p className="text-xs text-brand-green mt-1.5">效果：{ref.result}</p>
                </div>
              ))}
              {(!topic.refs || topic.refs.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">暂无参考案例</p>
              )}
            </div>
          )}

          {tab === 'comments' && <CommentsTab topicId={topic.id} />}
        </div>
      </div>
    </div>
  )
}

export default function ReviewBoard({ campaign, initialTopics }: Props) {
  const [topics, setTopics] = useState<TopicWithEvals[]>(initialTopics)
  const [current, setCurrent] = useState(0)
  const [sheetTopic, setSheetTopic] = useState<TopicWithEvals | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const touchStartX = useRef<number | null>(null)

  const topic = topics[current]

  function prev() { setCurrent((c) => Math.max(0, c - 1)) }
  function next() { setCurrent((c) => Math.min(topics.length - 1, c + 1)) }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 50) prev()
    else if (dx < -50) next()
    touchStartX.current = null
  }

  async function updateStatus(topicId: string, status: string) {
    await fetch(`/api/topics/${topicId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTopics((ts) =>
      ts.map((t) => (t.id === topicId ? { ...t, status } : t))
    )
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          brand: campaign.brand_name,
          ip: campaign.ip_name,
          audience: campaign.target_audience,
          goal: campaign.campaign_goal,
          platforms: campaign.platforms,
          tone: campaign.tone,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '生成失败')
      }
      // Re-fetch topics
      const supabase = createClient()
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*, ai_evaluations(*)')
        .eq('campaign_id', campaign.id)
        .is('deleted_at', null)
        .order('seq_num', { ascending: true })
      setTopics((topicsData as TopicWithEvals[]) ?? [])
      setCurrent(0)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Campaign</p>
            <h1 className="text-sm font-bold text-gray-900 truncate">
              {campaign.brand_name} × {campaign.ip_name}
            </h1>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {topics.length > 0 ? '重新生成' : '生成选题'}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col items-center justify-center px-4 py-6 bg-gray-50">
        <div className="w-full max-w-lg">
          {genError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {genError}
            </div>
          )}

          {generating && (
            <div className="text-center py-16 space-y-4">
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-brand-green animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-gray-500 text-sm">AI 正在生成选题和评审打分，请稍候…</p>
            </div>
          )}

          {!generating && topics.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">✨</div>
              <p className="text-gray-500 text-base">点击「生成选题」，让 AI 为你生成内容创意</p>
            </div>
          )}

          {!generating && topics.length > 0 && topic && (
            <>
              {/* Card */}
              <div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Gradient cover */}
                <div className={`h-32 bg-gradient-to-br ${GRADIENTS[current % GRADIENTS.length]} flex items-end p-4`}>
                  <div className="flex items-end justify-between w-full">
                    <span className="text-white/60 text-5xl font-black leading-none">
                      #{String(topic.seq_num).padStart(2, '0')}
                    </span>
                    <ScoreBadge score={topic.ai_avg_score} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <h2 className="text-base font-bold text-gray-900 flex-1 leading-snug">{topic.title}</h2>
                    <StatusBadge status={topic.status} />
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{topic.hook}</p>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {STATUS_ACTIONS.map((action) => (
                      <button
                        key={action.status}
                        onClick={() => updateStatus(topic.id, action.status)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${action.color} ${
                          topic.status === action.status ? 'ring-2 ring-offset-1 ring-current opacity-100' : ''
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setSheetTopic(topic)}
                    className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    查看详情
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={prev}
                  disabled={current === 0}
                  className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Dots */}
                <div className="flex gap-2">
                  {topics.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`rounded-full transition-all ${
                        i === current ? 'w-6 h-2.5 bg-brand-green' : 'w-2.5 h-2.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={next}
                  disabled={current === topics.length - 1}
                  className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-2">
                {current + 1} / {topics.length} · 左右滑动切换
              </p>
            </>
          )}
        </div>
      </main>

      {sheetTopic && (
        <DetailSheet topic={sheetTopic} onClose={() => setSheetTopic(null)} />
      )}
    </div>
  )
}
