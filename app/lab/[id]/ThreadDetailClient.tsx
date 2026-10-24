"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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

export default function ThreadDetailClient({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [categories, setCategories] = useState<ForumCategory[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [isEditingThread, setIsEditingThread] = useState(false)
  const [editThreadTitle, setEditThreadTitle] = useState("")
  const [editThreadContent, setEditThreadContent] = useState("")
  const [isSavingThread, setIsSavingThread] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editPostContent, setEditPostContent] = useState("")
  const [isSavingPost, setIsSavingPost] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted || !threadId) return
    loadThreadData()
  }, [hasMounted, threadId])

  async function loadThreadData() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        setUserProfile(profile)
      }

      const { data: catData } = await supabase
        .from("forum_categories")
        .select("*")
        .order("display_order", { ascending: true })

      if (catData && catData.length > 0) {
        setCategories(catData as ForumCategory[])
      }

      const { data: threadData, error: threadError } = await supabase
        .from("forum_threads")
        .select(`
          *,
          author:profiles!author_id ( display_name, username, role ),
          posts:forum_posts (
            *,
            author:profiles!author_id ( display_name, username, role )
          )
        `)
        .eq("id", threadId)
        .maybeSingle()

      if (threadError) throw threadError

      if (!threadData) {
        setError("指定された対話トピックは見つかりませんでした。")
        setThread(null)
      } else {
        if (threadData.posts && Array.isArray(threadData.posts)) {
          threadData.posts.sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
        setThread(threadData as unknown as ForumThread)
        setEditThreadTitle(threadData.title || "")
        setEditThreadContent(threadData.content || "")
      }
    } catch (err: any) {
      console.error("トピック詳細取得エラー:", err)
      setError("対話データの読み込み中にエラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (typeof window === "undefined") return
    const url = window.location.href.split("?")[0]
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleUpdateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thread || !editThreadTitle.trim() || !editThreadContent.trim() || !currentUser) return

    try {
      setIsSavingThread(true)
      const nowIso = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("forum_threads")
        .update({
          title: editThreadTitle.trim(),
          content: editThreadContent.trim(),
          updated_at: nowIso,
        })
        .eq("id", thread.id)
        .eq("author_id", currentUser.id)

      if (updateError) throw updateError

      setIsEditingThread(false)
      await loadThreadData()
    } catch (err: any) {
      alert("スレッドの更新に失敗しました: " + (err.message || "エラーが発生しました"))
    } finally {
      setIsSavingThread(false)
    }
  }

  const handleDeleteThread = async (targetId: string) => {
    if (!confirm("この対話スレッドを削除しますか？返信応答もすべて削除されます。")) return

    try {
      const { error: deleteError } = await supabase
        .from("forum_threads")
        .delete()
        .eq("id", targetId)

      if (deleteError) throw deleteError

      alert("スレッドを削除しました。")
      router.push("/lab")
    } catch (err: any) {
      alert("削除に失敗しました: " + err.message)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#5A6275] dark:text-stone-400 tracking-widest text-sm font-sans">
            言葉の対話を静かに読み込んでいます...
          </p>
        </div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-16 px-6">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-sm font-sans">
            {error || "トピックが見つかりませんでした。"}
          </div>
          <Link
            href="/lab"
            className="inline-flex items-center gap-2 text-xs font-sans text-[#D4A359] hover:underline"
          >
            <span>&larr;</span>
            <span>Pratyaya Lab（フォーラム一覧）へ戻る</span>
          </Link>
        </div>
      </div>
    )
  }

  const activeThread = thread
  const activeThreadId = thread.id

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased pb-28 selection:bg-[#D4A359]/20">
      
      {/* ナビゲーションバー */}
      <nav className="border-b border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8]/80 dark:bg-[#121621]/80 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 font-sans text-xs">
          <Link
            href="/lab"
            className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition font-medium"
          >
            <span>&larr;</span>
            <span>Pratyaya Lab 一覧へ戻る</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-700 rounded text-stone-700 dark:text-stone-200 hover:border-[#D4A359] transition shadow-2xs font-medium"
              title="この対話の固有URLをコピー"
            >
              <span>{copied ? "✓" : "🔗"}</span>
              <span>{copied ? "コピー完了！" : "トピックURLをコピー"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* メイン対話エリア */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                <div className="bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-800 rounded-xl p-6 sm:p-8 space-y-8 shadow-sm">
                  
                  {/* スレッドヘッダー */}
                  <div className="space-y-4 border-b border-[#E2DDD5] dark:border-stone-800 pb-6">
                    <div className="flex items-center justify-between text-xs font-sans text-stone-400">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#D4A359]/20 text-[#D4A359] rounded font-medium">
                          {categories.find((c) => c.id === activeThread.category_id)?.name || '対話'}
                        </span>
                        <Link href={`/authors/${activeThread.author_id}`} className="hover:text-[#D4A359] transition font-medium text-stone-700 dark:text-stone-300">
                          {activeThread.author?.display_name || activeThread.author?.username || activeThread.author_name || '無名'}
                        </Link>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span>{new Date(activeThread.created_at).toLocaleDateString('ja-JP')}</span>
                          {activeThread.updated_at && activeThread.updated_at !== activeThread.created_at && (
                            <span className="text-[10px] text-stone-400">（推敲・編集済み）</span>
                          )}
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
                        <div className="mt-6 p-4 sm:p-5 bg-[#F4F0E8]/70 dark:bg-[#1E2533]/70 rounded-xl border border-[#E2DDD5] dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
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
                            onClick={handleCopyLink}
                            className="px-4 py-2 bg-white dark:bg-[#242B3B] border border-[#E2DDD5] dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 hover:border-[#D4A359] transition font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
                          >
                            <span>{copied ? "✓" : "🔗"}</span>
                            <span>{copied ? "コピー完了！" : "トピックURLをコピー"}</span>
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

      </main>
    </div>
  )
}
