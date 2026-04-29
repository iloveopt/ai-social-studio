'use client'

import { useRef, useState } from 'react'
import type { InspirationSuggestion } from '@/types'
import { TypewriterStages } from './TypewriterStages'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg']

const CARD_ACCENTS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-orange-400 to-rose-500',
]

interface Props {
  campaignId: string
  open: boolean
  onClose: () => void
}

export default function InspirationUploader({ campaignId, open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<InspirationSuggestion[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  function handleFile(f: File) {
    if (!ALLOWED_MIME.includes(f.type)) {
      showToast('图片格式不支持，仅支持 PNG/JPEG')
      return
    }
    if (f.size > MAX_SIZE) {
      showToast('图片太大，请压缩后重试')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(f)
    setError(null)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setSuggestions([])
    try {
      const form = new FormData()
      form.append('campaignId', campaignId)
      form.append('image', file)
      const res = await fetch('/api/inspirations', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '分析失败')
      setAnalysis(data.analysis ?? '')
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setAnalysis(null)
    setSuggestions([])
    setError(null)
  }

  function closePanel() {
    onClose()
    reset()
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900">📎 上传小红书截图</h3>
                <p className="text-xs text-gray-500 mt-0.5">AI 帮你生成类似风格的创意方向</p>
              </div>
              <button
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Upload area */}
              {!preview ? (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`block w-full rounded-xl border-2 border-dashed px-4 py-10 text-center cursor-pointer transition ${
                    dragOver
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={onPick}
                    className="hidden"
                  />
                  <div className="text-3xl mb-2">🖼️</div>
                  <p className="text-sm text-gray-700 font-medium">点击或拖拽图片到此处</p>
                  <p className="text-xs text-gray-400 mt-1">PNG / JPEG，最大 5MB</p>
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="截图预览" className="w-full max-h-60 object-contain bg-white" />
                    <button
                      onClick={reset}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 flex items-center justify-center"
                      aria-label="移除"
                    >
                      ✕
                    </button>
                  </div>
                  {!analysis && !loading && (
                    <button
                      onClick={handleAnalyze}
                      className="w-full py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                    >
                      ✨ 分析并生成创意
                    </button>
                  )}
                  {loading && (
                    <div className="py-3 flex flex-col items-center gap-2.5">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-brand-green animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                      <p className="text-gray-500 text-sm min-h-[1.5em]">
                        <TypewriterStages
                          stages={[
                            '解析截图视觉风格…',
                            '提取文案语气特征…',
                            '匹配品牌调性…',
                            '生成相似方向创意…',
                          ]}
                          cursorClassName="bg-brand-green"
                        />
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Results */}
              {analysis && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">截图分析</p>
                    <blockquote className="text-sm text-gray-700 leading-relaxed pl-3 border-l-4 border-gray-300 bg-gray-50 py-2.5 pr-3 rounded-r-lg">
                      {analysis}
                    </blockquote>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">灵感卡</p>
                      <div className="space-y-2.5">
                        {suggestions.map((s, i) => {
                          const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
                          return (
                            <div
                              key={i}
                              className="relative bg-white rounded-xl shadow-sm border border-gray-100 pl-4 pr-3 py-3 overflow-hidden"
                            >
                              <span className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent}`} />
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="text-sm font-bold text-gray-900 leading-snug">{s.title}</h4>
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                  #{i + 1}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed mb-2">{s.hook}</p>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {s.format && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                    {s.format}
                                  </span>
                                )}
                                {s.why && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {s.why}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => showToast('功能即将上线')}
                                className="text-xs font-medium text-brand-green hover:underline"
                              >
                                + 加入评审
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={reset}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    换一张截图
                  </button>
                </div>
              )}
            </div>
          </div>

          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-lg bg-gray-900 text-white text-sm shadow-xl">
              {toast}
            </div>
          )}
        </div>
      )}

    </>
  )
}
