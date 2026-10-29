'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Poem pratyaya 静かなアクセス計測コンポーネント
 * アプリの layout.tsx または各ページに配置することで、
 * 主宰・アドバイザー用のアクセス統計（PV・閲覧者数）を自動記録します。
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const lastRecordedPath = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // 同じページパスでの重複記録を防止
    if (!pathname || lastRecordedPath.current === pathname) return
    lastRecordedPath.current = pathname

    async function recordView() {
      try {
        // 訪問者識別用の匿名トークン（ローカルストレージベース、個人情報は含みません）
        let visitorHash = localStorage.getItem('pratyaya_visitor_id')
        if (!visitorHash) {
          visitorHash = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
          localStorage.setItem('pratyaya_visitor_id', visitorHash)
        }

        // ログインユーザー確認（オプショナル）
        const { data: { user } } = await supabase.auth.getUser()

        // Supabase に記録（静かにバックグラウンド送信）
        await supabase.from('page_views').insert({
          page_path: pathname,
          visitor_hash: visitorHash,
          user_id: user?.id || null,
        })
      } catch (e) {
        // エラーが発生してもユーザー体験を阻害しないようログのみ
        console.debug('Analytics record skipped:', e)
      }
    }

    recordView()
  }, [pathname, supabase])

  return null
}

import PageViewTracker from '@/components/PageViewTracker' // ← インポートを追加

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <PageViewTracker /> {/* ← <body> のすぐ下に追加 */}
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}