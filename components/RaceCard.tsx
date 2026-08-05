"use client";

import type { RecommendationViewModel, RaceCardViewModel } from "@/lib/raceAdapter";
import { raceTypeLabels, regionLabels } from "@/lib/raceAdapter";

type RaceCardProps = {
  race: RaceCardViewModel;
  recommendation?: Omit<RecommendationViewModel, "race">;
};

export function RaceCard({ race, recommendation }: RaceCardProps) {
  const actionText = "看决策";
  const displayTags = race.tags.slice(0, 3);
  const showElevation = race.type === "trail" || race.type === "ultra_trail";
  const countdownValue = formatCountdownValue(race.countdownText);
  const dateNote = formatDateNote(countdownValue);
  const elevationNote = showElevation ? formatElevationNote(race.elevationText) : undefined;

  const handleOpen = () => {
    window.location.href = `/races/${race.id}`;
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${race.name}，${actionText}`}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className="group cursor-pointer rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-stone-300"
    >
      <div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-700">
                {raceTypeLabels[race.type]} · {formatLocation(race)}
              </p>
              <h3 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-950">{race.name}</h3>
            </div>
            <ActionPill actionText={actionText} hasRegistrationUrl={Boolean(race.registrationUrl)} hasSourceUrl={Boolean(race.sourceUrl)} />
          </div>

          {displayTags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayTags.map((tag) => (
                <span key={tag} className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <Metric label="比赛日期" value={race.dateText} note={dateNote} />
            <Metric label="报名状态" value={race.registrationStatusText} valueClassName={getStatusClass(race.registrationStatus)} />
            <Metric label="距离" value={race.distancesText} note={elevationNote} />
            <Metric label="费用 / 组别" value={race.feeMainText} note={race.feeSubText} muted={race.feeMainText === "报名信息待更新"} />
          </div>

          {recommendation ? (
            <section className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-950">为什么推荐这场比赛</h4>
                <span className="text-sm font-semibold text-slate-700">
                  匹配度 {recommendation.matchScore}% · {formatMatchLevel(recommendation.matchScore)}
                </span>
              </div>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                {recommendation.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-slate-400">{recommendation.riskTip}</p>
            </section>
          ) : null}

        </div>
      </div>
    </article>
  );
}

function ActionPill({
  actionText,
  hasRegistrationUrl,
  hasSourceUrl,
}: {
  actionText: string;
  hasRegistrationUrl: boolean;
  hasSourceUrl: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-semibold transition ${
        hasRegistrationUrl
          ? "border-slate-950 bg-white text-slate-950 group-hover:border-emerald-700 group-hover:text-emerald-700"
          : hasSourceUrl
            ? "border-stone-300 bg-white text-slate-700 group-hover:border-slate-500 group-hover:text-slate-950"
            : "border-stone-200 bg-stone-50 text-slate-500"
      }`}
    >
      {actionText}
    </span>
  );
}

function formatLocation(race: RaceCardViewModel) {
  const city = race.city ?? race.province ?? "城市待更新";
  const area = race.province ?? regionLabels[race.region];
  return `${city} · ${area}`;
}

function getStatusClass(status: RaceCardViewModel["registrationStatus"]) {
  const classes: Record<RaceCardViewModel["registrationStatus"], string> = {
    registration_open: "text-emerald-700",
    upcoming: "text-sky-700",
    lottery: "text-violet-700",
    closed: "text-slate-500",
    racing: "text-emerald-700",
    finished: "text-slate-500",
    unknown: "text-slate-500",
  };
  return classes[status];
}

function formatCountdownValue(value: string) {
  if (value.startsWith("距离开赛 ")) return value.replace("距离开赛 ", "");
  if (value === "具体日期待更新") return "待更新";
  return value;
}

function formatDateNote(value: string) {
  if (value === "待更新" || value === "今日开赛" || value === "已结束") return value;
  return `距离比赛 ${value}`;
}

function formatElevationNote(value: string) {
  if (value === "爬升待更新") return "累计爬升待更新";
  return `累计爬升 ${value}`;
}

function formatMatchLevel(score: number) {
  if (score >= 90) return "高度匹配";
  if (score >= 80) return "较匹配";
  if (score >= 70) return "可考虑";
  return "备选";
}

function Metric({
  label,
  value,
  note,
  muted = false,
  valueClassName,
}: {
  label: string;
  value: string;
  note?: string;
  muted?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-stone-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-base font-semibold ${valueClassName ?? (muted ? "text-slate-500" : "text-slate-950")}`}>{value}</p>
      {note ? <p className="mt-1 break-words text-xs font-medium text-slate-500">{note}</p> : null}
    </div>
  );
}
