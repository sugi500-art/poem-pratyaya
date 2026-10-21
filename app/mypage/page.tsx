'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function MyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserAndRedirect() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // 未ログイン時はログインページへリダイレクト
          router.push('/auth/login?next=/mypage');
          return;
        }

        // ログインユーザーの username を取得
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.username) {
          throw new Error('プロフィール情報が見つかりませんでした。');
        }

        // 自身の作品目録（プロフィール）ページへリダイレクト
        router.replace(`/authors/${profile.username}`);
      } catch (err: any) {
        console.error('マイページ転送エラー:', err);
        setError(err.message || 'マイページの読み込みに失敗しました。');
        setLoading(false);
      }
    }

    checkUserAndRedirect();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans text-stone-500 dark:text-stone-400">
            あなたの作品目録（マイページ）へ静かに案内しています...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif px-4">
      <div className="max-w-md w-full bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 p-8 text-center rounded space-y-6 shadow-sm font-sans">
        <h1 className="text-base font-medium text-stone-800 dark:text-stone-100">
          マイページの読み込みエラー
        </h1>
        <p className="text-xs text-stone-500 leading-relaxed">{error}</p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs rounded transition font-medium"
        >
          ログイン画面へ移動する
        </Link>
      </div>
    </div>
  );
}
