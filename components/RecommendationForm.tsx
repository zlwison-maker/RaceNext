"use client";

import { useMemo, useState } from "react";
import { RaceCard } from "@/components/RaceCard";
import {
  defaultRecommendationProfile,
  distanceLabels,
  getLockedTargetDistance,
  getRecommendationCards,
  type RecommendationDistance,
  type RecommendationGoal,
  type RecommendationInputProfile,
  type RaceCardViewModel,
  type RaceRegion,
  type RegistrationPreference,
  type RunnerStage,
} from "@/lib/raceAdapter";

const stageOptions: Array<{ value: RunnerStage; label: string }> = [
  { value: "any", label: "不限" },
  { value: "beginner", label: "新手" },
  { value: "half_marathon", label: "跑过半马" },
  { value: "marathon", label: "跑过全马" },
  { value: "trail", label: "跑过越野" },
  { value: "advanced", label: "高阶跑者" },
];

const goalOptions: Array<{ value: RecommendationGoal; label: string }> = [
  { value: "any", label: "不限" },
  { value: "first_half", label: "首个半马" },
  { value: "first_marathon", label: "首个全马" },
  { value: "first_trail", label: "首个越野" },
  { value: "challenge_50k", label: "挑战 50K" },
  { value: "challenge_100k", label: "挑战 100K" },
  { value: "scenic_trail", label: "风景越野" },
];

const distanceOptions: Array<{ value: RecommendationDistance; label: string }> = [
  { value: "any", label: "不限" },
  { value: "lte30", label: "≤30KM" },
  { value: "30_50", label: "30KM - 50KM" },
  { value: "50_100", label: "50KM - 100KM" },
  { value: "gt100", label: "＞100KM" },
];

const trailDistanceOptions: Array<{ value: RecommendationDistance; label: string }> = [
  { value: "lte30", label: "≤30KM" },
  { value: "30_50", label: "30KM - 50KM" },
  { value: "50_100", label: "50KM - 100KM" },
  { value: "gt100", label: "＞100KM" },
];

const regionOptions: Array<{ value: RaceRegion | "all"; label: string }> = [
  { value: "all", label: "不限" },
  { value: "east_china", label: "华东" },
  { value: "south_china", label: "华南" },
  { value: "north_china", label: "华北" },
  { value: "southwest_china", label: "西南" },
  { value: "northwest_china", label: "西北" },
  { value: "northeast_china", label: "东北" },
  { value: "central_china", label: "华中" },
];

const registrationOptions: Array<{ value: RegistrationPreference; label: string }> = [
  { value: "actionable", label: "优先可报名" },
  { value: "any", label: "不限" },
];

