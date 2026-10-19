import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header' // ★ Header をインポート

export const metadata: Metadata = {
  title: 'Poem pratyaya',
  description: '言葉を情報から解き放つ静かな聖域',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased min-h-screen flex flex-col">
        {/* 全ページ共通ヘッダー */}
        <Header />

        {/* 各ページのメインコンテンツ */}
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  )
}