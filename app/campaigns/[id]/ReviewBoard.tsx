'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type {
  Campaign,
  TopicWithEvals,
  Comment,
  AiEvaluation,
  TopicCategory,
  TopicWorkspace,
} from '@/types'
import InspirationUploader from './InspirationUploader'
import { TypewriterStages } from './TypewriterStages'

const CATEGORY_TABS: { key: TopicCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: '全部', emoji: '✨' },
  { key: 'hot', label: '热点', emoji: '🔥' },
  { key: 'campaign', label: '营销活动', emoji: '🎯' },
  { key: 'product', label: '产品', emoji: '☕' },
  { key: 'store', label: '门店', emoji: '📍' },
]

// Pastel palette for topic "cover images" (keyed by seq_num)
const SEQ_PALETTE: Array<{ bg: string; accent: string; avatar: string }> = [
  { bg: '#FFE4E1', accent: '#FFB7A0', avatar: 'linear-gradient(135deg,#FF9A8B,#FF6A88)' },
  { bg: '#E8F5E9', accent: '#A5D6A7', avatar: 'linear-gradient(135deg,#84FAB0,#8FD3F4)' },
  { bg: '#E3F2FD', accent: '#90CAF9', avatar: 'linear-gradient(135deg,#89F7FE,#66A6FF)' },
  { bg: '#FFF3E0', accent: '#FFCC80', avatar: 'linear-gradient(135deg,#FFD26F,#FF8A3D)' },
  { bg: '#F3E5F5', accent: '#CE93D8', avatar: 'linear-gradient(135deg,#C471F5,#FA71CD)' },
]

function palette(seq: number) {
  return SEQ_PALETTE[(seq - 1) % SEQ_PALETTE.length]
}

