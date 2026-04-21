import OpenAI from 'openai'

function normalizeBaseURL(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let url = raw.trim().replace(/\/+$/, '')
  url = url.replace(/\/v1\/messages$/, '')
  url = url.replace(/\/messages$/, '')
  url = url.replace(/\/+$/, '')
  if (!/\/v1$/.test(url)) url = `${url}/v1`
  return `${url}/`
}

export const anthropicClient = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: normalizeBaseURL(process.env.ANTHROPIC_BASE_URL),
})

export const CLAUDE_MODEL = 'claude-sonnet-4-5'
