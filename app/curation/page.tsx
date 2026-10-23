'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CurationArchiveItem {
  id: string
  year: number
  month: number
  curator_name: string
  curator_role: 'admin' | 'advisor'
  curation_comment: string
  created_at: string
  poem: {
    id: string
    title: string
    content: string
    profiles: {
      display_name: string | null
      username: string | null
    } | null
  }
}

export default function CurationArchivePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [curations, setCurations] = useState<CurationArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    fetchArchives()
  }, [])

  async function fetchArchives() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('monthly_curations')
        .select(`
          id,
          year,
          month,
          curator_name,
          curator_role,
          curation_comment,
          created_at,
          poem:poem_id (
            id,
            title,
            content,
            profiles:author_id ( display_name, username )
          )
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) {
        console.error('アーカイブ取得エラー:', error)
      } else if (data) {
        setCurations(data as unknown as CurationArchiveItem[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!hasMounted) return null

  // 年によるフィルター
  const availableYears = Array.from(new Set(curations.map((c) => c.year.toString())))
  const filteredCurations = selectedYear === 'all'
    ? curations
    : curations.filter((c) => c.year.toString() === selectedYear)

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* ヘッダー */}
        <header className="border-b border-[#E2DDD5] dark:border-stone-800 pb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
            <span>🕯️</span>
            <span>Monthly Curation Archive</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            月刊選考・鑑賞評アーカイブ
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm font-sans text-stone-600 dark:text-stone-400 leading-relaxed">
            過去の月刊特選詩篇と、選者（主宰・特別選者）による鑑賞の記録です。<br className="hidden sm:inline" />
            二元論的な順位付けを離れ、言葉の響き（Vāc）と構造がひらいた知の地平を静かに遡ります。
          </p>
        </header>

        {/* 年選択フィルター */}
        {availableYears.length > 0 && (
          <div className="flex justify-center gap-2 font-sans text-xs">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-4 py-2 rounded transition ${
                selectedYear === 'all'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                  : 'bg-[#F4F0E8] dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              すべて ({curations.length})
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded transition ${
                  selectedYear === year
                    ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                    : 'bg-[#F4F0E8] dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {year}年
              </button>
            ))}
          </div>
        )}

        {/* アーカイブ一覧リスト */}
        {loading ? (
          <div className="text-center py-20 text-xs font-sans text-stone-400">
            静かに記録を読み込んでいます...
          </div>
        ) : filteredCurations.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#242B3B] p-12 text-center rounded-xl border border-[#E2DDD5] dark:border-stone-800 text-xs text-stone-500 font-sans space-y-2">
            <p>まだ記録された月刊選考はありません。</p>
            <p className="text-stone-400">最初の一篇が選定される時を待っています。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCurations.map((item) => (
              <article
                key={item.id}
                className="bg-white/90 dark:bg-[#242B3B] p-6 sm:p-8 rounded-xl border border-[#E2DDD5] dark:border-stone-800 shadow-sm space-y-6 hover:border-[#D4A359]/40 transition"
              >
                {/* 年月 ＆ 選者ヘッダー */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4 gap-3 font-sans">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tracking-wider text-[#D4A359]">
                      {item.year}年{item.month}月 特選
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] rounded border font-medium ${
                      item.curator_role === 'admin'
                        ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] border-transparent'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    }`}>
                      {item.curator_name}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    選定日：{new Date(item.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                {/* 詩篇タイトル ＆ 抜粋 */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-normal text-[#1A1F2C] dark:text-stone-100">
                      『{item.poem?.title || '無題'}』
                    </h2>
                    <span className="text-xs font-sans text-stone-500">
                      詩人：{item.poem?.profiles?.display_name || item.poem?.profiles?.username || '無名'}
                    </span>
                  </div>

                  <div className="p-5 bg-[#FBF9F5] dark:bg-[#1A1F2C] border-l-2 border-[#D4A359] rounded-r text-xs sm:text-sm leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap max-h-36 overflow-hidden text-ellipsis">
                    {item.poem?.content}
                  </div>
                </div>

                {/* 選評・鑑賞文 */}
                <div className="pt-4 border-t border-[#E2DDD5] dark:border-stone-800 space-y-3">
                  <span className="text-xs font-sans font-medium text-[#D4A359]">
                    【選者鑑賞評】
                  </span>
                  <blockquote className="p-4 bg-[#F4F0E8]/50 dark:bg-[#1E2533] rounded text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300 italic font-serif whitespace-pre-wrap">
                    “{item.curation_comment}”
                  </blockquote>
                </div>

                {/* 詳細リンク */}
                <div className="flex justify-end pt-2">
                  <Link
                    href={`/poems/${item.poem?.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:opacity-90 transition font-medium"
                  >
                    この作品と応答を鑑賞する →
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
