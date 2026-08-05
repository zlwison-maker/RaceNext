import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "关于 RaceNext - RaceNext",
  description: "了解 RaceNext：发现下一场值得奔赴的比赛。",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">
      <InfoHeader title="关于 RaceNext" />
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="space-y-8 text-base font-normal leading-8 text-[#666666]">
          <p className="text-2xl font-bold leading-9 text-[#1A1A1A]">发现下一场值得奔赴的比赛。</p>
          <p>RaceNext 致力于帮助跑者发现和了解国内外优质跑步赛事。</p>
          <p>
            我们整理马拉松、越野跑等赛事信息，为跑者提供赛事介绍、参赛信息以及行程规划参考，帮助每一次比赛选择更加清晰，每一次奔赴更加从容。
          </p>
          <div className="border-l border-[#d8cfc0] pl-5">
            <p>我们相信：</p>
            <p className="mt-3 text-xl font-bold leading-8 text-[#1A1A1A]">一场比赛，不只是一次挑战。</p>
            <p className="mt-2">它也是一次探索未知、遇见自己的旅程。</p>
          </div>
          <p>RaceNext 希望成为跑者寻找下一场比赛时，一个值得信赖的信息入口。</p>
        </div>

        <section className="mt-14 border-t border-[#ddd6ca] pt-10">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">关于本站</h2>
          <div className="mt-6 space-y-6 text-base font-normal leading-8 text-[#666666]">
            <p>RaceNext 当前由个人维护运营。</p>
            <p>网站内容主要来源于公开赛事信息整理与人工维护，旨在为跑者提供更便捷的赛事信息查询与参赛决策参考。</p>
            <p>随着项目持续发展，我们会不断优化赛事内容与用户体验。</p>
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
