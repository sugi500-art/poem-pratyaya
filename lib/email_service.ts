import { createClient } from '@/lib/supabase/client'

interface NotificationEmailParams {
  toUserId: string
  title: string
  message: string
  linkUrl: string
}

/**
 * メール通知送信ヘルパー
 * 対象ユーザーが「メール通知オン (email_notifications_enabled !== false)」の場合のみ送信処理を呼び出します
 */
export async function triggerNotificationEmail({
  toUserId,
  title,
  message,
  linkUrl,
}: NotificationEmailParams) {
  try {
    const supabase = createClient()

    // 1. 受信者のプロフィールからメール通知設定とメールアドレス等を確認
    const { data: recipientProfile, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, email_notifications_enabled')
      .eq('id', toUserId)
      .single()

    if (error || !recipientProfile) {
      console.warn('送信先ユーザーのプロフィールが取得できませんでした:', error?.message)
      return
    }

    // メール通知が OFF の場合は静かにスキップ
    if (recipientProfile.email_notifications_enabled === false) {
      console.log(`[Email Notice] Skip sending to ${toUserId}: User disabled email notifications.`)
      return
    }

    // 2. メール送信ログ／キュー（email_logs）テーブルへ記録
    // （Resend連携またはSupabase Edge Functions経由で配信されます）
    await supabase.from('email_logs').insert({
      recipient_id: toUserId,
      title,
      body: message,
      link_url: linkUrl,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    console.log(`[Email Notice] Notification email queued for user: ${toUserId}`)
  } catch (err) {
    console.error('Email notification trigger error:', err)
  }
}