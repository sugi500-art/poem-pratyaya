'use client'

import React, { useState, useEffect } from 'react'

export default function Footer() {
  const [year, setYear] = useState('2026')

  // ブラウザ（クライアント）側でマウントされた後に現在の西暦を取得
  useEffect(() => {
    setYear(new Date().getFullYear().toString())
  }, [])

  return (
    <footer className="border-t border-[#E2DDD5] dark:border-stone-800 bg-[#F4F0E8] dark:bg-[#121621] py-8 text-center text-xs text-gray-500 dark:text-stone-400 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        <p>© {year} Poem pratyaya. All rights reserved.</p>
      </div>
    </footer>
  )
}