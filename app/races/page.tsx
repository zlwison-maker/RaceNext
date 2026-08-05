import { RaceFilters } from "@/components/RaceFilters";
import { getRaceCards } from "@/lib/raceAdapter";

export default function RacesPage() {
  const races = getRaceCards();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-[0.18em] text-slate-500">赛事发现</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">赛事日历</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          发现适合自己的马拉松、越野赛与 UTMB 赛事。
        </p>
      </div>
      <RaceFilters races={races} />
    </main>
  );
}
