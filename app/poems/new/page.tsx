'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function NewPoemFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const supabase = createClient();

  // フォーム状態
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writingMode, setWritingMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [agreedToReminder, setAgreedToReminder] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // 編集モード状態
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<'draft' | 'published' | null>(null);

  // 状態・エラーハンドリング
  const [monthlyPublishedCount, setMonthlyPublishedCount] = useState<number>(0);
  const [canPublish, setCanPublish] = useState<boolean>(true);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const MONTHLY_LIMIT = 3; // 初期運用制限：月3作

  // 編集対象の既設作品データ読み込み
  useEffect(() => {
    async function loadEditPoem() {
      if (!editId) return;

      try {
        setIsLoadingCount(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrorMsg('編集を行うにはログインが必要です。');
          return;
        }

        const { data, error } = await supabase
          .from('poems')
          .select('*')
          .eq('id', editId)
          .single();

        if (error || !data) {
          setErrorMsg('編集対象の作品が見つかりません。');
          return;
        }

        if (data.author_id !== user.id) {
          setErrorMsg('この作品を編集する権限がありません。');
          return;
        }

        setTitle(data.title || '');
        setContent(data.content || '');
        setWritingMode(data.writing_mode || 'vertical');
        setOriginalStatus(data.status || 'draft');
        setIsEditMode(true);
      } catch (err: any) {
        console.error('編集用作品読込エラー:', err);
      } finally {
        setIsLoadingCount(false);
      }
    }

    loadEditPoem();
  }, [editId, supabase]);

  // 月間投稿上限チェック（新規作成時、または下書きから新規公開時のみ適用）
  useEffect(() => {
    async function checkMonthlyLimit() {
      setIsLoadingCount(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrorMsg('投稿を行うにはログインが必要です。');
          setIsLoadingCount(false);
          return;
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from('poems')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', user.id)
          .eq('status', 'published')
          .gte('published_at', startOfMonth.toISOString());

        if (error) {
          console.error('月間制限の確認エラー:', error);
        } else {
          const currentCount = count || 0;
          setMonthlyPublishedCount(currentCount);
          setCanPublish(currentCount < MONTHLY_LIMIT);
        }
      } catch (err) {
        console.error('ユーザー認証確認エラー:', err);
      } finally {
        setIsLoadingCount(false);
      }
    }

    checkMonthlyLimit();
  }, [supabase]);

  // 投稿・更新処理（下書き または 公開）
  const handleSubmit = async (targetStatus: 'draft' | 'published') => {
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('詩のタイトルを入力してください。');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('詩の本文を入力してください。');
      return;
    }

    // 既に公開済みの作品を更新する場合は、月上限によるブロックを行わない
    const isNewPublication = targetStatus === 'published' && originalStatus !== 'published';

    if (targetStatus === 'published') {
      if (isNewPublication && !canPublish) {
        setErrorMsg(`今月の公開上限（月${MONTHLY_LIMIT}作）に達しています。下書きとして保存するか、来月以降に公開してください。`);
        return;
      }
      if (!agreedToReminder) {
        setErrorMsg('送信前に「他者の尊厳を深め、良心を照らす言葉ですか？」の確認チェックを入れてください。');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg('ログインセッションが切れています。再度ログインしてください。');
        setIsSubmitting(false);
        return;
      }

      const nowIso = new Date().toISOString();

      if (isEditMode && editId) {
        // --- 更新（UPDATE）処理 ---
        const updatePayload: any = {
          title: title.trim(),
          content: content.trim(),
          writing_mode: writingMode,
          status: targetStatus,
          updated_at: nowIso,
        };

        // 下書きから公開へ変更する場合のみ published_at を新設
        if (originalStatus === 'draft' && targetStatus === 'published') {
          updatePayload.published_at = nowIso;
        }

        const { error: updateError } = await supabase
          .from('poems')
          .update(updatePayload)
          .eq('id', editId)
          .eq('author_id', user.id);

        if (updateError) throw updateError;

        router.push(`/poems/${editId}`);
        router.refresh();
      } else {
        // --- 新規登録（INSERT）処理 ---
        const publishedAt = targetStatus === 'published' ? nowIso : null;

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
          .single();

        if (insertError) throw insertError;

        router.push(`/poems/${data.id}`);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(`予期せぬエラーが発生しました: ${err?.message || ''}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ページヘッダー */}
        <header className="mb-10 text-center border-b border-stone-200/80 pb-8">
          <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase mb-2">
            Poem Pratyaya — Sanctuary Room
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] mb-3">
            {isEditMode ? '詩篇の推敲・編集' : '一篇の詩を紡ぐ'}
          </h1>
          <p className="text-xs text-stone-600 font-sans max-w-lg mx-auto leading-relaxed">
            言葉を単なる情報から解き放ち、推敲を重ね、他者の尊厳と自己の良心を照らす「響き」へと開く静寂の部屋です。
          </p>
        </header>

        {/* 月間制限ステータスカード */}
        {!isEditMode && (
          <div className="mb-8 p-4 bg-white/80 border border-stone-200/80 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-sans">
            <div>
              <span className="font-medium text-stone-800">今月の公開ステータス：</span>
              {isLoadingCount ? (
                <span className="text-stone-400 ml-2">確認中...</span>
              ) : (
                <span className="ml-2 font-serif text-sm">
                  今月公開済み <strong className="text-[#D4A359] text-base">{monthlyPublishedCount}</strong> / {MONTHLY_LIMIT} 作
                </span>
              )}
            </div>
            <div className="text-stone-500 italic font-serif text-[11px]">
              ※ 一作一作に心を込めるため、公開上限を「月{MONTHLY_LIMIT}作」に設定しています。下書き保存は無制限です。
            </div>
          </div>
        )}

        {/* 2カラムレイアウト（左：入力エディタ / 右：リアルタイムプレビュー） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* 左カラム：執筆エディタ */}
          <div className="bg-white p-6 sm:p-8 rounded-lg border border-stone-200 shadow-sm space-y-6">
            
            {/* 表示モード選択 & プレビュー表示トグル */}
            <div className="flex justify-between items-center pb-4 border-b border-stone-100">
              <div className="space-y-1">
                <label className="block text-xs font-sans text-stone-600">表示組み方向</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWritingMode('vertical')}
                    className={`px-3 py-1.5 text-xs font-serif rounded transition ${
                      writingMode === 'vertical'
                        ? 'bg-[#1A1F2C] text-[#FBF9F5]'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    縦書き（vertical）
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingMode('horizontal')}
                    className={`px-3 py-1.5 text-xs font-serif rounded transition ${
                      writingMode === 'horizontal'
                        ? 'bg-[#1A1F2C] text-[#FBF9F5]'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    横書き（horizontal）
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-stone-500 font-sans hover:text-stone-800 underline"
              >
                {showPreview ? 'プレビューを隠す' : 'プレビューを表示'}
              </button>
            </div>

            {/* タイトル入力 */}
            <div>
              <label className="block text-xs font-sans text-stone-600 mb-2">
                作品タイトル <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力..."
                maxLength={100}
                className="w-full p-3 border border-stone-300 rounded font-serif text-base focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]/50"
              />
            </div>

            {/* 本文入力 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-sans text-stone-600">
                  本文 <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-sans text-stone-400">
                  {content.length} 文字
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="詩の本文を入力してください..."
                rows={14}
                className="w-full p-4 border border-stone-300 rounded font-serif text-sm leading-loose focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]/50 whitespace-pre-wrap"
              />
            </div>

          </div>

          {/* 右カラム：リアルタイムプレビュー */}
          {showPreview && (
            <div className="bg-[#FBF9F5] p-6 sm:p-8 rounded-lg border border-stone-200 shadow-inner flex flex-col min-h-[500px]">
              <div className="text-xs font-sans text-stone-400 mb-4 border-b border-stone-200/60 pb-2 flex justify-between items-center">
                <span>リアルタイム・プレビュー</span>
                <span>{writingMode === 'vertical' ? '縦書き' : '横書き'}</span>
              </div>

              <div className="flex-1 flex justify-center items-center overflow-auto p-4 bg-white/60 rounded border border-stone-200/40">
                {title || content ? (
                  writingMode === 'vertical' ? (
                    /* 縦書きプレビュー表示 */
                    <div 
                      className="writing-vertical-rl text-stone-900 font-serif max-h-[550px] overflow-x-auto py-4 px-6 space-y-6"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      <h2 className="text-xl font-normal tracking-widest text-[#1A1F2C] mb-8 border-l border-stone-300 pl-3">
                        {title || '無題'}
                      </h2>
                      <div className="text-sm leading-loose tracking-wide whitespace-pre-wrap font-serif">
                        {content}
                      </div>
                    </div>
                  ) : (
                    /* 横書きプレビュー表示 */
                    <div className="w-full text-stone-900 font-serif py-4 px-2 space-y-4">
                      <h2 className="text-xl font-normal tracking-wide text-[#1A1F2C] pb-2 border-b border-stone-200">
                        {title || '無題'}
                      </h2>
                      <div className="text-sm leading-loose tracking-wide whitespace-pre-wrap font-serif">
                        {content}
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-stone-400 font-sans italic text-center">
                    本文を入力すると、こちらにプレビューが表示されます。
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* 投稿前の同意リマインダー & 送信アクション */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-stone-200 shadow-sm space-y-6">
          
          {/* 同意リマインダーカード */}
          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-md">
            <p className="text-xs font-sans text-amber-900 font-medium mb-2">【Poem Pratyaya 倫理リマインダー】</p>
            <p className="text-xs text-stone-700 font-serif leading-relaxed mb-3">
              言葉は他者を傷つける刃ではなく、自他の良心を照らす灯火です。推敲を重ねた言葉を静かに手渡しましょう。
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToReminder}
                onChange={(e) => setAgreedToReminder(e.target.checked)}
                className="rounded border-stone-300 text-[#1A1F2C] focus:ring-[#D4A359]"
              />
              <span className="text-xs font-sans text-stone-800">
                他者の尊厳を深め、良心を照らす言葉として送信することを確認します。
              </span>
            </label>
          </div>

          {/* エラーメッセージ表示 */}
          {errorMsg && (
            <p className="text-xs font-sans text-rose-600 bg-rose-50 p-3 rounded border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* 送信ボタン（下書き保存 / 今月公開） */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2 border-t border-stone-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-100 text-stone-700 text-xs font-sans rounded hover:bg-stone-200 transition disabled:opacity-50"
            >
              {isSubmitting ? '処理中...' : isEditMode ? '下書きとして保存更新' : '下書きとして保存'}
            </button>

            <button
              type="button"
              disabled={isSubmitting || (!canPublish && originalStatus !== 'published') || !agreedToReminder}
              onClick={() => handleSubmit('published')}
              className="w-full sm:w-auto px-8 py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans tracking-wider rounded hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow"
            >
              {isSubmitting
                ? '保存更新中...'
                : isEditMode
                ? '推敲内容を公開更新する'
                : `作品を公開する（今月残枠: ${Math.max(0, MONTHLY_LIMIT - monthlyPublishedCount)}作）`}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function NewPoemForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif">
          <p className="text-xs font-sans text-stone-400">推敲室を読み込んでいます...</p>
        </div>
      }
    >
      <NewPoemFormInner />
    </Suspense>
  );
}
