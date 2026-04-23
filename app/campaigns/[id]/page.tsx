import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campaign, TopicWithEvals } from '@/types'
import ReviewBoard from './ReviewBoard'

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

  // cover_image 现在是 Supabase Storage URL（~100 字节），可以放心
  // 跟其他字段一起 SSR，浏览器从 CDN 直接拿图，不再占 JS 堆
  const { data: topics } = await supabase
    .from('topics')
    .select('*, ai_evaluations(*)')
    .eq('campaign_id', id)
    .is('deleted_at', null)
    .order('seq_num', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[390px] min-h-screen bg-white relative shadow-[0_0_24px_rgba(0,0,0,0.04)]">
        <ReviewBoard
          campaign={campaign as Campaign}
          initialTopics={(topics as TopicWithEvals[]) ?? []}
        />
      </div>
    </div>
  )
}
