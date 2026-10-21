import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: '利用規約・対話倫理指針（マニフェスト） | poem pratyaya',
  description: 'Poem pratyaya の基本理念、投稿ルール、フォーラム対話倫理および利用規約です。',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] dark:bg-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-16 px-4 sm:px-6 lg:px-8 selection:bg-[#D4A359]/20 transition-colors">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* ヘッダー・理念宣言（マニフェスト） */}
        <header className="text-center pb-10 border-b border-[#E2DDD5] dark:border-stone-800 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/15 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium">
            <span>🕯️</span>
            <span>Manifesto & Terms of Service</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            Poem pratyaya 利用規約および対話指針
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm font-sans text-stone-600 dark:text-stone-400 leading-relaxed">
            言葉の持つ音響（Vāc）と構造（Logos）を通じて自他の良心を照らし、二元論的評価から解放された静かな対話空間を構築するための統合指針です。
          </p>

          {/* 冒頭マニフェスト（一元化されたコア理念） */}
          <div className="mt-6 p-6 sm:p-8 bg-white/90 dark:bg-[#242B3B] border-y border-[#D4A359]/40 shadow-sm rounded-sm">
            <blockquote className="text-sm sm:text-base text-[#1A1F2C] dark:text-stone-100 leading-loose italic font-serif max-w-2xl mx-auto">
              「Poem pratyayaは、真理の探究としての智慧と、人を尊重し支え合う慈悲の双方を大切にする。<br className="hidden sm:inline" />
              智慧なき慈悲は道を見失い、慈悲なき智慧は人を傷つける。<br className="hidden sm:inline" />
              私たちは詩と対話を通して、理解と共感、真理と愛の調和を目指す。」
            </blockquote>
          </div>

          <p className="text-[11px] text-stone-400 font-sans pt-2">
            主宰：杉原詠二（黒髪） ｜ 制定日：2026年10月14日（統合改訂版）
          </p>
        </header>

        {/* コンテンツレイアウト：2カラム（目次＋本文） */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* 左側：固定目次ナビゲーション */}
          <aside className="md:col-span-1 hidden md:block">
            <div className="sticky top-12 space-y-3 text-xs font-sans text-stone-500 dark:text-stone-400 border-l border-[#E2DDD5] dark:border-stone-800 pl-4">
              <p className="font-medium text-[#1A1F2C] dark:text-stone-200 mb-2">目次</p>
              <a href="#preamble" className="block hover:text-[#D4A359] transition">序文（前文）</a>
              <a href="#article-1" className="block hover:text-[#D4A359] transition">第一条（基本理念）</a>
              <a href="#article-2" className="block hover:text-[#D4A359] transition">第二条（投稿と推敲）</a>
              <a href="#article-3" className="block hover:text-[#D4A359] transition">第三条（数値評価排除）</a>
              <a href="#article-4" className="block hover:text-[#D4A359] transition">第四条（著作権と自由）</a>
              <a href="#article-5" className="block hover:text-[#D4A359] transition">第五条（フォーラム倫理）</a>
              <a href="#article-6" className="block hover:text-[#D4A359] transition">第六条（禁止事項）</a>
            </div>
          </aside>

          {/* 右側：規約・指針本文 */}
          <article className="md:col-span-3 space-y-12 leading-relaxed text-stone-800 dark:text-stone-200 text-sm sm:text-base">
            
            {/* 序文 */}
            <section id="preamble" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                序文（前文）
              </h2>
              <p className="leading-loose">
                本ウェブサイト「poem pratyaya」（以下「当プラットフォーム」）は、単なるWebサービスではなく、他者との深層的な触れ合い（Pratyaya）を育むための**静かな聖域**です。
              </p>
              <p className="leading-loose">
                当プラットフォームを利用するすべての参加者は、本指針に同意し、自らの放つ言葉に誠実な責任と敬意を抱いて参加するものとします。
              </p>
            </section>

            {/* 第一条：基本理念 */}
            <section id="article-1" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第一条（二元論の超克と非排他性）
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-sans leading-relaxed">
                <li>「勝ち／負け」「上手／下手」「正／不正」といった二元論的評価やマウンティング行為を排します。</li>
                <li>異なる立場・作風・思想を持つすべての表現者と読者の尊厳を無条件で承認し、互いに高め合う共同探求を旨とします。</li>
              </ul>
            </section>

            {/* 第二条：投稿制限と推敲 */}
            <section id="article-2" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第二条（月3〜4作の投稿制限と推敲の重み）
              </h2>
              <p className="leading-loose">
                言葉を粗雑に消費するのではなく深く育むため、詩作品の公開数を**「月3篇〜4篇（週1篇ペース）」**に制限します。この制限は制約ではなく、一作一作に心を込めて推敲するための時間です。
              </p>
            </section>

            {/* 第三条：評価数値の排除 */}
            <section id="article-3" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第三条（競争的数値の完全撤廃）
              </h2>
              <p className="leading-loose">
                当プラットフォームでは、「いいね数」「PV数」「ランキング」といった表面的な評価数字を表示しません。過剰な承認欲求や目立ちたがりから解放された静かな鑑賞と対話を守ります。
              </p>
            </section>

            {/* 第四条：著作権と自由 */}
            <section id="article-4" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第四条（著作権および自発的編集・退会の自由）
              </h2>
              <p className="leading-loose">
                投稿された作品や鑑賞文の著作権は、すべて投稿者本人に帰属します。
              </p>
              <p className="leading-loose">
                また、利用者は過去の投稿を**いつでも自発的に修正・推敲・削除する完全な権利**を有し、自由にい退会することができます。
              </p>
            </section>

            {/* 第五条：フォーラム対話倫理 */}
            <section id="article-5" className="scroll-mt-12 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第五条（フォーラム『Pratyaya Lab』での対話倫理）
              </h2>
              <p className="leading-loose">
                対話フォーラム（Pratyaya Lab）および作品レビューにおいては、**「作品構造（rūpa）」と「人格」を厳格に区別**します。表現された言葉の構造や効果への指摘は推奨されますが、書き手本人の人格否定は固く禁止します。
              </p>

              {/* 倫理リマインダーカード */}
              <div className="p-5 bg-[#F4F0E8] dark:bg-[#1E2533] border-l-4 border-[#D4A359] rounded-r text-xs sm:text-sm font-sans space-y-1">
                <span className="font-semibold text-[#D4A359]">【送信前の自己内省（内省の鐘）】</span>
                <p className="text-stone-700 dark:text-stone-300 italic">
                  「送信ボタンを押す前に、静かに自らに問いかけてみてください。<br />
                  ※ この言葉は、他者の尊厳を深め、自他の良心を照らすものですか？」
                </p>
              </div>
            </section>

            {/* 第六条：禁止事項 */}
            <section id="article-6" className="scroll-mt-12 space-y-3">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-[#E2DDD5] dark:border-stone-800 pb-2 font-normal">
                第六条（禁止事項および静寂の保護）
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-sans leading-relaxed">
                <li>特定個人に対する差別的表現、ヘイトスピーチ、誹謗中傷、人身攻撃。</li>
                <li>営利目的のスパム行為、自動プログラム（BOT）による不正アクセスや投稿妨害。</li>
                <li>上記に違反した投稿に対し、運営側は事前通知なく非公開化・削除を行う権利を有します。</li>
              </ul>
            </section>

            {/* フッター誘導 */}
            <div className="pt-12 border-t border-[#E2DDD5] dark:border-stone-800 text-center space-y-4 font-sans">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                この統合指針を胸に、poem pratyaya の空間へお進みください。
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] text-xs rounded hover:opacity-90 transition shadow-sm font-medium"
                >
                  同意して登録へ進む
                </Link>
                <Link
                  href="/lab"
                  className="px-6 py-2.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs rounded hover:bg-stone-300 dark:hover:bg-stone-700 transition"
                >
                  対話フォーラム（Pratyaya Lab）へ
                </Link>
              </div>
            </div>

          </article>
        </div>
      </div>
    </main>
  )
}

