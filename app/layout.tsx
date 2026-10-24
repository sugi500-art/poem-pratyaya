import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://poem-pratyaya.com'),
  title: 'Poem pratyaya | 言語と対話の聖域',
  description: '勝敗や優劣を離れ、言葉の響きと思索を深める詩的対話プラットフォーム',
  openGraph: {
    title: 'Poem pratyaya | 言語と対話の聖域',
    description: '勝敗や優劣を離れ、言葉の響きと思索を深める詩的対話プラットフォーム',
    url: 'https://poem-pratyaya.com',
    siteName: 'Poem pratyaya',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '[suspicious link removed]',
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
    images: ['[suspicious link removed]'],
  },
}