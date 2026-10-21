'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

// --- TypeScript Interfaces ---
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

// --- 初期データ (初期カテゴリ 4種 & サンプル対話スレッド) ---
const INITIAL_CATEGORIES: ForumCategory[] = [
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
    description: '言葉の構造、認識論、サンスクリット語・古典詩論・法哲学の探求。',
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

const INITIAL_THREADS: ForumThread[] = [
  {
    id: 'thread-1',
    category_id: 'cat-2',
    author_id: 'user-admin',
    author_name: '黒髪（杉原詠二）',
    author_role: 'admin',
    title: '「名色（nāma-rūpa）」の錬成としての詩作と、言葉による知の構造化について',
    content: `人間は、言葉（nāma）によって世界や胸の中の心象（rūpa）を意味づけ、知を構造化していきます。ほとんどすべての人間的価値が「言葉」に行き着くとするならば、詩作行為とはまさに単なる情報伝達を超えた「言葉の錬成」に他なりません。

Poem pratyaya という場において、詩を縁（pratyaya）として持ちより対話することで、各自の言語観がどのように更新（アップデート）され、新しい知の地平が開かれていくか。みなさんの実感を交えた思考をお聞かせください。`,
    posts_count: 2,
    last_activity_at: '2026-10-18T00:30:00Z',
    created_at: '2026-10-17T20:00:00Z',
    posts: [
      {
        id: 'post-101',
        thread_id: 'thread-1',
        author_id: 'user-advisor',
        author_name: '三浦果実',
        author_role: 'advisor',
        content: `言葉を単なる自己主張や優劣の競い合い（二元論）から解放したとき、初めて言葉そのものの音響（Vāc）と論理（Logos）が静かに響き始めますね。

言葉の錬成とは、自分のエゴを固執させることではなく、むしろ「空（śūnyatā）」の境地において、世界と自分が相互に依存し合っている（動的縁起）事実を言葉として織り直す作業だと感じます。この対話空間自体が、その錬成の炉になることを期待しています。`,
        created_at: '2026-10-17T22:15:00Z',
      },
      {
        id: 'post-102',
        thread_id: 'thread-1',
        author_id: 'current-user',
        author_name: 'あなた（投稿者）',
        author_role: 'user',
        content: `自分の詩の推敲で行き詰まっていたとき、言葉の意味だけに縛られず「行間の沈黙」や「音の余韻」を意識することで、今まで見えなかった感情の輪郭が浮き彫りになる体験をしました。

他者からの批評も、傷つけるためではなく「別の角度から光を当てる灯火」として受け取れるこの場の空気がありがたいです。`,
        created_at: '2026-10-18T00:30:00Z',
      },
    ],
  },
  {
    id: 'thread-2',
    category_id: 'cat-1',
    author_id: 'user-004',
    author_name: '青葉',
    author_role: 'user',
    title: '行分け詩における「改行」の間（ま）と視覚的リズムの検討',
    content: `連と連の間の空白、あるいは一行の途中で改行を入れる際の「時間感覚」について考えています。
縦書きで読まれる際と、横書きで読まれる際で、改行が読者の呼吸に与える影響はどのように変化するでしょうか？作品の批評と併せてご意見をいただければ幸いです。`,
    posts_count: 0,
    last_activity_at: '2026-10-16T15:00:00Z',
    created_at: '2026-10-16T14:20:00Z',
    posts: [],
  },
]

export default function ForumLabView() {
  const [hasMounted, setHasMounted] = useState(false)
  const [categories] = useState<ForumCategory[]>(INITIAL_CATEGORIES)
  const [threads, setThreads] = useState<ForumThread[]>(INITIAL_THREADS)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thread-1')
  const [currentUserId] = useState<string>('current-user')
  
  // 新規スレッドモーダル状態
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState('cat-1')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)

  // 新規返信状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)

  // モバイル表示切り替え用
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // カテゴリによるフィルタリング
  const filteredThreads = selectedCategoryId === 'all'
    ? threads
    : threads.filter((t) => t.category_id === selectedCategoryId)

  const activeThread = threads.find((t) => t.id === activeThreadId)

  // スレッド新規作成ハンドラ
  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed) return

    const newThread: ForumThread = {
      id: `thread-${Date.now()}`,
      category_id: newThreadCategory,
      author_id: currentUserId,
      author_name: 'あなた（投稿者）',
      author_role: 'user',
      title: newThreadTitle.trim(),
      content: newThreadContent.trim(),
      posts_count: 0,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      posts: [],
    }

    setThreads([newThread, ...threads])
    setActiveThreadId(newThread.id)
    setIsNewThreadOpen(false)
    setNewThreadTitle('')
    setNewThreadContent('')
    setNewThreadEthicsAgreed(false)
    setMobileView('detail')
  }

  // スレッド削除ハンドラ
  const handleDeleteThread = (threadId: string) => {
    if (!confirm('このスレッドを削除しますか？関連するすべての対話応答も削除されます。')) return

    const updated = threads.filter((t) => t.id !== threadId)
    setThreads(updated)
    if (activeThreadId === threadId) {
      setActiveThreadId(updated.length > 0 ? updated[0].id : null)
    }
  }

  // ポスト（対話応答）削除ハンドラ
  const handleDeletePost = (postId: string) => {
    if (!activeThread) return
    if (!confirm('この対話応答を削除しますか？')) return

    const updatedThreads = threads.map((t) => {
      if (t.id === activeThread.id) {
        const remainingPosts = (t.posts || []).filter((p) => p.id !== postId)
        return {
          ...t,
          posts_count: Math.max(0, remainingPosts.length),
          posts: remainingPosts,
        }
      }
      return t
    })

    setThreads(updatedThreads)
  }

  // 返信送信ハンドラ
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeThread || !replyContent.trim() || !replyEthicsAgreed) return

    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      thread_id: activeThread.id,
      author_id: currentUserId,
      author_name: 'あなた（投稿者）',
      author_role: 'user',
      content: replyContent.trim(),
      created_at: new Date().toISOString(),
    }

    const updatedThreads = threads.map((t) => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          posts_count: t.posts_count + 1,
          last_activity_at: new Date().toISOString(),
          posts: [...(t.posts || []), newPost],
        }
      }
      return t
    })

    setThreads(updatedThreads)
    setReplyContent('')
    setReplyEthicsAgreed(false)
  }

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 text-center font-sans">
        <p className="text-sm text-gray-500 dark:text-stone-400">Pratyaya Lab を読み込んでいます...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased pb-20 selection:bg-[#D4A359]/20">
      
      {/* ページヘッダー：引き算された軽量で洗練されたバナー */}
      <header className="border-b border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/80 dark:bg-[#121621]/80 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4A359] animate-pulse" />
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                Pratyaya Lab — Dialogue Room
              </p>
            </div>
            <h1 className="text-2xl md:text-3xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
              対話と深層批判の空地
            </h1>
          </div>

          <Link
            href="/terms"
            className="text-xs font-sans text-stone-500 hover:text-[#D4A359] dark:text-stone-400 border-b border-stone-300 dark:border-stone-700 pb-0.5 transition"
          >
            対話指針・利用規約を読む →
          </Link>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* カテゴリタブ & スレッド作成ボタン */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6 mb-8">
          {/* カテゴリフィルター */}
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

          {/* 新規スレッド立てボタン */}
          <button
            onClick={() => setIsNewThreadOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white dark:text-[#1A1F2C] text-xs tracking-wider font-sans rounded shadow-sm transition-all font-medium shrink-0"
          >
            <span>＋</span>
            <span>新しい問いを立てる</span>
          </button>
        </div>

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
                  onClick={() => setIsNewThreadOpen(true)}
                  className="text-xs text-[#D4A359] hover:underline font-medium"
                >
                  最初の問いを立ててみませんか？
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const category = categories.find((c) => c.id === thread.category_id)
                const isActive = activeThreadId === thread.id

                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setActiveThreadId(thread.id)
                      setMobileView('detail')
                    }}
                    className={`p-5 rounded-lg border transition-all cursor-pointer space-y-3 ${
                      isActive
                        ? 'bg-white dark:bg-[#242B3B] border-[#D4A359] shadow-md ring-1 ring-[#D4A359]/30'
                        : 'bg-[#F4F0E8]/60 dark:bg-[#1E2533]/60 border-[#E2DDD5] dark:border-stone-800 hover:border-gray-400 dark:hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="px-2 py-0.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded text-[10px] font-medium">
                        {category?.name || '対話'}
                      </span>
                      <span className="text-gray-400 dark:text-stone-500 text-[11px]">
                        {new Date(thread.last_activity_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold leading-snug text-[#1A1F2C] dark:text-stone-100 line-clamp-2">
                      {thread.title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                      {thread.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-sans text-gray-500 dark:text-stone-400 pt-1 border-t border-[#E2DDD5]/60 dark:border-stone-800">
                      <span>提起者：{thread.author_name}</span>
                      <span className="text-[#D4A359] font-medium">応答 {thread.posts_count} 件</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 右側：選択中スレッドの対話詳細 (7/12) */}
          <div className={`lg:col-span-7 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            {activeThread ? (
              <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-lg p-6 md:p-8 space-y-8 shadow-sm">
                
                {/* スレッド問いかけヘッダー */}
                <div className="space-y-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                    <span className="px-2.5 py-1 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded text-[11px] font-medium">
                      {categories.find((c) => c.id === activeThread.category_id)?.name}
                    </span>
                    
                    <div className="flex items-center gap-3 text-gray-400 dark:text-stone-400">
                      <span>{new Date(activeThread.created_at).toLocaleString('ja-JP')}</span>
                      {activeThread.author_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteThread(activeThread.id)}
                          className="text-rose-600 dark:text-rose-400 hover:underline text-[11px]"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>

                  <h1 className="text-xl md:text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 leading-snug">
                    {activeThread.title}
                  </h1>

                  <div className="flex items-center space-x-2 text-xs font-sans text-gray-600 dark:text-stone-300">
                    <span className="font-medium text-[#1A1F2C] dark:text-stone-100">提起者：{activeThread.author_name}</span>
                    {activeThread.author_role === 'admin' && (
                      <span className="px-1.5 py-0.5 bg-[#1A1F2C] text-white dark:bg-[#D4A359] dark:text-[#1A1F2C] text-[10px] rounded">主宰</span>
                    )}
                    {activeThread.author_role === 'advisor' && (
                      <span className="px-1.5 py-0.5 bg-emerald-700 text-white text-[10px] rounded">特別選者</span>
                    )}
                  </div>

                  {/* 問い本文 */}
                  <div className="p-5 bg-[#FBF9F5] dark:bg-[#1A1F2C] border-l-2 border-[#D4A359] rounded-r text-sm md:text-base leading-relaxed text-[#2C3448] dark:text-stone-200 whitespace-pre-wrap font-serif">
                    {activeThread.content}
                  </div>
                </div>

                {/* 対話応答ポスト一覧 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-sans tracking-widest text-gray-500 dark:text-stone-400 uppercase border-b border-[#E2DDD5] dark:border-stone-800 pb-2">
                    言葉の応答・交歓 ({activeThread.posts?.length || 0})
                  </h3>

                  {(!activeThread.posts || activeThread.posts.length === 0) ? (
                    <p className="text-xs text-gray-400 dark:text-stone-500 font-sans italic text-center py-6">
                      まだ応答はありません。静かに言葉を添えてみませんか。
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activeThread.posts.map((post) => (
                        <div
                          key={post.id}
                          className="p-5 bg-[#F4F0E8]/50 dark:bg-[#1E2533] border border-[#E2DDD5] dark:border-stone-800 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between text-xs font-sans">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-[#1A1F2C] dark:text-stone-100">{post.author_name}</span>
                              {post.author_role === 'admin' && (
                                <span className="px-1.5 py-0.5 bg-[#1A1F2C] text-white dark:bg-[#D4A359] dark:text-[#1A1F2C] text-[10px] rounded">主宰</span>
                              )}
                              {post.author_role === 'advisor' && (
                                <span className="px-1.5 py-0.5 bg-emerald-700 text-white text-[10px] rounded">特別選者</span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                              <span>{new Date(post.created_at).toLocaleString('ja-JP')}</span>
                              {post.author_id === currentUserId && (
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                >
                                  削除
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed text-[#2C3448] dark:text-stone-200 whitespace-pre-wrap font-serif">
                            {post.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 応答返信フォーム */}
                <form onSubmit={handleSendReply} className="pt-4 border-t border-[#E2DDD5] dark:border-stone-800 space-y-4 font-sans">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-stone-300">この問いに応答（投稿）を寄せる</h4>
                  
                  <textarea
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="言葉の響きや構造についての内省と対話を添えてください..."
                    className="w-full p-4 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-sm text-[#1A1F2C] dark:text-stone-100 font-serif focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
                    required
                  />

                  <div className="p-3 bg-[#F4F0E8] dark:bg-[#1E2533] rounded border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="reply-ethics"
                      checked={replyEthicsAgreed}
                      onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-[#D4A359]"
                      required
                    />
                    <label htmlFor="reply-ethics" className="text-xs text-gray-700 dark:text-stone-300 leading-relaxed cursor-pointer select-none">
                      ※ この言葉は他者の尊厳を深め、良心を照らすものですか？（二元論的批判や人格攻撃を含まないことを確認します）
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || !replyEthicsAgreed}
                      className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-medium rounded hover:opacity-90 disabled:opacity-40 transition shadow-sm"
                    >
                      応答を届ける
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-lg text-sm text-gray-500 font-sans">
                表示するスレッドが選択されていません。
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 新規スレッド作成モーダル */}
      {isNewThreadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E2DDD5] dark:border-stone-800 rounded-xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
              <h3 className="text-base font-normal text-[#1A1F2C] dark:text-stone-100 font-serif">
                新しい問い（スレッド）を立てる
              </h3>
              <button
                onClick={() => setIsNewThreadOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1">カテゴリ選択</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs text-[#1A1F2C] dark:text-stone-100"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1">問いの題目（タイトル）</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="例：改行の間とリズムについての考察..."
                  className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1">問いの本文・背景</label>
                <textarea
                  rows={5}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="言葉の構造や問題意識について丁寧にお書きください..."
                  className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
                  required
                />
              </div>

              <div className="p-3 bg-[#F4F0E8] dark:bg-[#1E2533] rounded border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="modal-ethics"
                  checked={newThreadEthicsAgreed}
                  onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-[#D4A359]"
                  required
                />
                <label htmlFor="modal-ethics" className="text-xs text-gray-700 dark:text-stone-300 leading-relaxed cursor-pointer select-none">
                  ※ この問いは自他の尊厳を照らし、共に知を深めるためのものですか？
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
                  disabled={!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-5 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-medium rounded hover:opacity-90 disabled:opacity-40 transition"
                >
                  スレッドを公開する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}




