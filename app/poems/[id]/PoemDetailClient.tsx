'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  created_at: string;
  reviewer?: Profile;
}

export default function PoemDetailClient({ id }: { id: string }) {
  const [poem, setPoem] = useState<Poem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewWritingMode, setViewWritingMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [newReviewContent, setNewReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewEthicsAgreed, setReviewEthicsAgreed] = useState(false);
  const [reviewStatusMsg, setReviewStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPoemAndReviews();
    checkCurrentUser();
  }, [id]);

  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function fetchPoemAndReviews() {
    try {
      setLoading(true);
      setError(null);

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
        .eq('id', id)
        .single();

      if (poemError || !poemData) {
        throw new Error('作品が見つからないか、非公開に設定されています。');
      }

      setPoem(poemData as Poem);
      setViewWritingMode(poemData.writing_mode || 'vertical');

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
        .eq('poem_id', id)
        .order('is_official_curation', { ascending: false })
        .order('created_at', { ascending: true });

      if (!reviewError && reviewData) {
        setReviews(reviewData as Review[]);
      }
    } catch (err: any) {
      setError(err.message || '読み込み中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewStatusMsg(null);

    if (!currentUser) {
      setReviewStatusMsg({ type: 'error', text: '鑑賞文を寄せるにはログインが必要です。' });
      return;
    }

    if (!newReviewContent.trim() || !reviewEthicsAgreed) return;

    try {
      setIsSubmittingReview(true);

      const { data, error: insertError } = await supabase
        .from('poem_reviews')
        .insert({
          poem_id: id,
          reviewer_id: currentUser.id,
          content: newReviewContent.trim(),
          is_official_curation: false,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-stone-500 tracking-widest text-sm">言葉の空間を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error || !poem) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] flex items-center justify-center font-serif px-4">
        <div className="max-w-md w-full bg-white border border-[#E2DDD5] p-8 text-center rounded space-y-6 shadow-sm">
          <h1 className="text-xl font-medium text-[#1A1F2C]">作品が見つかりません</h1>
          <p className="text-sm text-stone-600 leading-relaxed">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-widest rounded hover:bg-stone-800 transition"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const officialReviews = reviews.filter((r) => r.is_official_curation);
  const generalReviews = reviews.filter((r) => !r.is_official_curation);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased selection:bg-[#D4A359]/20">
      <header className="border-b border-[#E2DDD5] bg-[#FBF9F5]/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xs tracking-widest text-stone-600 hover:text-[#1A1F2C] transition-colors">
            ← トップへ戻る
          </Link>
          <Link href="/" className="text-sm font-semibold tracking-widest text-[#1A1F2C]">
            Poem pratyaya
          </Link>
          <div className="flex items-center space-x-1 bg-[#F4F0E8] p-1 rounded text-xs">
            <button
              onClick={() => setViewWritingMode('vertical')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'vertical' ? 'bg-white text-[#1A1F2C] shadow-sm' : 'text-stone-500'
              }`}
            >
              縦書き
            </button>
            <button
              onClick={() => setViewWritingMode('horizontal')}
              className={`px-3 py-1 rounded transition-all ${
                viewWritingMode === 'horizontal' ? 'bg-white text-[#1A1F2C] shadow-sm' : 'text-stone-500'
              }`}
            >
              横書き
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        <article className="bg-white border border-[#E2DDD5] shadow-sm rounded-lg p-8 md:p-16 relative overflow-hidden">
          <div className="mb-12 border-b border-[#E2DDD5] pb-6 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="text-xs text-[#D4A359] tracking-widest uppercase block mb-1">Poem</span>
              <h1 className="text-2xl md:text-3xl font-normal tracking-wider text-[#1A1F2C]">{poem.title}</h1>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-medium text-[#1A1F2C]">
                {poem.author?.display_name || poem.author?.username || '静かな詩人'}
              </p>
              <p className="text-xs text-stone-400">
                {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
              </p>
            </div>
          </div>

          {viewWritingMode === 'vertical' ? (
            <div className="w-full overflow-x-auto py-8 px-4 flex justify-end">
              <div
                className="text-justify h-[55vh] md:h-[65vh] overflow-x-auto overflow-y-hidden pr-6 pl-12 py-4 whitespace-pre-wrap font-serif text-lg leading-loose tracking-widest text-[#1A1F2C] border-r border-[#E2DDD5]"
                style={{ writingMode: 'vertical-rl', WebkitWritingMode: 'vertical-rl' }}
              >
                {poem.content}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto py-8 px-4">
              <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed tracking-wider text-[#1A1F2C] text-justify">
                {poem.content}
              </div>
            </div>
          )}
        </article>

        <section className="space-y-8">
          <h2 className="text-lg font-normal text-[#1A1F2C] border-b border-[#E2DDD5] pb-3">
            読者からの鑑賞文 ({generalReviews.length})
          </h2>

          {generalReviews.length === 0 ? (
            <div className="text-center py-8 bg-white border border-[#E2DDD5] rounded p-6">
              <p className="text-xs text-stone-500">まだ鑑賞文は寄せられていません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {generalReviews.map((r) => (
                <div key={r.id} className="bg-white border border-[#E2DDD5] p-6 rounded space-y-2">
                  <p className="text-xs text-stone-500">{r.reviewer?.display_name || '静かな読者'}</p>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-[#E2DDD5] p-6 rounded space-y-4">
            <h3 className="text-sm font-normal text-[#1A1F2C]">鑑賞文を寄せる</h3>
            {reviewStatusMsg && (
              <div className={`p-3 text-xs rounded ${reviewStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                {reviewStatusMsg.text}
              </div>
            )}
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={newReviewContent}
                onChange={(e) => setNewReviewContent(e.target.value)}
                placeholder="作品がもたらした響きを静かに記してください..."
                className="w-full bg-[#FBF9F5] border border-[#E2DDD5] rounded p-3 text-sm focus:outline-none focus:border-[#D4A359]"
              />
              <label className="flex items-center space-x-2 text-xs text-stone-600">
                <input
                  type="checkbox"
                  checked={reviewEthicsAgreed}
                  onChange={(e) => setReviewEthicsAgreed(e.target.checked)}
                />
                <span>他者の尊厳を尊び、良心を照らす言葉であることを確認しました</span>
              </label>
              <button
                type="submit"
                disabled={isSubmittingReview || !newReviewContent.trim() || !reviewEthicsAgreed}
                className="px-6 py-2 bg-[#1A1F2C] text-[#FBF9F5] text-xs rounded hover:bg-stone-800 disabled:opacity-40 transition"
              >
                投稿する
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}