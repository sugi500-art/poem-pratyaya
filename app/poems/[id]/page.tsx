import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import PoemDetailClient from './PoemDetailClient'

// 作品ごとの動的OGPメタデータ生成（X・SNSシェア用）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}): Promise<Metadata> {
  const resolvedParams = await params
  const id = resolvedParams?.id

  let poemTitle = '詩篇'
  let authorName = '表現者'
  let contentSnippet = '言葉の尊厳と沈黙の余白を取り戻すための詩的空間。'

  if (id) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data: poem } = await supabase
          .from('poems')
          .select('id, title, content, profiles:author_id(display_name, username)')
          .eq('id', id)
          .maybeSingle()

        if (poem) {
          if (poem.title) poemTitle = `『${poem.title}』`
          const prof = (poem as any).profiles
          if (prof?.display_name || prof?.username) {
            authorName = prof.display_name || prof.username
          }
          if (poem.content) {
            contentSnippet = poem.content.replace(/\s+/g, ' ').trim().slice(0, 95)
            if (poem.content.length > 95) contentSnippet += '...'
          }
        }
      }
    } catch (e) {
      console.error('generateMetadata error:', e)
    }
  }

  const fullTitle = `${poemTitle} （詩人：${authorName}） | Poem pratyaya`
  const domain = 'poem-pratyaya.com'
  const ogpImageUrl = `https://${domain}/ogp-poem.png`
  const pageUrl = `https://${domain}/poems/${id}`

  return {
    metadataBase: new URL(`https://${domain}`),
    title: fullTitle,
    description: contentSnippet,
    openGraph: {
      title: fullTitle,
      description: contentSnippet,
      url: pageUrl,
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

// Suspense の内側で params を解凍して Client コンポーネントへ渡す
async function PoemDetailContent({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  return <PoemDetailClient poemId={resolvedParams.id} />
}

export default function Page({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
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

