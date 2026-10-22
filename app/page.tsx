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
  is_featured?: boolean
  curation_comment?: string | null
  curator_name?: string | null
  curated_at?: string | null
  profiles?: Profile | null
}

export default function HomePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [featuredPoems, setFeaturedPoems] = useState<Poem[]>([])
  const [recentPoems, setRecentPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    let isMounted = true

    async function fetchPoemsData() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()

        // 1. monthly_curations テーブルから最新のキュレーション特選データを優先取得
        let curationsFound = false
        const { data: curationsData, error: curationError } = await supabase
          .from('monthly_curations')
          .select(`
            id,
            curator_name,
            curation_comment,
            updated_at,
            created_at,
            poem_id,
            poems:poem_id (
              id,
              title,
              content,
              published_at,
              writing_mode,
              author_id,
              profiles:author_id ( display_name, username )
            )
          `)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(3)

        if (!curationError && curationsData && curationsData.length > 0) {
          const formattedCurations: Poem[] = curationsData
            .filter((c: any) => c.poems)
            .map((c: any) => ({
              id: c.poems.id,
              title: c.poems.title,
              content: c.poems.content,
              published_at: c.poems.published_at,
              writing_mode: c.poems.writing_mode,
              author_id: c.poems.author_id,
              is_featured: true,
              curation_comment: c.curation_comment,
              curator_name: c.curator_name,
              curated_at: c.updated_at || c.created_at,
              profiles: c.poems.profiles,
            }))

          if (formattedCurations.length > 0) {
            curationsFound = true
            if (isMounted) setFeaturedPoems(formattedCurations)
          }
        }

        // 2. フォールバック: poems テーブル側からの取得（is_featured = true）
        if (!curationsFound) {
          const { data: featuredData } = await supabase
            .from('poems')
            .select(`
              id,
              title,
              content,
              published_at,
              writing_mode,
              is_featured,
              curation_comment,
              curator_name,
              curated_at,
              author_id,
              profiles:author_id ( display_name, username )
            `)
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('curated_at', { ascending: false })
            .limit(3)

          if (featuredData && featuredData.length > 0 && isMounted) {
            setFeaturedPoems(featuredData as unknown as Poem[])
            curationsFound = true
          }
        }

        // 3. 新着公開詩篇を取得（6件）
        const { data: recentData, error: recentError } = await supabase
          .from('poems')
          .select(`
            id,
            title,
            content,
            published_at,
            writing_mode,
            is_featured,
            curation_comment,
            curator_name,
            author_id,
            profiles:author_id ( display_name, username )
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(6)

        if (recentError) {
          console.error('新着詩篇取得エラー:', recentError)
          if (isMounted) setError('作品の読み込みに失敗しました。時間をおいて再読み込みしてください。')
        } else if (isMounted) {
          if (!curationsFound && recentData && recentData.length > 0) {
            // 特選作品が指定されていない場合は新着先頭1件をフォールバック表示
            setFeaturedPoems([recentData[0] as unknown as Poem])
          }
          if (recentData) {
            setRecentPoems(recentData as unknown as Poem[])
          }
        }
      } catch (err) {
        console.error('データ取得中の予期せぬエラー:', err)
        if (isMounted) setError('予期せぬエラーが発生しました。')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPoemsData()

    return () => {
      isMounted = false
    }
  }, [hasMounted])

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 text-center font-sans">
        <p className="text-sm text-gray-500 dark:text-stone-400">Poem pratyaya を読み込んでいます...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* ヒーローエリア：月刊キュレーション（順位付けを行わない特選作品 & 鑑賞文） */}
        <section className="bg-white/90 dark:bg-[#242B3B] p-8 sm:p-12 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6 relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 dark:border-stone-800 pb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4A359] animate-pulse" />
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                Poem pratyaya — Monthly Curation
              </p>
            </div>
            <span className="text-[11px] font-sans text-stone-500 dark:text-stone-400">
              順位付けを行わない月刊特選詩篇
            </span>
          </div>

          {featuredPoems.length > 0 ? (
            <div className={`grid grid-cols-1 ${featuredPoems.length > 1 ? 'md:grid-cols-2 gap-8' : 'gap-6'}`}>
              {featuredPoems.map((poem) => (
                <div key={poem.id} className="space-y-5 flex flex-col justify-between bg-[#FDFBF7]/80 dark:bg-[#1A1F2C]/60 p-6 rounded-lg border border-[#E5E0D8] dark:border-stone-800 shadow-sm relative">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800 pb-2">
                      <span className="px-2.5 py-0.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] text-xs font-sans rounded font-medium">
                        {poem.curator_name || '選者特選'}
                      </span>
                      {poem.curated_at && (
                        <span className="text-[10px] font-sans text-stone-400">
                          {new Date(poem.curated_at).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h1 className="text-xl sm:text-2xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
                        『{poem.title}』
                      </h1>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
                        詩人：{poem.profiles?.display_name || '無名の表現者'}
                      </p>
                    </div>

                    {/* 抜粋本文 */}
                    <div className="p-4 bg-white/80 dark:bg-[#242B3B]/80 border-l-2 border-[#D4A359] rounded-r text-sm leading-relaxed text-stone-800 dark:text-stone-200 font-serif whitespace-pre-wrap max-h-36 overflow-hidden text-ellipsis shadow-inner">
                      {poem.content}
                    </div>

                    {/* 選者鑑賞コメント */}
                    {poem.curation_comment && (
                      <div className="p-4 bg-[#D4A359]/10 rounded border border-[#D4A359]/20 text-xs font-serif text-stone-700 dark:text-stone-300 leading-relaxed italic">
                        “ {poem.curation_comment} ”
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/poems/${poem.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:bg-stone-800 dark:hover:opacity-90 transition tracking-wider shadow-sm font-medium"
                    >
                      この一篇を鑑賞する →
                    </Link>
                  </div>
                </div>
              ))}
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
                  className="inline-block px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:bg-stone-800 dark:hover:opacity-90 transition shadow-sm font-medium"
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
              <div className="inline-block w-4 h-4 border-2 border-stone-300 border-[#D4A359] rounded-full animate-spin" />
              <p>静かに作品を読み込んでいます...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50/80 dark:bg-rose-950/50 p-6 text-center rounded border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-sans">
              {error}
            </div>
          ) : recentPoems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentPoems.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poems/${poem.id}`}
                  className="block p-6 bg-white/90 dark:bg-[#242B3B] rounded-lg border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-md transition space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition truncate">
                      {poem.title}
                    </h3>
                    {poem.is_featured && (
                      <span className="text-[10px] bg-[#D4A359]/20 text-[#D4A359] px-1.5 py-0.5 rounded font-sans shrink-0">
                        特選
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                    {poem.profiles?.display_name || '無名の表現者'}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3 font-serif whitespace-pre-wrap">
                    {poem.content}
                  </p>
                  <div className="pt-2 flex justify-between items-center text-[11px] font-sans text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800/80">
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

        {/* 対話空間セクション：Pratyaya Lab への誘い */}
        <section className="bg-amber-50/50 dark:bg-[#242B3B]/80 p-8 rounded-lg border border-amber-200/70 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                Pratyaya Lab — Dialogue Room
              </p>
              <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100">
                対話と深層批判の部屋
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 font-sans leading-relaxed">
                人格攻撃を排し、言葉の構造や響き（Vāc & Logos）について誠実に語り合うフォーラムです。
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

      </div>
    </div>
  )
}
