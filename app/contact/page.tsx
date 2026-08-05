import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "联系我们 - RaceNext",
  description: "联系 RaceNext，反馈赛事信息、使用体验与合作建议。",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">
      <InfoHeader title="联系我们" />
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="space-y-7 text-base font-normal leading-8 text-[#666666]">
          <p>如果您有任何问题、建议或反馈，欢迎联系我们。</p>
          <p>我们期待听到跑者关于赛事信息、使用体验以及网站改进方向的建议。</p>
        </div>

        <section className="mt-12 rounded-lg border border-[#ddd6ca] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">联系方式</h2>
          <p className="mt-5 text-base font-normal leading-8 text-[#666666]">邮箱：</p>
          <a href="mailto:35880366@qq.com" className="mt-2 inline-flex text-lg font-semibold text-[#435044]">
            35880366@qq.com
          </a>
        </section>

        <section className="mt-12 border-t border-[#ddd6ca] pt-10">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">关于合作</h2>
          <div className="mt-6 space-y-6 text-base font-normal leading-8 text-[#666666]">
            <p>目前 RaceNext 主要专注于赛事信息整理与参赛体验优化。</p>
            <p>如果您希望与我们交流赛事内容、用户体验或其他相关建议，也欢迎通过邮箱联系我们。</p>
          </div>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}

function InfoHeader({ title }: { title: string }) {
  return (
    <section className="bg-[#18231f] px-5 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-white/54">
          RaceNext
        </Link>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>
      </div>
    </section>
  );
}
