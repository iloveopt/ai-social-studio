'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Variant = 'dark' | 'light'

export default function AuthMenu({ variant = 'light' }: { variant?: Variant }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function signIn() {
    const next = pathname && pathname !== '/' ? pathname : '/'
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.refresh()
  }

  const isDark = variant === 'dark'

  if (!ready) {
    return (
      <div
        className={`h-9 w-20 rounded-full animate-pulse ${
          isDark ? 'bg-white/10' : 'bg-gray-100'
        }`}
      />
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className={`inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium transition-colors ${
          isDark
            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        <GithubIcon className="w-4 h-4" />
        登录
      </button>
    )
  }

  const meta = (user.user_metadata ?? {}) as {
    user_name?: string
    preferred_username?: string
    full_name?: string
    name?: string
    avatar_url?: string
  }
  const username =
    meta.user_name ?? meta.preferred_username ?? meta.full_name ?? meta.name ?? user.email ?? 'GitHub 用户'
  const avatarUrl = meta.avatar_url

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 pl-1 pr-3 h-9 rounded-full transition-colors ${
          isDark
            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        }`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={username}
            className="w-7 h-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              isDark ? 'bg-white/20' : 'bg-gray-300 text-gray-700'
            }`}
          >
            {username.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium max-w-[120px] truncate">{username}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-gray-200 py-1 z-50"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">已登录为</p>
            <p className="text-sm font-medium text-gray-900 truncate">{username}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  )
}
