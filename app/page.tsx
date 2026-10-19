'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const supabase = createClient()
  const [poems, setPoems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPoems() {
      try {
        // 公開済みの詩篇を取得（公開日時の新しい順）
        const { data, error } = await supabase
          .from('poems')
          .select(`
            id,
            title,
            content,
            published_at,
            author_id,
            profiles:author_id ( display_name, username )
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(6)

        if (error) {
          console.error('詩篇一覧取得エラー:', error)
        } else if (data) {
          setPoems(data)
        }
      } catch (err) {
        console.error('データ取得中のエラー:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPoems()
  }, [supabase])

  // 特選作品（先頭の作品またはサンプル表示）
  const featuredPoem = poems.length > 0 ? poems[0] : null

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* ヒーローエリア：今月の特選作品（月刊キュレーション） */}
        <section className="bg-white p-8 sm:p-12 rounded-lg border border-stone-200/80 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase font-medium">
              Poem Pratyaya — Monthly Curation
            </p>
            <span className="text-[11px] font-sans text-stone-400">
              順位付けを行わない特選詩篇
            </span>
          </div>

          {featuredPoem ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-normal tracking-wide text-[#1A1F2C]">
                  『{featuredPoem.title}』
                </h1>
                <p className="text-xs text-stone-600 font-sans">
                  詩人：{featuredPoem.profiles?.display_name || '無名の表現者'}
                </p>
              </div>

              {/* 抜粋本文 */}
              <div className="p-5 bg-[#FBF9F5]/70 border-l-2 border-[#D4A359] rounded-r text-sm leading-loose text-stone-800 font-serif whitespace-pre-wrap max-h-40 overflow-hidden text-ellipsis">
                {featuredPoem.content}
              </div>

              {/* 選者による鑑賞文の抜粋 */}
              <div className="pt-2 text-xs font-sans text-stone-600 italic flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="font-serif">
                  選者鑑賞：「言葉の響きが、私たちの内に潜む傷と静かに対話し照らし出す...」
                </p>
                <Link
                  href={`/poems/${featuredPoem.id}`}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans rounded hover:bg-stone-800 transition tracking-wider shrink-0"
                >
                  この一篇を深く鑑賞する →
                </Link>
              </div>
            </div>
          ) : (
            /* データ準備中・初期案内カード */
            <div className="py-8 text-center space-y-4">
              <h2 className="text-xl font-normal text-[#1A1F2C]">
                言葉の聖域へ、ようこそ
              </h2>
              <p className="text-xs text-stone-600 font-sans max-w-lg mx-auto leading-relaxed">
                Poem pratyaya は評価や競い合いを離れ、言葉と静かに対話する場所です。
                現在、最初の一篇の投ぜられる刻（とき）を静かに待っています。
              </p>
              <div className="pt-2">
                <Link
                  href="/poems/new"
                  className="inline-block px-6 py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans rounded hover:bg-stone-800 transition"
                >
                  最初の一篇を紡ぐ
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* メインコンテンツ：新しく投ぜられた詩篇（数字非表示の静かな目次） */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-200/80 pb-3 gap-2">
            <div>
              <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C]">
                新しく投ぜられた詩篇
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-1">
                一作一作の尊厳に向き合うため、PV数や「いいね数」などの数字は表示しません。
              </p>
            </div>
            <Link href="/poems/new" className="text-xs text-[#D4A359] font-sans hover:underline font-medium">
              + 詩を投稿する（月3作制限）
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs font-sans text-stone-400">
              作品を読み込んでいます...
            </div>
          ) : poems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {poems.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poems/${poem.id}`}
                  className="block p-6 bg-white rounded-lg border border-stone-200/80 hover:border-stone-400 transition shadow-sm space-y-3 group"
                >
                  <h3 className="text-base font-normal text-[#1A1F2C] group-hover:text-[#D4A359] transition truncate">
                    {poem.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    {poem.profiles?.display_name || '無名の表現者'}
                  </p>
                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 font-serif whitespace-pre-wrap">
                    {poem.content}
                  </p>
                  <div className="pt-2 flex justify-between items-center text-[11px] font-sans text-stone-400 border-t border-stone-100">
                    <span>{new Date(poem.published_at).toLocaleDateString('ja-JP')}</span>
                    <span className="text-[#D4A359] font-serif">Pratyaya（応答）を観る</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/60 p-8 text-center rounded border border-stone-200/60 text-xs text-stone-500 font-sans">
              まだ公開された詩篇はありません。
            </div>
          )}
        </section>

        {/* 対話空間セクション：Pratyaya Lab への誘い */}
        <section className="bg-amber-50/40 p-8 rounded-lg border border-amber-200/60 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase">
                Pratyaya Lab — Dialogue Room
              </p>
              <h3 className="text-lg font-normal text-[#1A1F2C]">
                対話と深層批判の部屋
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                人格攻撃を排し、言葉の構造や響きについて誠実に語り合うフォーラムです。
              </p>
            </div>
            <Link
              href="/lab"
              className="px-5 py-2 bg-white border border-stone-300 text-stone-800 text-xs font-sans rounded hover:bg-stone-50 transition shadow-sm shrink-0"
            >
              フォーラムへ入る →
            </Link>
          </div>
        </section>

        {/* フッター：マニフェスト宣言 */}
        <footer className="pt-8 border-t border-stone-200/80 text-center space-y-4">
          <p className="text-xs font-serif italic text-stone-600 max-w-xl mx-auto leading-relaxed">
            「言葉は、誰かを打ち負かすための武器ではなく、<br className="hidden sm:inline" />
            他者の尊厳と深く触れ合う（Pratyaya）ための光である」
          </p>
          <div className="flex justify-center space-x-6 text-xs font-sans text-stone-500">
            <Link href="/terms" className="hover:text-[#1A1F2C] transition">
              利用規約・倫理指針
            </Link>
            <Link href="/lab" className="hover:text-[#1A1F2C] transition">
              Pratyaya Lab
            </Link>
            <Link href="/auth/signup" className="hover:text-[#1A1F2C] transition">
              新規登録
            </Link>
          </div>
          <p className="text-[11px] font-sans text-stone-400">
            © 2026 Poem pratyaya. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  )
}
