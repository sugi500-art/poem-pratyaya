'use client'

import React, { useState, useEffect } from 'react'
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

export default function PoemDetailPage({ params }: { params: { id: string } }) {
  const [poem, setPoem] = useState<Poem | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 表示モード（初期値は作品の設定、読者が切り替え可能）
  const [viewWritingMode, setViewWritingMode] = useState<'vertical' | 'horizontal'>('vertical')

  // 新規鑑賞文入力状態
  const [newReviewContent, setNewReviewContent] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewEthicsAgreed, setReviewEthicsAgreed] = useState(false)
  const [reviewStatusMsg, setReviewStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ユーザー状態
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchPoemAndReviews()
    checkCurrentUser()
  }, [params.id])

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function fetchPoemAndReviews() {
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
        .eq('id', params.id)
        .single()

      if (poemError || !poemData) {
        throw new Error('作品が見つからないか、非公開に設定されています。')
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
        .eq('poem_id', params.id)
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
          poem_id: params.id,
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
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-widest rounded hover:bg-[#2C3448] transition-colors"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  const officialReviews = reviews.filter((r) => r.is_official_curation)
  const generalReviews = reviews.filter((r) => !r.is_official_curation)

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased selection:bg-[#D4A359]/20 pb-20">
      {/* 画面上部コントロールバー */}
      <div className="border-b border-[#E5E0D8] bg-[#FBF9F5]/90 backdrop-blur sticky top-16 z-30 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xs tracking-widest text-[#5A6275] hover:text-[#1A1F2C] transition-colors flex items-center space-x-1"
          >
            <span>←</span>
            <span>トップ目次へ</span>
          </Link>

          {/* 縦書き・横書き表示切り替え */}
          <div className="flex items-center space-x-1 bg-[#EBE6DD] p-1 rounded text-xs tracking-wider">
            <button
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
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-16">
        {/* 作品表示エリア */}
        <article className="bg-white border border-[#E5E0D8] shadow-sm rounded-lg p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4A359]/10 to-transparent pointer-events-none rounded-bl-full" />

          {/* メタ情報 */}
          <div className="mb-12 border-b border-[#E5E0D8] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs text-[#8C92A4] tracking-widest uppercase block mb-1">Poem</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[#1A1F2C]">{poem.title}</h1>
            </div>

            <div className="text-right md:text-right space-y-1">
              <p className="text-sm font-medium text-[#1A1F2C]">
                {poem.author?.display_name || poem.author?.username || '無名の表現者'}
                {poem.author?.role === 'advisor' && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] rounded tracking-wider">
                    特別選者
                  </span>
                )}
              </p>
              <p className="text-xs text-[#8C92A4] tracking-widest">
                {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
              </p>
            </div>
          </div>

          {/* 本文エリア */}
          {viewWritingMode === 'vertical' ? (
            /* 縦書きモード */
            <div className="w-full overflow-x-auto py-8 px-4 flex justify-end">
              <div
                className="text-justify h-[55vh] md:h-[65vh] overflow-x-auto overflow-y-hidden pr-6 pl-12 py-4 whitespace-pre-wrap font-serif text-lg leading-loose tracking-widest text-[#1A1F2C] border-r border-[#F0EBE1]"
                style={{
                  writingMode: 'vertical-rl',
                  WebkitWritingMode: 'vertical-rl',
                }}
              >
                {poem.content}
              </div>
            </div>
          ) : (
            /* 横書きモード */
            <div className="max-w-2xl mx-auto py-8 px-4">
              <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed tracking-wider text-[#1A1F2C] text-justify space-y-4">
                {poem.content}
              </div>
            </div>
          )}
        </article>

        {/* 公式選評（月刊キュレーション） */}
        {officialReviews.length > 0 && (
          <section className="bg-[#FDFBF7] border-l-4 border-[#D4A359] border-y border-r border-[#E5E0D8] rounded-r-lg p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center space-x-3 border-b border-[#E5E0D8] pb-3">
              <span className="text-lg text-[#D4A359]">🕯️</span>
              <h2 className="text-base font-medium tracking-widest text-[#1A1F2C]">月刊公式選評・鑑賞文</h2>
            </div>

            <div className="space-y-6">
              {officialReviews.map((review) => (
                <div key={review.id} className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8C92A4]">
                    <span className="font-medium text-[#1A1F2C]">
                      {review.reviewer?.display_name || review.reviewer?.username} （選評）
                    </span>
                    <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#2C3448] whitespace-pre-wrap bg-white/60 p-4 rounded border border-[#E5E0D8]">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 読者鑑賞文（Pratyaya）セクション */}
        <section className="space-y-8">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-widest text-[#1A1F2C] flex items-center space-x-2">
              <span>読者からの鑑賞文（Pratyaya）</span>
              <span className="text-xs bg-[#EBE6DD] text-[#5A6275] px-2 py-0.5 rounded-full">
                {generalReviews.length}
              </span>
            </h2>
            <span className="text-xs text-[#8C92A4] tracking-wider">数字なき深層対話</span>
          </div>

          {/* 鑑賞文一覧 */}
          {generalReviews.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E5E0D8] rounded p-8 space-y-2">
              <p className="text-sm text-[#5A6275]">まだこの詩篇への鑑賞文は寄せられていません。</p>
              <p className="text-xs text-[#8C92A4]">静かに言葉を受け止め、最初の鑑賞文を寄せてみませんか。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generalReviews.map((review) => (
                <div key={review.id} className="bg-white border border-[#E5E0D8] rounded-lg p-6 space-y-3 shadow-sm hover:border-[#D4A359]/50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1A1F2C]">
                      {review.reviewer?.display_name || review.reviewer?.username || '静かな読者'}
                    </span>
                    <span className="text-[#8C92A4]">
                      {new Date(review.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#2C3448] whitespace-pre-wrap">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 鑑賞文投稿フォーム */}
          <div className="bg-white border border-[#E5E0D8] rounded-lg p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-medium tracking-widest text-[#1A1F2C] border-b border-[#E5E0D8] pb-3">
              この作品に鑑賞文を寄せる
            </h3>

            {reviewStatusMsg && (
              <div
                className={`p-4 rounded text-xs leading-relaxed ${
                  reviewStatusMsg.type === 'success'
                    ? 'bg-[#E8F3EE] text-[#1D5C42] border border-[#B3DBC8]'
                    : 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F8B4B4]'
                }`}
              >
                {reviewStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div>
                <label className="block text-xs text-[#5A6275] tracking-wider mb-2">
                  言葉の響きや像（イメージ）についての鑑賞・考察
                </label>
                <textarea
                  rows={4}
                  value={newReviewContent}
                  onChange={(e) => setNewReviewContent(e.target.value)}
                  placeholder="作品の一音・一節がもたらした感触、あるいは言葉の背景について静かに記してください..."
                  className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded p-4 text-sm text-[#1A1F2C] placeholder-[#8C92A4] focus:outline-none focus:border-[#D4A359] focus:bg-white transition-all font-serif resize-y"
                  disabled={isSubmittingReview}
                />
              </div>

              {/* 倫理確認チェック */}
              <div className="bg-[#FDFBF7] border border-[#E5E0D8] p-4 rounded space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewEthicsAgreed}
                    onChange={(e) => setReviewEthicsAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E5E0D8] text-[#D4A359] focus:ring-[#D4A359]"
                  />
                  <span className="text-xs text-[#2C3448] leading-relaxed select-none font-serif">
                    ※ この言葉は、作品と作者への敬意を払い、他者の尊厳を深め、良心を照らすものですか？（誹謗中傷や攻撃的な言説を排します）
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReviewContent.trim() || !reviewEthicsAgreed}
                  className="px-6 py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-widest rounded hover:bg-[#2C3448] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-sans"
                >
                  {isSubmittingReview ? '送信中...' : '鑑賞文を投稿する'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}