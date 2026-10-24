import type { Metadata } from 'next'

// app/layout.tsx の metadata 設定用リファレンス
// この設定を入れておくことで、サイト全体のどのページがシェアされても
// 常に「Poem pratyaya」の蝋燭のOGP画像（大きなカード）が美しく表示されます。

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
