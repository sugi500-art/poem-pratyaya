'use client'

import React, { useState, useEffect, Suspense, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url?: string | null
  role: 'user' | 'advisor' | 'admin'
  created_at: string
}

interface Poem {
  id: string
  author_id: string
  title: string
  content: string
  writing_mode: 'vertical' | 'horizontal'
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
}

interface PoemReview {
  id: string
  poem_id: string
  content: string
  created_at: string
  poem?: {
    id: string
    title: string
  }
}

function ProfileContent({ params }: { params: Promise<{ username: string }> | { username: string } }) {
  // Next.js 14 / 15 両対応の params 展開
  const resolvedParams = typeof (params as any).then === 'function' ? use(params as Promise<{ username: string }>) : (params as { username: string })
  const rawTarget = resolvedParams.username || ''
  const targetKey = decodeURIComponent(rawTarget).replace(/^%40|^\@/, '')

  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [publishedPoems, setPublishedPoems] = useState<Poem[]>([])
  const [draftPoems, setDraftPoems] = useState<Poem[]>([])
  const [userReviews, setUserReviews] = useState<PoemReview[]>([])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URL コピー状態
  const [copiedUrl, setCopiedUrl] = useState(false)

  // タブ ('published' | 'drafts' | 'reviews')
  const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'reviews'>('published')

  // プロフィール編集モーダル状態
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 退会（アカウント削除）モーダル状態
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmAgreed, setDeleteConfirmAgreed] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (targetKey) {
      loadProfileData()
    }
  }, [targetKey])

  async function loadProfileData() {
    try {
      setLoading(true)
      setError(null)

      // 1. ログインユーザーの取得
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // 2. プロフィール情報の取得（UUID形式・ユーザー名形式の両対応）
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetKey)
      
      const profileQuery = isUuid
        ? supabase.from('profiles').select('*').eq('id', targetKey)
        : supabase.from('profiles').select('*').eq('username', targetKey)

      const { data: profileData, error: profileError } = await profileQuery.maybeSingle()

      if (profileError || !profileData) {
        throw new Error('指定された詩人・利用者のプロフィールが見つかりません。')
      }

      setProfile(profileData as Profile)
      setEditDisplayName(profileData.display_name || '')
      setEditBio(profileData.bio || '')

      const ownerCheck = user?.id === profileData.id
      setIsOwner(ownerCheck)

      // 3. 公開済み詩篇の取得
      const { data: publishedData } = await supabase
        .from('poems')
        .select('*')
        .eq('author_id', profileData.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      setPublishedPoems((publishedData || []) as Poem[])

      // 4. 本人の場合：下書き詩篇の取得
      if (ownerCheck) {
        const { data: draftData } = await supabase
          .from('poems')
          .select('*')
          .eq('author_id', profileData.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })

        setDraftPoems((draftData || []) as Poem[])
      }

      // 5. 寄せた鑑賞文（Pratyaya）の取得
      const { data: reviewData } = await supabase
        .from('poem_reviews')
        .select(`
          id,
          poem_id,
          content,
          created_at,
          poem:poems!poem_id (
            id,
            title
          )
        `)
        .eq('reviewer_id', profileData.id)
        .order('created_at', { ascending: false })

      setUserReviews((reviewData || []) as any[])

    } catch (err: any) {
      setError(err.message || 'データ読込中にエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  // プロフィールURLコピー処理
  const handleCopyProfileUrl = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 3000)
    } catch (err) {
      console.error('URLコピー失敗:', err)
    }
  }

  // プロフィール保存
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !isOwner) return

    try {
      setIsSaving(true)
      setSaveMsg(null)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      setProfile((prev) => prev ? {
        ...prev,
        display_name: editDisplayName.trim() || null,
        bio: editBio.trim() || null,
      } : null)

      setSaveMsg({ type: 'success', text: 'プロフィールを更新しました。' })
      setIsEditing(false)
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err.message || '更新に失敗しました。' })
    } finally {
      setIsSaving(false)
    }
  }

  // アカウント退会（削除）
  async function handleDeleteAccount() {
    if (!currentUser || !isOwner || !deleteConfirmAgreed) return

    try {
      setIsDeletingAccount(true)
      setDeleteError(null)

      const { error: rpcError } = await supabase.rpc('delete_user_account')
      if (rpcError) throw rpcError

      await supabase.auth.signOut()
      alert('退会手続き（アカウント削除）が完了いたしました。ご利用いただき誠にありがとうございました。')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      console.error('退会処理エラー:', err)
      setDeleteError(err.message || '退会処理中にエラーが発生しました。')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#D4A359] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans text-stone-500 dark:text-stone-400">プロファイルを静かに読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif px-4">
        <div className="max-w-md w-full bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 p-8 text-center rounded space-y-6 shadow-sm">
          <h1 className="text-lg font-normal">詩人・利用者が見つかりません</h1>
          <p className="text-xs text-stone-500 font-sans leading-relaxed">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded transition"
          >
            聖域（トップ）へ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ナビゲーション */}
        <nav className="flex justify-between items-center border-b border-stone-200/80 dark:border-stone-800 pb-4">
          <Link href="/" className="text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition">
            ← 言葉の聖域へ戻る
          </Link>
          <span className="text-xs font-sans text-stone-400">
            Poem pratyaya — Member Profile
          </span>
        </nav>

        {/* プロフィールヘッダーカード */}
        <div className="bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 rounded-lg p-6 sm:p-10 shadow-sm space-y-6 relative">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* イニシャルアイコン */}
              <div className="w-16 h-16 rounded-full bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] flex items-center justify-center text-xl font-serif font-medium shadow-sm shrink-0">
                {(profile.display_name || profile.username || '無').slice(0, 1)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
                    {profile.display_name || profile.username}
                  </h1>

                  {/* ロールバッジ */}
                  {profile.role === 'admin' && (
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium">
                      主宰
                    </span>
                  )}
                  {profile.role === 'advisor' && (
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-emerald-700 text-white rounded font-medium">
                      特別選者
                    </span>
                  )}
                  {profile.role === 'user' && (
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded">
                      詩人・読者
                    </span>
                  )}
                </div>

                <p className="text-xs font-sans text-stone-400">
                  @{profile.username} ・ 参加日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            {/* 操作ボタンエリア（名刺代わりのURLコピー ＆ 本人用設定） */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* URLコピーボタン（誰でも使える共有ボタン） */}
              <button
                onClick={handleCopyProfileUrl}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 border rounded text-xs font-sans transition shadow-sm font-medium ${
                  copiedUrl
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-[#F4F0E8] dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-[#D4A359]'
                }`}
                title="この作品一覧プロフィールのURLをコピー（SNSや名刺代わりに共有できます）"
              >
                <span>{copiedUrl ? '✓' : '🔗'}</span>
                <span>{copiedUrl ? 'URLをコピーしました 🕯️' : '作品目録（プロフィール）URLをコピー'}</span>
              </button>

              {/* 本人認証時：編集・退会ボタン */}
              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-2 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-sans rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-2.5 py-2 text-rose-600 dark:text-rose-400 text-xs font-sans hover:underline transition"
                    title="退会手続き（アカウント削除）"
                  >
                    退会
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 自己紹介文（または編集フォーム） */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
              <div className="space-y-1">
                <label className="block text-xs font-sans text-stone-600 dark:text-stone-400">表示名（筆名）</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="表示名を入力..."
                  className="w-full px-3 py-2 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded text-xs font-serif focus:outline-none focus:border-[#D4A359]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-sans text-stone-600 dark:text-stone-400">自己紹介・詩的関心</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="関心のある言葉、言葉の響き、詩作の背景など..."
                  className="w-full px-3 py-2 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded text-xs font-serif leading-relaxed focus:outline-none focus:border-[#D4A359]"
                />
              </div>

              {saveMsg && (
                <p className={`text-xs p-2 rounded font-sans ${saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {saveMsg.text}
                </p>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-sans"
                >
                  アカウントを削除（退会）する
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 text-xs font-sans text-stone-500 hover:text-stone-800"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-1.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs font-sans rounded hover:opacity-90 transition disabled:opacity-50 font-medium"
                  >
                    {isSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <p className="text-xs font-serif leading-relaxed text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                {profile.bio || '（自己紹介文はまだ設定されていません。）'}
              </p>
            </div>
          )}

          {/* 統計情報 */}
          <div className="flex gap-6 text-xs font-sans text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-4">
            <div>
              公開詩篇：<strong className="text-stone-800 dark:text-stone-200 font-serif text-sm">{publishedPoems.length}</strong> 篇
            </div>
            {isOwner && (
              <div>
                下書き：<strong className="text-[#D4A359] font-serif text-sm">{draftPoems.length}</strong> 篇
              </div>
            )}
            <div>
              寄せた鑑賞文：<strong className="text-stone-800 dark:text-stone-200 font-serif text-sm">{userReviews.length}</strong> 件
            </div>
          </div>
        </div>

        {/* タブ切替 & コンテンツエリア */}
        <div className="space-y-6">
          
          {/* タブナビゲーション */}
          <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs font-sans gap-6">
            <button
              onClick={() => setActiveTab('published')}
              className={`pb-3 transition relative font-medium ${
                activeTab === 'published'
                  ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              公開作品 ({publishedPoems.length})
            </button>

            {isOwner && (
              <button
                onClick={() => setActiveTab('drafts')}
                className={`pb-3 transition relative font-medium ${
                  activeTab === 'drafts'
                    ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                下書きの部屋 ({draftPoems.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 transition relative font-medium ${
                activeTab === 'reviews'
                  ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              寄せた鑑賞文 ({userReviews.length})
            </button>
          </div>

          {/* タブ 1: 公開作品一覧 */}
          {activeTab === 'published' && (
            <div className="space-y-4">
              {publishedPoems.length > 0 ? (
                publishedPoems.map((poem) => (
                  <Link
                    key={poem.id}
                    href={`/poems/${poem.id}`}
                    className="block p-5 bg-white/80 dark:bg-[#242B3B]/80 border border-stone-200/80 dark:border-stone-800 rounded-lg hover:border-[#D4A359] transition shadow-sm space-y-2 group"
                  >
                    <div className="flex justify-between items-center text-xs font-sans text-stone-400">
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded text-[10px]">
                        {poem.writing_mode === 'vertical' ? '縦書き' : '横書き'}
                      </span>
                      <span>
                        {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
                      </span>
                    </div>

                    <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition">
                      『{poem.title}』
                    </h3>

                    <p className="text-xs font-serif text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                      {poem.content}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center bg-white/50 dark:bg-[#242B3B]/50 rounded border border-stone-200/60 dark:border-stone-800 text-xs font-sans text-stone-400">
                  まだ公開された作品はありません。
                </div>
              )}
            </div>
          )}

          {/* タブ 2: 下書き作品一覧（本人のみ） */}
          {activeTab === 'drafts' && isOwner && (
            <div className="space-y-4">
              {draftPoems.length > 0 ? (
                draftPoems.map((poem) => (
                  <div
                    key={poem.id}
                    className="p-5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs font-sans text-stone-400">
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded text-[10px]">
                        下書き
                      </span>
                      <span>保存日時: {new Date(poem.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>

                    <h3 className="text-base font-normal text-[#1A1F2C] dark:text-stone-100">
                      『{poem.title || '無題'}』
                    </h3>

                    <p className="text-xs font-serif text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                      {poem.content}
                    </p>

                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/poems/new?edit=${poem.id}`}
                        className="text-xs font-sans text-[#D4A359] hover:underline"
                      >
                        編集・推敲を再開する →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white/50 dark:bg-[#242B3B]/50 rounded border border-stone-200/60 dark:border-stone-800 text-xs font-sans text-stone-400">
                  下書き中の作品はありません。
                </div>
              )}
            </div>
          )}

          {/* タブ 3: 寄せた鑑賞文一覧 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {userReviews.length > 0 ? (
                userReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-5 bg-white/80 dark:bg-[#242B3B]/80 border border-stone-200/80 dark:border-stone-800 rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs font-sans text-stone-400">
                      <Link href={`/poems/${review.poem_id}`} className="text-[#D4A359] hover:underline font-serif">
                        作品『{review.poem?.title || '詩篇'}』への応答
                      </Link>
                      <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>

                    <p className="text-xs font-serif text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                      {review.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white/50 dark:bg-[#242B3B]/50 rounded border border-stone-200/60 dark:border-stone-800 text-xs font-sans text-stone-400">
                  まだ鑑賞文は寄せられていません。
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 退会（アカウント削除）確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FBF9F5] dark:bg-[#1A1F2C] border border-stone-200 dark:border-stone-800 rounded-xl max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-base font-medium text-rose-600 dark:text-rose-400 font-sans flex items-center gap-2">
                <span>⚠️</span>
                <span>退会手続き（アカウント削除）</span>
              </h3>
            </div>

            <div className="space-y-3 font-sans text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <p className="font-semibold text-stone-800 dark:text-stone-100">
                『Poem pratyaya』からの退会をおこなう前に、以下をご確認ください：
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-500 dark:text-stone-400">
                <li>投稿されたすべての詩作品（公開作品・下書き）が消去されます。</li>
                <li>他者の作品に寄せた鑑賞文（Pratyaya）および返信が削除されます。</li>
                <li>フォーラム（Pratyaya Lab）に投稿された問い・応答が削除されます。</li>
                <li>削除されたデータおよびアカウント情報は元に戻すことができません。</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs rounded font-sans">
                {deleteError}
              </div>
            )}

            <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 rounded font-sans">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-700 dark:text-stone-200 select-none">
                <input
                  type="checkbox"
                  checked={deleteConfirmAgreed}
                  onChange={(e) => setDeleteConfirmAgreed(e.target.checked)}
                  className="mt-0.5 accent-rose-600 h-4 w-4 rounded"
                />
                <span>すべてのデータが消去され、復元できないことを理解し、退会に同意します。</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 font-sans">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmAgreed(false)
                  setDeleteError(null)
                }}
                disabled={isDeletingAccount}
                className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!deleteConfirmAgreed || isDeletingAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isDeletingAccount ? '処理中...' : 'アカウントを完全削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuthorProfilePage({ params }: { params: Promise<{ username: string }> | { username: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] flex items-center justify-center font-serif">
          <p className="text-xs font-sans text-stone-400">読み込み中...</p>
        </div>
      }
    >
      <ProfileContent params={params} />
    </Suspense>
  )
}

