import { RecommendationForm } from "@/components/RecommendationForm";
import { getRaceCards } from "@/lib/raceAdapter";

export default function RecommendPage() {
  const races = getRaceCards();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-[0.18em] text-slate-500">规则推荐</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">赛事推荐</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          从当前 Top100 MVP 样本中筛出更适合作为下一场选择的赛事。
        </p>
      </div>
      <RecommendationForm races={races} />
    </main>
  );
}
