'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string
  display_order: number
}

export interface ForumPost {
  id: string
  thread_id: string
  author_id: string
  author_name: string
  author_role: 'user' | 'advisor' | 'admin'
  content: string
  created_at: string
}

export interface ForumThread {
  id: string
  category_id: string
  author_id: string
  author_name: string
  author_role: 'user' | 'advisor' | 'admin'
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

  // 返信状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    fetchCategoriesAndThreads()
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  // Supabase からカテゴリおよびスレッドを取得（サンプルデータは完全排除）
  async function fetchCategoriesAndThreads() {
    try {
      setLoading(true)
      
      // 1. カテゴリ一覧の取得
      const { data: catData } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (catData && catData.length > 0) {
        setCategories(catData as ForumCategory[])
        setNewThreadCategory(catData[0].id)
      }

      // 2. スレッド一覧の取得
      const { data: threadData, error } = await supabase
        .from('forum_threads')
        .select(`
          *,
          posts:forum_posts (*)
        `)
        .order('last_activity_at', { ascending: false })

      if (error) {
        console.error('スレッド取得エラー:', error)
        setThreads([])
      } else if (threadData) {
        setThreads(threadData as ForumThread[])
        if (threadData.length > 0) {
          setActiveThreadId(threadData[0].id)
        } else {
          setActiveThreadId(null)
        }
      }
    } catch (err) {
      console.error(err)
      setThreads([])
    } fontally {
      setLoading(false)
    }
  }

