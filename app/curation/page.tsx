'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PoemOption {
  id: string
  title: string
  content: string
  published_at: string
  author_name: string
}

interface MonthlyCuration {
  id: string
  year: number
  month: number
  curator_id: string
  curator_name: string
  curator_role: 'admin' | 'advisor'
  poem_id: string
  curation_comment: string
}

interface AnalyticsData {
  monthlyPv: number
  monthlyUu: number
  todayPv: number
  todayUu: number
  topPages: { path: string; count: number }[]
  dailyTrends: { dateStr: string; pv: number; uu: number }[]
}

export default function CurationManagePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'advisor' | 'user' | null>(null)
  
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(10)

  const [publishedPoems, setPublishedPoems] = useState<PoemOption[]>([])
  const [selectedPoemId, setSelectedPoemId] = useState('')
  const [curationComment, setCurationComment] = useState('')
  const [ethicsAgreed, setEthicsAgreed] = useState(false)
  const [existingCuration, setExistingCuration] = useState<MonthlyCuration | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // アクセス統計データ状態
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const today = new Date()
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth() + 1)
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    checkCuratorAuth()
  }, [hasMounted, selectedYear, selectedMonth])

  async function checkCuratorAuth() {
    try {
      setLoading(true)
      setMessage(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserRole(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, display_name, username')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'advisor')) {
        setUserRole('user')
        setLoading(false)
        return
      }

      setCurrentUser({
        ...user,
        display_name: profile.display_name || profile.username || 'アドバイザー',
        role: profile.role
      })
      setUserRole(profile.role)

      // 公開作品（全形式対応）一覧の取得
      const { data: poemsData } = await supabase
        .from('poems')
        .select(`
          id,
          title,
          content,
          published_at,
          profiles:author_id ( display_name, username )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(60)

      if (poemsData) {
        const formatted = poemsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          published_at: p.published_at,
          author_name: p.profiles?.display_name || p.profiles?.username || '無名の表現者',
        }))
        setPublishedPoems(formatted)
      }

      // 指定年月の既存登録データを取得
      const { data: curationData } = await supabase
        .from('monthly_curations')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .eq('curator_id', user.id)
        .maybeSingle()

      if (curationData) {
        setExistingCuration(curationData)
        setSelectedPoemId(curationData.poem_id)
        setCurationComment(curationData.curation_comment)
      } else {
        setExistingCuration(null)
        setSelectedPoemId('')
        setCurationComment('')
      }

      // アクセス統計データの取得
      fetchAnalyticsData()

    } catch (err) {
      console.error('権限確認エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  // アクセス統計の計算・取得関数（1000件上限突破対応）
  async function fetchAnalyticsData() {
    try {
      setLoadingAnalytics(true)

      // 1. まず RPC 関数 (get_access_analytics) を呼び出し（サーバー側集計で1000件上限を完全回避）
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_access_analytics')

      if (!rpcError && rpcData) {
        setAnalytics({
          monthlyPv: rpcData.monthlyPv || 0,
          monthlyUu: rpcData.monthlyUu || 0,
          todayPv: rpcData.todayPv || 0,
          todayUu: rpcData.todayUu || 0,
          topPages: rpcData.topPages || [],
          dailyTrends: (rpcData.dailyTrends || []).map((item: any) => ({
            dateStr: item.date_str || item.dateStr,
            pv: item.pv || 0,
            uu: item.uu || 0,
          })),
        })
        return
      }

      // 2. RPC が未作成の場合のフォールバック (count: 'exact' を付与して集計)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      // 今月の全アクセスログ取得 (count: 'exact' を付与)
      const { data: logs, count: exactMonthlyPv, error } = await supabase
        .from('page_views')
        .select('id, page_path, visitor_hash, created_at', { count: 'exact' })
        .gte('created_at', startOfMonth)
        .order('created_at', { ascending: false })
        .limit(50000)

      if (error) {
        console.warn('アクセスログ取得スキップ（テーブル未作成の可能性があります）:', error.message)
        setAnalytics(null)
        return
      }

      const allLogs = logs || []

      // 今月の集計（exact count が取得できている場合はそれを優先）
      const monthlyPv = exactMonthlyPv ?? allLogs.length
      const monthlyUuSet = new Set(allLogs.map((l) => l.visitor_hash || l.id))
      const monthlyUu = monthlyUuSet.size

      // 本日の集計
      const todayLogs = allLogs.filter((l) => l.created_at >= todayStart)
      const todayPv = todayLogs.length
      const todayUuSet = new Set(todayLogs.map((l) => l.visitor_hash || l.id))
      const todayUu = todayUuSet.size

      // 注目ページ TOP 5 の集計
      const pathCounts: { [key: string]: number } = {}
      allLogs.forEach((l) => {
        let p = l.page_path || '/'
        if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1)
        pathCounts[p] = (pathCounts[p] || 0) + 1
      })

      const topPages = Object.entries(pathCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 直近7日間の日別推移
      const dailyMap: { [dateStr: string]: { pv: number; uuSet: Set<string> } } = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateKey = `${d.getMonth() + 1}/${d.getDate()}`
        dailyMap[dateKey] = { pv: 0, uuSet: new Set() }
      }

      allLogs.forEach((l) => {
        const d = new Date(l.created_at)
        const dateKey = `${d.getMonth() + 1}/${d.getDate()}`
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].pv += 1
          dailyMap[dateKey].uuSet.add(l.visitor_hash || l.id)
        }
      })

      const dailyTrends = Object.entries(dailyMap).map(([dateStr, val]) => ({
        dateStr,
        pv: val.pv,
        uu: val.uuSet.size,
      }))

      setAnalytics({
        monthlyPv,
        monthlyUu,
        todayPv,
        todayUu,
        topPages,
        dailyTrends,
      })
    } catch (e) {
      console.error('Analytics fetch error:', e)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoemId || !curationComment.trim() || !ethicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      setMessage(null)

      const curatorNameLabel = currentUser.role === 'admin' 
        ? `${currentUser.display_name}（主宰）` 
        : `${currentUser.display_name}（アドバイザー）`

      // 1. monthly_curations テーブルの更新または挿入
      if (existingCuration) {
        const { error: updateError } = await supabase
          .from('monthly_curations')
          .update({
            poem_id: selectedPoemId,
            curation_comment: curationComment.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCuration.id)

        if (updateError) throw updateError

        if (existingCuration.poem_id !== selectedPoemId) {
          await supabase
            .from('poems')
            .update({
              is_featured: false,
              curation_comment: null,
            })
            .eq('id', existingCuration.poem_id)
        }

        setMessage({ type: 'success', text: `${selectedYear}年${selectedMonth}月の特選鑑賞文を更新しました。` })
      } else {
        const { error: insertError } = await supabase
          .from('monthly_curations')
          .insert({
            year: selectedYear,
            month: selectedMonth,
            curator_id: currentUser.id,
            curator_name: curatorNameLabel,
            curator_role: currentUser.role,
            poem_id: selectedPoemId,
            curation_comment: curationComment.trim(),
          })

        if (insertError) throw insertError
        setMessage({ type: 'success', text: `${selectedYear}年${selectedMonth}月の月刊特選作品と鑑賞文を登録しました。` })
      }

      // 2. poems テーブル側にも選考情報を同期
      const { error: poemSyncError } = await supabase
        .from('poems')
        .update({
          is_featured: true,
          curator_name: curatorNameLabel,
          curation_comment: curationComment.trim(),
          curated_at: new Date().toISOString(),
        })
        .eq('id', selectedPoemId)

      if (poemSyncError) {
        console.warn('poems テーブルへの同期警告:', poemSyncError)
      }

      checkCuratorAuth()
    } catch (err: any) {
      console.error('保存エラー:', err)
      setMessage({ type: 'error', text: '保存に失敗しました: ' + (err.message || 'エラーが発生しました') })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hasMounted) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 text-center font-sans">
        <p className="text-sm text-gray-500 dark:text-stone-400">アドバイザー権限を確認しています...</p>
      </div>
    )
  }

  if (!userRole || (userRole !== 'admin' && userRole !== 'advisor')) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 px-4 text-center font-sans">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-[#242B3B] border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 shadow-sm">
          <p className="text-2xl">🕯️</p>
          <h1 className="text-lg font-medium text-[#1A1F2C] dark:text-stone-100">アドバイザー専用執筆室</h1>
          <p className="text-xs text-gray-500 dark:text-stone-400 leading-relaxed">
            このページは主宰（admin）およびアドバイザー（advisor）権限を持つアカウントのみ利用可能です。<br />
            Supabase の profiles テーブルで権限ロールを設定の上、再度お入りください。
          </p>
        </div>
      </div>
    )
  }

  const selectedPoemDetail = publishedPoems.find((p) => p.id === selectedPoemId)

  // グラフ用最大値計算
  const maxPvInTrends = analytics?.dailyTrends.reduce((max, d) => Math.max(max, d.pv), 1) || 1

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* ヘッダー */}
        <header className="border-b border-[#E2DDD5] dark:border-stone-800 pb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
              <span>🕯️</span>
              <span>Monthly Curation / アドバイザー執筆室 ＆ 運営統計</span>
            </div>
            <Link
              href="/mypage"
              className="text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition"
            >
              ← マイページへ戻る
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1A1F2C] dark:text-stone-100">
            アドバイザー執筆室 ＆ 聖域アクセス統計
          </h1>
          <p className="text-xs font-sans text-stone-600 dark:text-stone-400 max-w-2xl leading-relaxed">
            ようこそ、{currentUser?.display_name} さん。ここでは月刊特選作品の鑑賞文の登録と、サイトの静かな読まれ方（アクセス数値・注目作品）を対外非公開で確認いただけます。
          </p>
        </header>

        {/* 📊 アクセス統計パネル（管理者・アドバイザー専用） */}
        <section className="bg-white/90 dark:bg-[#242B3B]/90 rounded-xl border border-[#E2DDD5] dark:border-stone-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base text-[#D4A359]">📊</span>
              <h2 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 font-serif">
                言葉の聖域 アクセス統計（閲覧数・訪問者数）
              </h2>
            </div>
            <button
              onClick={fetchAnalyticsData}
              disabled={loadingAnalytics}
              className="px-3 py-1 bg-[#F4F0E8] dark:bg-stone-800 hover:bg-[#EAE4D8] dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded text-xs font-sans transition flex items-center gap-1.5"
              title="最新の統計に更新"
            >
              <span>{loadingAnalytics ? '⏳' : '🔄'}</span>
              <span>{loadingAnalytics ? '更新中...' : '統計を再読み込み'}</span>
            </button>
          </div>

          {analytics ? (
            <div className="space-y-6 font-sans">
              {/* 4つの主要数字カード */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">今月の総PV（ページ閲覧）</span>
                  <p className="text-2xl font-serif text-[#1A1F2C] dark:text-stone-100 font-medium">
                    {analytics.monthlyPv.toLocaleString()} <span className="text-xs font-sans text-stone-400 font-normal">回</span>
                  </p>
                </div>

                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">今月の閲覧者数（UU）</span>
                  <p className="text-2xl font-serif text-[#D4A359] font-medium">
                    {analytics.monthlyUu.toLocaleString()} <span className="text-xs font-sans text-stone-400 font-normal">人</span>
                  </p>
                </div>

                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">本日のPV数</span>
                  <p className="text-2xl font-serif text-[#1A1F2C] dark:text-stone-100 font-medium">
                    {analytics.todayPv.toLocaleString()} <span className="text-xs font-sans text-stone-400 font-normal">回</span>
                  </p>
                </div>

                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">本日の閲覧者数</span>
                  <p className="text-2xl font-serif text-[#D4A359] font-medium">
                    {analytics.todayUu.toLocaleString()} <span className="text-xs font-sans text-stone-400 font-normal">人</span>
                  </p>
                </div>
              </div>

              {/* 2カラム表示：左（直近7日間の日別推移）、右（人気・注目ページTOP5） */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 日別推移ミニグラフ */}
                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-3">
                  <h3 className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>直近7日間の閲覧推移（PV）</span>
                    <span className="text-[10px] text-stone-400 font-normal">日毎の閲覧回数</span>
                  </h3>

                  <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1 px-1 border-b border-stone-200 dark:border-stone-800">
                    {analytics.dailyTrends.map((d, i) => {
                      const heightPercent = Math.max(8, Math.round((d.pv / maxPvInTrends) * 100))
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <span className="text-[10px] text-stone-400 group-hover:text-[#D4A359] transition">
                            {d.pv}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-[#1A1F2C] dark:bg-[#D4A359] rounded-t transition-all group-hover:opacity-80"
                            title={`${d.dateStr}: ${d.pv} PV / ${d.uu} UU`}
                          />
                          <span className="text-[9px] text-stone-400 font-sans mt-1">
                            {d.dateStr}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 人気ページ TOP 5 */}
                <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-3">
                  <h3 className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    人気・注目ページ TOP 5（今月）
                  </h3>

                  <div className="space-y-2 text-xs">
                    {analytics.topPages.length > 0 ? (
                      analytics.topPages.map((item, idx) => {
                        let label = item.path
                        if (item.path === '/') label = 'トップページ（聖域入口）'
                        else if (item.path === '/poems') label = '詩篇目録（作品一覧）'
                        else if (item.path === '/lab') label = '対話室（Pratyaya Lab）'
                        else if (item.path.startsWith('/poems/')) label = `作品ページ（${item.path.split('/')[2]?.slice(0, 8)}...）`
                        else if (item.path.startsWith('/authors/')) label = `プロフィール（${item.path.split('/')[2]}）`

                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#242B3B] rounded border border-stone-100 dark:border-stone-800">
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <span className="text-[10px] w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate text-stone-800 dark:text-stone-200 font-serif text-xs" title={item.path}>
                                {label}
                              </span>
                            </div>
                            <span className="text-stone-500 font-medium font-sans shrink-0">
                              {item.count} <span className="text-[10px] text-stone-400">PV</span>
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-stone-400 text-xs py-4 text-center">アクセスログがまだ記録されていません。</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded-lg border border-stone-200/60 dark:border-stone-800 text-center space-y-2 font-sans">
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                🕯️ アクセスログテーブル（`page_views`）をセットアップ準備中です
              </p>
              <p className="text-[11px] text-stone-400 leading-relaxed max-w-lg mx-auto">
                Supabase に SQL（`setup_access_analytics.sql`）を実行いただくと、ここにリアルタイムの閲覧数・訪問者数・注目の作品ページが自動集計されて表示されます。
              </p>
            </div>
          )}
        </section>

        {/* 🖊️ 月刊推薦・鑑賞文フォーム */}
        <form onSubmit={handleSubmit} className="bg-white/90 dark:bg-[#242B3B]/90 rounded-xl border border-[#E2DDD5] dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#E2DDD5] dark:border-stone-800 pb-4">
            <h2 className="text-lg font-medium text-[#1A1F2C] dark:text-stone-100 font-serif">
              月刊特選作品 ＆ アドバイザー鑑賞文の登録
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
              前月までに寄せられた作品群から選定し、当月1ヶ月間の光として掲げる特選作品と鑑賞文を登録します。
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded text-xs leading-relaxed font-sans ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* 年月の選択 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
                掲載対象年
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
                掲載対象月（1ヶ月間トップページに掲載）
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m} 月分</option>
                ))}
              </select>
            </div>
          </div>

          {/* 対象詩篇の選択 */}
          <div>
            <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
              今月の特選作品として掲げる言葉（全公開作品から1作）
            </label>
            <select
              value={selectedPoemId}
              onChange={(e) => setSelectedPoemId(e.target.value)}
              className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
              required
            >
              <option value="">-- 対象の作品を選択してください --</option>
              {publishedPoems.map((poem) => (
                <option key={poem.id} value={poem.id}>
                  『{poem.title}』 （作者：{poem.author_name} / {new Date(poem.published_at).toLocaleDateString('ja-JP')}）
                </option>
              ))}
            </select>
          </div>

          {/* 選択された詩篇のプレビュー */}
          {selectedPoemDetail && (
            <div className="p-4 bg-[#FBF9F5] dark:bg-[#1A1F2C] rounded border border-[#E2DDD5] dark:border-stone-800 space-y-2">
              <span className="text-[10px] text-[#D4A359] font-sans tracking-widest uppercase">作品プレビュー</span>
              <h3 className="text-base font-normal font-serif text-[#1A1F2C] dark:text-stone-100">『{selectedPoemDetail.title}』</h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-serif leading-relaxed line-clamp-4 whitespace-pre-wrap">
                {selectedPoemDetail.content}
              </p>
            </div>
          )}

          {/* 鑑賞文テキスト入力 */}
          <div>
            <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
              アドバイザー鑑賞文（評言）
            </label>
            <textarea
              rows={6}
              value={curationComment}
              onChange={(e) => setCurationComment(e.target.value)}
              placeholder="作品の音響、思想、行間の沈黙について、静かで深遠な解釈をお書きください..."
              className="w-full p-4 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-sm font-serif text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4A359]"
              required
            />
          </div>

          {/* 倫理確認チェックボックス */}
          <div className="p-4 bg-[#F4F0E8] dark:bg-[#1A1F2C] rounded-lg border border-[#E2DDD5] dark:border-stone-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="ethics-curation"
              checked={ethicsAgreed}
              onChange={(e) => setEthicsAgreed(e.target.checked)}
              className="mt-0.5 accent-[#1A1F2C] dark:accent-[#D4A359] h-4 w-4"
              required
            />
            <label htmlFor="ethics-curation" className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed cursor-pointer select-none">
              <span className="font-semibold text-[#D4A359]">【鑑賞倫理確認】</span>
              この鑑賞文は、作品の言葉と響きを深め、作者および他者の尊厳と良心を照らすものですか？（二元論的な比較や優劣の競い合いを排することを確認します）
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-stone-400">
              {existingCuration ? '※ すでに登録済みのデータを更新します' : '※ 月間1人1作までの厳選登録です'}
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPoemId || !curationComment.trim() || !ethicsAgreed}
              className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] hover:bg-[#2C3242] dark:hover:opacity-90 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-wider rounded font-medium shadow-sm transition-colors"
            >
              {isSubmitting ? '保存中...' : existingCuration ? '鑑賞文を更新する' : '月刊特選作品として登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