export function RecommendationForm({ races }: { races: RaceCardViewModel[] }) {
  const [profile, setProfile] = useState<RecommendationInputProfile>(defaultRecommendationProfile);
  const activeGoalOptions = getGoalOptionsForStage(profile.stage);
  const lockedDistance = getLockedTargetDistance(profile.goal);
  const activeDistanceOptions = getDistanceOptionsForGoal(profile.goal);
  const recommendations = useMemo(() => getRecommendationCards(races, profile), [profile, races]);

  return (
    <section className="grid gap-6">
      <div className="border-y border-stone-200 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">你的下一场，想怎么跑？</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">选择你的目标和偏好，我们会推荐更适合你的比赛。</p>
        </div>

        <div className="mt-4 grid gap-3">
          <OptionRow
            label="当前阶段"
            value={profile.stage}
            options={stageOptions}
            onChange={(value) => {
              const stage = value as RunnerStage;
              const availableGoals = getGoalOptionsForStage(stage).map((option) => option.value);
              setProfile((current) => {
                const goal = availableGoals.includes(current.goal) ? current.goal : availableGoals[0];
                return applyGoalToProfile({ ...current, stage }, goal);
              });
            }}
          />
          <OptionRow
            label="目标赛事"
            value={profile.goal}
            options={activeGoalOptions}
            onChange={(value) => {
              const goal = value as RecommendationGoal;
              setProfile((current) => applyGoalToProfile(current, goal));
            }}
          />
          {lockedDistance ? (
            <LockedDistanceRow value={distanceLabels[lockedDistance]} />
          ) : (
            <OptionRow
              label="目标距离"
              value={profile.targetDistance}
              options={activeDistanceOptions}
              onChange={(value) => setProfile((current) => ({ ...current, targetDistance: value as RecommendationDistance }))}
            />
          )}
          <OptionRow
            label="所在地区"
            value={profile.region}
            options={regionOptions}
            onChange={(value) => setProfile((current) => ({ ...current, region: value as RecommendationInputProfile["region"] }))}
          />
          <OptionRow
            label="报名状态"
            value={profile.registrationPreference}
            options={registrationOptions}
            onChange={(value) => setProfile((current) => ({ ...current, registrationPreference: value as RegistrationPreference }))}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-950">适合你的下一场比赛</h2>
        <p className="mt-1 text-sm text-slate-600">根据你的目标、距离和地区偏好生成。</p>
      </div>

      {recommendations.length === 0 ? (
        <div className="border border-stone-200 bg-white px-5 py-8 text-sm text-slate-600">
          <p className="font-semibold text-slate-950">暂时没有找到完全匹配的比赛</p>
          <p className="mt-2">你可以放宽地区、距离或报名状态条件再试试。</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {recommendations.map((recommendation) => (
              <RaceCard
                key={`${recommendation.persona}-${recommendation.race.id}`}
                race={recommendation.race}
                recommendation={{
                  persona: recommendation.persona,
                  matchScore: recommendation.matchScore,
                  reasons: recommendation.reasons,
                  riskTip: recommendation.riskTip,
                }}
              />
            ))}
          </div>
          {recommendations.length < 3 ? (
            <div className="border border-stone-200 bg-white px-5 py-6 text-sm text-slate-600">
              <p className="font-semibold text-slate-950">暂时没有找到更多完全匹配的比赛</p>
              <p className="mt-2">你可以放宽目标距离、地区或报名状态再试试。</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function getGoalOptionsForStage(stage: RunnerStage) {
  const allowedGoals: Record<RunnerStage, RecommendationGoal[]> = {
    any: ["any", "first_half", "first_marathon", "first_trail", "challenge_50k", "challenge_100k", "scenic_trail"],
    beginner: ["any", "first_half", "scenic_trail"],
    half_marathon: ["any", "first_marathon", "first_trail", "scenic_trail"],
    marathon: ["any", "first_trail", "challenge_50k", "challenge_100k", "scenic_trail"],
    trail: ["any", "challenge_50k", "challenge_100k", "scenic_trail"],
    advanced: ["any", "first_half", "first_marathon", "first_trail", "challenge_50k", "challenge_100k", "scenic_trail"],
  };
  return goalOptions.filter((option) => allowedGoals[stage].includes(option.value));
}

function applyGoalToProfile(current: RecommendationInputProfile, goal: RecommendationGoal): RecommendationInputProfile {
  const nextDistance = getLockedTargetDistance(goal);
  const availableDistances = getDistanceOptionsForGoal(goal).map((option) => option.value);

  return {
    ...current,
    goal,
    targetDistance: nextDistance ?? (availableDistances.includes(current.targetDistance) ? current.targetDistance : availableDistances[0]),
  };
}

function getDistanceOptionsForGoal(goal: RecommendationGoal) {
  if (goal === "first_trail" || goal === "scenic_trail") return trailDistanceOptions;
  return distanceOptions;
}

function LockedDistanceRow({ value }: { value: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[88px_minmax(0,1fr)] md:items-center">
      <p className="text-xs font-semibold text-slate-500">目标距离</p>
      <p className="text-xs font-medium leading-4 text-slate-600">目标距离：{value}</p>
    </div>
  );
}

function OptionRow({
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
