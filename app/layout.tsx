import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header' // ★ Header をインポート

export const metadata: Metadata = {
  title: 'Poem pratyaya',
  description: '言葉を情報から解き放つ静かな聖域',
}

// app/layout.tsx の該当部分

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 1. suppressHydrationWarning を追加してテーマ切替の警告を防止
    <html lang="ja" suppressHydrationWarning>
      {/* 2. body に dark:bg-[#1A1F2C] と dark:text-[#EAE8E3] を追加 */}
      <body className="bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  )
}