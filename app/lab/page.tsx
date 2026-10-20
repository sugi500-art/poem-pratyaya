'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url?: string | null
  role: string
}

interface Category {
  id: string
  slug: string
  name: string
  description?: string
  display_order?: number
}

interface ForumThread {
  id: string
  category_id: string
  author_id: string
  title: string
  content: string
  posts_count: number
  last_activity_at: string
  created_at: string
  profiles?: Profile
  forum_categories?: Category
}

interface ForumPost {
  id: string
  thread_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: Profile
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'peer-review',
    slug: 'peer-review',
    name: '相互鑑賞・合評',
    description: '投稿作への深い解読、推敲のアドバイス、表現の技術論',
    display_order: 1,
  },
  {
    id: 'linguistics',
    slug: 'linguistics',
    name: '言語・思想研究',
    description: 'サンスクリット語・古典詩論・法哲学的問い・詩とは何か',
    display_order: 2,
  },
  {
    id: 'experimental',
    slug: 'experimental',
    name: '雑作・実験室',
    description: '詩作の試み、一節の試作、言葉の響き（音響）の実験',
    display_order: 3,
  },
  {
    id: 'tea-room',
    slug: 'tea-room',
    name: '雑談・静かな茶室',
    description: '日常の観察、読んだ詩集の感想、創作の悩み相談',
    display_order: 4,
  },
]

