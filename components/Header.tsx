'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isDark, setIsDark] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // ユーザー情報の初期取得
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getUser()

    // 認証状態の変化をリアルタイム監視（ログイン・ログアウトが即時反映されます）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
      setLoading(false)
    })

    // ダークモードの初期判定
    const isDarkMode =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)

    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // ダークモード切り替え
  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  // ログアウト処理
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-stone-200/80 dark:border-stone-800 bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 font-serif">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* ロゴ / サイト名 */}
        <Link href="/" className="text-base font-normal tracking-widest text-[#1A1F2C] dark:text-[#EAE8E3] hover:text-[#D4A359] transition">
          Poem pratyaya
        </Link>

        {/* ナビゲーションメニュー */}
        <nav className="flex items-center gap-3 sm:gap-5 text-xs font-sans">
          <Link href="/poems" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            詩篇目録
          </Link>
          <Link href="/lab" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            対話（Pratyaya Lab）
          </Link>
          <Link href="/terms" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            理念・規約
          </Link>

          {/* ダークモード表示切替ボタン */}
          <button
            onClick={toggleDarkMode}
            aria-label="表示モード切り替え"
            className="p-1.5 rounded-full text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            title={isDark ? '生成り（ライト）モードへ切り替え' : '深藍（ダーク）モードへ切り替え'}
          >
            {isDark ? (
              <svg className="w-4 h-4 text-[#D4A359]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* ログイン・ログアウト・マイページ分岐 */}
          {!loading && (
            currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-stone-300 dark:border-stone-700">
                <Link
                  href={`/profile/${currentUser.user_metadata?.username || 'mypage'}`}
                  className="text-stone-800 dark:text-stone-200 font-medium hover:text-[#D4A359] transition"
                >
                  マイページ
                </Link>
                <Link
                  href="/poems/new"
                  className="px-3 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 transition font-medium"
                >
                  詩を紡ぐ
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                  title="ログアウト"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="px-3 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 transition font-medium"
              >
                ログイン / 登録
              </Link>
            )
          )}
        </nav>

      </div>
    </header>
  )
}