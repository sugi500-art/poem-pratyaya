import type { Metadata } from 'next'
import Header from '@/components/Header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Poem pratyaya — 言葉の聖域',
  description: '言葉を情報から解き放ち、他者の尊厳と良心を照らす空間',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] min-h-screen">
        {/* 全ページ共通ヘッダー */}
        <Header />
        
        {/* 各ページコンテンツ */}
        {children}
      </body>
    </html>
  )
}