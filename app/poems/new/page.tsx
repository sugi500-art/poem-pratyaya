'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function NewPoemFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const supabase = createClient()

  // フォーム状態
  const [currentEditId, setCurrentEditId] = useState<string | null>(editId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [writingMode, setWritingMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [agreedToReminder, setAgreedToReminder] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  // 編集モード状態
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalStatus, setOriginalStatus] = useState<'draft' | 'published' | null>(null)

  // 状態・エラーハンドリング
  const [monthlyPublishedCount, setMonthlyPublishedCount] = useState<number>(0)
  const [canPublish, setCanPublish] = useState<boolean>(true)
  const [isLoadingPoem, setIsLoadingPoem] = useState<boolean>(false)
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('')

  const MONTHLY_LIMIT = 3 // 初期運用制限：月3作

  // 編集対象の既設作品データ読み込み
  useEffect(() => {
    async function loadEditPoem() {
      if (!currentEditId) return

      try {
        setIsLoadingPoem(true)
        setErrorMsg('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setErrorMsg('推敲・編集を行うにはログインが必要です。')
          return
        }

        const { data, error } = await supabase
          .from('poems')
          .select('*')
          .eq('id', currentEditId)
          .single()

        if (error || !data) {
          setErrorMsg('編集対象の作品が見つかりません。')
          return
        }

        if (data.author_id !== user.id) {
          setErrorMsg('この作品を編集する権限がありません。')
          return
        }

        setTitle(data.title || '')
        setContent(data.content || '')
        setWritingMode(data.writing_mode || 'vertical')
        setOriginalStatus(data.status || 'draft')
        setIsEditMode(true)
      } catch (err: any) {
        console.error('推敲用作品読込エラー:', err)
        setErrorMsg('作品の読み込みに失敗しました。')
      } finally {
        setIsLoadingPoem(false)
      }
    }

    loadEditPoem()
  }, [currentEditId, supabase])

  // 月間投稿上限チェック（新規公開時のみ適用）
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

        if (error) {
          console.error('月間制限の確認エラー:', error)
        } else {
          const currentCount = count || 0
          setMonthlyPublishedCount(currentCount)
          setCanPublish(currentCount < MONTHLY_LIMIT)
        }
      } catch (err) {
        console.error('ユーザー認証確認エラー:', err)
      } finally {
        setIsLoadingCount(false)
      }
    }

    checkMonthlyLimit()
  }, [supabase])

  // 文字数 ＆ 行数カウント
  const charCount = content.length
  const lineCount = content ? content.split('\n').length : 0

  // 投稿・推敲保存処理
  // actionType: 'stay_draft' (保存して推敲継続), 'exit_draft' (保存して下書き一覧へ戻る), 'publish' (公開)
  const handleSubmit = async (actionType: 'stay_draft' | 'exit_draft' | 'publish') => {
    setErrorMsg('')
    setSaveSuccessMsg('')

    if (!title.trim()) {
      setErrorMsg('詩の題名（タイトル）を入力してください。')
      return
    }
    if (!content.trim()) {
      setErrorMsg('詩の本文を入力してください。')
      return
    }

    const targetStatus: 'draft' | 'published' = actionType === 'publish' ? 'published' : 'draft'
    const isNewPublication = targetStatus === 'published' && originalStatus !== 'published'

    if (targetStatus === 'published') {
      if (isNewPublication && !canPublish) {
        setErrorMsg(`今月の公開上限（月${MONTHLY_LIMIT}作）に達しています。下書きとして保存し、来月以降に公開してください。`)
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
        setErrorMsg('ログインセッションが切れています。再度ログインしてください。')
        setIsSubmitting(false)
        return
      }

      const nowIso = new Date().toISOString()

      if (isEditMode && currentEditId) {
        // --- 既存作品の更新 (UPDATE) ---
        const updatePayload: any = {
          title: title.trim(),
          content: content.trim(),
          writing_mode: writingMode,
          status: targetStatus,
          updated_at: nowIso,
        }

        // 下書きから公開へ昇格する場合のみ published_at を新設
        if (originalStatus === 'draft' && targetStatus === 'published') {
          updatePayload.published_at = nowIso
        }

        const { error: updateError } = await supabase
          .from('poems')
          .update(updatePayload)
          .eq('id', currentEditId)
          .eq('author_id', user.id)

        if (updateError) throw updateError

        if (actionType === 'stay_draft') {
          setSaveSuccessMsg('下書きを静かに保存しました 🕯️（このまま推敲を続けられます）')
          setOriginalStatus('draft')
        } else if (actionType === 'exit_draft') {
          router.push('/mypage?tab=drafts')
          router.refresh()
        } else {
          // 公開完了
          router.push(`/poems/${currentEditId}`)
          router.refresh()
        }
      } else {
        // --- 新規登録 (INSERT) ---
        const publishedAt = targetStatus === 'published' ? nowIso : null

        const { data, error: insertError } = await supabase
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

        if (insertError) throw insertError

        if (actionType === 'stay_draft') {
          // 新規下書きを保存し、以降は更新モードに切り替える
          setCurrentEditId(data.id)
          setIsEditMode(true)
          setOriginalStatus('draft')
          setSaveSuccessMsg('下書きを静かに保存しました 🕯️（このまま推敲を続けられます）')
          window.history.replaceState(null, '', `/poems/new?edit=${data.id}`)
        } else if (actionType === 'exit_draft') {
          router.push('/mypage?tab=drafts')
          router.refresh()
        } else {
          // 新規公開完了
          router.push(`/poems/${data.id}`)
          router.refresh()
        }
      }
    } catch (err: any) {
      setErrorMsg(`保存中にエラーが発生しました: ${err?.message || ''}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingPoem) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans text-stone-500 dark:text-stone-400">推敲室へ言葉を運んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ナビゲーション */}
        <nav className="flex justify-between items-center border-b border-stone-200/80 dark:border-stone-800 pb-4 text-xs font-sans">
          <Link
            href="/mypage?tab=drafts"
            className="text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition flex items-center gap-1.5"
          >
            <span>←</span>
            <span>下書きの部屋（マイページ）へ戻る</span>
          </Link>
          <Link
            href="/poems"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
          >
            詩篇目録を見る →
          </Link>
        </nav>

        {/* ページヘッダー */}
        <header className="text-center border-b border-stone-200/80 dark:border-stone-800 pb-8 space-y-3">
          <p className="text-xs font-sans tracking-widest text-[#D4A359] dark:text-[#E5B869] uppercase font-medium">
            Poem Pratyaya — Sanctuary & Polish Room
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            {isEditMode ? (originalStatus === 'draft' ? '下書きの推敲' : '詩篇の再推敲・編集') : '一篇の詩を紡ぐ'}
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-sans max-w-lg mx-auto leading-relaxed">
            言葉を単なる情報から解き放ち、推敲を重ね、他者の尊厳と自己の良心を照らす「響き」へと開く静寂の部屋です。
          </p>
        </header>

        {/* 推敲ステータスバナー */}
        <div className="p-4 rounded-lg border text-xs font-sans shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/90 dark:bg-[#242B3B]/90 border-stone-200 dark:border-stone-800">
          <div className="space-y-1">
            {isEditMode ? (
              originalStatus === 'draft' ? (
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 rounded text-[10px] font-medium border border-amber-300 dark:border-amber-800">
                    下書き推敲中
                  </span>
                  <span>この詩篇はまだ公開されていません。納得がいくまで言葉を磨くことができます。</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#8C621C] dark:text-[#E5B869]">
                  <span className="px-2 py-0.5 bg-[#D4A359]/20 rounded text-[10px] font-medium border border-[#D4A359]/30">
                    公開済み詩篇
                  </span>
                  <span>推敲内容を保存すると「（推敲済み）」として更新されます。月間公開上限は消費されません。</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-medium border border-stone-200 dark:border-stone-700">
                  新規作成
                </span>
                <span>
                  今月の公開状況：
                  {isLoadingCount ? '確認中...' : ` 公開済み ${monthlyPublishedCount} / ${MONTHLY_LIMIT} 作 （残り ${Math.max(0, MONTHLY_LIMIT - monthlyPublishedCount)} 作）`}
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-stone-400 font-serif italic shrink-0">
            ※ 下書き保存数に制限はありません。
          </div>
        </div>

        {/* 保存成功メッセージ通知 */}
        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg font-sans flex items-center justify-between animate-in fade-in">
            <span>{saveSuccessMsg}</span>
            <button
              onClick={() => setSaveSuccessMsg('')}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 text-sm ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2カラムレイアウト（左：エディタ / 右：リアルタイムプレビュー） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左カラム：執筆エディタ */}
          <div className="bg-white/95 dark:bg-[#242B3B]/95 p-6 sm:p-8 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6 font-sans">
            
            {/* 表示モード選択 & プレビュー表示トグル */}
            <div className="flex justify-between items-center pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="space-y-1">
                <label className="block text-xs text-stone-600 dark:text-stone-400 font-medium">組版の形式</label>
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

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-stone-500 dark:text-stone-400 hover:text-[#D4A359] underline"
              >
                {showPreview ? 'プレビューを隠す' : 'プレビューを表示'}
              </button>
            </div>

            {/* タイトル入力 */}
            <div>
              <label className="block text-xs text-stone-600 dark:text-stone-400 mb-2 font-medium">
                詩の題名（タイトル） <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力..."
                maxLength={100}
                className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-lg font-serif text-base focus:outline-none focus:border-[#D4A359] bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/70 text-[#1A1F2C] dark:text-stone-100 shadow-inner"
              />
            </div>

            {/* 本文入力 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs text-stone-600 dark:text-stone-400 font-medium">
                  本文 <span className="text-rose-500">*</span>
                </label>
                <div className="text-[11px] text-stone-400 space-x-2 font-sans">
                  <span>{charCount} 文字</span>
                  <span>・</span>
                  <span>{lineCount} 行</span>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="詩の本文を入力してください。\n余白や行間の響き（沈黙）も大切に推敲してください..."
                rows={14}
                className="w-full p-4 border border-stone-300 dark:border-stone-700 rounded-lg font-serif text-sm leading-loose focus:outline-none focus:border-[#D4A359] bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/70 text-[#1A1F2C] dark:text-stone-100 whitespace-pre-wrap shadow-inner resize-y"
              />
            </div>

          </div>

          {/* 右カラム：リアルタイムプレビュー */}
          {showPreview && (
            <div className="bg-[#FDFBF7] dark:bg-[#1A1F2C]/80 p-6 sm:p-8 rounded-xl border border-stone-200 dark:border-stone-800 shadow-inner flex flex-col min-h-[500px]">
              <div className="text-xs font-sans text-stone-400 mb-4 border-b border-stone-200/60 dark:border-stone-800 pb-2 flex justify-between items-center">
                <span>リアルタイム・プレビュー</span>
                <span>{writingMode === 'vertical' ? '縦書き' : '横書き'}</span>
              </div>

              <div className="flex-1 flex justify-center items-center overflow-auto p-4 bg-white/70 dark:bg-[#242B3B]/60 rounded-lg border border-stone-200/40 dark:border-stone-800">
                {title || content ? (
                  writingMode === 'vertical' ? (
                    /* 縦書きプレビュー表示 */
                    <div 
                      className="writing-vertical-rl text-stone-900 dark:text-stone-100 font-serif max-h-[550px] overflow-x-auto py-4 px-6 space-y-6"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      <h2 className="text-xl font-normal tracking-widest text-[#1A1F2C] dark:text-stone-100 mb-8 border-l border-stone-300 dark:border-stone-700 pl-3">
                        {title || '無題'}
                      </h2>
                      <div className="text-sm leading-loose tracking-wide whitespace-pre-wrap font-serif">
                        {content}
                      </div>
                    </div>
                  ) : (
                    /* 横書きプレビュー表示 */
                    <div className="w-full text-stone-900 dark:text-stone-100 font-serif py-4 px-2 space-y-4">
                      <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100 pb-2 border-b border-stone-200 dark:border-stone-800">
                        {title || '無題'}
                      </h2>
                      <div className="text-sm leading-loose tracking-wide whitespace-pre-wrap font-serif">
                        {content}
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-stone-400 font-sans italic text-center">
                    タイトルや本文を入力すると、こちらに静かなプレビューが表示されます。
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* 送信アクション ＆ 倫理同意カード */}
        <div className="bg-white/95 dark:bg-[#242B3B]/95 p-6 sm:p-8 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6 font-sans">
          
          {/* 同意リマインダーカード（公開時のみ必須） */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-lg">
            <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold mb-1.5">【Poem Pratyaya 倫理リマインダー】</p>
            <p className="text-xs text-stone-700 dark:text-stone-300 font-serif leading-relaxed mb-3">
              言葉は他者を裁き傷つける刃ではなく、自他の良心を照らす灯火です。推敲を重ねた言葉を静かに手渡しましょう。
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToReminder}
                onChange={(e) => setAgreedToReminder(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 dark:border-stone-700 text-[#1A1F2C] dark:text-[#D4A359] focus:ring-[#D4A359] h-4 w-4"
              />
              <span className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
                この作品は他者の尊厳を深め、自己の良心を照らす言葉であることを確認し、公開します。（下書き保存の場合はチェック不要です）
              </span>
            </label>
          </div>

          {/* エラーメッセージ表示 */}
          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-3 rounded-lg border border-rose-200 dark:border-rose-800">
              {errorMsg}
            </p>
          )}

          {/* 送信ボタン群 */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
            
            {/* 左側：下書き保存アクション */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('stay_draft')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-1.5 shadow-sm"
                title="現在の内容を下書き保存し、この画面で推敲を続けます"
              >
                <span>💾</span>
                <span>下書き保存（推敲を続ける）</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('exit_draft')}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-50 font-medium flex items-center justify-center gap-1.5"
                title="下書き保存して下書きの部屋（マイページ）へ戻ります"
              >
                <span>📂</span>
                <span>保存して下書き一覧へ</span>
              </button>
            </div>

            {/* 右側：公開アクション */}
            <button
              type="button"
              disabled={isSubmitting || (!canPublish && originalStatus !== 'published') || !agreedToReminder}
              onClick={() => handleSubmit('publish')}
              className="w-full sm:w-auto px-7 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-wider rounded-lg hover:bg-stone-800 dark:hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition shadow font-medium flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? '処理中...' : isEditMode ? '推敲内容を公開更新する' : '作品を公開する'}</span>
              {!isEditMode && canPublish && (
                <span className="opacity-80 text-[10px]">（今月残枠: {Math.max(0, MONTHLY_LIMIT - monthlyPublishedCount)}作）</span>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}

export default function NewPoemForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <p className="text-xs font-sans text-stone-400">推敲室を静かに開いています...</p>
        </div>
      }
    >
      <NewPoemFormInner />
    </Suspense>
  )
}

