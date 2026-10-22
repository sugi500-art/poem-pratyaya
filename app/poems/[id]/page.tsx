// app/poems/[id]/page.tsx
import React, { Suspense } from 'react'
import PoemDetailClient from '@/components/PoemDetailClient'

// 動的パラメータの取得とメイン表示処理を行う内部コンポーネント
async function PoemDetailContainer({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PoemDetailClient poemId={id} />
}

// ページ本体：Suspense 境界で包むことで Next.js 15 の事前レンダリングエラーを回避
export default function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[#5A6275] dark:text-stone-400 tracking-widest text-sm">言葉の空間を読み込んでいます...</p>
          </div>
        </div>
      }
    >
      <PoemDetailContainer params={params} />
    </Suspense>
  )
}
