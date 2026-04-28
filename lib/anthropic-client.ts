function normalizeBaseURL(raw: string | undefined): string {
  const fallback = 'https://api.anthropic.com'
  const url = (raw ?? fallback).trim()
  return url
    .replace(/\/+$/, '')
    .replace(/\/v1\/messages$/, '')
    .replace(/\/v1$/, '')
    .replace(/\/+$/, '')
}

const BASE_URL = normalizeBaseURL(process.env.ANTHROPIC_BASE_URL)

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

type TextBlock = { type: 'text'; text: string }
type ImageBlock = {
  type: 'image'
  source: {
    type: 'base64'
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    data: string
  }
}
export type ContentBlock = TextBlock | ImageBlock

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface ClaudeRequest {
  model?: string
  system?: string
  messages: ClaudeMessage[]
  max_tokens: number
}

interface ClaudeResponse {
  content?: { type: string; text?: string }[]
  error?: { message?: string; type?: string }
}

export async function claudeComplete(req: ClaudeRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 未配置')

  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: req.model ?? CLAUDE_MODEL,
      system: req.system,
      messages: req.messages,
      max_tokens: req.max_tokens,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as ClaudeResponse

  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Claude API ${res.status}`)
  }

  return data.content?.find((b) => b.type === 'text')?.text ?? ''
}
