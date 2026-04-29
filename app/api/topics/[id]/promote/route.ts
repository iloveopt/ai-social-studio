import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// PATCH /api/topics/{id}/promote
// body: { workspace: 'draft' | 'review' }
// 把 topic 在 草稿区 / 客户讨论区 之间切换
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { workspace } = body as { workspace?: string }

    if (workspace !== 'draft' && workspace !== 'review') {
      return Response.json({ error: '无效 workspace 值' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('topics')
      .update({ workspace })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, workspace })
  } catch {
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
