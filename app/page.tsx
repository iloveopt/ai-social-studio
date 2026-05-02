'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Platform = {
  key: 'xhs' | 'douyin' | 'xlb'
  name: string
  emoji: string
  desc: string
  color: string
  available: boolean
}

const PLATFORMS: Platform[] = [
  {
    key: 'xhs',
    name: '小红书',
    emoji: '📕',
    desc: '双列瀑布流 · 图文笔记',
    color: 'bg-[#ff2442]',
    available: true,
  },
  {
    key: 'douyin',
    name: '抖音',
    emoji: '🎵',
    desc: '短视频 · 沉浸式 Feed',
    color: 'bg-black',
    available: false,
  },
  {
    key: 'xlb',
    name: '小绿书',
    emoji: '📗',
    desc: '微信种草 · 图文视频',
    color: 'bg-[#07c160]',
    available: false,
  },
]

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [xhsCampaignId, setXhsCampaignId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/seed-demo', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.campaignId) return
        setXhsCampaignId(data.campaignId)
        router.prefetch(`/campaigns/${data.campaignId}`)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [router])

  async function openXhsCampaign() {
    if (loading) return
    setLoading(true)
    if (xhsCampaignId) {
      router.push(`/campaigns/${xhsCampaignId}`)
      return
    }
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.campaignId) {
        router.push(`/campaigns/${data.campaignId}`)
      } else {
        setLoading(false)
        setToast(data.error ?? '加载失败')
      }
    } catch {
      setLoading(false)
      setToast('加载失败')
    }
  }

  function showComingSoon(name: string) {
    setToast(`${name} 敬请期待`)
    setTimeout(() => setToast(null), 1800)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full text-center space-y-10">
        <div className="space-y-3">
          <div className="flex justify-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-brand-green inline-block" />
            <span className="w-3 h-3 rounded-full bg-brand-yellow inline-block" />
            <span className="w-3 h-3 rounded-full bg-brand-blue inline-block" />
          </div>
          <p className="text-sm text-gray-500 tracking-wide">AI Social Studio</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/starbucks.svg" alt="星巴克" className="w-24 h-24 sm:w-28 sm:h-28" />
          </div>
          <p className="text-base text-gray-500 max-w-md mx-auto leading-relaxed">
            内容选题 · 一站式 AI 创意工作台
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest">选择平台查看选题</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLATFORMS.map((p) => {
              const content = (
                <div
                  className={`relative flex sm:flex-col items-center sm:items-start gap-3 sm:gap-4 p-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-left shadow-sm ${
                    p.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${p.color}`}
                  >
                    {p.emoji}
                  </div>
                  <div className="flex-1 sm:w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold text-base">{p.name}</span>
                      {!p.available && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                          敬请期待
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </div>
                  {p.available && (
                    <svg
                      className="w-4 h-4 text-gray-400 absolute top-5 right-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              )
              return p.available ? (
                <button
                  key={p.key}
                  type="button"
                  onClick={openXhsCampaign}
                  disabled={loading}
                  className="text-left"
                >
                  {content}
                </button>
              ) : (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => showComingSoon(p.name)}
                  className="text-left"
                >
                  {content}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">正在加载…</p>
        </div>
      )}
    </main>
  )
}
