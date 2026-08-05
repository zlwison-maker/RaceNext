import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-[#18231f] px-5 py-10 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-2xl font-bold">RaceNext</p>
          <p className="mt-3 text-sm font-normal text-white/62">发现下一场值得奔赴的比赛</p>
          <p className="mt-5 text-sm font-normal text-white/62">35880366@qq.com</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-white/70" aria-label="页脚导航">
          <Link href="/about" className="transition hover:text-white">
            关于 RaceNext
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            隐私政策
          </Link>
          <Link href="/contact" className="transition hover:text-white">
            联系我们
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-9 max-w-6xl border-t border-white/12 pt-6 text-xs font-normal text-white/42">© 2026 RaceNext</div>
    </footer>
  );
}
