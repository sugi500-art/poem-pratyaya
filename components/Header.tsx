'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface NotificationItem {
  id: string
  user_id: string
  actor_id: string | null
  type: 'poem_review' | 'direct_message' | 'forum_reply' | 'official_notice' | string
  title: string
  content: string | null
  link_url: string
  is_read: boolean
  created_at: string
  actor?: {
    display_name: string | null
    username: string | null
  } | null
}

function HeaderInner() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  const popoverRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // 1. テーマ状態の初期化と同期
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  // ポップアップ外クリックのハンドリング
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 2. ユーザーデータ ＆ お知らせ通知の取得
  async function loadUserData(currentUser: any) {
    if (currentUser) {
      setUser(currentUser)
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, username, role')
          .eq('id', currentUser.id)
          .single()
        setProfile(profileData)

        // 通知データの取得
        fetchNotifications(currentUser.id)
      } catch (err) {
        console.error('プロフィール取得エラー:', err)
      }
    } else {
      setUser(null)
      setProfile(null)
      setNotifications([])
      setUnreadCount(0)
    }
  }

  // 通知一覧の取得関数
  async function fetchNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          actor_id,
          type,
          title,
          content,
          link_url,
          is_read,
          created_at,
          actor:profiles!actor_id ( display_name, username )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        const list = data as unknown as NotificationItem[]
        setNotifications(list)
        setUnreadCount(list.filter((n) => !n.is_read).length)
      }
    } catch (e) {
      console.error('通知取得エラー:', e)
    }
  }

  // 初期ロードおよび Supabase リアルタイム認証監視
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      loadUserData(currentUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ページ遷移時にポップアップとモバイルメニューを閉じる
  useEffect(() => {
    setMobileMenuOpen(false)
    setNotificationsOpen(false)
    if (user) {
      fetchNotifications(user.id)
    }
  }, [pathname])

  // 単一通知の既読化 ＆ 遷移
  const handleNotificationClick = async (notif: NotificationItem) => {
    setNotificationsOpen(false)

    if (!notif.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id)

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (e) {
        console.error('既読化エラー:', e)
      }
    }

    router.push(notif.link_url)
  }

  // すべて既読にする
  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('一括既読エラー:', e)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setNotifications([])
    setUnreadCount(0)
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || '参加者'
  const isCurator = profile?.role === 'admin' || profile?.role === 'advisor'

  // 通知タイプごとのアイコン判定
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'poem_review':
        return '🌸'
      case 'direct_message':
        return '✉️'
      case 'forum_reply':
        return '💬'
      case 'official_notice':
        return '🕯️'
      default:
        return '🔔'
    }
  }

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
        <nav className="hidden md:flex items-center space-x-5 text-xs font-sans">
          <Link href="/poems" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition font-medium">
            詩篇目録
          </Link>
          <Link href="/curation/archive" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            推薦アーカイヴ
          </Link>
          <Link href="/lab" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            対話室（Lab）
          </Link>
          <Link href="/terms" className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition">
            マニフェスト・規約
          </Link>

          {/* ダークモード切り替えボタン */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-[#D4A359] dark:hover:text-[#D4A359] transition rounded border border-stone-200 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-800/50"
            title={theme === 'dark' ? '明るい画面（ライトモード）に切り替え' : '静寂な画面（ダークモード）に切り替え'}
            aria-label="テーマ切替"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="flex items-center space-x-3.5 pl-4 border-l border-stone-200 dark:border-stone-700 relative" ref={popoverRef}>
              
              {/* 🔔 通知ベルボタン */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition rounded relative focus:outline-none"
                title="通知・言葉の便り"
                aria-label="通知ベル"
              >
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#D4A359] text-[#1A1F2C] text-[10px] font-bold rounded-full animate-pulse shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* 🔔 通知ポップオーバーポップアップ */}
              {notificationsOpen && (
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white dark:bg-[#242B3B] border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl py-3 px-4 z-50 font-serif space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔔</span>
                      <h3 className="text-xs font-medium text-[#1A1F2C] dark:text-stone-100 font-sans">
                        言葉と響きの通知
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.2 bg-[#D4A359]/20 text-[#8C621C] dark:text-[#E5B869] text-[10px] rounded-full font-sans font-medium">
                          {unreadCount} 件未読
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-sans text-stone-400 hover:text-[#D4A359] transition"
                      >
                        すべて既読にする
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/80 pr-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`py-2.5 px-2 rounded-lg transition cursor-pointer flex items-start gap-3 hover:bg-[#FBF9F5] dark:hover:bg-[#1E2533] ${
                            !notif.is_read ? 'bg-[#FDFBF7]/80 dark:bg-[#1E2533]/80 font-medium' : 'opacity-85'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </span>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 text-[10px] font-sans text-stone-400">
                              <span className="font-semibold text-stone-700 dark:text-stone-300 truncate">
                                {notif.title}
                              </span>
                              <span className="shrink-0">{new Date(notif.created_at).toLocaleDateString('ja-JP')}</span>
                            </div>
                            {notif.content && (
                              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2">
                                {notif.content}
                              </p>
                            )}
                          </div>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#D4A359] shrink-0 mt-1.5" title="未読" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs font-sans text-stone-400">
                        新しく届いた通知はありません 🕯️
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isCurator && (
                <Link
                  href="/curation/manage"
                  className="px-3 py-1.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded font-medium hover:bg-[#D4A359]/25 transition"
                >
                  アドバイザー執筆室
                </Link>
              )}
              <Link
                href="/mypage"
                className="text-stone-700 dark:text-stone-200 font-medium max-w-[120px] truncate hover:text-[#D4A359] transition"
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
        <div className="flex items-center space-x-2 md:hidden">
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-stone-700 dark:text-stone-200 relative"
              title="通知"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 px-1.5 py-0.2 bg-[#D4A359] text-[#1A1F2C] text-[9px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-1.5 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded text-sm"
            title="テーマ切替"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-700 dark:text-stone-200 focus:outline-none"
            aria-label="メニューを開閉"
          >
            {mobileMenuOpen ? (
              <span className="text-xl">✕</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* スマホ用展開ドロワーメニュー */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF9F5] dark:bg-[#1A1F2C] border-b border-[#E2DDD5] dark:border-stone-800 px-4 pt-3 pb-6 space-y-3 font-sans shadow-lg animate-in fade-in slide-in-from-top-2">
          {user ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg flex items-center justify-between">
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

              {/* スマホ用通知一覧 */}
              {notifications.length > 0 && (
                <div className="p-3 bg-white dark:bg-[#242B3B] rounded-lg border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-1.5">
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1">
                      <span>🔔</span>
                      <span>言葉と響きの通知 ({unreadCount}件未読)</span>
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-stone-400 hover:text-[#D4A359]"
                      >
                        既読にする
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-2 rounded text-xs leading-relaxed flex items-start gap-2 cursor-pointer ${
                          !notif.is_read ? 'bg-[#FDFBF7] dark:bg-[#1E2533] font-medium border-l-2 border-[#D4A359]' : 'opacity-80'
                        }`}
                      >
                        <span>{getNotificationIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-stone-800 dark:text-stone-200 truncate">{notif.title}</p>
                          {notif.content && <p className="text-[11px] text-stone-500 line-clamp-1">{notif.content}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                🕯️ 月刊推薦・アドバイザー執筆室
              </Link>
            )}

            <Link href="/poems" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium">
              詩篇目録（全公開作品）
            </Link>

            <Link href="/curation/archive" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              月刊推薦アーカイヴ（過去の推薦・鑑賞）
            </Link>

            <Link href="/lab" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              対話と深層批判の部屋（Pratyaya Lab）
            </Link>

            <Link href="/terms" className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition">
              マニフェスト・利用規約・倫理指針
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition text-left flex items-center justify-between text-stone-600 dark:text-stone-300"
            >
              <span>画面テーマ切替</span>
              <span>{theme === 'dark' ? '☀️ ライトモードへ' : '🌙 ダークモードへ'}</span>
            </button>
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








