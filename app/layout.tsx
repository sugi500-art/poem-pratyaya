import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css' // プロジェクトのグローバルCSSのパス

export const metadata: Metadata = {
  title: 'Poem pratyaya | 言語と対話の聖域',
  description: '詩と思索を深める静寂な対話プラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] min-h-screen transition-colors duration-300 antialiased font-serif">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}