  // 新規スレッド作成（Supabaseに保存）
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          category_id: newThreadCategory || (categories[0]?.id ?? null),
          author_id: currentUser.id,
          author_name: currentUser.user_metadata?.display_name || '匿名',
          author_role: 'user',
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
          posts_count: 0,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setIsNewThreadOpen(false)
      setNewThreadTitle('')
      setNewThreadContent('')
      setNewThreadEthicsAgreed(false)
      fetchCategoriesAndThreads()
    } catch (err: any) {
      alert('スレッドの作成に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 返信投稿（Supabaseに保存）
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeThreadId || !replyContent.trim() || !replyEthicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: activeThreadId,
          author_id: currentUser.id,
          author_name: currentUser.user_metadata?.display_name || '匿名',
          author_role: 'user',
          content: replyContent.trim(),
        })

      if (error) throw error

      setReplyContent('')
      setReplyEthicsAgreed(false)
      fetchCategoriesAndThreads()
    } catch (err: any) {
      alert('応答の送信に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // スレッド削除ハンドラ（投稿者本人の場合）
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('このスレッドを消去しますか？')) return
    try {
      const { error } = await supabase.from('forum_threads').delete().eq('id', threadId)
      if (error) throw error
      fetchCategoriesAndThreads()
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  if (!hasMounted) return null

  const filteredThreads = selectedCategoryId === 'all'
    ? threads
    : threads.filter((t) => t.category_id === selectedCategoryId)

  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased pb-20">
      {/* ページヘッダー */}
      <header className="border-b border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8] dark:bg-[#121621] py-10 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <p className="text-xs tracking-[0.2em] text-[#D4A359] uppercase font-sans">
            Pratyaya Lab / 言語・思想対話空間
          </p>
          <h1 className="text-3xl md:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            Pratyaya Lab（対話の空地）
          </h1>
          <p className="max-w-2xl mx-auto text-sm leading-relaxed text-gray-600 dark:text-stone-400 font-sans">
            詩を縁（pratyaya）として持ちより、言葉の解釈と知の構造化を深める静寂な対話空間です。
          </p>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                  : 'bg-[#F4F0E8] dark:bg-stone-800 text-gray-700 dark:text-stone-300'
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
                      ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                      : 'bg-[#F4F0E8] dark:bg-stone-800 text-gray-700 dark:text-stone-300'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>

          {currentUser && (
            <button
              onClick={() => setIsNewThreadOpen(true)}
              className="px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs font-sans rounded font-medium shadow-sm transition"
            >
              ＋ 新しい問いを投稿する
            </button>
          )}
        </div>

        {/* スレッド一覧 ＆ 詳細表示 */}
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500 dark:text-stone-400 font-sans">
            言葉の空地を読み込んでいます...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-[#242B3B] rounded-xl border border-[#E2DDD5] dark:border-stone-800 text-sm text-gray-500 dark:text-stone-400 font-sans space-y-3">
            <p className="text-base font-serif text-[#1A1F2C] dark:text-stone-200">まだ対話のスレッドはありません。</p>
            <p className="text-xs text-gray-400 dark:text-stone-500">最初の問いを立てて、静かなる対話の場を開いてみませんか。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 左側：スレッド一覧 */}
            <div className="lg:col-span-5 space-y-4">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`p-5 rounded-lg border cursor-pointer transition-all ${
                    activeThreadId === thread.id
                      ? 'border-[#D4A359] bg-white dark:bg-[#242B3B] shadow-md'
                      : 'border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60 hover:border-stone-300'
                  }`}
                >
                  <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 mb-2 leading-snug">{thread.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 font-sans pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span>投稿者: {thread.author_name}</span>
                    <span>{new Date(thread.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 右側：対話詳細 */}
            <div className="lg:col-span-7">
              {activeThread && (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex items-start justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
                    <h2 className="text-xl font-normal text-[#1A1F2C] dark:text-stone-100 leading-snug">{activeThread.title}</h2>
                    {currentUser && currentUser.id === activeThread.author_id && (
                      <button
                        onClick={() => handleDeleteThread(activeThread.id)}
                        className="text-xs text-rose-600 hover:underline shrink-0 font-sans"
                      >
                        消去
                      </button>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif bg-[#FBF9F5] dark:bg-[#1A1F2C] p-5 rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-[#1A1F2C] dark:text-stone-100">
                    {activeThread.content}
                  </p>

                  {/* 返信一覧 */}
                  <div className="space-y-4 pt-4 border-t border-[#E2DDD5] dark:border-stone-800">
                    <h3 className="text-xs font-sans uppercase text-gray-500 dark:text-stone-400 tracking-wider">
                      対話・応答 ({activeThread.posts?.length || 0}件)
                    </h3>
                    {activeThread.posts?.map((post) => (
                      <div key={post.id} className="p-4 bg-[#F4F0E8]/40 dark:bg-[#1E2533] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-sm space-y-2">
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-stone-400 font-sans">
                          <span className="font-medium text-[#1A1F2C] dark:text-stone-200">{post.author_name}</span>
                          <span>{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                        <p className="whitespace-pre-wrap font-serif text-stone-800 dark:text-stone-200 leading-relaxed">{post.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* 返信フォーム */}
                  {currentUser ? (
                    <form onSubmit={handleSendReply} className="pt-4 border-t border-[#E2DDD5] dark:border-stone-800 space-y-4 font-sans">
                      <textarea
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="この問いへの言葉の応答を記してください..."
                        className="w-full bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-700 rounded-lg p-3 text-xs text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:border-[#D4A359]"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 text-gray-600 dark:text-stone-300">
                          <input
                            type="checkbox"
                            checked={replyEthicsAgreed}
                            onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                            className="accent-[#D4A359]"
                          />
                          <span>相手の尊厳を尊重する言葉ですか？</span>
                        </label>
                        <button
                          type="submit"
                          disabled={isSubmitting || !replyContent.trim() || !replyEthicsAgreed}
                          className="px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-medium rounded hover:opacity-90 disabled:opacity-40"
                        >
                          {isSubmitting ? '送信中...' : '応答を投稿'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-gray-500 text-center font-sans pt-2">応答を投稿するにはログインが必要です。</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 新規スレッド作成モーダル */}
        {isNewThreadOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-lg w-full p-6 space-y-6 font-serif shadow-xl">
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-3">
                <h2 className="text-base font-normal text-[#1A1F2C] dark:text-stone-100">新しい問いを立てる（スレッド作成）</h2>
                <button onClick={() => setIsNewThreadOpen(false)} className="text-stone-400 hover:text-stone-600 font-sans text-sm">✕</button>
              </div>

              <form onSubmit={handleCreateThread} className="space-y-4 font-sans text-xs">
                <div>
                  <label className="block text-gray-600 dark:text-stone-300 mb-1">カテゴリ</label>
                  <select
                    value={newThreadCategory}
                    onChange={(e) => setNewThreadCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-700 rounded text-[#1A1F2C] dark:text-stone-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-stone-300 mb-1">タイトル（問いのテーマ）</label>
                  <input
                    type="text"
                    required
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    placeholder="例：言葉における沈黙と改行の機能について"
                    className="w-full p-2.5 bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-700 rounded text-[#1A1F2C] dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-stone-300 mb-1">内容（問いの詳細）</label>
                  <textarea
                    rows={4}
                    required
                    value={newThreadContent}
                    onChange={(e) => setNewThreadContent(e.target.value)}
                    placeholder="思索や対話の契機となる問いを書いてください..."
                    className="w-full p-2.5 bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-700 rounded text-[#1A1F2C] dark:text-stone-100 font-serif"
                  />
                </div>

                <div className="p-3 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded border border-[#E2DDD5] dark:border-stone-800">
                  <label className="flex items-start gap-2 text-gray-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newThreadEthicsAgreed}
                      onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                      className="mt-0.5 accent-[#D4A359]"
                    />
                    <span>【倫理確認】他者を傷つけるためではなく、言葉と構造を共有・深めるための問いですか？</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewThreadOpen(false)}
                    className="px-4 py-2 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                    className="px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium disabled:opacity-40"
                  >
                    {isSubmitting ? '投稿中...' : '問いを立てる'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

