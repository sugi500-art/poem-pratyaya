import type { Metadata } from 'next'
import { generateAuthorMetadata } from '@/components/profile_meta_config'
import AuthorProfileClient from './AuthorProfileClient'

// SNSシェア用の動的 OGP メタデータを生成（サーバー側で実行）
export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  return await generateAuthorMetadata(params.username)
}

// 画面表示（クライアントコンポーネントの呼び出し）
export default function Page({
  params,
}: {
  params: { username: string }
}) {
  return <AuthorProfileClient params={params} />
}