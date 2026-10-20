import React, { Suspense } from 'react'
import PoemDetailClient from './PoemDetailClient'

// 動的パラメータの解決とクライアントコンポーネントへの受け渡し
async function PoemDetailContent({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  return <PoemDetailClient poemId={resolvedParams.id} />
}

// 親ページ：Suspense 境界を設定してビルド時のブロックを防ぐ
export default function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[#5A6275] tracking-widest text-sm font-sans">
              言葉の空間を読み込んでいます...
            </p>
          </div>
        </div>
      }
    >
      <PoemDetailContent params={params} />
    </Suspense>
  )
}