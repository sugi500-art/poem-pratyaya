'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ダークモード状態管理
  const [isDarkMode, setIsDarkMode] = useState(false)

  // テーマ初期化（localStorage または OS設定を検出）
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // ダークモード切り替えハンドラ
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  // プロファイル（筆名）を取得・補完する関数
  const fetchProfile = async (userId: string, userEmail?: string, metadata?: any) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data)
      } else {
        const metaDisplayName = metadata?.display_name || userEmail || '無名の表現者'
        const metaUsername = metadata?.username || `user_${userId.slice(0, 8)}`

        await supabase.from('profiles').upsert({
          id: userId,
          display_name: metaDisplayName,
          username: metaUsername,
          role: 'user'
        })

        setProfile({ display_name: metaDisplayName, username: metaUsername })
      }
    } catch (err) {
      console.error('プロファイル取得エラー:', err)
    }
  }

  useEffect(() => {
    async function loadInitialUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        await fetchProfile(user.id, user.email, user.user_metadata)
      }
      setLoading(false)
    }

    loadInitialUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-[#E2DDD5] dark:border-[#2C3448] bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/90 backdrop-blur sticky top-0 z-40 px-6 py-4 font-serif transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        <Link href="/" className="text-base font-semibold tracking-widest text-[#1A1F2C] dark:text-[#EAE8E3] hover:text-[#D4A359] dark:hover:text-[#D4A359] transition-colors">
          Poem pratyaya
        </Link>

        <div className="flex items-center space-x-5 text-xs font-sans">
          {/* ダークモード切替ボタン */}
          <button
            onClick={toggleDarkMode}
            aria-label="テーマ切替"
            className="p-1.5 rounded-full bg-[#EBE6DD] dark:bg-[#2A3245] text-[#1A1F2C] dark:text-[#EAE8E3] hover:text-[#D4A359] dark:hover:text-[#D4A359] transition-all shadow-sm"
            title={isDarkMode ? '昼の紙面（生成り）へ' : '夜の灯火（深藍）へ'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {loading ? (
            <span className="text-stone-400 dark:text-stone-500">...</span>
          ) : user ? (
            <>
              <span className="text-stone-700 dark:text-[#EAE8E3] font-serif font-medium hidden sm:inline">
                {profile?.display_name || '無名の表現者'}
              </span>
              <Link
                href="/poems/new"
                className="px-3 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:bg-stone-800 dark:hover:bg-[#C29248] transition tracking-wider font-serif font-medium"
              >
                一篇を紡ぐ
              </Link>
              <button
                onClick={handleLogout}
                className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-[#EAE8E3] transition"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-stone-600 dark:text-[#EAE8E3] hover:text-[#1A1F2C] dark:hover:text-[#D4A359] transition">
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="px-3 py-1.5 border border-[#1A1F2C] dark:border-[#D4A359] text-[#1A1F2C] dark:text-[#D4A359] rounded hover:bg-[#1A1F2C] hover:text-[#FBF9F5] dark:hover:bg-[#D4A359] dark:hover:text-[#1A1F2C] transition"
              >
                新規登録
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  )
}