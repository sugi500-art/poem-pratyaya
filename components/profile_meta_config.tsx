import type { Metadata } from 'next'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアント生成（Next.js の fetch キャッシュを有効化）
function createCachedSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        fetch: (url, options) =>
          fetch(url, {
            ...options,
            next: { revalidate: 60 }, // 60秒間キャッシュ（Next.js キャッシュとの統合）
          }),
      },
    }
  )
}

// React cache を使ったプロファイルデータのキャッシュ付き取得関数
const getProfileData = cache(async (targetKey: string) => {
  const supabase = createCachedSupabaseClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetKey)
  
  const query = isUuid
    ? supabase.from('profiles').select('*').eq('id', targetKey)
    : supabase.from('profiles').select('*').eq('username', targetKey)

  const { data: profile } = await query.maybeSingle()
  return profile
})

// React cache を使った詩篇データのキャッシュ付き取得関数
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

/* 
 * ============================================================
 * 1. 著者（参加者）プロフィール用 OGP メタデータ生成
 * ============================================================
 */
export async function generateAuthorMetadata(username: string): Promise<Metadata> {
  const targetKey = decodeURIComponent(username).replace(/^%40|^\@/, '')
  const profile = await getProfileData(targetKey)

  const displayName = profile?.display_name || profile?.username || targetKey || '詩人'
  const bioText = profile?.bio
    ? profile.bio.slice(0, 100) + (profile.bio.length > 100 ? '...' : '')
    : `${displayName} さんの公開詩篇および鑑賞評（Pratyaya）の作品目録・プロフィールページです。`

  const pageTitle = `${displayName} (@${profile?.username || targetKey}) の作品目録 | Poem pratyaya`

  return {
    title: pageTitle,
    description: bioText,
    openGraph: {
      title: pageTitle,
      description: bioText,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'profile',
      images: [
        {
          url: '/ogp-profile.png',
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
      images: ['/ogp-profile.png'],
    },
  }
}

/* components/profile_meta_config.tsx の中身 */

// 詩篇詳細ページ用 OGP メタデータ生成
export async function generatePoemMetadata(poemId: string): Promise<Metadata> {
  const poem = await getPoemData(poemId)

  const poemTitle = poem?.title ? `『${poem.title}』` : '詩篇'
  const authorName = (poem as any)?.profiles?.display_name || (poem as any)?.profiles?.username || '無名の表現者'
  
  const contentSnippet = poem?.content
    ? poem.content.replace(/\n+/g, ' ').slice(0, 95) + (poem.content.length > 95 ? '...' : '')
    : '言葉の聖域 Poem pratyaya で公開されている詩篇です。'

  const pageTitle = `${poemTitle} — 詩人：${authorName} | Poem pratyaya`

  // ★ ここで完全な絶対URLを明示します
  const ogpImageUrl = '[suspicious link removed]'

  return {
    metadataBase: new URL('[suspicious link removed]'),
    title: pageTitle,
    description: contentSnippet,
    openGraph: {
      title: `${poemTitle} （詩人：${authorName}）`,
      description: contentSnippet,
      siteName: 'Poem pratyaya',
      locale: 'ja_JP',
      type: 'article',
      images: [
        {
          url: ogpImageUrl, // ★ 完全なURL
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
      images: [ogpImageUrl], // ★ 完全なURL
    },
  }
}
