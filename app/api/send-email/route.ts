import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { toUserId, title, message, linkUrl } = await req.json()

    // サーバー専用 Supabase Admin クライアント（特権アクセス）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 受信者のプロフィールとメールアドレスを取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email_notifications_enabled')
      .eq('id', toUserId)
      .single()

    if (profile?.email_notifications_enabled === false) {
      return NextResponse.json({ message: 'Email notification disabled by user' })
    }

    // auth.users から受信者のメールアドレスを取得
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(toUserId)
    const recipientEmail = userData?.user?.email

    if (userError || !recipientEmail) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 404 })
    }

    // 2. Resend API を呼び出してメールを送信
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not configured')
      return NextResponse.json({ message: 'Resend API Key missing' })
    }

    const fullLink = `https://poem-pratyaya.com${linkUrl}`

    const resendRes = await fetch('[suspicious link removed]', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Poem pratyaya <onboarding@resend.dev>', // 独自ドメイン設定後は 'Poem pratyaya <info@poem-pratyaya.com>'
        to: [recipientEmail],
        subject: `【Poem pratyaya】${title}`,
        html: `
          <div style="font-family: serif; padding: 24px; color: #1A1F2C; background-color: #FBF9F5; max-width: 600px; margin: 0 auto; border: 1px solid #E2DDD5; border-radius: 8px;">
            <h2 style="font-weight: normal; font-size: 18px; border-bottom: 1px solid #E2DDD5; padding-bottom: 12px; margin-top: 0; color: #1A1F2C;">
              🕯️ Poem pratyaya からのお知らせ
            </h2>
            <p style="font-size: 14px; line-height: 1.8; color: #2C3448; whitespace-pre-wrap;">${message}</p>
            <div style="margin-top: 32px; text-align: center;">
              <a href="${fullLink}" style="background-color: #1A1F2C; color: #FBF9F5; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 13px; display: inline-block;">
                言葉を確認しに行く ➔
              </a>
            </div>
            <p style="font-size: 11px; color: #8C92A4; margin-top: 32px; text-align: center; border-t: 1px solid #E2DDD5; padding-top: 16px;">
              ※ このメールは Poem pratyaya での通知設定に基づいて自動送信されています。<br />
              通知の停止・変更はマイページのプロフィール編集からいつでも行えます。
            </p>
          </div>
        `,
      }),
    })

    const resendData = await resendRes.json()
    return NextResponse.json({ success: true, data: resendData })

  } catch (err: any) {
    console.error('Send email API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}