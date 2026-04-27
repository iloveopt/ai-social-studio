'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import AuthMenu from '@/components/auth-menu'

const PLATFORMS = [
  { value: 'xhs', label: '小红书' },
  { value: 'douyin', label: '抖音' },
  { value: 'weibo', label: '微博' },
  { value: 'wechat', label: '微信' },
]

const TONES = ['年轻活泼', '情感共鸣', '高级感', '自嘲幽默']

type Stage = 'idle' | 'creating' | 'generating' | 'redirecting'

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = createClient()
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function signInWithGitHub() {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/campaigns/new')}`
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    })
  }

  const [form, setForm] = useState({
    brand_name: '',
    ip_name: '',
    target_audience: '',
    campaign_goal: '',
    platforms: [] as string[],
    tone: '情感共鸣',
    deadline: '',
  })

  const loading = stage !== 'idle'

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
    setError(null)
    setStage('creating')
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
      const campaignId = data.id as string

      setStage('generating')
      const genRes = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          brand: form.brand_name,
          ip: form.ip_name,
          audience: form.target_audience,
          goal: form.campaign_goal,
          platforms: form.platforms,
          tone: form.tone,
        }),
      })
      if (!genRes.ok) {
        const d = await genRes.json().catch(() => ({}))
        // Campaign 已创建，选题生成失败也允许跳转
        console.warn('[generate-topics failed]', d?.error)
      }

      setStage('redirecting')
      router.push(`/campaigns/${campaignId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      setStage('idle')
    }
  }

  const submitLabel =
    stage === 'creating'
      ? '创建 Campaign 中…'
      : stage === 'generating'
      ? 'AI 生成选题中，请稍候…'
      : stage === 'redirecting'
      ? '正在跳转到评审页…'
      : '创建 Campaign 并生成选题 →'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-[600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/campaigns" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-sm text-gray-400">返回列表</span>
          </div>
          <AuthMenu variant="light" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">新建 Campaign</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            填写品牌联名信息，AI 会为你生成 5 个选题，并邀请 5 位评委实时点评
          </p>
        </div>

        {!authReady ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-sm text-gray-400">
            加载中…
          </div>
        ) : !user ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-900 text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-6 h-6">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900">请先登录</h2>
              <p className="text-sm text-gray-500">
                创建 Campaign 需要登录，登录后内容将归属于你的账号
              </p>
            </div>
            <button
              type="button"
              onClick={signInWithGitHub}
              className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-4 h-4">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
              使用 GitHub 登录
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {stage === 'generating' && (
            <div className="p-4 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-brand-green flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-brand-green">Campaign 已创建，正在生成选题…</p>
                <p className="text-xs text-gray-500 mt-0.5">通常需要 20–40 秒，完成后自动跳转评审页</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="pb-2 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">基本信息</h2>
              <p className="text-xs text-gray-400 mt-0.5">品牌 / IP / 目标人群 / Campaign 目标</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  品牌名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  disabled={loading}
                  type="text"
                  value={form.brand_name}
                  onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
                  placeholder="如：星巴克"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition disabled:bg-gray-50"
                />
                <p className="text-[11px] text-gray-400">填写主品牌的中文名</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  合作 IP / 主题 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  disabled={loading}
                  type="text"
                  value={form.ip_name}
                  onChange={(e) => setForm((f) => ({ ...f, ip_name: e.target.value }))}
                  placeholder="如：穿Prada的女魔头2"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition disabled:bg-gray-50"
                />
                <p className="text-[11px] text-gray-400">联名 IP 或活动主题</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                目标人群 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                disabled={loading}
                value={form.target_audience}
                onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                placeholder="如：职场女性 25-38岁，关注职场成长和生活品质，常用小红书种草"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition resize-none disabled:bg-gray-50"
              />
              <p className="text-[11px] text-gray-400">描述得越具体，AI 生成的选题越精准</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Campaign 目标 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                disabled={loading}
                value={form.campaign_goal}
                onChange={(e) => setForm((f) => ({ ...f, campaign_goal: e.target.value }))}
                placeholder="如：联名新品推广 + 品牌情感联结，提升品牌好感度并带动门店客流"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition resize-none disabled:bg-gray-50"
              />
              <p className="text-[11px] text-gray-400">写清楚核心目标和希望达成的效果</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="pb-2 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">发布设置</h2>
              <p className="text-xs text-gray-400 mt-0.5">选择平台和品牌语气，影响内容风格</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                发布平台 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    disabled={loading}
                    onClick={() => togglePlatform(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      form.platforms.includes(p.value)
                        ? 'border-brand-green bg-brand-green/10 text-brand-green'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">可多选，至少选 1 个</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">品牌语气</label>
              <div className="flex gap-3 flex-wrap">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={loading}
                    onClick={() => setForm((f) => ({ ...f, tone: t }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      form.tone === t
                        ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">决定标题和 Hook 文案的语感</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">截止日期（选填）</label>
              <input
                type="date"
                disabled={loading}
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition disabled:bg-gray-50"
              />
              <p className="text-[11px] text-gray-400">预计上线时间，便于团队排期</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitLabel}
          </button>
        </form>
        )}
      </main>
    </div>
  )
}
