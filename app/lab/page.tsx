'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  display_name: string | null
  username: string | null
  role?: 'user' | 'advisor' | 'admin'
}

export interface ForumCategory {
  id: string
  slug: string
  name: string
  description?: string
  display_order?: number
}

export interface ForumPost {
  id: string
  thread_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile | null
}

export interface ForumThread {
  id: string
  category_id: string
  author_id: string
  title: string
  content: string
  posts_count: number
  last_activity_at: string
  created_at: string
  author?: Profile | null
  posts?: ForumPost[]
}

export default function ForumLabView() {
  const [hasMounted, setHasMounted] = useState(false)
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  // 新規スレッドモーダル状態
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState('')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)

  // 返信状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // モバイル表示切替
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    fetchCategories()
    fetchThreads()
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  // カテゴリ一覧をSupabaseから取得
  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        console.error('カテゴリ取得エラー:', error)
      } else if (data && data.length > 0) {
        setCategories(data as ForumCategory[])
        setNewThreadCategory(data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // スレッド＆返信をSupabaseから取得（profilesテーブルとリレーション結合）
  async function fetchThreads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('forum_threads')
        .select(`
          *,
          author:profiles!author_id (
            id,
            display_name,
            username,
            role
          ),
          posts:forum_posts (
            *,
            author:profiles!author_id (
              id,
              display_name,
              username,
              role
            )
          )
        `)
        .order('last_activity_at', { ascending: false })

      if (error) {
        console.error('スレッド取得エラー:', error)
        setThreads([])
      } else if (data) {
        // postsのソート (created_at昇順)
        const formatted = data.map((t: any) => ({
          ...t,
          posts: (t.posts || []).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        }))
        setThreads(formatted as ForumThread[])
        if (formatted.length > 0 && !activeThreadId) {
          setActiveThreadId(formatted[0].id)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 新規スレッド作成（Supabaseへ保存）
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      alert('スレッドを開設するにはログインが必要です。')
      return
    }
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed) return

    try {
      setIsSubmitting(true)
      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          category_id: newThreadCategory || (categories[0]?.id ?? null),
          author_id: currentUser.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
          posts_count: 0,
          last_activity_at: new Date().toISOString(),
        })
        .select(`
          *,
          author:profiles!author_id (
            id,
            display_name,
            username,
            role
          )
        `)
        .single()

      if (error) throw error

      setIsNewThreadOpen(false)
      setNewThreadTitle('')
      setNewThreadContent('')
      setNewThreadEthicsAgreed(false)
      await fetchThreads()
      if (data) setActiveThreadId(data.id)
      setMobileView('detail')
    } catch (err: any) {
      alert('スレッドの作成に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // スレッド削除
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('このスレッドを削除しますか？関連するすべての対話応答も削除されます。')) return

    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId)

      if (error) throw error

      await fetchThreads()
    } catch (err: any) {
      alert('スレッドの削除に失敗しました: ' + (err.message || 'エラーが発生しました'))
    }
  }

  // 返信投稿（Supabaseへ保存）
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      alert('応答を送信するにはログインが必要です。')
      return
    }
    if (!activeThreadId || !replyContent.trim() || !replyEthicsAgreed) return

    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: activeThreadId,
          author_id: currentUser.id,
          content: replyContent.trim(),
        })

      if (error) throw error

      setReplyContent('')
      setReplyEthicsAgreed(false)
      await fetchThreads()
    } catch (err: any) {
      alert('応答の送信に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 返信削除
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この対話応答を削除しますか？')) return

    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      await fetchThreads()
    } catch (err: any) {
      alert('応答の削除に失敗しました: ' + (err.message || 'エラーが発生しました'))
    }
  }

  if (!hasMounted) return null

  const filteredThreads = selectedCategoryId === 'all'
    ? threads
    : threads.filter((t) => t.category_id === selectedCategoryId)

  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased pb-20 selection:bg-[#D4A359]/20">
      {/* ページヘッダー */}
      <header className="border-b border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8] dark:bg-[#121621] py-10 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
            <span>🕯️</span>
            <span>Pratyaya Lab / 対話と深層批判の空地</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            Pratyaya Lab（対話空間）
          </h1>

          <p className="max-w-2xl mx-auto text-sm leading-relaxed text-gray-600 dark:text-stone-400 font-sans">
            詩を縁（pratyaya）として持ちより、言葉の解釈と知の構造化を深める静寂な対話空間です。<br className="hidden sm:inline" />
            二元論的な勝敗や排他を離れ、他者の尊厳と自己の良心を照らす言葉を織り重ねます。
          </p>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* カテゴリタブ & スレッド作成ボタン */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium shadow-sm'
                  : 'bg-[#F4F0E8] dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-[#EAE4D8] dark:hover:bg-stone-700'
              }`}
            >
              すべて ({threads.length})
            </button>
            {categories.map((cat) => {
              const count = threads.filter((t) => t.category_id === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium shadow-sm'
                      : 'bg-[#F4F0E8] dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-[#EAE4D8] dark:hover:bg-stone-700'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>

          <button
            onClick={() => {
              if (!currentUser) {
                alert('新しい問いを立てるにはログインが必要です。')
                return
              }
              setIsNewThreadOpen(true)
            }}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs tracking-wider font-sans rounded shadow-sm transition-all font-medium shrink-0"
          >
            <span>＋</span>
            <span>新しい問いを立てる（スレッド作成）</span>
          </button>
        </div>

        {/* モバイル表示切り替えタブ */}
        <div className="flex lg:hidden bg-[#E2DDD5] dark:bg-stone-800 p-1 rounded-lg mb-6 text-xs font-sans">
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 py-2 text-center rounded transition ${
              mobileView === 'list'
                ? 'bg-white dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 font-medium shadow-sm'
                : 'text-gray-600 dark:text-stone-400'
            }`}
          >
            スレッド一覧 ({filteredThreads.length})
          </button>
          <button
            onClick={() => setMobileView('detail')}
            className={`flex-1 py-2 text-center rounded transition ${
              mobileView === 'detail'
                ? 'bg-white dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 font-medium shadow-sm'
                : 'text-gray-600 dark:text-stone-400'
            }`}
          >
            対話詳細
          </button>
        </div>

        {/* スレッドレイアウト */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500 font-sans">対話空間を読み込んでいます...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 左側：スレッド一覧 (5/12) */}
            <div className={`lg:col-span-5 space-y-4 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs tracking-widest text-gray-500 dark:text-stone-400 font-sans uppercase">
                  対話スレッド一覧
                </h2>
                <span className="text-xs text-gray-400 dark:text-stone-500 font-sans">
                  {filteredThreads.length} 件表示中
                </span>
              </div>

              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-sm text-gray-500 dark:text-stone-400 font-sans space-y-3">
                  <p>該当するカテゴリのスレッドはまだありません。</p>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        alert('ログインが必要です。')
                        return
                      }
                      setIsNewThreadOpen(true)
                    }}
                    className="text-xs text-[#D4A359] hover:underline font-medium"
                  >
                    最初の問いを立ててみませんか？
                  </button>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const category = categories.find((c) => c.id === thread.category_id)
                  const isActive = activeThreadId === thread.id
                  const authorDisplayName =
                    thread.author?.display_name || thread.author?.username || '匿名表現者'

                  return (
                    <div
                      key={thread.id}
                      onClick={() => {
                        setActiveThreadId(thread.id)
                        setMobileView('detail')
                      }}
                      className={`p-5 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-[#D4A359] bg-white dark:bg-[#242B3B] shadow-md ring-1 ring-[#D4A359]/30'
                          : 'border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60 hover:bg-white dark:hover:bg-[#242B3B]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 font-sans mb-2">
                        <span className="px-2 py-0.5 bg-[#EAE4D8] dark:bg-stone-800 text-gray-800 dark:text-stone-200 rounded text-[10px] font-medium">
                          {category?.name || '対話'}
                        </span>
                        <span className="text-[11px]">応答 {thread.posts_count || 0}件</span>
                      </div>

                      <h3 className="text-base font-medium leading-snug text-[#1A1F2C] dark:text-stone-100 mb-2 line-clamp-2">
                        {thread.title}
                      </h3>

                      <p className="text-xs text-gray-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-3 font-serif">
                        {thread.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 font-sans pt-2 border-t border-gray-100 dark:border-stone-800/80">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-[#1A1F2C] dark:text-stone-200">
                            {authorDisplayName}
                          </span>
                          {thread.author?.role === 'admin' && (
                            <span className="text-[10px] text-[#D4A359] border border-[#D4A359] px-1 rounded">主宰</span>
                          )}
                          {thread.author?.role === 'advisor' && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 border border-emerald-600 px-1 rounded">特別選者</span>
                          )}
                        </span>
                        <span>{new Date(thread.last_activity_at || thread.created_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* 右側：スレッド詳細 (7/12) */}
            <div className={`lg:col-span-7 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
              {activeThread ? (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 md:p-8 space-y-8 shadow-sm">
                  {/* スレッドヘッダー */}
                  <div className="border-b border-[#E2DDD5] dark:border-stone-800 pb-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-[#F4F0E8] dark:bg-stone-800 text-[#1A1F2C] dark:text-stone-200 text-xs font-sans rounded font-medium">
                          {categories.find((c) => c.id === activeThread.category_id)?.name || '対話'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-stone-400 font-sans">
                          {new Date(activeThread.created_at).toLocaleString('ja-JP')}
                        </span>
                      </div>

                      {/* 作者本人の削除ボタン */}
                      {currentUser && activeThread.author_id === currentUser.id && (
                        <button
                          onClick={() => handleDeleteThread(activeThread.id)}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-sans px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="このスレッドを削除"
                        >
                          🗑️ スレッドを削除
                        </button>
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 leading-snug">
                      {activeThread.title}
                    </h2>

                    <div className="flex items-center gap-2 text-xs font-sans text-gray-600 dark:text-stone-300">
                      <span>投げかけられた問い：</span>
                      <span className="font-medium text-[#1A1F2C] dark:text-stone-100">
                        {activeThread.author?.display_name || activeThread.author?.username || '匿名表現者'}
                      </span>
                      {activeThread.author?.role === 'admin' && (
                        <span className="text-[10px] bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] px-1.5 py-0.5 rounded font-medium">主宰</span>
                      )}
                      {activeThread.author?.role === 'advisor' && (
                        <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded">特別選者</span>
                      )}
                    </div>
                  </div>

                  {/* 本文 */}
                  <div className="text-base text-gray-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap font-serif bg-[#FBF9F5] dark:bg-[#1A1F2C] p-6 rounded-lg border border-[#E2DDD5] dark:border-stone-800">
                    {activeThread.content}
                  </div>

                  {/* 返信ポスト一覧 */}
                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-2">
                      <h3 className="text-xs tracking-widest text-gray-500 dark:text-stone-400 font-sans uppercase">
                        対話・言葉の応答 ({activeThread.posts?.length || 0}件)
                      </h3>
                      <span className="text-[11px] text-[#D4A359] font-sans">順位付けなき深層解読</span>
                    </div>

                    {activeThread.posts && activeThread.posts.length > 0 ? (
                      activeThread.posts.map((post, idx) => {
                        const postAuthorDisplayName =
                          post.author?.display_name || post.author?.username || '静かな読者'

                        return (
                          <div
                            key={post.id}
                            className="p-5 rounded-lg bg-[#F4F0E8]/40 dark:bg-[#1E2533]/80 border border-[#E2DDD5] dark:border-stone-800 space-y-3 shadow-sm hover:border-[#D4A359]/40 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs font-sans text-gray-600 dark:text-stone-300">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#1A1F2C] dark:text-stone-100">
                                  {postAuthorDisplayName}
                                </span>
                                {post.author?.role === 'admin' && (
                                  <span className="text-[10px] text-[#D4A359] border border-[#D4A359] px-1 rounded">主宰</span>
                                )}
                                {post.author?.role === 'advisor' && (
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 border border-emerald-600 px-1 rounded">特別選者</span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-gray-400 dark:text-stone-400">
                                  #{idx + 1} ・ {new Date(post.created_at).toLocaleString('ja-JP')}
                                </span>
                                {currentUser && post.author_id === currentUser.id && (
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-sans transition"
                                    title="この応答を削除"
                                  >
                                    削除
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-800 dark:text-stone-200 font-serif whitespace-pre-wrap">
                              {post.content}
                            </p>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-6 text-center bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-xs text-gray-500 dark:text-stone-400 font-sans italic space-y-1">
                        <p>まだ応答はありません。</p>
                        <p className="text-[11px] text-gray-400">静かな対話の最初の一言を添えてみましょう。</p>
                      </div>
                    )}
                  </div>

                  {/* 返信フォーム */}
                  <form onSubmit={handleSendReply} className="pt-6 border-t border-[#E2DDD5] dark:border-stone-800 space-y-4">
                    <h4 className="text-sm font-medium text-[#1A1F2C] dark:text-stone-100 font-sans">対話に応答を寄せる</h4>

                    <textarea
                      rows={4}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="言葉の意味、構造、音響への想いを誠実にお書きください..."
                      className="w-full p-4 border border-[#E2DDD5] dark:border-stone-700 rounded-lg bg-[#FBF9F5] dark:bg-[#1A1F2C] focus:bg-white dark:focus:bg-[#1E2533] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#D4A359] transition-all"
                      required
                    />

                    <div className="p-4 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="reply-ethics"
                        checked={replyEthicsAgreed}
                        onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                        className="mt-0.5 accent-[#1A1F2C] dark:accent-[#D4A359] h-4 w-4"
                        required
                      />
                      <label htmlFor="reply-ethics" className="text-xs text-gray-700 dark:text-stone-300 font-sans leading-relaxed cursor-pointer select-none">
                        <span className="font-semibold text-[#D4A359]">【倫理確認】</span>
                        この言葉は、作品の解釈を深め、他者の尊厳と良心を照らすものですか？（人格攻撃や無遠慮な否定を含まないことを確認します）
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || !replyContent.trim() || !replyEthicsAgreed}
                        className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans tracking-wider rounded transition-colors font-medium shadow-sm"
                      >
                        {isSubmitting ? '送信中...' : '対話文を送信する'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-12 text-center text-gray-500 dark:text-stone-400 font-sans text-sm">
                  左側のスレッド一覧から対話を選択してください。
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 新規スレッド作成モーダル */}
      {isNewThreadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F5] dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100">新しい問いを立てる（スレッド作成）</h3>
              <button
                onClick={() => setIsNewThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-stone-200 font-sans text-sm"
              >
                ✕ 閉じる
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">対話カテゴリ</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#1A1F2C] text-sm text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.description ? `— ${cat.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">スレッドタイトル（問い）</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="例：言葉の音響（Vāc）と論理（Logos）の調和について"
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#1A1F2C] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 dark:text-stone-300 mb-1">問いの背景・思考（本文）</label>
                <textarea
                  rows={6}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="問いを投げかける背景や、ご自身の言葉に対する考えを丁寧にお書きください..."
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#1A1F2C] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
                  required
                />
              </div>

              <div className="p-4 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="new-thread-ethics"
                  checked={newThreadEthicsAgreed}
                  onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#1A1F2C] dark:accent-[#D4A359] h-4 w-4"
                  required
                />
                <label htmlFor="new-thread-ethics" className="text-xs text-gray-700 dark:text-stone-300 leading-relaxed cursor-pointer select-none">
                  <span className="font-semibold text-[#D4A359]">【倫理確認】</span>
                  この問いは、詩と思索を深め、他者の尊厳と良心を尊重する言葉で記述されていますか？
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewThreadOpen(false)}
                  className="px-4 py-2 border border-[#E2DDD5] dark:border-stone-700 text-xs text-gray-600 dark:text-stone-300 rounded hover:bg-gray-100 dark:hover:bg-stone-800 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-wider rounded transition-colors font-medium shadow-sm"
                >
                  {isSubmitting ? '送信中...' : 'スレッドを開設する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



