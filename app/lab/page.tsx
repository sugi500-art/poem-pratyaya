'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  author_name?: string
  author_role?: 'user' | 'advisor' | 'admin'
  content: string
  is_edited?: boolean
  created_at: string
  updated_at?: string
  author?: {
    display_name: string | null
    username: string | null
    role: 'user' | 'advisor' | 'admin'
  }
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
  updated_at?: string
  author?: {
    display_name: string | null
    username: string | null
    role: 'user' | 'advisor' | 'admin'
  }
  posts?: ForumPost[]
}

const DEFAULT_CATEGORIES: ForumCategory[] = [
  {
    id: 'official-announcement',
    slug: 'official-announcement',
    name: '公式案内・主宰より（Announcements）',
    description: '主宰者・運営からの公式なお知らせ、規約や機能の更新、聖域からの便り。',
    display_order: 0,
  },
  {
    id: 'peer-review',
    slug: 'peer-review',
    name: '相互鑑賞・合評（Pratyaya Lab）',
    description: '作品の一音・一節の響き、技術論、推敲のための静かな合評空間。',
    display_order: 1,
  },
  {
    id: 'linguistics',
    slug: 'linguistics',
    name: '言語・思想研究（Vāc & Logos）',
    description: '言葉の構造、認識論、サンスクリット語・古典詩論・法哲学の探求。',
    display_order: 2,
  },
  {
    id: 'arts-resonance',
    slug: 'arts-resonance',
    name: '書評・映画・音楽評（Arts & Resonances）',
    description: '他者の表現（本・映画・音楽）に触れて立ち現れた心の響き、言葉の構造や余韻について静かに語り合う部屋。消費的なレビューではなく、作品への敬意を込めた対話の場です。',
    display_order: 3,
  },
  {
    id: 'experimental',
    slug: 'experimental',
    name: '雑作・実験室（Experimental Lab）',
    description: '断片的なフレーズ、音響実験、試作段階の言葉の書き付け。',
    display_order: 4,
  },
  {
    id: 'tea-room',
    slug: 'tea-room',
    name: '雑談・静かな茶室（Tea Room）',
    description: '日常の観察、創作に伴う思索、季節の移ろいや読書体験の共有。',
    display_order: 5,
  },
]

