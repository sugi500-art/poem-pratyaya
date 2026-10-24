import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import PoemDetailClient from './PoemDetailClient'

// 作品ごとの動的OGPメタデータ生成（X・SNSシェア用）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  // Supabase から作品情報と作者名を取得
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const { data: poem } = await supabase
    .from('poems')
    .select('id, title, content, profiles:author_id(display_name, username)')
    .eq('id', id)
    .maybeSingle()

  const poemTitle = poem?.title ? `『${poem.title}』` : '詩篇'
  const authorName = (poem as any)?.profiles?.display_name || (poem as any)?.profiles?.username || '表現者'
  
  // 詩の冒頭文（改行を空白に整えて抜粋）
  const contentSnippet = poem?.content
    ? poem.content.replace(/\s+/g, ' ').slice(0, 95) + (poem.content.length > 95 ? '...' : '')
    : '言葉の尊厳と沈黙の余白を取り戻すための詩的空間。'

  const fullTitle = `${poemTitle} （詩人：${authorName}） | Poem pratyaya`
  const ogpImageUrl = '[suspicious link removed]'

  return {
    metadataBase: new URL('https://poem-pratyaya.com'),
    title: fullTitle,
    description: contentSnippet,
    openGraph: {
      title: fullTitle,
      description: contentSnippet,
      url: `[suspicious link removed]{id}`,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'article',
      images: [
        {
          url: ogpImageUrl,
          width: 1200,
          height: 630,
          alt: `${poemTitle} - Poem pratyaya`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: contentSnippet,
      images: [ogpImageUrl],
    },
  }
}

// Suspense の内側で params (Promise) を解凍して Client コンポーネントへ渡す
async function PoemDetailContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PoemDetailClient poemId={id} />
}

export default function Page({
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
            <p className="text-[#5A6275] dark:text-stone-400 tracking-widest text-sm">
              言葉の空間を静かに読み込んでいます...
            </p>
          </div>
        </div>
      }
    >
      <PoemDetailContent params={params} />
    </Suspense>
  )
}
