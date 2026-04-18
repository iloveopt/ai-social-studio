'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, TopicWithEvals, Comment, AiEvaluation } from '@/types'
import InspirationUploader from './InspirationUploader'

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

const STATUS_LABELS: Record<string, string> = {
  pending: '待评审',
  approved: '已通过',
  discussing: '讨论中',
  rejected: '已拒绝',
}

function scoreColor(score: number) {
  if (score >= 4) return 'text-brand-green'
  if (score >= 3) return 'text-brand-yellow'
  return 'text-red-500'
}

function scoreBar(score: number) {
  if (score >= 4) return 'bg-brand-green'
  if (score >= 3) return 'bg-brand-yellow'
  return 'bg-red-500'
}

function CoverScore({ score }: { score: number | null }) {
  if (score === null) return null
  return (
    <div className="flex items-baseline gap-0.5 text-white drop-shadow">
      <span className="text-4xl font-black leading-none tabular-nums">{score.toFixed(1)}</span>
      <span className="text-xs font-medium opacity-80">分</span>
    </div>
  )
}

function CoverStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-white/85 text-gray-600',
    approved: 'bg-brand-green text-white',
    discussing: 'bg-brand-yellow text-white',
    rejected: 'bg-red-500 text-white',
  }
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm ${styles[status] ?? styles.pending}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function TagChip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}
    </span>
  )
}

const TAG_COLORS = [
  'bg-emerald-50 text-emerald-700',
  'bg-violet-50 text-violet-700',
  'bg-rose-50 text-rose-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700',
  'bg-pink-50 text-pink-700',
]

function topicTagChips(topic: TopicWithEvals): string[] {
  const fromHandoff = (topic.handoff ?? [])
    .map((h) => h.tag)
    .filter((t): t is string => !!t && typeof t === 'string')
  const unique = Array.from(new Set(fromHandoff))
  return unique.slice(0, 4)
}

