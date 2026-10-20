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
  subtitle: string
  description: string
  guide_prompt: string
  display_order: number
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

// 4つの部屋の深い定義と案内文
const ROOM_DEFINITIONS: Category[] = [
  {
    id: 'peer-review',
    slug: 'peer-review',
    name: '相互鑑賞・合評の部屋',
    subtitle: 'Pratyaya Lab',
    description: '作品の一音・一節の響き、技術論、推敲のための静かな合評空間です。言葉の表面的な批判ではなく「別の角度から光を当てる灯火」として他者の作品と向き合います。',
    guide_prompt: '推敲で行き詰まっている一節や、音響の響きについて問いを投げかけてみましょう。',
    display_order: 1,
  },
  {
    id: 'linguistics',
    slug: 'linguistics',
    name: '言語・思想研究の部屋',
    subtitle: 'Vāc & Logos',
    description: '言葉と意識の構造、サンスクリット古典詩論、空（śūnyatā）と動的縁起、法哲学など、詩と人間存在をめぐる知の探求を行う部屋です。',
    guide_prompt: '読書や思索の中で出会った「言葉と存在」をめぐる概念や論点について記してみましょう。',
    display_order: 2,
  },
  {
    id: 'experimental',
    slug: 'experimental',
    name: '雑作・実験室の部屋',
    subtitle: 'Experimental Lab',
    description: '断片的なフレーズ、音響実験、試作段階の言葉の書き付けを置く実験場です。未完成の詩篇が持つ可能性を静かに観察します。',
    guide_prompt: 'ふと浮かんだ一文や、試作中のフレーズの断片を自由に置いてみましょう。',
    display_order: 3,
  },
  {
    id: 'tea-room',
    slug: 'tea-room',
    name: '雑談・静かな茶室',
    subtitle: 'Tea Room',
    description: '日常の些細な観察、印象に残った詩集の感想、創作に伴う静かな悩みや季節の移ろいを共有する、茶室のような和やかな空間です。',
    guide_prompt: '最近心に残った言葉や、日々の静かな観察について気負わずに語りかけてみましょう。',
    display_order: 4,
  },
]

