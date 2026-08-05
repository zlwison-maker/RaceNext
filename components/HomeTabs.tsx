"use client";

import { useState } from "react";
import { RaceFilters } from "@/components/RaceFilters";
import { RecommendationForm } from "@/components/RecommendationForm";
import type { RaceCardViewModel } from "@/lib/raceAdapter";

type HomeTab = "calendar" | "recommend";

export function HomeTabs({ races }: { races: RaceCardViewModel[] }) {
  const [activeTab, setActiveTab] = useState<HomeTab>("calendar");

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className="mb-5 flex gap-8">
        <button
          type="button"
          className={`border-b-2 px-1 pb-3 text-base transition ${
            activeTab === "calendar" ? "border-slate-950 font-bold text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          赛事日历
        </button>
        <button
          type="button"
          className={`border-b-2 px-1 pb-3 text-base transition ${
            activeTab === "recommend" ? "border-slate-950 font-bold text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("recommend")}
        >
          赛事推荐
        </button>
      </div>

      <div>{activeTab === "calendar" ? <RaceFilters races={races} /> : <RecommendationForm races={races} />}</div>
    </section>
  );
}
