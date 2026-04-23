import { createServiceClient } from './server'

const BUCKET = 'topic-covers'

// 把 nano-banana 返回的 data URI 上传到 Supabase Storage，
// 返回 public URL。失败返回 null，调用方自行决定兜底策略。
export async function uploadCoverFromDataUri(
  topicId: string,
  dataUri: string
): Promise<string | null> {
  const match = dataUri.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i)
  if (!match) {
    console.error('[storage] dataUri 格式不识别', dataUri.slice(0, 80))
    return null
  }
  const mime = match[1]
  const b64 = match[2]
  const ext = (mime.split('/')[1] ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const buffer = Buffer.from(b64, 'base64')

  const supabase = createServiceClient()
  const path = `${topicId}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true })

  if (error) {
    console.error('[storage] upload failed', error)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // 加 updated 时间戳击穿 CDN/浏览器对 upsert 同一 path 的缓存
  return `${data.publicUrl}?v=${Date.now()}`
}
