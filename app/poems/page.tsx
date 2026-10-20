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

export default function PoemCatalogPage() {
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 検索・フィルター状態
  const [searchQuery, setSearchQuery] = useState('')
  const [filterWritingMode, setFilterWritingMode] = useState<'all' | 'vertical' | 'horizontal'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchPublishedPoems()
  }, [])

  async function fetchPublishedPoems() {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
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
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (fetchError) throw fetchError

      setPoems((data || []) as Poem[])
    } catch (err: any) {
      console.error('詩篇一覧取得エラー:', err)
      setError('詩篇目録の読み込みに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  // 検索・フィルタリング処理
  const filteredPoems = poems.filter((poem) => {
    // 組み方向フィルター
    if (filterWritingMode !== 'all' && poem.writing_mode !== filterWritingMode) {
      return false
    }

    // クエリ検索（題名、本文、筆名）
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = poem.title.toLowerCase().includes(q)
      const contentMatch = poem.content.toLowerCase().includes(q)
      const authorMatch = (poem.author?.display_name || poem.author?.username || '').toLowerCase().includes(q)

      return titleMatch || contentMatch || authorMatch
    }

    return true
  })

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ナビゲーション */}
        <nav className="flex justify-between items-center border-b border-stone-200/80 dark:border-stone-800 pb-4">
          <Link href="/" className="text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition">
            ← 言葉の聖域（トップページ）へ戻る
          </Link>
          <Link
            href="/poems/new"
            className="px-4 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:opacity-90 transition font-medium"
          >
            ＋ 一篇の詩を紡ぐ
          </Link>
        </nav>

        {/* ページヘッダー */}
        <header className="text-center border-b border-stone-200/80 dark:border-stone-800 pb-8 space-y-3">
          <p className="text-xs font-sans tracking-widest text-[#D4A359] dark:text-[#E5B869] uppercase font-medium">
            Poem Pratyaya — Archive of Resonances
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            詩篇アーカイヴ目録
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-sans max-w-lg mx-auto leading-relaxed">
            数字による競い合いを排し、一作一作の言葉が持つ「響き」と「余韻」を静かに耳を澄ませて味わう目録です。
          </p>
        </header>

        {/* 検索 & フィルターコントロール */}
        <div className="bg-white/90 dark:bg-[#242B3B]/90 p-4 sm:p-6 rounded-lg border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between font-sans text-xs">
          {/* 検索キーワード入力 */}
          <div className="w-full md:w-72 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="題名・本文・詩人名で絞り込み..."
              className="w-full px-3.5 py-2 bg-[#FBF9F5]/80 dark:bg-[#12161F]/80 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:border-[#D4A359] text-xs font-serif"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* 組み方向フィルター */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-stone-500 dark:text-stone-400">表示形式：</span>
            <button
              onClick={() => setFilterWritingMode('all')}
              className={`px-3 py-1.5 rounded transition ${
                filterWritingMode === 'all'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilterWritingMode('vertical')}
              className={`px-3 py-1.5 rounded transition ${
                filterWritingMode === 'vertical'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              縦書き
            </button>
            <button
              onClick={() => setFilterWritingMode('horizontal')}
              className={`px-3 py-1.5 rounded transition ${
                filterWritingMode === 'horizontal'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              横書き
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        {loading ? (
          <div className="py-20 text-center space-y-3 font-serif">
            <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-sans text-stone-500 dark:text-stone-400">言葉の目録を読み込んでいます...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white/80 dark:bg-[#242B3B]/80 border border-stone-200 dark:border-stone-800 rounded-lg space-y-3">
            <p className="text-xs font-sans text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={fetchPublishedPoems}
              className="text-xs font-sans text-stone-600 dark:text-stone-300 underline hover:text-[#D4A359]"
            >
              再読み込みを試みる
            </button>
          </div>
        ) : filteredPoems.length === 0 ? (
          <div className="py-16 text-center bg-white/60 dark:bg-[#242B3B]/60 border border-stone-200/80 dark:border-stone-800 rounded-lg space-y-2">
            <p className="text-sm font-serif text-stone-600 dark:text-stone-300">
              {searchQuery ? '条件に一致する詩篇は見つかりませんでした。' : 'まだ公開された詩篇はありません。'}
            </p>
            <p className="text-xs font-sans text-stone-400">
              最初に言葉を紡ぎ、静かに手渡してみませんか。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPoems.map((poem) => (
              <article
                key={poem.id}
                className="bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200/80 dark:border-stone-800 rounded-lg p-6 hover:border-[#D4A359]/60 dark:hover:border-[#D4A359]/60 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* ヘッダー情報（組み方向 & 投稿日） */}
                  <div className="flex items-center justify-between text-[11px] font-sans text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-stone-700 dark:text-stone-300">
                      {poem.writing_mode === 'vertical' ? '縦書き' : '横書き'}
                    </span>
                    <span>
                      {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
                    </span>
                  </div>

                  {/* 題名 */}
                  <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100 line-clamp-1">
                    <Link
                      href={`/poems/${poem.id}`}
                      className="hover:text-[#D4A359] dark:hover:text-[#E5B869] transition"
                    >
                      『{poem.title}』
                    </Link>
                  </h2>

                  {/* 詩人情報 */}
                  <div className="flex items-center gap-2 text-xs font-sans">
                    <span className="text-stone-500 dark:text-stone-400">詩人：</span>
                    <Link
                      href={`/profile/${poem.author?.username || 'anonymous'}`}
                      className="text-stone-800 dark:text-stone-200 hover:text-[#D4A359] transition font-medium"
                    >
                      {poem.author?.display_name || poem.author?.username || '無名の表現者'}
                    </Link>
                    {poem.author?.role === 'admin' && (
                      <span className="text-[10px] bg-[#1A1F2C] text-[#FBF9F5] px-1.5 py-0.5 rounded">主宰</span>
                    )}
                    {poem.author?.role === 'advisor' && (
                      <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.5 rounded">特別選者</span>
                    )}
                  </div>

                  {/* 冒頭の抜粋 */}
                  <p className="text-xs font-serif leading-relaxed text-stone-600 dark:text-stone-300 line-clamp-3 pt-2 italic">
                    「{poem.content}」
                  </p>
                </div>

                {/* 鑑賞ページへの導くボタン */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                  <Link
                    href={`/poems/${poem.id}`}
                    className="text-xs font-sans text-[#D4A359] dark:text-[#E5B869] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>言葉の空間で鑑賞する</span>
                    <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}