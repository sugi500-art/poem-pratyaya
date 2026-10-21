
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// --- 型定義 ---
interface Profile {
  display_name: string | null
  username: string | null
}

interface Poem {
  id: string
  title: string
  content: string
  published_at: string
  author_id: string
  writing_mode?: 'vertical' | 'horizontal'
  profiles?: Profile | null
}

export default function HomePage() {
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchPoems() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()

        // 公開済みの詩篇を取得（公開日時の新しい順）
        const { data, error: fetchError } = await supabase
          .from('poems')
          .select(`
            id,
            title,
            content,
            published_at,
            writing_mode,
            author_id,
            profiles:author_id ( display_name, username )
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(6)

        if (fetchError) {
          console.error('詩篇一覧取得エラー:', fetchError)
          if (isMounted) setError('作品の読み込みに失敗しました。時間をおいて再読み込みしてください。')
        } else if (data && isMounted) {
          setPoems(data as unknown as Poem[])
        }
      } catch (err) {
        console.error('データ取得中の予期せぬエラー:', err)
        if (isMounted) setError('予期せぬエラーが発生しました。')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPoems()

    return () => {
      isMounted = false
    }
  }, [])

  // 特選作品（先頭の作品）
  const featuredPoem = poems.length > 0 ? poems[0] : null

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* ヒーローエリア：月刊キュレーション（特選作品） */}
        <section className="bg-white/90 dark:bg-[#242B3B]/90 p-8 sm:p-12 rounded-lg border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6 relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 dark:border-stone-800 pb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A359]" />
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                Poem pratyaya — Monthly Curation
              </p>
            </div>
            <span className="text-[11px] font-sans text-stone-400 dark:text-stone-500">
              順位付けを行わない特選詩篇
            </span>
          </div>

          {featuredPoem ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
                  『{featuredPoem.title}』
                </h1>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
                  詩人：{featuredPoem.profiles?.display_name || '無名の表現者'}
                </p>
              </div>

              {/* 抜粋本文 */}
              <div className="p-6 bg-[#FBF9F5]/80 dark:bg-[#121621]/80 border-l-2 border-[#D4A359] rounded-r text-sm leading-loose text-stone-800 dark:text-stone-200 font-serif whitespace-pre-wrap max-h-48 overflow-hidden text-ellipsis shadow-inner">
                {featuredPoem.content}
              </div>

              {/* 選者による鑑賞文の抜粋 */}
              <div className="pt-2 text-xs font-sans text-stone-600 dark:text-stone-400 italic flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-stone-100/80 dark:border-stone-800">
                <p className="font-serif text-stone-700 dark:text-stone-300 leading-relaxed">
                  選者鑑賞：「言葉の響きが、私たちの内に潜む傷と静かに対話し照らし出す...」
                </p>
                <Link
                  href={`/poems/${featuredPoem.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:bg-stone-800 dark:hover:bg-[#C29248] transition tracking-wider shrink-0 shadow-sm font-medium"
                >
                  この一篇を深く鑑賞する →
                </Link>
              </div>
            </div>
          ) : (
            /* データ準備中・初期案内カード */
            <div className="py-8 text-center space-y-4">
              <h2 className="text-xl font-normal text-[#1A1F2C] dark:text-stone-100">
                言葉の聖域へ、ようこそ
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 font-sans max-w-lg mx-auto leading-relaxed">
                Poem pratyaya は評価や競い合いを離れ、言葉と静かに対話する場所です。<br className="hidden sm:inline" />
                現在、最初の一篇の投ぜられる刻（とき）を静かに待っています。
              </p>
              <div className="pt-2">
                <Link
                  href="/poems/new"
                  className="inline-block px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:bg-stone-800 dark:hover:bg-[#C29248] transition shadow-sm font-medium"
                >
                  最初の一篇を紡ぐ（月3作制限）
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* メインコンテンツ：新しく投ぜられた詩篇 */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-200/80 dark:border-stone-800 pb-3 gap-2">
            <div>
              <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
                新しく投ぜられた詩篇
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                一作一作の尊厳に向き合うため、PV数や「いいね数」などの数字は表示しません。
              </p>
            </div>
            <Link
              href="/poems/new"
              className="text-xs text-[#D4A359] font-sans hover:underline font-medium tracking-wide"
            >
              + 詩を投稿する（月3作制限）
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs font-sans text-stone-400 space-y-2">
              <div className="inline-block w-4 h-4 border-2 border-stone-300 border-t-[#D4A359] rounded-full animate-spin" />
              <p>静かに作品を読み込んでいます...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50/80 dark:bg-rose-950/30 p-6 text-center rounded border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-sans">
              {error}
            </div>
          ) : poems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {poems.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poems/${poem.id}`}
                  className="block p-6 bg-white/90 dark:bg-[#242B3B]/90 rounded-lg border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-md transition space-y-3 group"
                >
                  <h3 className="text-base font-normal text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition truncate">
                    {poem.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                    {poem.profiles?.display_name || '無名の表現者'}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3 font-serif whitespace-pre-wrap">
                    {poem.content}
                  </p>
                  <div className="pt-2 flex justify-between items-center text-[11px] font-sans text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800">
                    <span>{new Date(poem.published_at).toLocaleDateString('ja-JP')}</span>
                    <span className="text-[#D4A359] font-serif group-hover:underline">
                      Pratyaya（応答）を観る
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/60 dark:bg-[#242B3B]/60 p-12 text-center rounded border border-stone-200/60 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 font-sans">
              まだ公開された詩篇はありません。最初の一篇の投稿をお待ちしています。
            </div>
          )}
        </section>

        {/* 対話空間セクション：Pratyaya Lab */}
        <section className="bg-amber-50/50 dark:bg-[#242B3B]/80 p-8 rounded-lg border border-amber-200/70 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                Pratyaya Lab — Dialogue Room
              </p>
              <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100">
                対話と深層批判の部屋
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-sans leading-relaxed">
                人格攻撃を排し、言葉の構造や響き（Vāc & Logos）について誠実の語り合うフォーラムです。
              </p>
            </div>
            <Link
              href="/lab"
              className="px-5 py-2.5 bg-white dark:bg-[#1A1F2C] border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-sans rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition shadow-sm shrink-0 font-medium"
            >
              フォーラムへ入る →
            </Link>
          </div>
        </section>

        {/* フッター */}
        <footer className="pt-8 border-t border-stone-200/80 dark:border-stone-800 text-center space-y-4">
          <p className="text-xs font-serif italic text-stone-600 dark:text-stone-400 max-w-xl mx-auto leading-relaxed">
            「言葉は、誰かを打ち負かすための武器ではなく、<br className="hidden sm:inline" />
            他者の尊厳と深く触れ合う（Pratyaya）ための光である」
          </p>
          <div className="flex justify-center space-x-6 text-xs font-sans text-stone-500 dark:text-stone-400">
            <Link href="/terms" className="hover:text-[#1A1F2C] dark:hover:text-stone-200 transition">
              利用規約・倫理指針
            </Link>
            <Link href="/lab" className="hover:text-[#1A1F2C] dark:hover:text-stone-200 transition">
              Pratyaya Lab
            </Link>
            <Link href="/auth/signup" className="hover:text-[#1A1F2C] dark:hover:text-stone-200 transition">
              新規登録
            </Link>
          </div>
          <p className="text-[11px] font-sans text-stone-400 dark:text-stone-500">
            © 2026 Poem pratyaya. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  )
}
