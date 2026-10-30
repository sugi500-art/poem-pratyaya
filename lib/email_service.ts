interface NotificationEmailParams {
  toUserId: string
  title: string
  message: string
  linkUrl: string
}

/**
 * メール通知送信ヘルパー
 * サーバー API (/api/send-email) を経由してメールを配信します
 */
export async function triggerNotificationEmail({
  toUserId,
  title,
  message,
  linkUrl,
}: NotificationEmailParams) {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toUserId,
        title,
        message,
        linkUrl,
      }),
    })
  } catch (err) {
    console.error('Trigger email notification error:', err)
  }
}