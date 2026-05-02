import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('confirm') !== 'yes') {
    return Response.json({ error: '加 ?confirm=yes 才执行' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('brand_name', '星巴克')
    .maybeSingle()

  if (!campaign) {
    return Response.json({ message: '没找到星巴克 campaign，无需重置' })
  }

  const { data: topics } = await supabase
    .from('topics')
    .select('id')
    .eq('campaign_id', campaign.id)

  const topicIds = (topics ?? []).map((t) => t.id)

  if (topicIds.length > 0) {
    await supabase.from('ai_evaluations').delete().in('topic_id', topicIds)
    await supabase.from('comments').delete().in('topic_id', topicIds)
    await supabase.from('topics').delete().eq('campaign_id', campaign.id)
  }

  await supabase.from('campaigns').delete().eq('id', campaign.id)

  return Response.json({
    message: '已清除星巴克 demo 数据',
    deleted: { campaign: campaign.id, topics: topicIds.length },
  })
}
