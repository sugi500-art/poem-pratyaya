import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'

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
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] min-h-screen transition-colors duration-300">
        {/* ヘッダーコンポーネントの配置 */}
        <Header />
        
        {/* 各ページコンテンツ */}
        {children}
      </body>
    </html>
  )
}