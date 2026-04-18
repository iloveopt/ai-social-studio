import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!['pending', 'approved', 'discussing', 'rejected'].includes(status)) {
      return Response.json({ error: '无效状态值' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('topics')
      .update({ status })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
