import type { Metadata } from 'next'
import { Suspense } from 'react'
import { generateAuthorMetadata } from '@/components/profile_meta_config'
import AuthorProfileClient from './AuthorProfileClient'

// Next.js 15 の Prerender エラー回避策:
// Server Component (Page) 自体で params を await して静的シェルのレンダリングを阻害するのを避け、
// Promise のまま Client Component へ渡し、<Suspense> 境界内で React.use() 処理させます。

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  return await generateAuthorMetadata(username)
}

export default function Page({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <p className="text-xs font-sans text-stone-400">プロファイルを静かに読み込んでいます...</p>
        </div>
      }
    >
      <AuthorProfileClient params={params} />
    </Suspense>
  )
}
