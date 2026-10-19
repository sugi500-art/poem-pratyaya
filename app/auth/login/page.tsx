'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // ステータス管理
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ログイン送信処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('メールアドレスとパスワードを入力してください。')
      return
    }

    setIsSubmitting(true)

    try {
      // Supabase Auth でのサインイン処理
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('メールアドレスまたはパスワードが正しくありません。')
        } else {
          setErrorMsg(error.message || 'ログインに失敗しました。')
        }
        setIsSubmitting(false)
        return
      }

      // ログイン成功時：トップページへ戻り、画面状態を更新
      router.push('/')
      router.refresh()

    } catch (err: any) {
      setErrorMsg(`予期せぬエラーが発生しました: ${err?.message || ''}`)
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
            静寂の場へ入る
          </h1>
          <p className="text-xs text-stone-500 font-sans leading-relaxed">
            登録されたアカウント情報でログインします。
          </p>
        </div>

        {/* エラーメッセージ表示 */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs leading-relaxed font-sans">
            {errorMsg}
          </div>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-6 font-sans">
          
          {/* メールアドレス */}
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              メールアドレス
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-stone-600">
                パスワード
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-stone-300 rounded text-sm bg-[#FBF9F5]/40 focus:outline-none focus:border-[#1A1F2C]"
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#1A1F2C] text-[#FBF9F5] text-xs tracking-wider rounded font-serif hover:bg-stone-800 disabled:opacity-40 transition shadow-sm"
          >
            {isSubmitting ? 'ログイン中...' : 'ログインする'}
          </button>
        </form>

        {/* 新規登録への案内 */}
        <div className="text-center pt-4 border-t border-stone-100 text-xs font-sans text-stone-500 space-y-2">
          <p>
            まだアカウントをお持ちでないですか？{' '}
            <Link href="/auth/signup" className="text-[#1A1F2C] font-medium underline hover:text-[#D4A359]">
              新規アカウント作成へ
            </Link>
          </p>
          <p className="pt-2">
            <Link href="/" className="text-stone-400 hover:text-stone-600 text-[11px]">
              ← トップページへ戻る
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}