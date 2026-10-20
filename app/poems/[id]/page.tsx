import React from 'react'
import PoemDetailClient from './PoemDetailClient'

// サーバー側での動的レンダリング設定
export const dynamic = 'force-dynamic'

export default async function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  return <PoemDetailClient poemId={resolvedParams.id} />
}