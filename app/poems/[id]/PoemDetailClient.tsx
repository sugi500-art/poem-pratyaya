'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
  role: 'user' | 'advisor' | 'admin';
}

interface Poem {
  id: string;
  author_id: string;
  title: string;
  content: string;
  writing_mode: 'vertical' | 'horizontal';
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  author?: Profile;
}

interface Review {
  id: string;
  poem_id: string;
  reviewer_id: string;
  content: string;
  is_official_curation: boolean;
  parent_id?: string | null;
  created_at: string;
  reviewer?: Profile;
}

export default function PoemDetailClient({ poemId }: { poemId: string }) {
  const [poem, setPoem] = useState<Poem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表示モード（初期値は作品の設定、後から読者が切り替え可能）
  const [viewWritingMode, setViewWritingMode] = useState<'vertical' | 'horizontal'>('vertical');

  // 新規鑑賞文入力状態（親コメント用）
  const [newReviewContent, setNewReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewEthicsAgreed, setReviewEthicsAgreed] = useState(false);
  const [reviewStatusMsg, setReviewStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // スレッド返信入力状態
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyEthicsAgreed, setReplyEthicsAgreed] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyStatusMsg, setReplyStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 削除処理状態
  const [isDeletingPoem, setIsDeletingPoem] = useState(false);

  // ユーザー状態
  const [currentUser, setCurrentUser] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (poemId) {
      fetchPoemAndReviews();
      checkCurrentUser();
    }
  }, [poemId]);

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function fetchPoemAndReviews() {
    try {
      setLoading(true);
      setError(null);

      // 詩作品の取得
      const { data: poemData, error: poemError } = await supabase
        .from('poems')
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('id', poemId)
        .single();

      if (poemError || !poemData) {
        throw new Error('作品が見つからないか、非公開に設定されています。');
      }

      setPoem(poemData as Poem);
      setViewWritingMode(poemData.writing_mode || 'vertical');

      // 鑑賞文・選評の取得（parent_idも含む）
      const { data: reviewData, error: reviewError } = await supabase
        .from('poem_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('poem_id', poemId)
        .order('is_official_curation', { ascending: false })
        .order('created_at', { ascending: true });

      if (reviewError) {
        console.error('鑑賞文取得エラー:', reviewError);
      } else {
        setReviews((reviewData || []) as Review[]);
      }
    } catch (err: any) {
      setError(err.message || '読み込み中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }

  // 作品削除ハンドラ
  async function handleDeletePoem() {
    if (!poem || !currentUser || poem.author_id !== currentUser.id) return;
    if (!confirm('この詩篇を削除しますか？削除された言葉は復元できません。')) return;

    try {
      setIsDeletingPoem(true);
      const { error: deleteError } = await supabase
        .from('poems')
        .delete()
        .eq('id', poemId);

      if (deleteError) throw deleteError;

      alert('詩篇を削除しました。');
      router.push('/poems');
    } catch (err: any) {
      alert('削除に失敗しました: ' + (err.message || 'エラーが発生しました。'));
    } finally {
      setIsDeletingPoem(false);
    }
  }

  // 鑑賞文・応答の削除ハンドラ
  async function handleDeleteReview(reviewId: string) {
    if (!currentUser) return;
    if (!confirm('この鑑賞文（言葉の応答）を削除しますか？')) return;

    try {
      const { error: deleteError } = await supabase
        .from('poem_reviews')
        .delete()
        .eq('id', reviewId);

      if (deleteError) throw deleteError;

      setReviews((prev) => prev.filter((r) => r.id !== reviewId && r.parent_id !== reviewId));
    } catch (err: any) {
      alert('鑑賞文の削除に失敗しました: ' + (err.message || 'エラーが発生しました。'));
    }
  }

  // 新規トップレベル鑑賞文の送信処理
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewStatusMsg(null);

    if (!currentUser) {
      setReviewStatusMsg({ type: 'error', text: '鑑賞文を寄せるにはログインが必要です。' });
      return;
    }

    if (!newReviewContent.trim()) {
      setReviewStatusMsg({ type: 'error', text: '鑑賞文の本文を入力してください。' });
      return;
    }

    if (!reviewEthicsAgreed) {
      setReviewStatusMsg({ type: 'error', text: '倫理指針の確認にチェックを入れてください。' });
      return;
    }

    try {
      setIsSubmittingReview(true);

      const { data, error: insertError } = await supabase
        .from('poem_reviews')
        .insert({
          poem_id: poemId,
          reviewer_id: currentUser.id,
          content: newReviewContent.trim(),
          is_official_curation: false,
          parent_id: null,
        })
        .select(`
          *,
          reviewer:profiles!reviewer_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (insertError) throw insertError;

      setReviews((prev) => [...prev, data as Review]);
      setNewReviewContent('');
      setReviewEthicsAgreed(false);
      setReviewStatusMsg({ type: 'success', text: '言葉を繋ぐ鑑賞文を投稿しました。' });
    } catch (err: any) {
      setReviewStatusMsg({ type: 'error', text: err.message || '鑑賞文の送信に失敗しました。' });
    } finally {
      setIsSubmittingReview(false);
    }
  }

  // 返信スレッド送信処理
  async function handleReplySubmit(parentId: string, e: React.FormEvent) {
    e.preventDefault();
    setReplyStatusMsg(null);

    if (!currentUser) {
      setReplyStatusMsg({ type: 'error', text: '返信するにはログインが必要です。' });
      return;
    }

    if (!replyContent.trim()) {
      setReplyStatusMsg({ type: 'error', text: '返信本文を入力してください。' });
      return;
    }

    if (!replyEthicsAgreed) {
      setReplyStatusMsg({ type: 'error', text: '倫理指針の確認にチェックを入れてください。' });
      return;
    }

    try {
      setIsSubmittingReply(true);

      const { data, error: insertError } = await supabase
        .from('poem_reviews')
        .insert({
          poem_id: poemId,
          reviewer_id: currentUser.id,
          content: replyContent.trim(),
          is_official_curation: false,
          parent_id: parentId,
        })
        .select(`
          *,
          reviewer:profiles!reviewer_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (insertError) throw insertError;

      setReviews((prev) => [...prev, data as Review]);
      setReplyContent('');
      setReplyEthicsAgreed(false);
      setReplyingToId(null);
    } catch (err: any) {
      setReplyStatusMsg({ type: 'error', text: err.message || '返信の送信に失敗しました。' });
    } finally {
      setIsSubmittingReply(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#5A6275] dark:text-stone-400 tracking-widest text-sm">言葉の空間を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error || !poem) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#242B3B] border border-[#E5E0D8] dark:border-stone-800 p-8 text-center rounded space-y-6 shadow-sm">
          <h1 className="text-xl font-medium text-[#1A1F2C] dark:text-stone-100">作品が見つかりません</h1>
          <p className="text-sm text-[#5A6275] dark:text-stone-400 leading-relaxed">{error}</p>
          <Link
            href="/poems"
            className="inline-block px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-widest rounded hover:opacity-90 transition-all font-medium"
          >
            詩篇一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  // レビューの分類
  const officialReviews = reviews.filter((r) => r.is_official_curation);
  const generalReviews = reviews.filter((r) => !r.is_official_curation);

  // 親コメントと返信スレッドのグループ化
  const topLevelReviews = generalReviews.filter((r) => !r.parent_id);
  const getRepliesForParent = (parentId: string) =>
    generalReviews.filter((r) => r.parent_id === parentId);

  const isPoemAuthor = currentUser && poem.author_id === currentUser.id;

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif antialiased selection:bg-[#D4A359]/20 pb-20">
      {/* ページヘッダー */}
      <header className="border-b border-[#E5E0D8] dark:border-stone-800 bg-[#FBF9F5]/90 dark:bg-[#1A1F2C]/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/poems"
            className="text-xs tracking-widest text-[#5A6275] dark:text-stone-400 hover:text-[#1A1F2C] dark:hover:text-stone-100 transition-colors flex items-center space-x-2"
          >
            <span>←</span>
            <span>詩篇目録へ</span>
          </Link>

          <Link href="/" className="text-sm font-semibold tracking-widest text-[#1A1F2C] dark:text-stone-100">
            Poem pratyaya
          </Link>

          {/* 表示モード切り替えボタン */}
          <div className="flex items-center space-x-1 bg-[#EBE6DD] dark:bg-stone-800 p-1 rounded text-xs tracking-wider">
            <button
              onClick={() => setViewWritingMode('vertical')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'vertical'
                  ? 'bg-white dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 shadow-sm font-medium'
                  : 'text-[#5A6275] dark:text-stone-400 hover:text-[#1A1F2C]'
              }`}
            >
              縦書き
            </button>
            <button
              onClick={() => setViewWritingMode('horizontal')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'horizontal'
                  ? 'bg-white dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-stone-100 shadow-sm font-medium'
                  : 'text-[#5A6275] dark:text-stone-400 hover:text-[#1A1F2C]'
              }`}
            >
              横書き
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* 作品表示エリア */}
        <article className="bg-white dark:bg-[#242B3B] border border-[#E5E0D8] dark:border-stone-800 shadow-sm rounded-lg p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4A359]/10 to-transparent pointer-events-none rounded-bl-full" />

          {/* 作品メタ情報 & 作者用操作ボタン */}
          <div className="mb-12 border-b border-[#E5E0D8] dark:border-stone-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs text-[#8C92A4] dark:text-stone-400 tracking-widest uppercase block mb-1">Poem</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[#1A1F2C] dark:text-stone-100">{poem.title}</h1>
            </div>

            <div className="text-right space-y-2">
              <p className="text-sm font-medium text-[#1A1F2C] dark:text-stone-200">
                <Link href={`/profile/${poem.author?.username || 'anonymous'}`} className="hover:text-[#D4A359] transition">
                  {poem.author?.display_name || poem.author?.username || '匿名'}
                </Link>
                {poem.author?.role === 'advisor' && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] dark:text-[#E5B869] rounded tracking-wider">
                    特別選者
                  </span>
                )}
                {poem.author?.role === 'admin' && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#1A1F2C] text-[#FBF9F5] dark:bg-[#D4A359] dark:text-[#1A1F2C] rounded tracking-wider">
                    主宰
                  </span>
                )}
              </p>

              <div className="flex items-center justify-end gap-3 text-xs font-sans text-stone-500 dark:text-stone-400">
                <span>{poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}</span>

                {/* 作者本人のみ表示される操作メニュー */}
                {isPoemAuthor && (
                  <div className="flex items-center gap-2 pl-3 border-l border-stone-200 dark:border-stone-700">
                    <button
                      onClick={handleDeletePoem}
                      disabled={isDeletingPoem}
                      className="px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition font-medium"
                      title="この作品を削除する"
                    >
                      {isDeletingPoem ? '削除中...' : '🗑️ 作品を削除'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 詩本文エリア */}
          {viewWritingMode === 'vertical' ? (
            <div className="w-full overflow-x-auto py-8 px-4 flex justify-end">
              <div
                className="text-justify h-[55vh] md:h-[65vh] overflow-x-auto overflow-y-hidden pr-6 pl-12 py-4 whitespace-pre-wrap font-serif text-lg leading-loose tracking-widest text-[#1A1F2C] dark:text-stone-100 border-r border-[#F0EBE1] dark:border-stone-800"
                style={{
                  writingMode: 'vertical-rl',
                  WebkitWritingMode: 'vertical-rl',
                }}
              >
                {poem.content}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto py-8 px-4">
              <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed tracking-wider text-[#1A1F2C] dark:text-stone-100 text-justify space-y-4">
                {poem.content}
              </div>
            </div>
          )}
        </article>

        {/* 公式選評 */}
        {officialReviews.length > 0 && (
          <section className="bg-[#FDFBF7] dark:bg-[#1E2533] border-l-4 border-[#D4A359] border-y border-r border-[#E5E0D8] dark:border-stone-800 rounded-r-lg p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center space-x-3 border-b border-[#E5E0D8] dark:border-stone-800 pb-3">
              <span className="text-lg text-[#D4A359]">🕯️</span>
              <h2 className="text-base font-medium tracking-widest text-[#1A1F2C] dark:text-stone-100">月刊公式選評・鑑賞文</h2>
            </div>

            <div className="space-y-6">
              {officialReviews.map((review) => (
                <div key={review.id} className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8C92A4] dark:text-stone-400">
                    <span className="font-medium text-[#1A1F2C] dark:text-stone-200">
                      {review.reviewer?.display_name || review.reviewer?.username} （選評）
                    </span>
                    <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#2C3448] dark:text-stone-300 whitespace-pre-wrap bg-white/60 dark:bg-black/20 p-4 rounded border border-[#E5E0D8] dark:border-stone-800">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 読者鑑賞文 ＆ 返信スレッドエリア */}
        <section className="space-y-8">
          <div className="border-b border-[#E5E0D8] dark:border-stone-800 pb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-widest text-[#1A1F2C] dark:text-stone-100 flex items-center space-x-2">
              <span>読者からの鑑賞文・言葉の応答</span>
              <span className="text-xs bg-[#EBE6DD] dark:bg-stone-800 text-[#5A6275] dark:text-stone-300 px-2 py-0.5 rounded-full">
                {generalReviews.length}
              </span>
            </h2>
            <span className="text-xs text-[#8C92A4] dark:text-stone-400 tracking-wider">順位付けなき深層対話</span>
          </div>

          {/* 鑑賞文・スレッド一覧 */}
          {topLevelReviews.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#242B3B] border border-[#E5E0D8] dark:border-stone-800 rounded p-8 space-y-2">
              <p className="text-sm text-[#5A6275] dark:text-stone-300">まだこの詩篇への鑑賞文は寄せられていません。</p>
              <p className="text-xs text-[#8C92A4] dark:text-stone-400">静かに言葉を受け止め、最初の鑑賞文を寄せてみませんか。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {topLevelReviews.map((review) => {
                const childReplies = getRepliesForParent(review.id);
                const isAuthorOfPoem = review.reviewer_id === poem.author_id;
                const isReviewOwner = currentUser && review.reviewer_id === currentUser.id;

                return (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-[#242B3B] border border-[#E5E0D8] dark:border-stone-800 rounded-lg p-6 space-y-4 shadow-sm hover:border-[#D4A359]/50 transition-colors"
                  >
                    {/* 親鑑賞文 ヘッダー */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/profile/${review.reviewer?.username || 'anonymous'}`}
                          className="font-medium text-[#1A1F2C] dark:text-stone-100 hover:text-[#D4A359] transition"
                        >
                          {review.reviewer?.display_name || review.reviewer?.username || '静かな読者'}
                        </Link>
                        {isAuthorOfPoem && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#D4A359]/20 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/40 rounded">
                            作者（詩人）
                          </span>
                        )}
                        {review.reviewer?.role === 'advisor' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded">
                            特別選者
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[#8C92A4] dark:text-stone-400 font-sans">
                        <span>
                          {new Date(review.created_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {/* 投稿者本人の削除ボタン */}
                        {isReviewOwner && (
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition text-[11px]"
                            title="鑑賞文を削除"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 本文 */}
                    <p className="text-sm leading-relaxed text-[#2C3448] dark:text-stone-200 whitespace-pre-wrap font-serif">
                      {review.content}
                    </p>

                    {/* アクションボタン（返信する） */}
                    <div className="pt-2 flex items-center justify-between text-xs font-sans border-t border-stone-100 dark:border-stone-800">
                      <button
                        onClick={() => {
                          setReplyingToId(replyingToId === review.id ? null : review.id);
                          setReplyContent('');
                          setReplyStatusMsg(null);
                        }}
                        className="text-[#D4A359] dark:text-[#E5B869] hover:underline font-medium flex items-center gap-1"
                      >
                        <span>💬</span>
                        <span>{replyingToId === review.id ? '返信フォームを閉じる' : 'この鑑賞文に応答（返信）する'}</span>
                      </button>
                      {childReplies.length > 0 && (
                        <span className="text-stone-400 text-[11px]">返信 {childReplies.length}件</span>
                      )}
                    </div>

                    {/* 返信フォーム（インライン展開） */}
                    {replyingToId === review.id && (
                      <div className="bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#D4A359]/40 rounded-lg p-4 space-y-4 font-sans text-xs mt-3">
                        <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                          <span className="font-medium text-[#1A1F2C] dark:text-stone-200">
                            「{review.reviewer?.display_name || review.reviewer?.username}」さんへの言葉の応答
                          </span>
                          <button
                            onClick={() => setReplyingToId(null)}
                            className="text-stone-400 hover:text-stone-600"
                          >
                            ✕ キャンセル
                          </button>
                        </div>

                        {replyStatusMsg && (
                          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded">
                            {replyStatusMsg.text}
                          </div>
                        )}

                        <textarea
                          rows={3}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="感応や感謝、作品の背景についての対話の言葉を添えてください..."
                          className="w-full bg-white dark:bg-[#242B3B] border border-stone-200 dark:border-stone-700 rounded p-3 text-xs text-[#1A1F2C] dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-[#D4A359] font-serif"
                        />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <label className="flex items-center gap-2 cursor-pointer text-stone-600 dark:text-stone-300 select-none">
                            <input
                              type="checkbox"
                              checked={replyEthicsAgreed}
                              onChange={(e) => setReplyEthicsAgreed(e.target.checked)}
                              className="rounded border-stone-300 text-[#D4A359] focus:ring-[#D4A359]"
                            />
                            <span>相手の尊厳と良心を尊重する言葉ですか？</span>
                          </label>

                          <button
                            onClick={(e) => handleReplySubmit(review.id, e)}
                            disabled={isSubmittingReply || !replyContent.trim() || !replyEthicsAgreed}
                            className="px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 disabled:opacity-40 font-medium transition"
                          >
                            {isSubmittingReply ? '送信中...' : '応答を届ける'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ネストされた返信スレッドリスト */}
                    {childReplies.length > 0 && (
                      <div className="pl-4 md:pl-8 border-l-2 border-[#D4A359]/30 space-y-3 mt-4 pt-2">
                        {childReplies.map((reply) => {
                          const isReplyFromPoemAuthor = reply.reviewer_id === poem.author_id;
                          const isReplyOwner = currentUser && reply.reviewer_id === currentUser.id;

                          return (
                            <div
                              key={reply.id}
                              className="bg-[#FBF9F5]/80 dark:bg-[#1A1F2C]/80 border border-[#E5E0D8] dark:border-stone-800 rounded-lg p-4 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between font-sans">
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/profile/${reply.reviewer?.username || 'anonymous'}`}
                                    className="font-medium text-[#1A1F2C] dark:text-stone-100 hover:text-[#D4A359] transition"
                                  >
                                    {reply.reviewer?.display_name || reply.reviewer?.username || '読者'}
                                  </Link>
                                  {isReplyFromPoemAuthor && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#D4A359] text-white dark:text-[#1A1F2C] rounded font-medium">
                                      作者の応答（詩人）
                                    </span>
                                  )}
                                  {reply.reviewer?.role === 'advisor' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded">
                                      特別選者
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-stone-400">
                                  <span>
                                    {new Date(reply.created_at).toLocaleString('ja-JP', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {isReplyOwner && (
                                    <button
                                      onClick={() => handleDeleteReview(reply.id)}
                                      className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition text-[11px]"
                                      title="返信を削除"
                                    >
                                      削除
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs leading-relaxed text-[#2C3448] dark:text-stone-200 whitespace-pre-wrap font-serif">
                                {reply.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 新規トップレベル鑑賞文投稿フォーム */}
          <div className="bg-white dark:bg-[#242B3B] border border-[#E5E0D8] dark:border-stone-800 rounded-lg p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-medium tracking-widest text-[#1A1F2C] dark:text-stone-100 border-b border-[#E5E0D8] dark:border-stone-800 pb-3">
              新しい鑑賞文・考察を寄せる
            </h3>

            {reviewStatusMsg && (
              <div
                className={`p-4 rounded text-xs leading-relaxed ${
                  reviewStatusMsg.type === 'success'
                    ? 'bg-[#E8F3EE] text-[#1D5C42] border border-[#B3DBC8]'
                    : 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F8B4B4]'
                }`}
              >
                {reviewStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div>
                <label className="block text-xs text-[#5A6275] dark:text-stone-400 tracking-wider mb-2">
                  言葉の響きや像（イメージ）についての鑑賞・考察
                </label>
                <textarea
                  rows={4}
                  value={newReviewContent}
                  onChange={(e) => setNewReviewContent(e.target.value)}
                  placeholder="作品の一音・一節がもたらした感触、あるいは言葉の背景について静かに記してください..."
                  className="w-full bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-[#E5E0D8] dark:border-stone-700 rounded p-4 text-sm text-[#1A1F2C] dark:text-stone-100 placeholder-[#8C92A4] focus:outline-none focus:border-[#D4A359] focus:bg-white dark:focus:bg-[#1F2636] transition-all font-serif resize-y"
                  disabled={isSubmittingReview}
                />
              </div>

              {/* 倫理確認リマインダー */}
              <div className="bg-[#FDFBF7] dark:bg-[#1A1F2C] border border-[#E5E0D8] dark:border-stone-800 p-4 rounded space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewEthicsAgreed}
                    onChange={(e) => setReviewEthicsAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E5E0D8] text-[#D4A359] focus:ring-[#D4A359]"
                  />
                  <span className="text-xs text-[#2C3448] dark:text-stone-300 leading-relaxed select-none">
                    ※ この言葉は、作品と作者への敬意を払い、他者の尊厳を深め、良心を照らすものですか？（誹謗中傷や攻撃的な言説を排除します）
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReviewContent.trim() || !reviewEthicsAgreed}
                  className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs tracking-widest rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
                >
                  {isSubmittingReview ? '送信中...' : '鑑賞文を投稿する'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* 静かなフッター */}
      <footer className="border-t border-[#E5E0D8] dark:border-stone-800 py-8 text-center text-xs text-[#8C92A4] dark:text-stone-500 tracking-widest mt-20">
        <p>Poem pratyaya — 真理と愛、理解と共感の言葉の空間</p>
      </footer>
    </div>
  );
}
