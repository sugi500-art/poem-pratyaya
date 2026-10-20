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

interface LabPost {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  profiles?: Profile
}

export default function LabPage() {
  const [posts, setPosts] = useState<LabPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // フォーム用状態
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [ethicsAgreed, setEthicsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
    checkCurrentUser()
  }, [])

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  // 投稿一覧と投稿者プロファイルの取得
  async function fetchPosts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lab_posts')
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('フォーラム取得エラー:', error)
      } else if (data) {
        setPosts(data as unknown as LabPost[])
      }
    } catch (err) {
      console.error('読み込みエラー:', err)
    } finally {
      setLoading(false)
    }
  }

  // 新規トピック投稿処理
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatusMsg(null)

    if (!currentUser) {
      setStatusMsg({ type: 'error', text: '対話に参加するにはログインが必要です。' })
      return
    }

    if (!title.trim() || !content.trim()) {
      setStatusMsg({ type: 'error', text: 'タイトルと本文を入力してください。' })
      return
    }

    if (!ethicsAgreed) {
      setStatusMsg({ type: 'error', text: '倫理指針の確認チェックを入れてください。' })
      return
    }

    try {
      setIsSubmitting(true)

      const { data, error } = await supabase
        .from('lab_posts')
        .insert({
          user_id: currentUser.id,
          title: title.trim(),
          content: content.trim(),
        })
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single()

      if (error) throw error

      setPosts((prev) => [data as unknown as LabPost, ...prev])
      setTitle('')
      setContent('')
      setEthicsAgreed(false)
      setStatusMsg({ type: 'success', text: '対話の問いかけ（トピック）を投稿しました。' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || '投稿に失敗しました。' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased pb-20">
      {/* 画面ヘッダー */}
      <header className="border-b border-[#E5E0D8] bg-[#FBF9F5]/90 backdrop-blur sticky top-16 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium block">
              Pratyaya Lab
            </span>
            <h1 className="text-xl font-normal tracking-wide text-[#1A1F2C]">
              対話と深層批判の部屋
            </h1>
          </div>
          <Link href="/" className="text-xs font-sans text-stone-500 hover:text-[#1A1F2C] transition">
            ← トップへ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">
        {/* 新規問いかけ投稿フォーム */}
        <section className="bg-white border border-[#E5E0D8] rounded-lg p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-[#E5E0D8] pb-3">
            <h2 className="text-base font-normal text-[#1A1F2C]">
              新しい問い（トピック）を投ずる
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-1">
              作品の構造、一音の選択、あるいは推敲の深層について語り合います。
            </p>
          </div>

          {statusMsg && (
            <div
              className={`p-4 rounded text-xs font-sans leading-relaxed ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs text-stone-600 mb-1">問いの題名（タイトル）</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：推敲の過程における一音の響きについて"
                className="w-full p-2.5 border border-[#E5E0D8] rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C]"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs text-stone-600 mb-1">内容</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="対話の端緒となる言葉や疑問を記してください..."
                className="w-full p-2.5 border border-[#E5E0D8] rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C] resize-y"
                disabled={isSubmitting}
              />
            </div>

            {/* 倫理確認チェック */}
            <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded text-xs font-serif">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ethicsAgreed}
                  onChange={(e) => setEthicsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-[#1A1F2C] focus:ring-[#D4A359]"
                />
                <span className="text-stone-700 leading-relaxed">
                  人格攻撃や非難を排し、表現された言葉や構造に対して誠実に対話します。
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim() || !ethicsAgreed}
                className="px-6 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-wider rounded font-serif hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isSubmitting ? '送信中...' : '問いを投稿する'}
              </button>
            </div>
          </form>
        </section>

        {/* 投稿スレッド一覧 */}
        <section className="space-y-6">
          <div className="border-b border-[#E5E0D8] pb-3 flex justify-between items-end">
            <h2 className="text-lg font-normal text-[#1A1F2C]">
              交わされている対話（スレッド）
            </h2>
            <span className="text-xs text-stone-400 font-sans">
              全 {posts.length} 件の問い
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs font-sans text-stone-400">
              対話を読み込んでいます...
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => {
                // 正しい表示名の判定
                const authorName =
                  post.profiles?.display_name || post.profiles?.username || '無名の表現者'
                const isMyPost = currentUser && post.user_id === currentUser.id

                return (
                  <div
                    key={post.id}
                    className="p-6 bg-white border border-[#E5E0D8] rounded-lg shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-normal text-[#1A1F2C]">
                        {post.title}
                      </h3>
                      <span className="text-xs font-sans text-stone-400">
                        {new Date(post.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <p className="text-sm text-stone-700 font-serif whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>

                    {/* 投稿者名の表示（誰が見ても筆名が表示され、自分の時だけ（あなた）と補足） */}
                    <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs font-sans">
                      <div className="text-stone-600 font-serif">
                        発言者：<span className="font-medium text-[#1A1F2C]">{authorName}</span>
                        {isMyPost && (
                          <span className="ml-1.5 text-[11px] text-stone-400 font-sans font-normal">
                            （あなた）
                          </span>
                        )}
                        {post.profiles?.role === 'advisor' && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] rounded font-sans">
                            特別選者
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white p-8 text-center rounded border border-[#E5E0D8] text-xs font-sans text-stone-500">
              まだ対話は始まっていません。最初の問いを投稿してみましょう。
            </div>
          )}
        </section>
      </main>
    </div>
  )
}