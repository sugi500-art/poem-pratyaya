'use client'

import React, { useState } from 'react'

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

// --- 初期データ (4つの対話カテゴリ & 初期スレッド) ---
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
    author_id: 'user-001',
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
        author_id: 'user-002',
        author_name: '三浦果実',
        author_role: 'advisor',
        content: `言葉を単なる自己主張や優劣の競い合い（二元論）から解放したとき、初めて言葉そのものの音響（Vāc）と論理（Logos）が静かに響き始めますね。

言葉の錬成とは、自分のエゴを固執させることではなく、むしろ「空（śūnyatā）」の境地において、世界と自分が相互に依存し合っている（動的縁起）事実を言葉として織り直す作業だと感じます。この対話空間自体が、その錬成の炉になることを期待しています。`,
        created_at: '2026-10-17T22:15:00Z',
      },
      {
        id: 'post-102',
        thread_id: 'thread-1',
        author_id: 'user-003',
        author_name: '風の読者',
        author_role: 'user',
        content: `自分の詩の推敲で行き詰まっていたとき、言葉の意味だけに縛られず「行間の沈黙」や「音の余韻」を意識することで、今まで見えなかった感情の輪郭が浮き彫りになる体験をしました。他者からの批評も「光を当てる灯火」として受け取れるこの場の空気がありがたいです。`,
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

export default function ForumLabPage() {
  const [categories] = useState<ForumCategory[]>(INITIAL_CATEGORIES)
  const [threads, setThreads] = useState<ForumThread[]>(INITIAL_THREADS)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thread-1')
  
  // 新規スレッドモーダル状態
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false)
  const [newThreadCategory, setNewThreadCategory] = useState('cat-1')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [newThreadEthicsAgreed, setNewThreadEthicsAgreed] = useState(false)

  // 新規返信状態
  const [replyContent, setReplyContent] = useState('')
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)

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
      author_id: 'current-user',
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
  }

  // 返信送信ハンドラ
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeThread || !replyContent.trim() || !replyEthicsAgreed) return

    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      thread_id: activeThread.id,
      author_id: 'current-user',
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

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased pb-20">
      {/* ページヘッダー */}
      <header className="border-b border-[#E2DDD5] bg-[#F4F0E8] py-10 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <p className="text-xs tracking-[0.2em] text-[#D4A359] uppercase font-sans">
            Pratyaya Lab / 言語・思想対話空間
          </p>
          <h1 className="text-3xl md:text-4xl font-normal tracking-wide text-[#1A1F2C]">
            Pratyaya Lab（対話の空地）
          </h1>
          <p className="max-w-2xl mx-auto text-sm leading-relaxed text-gray-600 font-sans">
            詩を縁（pratyaya）として持ちより、言葉の解釈と知の構造化を深める静寂な対話空間です。
            勝敗や優劣を競う二元論を離れ、他者の尊厳と良心を照らす対話を重ねます。
          </p>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* カテゴリタブ & スレッド作成ボタン */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2DDD5] pb-6 mb-8">
          {/* カテゴリフィルター */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-[#1A1F2C] text-[#FBF9F5]'
                  : 'bg-[#F4F0E8] text-gray-700 hover:bg-[#EAE4D8]'
              }`}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 text-xs font-sans rounded transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#1A1F2C] text-[#FBF9F5]'
                    : 'bg-[#F4F0E8] text-gray-700 hover:bg-[#EAE4D8]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 新規スレッド立てボタン */}
          <button
            onClick={() => setIsNewThreadOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#D4A359] hover:bg-[#C29248] text-white text-xs tracking-wider font-sans rounded shadow-sm transition-colors"
          >
            ＋ 新しい問いを投稿する（スレッド作成）
          </button>
        </div>

        {/* スレッドレイアウト（2カラム：左リスト、右詳細） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左側：スレッド一覧 */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs tracking-widest text-gray-500 font-sans uppercase mb-2">
              スレッド一覧 ({filteredThreads.length}件)
            </h2>

            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center bg-[#F4F0E8] rounded text-sm text-gray-500 font-sans">
                該当するスレッドはまだありません。新しい問いを立ててみましょう。
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const category = categories.find((c) => c.id === thread.category_id)
                const isActive = activeThreadId === thread.id

                return (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`p-5 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'border-[#D4A359] bg-white shadow-md'
                        : 'border-[#E2DDD5] bg-[#F4F0E8]/60 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 font-sans mb-2">
                      <span className="px-2 py-0.5 bg-[#EAE4D8] text-gray-800 rounded text-[10px]">
                        {category?.name || 'カテゴリ'}
                      </span>
                      <span>返信 {thread.posts_count}件</span>
                    </div>

                    <h3 className="text-base font-medium leading-snug text-[#1A1F2C] mb-2 line-clamp-2">
                      {thread.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-gray-500 font-sans pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <span>{thread.author_name}</span>
                        {thread.author_role === 'admin' && (
                          <span className="text-[10px] text-[#D4A359] border border-[#D4A359] px-1 rounded">主宰</span>
                        )}
                        {thread.author_role === 'advisor' && (
                          <span className="text-[10px] text-emerald-700 border border-emerald-600 px-1 rounded">特別選者</span>
                        )}
                      </span>
                      <span>{new Date(thread.last_activity_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 右側：スレッド詳細・対話 */}
          <div className="lg:col-span-7">
            {activeThread ? (
              <div className="bg-white border border-[#E2DDD5] rounded-xl p-6 md:p-8 space-y-8 shadow-sm">
                {/* スレッドヘッダー */}
                <div className="border-b border-[#E2DDD5] pb-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#F4F0E8] text-[#1A1F2C] text-xs font-sans rounded">
                      {categories.find((c) => c.id === activeThread.category_id)?.name}
                    </span>
                    <span className="text-xs text-gray-400 font-sans">
                      {new Date(activeThread.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-normal text-[#1A1F2C] leading-snug">
                    {activeThread.title}
                  </h2>

                  <div className="flex items-center gap-2 pt-2 text-xs font-sans text-gray-600">
                    <span className="font-medium text-[#1A1F2C]">{activeThread.author_name}</span>
                    {activeThread.author_role === 'admin' && (
                      <span className="text-[10px] bg-[#1A1F2C] text-[#FBF9F5] px-1.5 py-0.5 rounded">主宰</span>
                    )}
                    {activeThread.author_role === 'advisor' && (
                      <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded">特別選者</span>
                    )}
                  </div>
                </div>

                {/* スレッド本文 */}
                <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-serif bg-[#FBF9F5] p-5 rounded-lg border border-[#E2DDD5]">
                  {activeThread.content}
                </div>

                {/* 返信ポスト一覧 */}
                <div className="space-y-6 pt-4">
                  <h3 className="text-xs tracking-widest text-gray-500 font-sans uppercase border-b border-[#E2DDD5] pb-2">
                    対話・応答 ({activeThread.posts?.length || 0}件)
                  </h3>

                  {activeThread.posts && activeThread.posts.length > 0 ? (
                    activeThread.posts.map((post, idx) => (
                      <div
                        key={post.id}
                        className="p-5 rounded-lg bg-[#F4F0E8]/40 border border-[#E2DDD5] space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs font-sans text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1A1F2C]">{post.author_name}</span>
                            {post.author_role === 'admin' && (
                              <span className="text-[10px] text-[#D4A359] border border-[#D4A359] px-1 rounded">主宰</span>
                            )}
                            {post.author_role === 'advisor' && (
                              <span className="text-[10px] text-emerald-700 border border-emerald-600 px-1 rounded">アドバイザー</span>
                            )}
                          </div>
                          <span className="text-gray-400">
                            #{idx + 1} ・ {new Date(post.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-800 font-serif whitespace-pre-wrap">
                          {post.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 font-sans italic">
                      まだ応答はありません。静かな対話の最初の一言を添えてみましょう。
                    </p>
                  )}
                </div>

                {/* 返信フォーム */}
                <form onSubmit={handleSendReply} className="pt-6 border-t border-[#E2DDD5] space-y-4">
                  <h4 className="text-sm font-medium text-[#1A1F2C] font-sans">対話に応答する</h4>

                  <textarea
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="言葉の意味、構造、音響への想いを誠実にお書きください..."
                    className="w-full p-4 border border-[#E2DDD5] rounded-lg bg-[#FBF9F5] focus:bg-white text-sm font-serif text-[#1A1F2C] focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
                    required
                  />

                  {/* 倫理確認チェックボックス */}
                  <div className="p-3 bg-[#F4F0E8] rounded border border-[#E2DDD5] flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="reply-ethics"
                      checked={replyEthicsAgreed}
                      onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                      className="mt-0.5 accent-[#1A1F2C] h-4 w-4"
                      required
                    />
                    <label htmlFor="reply-ethics" className="text-xs text-gray-700 font-sans leading-snug cursor-pointer">
                      <span className="font-semibold text-[#D4A359]">【倫理確認】</span>
                      この言葉は、作品の解釈を深め、他者の尊厳と良心を照らすものですか？（人格攻撃や無遠慮な否定を含まないことを確認します）
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || !replyEthicsAgreed}
                      className="px-6 py-2.5 bg-[#1A1F2C] hover:bg-[#2C3242] disabled:bg-gray-300 text-[#FBF9F5] text-xs font-sans tracking-wider rounded transition-colors"
                    >
                      対話文を送信する
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-[#E2DDD5] rounded-xl p-12 text-center text-gray-500 font-sans text-sm">
                左側のスレッド一覧から対話を選択してください。
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 新規スレッド作成モーダル */}
      {isNewThreadOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F5] border border-[#E2DDD5] rounded-xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-4">
              <h3 className="text-lg font-normal text-[#1A1F2C]">新しい問いを立てる（スレッド作成）</h3>
              <button
                type="button"
                onClick={() => setIsNewThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-sans text-sm"
              >
                ✕ 閉じる
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-sans text-gray-700 mb-1">対話カテゴリ</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full p-3 border border-[#E2DDD5] rounded bg-white text-sm font-sans text-[#1A1F2C]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-sans text-gray-700 mb-1">スレッドタイトル（問い）</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="例：言葉の音響（Vāc）と論理（Logos）の調和について"
                  className="w-full p-3 border border-[#E2DDD5] rounded bg-white text-sm font-serif text-[#1A1F2C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-sans text-gray-700 mb-1">問いの背景・思考（本文）</label>
                <textarea
                  rows={6}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="問いを投げかける背景や、ご自身の言葉に対する考えを丁寧にお書きください..."
                  className="w-full p-3 border border-[#E2DDD5] rounded bg-white text-sm font-serif text-[#1A1F2C]"
                  required
                />
              </div>

              {/* 倫理同意 */}
              <div className="p-3 bg-[#F4F0E8] rounded border border-[#E2DDD5] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="new-thread-ethics"
                  checked={newThreadEthicsAgreed}
                  onChange={(e) => setNewThreadEthicsAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#1A1F2C] h-4 w-4"
                  required
                />
                <label htmlFor="new-thread-ethics" className="text-xs text-gray-700 font-sans leading-snug cursor-pointer">
                  <span className="font-semibold text-[#D4A359]">【倫理確認】</span>
                  この問いは、詩と思索を深め、他者の尊厳と良心を尊重する言葉で記述されていますか？
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewThreadOpen(false)}
                  className="px-4 py-2 border border-[#E2DDD5] text-xs font-sans text-gray-600 rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadEthicsAgreed}
                  className="px-6 py-2 bg-[#1A1F2C] hover:bg-[#2C3242] disabled:bg-gray-300 text-[#FBF9F5] text-xs font-sans tracking-wider rounded transition-colors"
                >
                  スレッドを開設する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}