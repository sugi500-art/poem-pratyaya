'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CurationArchiveItem {
  id: string
  year: number
  month: number
  curator_id: string
  curator_name: string
  curator_role: 'admin' | 'advisor'
  curation_comment: string
  created_at: string
  updated_at?: string
  poem: {
    id: string
    title: string
    content: string
    published_at: string | null
    author_id: string
    profiles: {
      id: string
      display_name: string | null
      username: string | null
      role: 'user' | 'advisor' | 'admin'
    } | null
  } | null
}

export default function CurationArchivePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [curations, setCurations] = useState<CurationArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'advisor' | 'user' | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setHasMounted(true)
    fetchCurrentUser()
    fetchArchives()
  }, [])

  async function fetchCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role)
        }
      }
    } catch (err) {
      console.error('ユーザー権限確認エラー:', err)
    }
  }

  async function fetchArchives() {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('monthly_curations')
        .select(`
          id,
          year,
          month,
          curator_id,
          curator_name,
          curator_role,
          curation_comment,
          created_at,
          updated_at,
          poem:poem_id (
            id,
            title,
            content,
            published_at,
            author_id,
            profiles:author_id ( id, display_name, username, role )
          )
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        setCurations(data as unknown as CurationArchiveItem[])
      }
    } catch (err: any) {
      console.error('アーカイヴ取得エラー:', err)
      setError('推薦アーカイヴの読み込みに失敗しました。時間をおいて再読み込みしてください。')
    } finally {
      setLoading(false)
    }
  }

  if (!hasMounted) return null

  // 年のユニークリストを降順で生成
  const availableYears = Array.from(new Set(curations.map((c) => c.year.toString()))).sort((a, b) => Number(b) - Number(a))
  const filteredCurations = selectedYear === 'all'
    ? curations
    : curations.filter((c) => c.year.toString() === selectedYear)

  const isCurator = userRole === 'admin' || userRole === 'advisor'

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ナビゲーションバー */}
        <nav className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-4 font-sans text-xs">
          <Link
            href="/"
            className="text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition flex items-center gap-1.5"
          >
            <span>←</span>
            <span>言葉の聖域（トップページ）へ戻る</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/poems"
              className="text-stone-600 dark:text-stone-300 hover:text-[#D4A359] transition font-medium"
            >
              詩篇目録
            </Link>
            {isCurator && (
              <Link
                href="/curation/manage"
                className="px-3 py-1 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded hover:bg-[#D4A359]/25 transition font-medium"
              >
                🕯️ アドバイザー執筆室
              </Link>
            )}
          </div>
        </nav>

        {/* ヘッダーエリア */}
        <header className="border-b border-[#E2DDD5] dark:border-stone-800 pb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#8C621C] dark:text-[#E5B869] font-sans font-medium">
            <span>🕯️</span>
            <span>Monthly Curation Archive</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            月刊推薦・鑑賞アーカイヴ
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm font-sans text-stone-600 dark:text-stone-400 leading-relaxed">
            詩人たちから寄せられた作品の中から、毎月心に響いた一篇と、主宰・アドバイザーによる鑑賞文の記録です。<br className="hidden sm:inline" />
            二元論的な順位付けを排し、言葉の響き（Vāc）と構造がひらいた静かな余韻をいつでも振り返ることができます。
          </p>
        </header>

        {/* 年選択フィルター */}
        {availableYears.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 font-sans text-xs">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-4 py-1.5 rounded transition ${
                selectedYear === 'all'
                  ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium shadow-sm'
                  : 'bg-white/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-[#D4A359]'
              }`}
            >
              全期間 ({curations.length})
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 rounded transition ${
                  selectedYear === year
                    ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium shadow-sm'
                    : 'bg-white/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-[#D4A359]'
                }`}
              >
                {year}年
              </button>
            ))}
          </div>
        )}

        {/* アーカイヴ一覧 */}
        {loading ? (
          <div className="text-center py-24 space-y-3 font-serif">
            <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-sans text-stone-400">言葉の記憶を静かに紐解いています...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 p-6 text-center rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-sans">
            {error}
          </div>
        ) : filteredCurations.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#242B3B] p-12 text-center rounded-xl border border-[#E2DDD5] dark:border-stone-800 text-xs text-stone-500 font-sans space-y-3">
            <p className="text-sm font-serif text-stone-700 dark:text-stone-300">
              {selectedYear === 'all'
                ? 'まだ記録された月刊推薦はありません。'
                : `${selectedYear}年の推薦記録はありません。`}
            </p>
            <p className="text-stone-400">
              アドバイザー執筆室から最初の一篇が推薦・記録される刻（とき）を待っています。
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCurations.map((item) => (
              <article
                key={item.id}
                className="bg-white/90 dark:bg-[#242B3B] p-6 sm:p-10 rounded-xl border border-[#E2DDD5] dark:border-stone-800 shadow-sm space-y-6 hover:border-[#D4A359]/60 transition relative overflow-hidden"
              >
                {/* 装飾の薄い光彩 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4A359]/10 to-transparent pointer-events-none rounded-bl-full" />

                {/* 年月 ＆ 推薦者ヘッダー */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2DDD5] dark:border-stone-800 pb-4 gap-3 font-sans">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tracking-wider text-[#D4A359]">
                      {item.year}年{item.month}月 推薦
                    </span>
                    <span className="px-2.5 py-0.5 text-xs rounded border font-medium bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border-[#D4A359]/30">
                      {item.curator_name || 'アドバイザー推薦'}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    推薦日：{new Date(item.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                {/* 詩篇タイトル ＆ 抜粋 */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <h2 className="text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 tracking-wide">
                      <Link
                        href={`/poems/${item.poem?.id || ''}`}
                        className="hover:text-[#D4A359] dark:hover:text-[#E5B869] transition"
                      >
                        『{item.poem?.title || '（無題）'}』
                      </Link>
                    </h2>
                    <span className="text-xs font-sans text-stone-500 dark:text-stone-400">
                      詩人：
                      {item.poem?.profiles?.username ? (
                        <Link
                          href={`/authors/${item.poem.profiles.username}`}
                          className="text-stone-700 dark:text-stone-300 hover:text-[#D4A359] underline underline-offset-2 ml-1"
                        >
                          {item.poem.profiles.display_name || item.poem.profiles.username}
                        </Link>
                      ) : (
                        item.poem?.profiles?.display_name || '無名の表現者'
                      )}
                    </span>
                  </div>

                  {item.poem?.content ? (
                    <div className="p-5 bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/80 border-l-2 border-[#D4A359] rounded-r text-sm leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap max-h-40 overflow-hidden text-ellipsis font-serif shadow-inner">
                      {item.poem.content}
                    </div>
                  ) : (
                    <div className="p-4 bg-stone-50 dark:bg-stone-900/40 rounded text-xs text-stone-400 font-sans italic">
                      ※ この詩篇の本文は現在非公開に設定されているか、更新されています。
                    </div>
                  )}
                </div>

                {/* アドバイザー鑑賞文 */}
                {item.curation_comment && (
                  <div className="pt-4 border-t border-[#E2DDD5] dark:border-stone-800 space-y-2">
                    <span className="text-xs font-sans font-medium text-[#8C621C] dark:text-[#E5B869] block">
                      【アドバイザーによる鑑賞文】
                    </span>
                    <blockquote className="p-5 bg-[#F4F0E8]/50 dark:bg-[#1E2533] rounded-lg text-sm leading-relaxed text-stone-700 dark:text-stone-300 font-serif whitespace-pre-wrap relative border border-[#E5E0D8]/60 dark:border-stone-800">
                      <span className="text-2xl text-[#D4A359]/30 font-serif leading-none absolute top-2 left-2 select-none">“</span>
                      <div className="px-3 py-1">
                        {item.curation_comment}
                      </div>
                      <span className="text-2xl text-[#D4A359]/30 font-serif leading-none absolute bottom-1 right-2 select-none">”</span>
                    </blockquote>
                  </div>
                )}

                {/* 作品詳細へ進むボタン */}
                {item.poem?.id && (
                  <div className="flex justify-end pt-2">
                    <Link
                      href={`/poems/${item.poem.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:opacity-90 transition font-medium shadow-sm"
                    >
                      <span>この詩篇の空間へ進む（全文・鑑賞文スレッド）</span>
                      <span>→</span>
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
