
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function CurationManagePage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'advisor' | 'user' | null>(null)
  
  // 年月指定 (クライアントマウント時に現在の年月で初期化)
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(10)

  // フォーム状態
  const [publishedPoems, setPublishedPoems] = useState<PoemOption[]>([])
  const [selectedPoemId, setSelectedPoemId] = useState('')
  const [curationComment, setCurationComment] = useState('')
  const [ethicsAgreed, setEthicsAgreed] = useState(false)
  const [existingCuration, setExistingCuration] = useState<MonthlyCuration | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // クライアント側でのマウント時に現在年月を設定（Prerender時の Date 参照エラーを防止）
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

  // 選者権限確認とデータ取得
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

      // プロファイルから role 取得
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
        display_name: profile.display_name || profile.username || '選者',
        role: profile.role
      })
      setUserRole(profile.role)

      // 1. 公開詩篇一覧の取得
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
        .limit(50)

      if (poemsData) {
        const formatted = poemsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          published_at: p.published_at,
          author_name: p.profiles?.display_name || p.profiles?.username || '無名',
        }))
        setPublishedPoems(formatted)
      }

      // 2. 指定年月の既存登録データを取得
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

    } catch (err) {
      console.error('権限確認エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  // キュレーション登録・更新ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoemId || !curationComment.trim() || !ethicsAgreed || !currentUser) return

    try {
      setIsSubmitting(true)
      setMessage(null)

      const curatorNameLabel = currentUser.role === 'admin' 
        ? `選者：${currentUser.display_name}（主宰）` 
        : `選者：${currentUser.display_name}`

      if (existingCuration) {
        // 更新
        const { error } = await supabase
          .from('monthly_curations')
          .update({
            poem_id: selectedPoemId,
            curation_comment: curationComment.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCuration.id)

        if (error) throw error
        setMessage({ type: 'success', text: `${selectedYear}年${selectedMonth}月の選評を更新しました。` })
      } else {
        // 新規作成（1人月1作制限）
        const { error } = await supabase
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

        if (error) throw error
        setMessage({ type: 'success', text: `${selectedYear}年${selectedMonth}月の月刊選考作品と鑑賞文を登録しました。` })
      }

      // poems テーブル側にも同期（トップページヒーローエリアの高速取得用）
      await supabase
        .from('poems')
        .update({
          is_featured: true,
          curator_name: curatorNameLabel,
          curation_comment: curationComment.trim(),
          curated_at: new Date().toISOString(),
        })
        .eq('id', selectedPoemId)

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
        <p className="text-sm text-gray-500 dark:text-stone-400">選者権限を確認しています...</p>
      </div>
    )
  }

  if (!userRole || (userRole !== 'admin' && userRole !== 'advisor')) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] py-20 px-4 text-center font-sans">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-[#242B3B] border border-stone-200 dark:border-stone-800 rounded-lg space-y-4">
          <p className="text-2xl">🕯️</p>
          <h1 className="text-lg font-medium text-[#1A1F2C] dark:text-stone-100">選者専用エリア</h1>
          <p className="text-xs text-gray-500 dark:text-stone-400 leading-relaxed">
            このページは主宰および特別選者（アドバイザー）のみアクセス可能です。選者アカウントでログインの上お進みください。
          </p>
        </div>
      </div>
    )
  }

  const selectedPoemDetail = publishedPoems.find((p) => p.id === selectedPoemId)

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <header className="border-b border-[#E2DDD5] dark:border-stone-800 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
            <span>🕯️</span>
            <span>Monthly Curation / 選者専用執筆室</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1A1F2C] dark:text-stone-100">
            月刊選考・選評登録（1人1作制限）
          </h1>
          <p className="text-xs font-sans text-stone-600 dark:text-stone-400 leading-relaxed">
            ようこそ、{currentUser.display_name} 先生。毎月一篇、あなたの心に響いた詩篇と鑑賞評（選評）をお寄せください。
          </p>
        </header>

        {/* メッセージ通知 */}
        {message && (
          <div className={`p-4 rounded-lg text-xs font-sans border ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 選考フォーム */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#242B3B] p-6 sm:p-8 rounded-xl border border-[#E2DDD5] dark:border-stone-800 space-y-6 shadow-sm font-sans">
          
          {/* 年月選択 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1">対象年</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1">対象月</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
          </div>

          {/* 対象詩篇の選択 */}
          <div>
            <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
              特選として掲げる詩篇（公開作品から1作）
            </label>
            <select
              value={selectedPoemId}
              onChange={(e) => setSelectedPoemId(e.target.value)}
              className="w-full p-3 border border-[#E2DDD5] dark:border-stone-700 rounded bg-[#FBF9F5] dark:bg-[#1A1F2C] text-xs text-[#1A1F2C] dark:text-stone-100 font-serif"
              required
            >
              <option value="">-- 対象の詩篇を選択してください --</option>
              {publishedPoems.map((poem) => (
                <option key={poem.id} value={poem.id}>
                  『{poem.title}』 （詩人：{poem.author_name} / {new Date(poem.published_at).toLocaleDateString('ja-JP')}）
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

          {/* 選評・鑑賞文テキスト入力 */}
          <div>
            <label className="block text-xs text-stone-600 dark:text-stone-300 mb-1 font-medium">
              選者鑑賞文（選評）
            </label>
            <textarea
              rows={6}
              value={curationComment}
              onChange={(e) => setCurationComment(e.target.value)}
              placeholder="作品の音響（Vāc）、論理（Logos）、行間の沈黙について、静かで深遠な解釈をお書きください..."
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
              <span className="font-semibold text-[#D4A359]">【選評倫理確認】</span>
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
              {isSubmitting ? '保存中...' : existingCuration ? '選評を更新する' : '月刊特選として登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
