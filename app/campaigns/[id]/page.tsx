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

  // SSR 不带 cover_image（base64 太大，单次 payload 可达 2-3MB，
  // 第一次进入页面会很慢）。feed 先渲染渐变占位，客户端挂载后
  // 再异步拉 cover_image 填充。
  const { data: topics } = await supabase
    .from('topics')
    .select(`
      id, created_at, campaign_id, seq_num, title, hook, thinking,
      exec_plan, handoff, refs, persona, status, ai_avg_score, deleted_at,
      ai_evaluations (*)
    `)
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
