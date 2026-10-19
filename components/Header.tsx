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

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // プロファイル情報の取得
        const { data } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
        } else {
          // プロファイルが存在しない場合の自動補完
          const metaDisplayName = user.user_metadata?.display_name || user.email
          const metaUsername = user.user_metadata?.username || `user_${user.id.slice(0, 8)}`
          
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: metaDisplayName,
            username: metaUsername,
            role: 'user'
          })

          setProfile({ display_name: metaDisplayName, username: metaUsername })
        }
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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
              <span className="text-stone-700 font-serif font-medium hidden sm:inline">
                {profile?.display_name || user.email}
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