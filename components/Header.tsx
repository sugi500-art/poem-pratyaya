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
        // プロファイル未作成時の補完
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
    // 初回ユーザー確認
    async function loadInitialUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        await fetchProfile(user.id, user.email, user.user_metadata)
      }
      setLoading(false)
    }

    loadInitialUser()

    // ログイン・ログアウト等の状態変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // ログイン状態になったら即座にプロファイルを取得
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
    <header className="border-b border-[#E2DDD5] bg-[#FBF9F5]/90 backdrop-blur sticky top-0 z-40 px-6 py-4 font-serif">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        <Link href="/" className="text-base font-semibold tracking-widest text-[#1A1F2C]">
          Poem pratyaya
        </Link>

        <div className="flex items-center space-x-6 text-xs font-sans">
          {loading ? (
            <span className="text-stone-400">...</span>
          ) : user ? (
            <>
              {/* 筆名を表示（万が一取得できない場合もメールアドレスではなく「無名の表現者」と表示） */}
              <span className="text-stone-700 font-serif font-medium hidden sm:inline">
                {profile?.display_name || '無名の表現者'}
              </span>
              <Link
                href="/poems/new"
                className="px-3 py-1.5 bg-[#1A1F2C] text-[#FBF9F5] rounded hover:bg-stone-800 transition tracking-wider font-serif"
              >
                一篇を紡ぐ
              </Link>
              <button
                onClick={handleLogout}
                className="text-stone-500 hover:text-stone-800 transition"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-stone-600 hover:text-[#1A1F2C] transition">
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="px-3 py-1.5 border border-[#1A1F2C] text-[#1A1F2C] rounded hover:bg-[#1A1F2C] hover:text-[#FBF9F5] transition"
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