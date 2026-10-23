'use client'

import React, { useState, useRef, useEffect } from 'react'

interface VacAudioPlayerProps {
  audioUrl: string
  title?: string
  poetName?: string | null
}

export default function VacAudioPlayer({ audioUrl, title, poetName }: VacAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setIsLoaded(false)
    setError(null)

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
        setIsLoaded(true)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError('音声ファイルを読み込めませんでした。URLをご確認ください。')
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.error('音声再生エラー:', err)
        setError('音声の再生が開始できませんでした。')
      })
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Number(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="my-8 bg-[#FDFBF7] dark:bg-[#1E2533] border border-[#E5E0D8] dark:border-stone-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* ヘッダー情報 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8]/80 dark:border-stone-800/80 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-base text-[#D4A359]">🕯️</span>
          <span className="text-xs font-serif font-medium tracking-widest text-[#1A1F2C] dark:text-stone-100">
            朗読の響き（Vāc）
          </span>
          <span className="text-[10px] font-sans px-2 py-0.5 bg-[#D4A359]/15 text-[#8C621C] dark:text-[#E5B869] rounded-full border border-[#D4A359]/30">
            肉声の余韻
          </span>
        </div>
        <div className="text-[11px] font-sans text-stone-500 dark:text-stone-400">
          {poetName ? `${poetName} による朗読` : '詩人による自作朗読'}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-sans text-rose-600 dark:text-rose-400 py-2">
          {error}
        </p>
      ) : (
        <div className="space-y-3">
          {/* 再生コントロール & プログレスバー */}
          <div className="flex items-center gap-4">
            {/* 再生 / 一時停止ボタン */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] flex items-center justify-center hover:opacity-90 active:scale-95 transition shadow-sm shrink-0"
              title={isPlaying ? '一時停止' : '朗読を聴く'}
              aria-label={isPlaying ? '一時停止' : '朗読を聴く'}
            >
              {isPlaying ? (
                <span className="text-sm font-sans">⏸</span>
              ) : (
                <span className="text-sm font-sans ml-0.5">▶</span>
              )}
            </button>

            {/* シークバー（プログレスバー） */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[#E5E0D8] dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#D4A359]"
                aria-label="再生位置"
              />
              <div className="flex justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 音量ミュートボタン */}
            <button
              onClick={toggleMute}
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-[#D4A359] transition text-xs shrink-0"
              title={isMuted ? 'ミュート解除' : '消音'}
              aria-label="ミュート切替"
            >
              {isMuted ? '🔇' : '🔈'}
            </button>
          </div>

          <p className="text-[11px] font-serif text-stone-500 dark:text-stone-400 italic text-right">
            言葉と行間の静寂に耳を澄ませてお聴きください。
          </p>
        </div>
      )}
    </div>
  )
}
