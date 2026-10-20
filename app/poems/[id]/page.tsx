import React from 'react'
import PoemDetailClient from './PoemDetailClient'

export default async function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  return <PoemDetailClient poemId={resolvedParams.id} />
}