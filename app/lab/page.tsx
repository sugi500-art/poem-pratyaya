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

const CATEGORIES: ForumCategory[] = [
  {
    id: 'cat-1',
    slug: 'mutual-critique',
    name: '相互鑑賞・合評（Pratyaya Lab）',
    description: '作品の一音・一節の響き、技術論、推敲のための静かな合評空間。',
    display_order: 1,
  },
  {
    id: 'cat-2',
    slug: 'language-philosophy',
    name: '言語・思想研究（Vāc & Logos）',
    description: '言葉の構造、認識論、サンスクリット語・古典詩論の探求。',
    display_order: 2,
  },
  {
    id: 'cat-3',
    slug: 'experimental',
    name: '雑作・実験室（Experimental Lab）',
    description: '断片的なフレーズ、音響実験、試作段階の言葉の書き付け。',
    display_order: 3,
  },
  {
    id: 'cat-4',
    slug: 'tea-room',
    name: '雑談・静かな茶室（Tea Room）',
    description: '日常の観察、創作に伴う思索、季節の移ろいや読書体験の共有。',
    display_order: 4,
  },
]

export default function ForumLabView() {
  const [hasMounted, setHasMounted] = useState(false)
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  // 新規スレッドモーダル状態
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState('cat-1')
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
    fetchThreads()
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  // Supabase からスレッド＆投稿一覧を取得
  async function fetchThreads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('forum_threads')
        .select(`
          *,
          posts:forum_posts (*)
        `)
        .order('last_activity_at', { ascending: false })

      if (error) {
        console.error('スレッド取得エラー:', error)
        setThreads([])
      } else if (data) {
        setThreads(data as ForumThread[])
        if (data.length > 0 && !activeThreadId) {
          setActiveThreadId(data[0].id)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
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
          category_id: newThreadCategory,
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
      fetchThreads()
    } catch (err: any) {
      alert('スレッドの作成に失敗しました: ' + err.message)
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
      fetchThreads()
    } catch (err: any) {
      alert('応答の送信に失敗しました: ' + err.message)
    } finally {
      setIsSubmitting(false)
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                    : 'bg-[#F4F0E8] dark:bg-stone-800 text-gray-700 dark:text-stone-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {currentUser && (
            <button
              onClick={() => setIsNewThreadOpen(true)}
              className="px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs font-sans rounded font-medium"
            >
              ＋ 新しい問いを投稿する
            </button>
          )}
        </div>

        {/* スレッド一覧 ＆ 詳細表示 */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500 font-sans">読み込んでいます...</div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#242B3B] rounded-lg border border-[#E2DDD5] dark:border-stone-800 text-sm text-gray-500 dark:text-stone-400 font-sans">
            該当するスレッドはまだありません。新しい問いを立ててみましょう。
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 左側：スレッド一覧 */}
            <div className="lg:col-span-5 space-y-4">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`p-5 rounded-lg border cursor-pointer ${
                    activeThreadId === thread.id
                      ? 'border-[#D4A359] bg-white dark:bg-[#242B3B] shadow-md'
                      : 'border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60'
                  }`}
                >
                  <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 mb-2">{thread.title}</h3>
                  <div className="text-xs text-gray-500 dark:text-stone-400 font-sans">
                    投稿者: {thread.author_name}
                  </div>
                </div>
              ))}
            </div>

            {/* 右側：対話詳細 */}
            <div className="lg:col-span-7">
              {activeThread && (
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 space-y-6">
                  <h2 className="text-xl font-normal text-[#1A1F2C] dark:text-stone-100">{activeThread.title}</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif bg-[#FBF9F5] dark:bg-[#1A1F2C] p-4 rounded border border-[#E2DDD5] dark:border-stone-800">
                    {activeThread.content}
                  </p>

                  {/* 返信一覧 */}
                  <div className="space-y-4 pt-4 border-t border-[#E2DDD5] dark:border-stone-800">
                    <h3 className="text-xs font-sans uppercase text-gray-500">対話・応答 ({activeThread.posts?.length || 0}件)</h3>
                    {activeThread.posts?.map((post) => (
                      <div key={post.id} className="p-4 bg-[#F4F0E8]/40 dark:bg-[#1E2533] rounded border border-[#E2DDD5] dark:border-stone-800 text-sm">
                        <div className="text-xs text-gray-500 mb-1">{post.author_name}</div>
                        <p className="whitespace-pre-wrap">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
