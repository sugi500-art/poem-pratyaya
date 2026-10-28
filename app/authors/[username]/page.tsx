'use client'

import React, { useState, useEffect, Suspense, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url?: string | null
  role: 'user' | 'advisor' | 'admin'
  created_at: string
  accept_direct_messages?: boolean
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
  updated_at?: string
  reviews?: { id: string }[]
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

interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  subject: string | null
  content: string
  is_read: boolean
  parent_id?: string | null
  created_at: string
  sender?: {
    id: string
    username: string
    display_name: string | null
    avatar_url?: string | null
    role: 'user' | 'advisor' | 'admin'
  }
  recipient?: {
    id: string
    username: string
    display_name: string | null
    avatar_url?: string | null
    role: 'user' | 'advisor' | 'admin'
  }
}

function ProfileContent({ params }: { params: Promise<{ username: string }> | { username: string } }) {
  // Next.js 14 / 15 両対応の params 展開
  const resolvedParams = typeof (params as any).then === 'function' ? use(params as Promise<{ username: string }>) : (params as { username: string })
  const rawTarget = resolvedParams.username || ''
  const targetKey = decodeURIComponent(rawTarget).replace(/^%40|^\@/, '')

  const router = useRouter()
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get('tab')

  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [publishedPoems, setPublishedPoems] = useState<Poem[]>([])
  const [draftPoems, setDraftPoems] = useState<Poem[]>([])
  const [userReviews, setUserReviews] = useState<PoemReview[]>([])
  const [receivedReviewsCount, setReceivedReviewsCount] = useState<number>(0)
  const [monthlyPublishedCount, setMonthlyPublishedCount] = useState<number>(0)

  // 手紙（信書箱・DM）状態
  const [receivedMessages, setReceivedMessages] = useState<DirectMessage[]>([])
  const [sentMessages, setSentMessages] = useState<DirectMessage[]>([])
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0)
  const [letterSubTab, setLetterSubTab] = useState<'inbox' | 'sent'>('inbox')

  // 手紙送信・返信モーダル状態
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false)
  const [letterTargetUser, setLetterTargetUser] = useState<{ id: string; name: string } | null>(null)
  const [letterSubject, setLetterSubject] = useState('')
  const [letterContent, setLetterContent] = useState('')
  const [letterEthicsAgreed, setLetterEthicsAgreed] = useState(false)
  const [replyingToParentId, setReplyingToParentId] = useState<string | null>(null)
  const [isSendingLetter, setIsSendingLetter] = useState(false)
  const [letterSendMsg, setLetterSendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URL コピー状態
  const [copiedUrl, setCopiedUrl] = useState(false)

  // タブ ('published' | 'drafts' | 'reviews' | 'letters')
  const initialTab = (tabQuery === 'drafts' || tabQuery === 'reviews' || tabQuery === 'published' || tabQuery === 'letters')
    ? tabQuery
    : 'published'
  const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'reviews' | 'letters'>(initialTab)

  // プロフィール編集モーダル状態
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAcceptMessages, setEditAcceptMessages] = useState(true)
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [uploadAvatarError, setUploadAvatarError] = useState('')
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null)

  // パスワード変更状態
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showPasswordText, setShowPasswordText] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 退会（アカウント削除）モーダル状態
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmAgreed, setDeleteConfirmAgreed] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const MONTHLY_LIMIT = 3

  useEffect(() => {
    if (tabQuery === 'drafts' || tabQuery === 'reviews' || tabQuery === 'published' || tabQuery === 'letters') {
      setActiveTab(tabQuery)
    }
  }, [tabQuery])

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
      setEditAvatarUrl(profileData.avatar_url || '')
      setEditAcceptMessages(profileData.accept_direct_messages !== false)

      const ownerCheck = user?.id === profileData.id
      setIsOwner(ownerCheck)

      // 3. 公開済み詩篇の取得（鑑賞文の付与状況も同時に取得）
      const { data: publishedData } = await supabase
        .from('poems')
        .select(`
          *,
          reviews:poem_reviews ( id )
        `)
        .eq('author_id', profileData.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      const poemsList = (publishedData || []) as unknown as Poem[]
      setPublishedPoems(poemsList)

      // 届いた鑑賞文の総数を集計
      const totalReceived = poemsList.reduce(
        (sum, p) => sum + (p.reviews?.length || 0),
        0
      )
      setReceivedReviewsCount(totalReceived)

      // 4. 本人の場合：下書き詩篇の取得 ＆ 今月の公開枠確認 ＆ 信書箱（手紙）の取得
      if (ownerCheck) {
        const { data: draftData } = await supabase
          .from('poems')
          .select('*')
          .eq('author_id', profileData.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })

        setDraftPoems((draftData || []) as Poem[])

        // 今月の公開数カウント
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
          .from('poems')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileData.id)
          .eq('status', 'published')
          .gte('published_at', startOfMonth.toISOString())

        setMonthlyPublishedCount(count || 0)

        // 信書箱：受け取った手紙の取得
        const { data: recvData, error: recvError } = await supabase
          .from('direct_messages')
          .select(`
            id,
            sender_id,
            recipient_id,
            subject,
            content,
            is_read,
            parent_id,
            created_at,
            sender:profiles!sender_id (
              id,
              username,
              display_name,
              avatar_url,
              role
            )
          `)
          .eq('recipient_id', profileData.id)
          .order('created_at', { ascending: false })

        if (!recvError && recvData) {
          const list = recvData as unknown as DirectMessage[]
          setReceivedMessages(list)
          setUnreadMessagesCount(list.filter((m) => !m.is_read).length)
        }

        // 信書箱：送り出した手紙の取得
        const { data: sentData } = await supabase
          .from('direct_messages')
          .select(`
            id,
            sender_id,
            recipient_id,
            subject,
            content,
            is_read,
            parent_id,
            created_at,
            recipient:profiles!recipient_id (
              id,
              username,
              display_name,
              avatar_url,
              role
            )
          `)
          .eq('sender_id', profileData.id)
          .order('created_at', { ascending: false })

        if (sentData) {
          setSentMessages(sentData as unknown as DirectMessage[])
        }
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

  // 手紙送信ハンドラ
  async function handleSendLetter(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    if (!letterContent.trim() || !letterEthicsAgreed) return

    const recipientId = letterTargetUser ? letterTargetUser.id : profile?.id
    if (!recipientId || recipientId === currentUser.id) return

    try {
      setIsSendingLetter(true)
      setLetterSendMsg(null)

      const { error: sendError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: recipientId,
          subject: letterSubject.trim() || null,
          content: letterContent.trim(),
          parent_id: replyingToParentId || null,
        })

      if (sendError) throw sendError

      setLetterSendMsg({ type: 'success', text: '静かに手紙を認め、信書箱へ届けました。🕯️' })
      setLetterSubject('')
      setLetterContent('')
      setLetterEthicsAgreed(false)
      setReplyingToParentId(null)

      setTimeout(() => {
        setIsLetterModalOpen(false)
        setLetterSendMsg(null)
      }, 1800)

      if (isOwner) {
        await loadProfileData()
      }
    } catch (err: any) {
      setLetterSendMsg({ type: 'error', text: '手紙の送信に失敗しました: ' + (err.message || 'エラーが発生しました') })
    } finally {
      setIsSendingLetter(false)
    }
  }

  // 手紙の既読処理
  async function handleMarkAsRead(messageId: string) {
    if (!currentUser || !isOwner) return
    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('recipient_id', currentUser.id)

      if (error) throw error

      setReceivedMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      )
      setUnreadMessagesCount((prev) => Math.max(0, prev - 1))
    } catch (err: any) {
      console.error('既読処理エラー:', err)
    }
  }

  // 手紙の破棄（削除）
  async function handleDeleteLetter(messageId: string) {
    if (!currentUser || !isOwner) return
    if (!confirm('この手紙を信書箱から破棄（削除）しますか？')) return

    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      setReceivedMessages((prev) => prev.filter((m) => m.id !== messageId))
      setSentMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err: any) {
      alert('手紙の削除に失敗しました: ' + (err.message || 'エラー'))
    }
  }

  // 返信モーダルを開く
  function handleOpenReplyModal(message: DirectMessage) {
    const sender = message.sender
    const targetId = message.sender_id
    const targetName = sender?.display_name || sender?.username || '表現者'
    const subjectPrefix = message.subject
      ? (message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`)
      : 'Re: 手紙への返信'

    setLetterTargetUser({ id: targetId, name: targetName })
    setReplyingToParentId(message.id)
    setLetterSubject(subjectPrefix)
    setLetterContent('')
    setLetterEthicsAgreed(false)
    setLetterSendMsg(null)
    setIsLetterModalOpen(true)
  }

  // 下書き削除ハンドラ
  async function handleDeleteDraft(poemId: string, poemTitle: string) {
    if (!currentUser || !isOwner) return
    const titleLabel = poemTitle ? `『${poemTitle}』` : 'この下書き'
    if (!confirm(`${titleLabel} を破棄（削除）しますか？\n破棄された言葉は復元できません。`)) return

    try {
      const { error: deleteError } = await supabase
        .from('poems')
        .delete()
        .eq('id', poemId)
        .eq('author_id', currentUser.id)
        .eq('status', 'draft')

      if (deleteError) throw deleteError

      setDraftPoems((prev) => prev.filter((p) => p.id !== poemId))
    } catch (err: any) {
      alert('下書きの削除に失敗しました: ' + (err.message || 'エラーが発生しました。'))
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

  // アイコン画像（写真・イラスト）のアップロード処理 (Supabase Storage: avatars)
  const handleAvatarFileUpload = async (file: File) => {
    if (!file) return
    setUploadAvatarError('')

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const isImage = file.type.startsWith('image/') || validExts.includes(ext)

    if (!isImage) {
      setUploadAvatarError('対応する画像形式のファイルを選択してください。（対応形式: JPG, PNG, WebP, GIF）')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadAvatarError('画像サイズが大きすぎます。2MB以下の画像を選択してください。')
      return
    }

    try {
      setIsUploadingAvatar(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadAvatarError('画像をアップロードするにはログインが必要です。')
        return
      }

      const timestamp = Date.now()
      const safeExt = ext || 'jpg'
      const filePath = `${user.id}/avatar_${timestamp}.${safeExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Avatar storage upload error:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setEditAvatarUrl(publicUrl)
    } catch (err: any) {
      console.error('アバター画像アップロードエラー:', err)
      setUploadAvatarError(err.message || '画像のアップロードに失敗しました。')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setEditAvatarUrl('')
    setUploadAvatarError('')
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = ''
    }
  }

  // プロフィール保存 ＆ パスワード変更
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !isOwner) return

    try {
      setIsSaving(true)
      setSaveMsg(null)

      let passwordChanged = false

      // 1. パスワード変更の検証と適用（入力されている場合のみ）
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error('新しいパスワードは6文字以上で設定してください。')
        }
        if (newPassword !== confirmPassword) {
          throw new Error('確認用パスワードが一致しません。入力内容をお確かめください。')
        }

        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        })
        if (pwdError) {
          throw new Error(`パスワード更新エラー: ${pwdError.message}`)
        }
        passwordChanged = true
      }

      // 2. プロフィール基本情報の更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null,
          avatar_url: editAvatarUrl.trim() || null,
          accept_direct_messages: editAcceptMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      setProfile((prev) => prev ? {
        ...prev,
        display_name: editDisplayName.trim() || null,
        bio: editBio.trim() || null,
        avatar_url: editAvatarUrl.trim() || null,
        accept_direct_messages: editAcceptMessages,
      } : null)

      const successNotice = passwordChanged
        ? 'プロフィールと新しいパスワードを安全に更新しました 🕯️'
        : 'プロフィールを更新しました 🕯️'

      setSaveMsg({ type: 'success', text: successNotice })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSection(false)
      setIsEditing(false)

      setTimeout(() => {
        setSaveMsg(null)
      }, 5000)
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
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* ナビゲーション */}
        <nav className="flex justify-between items-center border-b border-stone-200/80 dark:border-stone-800 pb-4">
          <Link href="/" className="text-xs font-sans text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition">
            ← 言葉の聖域へ戻る
          </Link>
          <span className="text-xs font-sans text-stone-400">
            Poem pratyaya — Member Profile & Sanctuary
          </span>
        </nav>

        {/* プロフィールヘッダーカード */}
        <div className="bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 rounded-lg p-6 sm:p-10 shadow-sm space-y-6 relative">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* アイコン画像またはイニシャル */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#D4A359]/40 dark:border-stone-700 shadow-sm shrink-0 bg-stone-100 dark:bg-stone-800"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] flex items-center justify-center text-xl font-serif font-medium shadow-sm shrink-0">
                  {(profile.display_name || profile.username || '無').slice(0, 1)}
                </div>
              )}

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
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-[#D4A359]/20 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded font-medium">
                      アドバイザー
                    </span>
                  )}
                  {profile.role === 'tanka_advisor' && (
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded font-medium">
                      🎋 短歌助言者
                    </span>
                  )}
                  {profile.role === 'user' && (
                    <span className="text-[10px] font-sans px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded">
                      表現者
                    </span>
                  )}
                </div>

                <p className="text-xs font-sans text-stone-400">
                  @{profile.username} ・ 参加日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>

            {/* 操作ボタンエリア（手紙を認める ＆ 名刺代わりのURLコピー ＆ 本人用設定） */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* 他者プロフィール時：手紙を認めるボタン */}
              {!isOwner && currentUser && profile.accept_direct_messages !== false && (
                <button
                  onClick={() => {
                    setLetterTargetUser({ id: profile.id, name: profile.display_name || profile.username || '表現者' })
                    setReplyingToParentId(null)
                    setLetterSubject('')
                    setLetterContent('')
                    setLetterEthicsAgreed(false)
                    setLetterSendMsg(null)
                    setIsLetterModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D4A359]/40 bg-white dark:bg-stone-800 rounded text-xs font-sans text-stone-700 dark:text-stone-200 hover:border-[#D4A359] hover:text-[#D4A359] transition shadow-2xs font-medium cursor-pointer"
                  title="この詩人へ私信（手紙）を認めます"
                >
                  <span>✉️</span>
                  <span>手紙を認める</span>
                </button>
              )}

              {/* URLコピーボタン */}
              <button
                onClick={handleCopyProfileUrl}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 border rounded text-xs font-sans transition shadow-sm font-medium ${
                  copiedUrl
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-[#F4F0E8] dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-[#D4A359]'
                }`}
                title="この作品一覧プロフィールのURLをコピー（名刺代わりに共有できます）"
              >
                <span>{copiedUrl ? '✓' : '🔗'}</span>
                <span>{copiedUrl ? 'URLをコピーしました 🕯️' : '作品目録URLをコピー'}</span>
              </button>

              {/* 本人認証時：編集・退会ボタン */}
              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={() => {
                      setEditDisplayName(profile.display_name || '')
                      setEditBio(profile.bio || '')
                      setEditAvatarUrl(profile.avatar_url || '')
                      setEditAcceptMessages(profile.accept_direct_messages !== false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setShowPasswordSection(false)
                      setSaveMsg(null)
                      setIsEditing(true)
                    }}
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

          {/* プロフィール更新メッセージ（成功・エラー） */}
          {saveMsg && (
            <div className={`p-3 rounded-lg text-xs font-sans transition-all animate-in fade-in duration-200 ${
              saveMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center justify-between">
                <span>{saveMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setSaveMsg(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs ml-3"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 自己紹介文（または編集フォーム） */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-5 pt-4 border-t border-stone-100 dark:border-stone-800">
              
              {/* アイコン画像（写真・イラスト）設定 */}
              <div className="p-4 bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/60 rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-3 font-sans">
                <label className="block text-xs font-sans text-stone-700 dark:text-stone-300 font-medium">
                  アイコン画像（写真・イラスト）
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* プレビュー表示 */}
                  <div className="shrink-0">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="アバタープレビュー"
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#D4A359] shadow-sm bg-stone-100 dark:bg-stone-800"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-xl font-serif font-medium border border-stone-300 dark:border-stone-700 shadow-sm">
                        {(editDisplayName || profile.username || '無').slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={avatarFileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleAvatarFileUpload(file)
                        }}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        id="avatar-file-upload"
                      />
                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={() => avatarFileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white dark:bg-[#242B3B] border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-sans rounded hover:border-[#D4A359] transition shadow-sm font-medium flex items-center gap-1.5"
                      >
                        <span>📷</span>
                        <span>{isUploadingAvatar ? 'アップロード中...' : editAvatarUrl ? '画像を変更する' : '写真・イラストを選択'}</span>
                      </button>

                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-3 py-1.5 text-xs font-sans text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        >
                          ✕ 解除してイニシャルに戻す
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-400 font-sans leading-relaxed">
                      ※ 対応形式: JPG, PNG, WebP, GIF（最大2MB）。作品の静けさに調和する写真やイラストをお選びいただけます。
                    </p>

                    {uploadAvatarError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-sans">
                        {uploadAvatarError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-sans text-stone-600 dark:text-stone-400">表示名（筆名）</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="表示名を入力..."
                  className="w-full px-3 py-2 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded text-xs font-serif focus:outline-none focus:border-[#D4A359] text-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-sans text-stone-600 dark:text-stone-400">自己紹介・詩的関心</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="関心のある言葉、言葉の響き、詩作の背景など..."
                  className="w-full px-3 py-2 bg-[#FBF9F5]/60 dark:bg-[#12161F]/60 border border-stone-300 dark:border-stone-700 rounded text-xs font-serif leading-relaxed focus:outline-none focus:border-[#D4A359] text-stone-800 dark:text-stone-100"
                />
              </div>

              {/* 手紙の受け取り設定 */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-stone-700 dark:text-stone-300 select-none">
                  <input
                    type="checkbox"
                    checked={editAcceptMessages}
                    onChange={(e) => setEditAcceptMessages(e.target.checked)}
                    className="rounded border-stone-300 dark:border-stone-700 text-[#D4A359] focus:ring-[#D4A359] h-4 w-4"
                  />
                  <span>他の表現者からの手紙（信書箱への私信）を受け取る</span>
                </label>
                <p className="text-[11px] text-stone-400 pl-6 mt-0.5">
                  ※ チェックを外すと、他の利用者からあなた宛に手紙を送ることができなくなります。
                </p>
              </div>

              {/* パスワード変更セクション（アコーディオン式） */}
              <div className="p-4 bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/60 rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔑</span>
                    <label className="text-xs font-sans text-stone-700 dark:text-stone-300 font-medium">
                      ログイン・パスワードの変更
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(!showPasswordSection)
                      if (showPasswordSection) {
                        setNewPassword('')
                        setConfirmPassword('')
                      }
                    }}
                    className="text-xs text-[#D4A359] hover:underline font-medium"
                  >
                    {showPasswordSection ? '▲ 閉じる' : '▼ パスワードを変更する'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div className="space-y-3 pt-2 border-t border-stone-200/50 dark:border-stone-800/80 animate-in fade-in duration-200">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      新しいパスワードを設定します。変更しない場合は空欄のままで構いません。
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-sans text-stone-600 dark:text-stone-400">
                          新しいパスワード（6文字以上）
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordText ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-white dark:bg-[#12161F] border border-stone-300 dark:border-stone-700 rounded text-xs font-sans focus:outline-none focus:border-[#D4A359] text-stone-800 dark:text-stone-100 pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordText(!showPasswordText)}
                            className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                            title={showPasswordText ? '非表示にする' : '表示する'}
                          >
                            {showPasswordText ? '👁️' : '🙈'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-sans text-stone-600 dark:text-stone-400">
                          新しいパスワード（確認用）
                        </label>
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-white dark:bg-[#12161F] border border-stone-300 dark:border-stone-700 rounded text-xs font-sans focus:outline-none focus:border-[#D4A359] text-stone-800 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-rose-500 font-sans">
                        ※ 入力されたパスワードが一致していません。
                      </p>
                    )}
                  </div>
                )}
              </div>

              {saveMsg && (
                <p className={`text-xs p-2 rounded font-sans ${saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}`}>
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
                    onClick={() => {
                      setIsEditing(false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setShowPasswordSection(false)
                    }}
                    className="px-4 py-1.5 text-xs font-sans text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
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
          <div className="flex gap-6 text-xs font-sans text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-4 flex-wrap">
            <div>
              公開詩篇：<strong className="text-stone-800 dark:text-stone-200 font-serif text-sm">{publishedPoems.length}</strong> 篇
            </div>
            {isOwner && (
              <div>
                下書きの部屋：<strong className="text-[#D4A359] font-serif text-sm">{draftPoems.length}</strong> 篇
              </div>
            )}
            <div>
              寄せた鑑賞文：<strong className="text-stone-800 dark:text-stone-200 font-serif text-sm">{userReviews.length}</strong> 件
            </div>
            <div>
              届いた鑑賞文：<strong className="text-[#D4A359] font-serif text-sm">{receivedReviewsCount}</strong> 通
            </div>
            {isOwner && (
              <div>
                信書箱：<strong className="text-stone-800 dark:text-stone-200 font-serif text-sm">{receivedMessages.length}</strong> 通
                {unreadMessagesCount > 0 && (
                  <span className="ml-1 text-[11px] text-[#D4A359] font-medium font-sans">
                    （未読 {unreadMessagesCount}通 🕯️）
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* タブ切替 & コンテンツエリア */}
        <div className="space-y-6">
          
          {/* タブナビゲーション */}
          <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs font-sans gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('published')}
              className={`pb-3 transition relative font-medium shrink-0 ${
                activeTab === 'published'
                  ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              公開作品 ({publishedPoems.length})
            </button>

            {isOwner && (
              <button
                onClick={() => setActiveTab('drafts')}
                className={`pb-3 transition relative font-medium shrink-0 ${
                  activeTab === 'drafts'
                    ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                }`}
              >
                📂 下書きの部屋 ({draftPoems.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 transition relative font-medium shrink-0 ${
                activeTab === 'reviews'
                  ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              寄せた鑑賞文 ({userReviews.length})
            </button>

            {isOwner && (
              <button
                onClick={() => setActiveTab('letters')}
                className={`pb-3 transition relative font-medium shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'letters'
                    ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                }`}
              >
                <span>📨 信書箱</span>
                <span className="text-[11px]">({receivedMessages.length})</span>
                {unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#D4A359] text-[#1A1F2C] rounded-full text-[10px] font-bold">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* タブ 1: 公開作品一覧 */}
          {activeTab === 'published' && (
            <div className="space-y-4">
              {publishedPoems.length > 0 ? (
                publishedPoems.map((poem) => {
                  const reviewCount = poem.reviews?.length || 0
                  return (
                    <Link
                      key={poem.id}
                      href={`/poems/${poem.id}`}
                      className="block p-5 bg-white/80 dark:bg-[#242B3B]/80 border border-stone-200/80 dark:border-stone-800 rounded-lg hover:border-[#D4A359] dark:hover:border-[#D4A359] transition shadow-sm space-y-2 group"
                    >
                      <div className="flex justify-between items-center text-xs font-sans text-stone-400">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded text-[10px]">
                            {poem.writing_mode === 'vertical' ? '縦書き' : '横書き'}
                          </span>
                          <span>
                            {poem.published_at ? new Date(poem.published_at).toLocaleDateString('ja-JP') : ''}
                          </span>
                        </div>
                        {reviewCount > 0 ? (
                          <span className="text-[11px] px-2 py-0.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] border border-[#D4A359]/30 rounded font-medium flex items-center gap-1">
                            <span>🕯️</span>
                            <span>鑑賞文 {reviewCount}篇が届いています</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400">
                            まだ鑑賞文はありません（静寂）
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100 group-hover:text-[#D4A359] transition">
                        『{poem.title}』
                      </h3>

                      <p className="text-xs font-serif text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                        {poem.content}
                      </p>
                    </Link>
                  )
                })
              ) : (
                <div className="p-8 text-center bg-white/50 dark:bg-[#242B3B]/50 rounded border border-stone-200/60 dark:border-stone-800 text-xs font-sans text-stone-400 space-y-3">
                  <p>まだ公開された詩篇はありません。</p>
                  {isOwner && (
                    <Link
                      href="/poems/new"
                      className="inline-block px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded text-xs font-sans font-medium"
                    >
                      ＋ 最初の一篇を紡ぐ
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* タブ 2: 下書きの部屋（推敲管理・本人のみ） */}
          {activeTab === 'drafts' && isOwner && (
            <div className="space-y-6">
              
              {/* 月間ステータス ＆ 新規作成ボタンバー */}
              <div className="p-4 bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-sans shadow-sm">
                <div>
                  <span className="text-stone-500 dark:text-stone-400 font-medium">今月の公開枠：</span>
                  <span className="font-serif text-sm ml-1 text-stone-800 dark:text-stone-100">
                    今月公開済み <strong className="text-[#D4A359] text-base">{monthlyPublishedCount}</strong> / {MONTHLY_LIMIT} 作
                    {monthlyPublishedCount < MONTHLY_LIMIT ? (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-sans text-xs">
                        （残り {MONTHLY_LIMIT - monthlyPublishedCount} 作 公開可能）
                      </span>
                    ) : (
                      <span className="ml-2 text-stone-400 font-sans text-xs">
                        （今月の公開枠に達しました。納得がいくまで推敲を重ねられます）
                      </span>
                    )}
                  </span>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    ※ 下書き保存数に制限はありません。言葉が熟すまで、心ゆくまで推敲していただけます。
                  </p>
                </div>

                <Link
                  href="/poems/new"
                  className="px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium hover:opacity-90 transition shadow-sm text-xs shrink-0 flex items-center gap-1.5"
                >
                  <span>＋</span>
                  <span>新しい下書きを始める</span>
                </Link>
              </div>

              {/* 下書き一覧 */}
              {draftPoems.length > 0 ? (
                <div className="space-y-4">
                  {draftPoems.map((poem) => (
                    <div
                      key={poem.id}
                      className="p-5 sm:p-6 bg-white/90 dark:bg-[#242B3B]/90 border border-stone-200 dark:border-stone-800 hover:border-[#D4A359]/60 dark:hover:border-[#D4A359]/60 rounded-lg transition shadow-sm space-y-4"
                    >
                      {/* メタ情報 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded text-[10px] font-medium">
                            下書き（非公開）
                          </span>
                          <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded text-[10px]">
                            {poem.writing_mode === 'vertical' ? '縦書き' : '横書き'}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {poem.content ? poem.content.length : 0} 文字
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-stone-400">
                          <span>初回保存: {new Date(poem.created_at).toLocaleDateString('ja-JP')}</span>
                          {poem.updated_at && poem.updated_at !== poem.created_at && (
                            <span className="text-[#D4A359]">
                              最終推敲: {new Date(poem.updated_at).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 本文プレビュー */}
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-normal text-[#1A1F2C] dark:text-stone-100 font-serif">
                          『{poem.title || '無題の詩篇'}』
                        </h3>
                        <p className="text-xs font-serif text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed whitespace-pre-wrap bg-[#FBF9F5]/60 dark:bg-[#1A1F2C]/60 p-3.5 rounded border border-stone-100 dark:border-stone-800/80">
                          {poem.content || '（本文はまだ入力されていません）'}
                        </p>
                      </div>

                      {/* 操作バー */}
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-sans">
                        <button
                          onClick={() => handleDeleteDraft(poem.id, poem.title)}
                          className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition text-[11px] flex items-center gap-1"
                          title="この下書きを破棄（削除）する"
                        >
                          <span>🗑️</span>
                          <span>下書きを破棄</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/poems/new?edit=${poem.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 transition font-medium text-xs shadow-sm"
                          >
                            <span>✏️</span>
                            <span>推敲・編集を再開する</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white/70 dark:bg-[#242B3B]/70 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs font-sans space-y-3 shadow-sm">
                  <p className="text-2xl">🕯️</p>
                  <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 font-serif">
                    下書きの部屋には、現在保存されている言葉はありません
                  </h3>
                  <p className="text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                    ふと心に浮かんだ一行や断片を、いつでも静かに書き留めておけます。<br />
                    保存した下書きは誰にも公開されず、心ゆくまで推敲を重ねることができます。
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/poems/new"
                      className="inline-block px-5 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium shadow-sm hover:opacity-90 transition text-xs"
                    >
                      ＋ 最初の詩篇を下書きする
                    </Link>
                  </div>
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

          {/* タブ 4: 信書箱（手紙・往復書簡・本人のみ） */}
          {activeTab === 'letters' && isOwner && (
            <div className="space-y-6">
              {/* 信書箱サブナビ（受け取った手紙 / 送り出した手紙） */}
              <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-2 text-xs font-sans">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setLetterSubTab('inbox')}
                    className={`pb-2 transition font-medium flex items-center gap-1.5 ${
                      letterSubTab === 'inbox'
                        ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                        : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                    }`}
                  >
                    <span>受け取った手紙</span>
                    <span className="text-[11px]">({receivedMessages.length})</span>
                    {unreadMessagesCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#D4A359] text-[#1A1F2C] rounded-full text-[10px] font-bold">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setLetterSubTab('sent')}
                    className={`pb-2 transition font-medium flex items-center gap-1.5 ${
                      letterSubTab === 'sent'
                        ? 'text-[#1A1F2C] dark:text-stone-100 border-b-2 border-[#D4A359]'
                        : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                    }`}
                  >
                    <span>送り出した手紙</span>
                    <span className="text-[11px]">({sentMessages.length})</span>
                  </button>
                </div>

                <span className="text-[11px] text-stone-400 hidden sm:inline">
                  言葉の尊厳を守る一対一の信書箱
                </span>
              </div>

              {/* 受信箱一覧 */}
              {letterSubTab === 'inbox' && (
                <div className="space-y-4">
                  {receivedMessages.length > 0 ? (
                    receivedMessages.map((msg) => {
                      const senderName = msg.sender?.display_name || msg.sender?.username || '表現者'
                      return (
                        <div
                          key={msg.id}
                          className={`p-6 rounded-lg border transition shadow-sm space-y-3 font-serif ${
                            !msg.is_read
                              ? 'bg-[#FDFBF7] dark:bg-[#1E2533] border-[#D4A359]/60 ring-1 ring-[#D4A359]/20'
                              : 'bg-white/80 dark:bg-[#242B3B]/80 border-stone-200/80 dark:border-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-sans text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              {!msg.is_read ? (
                                <span className="px-2 py-0.5 bg-[#D4A359] text-[#1A1F2C] rounded text-[10px] font-bold font-sans">
                                  🕯️ 未読
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400">
                                  ✓ 読了済み
                                </span>
                              )}
                              <span className="text-stone-500 dark:text-stone-400">差出人：</span>
                              <Link
                                href={`/authors/${msg.sender?.username || msg.sender_id}`}
                                className="inline-flex items-center gap-1.5 text-stone-800 dark:text-stone-200 font-medium hover:text-[#D4A359] transition font-sans"
                              >
                                {msg.sender?.avatar_url ? (
                                  <img
                                    src={msg.sender.avatar_url}
                                    alt={senderName}
                                    className="w-4 h-4 rounded-full object-cover border border-[#D4A359]/40 shrink-0 bg-stone-100 dark:bg-stone-800"
                                  />
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-[9px] font-serif flex items-center justify-center font-medium shrink-0">
                                    {(senderName || '無').slice(0, 1)}
                                  </span>
                                )}
                                <span>{senderName}</span>
                              </Link>
                            </div>

                            <div className="flex items-center gap-3">
                              <span>{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                            </div>
                          </div>

                          {msg.subject && (
                            <h4 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 leading-snug">
                              {msg.subject}
                            </h4>
                          )}

                          <p className="text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300 whitespace-pre-wrap bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/60 p-4 rounded border border-stone-100 dark:border-stone-800/60">
                            {msg.content}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-xs font-sans border-t border-stone-100 dark:border-stone-800/60">
                            <div className="flex items-center gap-3">
                              {!msg.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(msg.id)}
                                  className="text-stone-500 hover:text-[#D4A359] transition text-[11px] font-medium"
                                >
                                  ✓ 読了（既読）にする
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenReplyModal(msg)}
                                className="text-[#D4A359] hover:underline transition font-medium flex items-center gap-1"
                              >
                                <span>✉️</span>
                                <span>返信を認める</span>
                              </button>
                            </div>

                            <button
                              onClick={() => handleDeleteLetter(msg.id)}
                              className="text-stone-400 hover:text-rose-600 transition text-[11px] flex items-center gap-0.5"
                              title="手紙を破棄"
                            >
                              <span>🗑️ 破棄</span>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-12 text-center bg-white/70 dark:bg-[#242B3B]/70 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs font-sans space-y-3 shadow-sm">
                      <p className="text-2xl">✉️</p>
                      <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 font-serif">
                        信書箱に届いた手紙はまだありません
                      </h3>
                      <p className="text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                        他の詩人や読者からあなた宛てに手紙が届くと、ここに静かに届きます。<br />
                        互いの尊厳を重んじた、心温まる往復書簡の場としてお使いください。
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 送信履歴一覧 */}
              {letterSubTab === 'sent' && (
                <div className="space-y-4">
                  {sentMessages.length > 0 ? (
                    sentMessages.map((msg) => {
                      const recipientName = msg.recipient?.display_name || msg.recipient?.username || '表現者'
                      return (
                        <div
                          key={msg.id}
                          className="p-6 rounded-lg border border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-[#242B3B]/80 transition shadow-sm space-y-3 font-serif"
                        >
                          <div className="flex items-center justify-between text-xs font-sans text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 dark:text-stone-400">宛先：</span>
                              <Link
                                href={`/authors/${msg.recipient?.username || msg.recipient_id}`}
                                className="text-stone-800 dark:text-stone-200 font-medium hover:text-[#D4A359] transition font-sans"
                              >
                                {recipientName} 様
                              </Link>
                            </div>

                            <span>{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                          </div>

                          {msg.subject && (
                            <h4 className="text-base font-medium text-[#1A1F2C] dark:text-stone-100 leading-snug">
                              {msg.subject}
                            </h4>
                          )}

                          <p className="text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300 whitespace-pre-wrap bg-[#FBF9F5]/70 dark:bg-[#1A1F2C]/60 p-4 rounded border border-stone-100 dark:border-stone-800/60">
                            {msg.content}
                          </p>

                          <div className="pt-2 flex justify-end text-xs font-sans border-t border-stone-100 dark:border-stone-800/60">
                            <button
                              onClick={() => handleDeleteLetter(msg.id)}
                              className="text-stone-400 hover:text-rose-600 transition text-[11px] flex items-center gap-0.5"
                              title="送信記録を破棄"
                            >
                              <span>🗑️ 記録を削除</span>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-8 text-center bg-white/50 dark:bg-[#242B3B]/50 rounded border border-stone-200/60 dark:border-stone-800 text-xs font-sans text-stone-400">
                      送り出した手紙の記録はありません。
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 手紙を認める執筆モーダル（私信作成・返信） */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FDFBF7] dark:bg-[#1A1F2C] border border-[#D4A359]/50 rounded-xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl font-serif">
            <div className="border-b border-stone-200 dark:border-stone-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg text-[#D4A359]">✉️</span>
                <h3 className="text-base font-normal text-[#1A1F2C] dark:text-stone-100">
                  {letterTargetUser ? `『${letterTargetUser.name}』様へ手紙を認める` : `${profile?.display_name || profile?.username} 様へ手紙を認める`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsLetterModalOpen(false)
                  setLetterSendMsg(null)
                }}
                className="text-stone-400 hover:text-stone-600 text-sm font-sans"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendLetter} className="space-y-4 font-sans text-xs">
              {letterSendMsg && (
                <div className={`p-3.5 rounded text-xs ${
                  letterSendMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                }`}>
                  {letterSendMsg.text}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-stone-600 dark:text-stone-400 font-medium">
                  手紙の表題（件名・任意）
                </label>
                <input
                  type="text"
                  value={letterSubject}
                  onChange={(e) => setLetterSubject(e.target.value)}
                  placeholder="例：作品についての感想、言葉への返礼..."
                  className="w-full p-2.5 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-[#1A1F2C] dark:text-stone-100 font-serif focus:outline-none focus:border-[#D4A359]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 dark:text-stone-400 font-medium">
                  手紙の本文 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="静かに言葉をしたためてください..."
                  required
                  className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-[#242B3B] text-sm font-serif leading-relaxed text-[#1A1F2C] dark:text-stone-100 focus:outline-none focus:border-[#D4A359]"
                />
              </div>

              {/* 倫理確認リマインダー */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded">
                <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 dark:text-stone-300 select-none">
                  <input
                    type="checkbox"
                    checked={letterEthicsAgreed}
                    onChange={(e) => setLetterEthicsAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#D4A359] h-4 w-4 rounded"
                  />
                  <span className="leading-relaxed text-[11px]">
                    ※ この手紙は一対一の空間であっても、相手の尊厳を深め、自他の良心を照らす言葉であることを確認し、送信します。（誹謗中傷や執拗な接触を禁じます）
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(false)}
                  disabled={isSendingLetter}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!letterContent.trim() || !letterEthicsAgreed || isSendingLetter}
                  className="px-5 py-2 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded font-medium shadow-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span>{isSendingLetter ? '手紙を届けています...' : '手紙を届ける 🕯️'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <li>信書箱に送受信された手紙（私信）がすべて削除されます。</li>
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
          <p className="text-xs font-sans text-stone-400">プロファイルを静かに読み込んでいます...</p>
        </div>
      }
    >
      <ProfileContent params={params} />
    </Suspense>
  )
}
