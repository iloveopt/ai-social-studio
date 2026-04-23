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

export interface GenerateResult {
  dataUri: string | null
  error?: string
}

export async function generateCoverImage(prompt: string): Promise<GenerateResult> {
  const key = process.env.NANO_BANANA_API_KEY
  if (!key) return { dataUri: null, error: 'NANO_BANANA_API_KEY 未配置' }
  const url = `${process.env.NANO_BANANA_API_URL ?? DEFAULT_URL}?key=${encodeURIComponent(key)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('[nano-banana]', res.status, text.slice(0, 600))
      return { dataUri: null, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    let data: GeminiResponse
    try {
      data = JSON.parse(text) as GeminiResponse
    } catch {
      return { dataUri: null, error: `non-JSON response: ${text.slice(0, 200)}` }
    }

    if (data.error) {
      return { dataUri: null, error: data.error.message ?? 'gemini error' }
    }

    const parts = data.candidates?.[0]?.content?.parts ?? []
    for (const p of parts) {
      const inline = p.inlineData ?? p.inline_data
      if (inline?.data) {
        const mime = inline.mimeType ?? inline.mime_type ?? 'image/png'
        return { dataUri: `data:${mime};base64,${inline.data}` }
      }
    }
    console.error('[nano-banana] no inlineData', JSON.stringify(data).slice(0, 600))
    return { dataUri: null, error: `无图像返回：${JSON.stringify(data).slice(0, 200)}` }
  } catch (err) {
    console.error('[nano-banana] fetch failed', err)
    return { dataUri: null, error: err instanceof Error ? err.message : 'fetch failed' }
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
    `A cinematic, editorial-style 小红书 (Xiaohongshu) post cover, 3:4 vertical portrait.`,
    `Context: ${brand} × ${ip} brand collaboration campaign.`,
    `Topic angle: ${title}`,
    `Emotional hook: ${hook}`,
    tone ? `Brand tone: ${tone}` : '',
    ``,
    `Visual direction:`,
    `- Real photography aesthetic (not illustration, not gradient), high-end magazine feel`,
    `- Warm cinematic lighting, shallow depth of field, film grain`,
    `- Hero subject: a ${brand} takeaway coffee cup staged in a scene evoking the hook's mood`,
    `- Supporting props and setting that echo ${ip}: office/fashion/cinema references, manhattan skyline, runway, designer handbag, laptop — pick whatever fits the hook best`,
    `- Composition: off-center product, generous negative space (top or side) for text`,
    `- Color palette: deep neutrals with one accent color, mood: classy, aspirational, 职场女性向`,
    `- DO NOT render any visible text, letters, logos or numbers anywhere in the image`,
    `- DO NOT use flat solid backgrounds, pastel gradients, or placeholder patterns`,
  ]
    .filter(Boolean)
    .join('\n')
}
