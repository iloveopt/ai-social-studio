import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Campaign } from '@/types'
import AuthMenu from '@/components/auth-menu'

const PLATFORM_LABELS: Record<string, string> = {
  xhs: '小红书',
  douyin: '抖音',
  weibo: '微博',
  wechat: '微信',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  archived: '已归档',
}

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  const list = (campaigns as Campaign[] | null) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">所有 Campaign</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建
            </Link>
            <AuthMenu variant="light" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            加载失败：{error.message}
          </div>
        )}

        {list.length === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-base">还没有 Campaign</p>
            <Link href="/campaigns/new" className="mt-4 inline-block text-brand-green text-sm font-medium hover:underline">
              创建第一个 →
            </Link>
          </div>
        )}

        {list.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns/${campaign.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-green hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-gray-900">{campaign.brand_name}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-base font-semibold text-gray-900">{campaign.ip_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft}`}>
                    {STATUS_LABELS[campaign.status] ?? campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{campaign.campaign_goal}</p>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {campaign.platforms.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {PLATFORM_LABELS[p] ?? p}
                    </span>
                  ))}
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-brand-blue rounded-full">
                    {campaign.tone}
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {new Date(campaign.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </Link>
        ))}
      </main>
    </div>
  )
}
