// app/poems/[id]/page.tsx

import { Suspense } from 'react';
import PoemDetailClient from './PoemDetailClient';

// params (Promise) の解凍を行う非同期コンポーネントを Suspense の内側に配置
async function PoemDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PoemDetailClient poemId={id} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[#5A6275] dark:text-stone-400 tracking-widest text-sm">
              言葉の空間を読み込んでいます...
            </p>
          </div>
        </div>
      }
    >
      <PoemDetailContent params={params} />
    </Suspense>
  );
}