function EvalCard({ ev }: { ev: AiEvaluation }) {
  const color = scoreColor(ev.score)
  const bar = scoreBar(ev.score)
  const pct = Math.max(0, Math.min(100, (ev.score / 5) * 100))
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{ev.emoji ?? '👤'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900">{ev.persona_name}</span>
            <span className={`text-sm font-bold tabular-nums ${color}`}>{ev.score.toFixed(1)}</span>
          </div>
          {ev.persona_desc && <p className="text-xs text-gray-400 mt-0.5">{ev.persona_desc}</p>}
          <p className="text-sm text-gray-700 mt-1.5 italic">&ldquo;{ev.quote}&rdquo;</p>
          {ev.verdict && (
            <span className="inline-block mt-1.5 text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">
              {ev.verdict}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2.5 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
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
              {topic.thinking ? (
                <blockquote className="text-sm text-gray-700 leading-relaxed pl-4 border-l-4 border-brand-green bg-brand-green/5 py-3 pr-3 rounded-r-lg whitespace-pre-line">
                  {topic.thinking}
                </blockquote>
              ) : (
                <p className="text-sm text-gray-400">暂无</p>
              )}
            </div>
          )}

          {tab === 'ai-score' && (
            <div className="space-y-4">
              {topic.ai_avg_score !== null && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">综合评分</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black tabular-nums ${scoreColor(topic.ai_avg_score)}`}>
                          {topic.ai_avg_score.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-400 font-medium">/ 5.0</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{topic.ai_evaluations.length} 位评委</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full ${scoreBar(topic.ai_avg_score)} rounded-full transition-all`}
                      style={{ width: `${(topic.ai_avg_score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {topic.ai_evaluations.map((ev) => (
                  <EvalCard key={ev.id} ev={ev} />
                ))}
              </div>
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

function XhsPreviewModal({
  topic,
  campaign,
  gradient,
  onClose,
  onApprove,
}: {
  topic: TopicWithEvals
  campaign: Campaign
  gradient: string
  onClose: () => void
  onApprove: () => void
}) {
  const stats = useMemo(
    () => ({
      likes: Math.floor(Math.random() * 2 + 1) + '万',
      comments: Math.floor(Math.random() * 5000 + 500),
      favorites: Math.floor(Math.random() * 3 + 1) + '万',
    }),
    []
  )

  const hashtags = useMemo(() => {
    const tags = [
      `#${campaign.brand_name}`,
      `#${campaign.ip_name}`,
      `#${campaign.tone}`,
      '#种草',
      '#品牌联名',
    ]
    return tags.slice(0, 4).join(' ')
  }, [campaign.brand_name, campaign.ip_name, campaign.tone])

  const topicTags = useMemo(() => {
    const base = [campaign.brand_name, campaign.ip_name, '联名']
    return base.slice(0, 3)
  }, [campaign.brand_name, campaign.ip_name])

  const fakeComments = [
    { user: '嘟嘟同学', avatar: '🎀', text: '说的就是我！！' },
    { user: '打工不累人', avatar: '☕', text: '已下单，等会去取～' },
    { user: 'Yuki_', avatar: '💼', text: '转发给闺蜜了，她肯定爱' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl max-h-full flex flex-col md:flex-row gap-6 items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 -mt-2 -mr-2 md:mt-2 md:mr-2 w-9 h-9 rounded-full bg-white/90 text-gray-800 hover:bg-white flex items-center justify-center shadow-lg z-20"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Phone frame */}
        <div className="flex-shrink-0">
          <div className="w-[320px] h-[660px] bg-black rounded-[44px] p-3 shadow-2xl border-[3px] border-gray-800 relative">
            <div className="w-full h-full bg-white rounded-[32px] overflow-hidden flex flex-col relative">
              {/* Status bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 pt-2 pb-1 text-[11px] font-semibold text-black">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 22h3v-6H2v6zm5 0h3V12H7v10zm5 0h3V8h-3v14zm5 0h3V4h-3v18z" />
                  </svg>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21l3.5-4.5h-7L12 21zm0-18C7.03 3 3 7.03 3 12c0 .34.02.67.05 1h2.02C5.03 12.67 5 12.34 5 12c0-3.87 3.13-7 7-7s7 3.13 7 7c0 .34-.03.67-.07 1h2.02c.03-.33.05-.66.05-1 0-4.97-4.03-9-9-9z" />
                  </svg>
                  <span className="w-6 h-3 border border-black rounded-sm relative ml-0.5">
                    <span className="absolute inset-0.5 bg-black rounded-[1px]" />
                  </span>
                </div>
              </div>

              {/* App bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <span className="text-red-500 font-black text-lg tracking-tight">小红书</span>
                <div className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>

              {/* Scroll content */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style>{`.xhs-scroll::-webkit-scrollbar{display:none}`}</style>

                {/* Post header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex-shrink-0`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {campaign.brand_name}官方
                    </p>
                    <p className="text-[11px] text-gray-400">刚刚 · 来自{campaign.ip_name}</p>
                  </div>
                  <button className="flex-shrink-0 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
                    + 关注
                  </button>
                </div>

                {/* Cover image (gradient) */}
                <div
                  className={`aspect-square bg-gradient-to-br ${gradient} relative flex items-center justify-center`}
                >
                  <span className="text-white/80 text-[120px] font-black leading-none">
                    #{String(topic.seq_num).padStart(2, '0')}
                  </span>
                  <div className="absolute bottom-3 right-3 flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                    {topicTags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Post body */}
                <div className="px-4 py-3 space-y-2">
                  <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
                    {topic.title}
                  </h3>
                  <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                    {topic.hook}
                  </p>
                  <p className="text-[12px] text-blue-500 leading-relaxed">{hashtags}</p>
                </div>

                {/* Interaction bar */}
                <div className="flex items-center justify-around px-4 py-2 border-t border-b border-gray-100 text-gray-700 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-base">❤</span>
                    <span>{stats.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base">💬</span>
                    <span>{stats.comments}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base">⭐</span>
                    <span>{stats.favorites}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>分享</span>
                  </div>
                </div>

                {/* Comments */}
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-gray-400 font-medium">共 {stats.comments} 条评论</p>
                  {fakeComments.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-gray-500">{c.user}</p>
                        <p className="text-[13px] text-gray-800 leading-snug">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-16" />
              </div>

              {/* Bottom nav */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-around py-2 text-[10px] text-gray-500">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">🏠</span>
                    <span className="text-red-500 font-semibold">首页</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">🧭</span>
                    <span>探索</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                    +
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">💬</span>
                    <span>消息</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">👤</span>
                    <span>我</span>
                  </div>
                </div>
                {/* Home bar */}
                <div className="flex justify-center pb-1.5">
                  <div className="w-24 h-1 bg-black rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right info panel */}
        <div className="hidden md:block w-[360px] bg-white rounded-2xl shadow-2xl p-5 max-h-[660px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">选题编号</span>
            <span className="text-xs font-semibold text-brand-green">
              #{String(topic.seq_num).padStart(2, '0')}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-snug mb-4">{topic.title}</h3>

          {topic.exec_plan && (
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                执行方案
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-400 mb-0.5">内容格式</p>
                  <p className="text-sm text-gray-800">{topic.exec_plan.format}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-400 mb-0.5">最佳发布时间</p>
                  <p className="text-sm text-gray-800">{topic.exec_plan.best_time}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-400 mb-0.5">CTA</p>
                  <p className="text-sm text-gray-800">{topic.exec_plan.cta}</p>
                </div>
              </div>
            </div>
          )}

          {topic.persona && (
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                人群锁定
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-400 mb-0.5">主要人群</p>
                  <p className="text-sm text-gray-800">{topic.persona.primary}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-400 mb-0.5">平台</p>
                  <p className="text-sm text-gray-800">{topic.persona.platform}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 mb-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              预估数据
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-red-50 rounded-lg text-center">
                <p className="text-[11px] text-gray-400">点赞</p>
                <p className="text-sm font-bold text-red-500">{stats.likes}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                <p className="text-[11px] text-gray-400">评论</p>
                <p className="text-sm font-bold text-brand-blue">{stats.comments}</p>
              </div>
              <div className="p-2.5 bg-yellow-50 rounded-lg text-center">
                <p className="text-[11px] text-gray-400">收藏</p>
                <p className="text-sm font-bold text-brand-yellow">{stats.favorites}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onApprove}
              className="w-full py-3 rounded-xl bg-brand-green text-white text-sm font-semibold hover:opacity-90 transition"
            >
              ✓ 通过此选题
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
            >
              返回评审
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function XhsFeedCard({
  topic,
  index,
  campaign,
  onOpen,
}: {
  topic: TopicWithEvals
  index: number
  campaign: Campaign
  onOpen: () => void
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const tags = topicTagChips(topic)
  const brandInitial = (campaign.brand_name || '·').trim().charAt(0).toUpperCase()
  const statusText = STATUS_LABELS[topic.status] ?? topic.status
  const reviewerCount = topic.ai_evaluations.length
  const scoreLabel = topic.ai_avg_score !== null ? topic.ai_avg_score.toFixed(1) : '--'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      <div className={`relative aspect-[3/4] bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Seq badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white text-[11px] font-semibold tabular-nums">
            #{String(topic.seq_num).padStart(2, '0')}
          </span>
        </div>
        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <CoverStatusBadge status={topic.status} />
        </div>
        {/* Title */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <h3
            className="text-white font-black leading-tight text-center text-[18px] md:text-[20px] line-clamp-4"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}
          >
            {topic.title}
          </h3>
        </div>
        {/* Bottom gradient + hook */}
        <div className="absolute inset-x-0 bottom-0 pt-10 pb-3 px-3 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
          <p className="text-white/95 text-xs leading-snug line-clamp-2">{topic.hook}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Author row */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
          >
            {brandInitial}
          </div>
          <span className="text-[12px] text-gray-700 font-medium truncate">{campaign.brand_name}</span>
          <span className="text-[11px] text-gray-300 flex-shrink-0">·</span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">刚刚</span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t, i) => (
              <TagChip key={i} label={t} color={TAG_COLORS[i % TAG_COLORS.length]} />
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
          <span className="flex items-center gap-0.5">
            <span className="text-red-500">❤</span>
            <span className={`font-semibold tabular-nums ${topic.ai_avg_score !== null ? scoreColor(topic.ai_avg_score) : 'text-gray-400'}`}>
              {scoreLabel}
            </span>
          </span>
          <span className="flex items-center gap-0.5">
            <span>💬</span>
            <span className="tabular-nums">{reviewerCount}</span>
          </span>
          <span className="flex items-center gap-0.5 ml-auto">
            <span>⭐</span>
            <span>{statusText}</span>
          </span>
        </div>
      </div>
    </button>
  )
}

function XhsFeedView({
  topics,
  campaign,
  onOpen,
}: {
  topics: TopicWithEvals[]
  campaign: Campaign
  onOpen: (topic: TopicWithEvals) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {topics.map((t, i) => (
        <XhsFeedCard
          key={t.id}
          topic={t}
          index={i}
          campaign={campaign}
          onOpen={() => onOpen(t)}
        />
      ))}
    </div>
  )
}

export default function ReviewBoard({ campaign, initialTopics }: Props) {
  const [topics, setTopics] = useState<TopicWithEvals[]>(initialTopics)
  const [current, setCurrent] = useState(0)
  const [feedView, setFeedView] = useState(true)
  const [sheetTopic, setSheetTopic] = useState<TopicWithEvals | null>(null)
  const [previewTopic, setPreviewTopic] = useState<TopicWithEvals | null>(null)
  const [previewGradient, setPreviewGradient] = useState<string>(GRADIENTS[0])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('链接已复制')
    } catch {
      setToast('复制失败')
    }
    setTimeout(() => setToast(null), 2000)
  }

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

  const counts = useMemo(() => {
    const init = { approved: 0, discussing: 0, pending: 0, rejected: 0 }
    for (const t of topics) {
      if (t.status in init) init[t.status as keyof typeof init]++
    }
    return init
  }, [topics])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              S
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="font-semibold text-gray-500">AI Social Studio</span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                <span className="truncate">Campaign</span>
              </div>
              <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">
                {campaign.brand_name} × {campaign.ip_name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setFeedView((v) => !v)}
              title={feedView ? '切换到策划视图' : '切换到XHS视图'}
              className="hidden sm:flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-xs font-medium"
              aria-label="切换视图"
            >
              {feedView ? (
                <>
                  <span>🗂️</span>
                  <span>策划视图</span>
                </>
              ) : (
                <>
                  <span>📱</span>
                  <span>XHS视图</span>
                </>
              )}
            </button>
            <button
              onClick={() => setFeedView((v) => !v)}
              title={feedView ? '切换到策划视图' : '切换到XHS视图'}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-base"
              aria-label="切换视图"
            >
              {feedView ? '🗂️' : '📱'}
            </button>
            <InspirationUploader campaignId={campaign.id} />
            <button
              onClick={handleShare}
              title="分享此链接"
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              aria-label="分享"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-green text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成中
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
        </div>
        {topics.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-100">
            <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  <span className="text-gray-500">已通过</span>
                  <span className="font-bold text-brand-green tabular-nums">{counts.approved}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                  <span className="text-gray-500">讨论中</span>
                  <span className="font-bold text-brand-yellow tabular-nums">{counts.discussing}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="text-gray-500">待审核</span>
                  <span className="font-bold text-gray-500 tabular-nums">{counts.pending}</span>
                </span>
              </div>
              <span className="text-gray-400">
                总计 <span className="font-bold text-gray-700 tabular-nums">{topics.length}</span>
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className={`flex-1 overflow-y-auto ${feedView ? 'px-3 md:px-6 py-4' : 'flex flex-col items-center justify-center px-4 py-6'} bg-gray-50`}>
        <div className={`w-full mx-auto ${feedView ? 'max-w-3xl' : 'max-w-lg'}`}>
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

          {!generating && topics.length > 0 && feedView && (
            <XhsFeedView topics={topics} campaign={campaign} onOpen={(t) => setSheetTopic(t)} />
          )}

          {!generating && !feedView && topics.length > 0 && topic && (
            <>
              {/* Card */}
              <div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Gradient cover */}
                <div className={`relative h-36 bg-gradient-to-br ${GRADIENTS[current % GRADIENTS.length]} p-4`}>
                  <div className="absolute top-3 right-3">
                    <CoverStatusBadge status={topic.status} />
                  </div>
                  <div className="absolute bottom-3 left-4">
                    <span className="text-white/55 text-5xl font-black leading-none tracking-tight">
                      #{String(topic.seq_num).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-4">
                    <CoverScore score={topic.ai_avg_score} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{topic.title}</h2>
                    <p className="text-sm text-gray-500 leading-relaxed mt-1.5 line-clamp-2">{topic.hook}</p>
                  </div>

                  {(() => {
                    const tags = topicTagChips(topic)
                    if (tags.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t, i) => (
                          <TagChip key={i} label={t} color={TAG_COLORS[i % TAG_COLORS.length]} />
                        ))}
                      </div>
                    )
                  })()}

                  {topic.persona && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
                      {topic.persona.primary && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {topic.persona.primary}
                        </span>
                      )}
                      {topic.persona.primary && topic.persona.platform && <span className="text-gray-300">→</span>}
                      {topic.persona.platform && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {topic.persona.platform}
                        </span>
                      )}
                      {topic.persona.platform && topic.persona.cta && <span className="text-gray-300">→</span>}
                      {topic.persona.cta && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {topic.persona.cta}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action rows */}
                  <div className="pt-1 space-y-2">
                    {/* Row 1: preview (full-width secondary) */}
                    <button
                      onClick={() => {
                        setPreviewGradient(GRADIENTS[current % GRADIENTS.length])
                        setPreviewTopic(topic)
                      }}
                      className="w-full py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      出街预览（小红书样式）
                    </button>

                    {/* Row 2: 3 status buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_ACTIONS.map((action) => {
                        const active = topic.status === action.status
                        return (
                          <button
                            key={action.status}
                            onClick={() => updateStatus(topic.id, action.status)}
                            className={`py-2 rounded-lg text-sm font-medium transition ${action.color} ${
                              active ? 'ring-2 ring-offset-1 ring-current font-bold' : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            {action.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Row 3: detail */}
                    <button
                      onClick={() => setSheetTopic(topic)}
                      className="w-full py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      查看详情 →
                    </button>
                  </div>
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

      {previewTopic && (
        <XhsPreviewModal
          topic={previewTopic}
          campaign={campaign}
          gradient={previewGradient}
          onClose={() => setPreviewTopic(null)}
          onApprove={() => {
            updateStatus(previewTopic.id, 'approved')
            setPreviewTopic(null)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-lg bg-gray-900 text-white text-sm shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}
