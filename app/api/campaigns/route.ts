import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand_name, ip_name, target_audience, campaign_goal, platforms, tone, deadline } = body

    if (!brand_name || !ip_name || !target_audience || !campaign_goal || !platforms?.length || !tone) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        brand_name,
        ip_name,
        target_audience,
        campaign_goal,
        platforms,
        tone,
        deadline: deadline || null,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ id: data.id }, { status: 201 })
  } catch {
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
