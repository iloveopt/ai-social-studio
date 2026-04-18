'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLATFORMS = [
  { value: 'xhs', label: '小红书' },
  { value: 'douyin', label: '抖音' },
  { value: 'weibo', label: '微博' },
  { value: 'wechat', label: '微信' },
]

const TONES = ['年轻活泼', '情感共鸣', '高级感', '自嘲幽默']

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    brand_name: '',
    ip_name: '',
    target_audience: '',
    campaign_goal: '',
    platforms: [] as string[],
    tone: '情感共鸣',
    deadline: '',
  })

  function togglePlatform(val: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(val)
        ? f.platforms.filter((p) => p !== val)
        : [...f.platforms, val],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.platforms.length === 0) {
      setError('请至少选择一个发布平台')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '提交失败')
      }
      const data = await res.json()
      router.push(`/campaigns/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/campaigns" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">新建 Campaign</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">基本信息</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">品牌名 *</label>
                <input
                  required
                  type="text"
                  value={form.brand_name}
                  onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
                  placeholder="如：星巴克"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">合作 IP / 主题 *</label>
                <input
                  required
                  type="text"
                  value={form.ip_name}
                  onChange={(e) => setForm((f) => ({ ...f, ip_name: e.target.value }))}
                  placeholder="如：穿Prada的女魔头2"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">目标人群 *</label>
              <textarea
                required
                value={form.target_audience}
                onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                placeholder="如：职场女性 25-38岁，关注职场成长和生活品质"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Campaign 目标 *</label>
              <textarea
                required
                value={form.campaign_goal}
                onChange={(e) => setForm((f) => ({ ...f, campaign_goal: e.target.value }))}
                placeholder="如：联名新品推广+品牌情感联结，提升品牌好感度"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">发布设置</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">发布平台 *</label>
              <div className="flex gap-3 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      form.platforms.includes(p.value)
                        ? 'border-brand-green bg-brand-green/10 text-brand-green'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">品牌语气</label>
              <div className="flex gap-3 flex-wrap">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tone: t }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      form.tone === t
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">截止日期（选填）</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '提交中...' : '创建 Campaign →'}
          </button>
        </form>
      </main>
    </div>
  )
}
