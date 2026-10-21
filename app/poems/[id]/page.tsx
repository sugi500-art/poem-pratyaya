import type { Metadata } from 'next'
import { generatePoemMetadata } from '@/components/profile_meta_config'
import PoemDetailClient from './PoemDetailClient' // クライアント側のメインコンポーネント

// SNSシェア用の動的 OGP メタデータを生成
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return await generatePoemMetadata(params.id)
}

export default function Page({ params }: { params: { id: string } }) {
  return <PoemDetailClient poemId={params.id} />
}