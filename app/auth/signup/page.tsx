'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agreedToEthics, setAgreedToEthics] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToEthics) {
      setErrorMsg('倫理ガイドラインへの同意が必要です。')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('アカウントの登録が完了しました！そのままログインしてご利用いただけます 🕯️')
      }
    } catch (err: any) {
      setErrorMsg('予期せぬエラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  // ビルド時の静的Prerenderエラーを回避するガード
  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] flex items-center justify-center font-sans">
        <p className="text-sm text-gray-500 dark:text-stone-400">読み込んでいます...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center px-4 py-12 font-serif antialiased">
      <div className="max-w-md w-full bg-white dark:bg-[#242B3B] p-8 rounded-xl border border-[#E2DDD5] dark:border-stone-800 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            Poem pratyaya 会員登録
          </h1>
          <p className="text-xs text-gray-600 dark:text-stone-400 font-sans">
            言葉と思索を深める聖域へようこそ
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded font-sans">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded font-sans">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">
              筆名（表示名）
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：黒髪"
              className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">
              パスワード
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
            />
          </div>

          <div className="p-3 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="ethics-agree"
              checked={agreedToEthics}
              onChange={(e) => setAgreedToEthics(e.target.checked)}
              className="mt-0.5 accent-[#1A1F2C] dark:accent-[#D4A359] h-4 w-4"
              required
            />
            <label htmlFor="ethics-agree" className="text-xs text-gray-700 dark:text-stone-300 leading-snug cursor-pointer select-none">
              <span className="font-semibold text-[#D4A359]">【倫理・利用規約】</span>
              勝敗や優劣を離れ、他者の尊厳と良心を尊重する対話空間の理念に同意します。
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !agreedToEthics}
            className="w-full py-3 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] font-medium text-xs tracking-wider rounded transition-colors"
          >
            {loading ? '送信中...' : '登録する'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#E2DDD5] dark:border-stone-800 text-xs font-sans">
          <span className="text-gray-500 dark:text-stone-400">すでにアカウントをお持ちの方は </span>
          <Link href="/auth/login" className="text-[#D4A359] hover:underline font-medium">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  )
}