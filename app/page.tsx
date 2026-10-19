import Link from 'next/link'

export const metadata = {
  title: 'Poem pratyaya | 言語・思想の静かな聖域',
  description: '言葉を情報から解き放ち、他者の尊厳と自他の良心を照らす言葉の空地。作品投稿、縦書き鑑賞、対話空間Pratyaya Lab。',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1A1F2C] font-serif antialiased selection:bg-[#D4A359]/20">
      
      {/* 1. ナビゲーションヘッダー */}
      <header className="border-b border-[#E2DDD5] bg-[#FBF9F5]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-semibold tracking-widest text-[#1A1F2C]">Poem pratyaya</span>
            <span className="text-[10px] font-sans px-2 py-0.5 bg-[#D4A359]/20 text-[#8C621C] rounded tracking-wider">
              Sanctuary
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-sans text-stone-600">
            <Link href="/terms" className="hover:text-[#1A1F2C] transition-colors">
              理念・倫理指針
            </Link>
            <Link href="/lab" className="hover:text-[#1A1F2C] transition-colors">
              対話の空地（Pratyaya Lab）
            </Link>
            <Link
              href="/poems/new"
              className="px-4 py-2 bg-[#1A1F2C] text-[#FBF9F5] rounded hover:bg-stone-800 transition shadow-sm"
            >
              一篇の詩を紡ぐ
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. ヒーローセクション（静かな宣言） */}
      <section className="py-20 px-6 border-b border-[#E2DDD5] bg-gradient-to-b from-[#F4F0E8]/50 to-[#FBF9F5]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <p className="text-xs font-sans tracking-[0.25em] text-[#D4A359] uppercase">
            A Quiet Literary Sanctuary for Vāc & Logos
          </p>

          <h1 className="text-3xl sm:text-5xl font-normal tracking-wide text-[#1A1F2C] leading-tight sm:leading-snug">
            言葉を単なる情報から解き放ち、<br />
            自他の良心を照らす「響き」へ。
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed text-stone-700 font-serif">
            Poem pratyaya（ポエム・プラティヤヤ）は、勝ち／負けや数字の競い合いを離れ、<br className="hidden sm:inline" />
            一篇の言葉と静かに向き合い、他者の尊厳と存在の深層で触れ合うための場所です。
          </p>

          {/* メインアクション誘導ボタン */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/poems/new"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans tracking-widest rounded shadow hover:bg-stone-800 transition"
            >
              一篇の詩を投稿する（月3作制限）
            </Link>
            <Link
              href="/lab"
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#E2DDD5] text-[#1A1F2C] text-xs font-sans tracking-widest rounded hover:border-[#D4A359] transition"
            >
              対話の空地を見る（Pratyaya Lab）
            </Link>
            <Link
              href="/terms"
              className="w-full sm:w-auto px-6 py-3.5 text-xs font-sans text-stone-500 hover:text-[#1A1F2C] transition"
            >
              マニフェストを読む →
            </Link>
          </div>
        </div>
      </section>

      {/* 3. マニフェスト（智慧と慈悲の宣言カード） */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="p-8 sm:p-12 bg-white border border-[#E2DDD5] shadow-sm rounded-lg text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none" />
          
          <p className="text-xs font-sans tracking-widest text-[#D4A359] uppercase">
            Poem Pratyaya Manifesto
          </p>

          <blockquote className="text-base sm:text-lg text-[#1A1F2C] leading-relaxed italic max-w-2xl mx-auto">
            「Poem pratyayaは、真理の探究としての智慧と、人を尊重し支え合う慈悲の双方を大切にする。<br className="hidden sm:inline" />
            智慧なき慈悲は道を見失い、慈悲なき智慧は人を傷つける。<br className="hidden sm:inline" />
            私たちは詩を通して、理解と共感、真理と愛の調和を目指す。」
          </blockquote>

          <div className="pt-2 text-xs font-sans text-stone-500 border-t border-stone-100 max-w-xs mx-auto">
            主宰：杉原詠二（黒髪） ｜ アドバイザー：三浦果実
          </div>
        </div>
      </section>

      {/* 4. 場の根幹を支える4つの特徴 */}
      <section className="py-16 px-6 bg-[#F4F0E8]/60 border-y border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-normal text-[#1A1F2C]">言葉を大切に育むための設計</h2>
            <p className="text-xs font-sans text-stone-500">排他性を排し、深層での触れ合い（Pratyaya）を育む4つの防壁</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. 投稿制限 */}
            <div className="bg-white p-6 rounded-lg border border-[#E2DDD5] shadow-sm space-y-3">
              <span className="text-2xl">🕯️</span>
              <h3 className="text-base font-normal text-[#1A1F2C]">月3〜4作の投稿制限</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                言葉を粗雑に消費させないため、公開上限を「週1篇ペース（月3〜4作）」に設定。推敲を重ねた言葉だけを世に問います。
              </p>
            </div>

            {/* 2. 数字の排除 */}
            <div className="bg-white p-6 rounded-lg border border-[#E2DDD5] shadow-sm space-y-3">
              <span className="text-2xl">🍃</span>
              <h3 className="text-base font-normal text-[#1A1F2C]">数字や評価の排除</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                いいね数や閲覧数、ランキングによる承認欲求の競い合いを排します。他者との関わりは丁寧な「鑑賞文（応答）」で行われます。
              </p>
            </div>

            {/* 3. 縦書きビューア */}
            <div className="bg-white p-6 rounded-lg border border-[#E2DDD5] shadow-sm space-y-3">
              <span className="text-2xl">📜</span>
              <h3 className="text-base font-normal text-[#1A1F2C]">縦書き・横書きビューア</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                日本語の詩の美しい縦組み表示に完全対応。文字サイズや背景色の切り替えで、作品の世界に没入して鑑賞できます。
              </p>
            </div>

            {/* 4. Pratyaya Lab */}
            <div className="bg-white p-6 rounded-lg border border-[#E2DDD5] shadow-sm space-y-3">
              <span className="text-2xl">🏛️</span>
              <h3 className="text-base font-normal text-[#1A1F2C]">Pratyaya Lab（フォーラム）</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                人格否定を排し、言葉の構造（rūpa）や表現技法、言語思想について深く語り合う対話空間を完備しています。
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. ポータル導線・体験カード */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-normal text-[#1A1F2C]">言葉の部屋を巡る</h2>
          <p className="text-xs font-sans text-stone-500">目的の空間を選択してください</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 1. 投稿の部屋 */}
          <div className="bg-white p-8 rounded-lg border border-[#E2DDD5] shadow-sm flex flex-col justify-between space-y-6 hover:border-[#D4A359] transition-all">
            <div className="space-y-3">
              <span className="text-xs font-sans text-[#D4A359] uppercase tracking-wider block">01 / Sanctuary Room</span>
              <h3 className="text-xl font-normal text-[#1A1F2C]">一篇の詩を紡ぐ</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                推敲を重ねた作品を投稿します。リアルタイム縦書きプレビューと送信前の倫理確認チェックを完備しています。
              </p>
            </div>
            <Link
              href="/poems/new"
              className="inline-block py-2.5 bg-[#1A1F2C] text-[#FBF9F5] text-xs font-sans text-center rounded hover:bg-stone-800 transition"
            >
              執筆エディタを開く
            </Link>
          </div>

          {/* 2. 鑑賞の部屋 */}
          <div className="bg-white p-8 rounded-lg border border-[#E2DDD5] shadow-sm flex flex-col justify-between space-y-6 hover:border-[#D4A359] transition-all">
            <div className="space-y-3">
              <span className="text-xs font-sans text-[#D4A359] uppercase tracking-wider block">02 / Reading Room</span>
              <h3 className="text-xl font-normal text-[#1A1F2C]">作品を鑑賞する</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                縦書き/横書きビューアで作品を熟読し、心に触れた響きを丁寧な鑑賞文として書き手に届けることができます。
              </p>
            </div>
            <Link
              href="/poems/sample-id"
              className="inline-block py-2.5 bg-[#F4F0E8] text-[#1A1F2C] text-xs font-sans text-center rounded hover:bg-[#EAE4D8] transition"
            >
              作品ビューアを見る（サンプル）
            </Link>
          </div>

          {/* 3. 対話の部屋 */}
          <div className="bg-white p-8 rounded-lg border border-[#E2DDD5] shadow-sm flex flex-col justify-between space-y-6 hover:border-[#D4A359] transition-all">
            <div className="space-y-3">
              <span className="text-xs font-sans text-[#D4A359] uppercase tracking-wider block">03 / Pratyaya Lab</span>
              <h3 className="text-xl font-normal text-[#1A1F2C]">対話の空地（フォーラム）</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                相互鑑賞、言語思想、試作実験、静かな茶室の4カテゴリで、言葉の意味や構造について誠実に応答を交わします。
              </p>
            </div>
            <Link
              href="/lab"
              className="inline-block py-2.5 bg-[#F4F0E8] text-[#1A1F2C] text-xs font-sans text-center rounded hover:bg-[#EAE4D8] transition"
            >
              フォーラムに入る
            </Link>
          </div>

        </div>
      </section>

      {/* 6. フッター */}
      <footer className="border-t border-[#E2DDD5] bg-[#F4F0E8] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-stone-500 font-sans">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-semibold text-[#1A1F2C] text-sm font-serif">Poem pratyaya</p>
            <p>言葉の持つ音響（Vāc）と構造（Logos）を通じて、自他の良心を照らす静かな聖域</p>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-[#1A1F2C] transition-colors">
              利用規約・倫理指針
            </Link>
            <Link href="/poems/new" className="hover:text-[#1A1F2C] transition-colors">
              投稿画面
            </Link>
            <Link href="/lab" className="hover:text-[#1A1F2C] transition-colors">
              Pratyaya Lab
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
