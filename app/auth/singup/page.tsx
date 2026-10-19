'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // ステータス管理
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // 新規登録処理
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // 入力チェック
    if (!email.trim() || !password || !username.trim() || !displayName.trim()) {
      setErrorMsg('すべての必須項目を入力してください。')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('パスワードと確認用パスワードが一致しません。')
      return
    }

    if (password.length < 6) {
      setErrorMsg('パスワードは6文字以上で設定してください。')
      return
    }

    if (!agreedToTerms) {
      setErrorMsg('利用規約および倫理ガイドラインへの同意が必要です。')
      return
    }

    setIsSubmitting(true)

    try {
      // Supabase Auth へユーザー登録（メタデータとして username と display_name を送信）
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            display_name: displayName.trim(),
          },
        },
      })

      if (error) {
        setErrorMsg(error.message || 'アカウント作成に失敗しました。')
        setIsSubmitting(false)
        return
      }

      // メール確認が不要（即時ログイン可能）な設定の場合、直接プロファイルを作成/補完
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
          role: 'user',
        })

        if (profileError) {
          console.error('プロファイル作成補完エラー:', profileError)
        }
      }

      setSuccessMsg(
        'アカウント登録を受け付けました。確認メールが送信された場合はメール内のリンクをクリックしてください。登録完了後、ログインいただけます。'
      )
      
      // 数秒後にログイン画面またはトップページへ遷移
      setTimeout(() => {
        router.push('/auth/login')
        router.refresh()
      }, 3000)

    } catch (err: any) {
      setErrorMsg(`予期せぬエラーが発生しました: ${err?.message || ''}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-stone-200 shadow-sm">
        
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-xs tracking-widest text-[#D4A359] uppercase font-sans">
            Poem Pratyaya
          </Link>
          <h1 className="text-2xl font-normal tracking-wide text-[#1A1F2C]">
            静かなる場へつなる
          </h1>
          <p className="text-xs text-stone-500 font-sans leading-relaxed">
            言葉を紡ぎ、他者の尊厳を深めるためのアカウントを作成します。
          </p>
        </div>

        {/* 成功メッセージ */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs leading-relaxed font-sans">
            {successMsg}
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs leading-relaxed font-sans">
            {errorMsg}
          </div>
        )}

        {/* 登録フォーム */}
        <form onSubmit={handleSignUp} className="space-y-5 font-sans">
          
          {/* 筆名（表示名） */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              筆名・表示名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：黒髪 / 静かな読者"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 font-serif focus:outline-none focus:border-[#1A1F2C]"
            />
            <p className="text-[11px] text-stone-400 mt-1">作品や鑑賞文に表示されるお名前です。後から変更可能です。</p>
          </div>

          {/* ユーザーネーム（ID） */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              ユーザーID（半角英数字） <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              pattern="[a-zA-Z0-9_-]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例：kurokami_poetry"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 focus:outline-none focus:border-[#1A1F2C]"
            />
            <p className="text-[11px] text-stone-400 mt-1">識別用の固有IDです。</p>
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              メールアドレス <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 focus:outline-none focus:border-[#1A1F2C]"
            />
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              パスワード（6文字以上） <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 focus:outline-none focus:border-[#1A1F2C]"
            />
          </div>

          {/* パスワード（確認用） */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              パスワード（確認用） <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 focus:outline-none focus:border-[#1A1F2C]"
            />
          </div>

          {/* 倫理ガイドラインおよび利用規約同意 */}
          <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded text-xs font-serif space-y-2">
            <p className="text-amber-900 font-medium">【場の約束事】</p>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Poem pratyaya は評価や競い合いを離れ、言葉と静かに対話する聖域です。誹謗中傷や攻撃的言説を排し、自他の良心を尊びます。
            </p>
            <label className="flex items-start gap-2 pt-1 cursor-pointer font-sans text-xs">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-[#1A1F2C] focus:ring-[#D4A359]"
              />
              <span className="text-stone-700">
                <Link href="/terms" target="_blank" className="text-[#D4A359] underline hover:text-stone-800">
                  利用規約・倫理指針
                </Link>
                に同意します。
              </span>
            </label>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitting || !agreedToTerms}
            className="w-full py-3 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-wider rounded font-serif hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? 'アカウント作成中...' : 'アカウントを作成して参加する'}
          </button>
        </form>

        {/* 既存ユーザー向けログインへの導線 */}
        <div className="text-center pt-4 border-t border-stone-100 text-xs font-sans text-stone-500">
          すでにアカウントをお持ちですか？{' '}
          <Link href="/auth/login" className="text-[#1A1F2C] font-medium underline hover:text-[#D4A359]">
            ログイン画面へ
          </Link>
        </div>

      </div>
    </div>
  )
}