export default function ForumLabClient() {
  const [hasMounted, setHasMounted] = useState(false)
  const [categories, setCategories] = useState<ForumCategory[]>(DEFAULT_CATEGORIES)
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  // ユーザー状態
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  // 新規スレッドモーダル
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState('')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)

  // スレッド編集状態
  const [isEditingThread, setIsEditingThread] = useState(false)
  const [editThreadTitle, setEditThreadTitle] = useState('')
  const [editThreadContent, setEditThreadContent] = useState('')
  const [isSavingThread, setIsSavingThread] = useState(false)

  // 投稿（返信）編集状態
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editPostContent, setEditPostContent] = useState('')
  const [isSavingPost, setIsSavingPost] = useState(false)

  // 新規返信
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // URLコピー状態
  const [copiedThreadId, setCopiedThreadId] = useState<string | null>(null)

  // スマホ用表示切替
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    loadInitialData()
  }, [hasMounted])

  async function loadInitialData() {
    try {
      setLoading(true)
      setError(null)

      // 1. ユーザー情報・プロフィールの取得
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setUserProfile(profile)
      }

      // 2. カテゴリの取得
      const { data: catData } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (catData && catData.length > 0) {
        setCategories(catData as ForumCategory[])
        setNewThreadCategory(catData[0].id)
      } else if (DEFAULT_CATEGORIES.length > 0) {
        setNewThreadCategory(DEFAULT_CATEGORIES[0].id)
      }

      // 3. スレッドと投稿のリアルデータ取得
      await fetchThreads()

      // 4. URLパラメータ（例: /lab?category=official-announcement）の反映
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        const catQuery = searchParams.get('category')
        if (catQuery) {
          const list = catData && catData.length > 0 ? (catData as ForumCategory[]) : DEFAULT_CATEGORIES
          const matched = list.find((c) => c.slug === catQuery || c.id === catQuery)
          if (matched) {
            setSelectedCategoryId(matched.id)
          }
        }
      }

    } catch (err: any) {
      console.error('フォーラム初期データ取得エラー:', err)
      setError('データの読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // Supabase からスレッド＆投稿を同期取得
  async function fetchThreads() {
    try {
      const { data: threadsData, error: threadsError } = await supabase
        .from('forum_threads')
        .select(`
          *,
          author:profiles!author_id ( display_name, username, role ),
          posts:forum_posts (
            *,
            author:profiles!author_id ( display_name, username, role )
          )
        `)
        .order('last_activity_at', { ascending: false })

      if (threadsError) {
        console.error('スレッド取得エラー:', threadsError)
        setError('スレッドの読み込み中にエラーが発生しました。')
        setThreads([])
      } else if (threadsData) {
        setThreads(threadsData as unknown as ForumThread[])
        if (threadsData.length > 0 && !activeThreadId) {
          setActiveThreadId(threadsData[0].id)
        }
      }
    } catch (err: any) {
      console.error('スレッド取得例外:', err)
    }
  }

  // 新規スレッドの作成 (Supabase)
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      const targetCategoryId = newThreadCategory || categories[0]?.id

      const { data, error: insertError } = await supabase
        .from('forum_threads')
        .insert({
          category_id: targetCategoryId,
          author_id: currentUser.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      setIsNewThreadOpen(false)
      setNewThreadTitle('')
      setNewThreadContent('')
      setNewThreadEthicsAgreed(false)

      await fetchThreads()
      if (data) {
        setActiveThreadId(data.id)
        setMobileView('detail')
      }
    } catch (err: any) {
      alert('スレッドの投稿に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // スレッド更新（推敲・編集）
  const handleUpdateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeThread || !editThreadTitle.trim() || !editThreadContent.trim() || !currentUser) return

    try {
      setIsSavingThread(true)
      const nowIso = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('forum_threads')
        .update({
          title: editThreadTitle.trim(),
          content: editThreadContent.trim(),
          updated_at: nowIso,
        })
        .eq('id', activeThread.id)
        .eq('author_id', currentUser.id)

      if (updateError) throw updateError

      setIsEditingThread(false)
      await fetchThreads()
    } catch (err: any) {
      alert('スレッドの更新に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSavingThread(false)
    }
  }

  // 返信・応答の送信 (Supabase)
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeThreadId || !replyContent.trim() || !replyEthicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      const { error: insertError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: activeThreadId,
          author_id: currentUser.id,
          content: replyContent.trim(),
        })

      if (insertError) throw insertError

      setReplyContent('')
      setReplyEthicsAgreed(false)
      await fetchThreads()
    } catch (err: any) {
      alert('応答の送信に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 返信・応答の更新（推敲・編集）
  const handleUpdatePost = async (postId: string) => {
    if (!editPostContent.trim() || !currentUser) return

    try {
      setIsSavingPost(true)
      const nowIso = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({
          content: editPostContent.trim(),
          is_edited: true,
          updated_at: nowIso,
        })
        .eq('id', postId)
        .eq('author_id', currentUser.id)

      if (updateError) throw updateError

      setEditingPostId(null)
      setEditPostContent('')
      await fetchThreads()
    } catch (err: any) {
      alert('応答の更新に失敗しました: ' + (err.message || 'エラーが発生しました'))
    } finally {
      setIsSavingPost(false)
    }
  }

  // トピックURLのコピー処理
  const handleCopyThreadUrl = (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    const url = `${origin}/lab/${threadId}`
    navigator.clipboard.writeText(url)
    setCopiedThreadId(threadId)
    setTimeout(() => setCopiedThreadId(null), 2500)
  }

  // スレッド削除 (Supabase)
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('この対話スレッドを削除しますか？返信応答もすべて削除されます。')) return

    try {
      const { error: deleteError } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId)

      if (deleteError) throw deleteError

      if (activeThreadId === threadId) {
        setActiveThreadId(null)
      }
      await fetchThreads()
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  // 返信投稿の削除 (Supabase)
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この応答を削除しますか？')) return

    try {
      const { error: deleteError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)

      if (deleteError) throw deleteError

      await fetchThreads()
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  if (!hasMounted) return null

  const filteredThreads = selectedCategoryId === 'all'
    ? threads
    : threads.filter((t) => t.category_id === selectedCategoryId)

  const activeThread = threads.find((t) => t.id === activeThreadId)

  // 選択中カテゴリの情報
  const currentCategoryObj = categories.find((c) => c.id === selectedCategoryId)

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased pb-20 selection:bg-[#D4A359]/20">
      
      {/* ページヘッダー：引き算の洗練されたコンパクトデザイン */}
      <header className="border-b border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8] dark:bg-[#121621] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
              <span>🕯️</span>
              <span>Pratyaya Lab / 対話と深層批判の空地</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
              Pratyaya Lab（フォーラム）
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-sans max-w-xl">
              詩論・表現論・書評・映画・音楽の余韻。他者の尊厳と良心を照らし、響き合う対話の部屋です。
            </p>
          </div>

          <Link
            href="/terms"
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-[#D4A359] font-sans transition flex items-center gap-1 shrink-0"
          >
            <span>対話指針・利用規約を読む</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        
        {/* カテゴリフィルター ＆ スレッド作成ボタン */}
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
                  title={cat.description}
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

          {currentUser ? (
            <button
              onClick={() => setIsNewThreadOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs tracking-wider font-sans rounded shadow-sm transition-all font-medium shrink-0"
            >
              <span>＋</span>
              <span>新しい問いを立てる（スレッド作成）</span>
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-sans rounded hover:opacity-90 transition shrink-0"
            >
              ログインして問いを立てる
            </Link>
          )}
        </div>

        {/* 選択中カテゴリの案内バナー */}
        {currentCategoryObj && selectedCategoryId !== 'all' && (
          <div className="mb-6 p-4 bg-[#F4F0E8]/70 dark:bg-[#242B3B]/50 border border-[#E2DDD5] dark:border-stone-800 rounded-lg text-xs font-sans text-stone-600 dark:text-stone-300 leading-relaxed flex items-start gap-2.5">
            <span className="text-[#D4A359] text-base leading-none">🕯️</span>
            <div>
              <strong className="text-stone-800 dark:text-stone-100 font-medium mr-2">【{currentCategoryObj.name}】</strong>
              <span>{currentCategoryObj.description}</span>
            </div>
          </div>
        )}

        {/* モバイル表示切り替えタブ (スマホ画面のみ) */}
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

        {/* スレッドレイアウト（2カラム：左リスト、右詳細） */}
        {loading ? (
          <div className="text-center py-20 text-xs font-sans text-stone-400">
            対話データを静かに読み込んでいます...
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 p-6 text-center rounded text-xs text-rose-700 dark:text-rose-300 font-sans border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 左側：スレッド一覧 (5/12) */}
            <div className={`lg:col-span-5 space-y-4 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs tracking-widest text-stone-500 dark:text-stone-400 font-sans uppercase">
                  対話スレッド一覧
                </h2>
                <span className="text-xs text-stone-400 dark:text-stone-500 font-sans">
                  {filteredThreads.length} 件表示中
                </span>
              </div>

              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center bg-[#F4F0E8] dark:bg-[#242B3B] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 font-sans space-y-3">
                  <p>該当するカテゴリのスレッドはまだ投稿されていません。</p>
                  {currentUser && (
                    <button
                      onClick={() => setIsNewThreadOpen(true)}
                      className="text-xs text-[#D4A359] hover:underline font-medium"
                    >
                      最初の問いを立ててみませんか？
                    </button>
                  )}
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const category = categories.find((c) => c.id === thread.category_id)
                  const isActive = activeThreadId === thread.id
                  const authorName = thread.author?.display_name || thread.author?.username || thread.author_name || '無名の投稿者'
                  const isThreadEdited = thread.updated_at && thread.updated_at !== thread.created_at

                  return (
                    <div
                      key={thread.id}
                      onClick={() => {
                        setActiveThreadId(thread.id)
                        setIsEditingThread(false)
                        setMobileView('detail')
                      }}
                      className={`p-5 rounded-lg border transition-all cursor-pointer space-y-3 ${
                        isActive
                          ? 'border-[#D4A359] bg-[#242B3B] dark:bg-[#242B3B] text-stone-100 shadow-md ring-1 ring-[#D4A359]/30'
                          : 'border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60 hover:border-stone-400 dark:hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-sans text-stone-400">
                        {category?.slug === 'official-announcement' || category?.id === 'official-announcement' ? (
                          <span className="px-2 py-0.5 bg-[#D4A359]/25 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/40 rounded font-medium flex items-center gap-1">
                            <span>🕯️</span>
                            <span>公式案内</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#D4A359]/15 text-[#D4A359] rounded font-medium">
                            {category?.name || '対話'}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span>{new Date(thread.last_activity_at).toLocaleDateString('ja-JP')}</span>
                          {isThreadEdited && (
                            <span className="text-[10px] opacity-75">（編集済）</span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 leading-snug line-clamp-2">
                        {thread.title}
                      </h3>

                      <p className="text-xs text-stone-600 dark:text-stone-300 font-serif line-clamp-2 leading-relaxed">
                        {thread.content}
                      </p>

                      <div className="pt-2 flex justify-between items-center text-[11px] font-sans text-stone-400 border-t border-stone-200/60 dark:border-stone-800">
                        <span>投稿者: {authorName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#D4A359] font-medium">
                            応答 {thread.posts?.length || thread.posts_count || 0} 件
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleCopyThreadUrl(thread.id, e)}
                              className="text-stone-400 hover:text-[#D4A359] transition flex items-center gap-0.5 text-[10px]"
                              title="トピックURLをコピー"
                            >
                              <span>{copiedThreadId === thread.id ? "✓" : "🔗"}</span>
                              <span>{copiedThreadId === thread.id ? "コピー済" : "URLコピー"}</span>
                            </button>
                            <span className="text-stone-300 dark:text-stone-700">|</span>
                            <Link
                              href={`/lab/${thread.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-stone-400 hover:text-[#D4A359] transition flex items-center gap-0.5"
                              title="このトピックの個別ページを開く"
                            >
                              <span>個別 ↗</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* 右側：対話詳細 (7/12) */}
            <div className={`lg:col-span-7 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
              {activeThread ? (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 sm:p-8 space-y-8 shadow-sm">
                  
                  {/* スレッドヘッダー */}
                  <div className="space-y-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6">
                    <div className="flex items-center justify-between text-xs font-sans text-stone-400">
                      <div className="flex items-center gap-2">
                        {categories.find((c) => c.id === activeThread.category_id)?.slug === 'official-announcement' ? (
                          <span className="px-2.5 py-0.5 bg-[#D4A359]/25 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/40 rounded font-medium flex items-center gap-1 font-sans">
                            <span>🕯️</span>
                            <span>公式案内・主宰より</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#D4A359]/20 text-[#D4A359] rounded font-medium">
                            {categories.find((c) => c.id === activeThread.category_id)?.name || '対話'}
                          </span>
                        )}
                        <Link href={`/authors/${activeThread.author_id}`} className="hover:text-[#D4A359] transition font-medium text-stone-700 dark:text-stone-300">
                          {activeThread.author?.display_name || activeThread.author?.username || activeThread.author_name || '無名'}
                        </Link>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span>{new Date(activeThread.created_at).toLocaleDateString('ja-JP')}</span>
                          {activeThread.updated_at && activeThread.updated_at !== activeThread.created_at && (
                            <span className="text-[10px] text-stone-400">（推敲・編集済み）</span>
                          )}
                          <span className="text-stone-300 dark:text-stone-700">|</span>
                          <button
                            onClick={() => handleCopyThreadUrl(activeThread.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1E2533] border border-[#E2DDD5] dark:border-stone-700 rounded text-[11px] font-sans text-stone-700 dark:text-stone-300 hover:border-[#D4A359] hover:text-[#D4A359] transition shadow-2xs font-medium"
                            title="この対話の共有URLをコピー"
                          >
                            <span>{copiedThreadId === activeThread.id ? "✓" : "🔗"}</span>
                            <span>{copiedThreadId === activeThread.id ? "コピー完了！" : "URLコピー"}</span>
                          </button>
                          <Link
                            href={`/lab/${activeThread.id}`}
                            className="text-stone-400 hover:text-[#D4A359] transition flex items-center gap-0.5 font-medium text-[11px]"
                            title="この対話の個別ページを開く"
                          >
                            <span>個別 ↗</span>
                          </Link>
                        </div>

                        {currentUser && activeThread.author_id === currentUser.id && (
                          <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-700">
                            <button
                              onClick={() => {
                                setIsEditingThread(true)
                                setEditThreadTitle(activeThread.title)
                                setEditThreadContent(activeThread.content)
                              }}
                              className="text-stone-400 hover:text-[#D4A359] text-[11px] font-sans transition"
                              title="スレッドの問いを推敲・編集"
                            >
                              ✏️ 編集
                            </button>
                            <button
                              onClick={() => handleDeleteThread(activeThread.id)}
                              className="text-stone-400 hover:text-rose-600 text-[11px] font-sans transition"
                              title="スレッドを削除"
                            >
                              🗑️ 削除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* スレッド本文 または 編集フォーム */}
                    {isEditingThread ? (
                      <form onSubmit={handleUpdateThread} className="space-y-4 pt-2 font-sans">
                        <div className="space-y-1">
                          <label className="block text-xs text-stone-600 dark:text-stone-400 font-medium">
                            問いの題名（タイトル）
                          </label>
                          <input
                            type="text"
                            value={editThreadTitle}
                            onChange={(e) => setEditThreadTitle(e.target.value)}
                            className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-sm text-[#1A1F2C] dark:text-stone-100 font-serif focus:outline-none focus:border-[#D4A359]"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs text-stone-600 dark:text-stone-400 font-medium">
                            本文・思索の背景
                          </label>
                          <textarea
                            rows={6}
                            value={editThreadContent}
                            onChange={(e) => setEditThreadContent(e.target.value)}
                            className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:border-[#D4A359] leading-relaxed"
                            required
                          />
                        </div>

                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setIsEditingThread(false)}
                            className="px-4 py-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                          >
                            キャンセル
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingThread || !editThreadTitle.trim() || !editThreadContent.trim()}
                            className="px-5 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition disabled:opacity-40"
                          >
                            {isSavingThread ? '保存中...' : '推敲内容を保存する'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h2 className="text-xl sm:text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 leading-snug">
                          {activeThread.title}
                        </h2>

                        <div className="p-6 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-sm sm:text-base leading-relaxed text-stone-800 dark:text-stone-200 font-serif whitespace-pre-wrap">
                          {activeThread.content}
                        </div>

                        {/* 対話・書評の灯火を手渡す共有バナー */}
                        <div className="p-4 sm:p-5 bg-[#F4F0E8]/70 dark:bg-[#1E2533]/70 rounded-xl border border-[#E2DDD5] dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
                          <div className="space-y-0.5 text-center sm:text-left">
                            <p className="font-medium text-[#1A1F2C] dark:text-stone-200 flex items-center gap-1.5 justify-center sm:justify-start">
                              <span>🕯️</span>
                              <span>この対話・書評の灯火を他者へ手渡す</span>
                            </p>
                            <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                              書評の対象者や、言葉の思索を深め合いたい方へ直接リンクを届けることができます。
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyThreadUrl(activeThread.id)}
                            className="px-4 py-2 bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 hover:border-[#D4A359] hover:text-[#D4A359] transition font-medium flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                          >
                            <span>{copiedThreadId === activeThread.id ? "✓" : "🔗"}</span>
                            <span>{copiedThreadId === activeThread.id ? "コピー完了！🕯️" : "トピックURLをコピー"}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 投稿・応答一覧 */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-sans tracking-widest text-stone-500 dark:text-stone-400 uppercase flex items-center justify-between">
                      <span>言葉の応答（Pratyaya）</span>
                      <span className="bg-[#EAE4D8] dark:bg-stone-800 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">
                        {activeThread.posts?.length || 0} 件
                      </span>
                    </h3>

                    {(!activeThread.posts || activeThread.posts.length === 0) ? (
                      <div className="p-8 text-center bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded border border-[#E2DDD5] dark:border-stone-800 text-xs font-sans text-stone-400">
                        まだ応答はありません。静かに最初の言葉を寄せてみませんか。
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeThread.posts.map((post) => {
                          const postAuthor = post.author?.display_name || post.author?.username || post.author_name || '読者'
                          const isPostAuthor = currentUser && post.author_id === currentUser.id
                          const isPostEdited = post.is_edited || (post.updated_at && post.updated_at !== post.created_at)
                          const isCurrentlyEditing = editingPostId === post.id

                          return (
                            <div
                              key={post.id}
                              className="p-5 bg-[#F4F0E8]/50 dark:bg-[#1E2533]/80 rounded-lg border border-[#E2DDD5] dark:border-stone-800 space-y-3"
                            >
                              <div className="flex items-center justify-between text-xs font-sans">
                                <Link href={`/authors/${post.author_id}`} className="font-medium text-[#1A1F2C] dark:text-stone-200 hover:text-[#D4A359] transition">
                                  {postAuthor}
                                </Link>

                                <div className="flex items-center gap-3 text-stone-400">
                                  <div className="flex items-center gap-1.5">
                                    <span>{new Date(post.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    {isPostEdited && (
                                      <span className="text-[10px] text-stone-400">（編集済み）</span>
                                    )}
                                  </div>

                                  {isPostAuthor && (
                                    <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-700">
                                      <button
                                        onClick={() => {
                                          setEditingPostId(post.id)
                                          setEditPostContent(post.content)
                                        }}
                                        className="text-stone-400 hover:text-[#D4A359] text-[11px] transition"
                                        title="応答を推敲・編集"
                                      >
                                        ✏️ 編集
                                      </button>
                                      <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="text-stone-400 hover:text-rose-600 text-[11px] transition"
                                        title="応答を削除"
                                      >
                                        🗑️ 削除
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isCurrentlyEditing ? (
                                <div className="space-y-3 pt-1 font-sans">
                                  <textarea
                                    rows={3}
                                    value={editPostContent}
                                    onChange={(e) => setEditPostContent(e.target.value)}
                                    className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:border-[#D4A359]"
                                    required
                                  />
                                  <div className="flex justify-end gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPostId(null)
                                        setEditPostContent('')
                                      }}
                                      className="px-3 py-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                                    >
                                      キャンセル
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSavingPost || !editPostContent.trim()}
                                      onClick={() => handleUpdatePost(post.id)}
                                      className="px-4 py-1 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition disabled:opacity-40"
                                    >
                                      {isSavingPost ? '保存中...' : '保存する'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-serif leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                                  {post.content}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 返信送信フォーム */}
                  {currentUser ? (
                    <form onSubmit={handleSendReply} className="pt-6 border-t border-[#E2DDD5] dark:border-stone-800 space-y-4 font-sans">
                      <h4 className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        この問いに応答の言葉を寄せる
                      </h4>

                      <textarea
                        rows={4}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="他者の尊厳と自己の良心を照らす言葉を添えてください..."
                        className="w-full p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-700 rounded text-sm font-serif text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:border-[#D4A359]"
                        disabled={isSubmitting}
                        required
                      />

                      {/* 内省の鐘（送信直前の倫理確認） */}
                      <div className="p-3 bg-[#F4F0E8] dark:bg-[#1E2533] rounded border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="ethics-reply"
                          checked={replyEthicsAgreed}
                          onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                          className="mt-0.5 accent-[#D4A359] h-4 w-4"
                          required
                        />
                        <label htmlFor="ethics-reply" className="text-xs text-stone-600 dark:text-stone-300 cursor-pointer select-none leading-relaxed">
                          <span className="font-medium text-[#D4A359]">【送信直前の内省】</span> この言葉は、作品や問いの解釈を深め、他者の尊厳と良心を照らすものですか？
                        </label>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting || !replyContent.trim() || !replyEthicsAgreed}
                          className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-wider rounded font-medium hover:opacity-90 disabled:opacity-40 transition shadow-sm"
                        >
                          {isSubmitting ? '送信中...' : '応答を届ける'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-6 bg-[#F4F0E8] dark:bg-[#1E2533] rounded-lg text-center space-y-3 text-xs font-sans text-stone-500">
                      <p>応答を投稿するにはログインが必要です。</p>
                      <Link
                        href="/auth/login"
                        className="inline-block px-5 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition"
                      >
                        ログインする
                      </Link>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white/80 dark:bg-[#242B3B]/80 border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-12 text-center text-xs text-stone-400 font-sans">
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
          <div className="bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl font-sans">
            
            <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
              <h3 className="text-base font-normal font-serif text-[#1A1F2C] dark:text-stone-100">
                新しい問いを立てる（スレッド作成）
              </h3>
              <button onClick={() => setIsNewThreadOpen(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-5">
              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">対話部屋（カテゴリ）</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs text-[#1A1F2C] dark:text-stone-100"
                >
                  {categories
                    .filter((c) => {
                      if (c.slug === 'official-announcement' || c.id === 'official-announcement') {
                        return userProfile?.role === 'admin'
                      }
                      return true
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {newThreadCategory && categories.find((c) => c.id === newThreadCategory)?.slug === 'official-announcement' && (
                  <p className="text-[11px] text-[#D4A359] dark:text-[#E5B869] mt-1 font-sans">
                    💡 【主宰専用】このスレッドを投稿すると、トップページ（/）の「聖域からの便り」へ自動的に最新案内として連動表示されます。
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">問いの題名（タイトル）</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="例：『銀河鉄道の夜』における光と孤独の構造"
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">本文・探求の導入</label>
                <textarea
                  rows={5}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="言葉や作品について投げかけたい問い、思索の背景をお書きください..."
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs font-serif text-[#1A1F2C] dark:text-stone-100"
                  required
                />
              </div>

              {/* 内省の鐘 */}
              <div className="p-3 bg-[#F4F0E8] dark:bg-[#1E2533] rounded border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="ethics-thread"
                  checked={newThreadEthicsAgreed}
                  onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#D4A359] h-4 w-4"
                  required
                />
                <label htmlFor="ethics-thread" className="text-xs text-stone-600 dark:text-stone-300 cursor-pointer select-none leading-relaxed">
                  <span className="font-medium text-[#D4A359]">【自己内省の確認】</span> 二元論的な対立や他者の否定を排し、尊厳と良心を照らす問いかけですか？
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewThreadOpen(false)}
                  className="px-4 py-2 text-xs text-stone-500 hover:text-stone-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-5 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-medium rounded hover:opacity-90 disabled:opacity-40 transition"
                >
                  {isSubmitting ? '投稿中...' : '問いを公開する'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}




