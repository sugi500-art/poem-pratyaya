import type { Metadata } from 'next'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://poem-pratyaya.com'

function createCachedSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        fetch: (url, options) =>
          fetch(url, {
            ...options,
            next: { revalidate: 60 },
          }),
      },
    }
  )
}

const getProfileData = cache(async (targetKey: string) => {
  const supabase = createCachedSupabaseClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetKey)
  
  const query = isUuid
    ? supabase.from('profiles').select('*').eq('id', targetKey)
    : supabase.from('profiles').select('*').eq('username', targetKey)

  const { data: profile } = await query.maybeSingle()
  return profile
})

const getPoemData = cache(async (poemId: string) => {
  const supabase = createCachedSupabaseClient()

  const { data: poem } = await supabase
    .from('poems')
    .select(`
      id,
      title,
      content,
      profiles:author_id ( display_name, username )
    `)
    .eq('id', poemId)
    .maybeSingle()

  return poem
})

export async function generateAuthorMetadata(username: string): Promise<Metadata> {
  const targetKey = decodeURIComponent(username).replace(/^%40|^\@/, '')
  const profile = await getProfileData(targetKey)

  const displayName = profile?.display_name || profile?.username || targetKey || '詩人'
  const bioText = profile?.bio
    ? profile.bio.slice(0, 100) + (profile.bio.length > 100 ? '...' : '')
    : `${displayName} さんの公開詩篇および鑑賞評（Pratyaya）の作品目録・プロフィールページです。`

  const pageTitle = `${displayName} (@${profile?.username || targetKey}) の作品目録 | Poem pratyaya`
  const ogpImage = `${SITE_URL}/ogp-profile.png`

  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle,
    description: bioText,
    openGraph: {
      title: pageTitle,
      description: bioText,
      url: `${SITE_URL}/authors/${encodeURIComponent(targetKey)}`,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'profile',
      images: [
        {
          url: ogpImage,
          width: 1200,
          height: 630,
          alt: `${displayName} - Poem pratyaya`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: bioText,
      images: [ogpImage],
    },
  }
}

export async function generatePoemMetadata(poemId: string): Promise<Metadata> {
  const poem = await getPoemData(poemId)

  const poemTitle = poem?.title ? `『${poem.title}』` : '詩篇'
  const authorName = (poem as any)?.profiles?.display_name || (poem as any)?.profiles?.username || '無名の表現者'
  
  const contentSnippet = poem?.content
    ? poem.content.replace(/
+/g, ' ').slice(0, 95) + (poem.content.length > 95 ? '...' : '')
    : '言葉の聖域 Poem pratyaya で公開されている詩篇です。'

  const pageTitle = `${poemTitle} — 詩人：${authorName} | Poem pratyaya`
  const ogpImage = `${SITE_URL}/ogp-poem.png`

  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle,
    description: contentSnippet,
    openGraph: {
      title: `${poemTitle} （詩人：${authorName}）`,
      description: contentSnippet,
      url: `${SITE_URL}/poems/${poemId}`,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'article',
      images: [
        {
          url: ogpImage,
          width: 1200,
          height: 630,
          alt: `${poemTitle} - Poem pratyaya`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${poemTitle} （詩人：${authorName}）`,
      description: contentSnippet,
      images: [ogpImage],
    },
  }
}

