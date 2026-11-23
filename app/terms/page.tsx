import Link from 'next/link'

export const metadata = {
  title: '利用規約・倫理指針（マニフェスト） | Poem pratyaya',
  description: 'Poem pratyaya（ポエム・プラティヤヤ）の利用規約および言葉の倫理指針です。言葉の救済と良心の目覚め、個人運営の有限性とデータの保全について定めています。',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FBF9F5] dark:bg-[#1A1F2C] text-[#1A1F2C] dark:text-[#EAE8E3] font-serif py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダー・宣言エリア */}
        <header className="text-center mb-16 pb-12 border-b border-stone-200/80 dark:border-stone-800 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A359]/10 border border-[#D4A359]/30 rounded-full text-xs text-[#D4A359] font-sans font-medium mx-auto">
            <span>🕯️</span>
            <span>Terms of Service & Manifesto</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] dark:text-stone-100">
            Poem pratyaya 利用規約および倫理指針
          </h1>
          
          <blockquote className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed italic max-w-2xl mx-auto font-serif pt-2">
            「言葉は、誰かを打ち負かすための武器ではなく、<br className="hidden sm:inline" />
            他者の尊厳と深く触れ合う（Pratyaya）ための光である」
          </blockquote>
          
          <p className="text-xs text-stone-400 font-sans pt-2">
            制定日：2026年10月14日 ｜ 最終改訂：2026年11月23日
          </p>
        </header>

        {/* コンテンツレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* 左側：目次ナビゲーション（デスクトップ時固定） */}
          <aside className="md:col-span-1 hidden md:block">
            <div className="sticky top-20 space-y-2.5 text-xs font-sans text-stone-500 dark:text-stone-400 border-l border-stone-200 dark:border-stone-800 pl-4">
              <p className="font-medium text-stone-800 dark:text-stone-200 mb-3 text-[11px] uppercase tracking-wider">
                目次
              </p>
              <a href="#preamble" className="block hover:text-[#D4A359] transition">序文（前文）</a>
              <a href="#article-1" className="block hover:text-[#D4A359] transition">第一条（基本理念）</a>
              <a href="#article-2" className="block hover:text-[#D4A359] transition">第二条（著作権と自由）</a>
              <a href="#article-3" className="block hover:text-[#D4A359] transition">第三条（禁止事項）</a>
              <a href="#article-4" className="block hover:text-[#D4A359] transition">第四条（応答の倫理）</a>
              <a href="#article-5" className="block hover:text-[#D4A359] transition">第五条（運営の責任）</a>
              <a href="#article-6" className="block hover:text-[#D4A359] transition">第六条（免責事項）</a>
              <a href="#article-7" className="block hover:text-[#D4A359] transition">
                第七条（個人運営とデータ保全）
              </a>
              <a href="#conclusion" className="block hover:text-[#D4A359] transition">結び</a>
            </div>
          </aside>

          {/* 右側：本文 */}
          <article className="md:col-span-3 space-y-12 leading-relaxed text-stone-800 dark:text-stone-200 text-sm sm:text-base">
            
            {/* 序文 */}
            <section id="preamble" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                序文（前文）
              </h2>
              <p className="leading-loose">
                本ウェブサイト「Poem pratyaya」（以下、「当プラットフォーム」）は、単なるWebサービスではなく、言葉の持つ音響（Vāc）と構造（Logos）を通じて、人間の内なる良心を照らし、他者との深層的な触れ合い（Pratyaya）を育むための<strong>静かな聖域</strong>です。
              </p>
              <p className="leading-loose">
                当プラットフォームを利用するすべての者（以下、「利用者」）は、本規約に同意し、自らの放つ言葉に誠実な責任を抱いて参加するものとします。
              </p>
            </section>

            {/* 第一条 */}
            <section id="article-1" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第一条（基本理念と利用の心構え）
              </h2>
              <ul className="space-y-4 list-disc list-inside text-stone-700 dark:text-stone-300 leading-relaxed">
                <li>
                  <strong className="text-stone-900 dark:text-stone-100 font-normal">非排他性と尊厳の承認：</strong>
                  あらゆる二元論的判断（勝ち／負け、正／不正、上手／下手）を超え、すべての表現者および読者の存在尊厳を互いに尊重します。
                </li>
                <li>
                  <strong className="text-stone-900 dark:text-stone-100 font-normal">投稿数制限（推敲の重視）：</strong>
                  言葉を安易に消費するのではなく深く育むため、作品の公開数を「月3作」に制限します。利用者はこの制限を不自由としてではなく、自らの言葉と真摯に向き合う推敲の時間として引き受けるものとします。
                </li>
                <li>
                  <strong className="text-stone-900 dark:text-stone-100 font-normal">数字や評価の排除：</strong>
                  いいね数やPV数などの表面的な競い合いを排し、丁寧な鑑賞文（応答）を通じて他者と静かに関わります。
                </li>
              </ul>

              {/* ハイライトカード */}
              <div className="mt-6 p-6 bg-amber-50/70 dark:bg-[#242B3B] border border-amber-200/80 dark:border-stone-800 rounded-lg text-stone-800 dark:text-stone-200 text-xs sm:text-sm shadow-xs">
                <p className="font-medium text-[#D4A359] dark:text-[#E5B869] mb-1.5 font-sans">
                  【良心への問いかけ】
                </p>
                <p className="italic leading-relaxed">
                  「送信ボタンを押す前に、静かに自らに問いかけてみてください。この言葉は、他者の尊厳を深め、自他の良心を照らすものだろうか」
                </p>
              </div>
            </section>

            {/* 第二条 */}
            <section id="article-2" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第二条（著作権および権利の帰属）
              </h2>
              <p className="leading-loose">
                利用者が投稿した作品やコメントの著作権は、すべて投稿者本人に帰属します。
              </p>
              <p className="leading-loose">
                また、利用者は過去に投稿した自らの言葉を、理由を問わず<strong>いつでも編集・修正・削除する完全な権利</strong>を有します。また、いつでも<strong>自由に退会することができます</strong>。
              </p>
            </section>

            {/* 第三条 */}
            <section id="article-3" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第三条（禁止事項）
              </h2>
              <p>当プラットフォームの静けさと安全を守るため、以下の行為を禁止します。</p>
              <ul className="space-y-2.5 list-disc list-inside text-stone-700 dark:text-stone-300">
                <li>特定個人または集団に対する差別的・攻撃的表現、ヘイトスピーチ</li>
                <li>批評を装った個人的な攻撃、マウンティング、または誹謗中傷</li>
                <li>不正アクセスやスパム投稿等のシステム妨害行為</li>
                <li>他者への成りすまし、または虚偽の情報を騙る行為</li>
              </ul>
            </section>

            {/* 第四条 */}
            <section id="article-4" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第四条（応答・鑑賞とフォーラムの倫理）
              </h2>
              <ul className="space-y-4 list-disc list-inside text-stone-700 dark:text-stone-300 leading-relaxed">
                <li>
                  <strong className="text-stone-900 dark:text-stone-100 font-normal">作品と人格の分離：</strong>
                  フォーラム（Pratyaya Lab）や作品への鑑賞文において、利用者は「表現された言葉や構造」に対して誠実な対話を行い、書き手本人の「人格」を攻撃してはなりません。
                </li>
                <li>
                  <strong className="text-stone-900 dark:text-stone-100 font-normal">良心への問いかけ：</strong>
                  言葉を送信する際、利用者は自らの内なる良心に照らし、その言葉が「他者を育み、共に深まるものか」を一瞬確かめるよう努めるものとします。
                </li>
              </ul>
            </section>

            {/* 第五条 */}
            <section id="article-5" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第五条（運営の責任と規約の改訂）
              </h2>
              <p className="leading-loose">
                運営側（Poem pratyaya 管理者）は、利用者のプライバシーおよび投稿された言葉を厳重に保護し、商業的利用や不当な改ざんを行いません。
              </p>
              <p className="leading-loose">
                当プラットフォームの理念をより深めるため、本規約は必要に応じて改訂される場合があります。重要な改訂が生じる際は、サイト上にて十分な周知期間をもって告知されます。
              </p>
            </section>

            {/* 第六条 */}
            <section id="article-6" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第六条（免責事項）
              </h2>
              <p className="leading-loose">
                当プラットフォームの利用、または利用不能によって生じた利用者間、あるいは第三者との間のトラブルや損害等について、運営側は故意または重大な過失がある場合を除き、法的責任を負わないものとします。
              </p>
            </section>

            {/* 第七条 */}
            <section id="article-7" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl text-[#1A1F2C] dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800 pb-2 font-normal">
                第七条（個人運営の有限性と作品データの保全について）
              </h2>
              <p className="leading-loose">
                当プラットフォームは、主宰者個人の責任と労力によって運営される私的な場です。通信環境やサーバーの不具合、あるいは将来的な運営方針の変更や終了等により、投稿データが永続的に保持されることは保証いたしかねます。大切な作品や鑑賞文の記録は、必ず投稿者ご自身の手元にも控え（バックアップ）を残したうえでご利用ください。
              </p>
              <p className="leading-loose">
                また、運営上の重要な判断や変更が生じる場合には、主宰者より把握している事実と法的責任の範囲に基づき、誠実にお知らせいたします。
              </p>
            </section>

            {/* 結び */}
            <section id="conclusion" className="scroll-mt-24 pt-4 space-y-3 text-center sm:text-left">
              <h2 className="text-lg text-[#1A1F2C] dark:text-stone-100 font-normal border-b border-stone-200/80 dark:border-stone-800 pb-2">
                結び
              </h2>
              <p className="leading-loose italic text-stone-600 dark:text-stone-300">
                言葉は、刃にもなれば、傷を包む光にもなります。<br />
                Poem pratyaya が、あなたにとって、そして世界にとって、静かな救済の場であり続けることを心より願っています。
              </p>
            </section>

            {/* フッター誘導 */}
            <div className="pt-12 border-t border-stone-200/80 dark:border-stone-800 text-center space-y-4">
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                この指針に同意して、Poem pratyaya の対話や創作に参加しますか？
              </p>
              <div className="flex justify-center gap-4 font-sans text-xs">
                <Link
                  href="/poems/new"
                  className="px-6 py-2.5 bg-[#1A1F2C] dark:bg-[#D4A359] text-[#FBF9F5] dark:text-[#1A1F2C] rounded hover:opacity-90 transition shadow-sm font-medium"
                >
                  一篇を推敲・投稿する
                </Link>
                <Link
                  href="/lab"
                  className="px-6 py-2.5 bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded hover:bg-stone-300 dark:hover:bg-stone-700 transition"
                >
                  対話室（Lab）へ入る
                </Link>
              </div>
            </div>

          </article>
        </div>
      </div>
    </main>
  )
}
