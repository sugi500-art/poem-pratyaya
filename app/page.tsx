'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// --- 型定義 ---
interface Profile {
  display_name: string | null
  username: string | null
}

interface PoemReviewItem {
  id: string
  created_at?: string
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
  reviews?: PoemReviewItem[]
  last_activity_time?: number
  resurfaced_by_review?: boolean
  latest_review_at?: string
}

const INITIAL_DISPLAY_COUNT = 12
const LOAD_MORE_INCREMENT = 12

export default function HomePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [featuredPoems, setFeaturedPoems] = useState<Poem[]>([])
  const [allPoems, setAllPoems] = useState<Poem[]>([])
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_DISPLAY_COUNT)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    let isMounted = true

    async function fetchInitialData() {
      try {
        setLoading(true)
        setError(null)

        // 1. monthly_curations テーブルから最新のアドバイザー推薦データを取得
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

          if (isMounted) {
            setFeaturedPoems(formattedCurations)
          }
        } else {
          if (isMounted) {
            setFeaturedPoems([])
          }
        }

        // 2. 新着公開詩篇（まずは最大36件取得）
        const { data: recentData, error: recentError } = await supabase
          .from('poems')
          .select(`
            id,
            title,
            content,
            published_at,
            writing_mode,
            author_id,
            profiles:author_id ( display_name, username ),
            reviews:poem_reviews ( id, created_at )
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(36)

        if (recentError) {
          console.error('新着詩篇取得エラー:', recentError)
          if (isMounted) setError('作品の読み込みに失敗しました。時間をおいて再読み込みしてください。')
          return
        }

        // 3. 【案2：対話（鑑賞文）が灯った詩篇の再浮上】
        // 直近に鑑賞文が届いた詩篇を抽出し、もし新着36件から漏れている古い名作があれば追加取得
        let combinedPoems: any[] = recentData ? [...recentData] : []

        try {
          const { data: recentReviews } = await supabase
            .from('poem_reviews')
            .select('poem_id, created_at')
            .order('created_at', { ascending: false })
            .limit(12)

          if (recentReviews && recentReviews.length > 0) {
            const existingIds = new Set(combinedPoems.map((p) => p.id))
            const missingPoemIds = Array.from(
              new Set(recentReviews.map((r) => r.poem_id).filter((id) => !existingIds.has(id)))
            )

            if (missingPoemIds.length > 0) {
              const { data: missingPoems } = await supabase
                .from('poems')
                .select(`
                  id,
                  title,
                  content,
                  published_at,
                  writing_mode,
                  author_id,
                  profiles:author_id ( display_name, username ),
                  reviews:poem_reviews ( id, created_at )
                `)
                .in('id', missingPoemIds)
                .eq('status', 'published')

              if (missingPoems && missingPoems.length > 0) {
                combinedPoems = [...combinedPoems, ...missingPoems]
              }
            }
          }
        } catch (e) {
          console.error('鑑賞文連動の取得スキップ:', e)
        }

        // 4. 各詩篇のアクティビティ日時（公開日 vs 最新鑑賞文日）を計算して並び替え
        const processedPoems: Poem[] = combinedPoems.map((poem: any) => {
          const pubTime = new Date(poem.published_at).getTime()
          const reviewDates = (poem.reviews || [])
            .map((r: any) => (r.created_at ? new Date(r.created_at).getTime() : 0))
            .filter((t: number) => t > 0)

          const maxReviewTime = reviewDates.length > 0 ? Math.max(...reviewDates) : 0
          const lastActiveTime = Math.max(pubTime, maxReviewTime)

          // 公開から10分以上あとに鑑賞文が届いている場合は「対話の再浮上」と認定
          const isResurfaced = maxReviewTime > pubTime + 10 * 60 * 1000

          return {
            ...poem,
            last_activity_time: lastActiveTime,
            resurfaced_by_review: isResurfaced,
            latest_review_at: maxReviewTime > 0 ? new Date(maxReviewTime).toISOString() : undefined,
          }
        })

        // 最新の活動（新着公開 または 新しい鑑賞文）が新しい順にソート
        processedPoems.sort((a, b) => (b.last_activity_time || 0) - (a.last_activity_time || 0))

        if (isMounted) {
          setAllPoems(processedPoems)
        }
      } catch (err) {
        console.error('データ取得中の予期せぬエラー:', err)
        if (isMounted) setError('予期せぬエラーが発生しました。')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchInitialData()

    return () => {
      isMounted = false
    }
  }, [hasMounted])

  // 「さらに言葉を辿る」クリック時
  const handleLoadMore = () => {
    setLoadingMore(true)
    setTimeout(() => {
      setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT)
      setLoadingMore(false)
    }, 200)
  }

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 text-center font-sans">
        <p className="text-sm text-gray-500 dark:text-stone-400">Poem pratyaya を読み込んでいます...</p>
      </div>
    )
  }

  const visiblePoems = allPoems.slice(0, visibleCount)
  const hasMore = visibleCount < allPoems.length

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* ヒーローエリア：月刊推薦詩篇（推薦が存在する場合のみ静かに立ち現れる） */}
        {featuredPoems.length > 0 ? (
          <section className="bg-white/90 dark:bg-[#242B3B] p-8 sm:p-12 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6 relative overflow-hidden backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 dark:border-stone-800 pb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4A359] animate-pulse" />
                <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
                  Poem pratyaya — Monthly Curation
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-sans">
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  順位付けを行わない月刊推薦詩篇
                </span>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <Link
                  href="/curation/archive"
                  className="text-[#D4A359] dark:text-[#E5B869] hover:underline font-medium flex items-center gap-1"
                >
                  <span>📜 推薦アーカイヴ</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${featuredPoems.length > 1 ? 'md:grid-cols-2 gap-8' : 'gap-6'}`}>
              {featuredPoems.map((poem) => (
                <div key={poem.id} className="space-y-5 flex flex-col justify-between bg-[#FDFBF7]/80 dark:bg-[#1A1F2C]/60 p-6 rounded-lg border border-[#E5E0D8] dark:border-stone-800 shadow-sm relative">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800 pb-2">
                      <span className="px-2.5 py-0.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] text-xs font-sans rounded font-medium">
                        {poem.curator_name || 'アドバイザー推薦'}
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

                    {/* アドバイザー鑑賞コメント */}
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
          </section>
        ) : (
          /* 推薦なし（初期状態）：身内褒め合いの印象を排した清らかな静寂の導入カード */
          <section className="bg-white/90 dark:bg-[#242B3B] p-8 sm:p-12 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5 text-center relative overflow-hidden backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/10 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium mx-auto">
              <span>🕯️</span>
              <span>言葉の聖域 — Poem pratyaya へようこそ</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
              言葉を単なる情報から解き放ち、<br className="hidden sm:inline" />
              静寂と良心の中で響き合わせる場所
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-serif max-w-2xl mx-auto leading-relaxed pt-1">
              Poem pratyaya（ポエム・プラティヤヤ）は、SNSのようなPV数や評価の競い合いを排し、<br className="hidden sm:inline" />
              月3作の推敲制限と、縦書きの組版・肉声の響き（Vāc）によって言葉の尊厳を守る詩的空間です。
            </p>

            <div className="pt-3 flex flex-wrap justify-center gap-3 font-sans text-xs">
              <Link
                href="/poems"
                className="px-5 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 transition shadow-sm font-medium"
              >
                詩篇目録を訪ねる
              </Link>
              <Link
                href="/poems/new"
                className="px-5 py-2.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                一篇を推敲・投稿する（月3作）
              </Link>
            </div>
          </section>
        )}

        {/* メインコンテンツ：新しく投ぜられた詩篇 ＆ 対話の再浮上 */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-200/80 dark:border-stone-800 pb-3 gap-2">
            <div>
              <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100 flex items-center gap-2">
                <span>新しく投ぜられた詩篇</span>
                <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-[#EAE4D8] dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  {allPoems.length} 篇の息づかい
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                一作一作の尊厳に向き合うため、PV数や「いいね数」などの数字は表示しません。新着作品および、鑑賞文（Pratyaya）が届いた詩篇が静かに立ち現れます。
              </p>
            </div>
            <Link
              href="/poems/new"
              className="text-xs text-[#D4A359] font-sans hover:underline font-medium tracking-wide shrink-0"
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
          ) : visiblePoems.length > 0 ? (
            <div className="space-y-8">
              {/* 詩カードグリッド（初期12件、追加読み込みで拡張） */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiblePoems.map((poem) => (
                  <Link
                    key={poem.id}
                    href={`/poems/${poem.id}`}
                    className="block p-6 bg-white/90 dark:bg-[#242B3B] rounded-lg border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-md transition space-y-3 group"
                  >
                    {/* カードヘッダー */}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition truncate">
                        『{poem.title}』
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {poem.is_featured && (
                          <span className="text-[10px] bg-[#D4A359]/20 text-[#D4A359] px-1.5 py-0.5 rounded font-sans">
                            推薦
                          </span>
                        )}
                        {poem.resurfaced_by_review && (
                          <span
                            className="text-[10px] bg-amber-100/80 dark:bg-amber-950/60 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/40 rounded px-1.5 py-0.5 font-sans flex items-center gap-0.5"
                            title="新しい鑑賞文が届き、トップへ再浮上しました"
                          >
                            <span>🕯️</span>
                            <span>対話</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 詩人名 */}
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                      詩人：{poem.profiles?.display_name || poem.profiles?.username || '無名の表現者'}
                    </p>

                    {/* 抜粋本文 */}
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3 font-serif whitespace-pre-wrap">
                      {poem.content}
                    </p>

                    {/* カード下部バー（日時と鑑賞文数） */}
                    <div className="pt-2 flex justify-between items-center text-[11px] font-sans text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800/80">
                      <span>
                        {poem.resurfaced_by_review && poem.latest_review_at
                          ? `応答: ${new Date(poem.latest_review_at).toLocaleDateString('ja-JP')}`
                          : `公開: ${new Date(poem.published_at).toLocaleDateString('ja-JP')}`}
                      </span>

                      {poem.reviews && poem.reviews.length > 0 ? (
                        <span className="text-[#D4A359] font-medium flex items-center gap-1 font-sans">
                          <span>🕯️</span>
                          <span>鑑賞文 {poem.reviews.length}篇</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 font-serif group-hover:text-[#D4A359] group-hover:underline">
                          Pratyaya（応答）を観る
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* 【案1：さらに言葉を辿る（追加読み込みボタン）】 */}
              <div className="pt-4 text-center space-y-4 font-sans">
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white/90 dark:bg-[#242B3B] border border-stone-300 dark:border-stone-700 hover:border-[#D4A359] text-stone-700 dark:text-stone-200 hover:text-[#D4A359] dark:hover:text-[#D4A359] rounded-lg text-xs font-medium transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span>{loadingMore ? '静かに読み込んでいます...' : '🕯️ さらに言葉を辿る（過去の詩篇を表示）'}</span>
                    {!loadingMore && <span>↓</span>}
                  </button>
                ) : allPoems.length > INITIAL_DISPLAY_COUNT ? (
                  <p className="text-xs text-stone-400">
                    表示中のすべての詩篇（全 {allPoems.length} 篇）を辿り終えました。
                  </p>
                ) : null}

                <div>
                  <Link
                    href="/poems"
                    className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition underline"
                  >
                    <span>すべての詩篇を検索・縦書きで味わう（詩篇アーカイヴ目録へ）</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
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





