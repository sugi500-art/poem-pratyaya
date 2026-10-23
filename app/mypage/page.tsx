'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function MyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get('tab');
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserAndRedirect() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login?next=/mypage');
          return;
        }

        // ログインユーザーの username を取得
        let { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        // プロファイルが存在しない場合は自動作成（フォールバック救済）
        if (!profile || !profile.username) {
          const fallbackUsername = `user_${user.id.slice(0, 8)}`;
          const fallbackDisplayName = user.user_metadata?.display_name || user.user_metadata?.full_name || '詩人';

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              username: fallbackUsername,
              display_name: fallbackDisplayName,
              role: 'user',
            })
            .select('username')
            .single();

          if (createError) throw createError;
          profile = newProfile;
        }

        // クエリパラメータがあれば保持して転送
        const destination = tabQuery
          ? `/authors/${profile.username}?tab=${tabQuery}`
          : `/authors/${profile.username}`;

        router.replace(destination);
      } catch (err: any) {
        console.error('マイページ転送エラー:', err);
        setError(err.message || 'マイページの読み込みに失敗しました。');
        setLoading(false);
      }
    }

    checkUserAndRedirect();
  }, [router, supabase, tabQuery]);

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
          href="/"
          className="inline-block px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs rounded transition font-medium"
        >
          トップページへ移動する
        </Link>
      </div>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <MyPageInner />
    </Suspense>
  );
}

