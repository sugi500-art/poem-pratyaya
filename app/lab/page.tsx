'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  author_name?: string
  author_role?: 'user' | 'advisor' | 'admin'
  content: string
  created_at: string
}

export interface ForumThread {
  id: string
  category_id: string
  author_id: string
  author_name?: string
  author_role?: 'user' | 'advisor' | 'admin'
  title: string
  content: string
  posts_count: number
  last_activity_at: string
  created_at: string
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
  const [threadSubmitting, setThreadSubmitting] = useState(false)
  const [threadErrorMsg, setThreadErrorMsg] = useState<string | null>(null)

  // 返信状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyErrorMsg, setReplyErrorMsg] = useState<string | null>(null)

  // ログイン未完了ダイアログ
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    initData()
  }, [])

  async function initData() {
    try {
      setLoading(true)
      // ユーザー取得
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // カテゴリ取得
      const { data: catData, error: catError } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (catError) {
        console.error('カテゴリ取得エラー:', catError)
      } else if (catData && catData.length > 0) {
        setCategories(catData as ForumCategory[])
        setNewThreadCategory(catData[0].id)
      }

      // スレッド＆返信取得
      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .select(`
          *,
          posts:forum_posts (*)
        `)
        .order('last_activity_at', { ascending: false })

      if (threadError) {
        console.error('スレッド取得エラー:', threadError)
        setThreads([])
      } else if (threadData) {
        setThreads(threadData as ForumThread[])
        if (threadData.length > 0) {
          setActiveThreadId(threadData[0].id)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // スレッド新規作成ハンドラ
  const handleOpenNewThreadModal = () => {
    if (!currentUser) {
      setShowLoginPrompt(true)
      return
    }
    setThreadErrorMsg(null)
    setIsNewThreadOpen(true)
  }

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    setThreadErrorMsg(null)

    if (!currentUser) {
      setShowLoginPrompt(true)
      return
    }

    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      setThreadErrorMsg('タイトルと本文を入力してください。')
      return
    }

    if (!newThreadEthicsAgreed) {
      setThreadErrorMsg('倫理確認のチェックボックスをオンにしてください。')
      return
    }

    if (!newThreadCategory) {
      setThreadErrorMsg('カテゴリを選択してください。')
      return
    }

    try {
      setThreadSubmitting(true)
      const authorDisplayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || '対話の投稿者'

      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          category_id: newThreadCategory,
          author_id: currentUser.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
          posts_count: 0,
          last_activity_at: new Date().toISOString(),
        })
        .select(`
          *,
          posts:forum_posts (*)
        `)
        .single()

      if (error) throw error

      setThreads((prev) => [data as ForumThread, ...prev])
      setActiveThreadId(data.id)
      setIsNewThreadOpen(false)
      setNewThreadTitle('')
      setNewThreadContent('')
      setNewThreadEthicsAgreed(false)
    } catch (err: any) {
      setThreadErrorMsg('スレッド作成に失敗しました: ' + (err.message || '予期せぬエラー'))
    } finally {
      setThreadSubmitting(false)
    }
  }

  // 返信投稿ハンドラ
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    setReplyErrorMsg(null)

    if (!currentUser) {
      setShowLoginPrompt(true)
      return
    }

    if (!activeThreadId) return

    if (!replyContent.trim()) {
      setReplyErrorMsg('応答の本文を入力してください。')
      return
    }

    if (!replyEthicsAgreed) {
      setReplyErrorMsg('倫理確認のチェックボックスをオンにしてください。')
      return
    }

    try {
      setReplySubmitting(true)

      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: activeThreadId,
          author_id: currentUser.id,
          content: replyContent.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      // ローカルのステートを更新
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === activeThreadId) {
            const currentPosts = t.posts || []
            return {
              ...t,
              posts_count: t.posts_count + 1,
              last_activity_at: new Date().toISOString(),
              posts: [...currentPosts, data as ForumPost],
            }
          }
          return t
        })
      )

      setReplyContent('')
      setReplyEthicsAgreed(false)
    } catch (err: any) {
      setReplyErrorMsg('応答の送信に失敗しました: ' + (err.message || '予期せぬエラー'))
    } finally {
      setReplySubmitting(false)
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
            onClick={handleOpenNewThreadModal}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs tracking-wider font-sans rounded shadow-sm transition-all font-medium shrink-0"
          >
            <span>＋</span>
            <span>新しい問いを投稿する</span>
          </button>
        </div>

        {/* スレッドレイアウト */}
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500 font-sans space-y-3">
            <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>対話空間を読み込んでいます...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#242B3B] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-sm text-gray-500 dark:text-stone-400 font-sans space-y-4">
            <p className="text-base font-serif text-[#1A1F2C] dark:text-stone-200">
              該当する対話スレッドはまだありません。
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              言葉の思索や作品の解釈について、最初の問いを投げかけてみませんか。
            </p>
            <button
              onClick={handleOpenNewThreadModal}
              className="px-5 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs rounded hover:opacity-90 font-medium inline-block"
            >
              ＋ 新しい問いを立てる
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 左側：スレッド一覧 */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs tracking-widest text-gray-500 dark:text-stone-400 font-sans uppercase">
                  対話スレッド一覧
                </h2>
                <span className="text-xs text-gray-400 dark:text-stone-500 font-sans">
                  {filteredThreads.length} 件
                </span>
              </div>

              {filteredThreads.map((thread) => {
                const category = categories.find((c) => c.id === thread.category_id)
                const isActive = activeThreadId === thread.id

                return (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`p-5 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'border-[#D4A359] bg-white dark:bg-[#242B3B] shadow-md ring-1 ring-[#D4A359]/30'
                        : 'border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60 hover:bg-white dark:hover:bg-[#242B3B]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 font-sans mb-2">
                      <span className="px-2 py-0.5 bg-[#EAE4D8] dark:bg-stone-800 text-gray-800 dark:text-stone-200 rounded text-[10px] font-medium">
                        {category?.name || 'カテゴリ'}
                      </span>
                      <span className="text-[11px]">応答 {thread.posts_count || thread.posts?.length || 0}件</span>
                    </div>

                    <h3 className="text-base font-medium leading-snug text-[#1A1F2C] dark:text-stone-100 mb-2 line-clamp-2">
                      {thread.title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-3 font-serif">
                      {thread.content}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 font-sans pt-2 border-t border-gray-100 dark:border-stone-800/80">
                      <span>{new Date(thread.last_activity_at || thread.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 右側：対話詳細 */}
            <div className="lg:col-span-7">
              {activeThread ? (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 md:p-8 space-y-8 shadow-sm">
                  {/* ヘッダー */}
                  <div className="border-b border-[#E2DDD5] dark:border-stone-800 pb-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-[#F4F0E8] dark:bg-stone-800 text-[#1A1F2C] dark:text-stone-200 text-xs font-sans rounded font-medium">
                        {categories.find((c) => c.id === activeThread.category_id)?.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-stone-400 font-sans">
                        {new Date(activeThread.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>

                    <h2 className="text-xl md:text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 leading-snug">
                      {activeThread.title}
                    </h2>
                  </div>

                  {/* 本文 */}
                  <div className="text-base text-gray-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap font-serif bg-[#FBF9F5] dark:bg-[#1A1F2C] p-6 rounded-lg border border-[#E2DDD5] dark:border-stone-800">
                    {activeThread.content}
                  </div>

                  {/* 応答一覧 */}
                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-2">
                      <h3 className="text-xs tracking-widest text-gray-500 dark:text-stone-400 font-sans uppercase">
                        対話・言葉の応答 ({activeThread.posts?.length || 0}件)
                      </h3>
                    </div>

                    {activeThread.posts && activeThread.posts.length > 0 ? (
                      activeThread.posts.map((post, idx) => (
                        <div
                          key={post.id}
                          className="p-5 rounded-lg bg-[#F4F0E8]/40 dark:bg-[#1E2533]/80 border border-[#E2DDD5] dark:border-stone-800 space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs font-sans text-gray-500 dark:text-stone-400">
                            <span>#{idx + 1}</span>
                            <span>{new Date(post.created_at).toLocaleString('ja-JP')}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-800 dark:text-stone-200 font-serif whitespace-pre-wrap">
                            {post.content}
                          </p>
                        </div>
                      ))
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

                    {replyErrorMsg && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded font-sans">
                        {replyErrorMsg}
                      </div>
                    )}

                    <textarea
                      rows={4}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="言葉の意味、構造、音響への想いを誠実にお書きください..."
                      className="w-full p-4 border border-[#E2DDD5] dark:border-stone-700 rounded-lg bg-[#FBF9F5] dark:bg-[#1A1F2C] focus:bg-white dark:focus:bg-[#1E2533] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#D4A359] transition-all"
                      disabled={replySubmitting}
                    />

                    <div className="p-4 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="reply-ethics"
                        checked={replyEthicsAgreed}
                        onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                        className="mt-0.5 accent-[#1A1F2C] dark:accent-[#D4A359] h-4 w-4"
                      />
                      <label htmlFor="reply-ethics" className="text-xs text-gray-700 dark:text-stone-300 font-sans leading-relaxed cursor-pointer select-none">
                        <span className="font-semibold text-[#D4A359]">【倫理確認】</span>
                        この言葉は、解釈を深め、他者の尊厳と良心を照らすものですか？
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replySubmitting || !replyContent.trim() || !replyEthicsAgreed}
                        className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans tracking-wider rounded transition-colors font-medium shadow-sm"
                      >
                        {replySubmitting ? '送信中...' : '対話文を送信する'}
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

      {/* 新規スレッド投稿モーダル */}
      {isNewThreadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F5] dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100">新しい問いを投稿する（スレッド作成）</h3>
              <button
                onClick={() => setIsNewThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-stone-200 font-sans text-sm"
              >
                ✕ 閉じる
              </button>
            </div>

            {threadErrorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded font-sans">
                {threadErrorMsg}
              </div>
            )}

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
                  disabled={threadSubmitting || !newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-wider rounded transition-colors font-medium shadow-sm"
                >
                  {threadSubmitting ? '開設中...' : 'スレッドを開設する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 未ログインモーダル */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-sm w-full p-6 text-center space-y-5 shadow-xl font-sans">
            <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100">ログインが必要です</h3>
            <p className="text-xs text-gray-600 dark:text-stone-400 leading-relaxed">
              Pratyaya Lab で新しい問いを投稿したり応答を寄せるには、会員登録またはログインが必要です。
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 border border-[#E2DDD5] dark:border-stone-700 text-xs text-gray-600 dark:text-stone-300 rounded"
              >
                閉じる
              </button>
              <Link
                href="/auth/login"
                className="px-5 py-2 bg-[#D4A359] text-white dark:text-[#1A1F2C] text-xs font-medium rounded hover:opacity-90"
              >
                ログイン画面へ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


