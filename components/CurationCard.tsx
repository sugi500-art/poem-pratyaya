'use client'

import React from 'react'

interface CurationCardProps {
  curatorName?: string | null
  curationComment?: string | null
  curatedAt?: string | null
  isFeatured?: boolean
}

export default function CurationCard({
  curatorName = '選者：三浦果実・杉原詠二',
  curationComment,
  curatedAt,
  isFeatured = true,
}: CurationCardProps) {
  if (!curationComment && !isFeatured) return null

  return (
    <section className="bg-[#FDFBF7] dark:bg-[#1E2533] border-l-4 border-[#D4A359] border-y border-r border-[#E5E0D8] dark:border-stone-800 rounded-r-xl p-6 md:p-8 space-y-4 shadow-sm relative overflow-hidden my-8 font-serif">
      {/* 背景の光彩アクセント */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4A359]/10 to-transparent pointer-events-none rounded-bl-full" />

      {/* ヘッダー領域 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E0D8] dark:border-stone-800 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🕯️</span>
          <div>
            <span className="text-[10px] font-sans tracking-[0.2em] text-[#D4A359] uppercase block font-medium">
              Poem pratyaya — Monthly Curation
            </span>
            <h2 className="text-base md:text-lg font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
              月刊選考・選者鑑賞文
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-sans text-stone-500 dark:text-stone-400">
          <span className="px-2.5 py-1 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded text-[11px] font-medium">
            {curatorName || '選者鑑賞'}
          </span>
          {curatedAt && (
            <span>{new Date(curatedAt).toLocaleDateString('ja-JP')}</span>
          )}
        </div>
      </div>

      {/* 鑑賞文本文カード */}
      {curationComment ? (
        <div className="space-y-3 pt-2">
          <div className="p-5 md:p-6 bg-white/80 dark:bg-[#1A1F2C]/80 rounded-lg border border-[#E5E0D8] dark:border-stone-800 text-sm md:text-base leading-loose text-[#2C3448] dark:text-stone-200 font-serif whitespace-pre-wrap shadow-inner relative">
            <span className="text-3xl text-[#D4A359]/30 font-serif leading-none absolute top-2 left-2 select-none">“</span>
            <div className="px-4 py-1">
              {curationComment}
            </div>
            <span className="text-3xl text-[#D4A359]/30 font-serif leading-none absolute bottom-1 right-2 select-none">”</span>
          </div>
          <p className="text-[11px] font-sans text-stone-500 dark:text-stone-400 italic text-right">
            言葉の響き（Vāc）と構造を深く読み解いた公式鑑賞評
          </p>
        </div>
      ) : (
        <p className="text-xs font-sans text-stone-500 dark:text-stone-400 italic py-2">
          この詩篇は今月の特選作品として選定されています。
        </p>
      )}
    </section>
  )
}
