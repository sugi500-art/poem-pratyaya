import { Suspense } from 'react'
import PoemDetailClient from './PoemDetailClient'

async function PoemDetailWrapper({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  return <PoemDetailClient id={id} />
}

export default function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-stone-500 tracking-widest text-sm">言葉の空間を読み込んでいます...</p>
          </div>
        </div>
      }
    >
      <PoemDetailWrapper paramsPromise={params} />
    </Suspense>
  )
}