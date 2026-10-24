import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import ThreadDetailClient from './ThreadDetailClient'

const DOMAIN = 'poem-pratyaya.com'
const SITE_URL = `https://${DOMAIN}`
const OGP_IMAGE = `${SITE_URL}/ogp-poem.png`

// 各トピックごとの動的OGPメタデータ生成（X・SNSシェア用）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}): Promise<Metadata> {
  const resolvedParams = await params
  const id = resolvedParams?.id

  let threadTitle = '対話トピック'
  let authorName = '表現者'
  let contentSnippet = '言葉の尊厳と沈黙の余白を取り戻すための対話空間。'

  if (id) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data: thread } = await supabase
          .from('forum_threads')
          .select('id, title, content, profiles:author_id(display_name, username)')
          .eq('id', id)
          .maybeSingle()

        if (thread) {
          if (thread.title) threadTitle = `『${thread.title}』`
          const prof = (thread as any).profiles
          if (prof?.display_name || prof?.username) {
            authorName = prof.display_name || prof.username
          }
          if (thread.content) {
            const raw = thread.content.replace(/\s+/g, ' ').trim()
            contentSnippet = raw.slice(0, 95) + (raw.length > 95 ? '...' : '')
          }
        }
      }
    } catch (e) {
      console.error('Forum thread generateMetadata error:', e)
    }
  }

  const pageTitle = `${threadTitle} — 投稿者：${authorName} | Pratyaya Lab`

  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle,
    description: contentSnippet,
    openGraph: {
      title: `${threadTitle} （${authorName}）`,
      description: contentSnippet,
      url: `${SITE_URL}/lab/${id}`,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'article',
      images: [
        {
          url: OGP_IMAGE,
          width: 1200,
          height: 630,
          alt: `${threadTitle} - Poem pratyaya`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${threadTitle} （${authorName}）`,
      description: contentSnippet,
      images: [OGP_IMAGE],
    },
  }
}

async function ForumThreadDetailContent({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  return <ThreadDetailClient threadId={id} />
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
              対話の空間を静かに読み込んでいます...
            </p>
          </div>
        </div>
      }
    >
      <ForumThreadDetailContent params={params} />
    </Suspense>
  )
}