// Deterministic pseudo-random based on topic id for mock social counts
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function mockLikes(topic: TopicWithEvals): number {
  const base = Math.round((topic.ai_avg_score ?? 3.5) * 10)
  return base + (hashStr(topic.id) % 7)
}
function mockSaves(topic: TopicWithEvals): number {
  return Math.max(1, Math.round(mockLikes(topic) * 0.35) + (hashStr(topic.id + 's') % 5))
}
function mockCommentCount(topic: TopicWithEvals, realCount: number): number {
  return realCount + topic.ai_evaluations.length + (hashStr(topic.id + 'c') % 4)
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

const STATUS_ACTIONS = [
  { status: 'approved', label: '通过', color: 'bg-brand-green text-white hover:opacity-90' },
  { status: 'discussing', label: '讨论', color: 'bg-brand-yellow text-white hover:opacity-90' },
  { status: 'rejected', label: '拒绝', color: 'bg-red-500 text-white hover:opacity-90' },
] as const

const TABS = [
  { key: 'thinking', label: '创意' },
  { key: 'ai-score', label: 'AI评分' },
  { key: 'comments', label: '评论' },
  { key: 'exec-plan', label: '执行方案' },
  { key: 'refs', label: '参考案例' },
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
          {ev.reasoning && (
            <p className="text-xs text-gray-600 leading-relaxed mt-1.5">{ev.reasoning}</p>
          )}
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

// Shared: fetch + subscribe to real comments for a topic
function useRealtimeComments(topicId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  useEffect(() => {
    const supabase = createClient()
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
  return comments
}

function PlanningCommentsTab({ topicId, comments }: { topicId: string; comments: Comment[] }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

/* ---------------------------------------------------------------------
 * XHS DETAIL PAGE — full-screen, mimics a 小红书 post
 * ------------------------------------------------------------------- */

function XhsDetailPage({
  topic,
  campaign,
  onClose,
  onStatusChange,
  onCoverChanged,
  onPromote,
}: {
  topic: TopicWithEvals
  campaign: Campaign
  onClose: () => void
  onStatusChange: (topicId: string, status: string) => void
  onCoverChanged: (topicId: string, newUrl: string) => void
  onPromote: (topicId: string, target: TopicWorkspace) => void
}) {
  const comments = useRealtimeComments(topic.id)
  const [imgIdx, setImgIdx] = useState(0)
  const [followed, setFollowed] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)

  async function handleRegenerateCover() {
    if (regenLoading) return
    setRegenLoading(true)
    setRegenError(null)
    try {
      const res = await fetch(`/api/topics/${topic.id}/regenerate-cover`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成失败')
      onCoverChanged(topic.id, data.cover_image)
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : '生成失败')
      setTimeout(() => setRegenError(null), 3000)
    } finally {
      setRegenLoading(false)
    }
  }
  const [commentText, setCommentText] = useState('')
  const [userName, setUserName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPlanDrawer, setShowPlanDrawer] = useState(false)

  const p = palette(topic.seq_num)
  const likesRaw = mockLikes(topic) + (liked ? 1 : 0)
  const savesRaw = mockSaves(topic) + (saved ? 1 : 0)
  const commentCount = mockCommentCount(topic, comments.length)

  // Has photo → only photo slide; otherwise fall back to title + optional hook
  const slides = useMemo(() => {
    if (topic.cover_image) {
      return [{ label: 'photo' as const, text: topic.cover_image }]
    }
    const s: Array<{ label: 'title' | 'hook'; text: string }> = [
      { label: 'title', text: topic.title },
    ]
    const second = topic.hook || topic.thinking || ''
    if (second) s.push({ label: 'hook', text: second })
    return s
  }, [topic.cover_image, topic.title, topic.hook, topic.thinking])

  const touchStartX = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 50 && imgIdx > 0) setImgIdx(imgIdx - 1)
    else if (dx < -50 && imgIdx < slides.length - 1) setImgIdx(imgIdx + 1)
    touchStartX.current = null
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    if (!userName.trim()) { setShowNameInput(true); return }
    setSubmitting(true)
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topic.id,
          user_name: userName.trim(),
          content: commentText.trim(),
        }),
      })
      setCommentText('')
    } finally {
      setSubmitting(false)
    }
  }

  const bodyFull = topic.body || topic.hook || ''

  const brandName = campaign.brand_name || '品牌号'

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-gray-100">
      <div className="w-full sm:max-w-[390px] h-full bg-white relative sm:shadow-[0_0_24px_rgba(0,0,0,0.08)] flex flex-col">
        {/* Top bar — 与 feed 顶栏统一样式 */}
        <header
          className="flex-shrink-0 sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 bg-white/95 backdrop-blur-md border-b border-gray-100"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 -ml-1 flex items-center justify-center text-gray-800 hover:bg-gray-50 rounded-full"
            aria-label="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/starbucks.svg"
              alt={brandName}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 truncate leading-tight">
                {brandName}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                品牌官方 · 刚刚
              </p>
            </div>
            <button
              onClick={() => setFollowed((v) => !v)}
              className={`flex-shrink-0 px-3 h-7 rounded-full text-[12px] font-semibold transition ${
                followed
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {followed ? '已关注' : '+ 关注'}
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-16">
          {/* Cover image (swipeable) — 3:4 匹配 nano-banana 竖版输出，避免 object-cover 裁切 */}
          <div
            className="relative w-full aspect-[3/4] overflow-hidden select-none bg-black"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="absolute inset-0 flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${imgIdx * 100}%)`, width: `${slides.length * 100}%` }}
            >
              {slides.map((slide, i) => (
                <div
                  key={i}
                  className="relative flex items-center justify-center"
                  style={{
                    width: `${100 / slides.length}%`,
                    background:
                      slide.label === 'photo'
                        ? '#000'
                        : `linear-gradient(135deg, ${p.bg} 0%, ${p.accent} 100%)`,
                  }}
                >
                  {slide.label === 'photo' ? (
                    <Image
                      src={slide.text}
                      alt={topic.title}
                      fill
                      priority
                      sizes="(max-width: 390px) 100vw, 390px"
                      className="object-cover"
                    />
                  ) : (
                    <>
                      {/* Decorative dots */}
                      <div className="absolute top-6 left-6 w-16 h-16 rounded-full opacity-30" style={{ background: p.accent }} />
                      <div className="absolute bottom-10 right-8 w-24 h-24 rounded-full opacity-25" style={{ background: p.accent }} />
                      <div className="relative z-10 px-8 text-center">
                        {slide.label === 'title' ? (
                          <>
                            <p className="text-[11px] font-semibold text-gray-500 mb-3 tracking-[0.2em]">
                              #{String(topic.seq_num).padStart(2, '0')} · {campaign.brand_name}
                            </p>
                            <h2
                              className="text-gray-900 text-[22px] font-black leading-[1.3]"
                              style={{ textShadow: '0 2px 8px rgba(255,255,255,0.6)' }}
                            >
                              {topic.title}
                            </h2>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] font-semibold text-gray-500 mb-3 tracking-[0.2em]">
                              HOOK · 情绪共鸣
                            </p>
                            <p
                              className="text-gray-800 text-[18px] font-bold leading-[1.5] whitespace-pre-line"
                              style={{ textShadow: '0 2px 8px rgba(255,255,255,0.6)' }}
                            >
                              {slide.text}
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Page indicator */}
            {slides.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[11px] font-medium tabular-nums">
                {imgIdx + 1}/{slides.length}
              </div>
            )}

            {/* Regenerate cover button — 仅在有真实封面时出现 */}
            {topic.cover_image && (
              <button
                type="button"
                onClick={handleRegenerateCover}
                disabled={regenLoading}
                className="absolute top-3 left-3 z-20 flex items-center gap-1 px-3 h-8 rounded-full bg-black/50 backdrop-blur-md text-white text-[12px] font-medium hover:bg-black/70 transition disabled:opacity-60"
                aria-label="重新生成配图"
              >
                {regenLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span>🔄</span>
                )}
                <span>{regenLoading ? '生成中…' : '重新生成'}</span>
              </button>
            )}

            {/* Loading overlay during regeneration */}
            {regenLoading && (
              <div className="absolute inset-0 z-10 bg-black/55 flex flex-col items-center justify-center gap-3 text-white">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full bg-white animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="text-sm">AI 正在重新生成配图…</p>
              </div>
            )}

            {/* Error toast on cover */}
            {regenError && !regenLoading && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-xs">
                {regenError}
              </div>
            )}

            {/* Dots */}
            {slides.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-4 pt-3 pb-4">
            <h1 className="text-[17px] font-bold text-gray-900 leading-snug mb-2">
              {topic.title}
            </h1>
            <p className="text-[14px] text-gray-800 leading-[1.65] whitespace-pre-line">
              {bodyFull}
            </p>

            {/* Hashtags（仅在 body 没有自带 hashtag 时补充品牌标签） */}
            {!bodyFull.includes('#') && (
              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-[#3d7eff]">
                <span>#{brandName}</span>
                {campaign.tone && <span>#{campaign.tone}</span>}
                <span>#种草</span>
                <span>#内容营销</span>
              </div>
            )}

            <button
              onClick={() => setShowPlanDrawer(true)}
              className="mt-4 w-full flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white px-4 py-3 hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center text-white text-base flex-shrink-0">
                  ✨
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                    创意 · AI 评分 · 点评
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {topic.ai_evaluations.length} 位评委 · 平均{' '}
                    {topic.ai_avg_score !== null ? topic.ai_avg_score.toFixed(1) : '--'} 分
                  </p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Comments section */}
          <div className="border-t-[6px] border-gray-50" />
          <div className="px-4 pt-3 pb-4">
            <p className="text-[13px] text-gray-500 mb-3">
              共 <span className="font-semibold text-gray-700">{commentCount}</span> 条评论
            </p>
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl">
                  💬
                </div>
                <p className="text-[13px] text-gray-400">还没有人评论，来抢沙发～</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((c, i) => {
                  const cp = palette((i % 5) + 1)
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                        style={{ backgroundImage: cp.avatar }}
                      >
                        {c.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-gray-500">
                          {c.user_name}
                          {c.user_role && <span className="ml-1 text-gray-400">· {c.user_role}</span>}
                        </p>
                        <p className="text-[14px] text-gray-900 leading-snug mt-0.5">{c.content}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>

        {/* Bottom fixed bar */}
        <footer className="flex-shrink-0 border-t border-gray-100 bg-white">
          {showNameInput && (
            <div className="px-3 pt-2 pb-1">
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="输入你的昵称..."
                className="w-full h-9 px-3 rounded-full bg-gray-100 text-[13px] text-gray-800 focus:outline-none focus:bg-gray-200"
              />
            </div>
          )}
          <form onSubmit={submitComment} className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 flex items-center h-9 bg-gray-100 rounded-full px-4">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="说点什么..."
                className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-2 text-[13px] font-semibold text-red-500 disabled:opacity-50"
                >
                  发送
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              className="flex items-center gap-0.5"
              aria-label="点赞"
            >
              {liked ? (
                <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21s-7.5-4.6-10-9.2C.2 8.5 1.7 4.5 5.5 4.5c2.1 0 3.6 1 4.5 2.3.4.6 1.3 1.6 2 2.5.7-.9 1.6-1.9 2-2.5.9-1.3 2.4-2.3 4.5-2.3 3.8 0 5.3 4 3.5 7.3C19.5 16.4 12 21 12 21z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                </svg>
              )}
              <span className="text-[11px] text-gray-700 tabular-nums">{formatCount(likesRaw)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSaved((v) => !v)}
              className="flex items-center gap-0.5"
              aria-label="收藏"
            >
              {saved ? (
                <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.5l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7L12 17.2 5.8 20.7l1.6-6.7L2.2 9.4l6.9-.6L12 2.5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.92 5.908a1 1 0 00.95.69h6.213c.969 0 1.371 1.24.588 1.81l-5.025 3.65a1 1 0 00-.364 1.118l1.92 5.908c.3.922-.755 1.688-1.54 1.118l-5.025-3.65a1 1 0 00-1.175 0l-5.025 3.65c-.784.57-1.838-.196-1.539-1.118l1.92-5.908a1 1 0 00-.364-1.118l-5.025-3.65c-.783-.57-.38-1.81.588-1.81h6.213a1 1 0 00.95-.69l1.92-5.908z" />
                </svg>
              )}
              <span className="text-[11px] text-gray-700 tabular-nums">{formatCount(savesRaw)}</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-0.5"
              aria-label="评论"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[11px] text-gray-700 tabular-nums">{formatCount(commentCount)}</span>
            </button>
          </form>
        </footer>
      </div>

      {/* Planning drawer */}
      {showPlanDrawer && (
        <PlanningDrawer
          topic={topic}
          comments={comments}
          onClose={() => setShowPlanDrawer(false)}
          onStatusChange={onStatusChange}
          onPromote={onPromote}
        />
      )}
    </div>
  )
}

/* Planning drawer overlays on top of the XHS detail — for users who want the AI review context */
function PlanningDrawer({
  topic,
  comments,
  onClose,
  onStatusChange,
  onPromote,
}: {
  topic: TopicWithEvals
  comments: Comment[]
  onClose: () => void
  onStatusChange: (topicId: string, status: string) => void
  onPromote: (topicId: string, target: TopicWorkspace) => void
}) {
  const [tab, setTab] = useState<TabKey>('thinking')

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-[390px] mt-auto bg-white rounded-t-2xl h-[92vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">#{String(topic.seq_num).padStart(2, '0')}</p>
              <h2 className="text-base font-bold text-gray-900 leading-snug">{topic.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-0.5 mt-3 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  tab === t.key ? 'bg-brand-green text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'thinking' && (
            topic.thinking ? (
              <blockquote className="text-sm text-gray-700 leading-relaxed pl-4 border-l-4 border-brand-green bg-brand-green/5 py-3 pr-3 rounded-r-lg whitespace-pre-line">
                {topic.thinking}
              </blockquote>
            ) : (
              <p className="text-sm text-gray-400">暂无</p>
            )
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
                <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{ref.brand}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{ref.desc}</p>
                  <p className="text-xs text-brand-green">效果：{ref.result}</p>
                  {ref.why && (
                    <p className="text-xs text-gray-500 leading-relaxed pt-1 border-t border-gray-200">
                      <span className="text-gray-400">参考点：</span>
                      {ref.why}
                    </p>
                  )}
                </div>
              ))}
              {(!topic.refs || topic.refs.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">暂无参考案例</p>
              )}
            </div>
          )}
          {tab === 'comments' && <PlanningCommentsTab topicId={topic.id} comments={comments} />}
        </div>

        {/* Status decision footer — 通过 / 讨论 / 拒绝 + 工作区切换 */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">
              当前状态：<span className="text-gray-700 font-medium">{STATUS_LABELS[topic.status] ?? topic.status}</span>
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                topic.workspace === 'review'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {topic.workspace === 'review' ? '客户讨论区' : '草稿工作区'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ACTIONS.map((action) => {
              const active = topic.status === action.status
              return (
                <button
                  key={action.status}
                  onClick={() => onStatusChange(topic.id, action.status)}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${action.color} ${
                    active ? 'ring-2 ring-offset-1 ring-current' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {action.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              onPromote(topic.id, topic.workspace === 'review' ? 'draft' : 'review')
            }
            className="w-full py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            {topic.workspace === 'review' ? '← 收回到草稿' : '→ 推到客户讨论区'}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ---------------------------------------------------------------------
 * XHS FEED CARD + VIEW — real 小红书-style double-column
 * ------------------------------------------------------------------- */

function XhsFeedCard({
  topic,
  campaign,
  onOpen,
}: {
  topic: TopicWithEvals
  campaign: Campaign
  onOpen: () => void
}) {
  const p = palette(topic.seq_num)
  const [liked, setLiked] = useState(false)
  const likes = mockLikes(topic) + (liked ? 1 : 0)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left bg-white"
    >
      {/* Cover — uniform layout regardless of cover_image */}
      <div
        className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-100"
        style={
          topic.cover_image
            ? undefined
            : { background: `linear-gradient(135deg, ${p.bg} 0%, ${p.accent} 100%)` }
        }
      >
        {topic.cover_image ? (
          <Image
            src={topic.cover_image}
            alt={topic.title}
            fill
            sizes="(max-width: 390px) 50vw, 195px"
            className="object-cover"
          />
        ) : (
          <>
            <div
              className="absolute -top-4 -left-4 w-20 h-20 rounded-full opacity-40"
              style={{ background: p.accent }}
            />
            <div
              className="absolute -bottom-6 -right-4 w-24 h-24 rounded-full opacity-30"
              style={{ background: p.accent }}
            />
          </>
        )}

        {/* Seq number */}
        <div className="absolute top-2 left-2 z-10">
          <span className="text-[10px] font-bold text-gray-700 tabular-nums bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            #{String(topic.seq_num).padStart(2, '0')}
          </span>
        </div>

        {/* Status pill */}
        {topic.status !== 'pending' && (
          <div className="absolute top-2 right-2 z-10">
            <CoverStatusBadge status={topic.status} />
          </div>
        )}

        {/* Bottom title overlay — same on both image and gradient cards */}
        <div className="absolute inset-x-0 bottom-0 z-10 pt-8 pb-2 px-2.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
          <h3 className="text-white text-[13px] font-bold leading-snug line-clamp-2 drop-shadow">
            {topic.title}
          </h3>
        </div>
      </div>

      {/* Text area below cover */}
      <div className="pt-2 pb-1 px-0.5">
        <p className="text-[13px] text-gray-600 leading-snug line-clamp-2">
          {topic.hook}
        </p>

        {/* Author row */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/starbucks.svg"
              alt={campaign.brand_name}
              className="w-5 h-5 rounded-full flex-shrink-0"
            />
            <span className="text-[12px] text-gray-500 truncate">{campaign.brand_name}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLiked((v) => !v) }}
            className="flex items-center gap-0.5 flex-shrink-0"
            aria-label="点赞"
          >
            {liked ? (
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7.5-4.6-10-9.2C.2 8.5 1.7 4.5 5.5 4.5c2.1 0 3.6 1 4.5 2.3.4.6 1.3 1.6 2 2.5.7-.9 1.6-1.9 2-2.5.9-1.3 2.4-2.3 4.5-2.3 3.8 0 5.3 4 3.5 7.3C19.5 16.4 12 21 12 21z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
              </svg>
            )}
            <span className="text-[12px] text-gray-500 tabular-nums">{formatCount(likes)}</span>
          </button>
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
  // Split into two columns for masonry effect
  const colA: TopicWithEvals[] = []
  const colB: TopicWithEvals[] = []
  topics.forEach((t, i) => (i % 2 === 0 ? colA : colB).push(t))

  return (
    <div className="px-2 pt-2 pb-20 flex gap-2">
      <div className="flex-1 space-y-3">
        {colA.map((t) => (
          <XhsFeedCard key={t.id} topic={t} campaign={campaign} onOpen={() => onOpen(t)} />
        ))}
      </div>
      <div className="flex-1 space-y-3">
        {colB.map((t) => (
          <XhsFeedCard key={t.id} topic={t} campaign={campaign} onOpen={() => onOpen(t)} />
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------
 * MAIN REVIEW BOARD
 * ------------------------------------------------------------------- */

export default function ReviewBoard({ campaign, initialTopics }: Props) {
  const [topics, setTopics] = useState<TopicWithEvals[]>(initialTopics)
  const [detailTopic, setDetailTopic] = useState<TopicWithEvals | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [inspOpen, setInspOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [workspace, setWorkspace] = useState<TopicWorkspace>('draft')
  const [category, setCategory] = useState<TopicCategory | 'all'>('all')
  const [autoLoading, setAutoLoading] = useState(false)

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

  function updateCover(topicId: string, newUrl: string) {
    setTopics((ts) =>
      ts.map((t) => (t.id === topicId ? { ...t, cover_image: newUrl } : t))
    )
  }

  async function runGenerate(opts: {
    limit?: number
    seedText?: string
    silent?: boolean
  } = {}) {
    const { limit = 3, seedText, silent = false } = opts
    if (silent) setAutoLoading(true)
    else {
      setGenerating(true)
      setGenError(null)
    }
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
          category: category === 'all' ? undefined : category,
          seedText,
          limit,
          workspace: 'draft', // 生成永远落在草稿区
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `HTTP ${res.status}`
        try {
          const data = JSON.parse(text) as { error?: string }
          if (data?.error) msg = data.error
        } catch {
          if (text) msg = `${msg}: ${text.slice(0, 120)}`
        }
        throw new Error(msg)
      }
      const supabase = createClient()
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*, ai_evaluations(*)')
        .eq('campaign_id', campaign.id)
        .is('deleted_at', null)
        .order('seq_num', { ascending: true })
      setTopics((topicsData as TopicWithEvals[]) ?? [])
    } catch (err) {
      if (!silent) setGenError(err instanceof Error ? err.message : '生成失败')
    } finally {
      if (silent) setAutoLoading(false)
      else setGenerating(false)
    }
  }

  async function promoteTopic(topicId: string, target: TopicWorkspace) {
    const res = await fetch(`/api/topics/${topicId}/promote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: target }),
    })
    if (!res.ok) {
      setToast('切换失败')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setTopics((ts) =>
      ts.map((t) => (t.id === topicId ? { ...t, workspace: target } : t))
    )
    setToast(target === 'review' ? '已推到客户讨论区' : '已收回到草稿')
    setTimeout(() => setToast(null), 2000)
  }

  const counts = useMemo(() => {
    const init = { approved: 0, discussing: 0, pending: 0, rejected: 0 }
    for (const t of topics) {
      if (t.status in init) init[t.status as keyof typeof init]++
    }
    return init
  }, [topics])

  const filteredTopics = useMemo(() => {
    return topics.filter(
      (t) =>
        (t.workspace ?? 'draft') === workspace &&
        (category === 'all' || t.category === category)
    )
  }, [topics, workspace, category])

  // 当前 workspace 下每栏目的数量（用于 chips 上小角标）
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, hot: 0, campaign: 0, product: 0, store: 0 }
    for (const t of topics) {
      if ((t.workspace ?? 'draft') !== workspace) continue
      counts.all++
      if (t.category) counts[t.category] = (counts[t.category] ?? 0) + 1
    }
    return counts
  }, [topics, workspace])

  // 客户讨论区的数量徽章
  const reviewCount = useMemo(
    () => topics.filter((t) => t.workspace === 'review').length,
    [topics]
  )

  // 拉到底自动加载（仅草稿区）
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const runGenerateRef = useRef(runGenerate)
  useEffect(() => {
    runGenerateRef.current = runGenerate
  })
  useEffect(() => {
    if (workspace !== 'draft') return
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (autoLoading || generating) return
        runGenerateRef.current({ limit: 3, silent: true })
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [workspace, autoLoading, generating, category, filteredTopics.length])

  return (
    <div className="flex flex-col min-h-screen bg-white">
        {/* XHS-style top bar */}
        <header
          className="flex-shrink-0 sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/starbucks.svg"
                alt={campaign.brand_name}
                className="w-7 h-7 rounded-full flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">
                  {campaign.brand_name}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {topics.length} 条选题 · {counts.approved} 通过
                </p>
              </div>
            </div>
          </div>

          {/* Workspace 切换 */}
          <div className="px-3 pb-2 flex gap-1.5">
            {(['draft', 'review'] as const).map((w) => {
              const active = workspace === w
              const label = w === 'draft' ? '草稿工作区' : '客户讨论区'
              const badge = w === 'review' ? reviewCount : 0
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorkspace(w)}
                  className={`flex-1 h-8 rounded-lg text-[12px] font-semibold transition flex items-center justify-center gap-1.5 ${
                    active
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-white text-gray-600'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Category chips */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {CATEGORY_TABS.map((c) => {
              const active = category === c.key
              const count = categoryCounts[c.key] ?? 0
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex-shrink-0 h-7 px-3 rounded-full text-[12px] font-medium transition flex items-center gap-1 ${
                    active
                      ? 'bg-brand-green text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              disabled
              title="后续支持自定义栏目"
              className="flex-shrink-0 h-7 px-3 rounded-full text-[12px] font-medium text-gray-300 border border-dashed border-gray-300"
            >
              + 新栏目
            </button>
          </div>
        </header>

        <main className="flex-1">
          {genError && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {genError}
            </div>
          )}

          {generating && (
            <div className="text-center py-20 space-y-4 px-6">
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-red-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-gray-500 text-sm min-h-[1.5em]">
                <TypewriterStages
                  stages={[
                    '正在分析品牌调性…',
                    '检索小红书近期爆款选题…',
                    '提炼 5 个最契合的切入角度…',
                    '邀请 5 位 AI 评委进场…',
                    '评委正在写点评…',
                    '整理打分和理由…',
                  ]}
                />
              </p>
            </div>
          )}

          {!generating && filteredTopics.length === 0 && (
            <div className="text-center py-20 space-y-3 px-6">
              <div className="text-5xl">{workspace === 'review' ? '💬' : '✨'}</div>
              <p className="text-gray-500 text-sm">
                {workspace === 'review'
                  ? '客户讨论区还没有创意，去草稿区把选好的「推到客户区」吧'
                  : category === 'all'
                  ? '点击右下角「+」用文字触发，或下拉自动生成'
                  : '当前栏目暂无创意，下拉到底自动生成 3 条'}
              </p>
            </div>
          )}

          {!generating && filteredTopics.length > 0 && (
            <>
              <XhsFeedView
                topics={filteredTopics}
                campaign={campaign}
                onOpen={(t) => setDetailTopic(t)}
              />
              {/* 拉到底自动加载（仅草稿区） */}
              {workspace === 'draft' && (
                <>
                  <div ref={sentinelRef} className="h-px" aria-hidden />
                  <div className="py-4 flex flex-col items-center gap-2 text-gray-400">
                    {autoLoading ? (
                      <>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px]">
                          <TypewriterStages
                            cursorClassName="bg-brand-green"
                            stages={[
                              category === 'all'
                                ? '正在为你发散更多创意…'
                                : `正在为「${
                                    CATEGORY_TABS.find((c) => c.key === category)?.label
                                  }」栏目生成 3 条…`,
                              '检索小红书近期同栏目爆款…',
                              '邀请评委进场…',
                            ]}
                          />
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px]">滑到底部自动生成更多 ↓</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </main>

        {detailTopic && (
          <XhsDetailPage
            topic={topics.find((t) => t.id === detailTopic.id) ?? detailTopic}
            campaign={campaign}
            onClose={() => setDetailTopic(null)}
            onStatusChange={updateStatus}
            onCoverChanged={updateCover}
            onPromote={promoteTopic}
          />
        )}

        {/* FAB — 仅在草稿工作区出现，客户讨论区是只读 review */}
        {!detailTopic && !generating && workspace === 'draft' && (
          <div className="fixed inset-0 z-40 flex justify-center pointer-events-none">
            <div className="w-full sm:max-w-[390px] relative">
              <button
                type="button"
                onClick={() => setFabOpen(true)}
                aria-label="新增创意"
                className="pointer-events-auto absolute bottom-6 right-4 w-14 h-14 rounded-full bg-red-500 text-white shadow-[0_8px_24px_rgba(255,36,66,0.4)] hover:bg-red-600 active:scale-95 transition flex items-center justify-center"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action sheet */}
        {fabOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setFabOpen(false)}
            />
            <div
              className="relative w-full sm:max-w-[390px] bg-white rounded-t-3xl shadow-2xl pb-2"
              style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pt-2 pb-3">
                <h3 className="text-base font-bold text-gray-900">新增创意</h3>
                <p className="text-xs text-gray-500 mt-0.5">选择一种生成方式</p>
              </div>
              <div className="px-3 pb-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false)
                    setTextInput('')
                    setTextOpen(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white text-left hover:opacity-95 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                    💬
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">文字触发创意</p>
                    <p className="text-[11px] text-white/80 mt-0.5">
                      输入方向/客户原话，AI 据此发散 3 条
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false)
                    setInspOpen(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    📎
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">上传截图找灵感</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">仿照已有小红书帖子的风格生成</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <p className="px-1 pt-1 text-[11px] text-gray-400 leading-relaxed">
                  💡 想要更多类似创意？拉到底自动生成 3 条
                </p>
              </div>
            </div>
          </div>
        )}

        <InspirationUploader
          campaignId={campaign.id}
          open={inspOpen}
          onClose={() => setInspOpen(false)}
        />

        {/* 文字触发创意输入面板 */}
        {textOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setTextOpen(false)}
            />
            <div
              className="relative w-full sm:max-w-[390px] bg-white rounded-t-3xl shadow-2xl"
              style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pt-2 pb-3">
                <h3 className="text-base font-bold text-gray-900">💬 文字触发创意</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  输入方向、客户原话或想要的角度，AI 在
                  <span className="text-gray-700 font-medium">
                    「{CATEGORY_TABS.find((c) => c.key === category)?.label}」
                  </span>
                  栏目发散 3 条
                </p>
              </div>
              <div className="px-5 pb-4 space-y-3">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={4}
                  placeholder="例：「下周新品鸳鸯拿铁要上线，主打怀旧港风」「想做秋天主题，避开南瓜梗」"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-green resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTextOpen(false)}
                    className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={!textInput.trim()}
                    onClick={() => {
                      const seedText = textInput.trim()
                      if (!seedText) return
                      setTextOpen(false)
                      runGenerate({ limit: 3, seedText })
                    }}
                    className="flex-1 h-10 rounded-xl bg-brand-green text-white text-sm font-bold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    生成 3 条
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-lg bg-gray-900 text-white text-xs shadow-xl max-w-[90vw] break-words text-center">
            {toast}
          </div>
        )}
      </div>
    )
}
