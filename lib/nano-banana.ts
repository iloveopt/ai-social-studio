const DEFAULT_URL =
  'https://yunwu.ai/v1beta/models/gemini-3.1-flash-image-preview:generateContent'

interface GeminiInlineData {
  data: string
  mimeType?: string
  mime_type?: string
}

interface GeminiPart {
  text?: string
  inlineData?: GeminiInlineData
  inline_data?: GeminiInlineData
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[]
  error?: { message?: string; code?: number }
}

export async function generateCoverImage(prompt: string): Promise<string | null> {
  const key = process.env.NANO_BANANA_API_KEY
  if (!key) return null
  const url = `${process.env.NANO_BANANA_API_URL ?? DEFAULT_URL}?key=${encodeURIComponent(key)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[nano-banana]', res.status, text.slice(0, 500))
      return null
    }

    const data = (await res.json()) as GeminiResponse
    const parts = data.candidates?.[0]?.content?.parts ?? []
    for (const p of parts) {
      const inline = p.inlineData ?? p.inline_data
      if (inline?.data) {
        const mime = inline.mimeType ?? inline.mime_type ?? 'image/png'
        return `data:${mime};base64,${inline.data}`
      }
    }
    console.error('[nano-banana] no inlineData in response', JSON.stringify(data).slice(0, 400))
    return null
  } catch (err) {
    console.error('[nano-banana] fetch failed', err)
    return null
  }
}

export function buildCoverPrompt(opts: {
  brand: string
  ip: string
  title: string
  hook: string
  tone?: string
}): string {
  const { brand, ip, title, hook, tone } = opts
  return [
    `生成一张小红书风格的品牌联名海报封面图（3:4 竖版），用于 ${brand} × ${ip} 联名 Campaign。`,
    `选题标题：${title}`,
    `核心文案：${hook}`,
    tone ? `品牌语气：${tone}` : '',
    `画面要求：`,
    `- 真实摄影感或高质量插画，不要渐变占位背景`,
    `- 主体聚焦一杯星巴克咖啡，搭配与${ip}相关的情境道具/场景`,
    `- 构图留白，上方或中部留文字位置`,
    `- 风格：时尚、有电影感、色调高级`,
    `- 不要生成任何文字/Logo（防止错字）`,
  ]
    .filter(Boolean)
    .join('\n')
}
