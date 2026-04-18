import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campaign, TopicWithEvals } from '@/types'
import ReviewBoard from './ReviewBoard'
import Link from 'next/link'

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (campError || !campaign) notFound()

  const { data: topics } = await supabase
    .from('topics')
    .select('*, ai_evaluations(*)')
    .eq('campaign_id', id)
    .is('deleted_at', null)
    .order('seq_num', { ascending: true })

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
        <Link href="/" className="hover:text-gray-600 transition-colors">首页</Link>
        <span>/</span>
        <Link href="/campaigns" className="hover:text-gray-600 transition-colors">Campaign</Link>
        <span>/</span>
        <span className="text-gray-600">{(campaign as Campaign).brand_name}</span>
      </nav>
      <ReviewBoard
        campaign={campaign as Campaign}
        initialTopics={(topics as TopicWithEvals[]) ?? []}
      />
    </div>
  )
}
