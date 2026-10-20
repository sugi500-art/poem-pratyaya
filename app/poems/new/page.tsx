// 保存先: app/poems/new/page.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewPoemPage() {
  const router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [writingMode, setWritingMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [agreedToReminder, setAgreedToReminder] = useState(false)

  // 状態・エラーハンドリング
  const [monthlyPublishedCount, setMonthlyPublishedCount] = useState<number>(0)
  const [canPublish, setCanPublish] = useState<boolean>(true)
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const MONTHLY_LIMIT = 3 // 初期運用制限：月3作

  // 当月の公開上限チェック
  useEffect(() => {
    async function checkMonthlyLimit() {
      setIsLoadingCount(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoadingCount(false)
          return
        }

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count, error } = await supabase
          .from('poems')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', user.id)
          .eq('status', 'published')
          .gte('published_at', startOfMonth.toISOString())

        if (!error && count !== null) {
          setMonthlyPublishedCount(count)
          setCanPublish(count < MONTHLY_LIMIT)
        }
      } catch (err) {
        console.error('ユーザー認証確認エラー:', err)
      } finally {
        setIsLoadingCount(false)
      }
    }

    checkMonthlyLimit()
  }, [supabase])

  // 投稿処理（下書き または 公開）
  const handleSubmit = async (targetStatus: 'draft' | 'published') => {
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('詩のタイトルを入力してください。')
      return
    }
    if (!content.trim()) {
      setErrorMsg('詩の本文を入力してください。')
      return
    }

    if (targetStatus === 'published') {
      if (!canPublish) {
        setErrorMsg(`今月の公開上限（月${MONTHLY_LIMIT}作）に達しています。下書き保存をご利用いただくか、来月以降に公開してください。`)
        return
      }
      if (!agreedToReminder) {
        setErrorMsg('送信前に「他者の尊厳を深め、良心を照らす言葉ですか？」の確認チェックを入れてください。')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrorMsg('投稿を行うにはログインが必要です。ログイン後にお試しください。')
        setIsSubmitting(false)
        return
      }

      const publishedAt = targetStatus === 'published' ? new Date().toISOString() : null

      const { data, error } = await supabase
        .from('poems')
        .insert({
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          writing_mode: writingMode,
          status: targetStatus,
          published_at: publishedAt,
        })
        .select()
        .single()

      if (error) {
        console.error('詩の投稿エラー:', error)
        setErrorMsg(`投稿に失敗しました: ${error.message}`)
        setIsSubmitting(false)
      } else {
        router.push(`/poems/${data.id}`)
        router.refresh()
      }
    } catch (err: any) {
      setErrorMsg(`予期せぬエラーが発生しました: ${err?.message || ''}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ナビゲーション戻る */}
        <nav>
          <Link href="/" className="text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition">
            ← 言葉の聖域（トップページ）へ戻る
          </Link>
        </nav>

        {/* ページヘッダー */}
        <header className="text-center border-b border-stone-200/80 dark:border-stone-800 pb-8 space-y-2">
          <p className="text-xs font-sans tracking-widest text-[#D4A359] dark:text-[#E5B869] uppercase font-medium">
            Poem Pratyaya — Sanctuary Room
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            一篇の詩を紡ぐ
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-sans max-w-lg mx-auto leading-relaxed">
            言葉を単なる情報から解き放ち、推敲を重ね、他者の尊厳と自己の良心を照らす「響き」へと開く静寂の部屋です。
          </p>
        </header>

        {/* 月間制限ステータスカード */}
        <div className="p-4 bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200/80 dark:border-stone-800 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-sans">
          <div>
            <span className="font-medium text-stone-800 dark:text-stone-200">今月の公開ステータス：</span>
            {isLoadingCount ? (
              <span className="text-stone-400 ml-2">確認中...</span>
            ) : (
              <span className="ml-2 font-serif text-sm">
                今月公開済み <strong className="text-[#D4A359] dark:text-[#E5B869] text-base">{monthlyPublishedCount}</strong> / {MONTHLY_LIMIT} 作
              </span>
            )}
          </div>
          <div className="text-stone-500 dark:text-stone-400 italic font-serif text-[11px]">
            ※ 一作一作に心を込めるため、公開上限を「月{MONTHLY_LIMIT}作」に設定しています。下書き保存は無制限です。
          </div>
        </div>

        {/* 2カラムレイアウト（左：入力エディタ / 右：リアルタイムプレビュー） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左カラム：執筆エディタ */}
          <div className="bg-white/90 dark:bg-[#242B3B]/90 p-6 sm:p-8 rounded-lg border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6">
            
            {/* 表示モード選択 */}
            <div className="flex justify-between items-center pb-4 border-b border-stone-100 dark:border-stone-800">
              <label className="block text-xs font-sans text-stone-600 dark:text-stone-400">組み方向の指定</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWritingMode('vertical')}
                  className={`px-3 py-1.5 text-xs font-serif rounded transition ${
                    writingMode === 'vertical'
                      ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  縦書き（vertical）
                </button>
                <button
                  type="button"
                  onClick={() => setWritingMode('horizontal')}
                  className={`px-3 py-1.5 text-xs font-serif rounded transition ${
                    writingMode === 'horizontal'
                      ? 'bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] font-medium'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  横書き（horizontal）
                </button>
              </div>
            </div>

            {/* 題名入力 */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-xs font-sans text-stone-700 dark:text-stone-300 font-medium">
                詩の題名（タイトル）
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：静寂の破片"
                className="w-full px-4 py-2.5 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:border-[#D4A359] text-sm font-serif"
              />
            </div>

            {/* 本文入力 */}
            <div className="space-y-2">
              <label htmlFor="content" className="block text-xs font-sans text-stone-700 dark:text-stone-300 font-medium">
                詩篇本文
              </label>
              <textarea
                id="content"
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="言葉の響きを確かめながら、静かに紡いでください..."
                className="w-full px-4 py-3 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:border-[#D4A359] text-sm font-serif leading-relaxed"
              />
            </div>

            {/* 内省のリマインダー（同意チェックボックス） */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded space-y-2 text-xs font-sans">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToReminder}
                  onChange={(e) => setAgreedToReminder(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-[#D4A359] focus:ring-[#D4A359]"
                />
                <span className="text-stone-700 dark:text-stone-300 leading-relaxed font-serif">
                  この作品は、他者の尊厳を深め、良心を照らし出す「響き」として投ぜられる言葉ですか？
                </span>
              </label>
            </div>

            {/* エラーメッセージ表示 */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-sans rounded">
                {errorMsg}
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-sans rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition disabled:opacity-50"
              >
                下書き保存
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={isSubmitting || !canPublish}
                className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:bg-stone-800 dark:hover:bg-amber-500 transition shadow-sm disabled:opacity-50 font-medium"
              >
                {isSubmitting ? '送信中...' : '詩篇を静かに公開する'}
              </button>
            </div>
          </div>

          {/* 右カラム：詩篇プレビュー画面 */}
          <div className="bg-[#FBF9F5]/90 dark:bg-[#12161F]/90 p-6 sm:p-8 rounded-lg border border-stone-200 dark:border-stone-800 shadow-inner flex flex-col justify-between min-h-[500px]">
            <div>
              <p className="text-[11px] font-sans text-stone-400 dark:text-stone-500 mb-6 border-b border-stone-200/60 dark:border-stone-800 pb-2">
                — Realtime Preview （実際の紙面表示）
              </p>

              <div className="space-y-6">
                <h2 className="text-2xl font-normal text-[#1A1F2C] dark:text-stone-100 tracking-wide">
                  {title || '（無題）'}
                </h2>

                {/* 縦書き・横書きのスタイル切り替え表現 */}
                {writingMode === 'vertical' ? (
                  <div className="p-6 bg-white/80 dark:bg-[#242B3B]/80 rounded border border-stone-200/60 dark:border-stone-800 overflow-x-auto min-h-[300px] flex justify-end">
                    <p
                      className="text-sm font-serif leading-loose text-stone-800 dark:text-stone-200 whitespace-pre-wrap"
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                      }}
                    >
                      {content || 'ここに紡がれた詩文が縦書きで表示されます...'}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-white/80 dark:bg-[#242B3B]/80 rounded border border-stone-200/60 dark:border-stone-800 min-h-[300px]">
                    <p className="text-sm font-serif leading-loose text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                      {content || 'ここに紡がれた詩文が横書きで表示されます...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] font-sans text-stone-400 dark:text-stone-500 text-right mt-6 italic">
              Poem pratyaya — 評価数非表示
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}