export default function LabPage() {
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>(ROOM_DEFINITIONS)
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null)
  const [activePosts, setActivePosts] = useState<ForumPost[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 新規問い投稿フォーム状態
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState<string>('peer-review')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)
  const [newThreadStatus, setNewThreadStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmittingThread, setIsSubmittingThread] = useState(false)

  // 返信フォーム状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [replyStatus, setReplyStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  useEffect(() => {
    checkCurrentUser()
    fetchData()
  }, [])

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function fetchData() {
    try {
      setLoading(true)

      // カテゴリデータ取得
      const { data: catData } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (catData && catData.length > 0) {
        // DB定義があれば統合
        const merged = ROOM_DEFINITIONS.map((def) => {
          const dbCat = catData.find((c) => c.slug === def.slug || c.id === def.id)
          return dbCat ? { ...def, id: dbCat.id } : def
        })
        setCategories(merged)
      }

      // スレッド取得
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
      console.error('データ取得中のエラー:', err)
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

  function handleSelectThread(thread: ForumThread) {
    setActiveThread(thread)
    setReplyStatus(null)
    setReplyContent('')
    setReplyEthicsAgreed(false)
    fetchPostsForThread(thread.id)
  }

  // 新規スレッド作成
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

  // 返信投稿
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
      setReplyStatus({ type: 'success', text: '深層の応答を投稿しました。' })
    } catch (err: any) {
      console.error('返信作成エラー:', err)
      setReplyStatus({ type: 'error', text: err.message || '返信の送信に失敗しました。' })
    } finally {
      setIsSubmittingReply(false)
    }
  }

  // 選択中のカテゴリ情報
  const currentCategoryInfo = categories.find((c) => c.id === selectedCategoryId || c.slug === selectedCategoryId)

  // フィルタリングされたスレッド一覧
  const filteredThreads =
    selectedCategoryId === 'all'
      ? threads
      : threads.filter(
          (t) =>
            t.category_id === selectedCategoryId ||
            t.forum_categories?.id === selectedCategoryId ||
            t.forum_categories?.slug === selectedCategoryId
        )

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased pb-20">
      
      {/* ページヘッダー（静寂と深遠さを演出） */}
      <header className="border-b border-[#E2DDD5] bg-[#F4F0E8] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs tracking-[0.25em] text-[#D4A359] uppercase font-sans font-medium">
              Pratyaya Lab — Dialogue Sanctuary
            </p>
            <h1 className="text-2xl md:text-3xl font-normal tracking-wide text-[#1A1F2C]">
              対話と深層批判の部屋（Pratyaya Lab）
            </h1>
            <p className="text-xs text-stone-600 font-sans max-w-2xl leading-relaxed">
              勝敗や優劣を競う二元論を離れ、言葉を縁（pratyaya）として持ちより、互いの尊厳と良心を照らし合う4つの空間です。
            </p>
          </div>
          <Link href="/" className="text-xs font-sans text-stone-500 hover:text-[#1A1F2C] transition shrink-0">
            ← トップ目次へ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* 4つの部屋（カテゴリ切替ナビゲーション） */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DDD5] pb-4">
            <div className="flex flex-wrap gap-2 font-sans text-xs">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`px-4 py-2 rounded transition-all ${
                  selectedCategoryId === 'all'
                    ? 'bg-[#1A1F2C] text-[#FBF9F5] font-medium shadow-sm'
                    : 'bg-[#F4F0E8] text-stone-700 hover:bg-[#EAE4D8]'
                }`}
              >
                すべての部屋 ({threads.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2 rounded transition-all ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#1A1F2C] text-[#FBF9F5] font-medium shadow-sm'
                      : 'bg-[#F4F0E8] text-stone-700 hover:bg-[#EAE4D8]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsNewThreadOpen(!isNewThreadOpen)}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white text-xs tracking-wider font-sans rounded shadow-sm transition-colors shrink-0"
            >
              {isNewThreadOpen ? 'フォームを閉じる' : '＋ 新しい問いを投稿する'}
            </button>
          </div>

          {/* 選択中の部屋の案内メッセージカード */}
          {currentCategoryInfo && (
            <div className="p-6 bg-white border-l-4 border-[#D4A359] border-y border-r border-[#E2DDD5] rounded-r-lg space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-normal text-[#1A1F2C]">
                  {currentCategoryInfo.name} <span className="text-xs text-[#D4A359] font-sans font-medium ml-2">[{currentCategoryInfo.subtitle}]</span>
                </h2>
              </div>
              <p className="text-xs text-stone-700 font-serif leading-relaxed">
                {currentCategoryInfo.description}
              </p>
              <p className="text-[11px] text-stone-500 font-sans italic pt-1 border-t border-stone-100">
                💡 {currentCategoryInfo.guide_prompt}
              </p>
            </div>
          )}
        </div>

        {/* 新規スレッド（問い）作成フォーム */}
        {isNewThreadOpen && (
          <section className="bg-white border border-[#E2DDD5] rounded-lg p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-stone-200 pb-3">
              <h2 className="text-base font-normal text-[#1A1F2C]">
                新しい問い（スレッド）を立てる
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-1">
                対話を行う部屋を選び、丁寧な言葉で問題提起を行ってください。
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
                      {cat.name} ({cat.subtitle})
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
                  placeholder="対話の背景や、具体的に深めたい点について記してください..."
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
                    ※ 人格攻撃や批判を排し、表現された言葉や構造に対して誠実に対話します。
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
              投ぜられた問い ({filteredThreads.length}件)
            </h2>

            {loading ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD5] rounded text-xs font-sans text-stone-400">
                対話を読み込んでいます...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD5] rounded text-xs font-sans text-stone-500 space-y-2">
                <p>この部屋にはまだ問いが投ぜられていません。</p>
                <p className="text-[11px] text-stone-400">「＋ 新しい問いを投稿する」から最初の対話を始めてみましょう。</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = activeThread?.id === thread.id
                const authorName =
                  thread.profiles?.display_name || thread.profiles?.username || '無名の表現者'
                const isMyThread = currentUser && thread.author_id === currentUser.id
                const catName = thread.forum_categories?.name || '対話空間'

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-5 rounded-lg border cursor-pointer transition-all space-y-2.5 ${
                      isActive
                        ? 'border-[#D4A359] bg-white shadow-md'
                        : 'border-[#E2DDD5] bg-white/70 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-sans text-stone-500">
                      <span className="px-2 py-0.5 bg-[#EAE4D8] text-stone-800 rounded text-[10px]">
                        {catName}
                      </span>
                      <span>応答 {thread.posts_count || 0}件</span>
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

          {/* 右カラム：アクティブスレッドの本文＆対話応答表示 */}
          <div className="lg:col-span-7 space-y-6">
            {activeThread ? (
              <div className="space-y-6">
                
                {/* スレッド本文カード */}
                <div className="bg-white border border-[#E2DDD5] rounded-lg p-6 md:p-8 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4A359]/10 to-transparent pointer-events-none rounded-bl-full" />

                  <div className="border-b border-stone-100 pb-4 space-y-2">
                    <span className="text-[10px] font-sans px-2.5 py-0.5 bg-[#EAE4D8] text-stone-800 rounded inline-block font-medium">
                      {activeThread.forum_categories?.name || '対話空間'}
                    </span>
                    <h2 className="text-xl md:text-2xl font-normal text-[#1A1F2C] tracking-wide">
                      {activeThread.title}
                    </h2>
                  </div>

                  <p className="text-sm text-stone-800 font-serif whitespace-pre-wrap leading-relaxed py-2">
                    {activeThread.content}
                  </p>

                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs font-sans text-stone-500">
                    <div className="font-serif">
                      発言者：
                      <span className="font-medium text-[#1A1F2C]">
                        {activeThread.profiles?.display_name || activeThread.profiles?.username || '無名の表現者'}
                      </span>
                      {currentUser && activeThread.author_id === currentUser.id && (
                        <span className="ml-1 text-[11px] text-stone-400 font-sans">（あなた）</span>
                      )}
                      {activeThread.profiles?.role === 'advisor' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] rounded font-sans">
                          特別選者
                        </span>
                      )}
                    </div>
                    <span>{new Date(activeThread.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                {/* 返信・応答一覧 */}
                <div className="space-y-4">
                  <div className="border-b border-stone-200 pb-2 flex justify-between items-center">
                    <h3 className="text-xs font-sans tracking-widest text-stone-500 uppercase">
                      寄せられた応答・対話 ({activePosts.length}件)
                    </h3>
                    <span className="text-[11px] text-stone-400 font-sans">言葉を継ぐ</span>
                  </div>

                  {loadingPosts ? (
                    <div className="p-6 text-center text-xs font-sans text-stone-400 bg-white border border-[#E2DDD5] rounded">
                      応答を読み込んでいます...
                    </div>
                  ) : activePosts.length === 0 ? (
                    <div className="p-6 text-center text-xs font-sans text-stone-500 bg-white border border-[#E2DDD5] rounded space-y-1">
                      <p>まだこの問いへの応答はありません。</p>
                      <p className="text-[11px] text-stone-400">静かに言葉を受け止め、最初の応答を寄せてみませんか。</p>
                    </div>
                  ) : (
                    activePosts.map((post) => {
                      const postAuthorName =
                        post.profiles?.display_name || post.profiles?.username || '無名の表現者'
                      const isMyPost = currentUser && post.author_id === currentUser.id

                      return (
                        <div
                          key={post.id}
                          className="bg-white border border-[#E2DDD5] rounded-lg p-5 space-y-3 shadow-sm hover:border-stone-300 transition-colors"
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
                  <h3 className="text-xs font-sans tracking-widest text-stone-600 uppercase border-b border-stone-100 pb-2 font-medium">
                    この問いに応答（返信）を寄せる
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
                      placeholder="問いに対する自らの思考や言葉を静かに記してください..."
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
                左側のリストから問いを選択すると、詳細と対話がここに表示されます。
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}