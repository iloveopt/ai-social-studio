'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [loadingDemo, setLoadingDemo] = useState(false)

  async function handleViewDemo() {
    setLoadingDemo(true)
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.campaignId) {
        router.push(`/campaigns/${data.campaignId}`)
      } else {
        setLoadingDemo(false)
        alert(data.error ?? '加载 Demo 失败')
      }
    } catch {
      setLoadingDemo(false)
      alert('加载 Demo 失败')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="flex justify-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-brand-green inline-block" />
            <span className="w-3 h-3 rounded-full bg-brand-yellow inline-block" />
            <span className="w-3 h-3 rounded-full bg-brand-blue inline-block" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            AI Social Studio
          </h1>
          <p className="text-lg text-gray-400 max-w-md mx-auto leading-relaxed">
            把品牌 Campaign 内容选题会议，从人工碰运气变成结构化 AI 辅助决策。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-green text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建 Campaign
          </Link>
          <button
            onClick={handleViewDemo}
            disabled={loadingDemo}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-gray-900 font-semibold text-base hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            {loadingDemo ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                加载中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                查看 Demo
              </>
            )}
          </button>
          <Link
            href="/campaigns"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-base hover:bg-white/15 transition-colors border border-white/10"
          >
            查看所有 Campaign
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
          {[
            { label: '输入 Campaign 参数', icon: '✍️' },
            { label: 'AI 生成选题评审', icon: '🤖' },
            { label: '团队协作审批', icon: '✅' },
          ].map((step, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="text-2xl">{step.icon}</div>
              <p className="text-xs text-gray-400">{step.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
