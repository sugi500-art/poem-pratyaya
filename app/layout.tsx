import type { Metadata } from 'next'
import Header from '@/components/Header'
import './globals.css'

const DOMAIN = 'poem-pratyaya.com'
const SITE_URL = `https://${DOMAIN}`
const OGP_IMAGE = `${SITE_URL}/ogp-poem.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Poem pratyaya | 言語と対話の聖域',
  description: '勝敗や優劣を離れ、言葉の響きと思索を深める詩的対話プラットフォーム',
  openGraph: {
    title: 'Poem pratyaya | 言語と対話の聖域',
    description: '勝敗や優劣を離れ、言葉の響きと思索を深める詩的対話プラットフォーム',
    url: SITE_URL,
    siteName: 'Poem pratyaya',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: OGP_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Poem pratyaya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Poem pratyaya | 言語と対話の聖域',
    description: '勝敗や優劣を離れ、言葉の響きと思索を深める詩的対話プラットフォーム',
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

