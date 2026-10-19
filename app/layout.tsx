import './globals.css'
import type { Metadata } from 'next'

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
      <body className="bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}