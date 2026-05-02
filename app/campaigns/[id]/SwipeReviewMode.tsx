'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { Campaign, TopicWithEvals } from '@/types'

type Decision = 'approved' | 'rejected' | 'discussing'

interface Props {
  topics: TopicWithEvals[]
  campaign: Campaign
  onClose: () => void
  onDecision: (topicId: string, status: Decision) => void | Promise<void>
}

const SWIPE_THRESHOLD = 100
const VELOCITY_THRESHOLD = 0.5
const EXIT_MS = 280

export default function SwipeReviewMode({
  topics: initialTopics,
  campaign,
  onClose,
  onDecision,
}: Props) {
  const [stack, setStack] = useState<TopicWithEvals[]>(initialTopics)
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false })
  const [exiting, setExiting] = useState<'left' | 'right' | 'up' | null>(null)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const top = stack[0]
  const next = stack[1]

  function commitDecision(direction: 'left' | 'right' | 'up') {
    if (!top || exiting) return
    const status: Decision =
      direction === 'right' ? 'approved' : direction === 'left' ? 'rejected' : 'discussing'
    setExiting(direction)
    onDecision(top.id, status)
    window.setTimeout(() => {
      setStack((s) => s.slice(1))
      setExiting(null)
      setDrag({ x: 0, y: 0, dragging: false })
      startRef.current = null
    }, EXIT_MS)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (exiting) return
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    setDrag({ x: 0, y: 0, dragging: true })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current || exiting) return
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
      dragging: true,
    })
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    const dt = Math.max(1, Date.now() - startRef.current.t)
    const vx = dx / dt
    const vy = dy / dt
    startRef.current = null

    if (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) commitDecision('right')
    else if (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) commitDecision('left')
    else if (dy < -SWIPE_THRESHOLD || vy < -VELOCITY_THRESHOLD) commitDecision('up')
    else setDrag({ x: 0, y: 0, dragging: false })
  }

  // 键盘支持：← 拒绝 / → 通过 / ↑ 讨论 / Esc 关闭
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'ArrowRight') commitDecision('right')
      else if (e.key === 'ArrowLeft') commitDecision('left')
      else if (e.key === 'ArrowUp') commitDecision('up')
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id, exiting])

  if (stack.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center text-white px-8">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-semibold">速审完毕</p>
        <p className="text-sm text-white/60 mt-1.5 text-center">所有待审创意都过了一遍</p>
        <button
          onClick={onClose}
          className="mt-8 px-6 py-2.5 rounded-full bg-white text-gray-900 font-semibold text-sm"
        >
          完成
        </button>
      </div>
    )
  }

  // 顶层卡片 transform
  let cardTransform = ''
  let cardOpacity = 1
  const cardTransition = drag.dragging
    ? 'none'
    : `transform ${EXIT_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${EXIT_MS}ms`
  if (exiting === 'right') {
    cardTransform = 'translate(140vw, -40px) rotate(28deg)'
    cardOpacity = 0
  } else if (exiting === 'left') {
    cardTransform = 'translate(-140vw, -40px) rotate(-28deg)'
    cardOpacity = 0
  } else if (exiting === 'up') {
    cardTransform = 'translate(0, -130vh) rotate(0deg)'
    cardOpacity = 0
  } else {
    const rot = drag.x / 22
    cardTransform = `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`
  }

  const likeOpacity = !exiting ? Math.max(0, Math.min(1, drag.x / 100)) : 0
  const nopeOpacity = !exiting ? Math.max(0, Math.min(1, -drag.x / 100)) : 0
  const discussOpacity =
    !exiting ? Math.max(0, Math.min(1, -drag.y / 100)) - Math.abs(drag.x) / 200 : 0

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-b from-gray-900 to-black flex flex-col">
      {/* 顶栏 */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 text-white"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label="关闭"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-[11px] text-white/50 leading-tight">{campaign.brand_name} · 速审</p>
          <p className="text-sm font-semibold leading-tight tabular-nums">剩 {stack.length} 条</p>
        </div>
        <div className="w-9 h-9" />
      </div>

      {/* 卡片区 */}
      <div className="flex-1 relative flex items-center justify-center px-5 py-2">
        {/* 后一张卡片预览 */}
        {next && (
          <div className="absolute inset-x-5 top-2 bottom-2 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden bg-gray-800 shadow-xl scale-[0.94] opacity-50">
              {next.cover_image && (
                <Image
                  src={next.cover_image}
                  alt=""
                  fill
                  sizes="340px"
                  className="object-cover"
                />
              )}
            </div>
          </div>
        )}

        {/* 顶层卡片 */}
        <div
          className="relative w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-gray-800 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ transform: cardTransform, transition: cardTransition, opacity: cardOpacity }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {top.cover_image ? (
            <Image
              src={top.cover_image}
              alt={top.title}
              fill
              sizes="340px"
              className="object-cover pointer-events-none"
              priority
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
          )}

          {/* 序号 */}
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[11px] font-semibold">
            #{String(top.seq_num).padStart(2, '0')}
          </div>

          {/* 标题/钩子 overlay */}
          <div className="absolute inset-x-0 bottom-0 pt-14 pb-5 px-5 bg-gradient-to-t from-black/95 via-black/55 to-transparent text-white">
            <h3 className="text-lg font-bold leading-tight line-clamp-2 drop-shadow">
              {top.title}
            </h3>
            {top.hook && (
              <p className="text-[12px] text-white/85 mt-2 line-clamp-3 leading-relaxed">
                {top.hook}
              </p>
            )}
          </div>

          {/* 喜欢印章 */}
          <div
            className="absolute top-10 left-5 px-3 py-1 rounded-md border-[3px] border-emerald-400 text-emerald-400 font-black text-2xl tracking-widest pointer-events-none"
            style={{
              opacity: likeOpacity,
              transform: 'rotate(-14deg)',
            }}
          >
            喜欢
          </div>
          {/* 略过印章 */}
          <div
            className="absolute top-10 right-5 px-3 py-1 rounded-md border-[3px] border-red-400 text-red-400 font-black text-2xl tracking-widest pointer-events-none"
            style={{
              opacity: nopeOpacity,
              transform: 'rotate(14deg)',
            }}
          >
            略过
          </div>
          {/* 讨论印章 */}
          <div
            className="absolute top-1/2 left-1/2 px-3 py-1 rounded-md border-[3px] border-amber-400 text-amber-400 font-black text-2xl tracking-widest pointer-events-none"
            style={{
              opacity: discussOpacity,
              transform: 'translate(-50%, -50%)',
            }}
          >
            讨论
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-7 pb-6 pt-2"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => commitDecision('left')}
          disabled={!!exiting}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 active:scale-90 transition disabled:opacity-40"
          aria-label="拒绝"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => commitDecision('up')}
          disabled={!!exiting}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-amber-400/25 flex items-center justify-center text-amber-300 active:scale-90 transition disabled:opacity-40"
          aria-label="讨论"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.12-.91L3 20l1.27-3.81A8.93 8.93 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => commitDecision('right')}
          disabled={!!exiting}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-emerald-500/25 flex items-center justify-center text-emerald-400 active:scale-90 transition disabled:opacity-40"
          aria-label="通过"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* 操作提示 */}
      <p className="text-center text-[10px] text-white/35 pb-2 px-4">
        左划拒绝 · 右划通过 · 上划讨论
      </p>
    </div>
  )
}
