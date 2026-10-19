import Link from 'next/link'

export const metadata = {
  title: '利用規約・倫理指針（マニフェスト） | poem pratyaya',
  description: 'Poem pratyaya の基本理念、倫理指針、投稿ルールおよび利用規約です。',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#2B2B2B] font-serif py-16 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダー・理念宣言（マニフェスト）エリア */}
        <header className="text-center mb-16 pb-12 border-b border-stone-200/80">
          <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase mb-3">
            Manifesto & Terms of Service
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-wide text-[#1A1F2C] mb-8">
            poem pratyaya 利用規約および倫理指針
          </h1>

          {/* 冒頭マニフェスト：智慧と慈悲の宣言 */}
          <div className="my-8 p-8 bg-white/80 border-y border-[#D4A359]/40 shadow-sm rounded-sm">
            <blockquote className="text-base sm:text-lg text-[#1A1F2C] leading-relaxed italic max-w-2xl mx-auto font-serif">
              「Poem pratyayaは、真理の探究としての智慧と、人を尊重し支え合う慈悲の双方を大切にする。<br className="hidden sm:inline" />
              智慧なき慈悲は道を見失い、慈悲なき智慧は人を傷つける。<br className="hidden sm:inline" />
              私たちは詩を通して、理解と共感、真理と愛の調和を目指す。」
            </blockquote>
          </div>

          <p className="text-xs text-stone-500 font-sans mt-6">
            主宰：杉原詠二（黒髪） ｜ 制定日：2026年10月14日（改訂版）
          </p>
        </header>

        {/* コンテンツレイアウト：2カラム（目次＋本文） */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* 左側：固定目次ナビゲーション */}
          <aside className="md:col-span-1 hidden md:block">
            <div className="sticky top-12 space-y-3 text-xs font-sans text-stone-500 border-l border-stone-200 pl-4">
              <p className="font-medium text-[#1A1F2C] mb-2">目次</p>
              <a href="#preamble" className="block hover:text-[#D4A359] transition">序文（前文）</a>
              <a href="#article-1" className="block hover:text-[#D4A359] transition">第一条（基本理念）</a>
              <a href="#article-2" className="block hover:text-[#D4A359] transition">第二条（著作権と自由）</a>
              <a href="#article-3" className="block hover:text-[#D4A359] transition">第三条（禁止事項）</a>
              <a href="#article-4" className="block hover:text-[#D4A359] transition">第四条（フォーラム対話倫理）</a>
              <a href="#article-5" className="block hover:text-[#D4A359] transition">第五条（運営の責任）</a>
            </div>
          </aside>

          {/* 右側：規約本文 */}
          <article className="md:col-span-3 space-y-12 leading-relaxed text-stone-800 text-sm sm:text-base">
            
            {/* 序文 */}
            <section id="preamble" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                序文（前文）
              </h2>
              <p className="leading-loose">
                本ウェブサイト「poem pratyaya」（以下、「当プラットフォーム」）は、単なるWebサービスではなく、言葉の持つ音響（Vāc）と構造（Logos）を通じて、人間の内なる良心を照らし、他者との深層的な触れ合い（Pratyaya）を育むための**静かな聖域**です。
              </p>
              <p className="mt-4 leading-loose">
                当プラットフォームを利用するすべての者（以下、「利用者」）は、本規約に同意し、自らの放つ言葉に誠実な責任と敬意を抱いて参加するものとします。
              </p>
            </section>

            {/* 第一条 */}
            <section id="article-1" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                第一条（基本理念と利用の心構え）
              </h2>
              <ul className="space-y-4 list-disc list-inside text-stone-700">
                <li>
                  <strong className="text-[#1A1F2C] font-normal">非排他性と尊厳の承認：</strong>
                  勝ち／負け、正／不正、優／劣といった二元論的判断を超え、すべての表現者および読者の存在尊厳を互いに尊重します。
                </li>
                <li>
                  <strong className="text-[#1A1F2C] font-normal">月3〜4作の投稿制限（推敲の重視）：</strong>
                  言葉を粗雑に消費するのではなく深く育むため、作品の公開数を「月3篇〜4篇（週1篇ペース）」に制限します。この制限は制約ではなく、一作一作に心を込めて推敲するための時間です。
                </li>
                <li>
                  <strong className="text-[#1A1F2C] font-normal">数字や評価の排除：</strong>
                  「いいね数」や「PV数」「ランキング」といった表面的な競い合いを排します。他者との関わりは数字ではなく、丁寧な鑑賞文・合評（応答）を通じて行われます。
                </li>
              </ul>

              {/* 良心への問いかけコールアウト */}
              <div className="mt-6 p-6 bg-[#D4A359]/10 border border-[#D4A359]/40 rounded-sm text-stone-800 text-xs sm:text-sm">
                <p className="font-medium text-[#1A1F2C] mb-2 font-sans">【送信前の自己内省リマインダー】</p>
                <p className="italic leading-relaxed">
                  「送信ボタンを押す前に、静かに自らに問いかけてみてください。<br />
                  ※ この言葉は、他者の尊厳を深め、自他の良心を照らすものですか？」
                </p>
              </div>
            </section>

            {/* 第二条 */}
            <section id="article-2" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                第二条（著作権および自発的編集・退会の自由）
              </h2>
              <p className="leading-loose">
                利用者が投稿した作品やコメントの著作権は、すべて投稿者本人に帰属します。
              </p>
              <p className="mt-3 leading-loose">
                また、利用者は過去に投稿した自らの言葉を、理由を問わず**いつでも自発的に編集・修正・削除する完全な権利**を有します。利用者は一切の不当な束縛を受けることなく、いつでも自由にい退会することができます。
              </p>
            </section>

            {/* 第三条 */}
            <section id="article-3" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                第三条（禁止事項および静寂の保護）
              </h2>
              <p className="mb-3">当プラットフォームの静けさと利用者の安全を守るため、以下の行為を禁止します。</p>
              <ul className="space-y-2 list-disc list-inside text-stone-700">
                <li>特定の個人または集団に対する差別的表現、ヘイトスピーチ、誹謗中傷</li>
                <li>「作品批評」を装った個人的な攻撃、マウンティング、人身攻撃行為</li>
                <li>スパム投稿、自動プログラム（BOT）による不正アクセスやシステム妨害</li>
              </ul>
            </section>

            {/* 第四条 */}
            <section id="article-4" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                第四条（フォーラム『Pratyaya Lab』での対話倫理）
              </h2>
              <p className="leading-loose">
                フォーラムや作品レビューにおいて、批評は推奨されます。ただし、批評の対象は常に**「表現された言葉の構造や効果（rūpa）」**であり、書き手本人の**「人格や生命」**を否定する言動は厳格に区別され、排除されます。
              </p>
            </section>

            {/* 第五条 */}
            <section id="article-5" className="scroll-mt-12">
              <h2 className="text-xl text-[#1A1F2C] border-b border-stone-200/80 pb-2 mb-4 font-normal">
                第五条（運営の責任と規約改訂）
              </h2>
              <p className="leading-loose">
                主宰・運営（杉原詠二）は、利用者の個人情報および言葉を厳重に保護し、商業的改ざんを行いません。本指針はサイトの理念を深めるために改訂されることがあり、その際は十分な事前周知を行います。
              </p>
            </section>

            {/* フッター誘導 */}
            <div className="pt-12 border-t border-stone-200/80 text-center space-y-4">
              <p className="text-xs text-stone-500 font-sans">
                この宣言と指針に同意し、poem pratyaya の対話に参加しますか？
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/poems/new"
                  className="px-6 py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans tracking-wider rounded-sm hover:bg-[#2A3142] transition shadow-sm"
                >
                  同意して詩を投稿する
                </Link>
                <Link
                  href="/lab"
                  className="px-6 py-2.5 bg-white border border-stone-300 text-[#1A1F2C] text-xs font-sans tracking-wider rounded-sm hover:border-[#D4A359] transition"
                >
                  対話フォーラムを見る
                </Link>
              </div>
            </div>

          </article>
        </div>

      </div>
    </main>
  )
}