import { HomeTabs } from "@/components/HomeTabs";
import { getRaceCards } from "@/lib/raceAdapter";

export default function Home() {
  const races = getRaceCards();

  return (
    <main className="min-h-[calc(100vh-65px)] bg-stone-50">
      <section className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950 md:text-6xl">
            下一场
          </h1>
          <p className="mt-4 max-w-2xl text-2xl font-semibold leading-8 text-slate-800">
            帮你找到最适合的下一场比赛
          </p>
          <p className="mt-3 text-lg leading-8 text-slate-600">
            发现马拉松、越野赛与 UTMB 赛事，根据你的能力、经验与目标，推荐更适合你的比赛。
          </p>
        </div>
      </section>
      <HomeTabs races={races} />
    </main>
  );
}