export default function LabPage() {
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null)
  const [activePosts, setActivePosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 新規スレッド（問い）用フォーム
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState<string>('')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)
  const [newThreadStatus, setNewThreadStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmittingThread, setIsSubmittingThread] = useState(false)

  // 新規返信（レス）用フォーム
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [replyStatus, setReplyStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  useEffect(() => {
    checkCurrentUser()
    fetchCategoriesAndThreads()
  }, [])

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function fetchCategoriesAndThreads() {
    try {
      setLoading(true)

      // カテゴリの取得
      const { data: catData } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (catData && catData.length > 0) {
        setCategories(catData)
        setNewThreadCategory(catData[0].id)
      } else {
        setNewThreadCategory(DEFAULT_CATEGORIES[0].id)
      }

      // スレッドの取得（profiles, forum_categories との結合）
      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .select(`
          *,
          profiles ( id, username, display_name, avatar_url, role ),
          forum_categories ( id, slug, name )
        `)
        .order('last_activity_at', { ascending: false })

      if (threadError) {
        console.error('スレッド取得エラー:', threadError)
      } else if (threadData) {
        const parsedThreads = threadData as unknown as ForumThread[]
        setThreads(parsedThreads)
        if (parsedThreads.length > 0) {
          setActiveThread(parsedThreads[0])
          fetchPostsForThread(parsedThreads[0].id)
        }
      }
    } catch (err) {
      console.error('フォーラムデータ取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  // 特定スレッドの返信（forum_posts）を取得
  async function fetchPostsForThread(threadId: string) {
    try {
      setLoadingPosts(true)
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          profiles ( id, username, display_name, avatar_url, role )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('返信取得エラー:', error)
      } else {
        setActivePosts((data || []) as unknown as ForumPost[])
      }
    } catch (err) {
      console.error('返信読み込みエラー:', err)
    } finally {
      setLoadingPosts(false)
    }
  }

  // スレッド選択時の切り替え
  function handleSelectThread(thread: ForumThread) {
    setActiveThread(thread)
    setReplyStatus(null)
    setReplyContent('')
    setReplyEthicsAgreed(false)
    fetchPostsForThread(thread.id)
  }

  // 新規スレッド作成ハンドラ
  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    setNewThreadStatus(null)

    if (!currentUser) {
      setNewThreadStatus({ type: 'error', text: '問いを投稿するにはログインが必要です。' })
      return
    }

    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      setNewThreadStatus({ type: 'error', text: 'タイトルと本文を入力してください。' })
      return
    }

    if (!newThreadEthicsAgreed) {
      setNewThreadStatus({ type: 'error', text: '倫理指針の確認にチェックを入れてください。' })
      return
    }

    try {
      setIsSubmittingThread(true)

      let targetCatId = newThreadCategory
      const matchedCat = categories.find((c) => c.id === targetCatId || c.slug === targetCatId)
      if (matchedCat) {
        targetCatId = matchedCat.id
      }

      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          category_id: targetCatId,
          author_id: currentUser.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
        })
        .select(`
          *,
          profiles ( id, username, display_name, avatar_url, role ),
          forum_categories ( id, slug, name )
        `)
        .single()

      if (error) throw error

      const createdThread = data as unknown as ForumThread
      setThreads((prev) => [createdThread, ...prev])
      setActiveThread(createdThread)
      setActivePosts([])
      setNewThreadTitle('')
      setNewThreadContent('')
      setNewThreadEthicsAgreed(false)
      setIsNewThreadOpen(false)
      setNewThreadStatus({ type: 'success', text: '新しい問いを投じました。' })
    } catch (err: any) {
      console.error('スレッド作成エラー:', err)
      setNewThreadStatus({ type: 'error', text: err.message || '投稿に失敗しました。' })
    } finally {
      setIsSubmittingThread(false)
    }
  }

  // スレッドへの返信作成ハンドラ
  async function handleCreateReply(e: React.FormEvent) {
    e.preventDefault()
    setReplyStatus(null)

    if (!activeThread) return

    if (!currentUser) {
      setReplyStatus({ type: 'error', text: '返信するにはログインが必要です。' })
      return
    }

    if (!replyContent.trim()) {
      setReplyStatus({ type: 'error', text: '返信本文を入力してください。' })
      return
    }

    if (!replyEthicsAgreed) {
      setReplyStatus({ type: 'error', text: '倫理指針の確認にチェックを入れてください。' })
      return
    }

    try {
      setIsSubmittingReply(true)

      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: activeThread.id,
          author_id: currentUser.id,
          content: replyContent.trim(),
        })
        .select(`
          *,
          profiles ( id, username, display_name, avatar_url, role )
        `)
        .single()

      if (error) throw error

      const newPost = data as unknown as ForumPost
      setActivePosts((prev) => [...prev, newPost])

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? { ...t, posts_count: (t.posts_count || 0) + 1, last_activity_at: new Date().toISOString() }
            : t
        )
      )

      setReplyContent('')
      setReplyEthicsAgreed(false)
      setReplyStatus({ type: 'success', text: '返信を投稿しました。' })
    } catch (err: any) {
      console.error('返信作成エラー:', err)
      setReplyStatus({ type: 'error', text: err.message || '返信の送信に失敗しました。' })
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const filteredThreads =
    selectedCategory === 'all'
      ? threads
      : threads.filter(
          (t) =>
            t.category_id === selectedCategory ||
            t.forum_categories?.id === selectedCategory ||
            t.forum_categories?.slug === selectedCategory
        )

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased pb-20">
      {/* ページヘッダー */}
      <header className="border-b border-[#E2DDD5] bg-[#F4F0E8] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.2em] text-[#D4A359] uppercase font-sans font-medium">
              Pratyaya Lab / 言語・思想対話空間
            </p>
            <h1 className="text-2xl md:text-3xl font-normal tracking-wide text-[#1A1F2C]">
              Pratyaya Lab（対話の空地）
            </h1>
            <p className="text-xs text-stone-600 font-sans max-w-xl leading-relaxed">
              言葉を縁（pratyaya）として持ちより、思考と推敲を深める4つの部屋（空間）です。
            </p>
          </div>
          <Link href="/" className="text-xs font-sans text-stone-500 hover:text-[#1A1F2C] transition shrink-0">
            ← トップへ戻る
          </Link>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* 4つの部屋（カテゴリタブ）＆ 新しい問い投稿ボタン */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2DDD5] pb-6">
          
          {/* カテゴリタブ */}
          <div className="flex flex-wrap gap-2 font-sans text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#1A1F2C] text-[#FBF9F5] font-medium'
                  : 'bg-[#F4F0E8] text-stone-700 hover:bg-[#EAE4D8]'
              }`}
            >
              すべての部屋 ({threads.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#1A1F2C] text-[#FBF9F5] font-medium'
                    : 'bg-[#F4F0E8] text-stone-700 hover:bg-[#EAE4D8]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 新規問い投稿ボタン */}
          <button
            onClick={() => setIsNewThreadOpen(!isNewThreadOpen)}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white text-xs tracking-wider font-sans rounded shadow-sm transition-colors shrink-0"
          >
            {isNewThreadOpen ? 'フォームをたたむ' : '＋ 新しい問いを投稿する'}
          </button>
        </div>

        {/* 新規スレッド投稿フォーム（折りたたみ） */}
        {isNewThreadOpen && (
          <section className="bg-white border border-[#E2DDD5] rounded-lg p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-stone-200 pb-3">
              <h2 className="text-base font-normal text-[#1A1F2C]">
                新しい問い（スレッド）を立てる
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-1">
                対話を行う部屋（カテゴリ）を選び、問いかけを記してください。
              </p>
            </div>

            {newThreadStatus && (
              <div
                className={`p-4 rounded text-xs font-sans leading-relaxed ${
                  newThreadStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {newThreadStatus.text}
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs text-stone-600 mb-1">部屋（カテゴリ）の選択</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DDD5] rounded text-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — {cat.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1">問いの題名（タイトル）</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="例：言葉の「行間」と推敲における間の取り方について"
                  className="w-full p-2.5 border border-[#E2DDD5] rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C]"
                  disabled={isSubmittingThread}
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1">問いの本文</label>
                <textarea
                  rows={4}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="対話の背景や具体的な問題提起を記してください..."
                  className="w-full p-2.5 border border-[#E2DDD5] rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C] resize-y"
                  disabled={isSubmittingThread}
                />
              </div>

              <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded text-xs font-serif">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newThreadEthicsAgreed}
                    onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-[#1A1F2C] focus:ring-[#D4A359]"
                  />
                  <span className="text-stone-700 leading-relaxed font-serif">
                    ※ 人格攻撃を排し、言葉そのものや構造に対して誠実に対話します。
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingThread || !newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-6 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-wider rounded hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {isSubmittingThread ? '送信中...' : '問いを投稿する'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* スレッドレイアウト（2カラム：左リスト / 右詳細対話） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左カラム：スレッド一覧 */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs tracking-widest text-stone-500 font-sans uppercase mb-2">
              問いの一覧 ({filteredThreads.length}件)
            </h2>

            {loading ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD5] rounded text-xs font-sans text-stone-400">
                対話を読み込んでいます...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD5] rounded text-xs font-sans text-stone-500">
                この部屋にはまだ問いがありません。「新しい問いを投稿する」から対話を始めてみましょう。
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = activeThread?.id === thread.id
                const authorName =
                  thread.profiles?.display_name || thread.profiles?.username || '無名の表現者'
                const isMyThread = currentUser && thread.author_id === currentUser.id
                const catName = thread.forum_categories?.name || '部屋'

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-5 rounded-lg border cursor-pointer transition-all space-y-2 ${
                      isActive
                        ? 'border-[#D4A359] bg-white shadow-md'
                        : 'border-[#E2DDD5] bg-white/70 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-sans text-stone-500">
                      <span className="px-2 py-0.5 bg-[#EAE4D8] text-stone-800 rounded text-[10px]">
                        {catName}
                      </span>
                      <span>返信 {thread.posts_count || 0}件</span>
                    </div>

                    <h3 className="text-base font-normal leading-snug text-[#1A1F2C] line-clamp-2">
                      {thread.title}
                    </h3>

                    <p className="text-xs text-stone-600 line-clamp-2 font-serif leading-relaxed">
                      {thread.content}
                    </p>

                    <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-[11px] font-sans text-stone-400">
                      <span>
                        {authorName}
                        {isMyThread && <span className="text-stone-400 font-normal">（あなた）</span>}
                      </span>
                      <span>{new Date(thread.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 右カラム：アクティブスレッドの本文＆対話レス表示 */}
          <div className="lg:col-span-7 space-y-6">
            {activeThread ? (
              <div className="space-y-6">
                
                {/* スレッド本文カード */}
                <div className="bg-white border border-[#E2DDD5] rounded-lg p-6 md:p-8 space-y-4 shadow-sm">
                  <div className="border-b border-stone-100 pb-3 flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-sans px-2 py-0.5 bg-[#EAE4D8] text-stone-800 rounded mb-2 inline-block">
                        {activeThread.forum_categories?.name || '対話空間'}
                      </span>
                      <h2 className="text-xl font-normal text-[#1A1F2C]">
                        {activeThread.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm text-stone-800 font-serif whitespace-pre-wrap leading-relaxed py-2">
                    {activeThread.content}
                  </p>

                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs font-sans text-stone-500">
                    <div className="font-serif">
                      問いかけた人：
                      <span className="font-medium text-[#1A1F2C]">
                        {activeThread.profiles?.display_name || activeThread.profiles?.username || '無名の表現者'}
                      </span>
                      {currentUser && activeThread.author_id === currentUser.id && (
                        <span className="ml-1 text-[11px] text-stone-400 font-sans">（あなた）</span>
                      )}
                    </div>
                    <span>{new Date(activeThread.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                {/* 返信・応答一覧 */}
                <div className="space-y-4">
                  <h3 className="text-xs font-sans tracking-widest text-stone-500 uppercase">
                    寄せられた対話・応答 ({activePosts.length}件)
                  </h3>

                  {loadingPosts ? (
                    <div className="p-6 text-center text-xs font-sans text-stone-400 bg-white border border-[#E2DDD5] rounded">
                      応答を読み込んでいます...
                    </div>
                  ) : activePosts.length === 0 ? (
                    <div className="p-6 text-center text-xs font-sans text-stone-500 bg-white border border-[#E2DDD5] rounded">
                      まだこの問いへの応答はありません。最初の言葉を届けてみませんか。
                    </div>
                  ) : (
                    activePosts.map((post) => {
                      const postAuthorName =
                        post.profiles?.display_name || post.profiles?.username || '無名の表現者'
                      const isMyPost = currentUser && post.author_id === currentUser.id

                      return (
                        <div
                          key={post.id}
                          className="bg-white border border-[#E2DDD5] rounded-lg p-5 space-y-3 shadow-sm"
                        >
                          <div className="flex justify-between items-center text-xs font-sans text-stone-500">
                            <span className="font-serif font-medium text-[#1A1F2C]">
                              {postAuthorName}
                              {isMyPost && (
                                <span className="ml-1 text-[11px] text-stone-400 font-sans font-normal">
                                  （あなた）
                                </span>
                              )}
                              {post.profiles?.role === 'advisor' && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] rounded font-sans font-normal">
                                  特別選者
                                </span>
                              )}
                            </span>
                            <span>{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                          </div>

                          <p className="text-sm text-stone-800 font-serif whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 返信フォーム */}
                <div className="bg-white border border-[#E2DDD5] rounded-lg p-6 space-y-4 shadow-sm">
                  <h3 className="text-xs font-sans tracking-widest text-stone-600 uppercase border-b border-stone-100 pb-2">
                    この問いに応答（返信）する
                  </h3>

                  {replyStatus && (
                    <div
                      className={`p-3 rounded text-xs font-sans leading-relaxed ${
                        replyStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {replyStatus.text}
                    </div>
                  )}

                  <form onSubmit={handleCreateReply} className="space-y-4 font-sans">
                    <textarea
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="問いに対する自らの思考や応答を記してください..."
                      className="w-full p-3 border border-[#E2DDD5] rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C] resize-y"
                      disabled={isSubmittingReply}
                    />

                    <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded text-xs font-serif">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={replyEthicsAgreed}
                          onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                          className="mt-0.5 rounded border-stone-300 text-[#1A1F2C] focus:ring-[#D4A359]"
                        />
                        <span className="text-stone-700 leading-relaxed font-serif">
                          ※ 他者の尊厳を傷つけず、言葉の真理と良心を照らす応答を心がけます。
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingReply || !replyContent.trim() || !replyEthicsAgreed}
                        className="px-5 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-wider rounded hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                      >
                        {isSubmittingReply ? '送信中...' : '応答を送信する'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center bg-white border border-[#E2DDD5] rounded-lg text-xs font-sans text-stone-500">
                左側のリストから問いを選択してください。
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}