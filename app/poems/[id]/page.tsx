'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url?: string | null
  role: 'user' | 'advisor' | 'admin'
}

interface Poem {
  id: string
  author_id: string
  title: string
  content: string
  writing_mode: 'vertical' | 'horizontal'
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  author?: Profile
}

interface Review {
  id: string
  poem_id: string
  reviewer_id: string
  content: string
  is_official_curation: boolean
  created_at: string
  reviewer?: Profile
}

export default function PoemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 の非同期 params を React.use で解凍して取得
  const { id } = use(params)

  const [poem, setPoem] = useState<Poem | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 表示モード（初期値は縦書き、読者がトグル切り替え可能）
  const [viewWritingMode, setViewWritingMode] = useState<'vertical' | 'horizontal'>('vertical')

  // 新規鑑賞文入力状態
  const [newReviewContent, setNewReviewContent] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewEthicsAgreed, setReviewEthicsAgreed] = useState(false)
  const [reviewStatusMsg, setReviewStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ログインユーザー情報
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    if (id) {
      fetchPoemAndReviews(id)
      checkCurrentUser()
    }
  }, [id])

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function fetchPoemAndReviews(poemId: string) {
    try {
      setLoading(true)
      setError(null)

      // 詩作品の取得
      const { data: poemData, error: poemError } = await supabase
        .from('poems')
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('id', poemId)
        .single()

      if (poemError || !poemData) {
        throw new Error('作品が見つからないか、まだ公開されていません。')
      }

      setPoem(poemData as Poem)
      setViewWritingMode(poemData.writing_mode || 'vertical')

      // 鑑賞文・選評の取得
      const { data: reviewData, error: reviewError } = await supabase
        .from('poem_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('poem_id', poemId)
        .order('is_official_curation', { ascending: false })
        .order('created_at', { ascending: true })

      if (reviewError) {
        console.error('鑑賞文取得エラー:', reviewError)
      } else {
        setReviews((reviewData || []) as Review[])
      }
    } catch (err: any) {
      setError(err.message || '読み込み中にエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  // 鑑賞文の送信処理
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault()
    setReviewStatusMsg(null)

    if (!currentUser) {
      setReviewStatusMsg({ type: 'error', text: '鑑賞文を寄せるにはログインが必要です。' })
      return
    }

    if (!newReviewContent.trim()) {
      setReviewStatusMsg({ type: 'error', text: '鑑賞文の本文を入力してください。' })
      return
    }

    if (!reviewEthicsAgreed) {
      setReviewStatusMsg({ type: 'error', text: '倫理指針の確認にチェックを入れてください。' })
      return
    }

    try {
      setIsSubmittingReview(true)

      const { data, error: insertError } = await supabase
        .from('poem_reviews')
        .insert({
          poem_id: id,
          reviewer_id: currentUser.id,
          content: newReviewContent.trim(),
          is_official_curation: false,
        })
        .select(`
          *,
          reviewer:profiles!reviewer_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single()

      if (insertError) throw insertError

      setReviews((prev) => [...prev, data as Review])
      setNewReviewContent('')
      setReviewEthicsAgreed(false)
      setReviewStatusMsg({ type: 'success', text: '言葉を繋ぐ鑑賞文を投稿しました。' })
    } catch (err: any) {
      setReviewStatusMsg({ type: 'error', text: err.message || '鑑賞文の送信に失敗しました。' })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#5A6275] tracking-widest text-sm">言葉の空間を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error || !poem) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif px-4">
        <div className="max-w-md w-full bg-white border border-[#E5E0D8] p-8 text-center rounded space-y-6 shadow-sm">
          <h1 className="text-xl font-medium text-[#1A1F2C]">作品が見つかりません</h1>
          <p className="text-sm text-[#5A6275] leading-relaxed">{error}</p>
          <p className="text-xs text-stone-400">※ テスト用ID（sample-idなど）の場合、データベース未登録のためこちらの画面になります。</p>
          <div className="pt-2">
            <Link
              href="/poems/new"
              className="inline-block px-6 py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-widest rounded hover:bg-[#2C3448] transition-colors"
            >
              自分で詩を投稿してみる
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const officialReviews = reviews.filter((r) => r.is_official_curation)
  const generalReviews = reviews.filter((r) => !r.is_official_curation)

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased">
      {/* ナビゲーションヘッダー */}
      <header className="border-b border-[#E5E0D8] bg-[#FBF9F5]/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/terms"
            className="text-xs tracking-widest text-[#5A6275] hover:text-[#1A1F2C] transition-colors"
          >
            ← 利用規約へ
          </Link>

          <Link href="/" className="text-sm font-semibold tracking-widest text-[#1A1F2C]">
            Poem pratyaya
          </Link>

          {/* 縦書き/横書き切り替えボタン */}
          <div className="flex items-center space-x-1 bg-[#EBE6DD] p-1 rounded text-xs tracking-wider">
            <button
              type="button"
              onClick={() => setViewWritingMode('vertical')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'vertical'
                  ? 'bg-white text-[#1A1F2C] shadow-sm font-medium'
                  : 'text-[#5A6275] hover:text-[#1A1F2C]'
              }`}
            >
              縦書き
            </button>
            <button
              type="button"
              onClick={() => setViewWritingMode('horizontal')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'horizontal'
                  ? 'bg-white text-[#1A1F2C] shadow-sm font-medium'
                  : 'text-[#5A6275] hover:text-[#1A1F2C]'
              }`}
            >
              横書き
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* 作品表示エリア */}
        <article className="bg-white border border-[#E5E0D8] shadow-sm rounded-lg p-8 md:p-16 relative overflow-hidden">
          <div className="mb-12 border-b border-[#E5E0D8] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs text-[#8C92A4] tracking-widest uppercase block mb-1">Poem</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[#1A1F2C]">{poem.title}</h1>
            </div>

            <div className="text-right space-y-1">
              <p className="text-sm font-medium text-[#1A1F2C]">
                {poem.author?.display_name || poem.author?.username || '匿名'}
              </p>
              <p className="text-xs text-[#8C92A4] tracking-widest">
                {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
              </p>
            </div>
          </div>

          {/* 詩本文 */}
          {viewWritingMode === 'vertical' ? (
            <div className="w-full overflow-x-auto py-8 px-4 flex justify-end">
              <div
                className="text-justify h-[55vh] md:h-[65vh] overflow-x-auto overflow-y-hidden pr-6 pl-12 py-4 whitespace-pre-wrap font-serif text-lg leading-loose tracking-widest text-[#1A1F2C] border-r border-[#F0EBE1]"
                style={{ writingMode: 'vertical-rl' }}
              >
                {poem.content}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto py-8 px-4">
              <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed tracking-wider text-[#1A1F2C] text-justify space-y-4">
                {poem.content}
              </div>
            </div>
          )}
        </article>

        {/* 鑑賞文セクション */}
        <section className="space-y-8">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-widest text-[#1A1F2C]">読者からの鑑賞文 ({generalReviews.length})</h2>
            <span className="text-xs text-[#8C92A4]">順位付けなき深層対話</span>
          </div>

          {generalReviews.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E5E0D8] rounded p-8 space-y-2">
              <p className="text-sm text-[#5A6275]">まだ鑑賞文は寄せられていません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generalReviews.map((review) => (
                <div key={review.id} className="bg-white border border-[#E5E0D8] rounded-lg p-6 space-y-2">
                  <div className="flex justify-between text-xs text-[#8C92A4]">
                    <span>{review.reviewer?.display_name || '読者'}</span>
                    <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <p className="text-sm text-[#2C3448] whitespace-pre-wrap">{review.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}