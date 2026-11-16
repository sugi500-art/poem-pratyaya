import type { Metadata } from 'next'
import Header from '@/components/Header'
import './globals.css'

const DOMAIN = 'poem-pratyaya.com'
const SITE_URL = `https://${DOMAIN}`
const OGP_IMAGE = `${SITE_URL}/ogp-poem.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Poem pratyaya | 詩の投稿サイト・言葉と対話の聖域',
  description: 'Poem pratyaya（ポエム・プラティヤヤ）は、現代詩・短歌・散文詩を静かに推敲・共有し、言葉の響きを深め合うための詩の投稿サイトです。数字や評価の競争から離れ、一音一節の尊厳に向き合う相互鑑賞の場を提供します。',
  keywords: [
    '詩の投稿サイト',
    '詩 投稿 サイト',
    '詩 投稿',
    '現代詩 投稿',
    '短歌 投稿',
    '詩',
    '詩歌',
    'Poem pratyaya',
    'ポエムプラティヤヤ',
  ],
  openGraph: {
    title: 'Poem pratyaya | 詩の投稿サイト・言葉と対話の聖域',
    description: '数字の競争から離れ、一音一節の尊厳に向き合う詩の投稿サイト。作品投稿と深層鑑賞の対話空間。',
    url: SITE_URL,
    siteName: 'Poem pratyaya',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: OGP_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Poem pratyaya 詩の投稿サイト',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Poem pratyaya | 詩の投稿サイト・言葉と対話の聖域',
    description: '数字の競争から離れ、一音一節の尊厳に向き合う詩の投稿サイト。作品投稿と深層鑑賞の対話空間。',
    images: [OGP_IMAGE],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] min-h-screen antialiased">
        <Header />
        {children}
      </body>
    </html>
  )
}