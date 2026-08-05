"use client";

import { useMemo, useState } from "react";
import { RaceCard } from "@/components/RaceCard";
import {
  difficultyLabels,
  isValuableFutureRace,
  regionLabels,
  registrationStatusLabels,
  type RaceCardViewModel,
  type RaceRegion,
  type RaceRegistrationStatus,
} from "@/lib/raceAdapter";

type TypeFilter = "all" | "marathon" | "half_marathon" | "trail";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "challenge";

type FilterState = {
  type: TypeFilter;
  month: string;
  region: RaceRegion | "all";
  difficulty: DifficultyFilter;
  registrationStatus: RaceRegistrationStatus | "all";
};

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "marathon", label: "马拉松" },
  { value: "half_marathon", label: "半马" },
  { value: "trail", label: "越野" },
];

const regionOptions: RaceRegion[] = [
  "east_china",
  "south_china",
  "north_china",
  "central_china",
  "southwest_china",
  "northwest_china",
  "northeast_china",
];

const difficultyOptions: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "beginner", label: difficultyLabels.beginner },
  { value: "intermediate", label: difficultyLabels.intermediate },
  { value: "challenge", label: difficultyLabels.challenge },
];
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const statusOptions: RaceRegistrationStatus[] = [
  "registration_open",
  "lottery",
  "upcoming",
  "unknown",
];

export function RaceFilters({ races }: { races: RaceCardViewModel[] }) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: "all",
    month: "all",
    region: "all",
    difficulty: "all",
    registrationStatus: "all",
  });

  const filteredRaces = useMemo(() => {
    return races
      .filter(isValuableFutureRace)
      .filter((race) => {
        const typeMatch =
          filters.type === "all" ||
          race.type === filters.type ||
          (filters.type === "trail" && race.type === "ultra_trail");
        const monthMatch = filters.month === "all" || race.month === Number(filters.month);
        const regionMatch = filters.region === "all" || race.region === filters.region;
        const difficultyMatch =
          filters.difficulty === "all" ||
          race.difficulty === filters.difficulty ||
          (filters.difficulty === "challenge" && race.difficulty === "high_challenge");
        const statusMatch = filters.registrationStatus === "all" || race.registrationStatus === filters.registrationStatus;
        return typeMatch && monthMatch && regionMatch && difficultyMatch && statusMatch;
      })
      .sort(sortCalendarRaces);
  }, [filters, races]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 border-y border-stone-200 py-3">
        <FilterRow
          label="赛事类型"
          value={filters.type}
          options={typeOptions}
          onChange={(value) => setFilters((current) => ({ ...current, type: value as FilterState["type"] }))}
        />

        {expanded ? (
          <>
            <FilterRow
              label="地区"
              value={filters.region}
              options={[
                { value: "all", label: "全部" },
                ...regionOptions.map((region) => ({ value: region, label: regionLabels[region] })),
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, region: value as FilterState["region"] }))}
            />

            <FilterRow
              label="月份"
              value={filters.month}
              options={[
                { value: "all", label: "全部" },
                ...monthOptions.map((month) => ({ value: String(month), label: `${month}月` })),
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, month: value }))}
            />

            <FilterRow
              label="难度"
              value={filters.difficulty}
              options={[
                { value: "all", label: "全部" },
                ...difficultyOptions,
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, difficulty: value as FilterState["difficulty"] }))}
            />

            <FilterRow
              label="报名状态"
              value={filters.registrationStatus}
              options={[
                { value: "all", label: "全部" },
                ...statusOptions.map((status) => ({ value: status, label: registrationStatusLabels[status] })),
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, registrationStatus: value as FilterState["registrationStatus"] }))}
            />
          </>
        ) : null}

        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          style={{ fontSize: 10 }}
          className="mx-auto mt-0 inline-flex w-fit items-center justify-center gap-1 rounded-md px-0 py-0.5 text-[10px] font-medium leading-none text-slate-500 transition hover:text-slate-800"
        >
          <span className="leading-none">{expanded ? "收起筛选" : "点击展开"}</span>
          <span className={`inline-flex size-2.5 items-center justify-center text-[10px] leading-none transition-transform ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
      </section>

      <p className="text-sm font-medium text-slate-600">共找到 {filteredRaces.length} 场赛事</p>

      {filteredRaces.length === 0 ? (
        <div className="border border-stone-200 bg-white px-5 py-8 text-sm text-slate-600">
          当前筛选下没有赛事，可以放宽月份、地区或报名状态。
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRaces.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[88px_minmax(0,1fr)] md:items-center">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={`${label}-${option.value}`}
              type="button"
              onClick={() => onChange(option.value)}
              style={{ fontSize: 12 }}
              className={`shrink-0 rounded border px-1.5 py-0 text-xs font-medium leading-4 transition ${
                selected
                  ? "border-stone-300 bg-stone-100 text-slate-800"
                  : "border-stone-200 bg-white text-slate-500 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sortCalendarRaces(a: RaceCardViewModel, b: RaceCardViewModel) {
  return (
    getStatusPriority(a) - getStatusPriority(b) ||
    getDatePriority(a) - getDatePriority(b) ||
    Number(Boolean(b.registrationUrl)) - Number(Boolean(a.registrationUrl)) ||
    b.confidence - a.confidence
  );
}

function getStatusPriority(race: RaceCardViewModel) {
  const priorities: Record<RaceRegistrationStatus, number> = {
    registration_open: 0,
    lottery: 1,
    upcoming: 2,
    racing: 3,
    unknown: 4,
    closed: 5,
    finished: 6,
  };
  return priorities[race.registrationStatus];
}

function getDatePriority(race: RaceCardViewModel) {
  if (!race.raceDate) return Number.MAX_SAFE_INTEGER;
  const date = new Date(`${race.raceDate}T00:00:00+08:00`).getTime();
  return Number.isNaN(date) ? Number.MAX_SAFE_INTEGER : date;
}
