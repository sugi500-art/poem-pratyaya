import PoemDetailClient from './PoemDetailClient'

export default async function PoemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PoemDetailClient id={id} />
}