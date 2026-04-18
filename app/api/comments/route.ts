import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic_id, user_name, user_role, content } = body

    if (!topic_id || !user_name || !content) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('comments')
      .insert({ topic_id, user_name, user_role: user_role || null, content })
      .select('id')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ id: data.id }, { status: 201 })
  } catch {
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
