'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function HeaderInner() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // 1. 初期ロードおよび Supabase リアルタイム認証状態監視 (onAuthStateChange)
  useEffect(() => {
    const supabase = createClient()

    async function loadUserData(currentUser: any) {
      if (currentUser) {
        setUser(currentUser)
        try {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, username, role')
            .eq('id', currentUser.id)
            .single()
          setProfile(data)
        } catch (err) {
          console.error('プロフィール取得エラー:', err)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
    }

    // 初回ユーザー確認
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      loadUserData(currentUser)
    })

    // 認証状態の変更をリアルタイム検出 (ログイン/ログアウト)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2. ページ遷移時にモバイルメニューを閉じ、最新のユーザー情報を再チェック
  useEffect(() => {
    setMobileMenuOpen(false)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser)
      }
    })
  }, [pathname])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || '参加者'
  const isCurator = profile?.role === 'admin' || profile?.role === 'advisor'

  return (
    <header className="bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/90 backdrop-blur-md border-b border-[#E2DDD5] dark:border-stone-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* ロゴ */}
        <Link href="/" className="flex items-center space-x-2 font-serif group">
          <span className="text-xl">🕯️</span>
          <span className="text-lg font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition">
            Poem pratyaya
          </span>
        </Link>

        {/* デスクトップ用メニュー (md以上で表示) */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-sans">
          <Link href="/poems" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition font-medium">
            詩篇目録
          </Link>
          <Link href="/lab" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            対話室（Lab）
          </Link>
          <Link href="/terms" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            マニフェスト・規約
          </Link>

          {user ? (
            <div className="flex items-center space-x-4 pl-4 border-l border-stone-200 dark:border-stone-700">
              {isCurator && (
                <Link
                  href="/curation/manage"
                  className="px-3 py-1.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded font-medium hover:bg-[#D4A359]/25 transition"
                >
                  選考執筆室
                </Link>
              )}
              <Link
                href="/mypage"
                className="text-stone-700 dark:text-stone-200 font-medium max-w-[140px] truncate hover:text-[#D4A359] transition"
                title={`マイページ (${displayName})`}
              >
                マイページ ({displayName})
              </Link>
              <Link
                href="/poems/new"
                className="px-3.5 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition shadow-sm"
              >
                + 投稿
              </Link>
              <button
                onClick={handleSignOut}
                className="text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 transition"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4 pl-4 border-l border-stone-200 dark:border-stone-700">
              <Link
                href="/mypage"
                className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition"
              >
                マイページ
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition"
              >
                ログイン
              </Link>
            </div>
          )}
        </nav>

        {/* スマホ用トグルボタン (md未満で表示) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-stone-700 dark:text-stone-200 focus:outline-none"
          aria-label="メニューを開閉"
        >
          {mobileMenuOpen ? (
            <span className="text-xl">✕</span>
          ) : (
            <span className="text-xl">☰</span>
          )}
        </button>
      </div>

      {/* スマホ用展開ドロワーメニュー */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF9F5] dark:bg-[#1A1F2C] border-b border-[#E2DDD5] dark:border-stone-800 px-4 pt-3 pb-6 space-y-3 font-sans shadow-lg animate-in fade-in slide-in-from-top-2">
          {user ? (
            <div className="p-3 bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>🕯️</span>
                <span className="text-xs font-medium text-[#1A1F2C] dark:text-stone-100 max-w-[140px] truncate">
                  {displayName}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/mypage"
                  className="text-xs text-[#D4A359] font-medium hover:underline"
                >
                  マイページ →
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                >
                  ログアウト
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg mb-3">
              <Link
                href="/mypage"
                className="text-xs text-stone-700 dark:text-stone-300 hover:text-[#D4A359]"
              >
                マイページへ
              </Link>
              <Link
                href="/auth/login"
                className="text-xs font-medium text-[#D4A359] hover:underline"
              >
                ログイン →
              </Link>
            </div>
          )}

          <div className="flex flex-col space-y-2 text-sm text-stone-700 dark:text-stone-200">
            <Link
              href="/poems/new"
              className="p-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded text-center font-medium shadow-sm"
            >
              + 詩篇を投稿する（月3作制限）
            </Link>

            {isCurator && (
              <Link
                href="/curation/manage"
                className="p-2.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded text-center font-medium"
              >
                🕯️ 月刊選考・選評執筆室
              </Link>
            )}

            <Link href="/poems" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium">
              詩篇目録（全公開作品）
            </Link>

            <Link href="/lab" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              対話と深層批判の部屋（Pratyaya Lab）
            </Link>

            <Link href="/terms" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              マニフェスト・利用規約・倫理指針
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default function Header() {
  return (
    <Suspense
      fallback={
        <header className="bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/90 border-b border-[#E2DDD5] dark:border-stone-800 sticky top-0 z-50 h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-2 font-serif">
            <span className="text-xl">🕯️</span>
            <span className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100">
              Poem pratyaya
            </span>
          </div>
        </header>
      }
    >
      <HeaderInner />
    </Suspense>
  )
}




