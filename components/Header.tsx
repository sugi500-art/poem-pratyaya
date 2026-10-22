'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, username, role')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getUser()
  }, [])

  // ページ移動時にモバイルメニューを閉じる
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const displayName = profile?.display_name || profile?.username || '参加者'
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
                className="text-stone-700 dark:text-stone-200 font-medium max-w-[120px] truncate hover:text-[#D4A359] transition"
                title={displayName}
              >
                {displayName}
              </Link>
              <Link
                href="/poems/new"
                className="px-3.5 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition shadow-sm"
              >
                + 投稿
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition"
            >
              ログイン
            </Link>
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
          {user && (
            <div className="p-3 bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>🕯️</span>
                <span className="text-xs font-medium text-[#1A1F2C] dark:text-stone-100 max-w-[160px] truncate">
                  {displayName}
                </span>
              </div>
              <Link
                href="/mypage"
                className="text-xs text-[#D4A359] font-medium hover:underline"
              >
                マイページ →
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
