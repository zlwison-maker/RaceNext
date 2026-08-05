"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTrafficSource, trackEvent } from "@/lib/analytics";
import type { RaceDecisionPage as RaceDecisionPageViewModel } from "@/lib/raceDecision";
import { formatDistance } from "@/lib/raceDecision";

type Props = {
  race: RaceDecisionPageViewModel;
};

type AccommodationArea = {
  id: string;
  type: "distance" | "transportation" | "balance";
  areaName: string;
  label: string;
  reason: string;
  advantages: string;
  cta: string;
  affiliateUrl: string;
  provider: "ctrip" | "placeholder";
};

export function RaceEventServicePage({ race }: Props) {
  const locationText = formatLocationText(race);
  const categoryLabels = formatCategoryLabels(race);
  const accommodationAreas = buildAccommodationAreas(race);

  useEffect(() => {
    trackEvent("event_page_view", {
      event_id: race.analyticsEventId,
      event_slug: race.id,
      source: getTrafficSource(),
    });
  }, [race.analyticsEventId, race.id]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#1A1A1A]">
      <EventHero race={race} locationText={locationText} categoryLabels={categoryLabels} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-12">
          {accommodationAreas.length ? <AccommodationGuide race={race} areas={accommodationAreas} /> : null}
          {race.faq.length ? <FaqSection faq={race.faq} /> : null}
          {race.nextRaces.length ? <NextRaces races={race.nextRaces} /> : null}
        </div>
      </div>
    </main>
  );
}

export function RaceDecisionPage(props: Props) {
  return <RaceEventServicePage {...props} />;
}

function EventHero({
  race,
  locationText,
  categoryLabels,
}: {
  race: RaceDecisionPageViewModel;
  locationText: string;
  categoryLabels: string[];
}) {
  const categoryText = categoryLabels.length ? categoryLabels.join(" / ") : "待官方更新";

  return (
    <section id="Hero" className="relative min-h-[310px] overflow-hidden bg-[#1e2b26] text-white sm:min-h-[420px]">
      {race.coverImage ? (
        <img src={race.coverImage} alt={`${race.name}赛事图片`} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,#59705a_0,#22332b_34%,#141d1a_72%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#101512]/82 via-[#101512]/44 to-[#101512]/10" />
      <div className="relative mx-auto flex min-h-[310px] max-w-6xl flex-col justify-end px-4 pb-6 pt-8 sm:min-h-[420px] sm:px-6 sm:pb-10">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold leading-[1.04] sm:text-5xl lg:text-6xl">{race.name}</h1>
          <div className="mt-5 grid gap-2.5 text-sm font-medium sm:text-base">
            <HeroFact label="比赛时间" value={race.dateText ?? "待官方更新"} />
            <HeroFact label="比赛地点" value={locationText} />
            <HeroFact label="赛事组别" value={categoryText} />
            <HeroFact label="报名状态" value={race.registrationStatusText} accent />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFact({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <p className={accent ? "text-[#f1773d]" : "text-white/90"}>
      <span className="mr-3 text-white/55">{label}</span>
      <span>{value}</span>
    </p>
  );
}

function AccommodationGuide({ race, areas }: { race: RaceDecisionPageViewModel; areas: AccommodationArea[] }) {
  useEffect(() => {
    areas.forEach((area) => {
      trackEvent("accommodation_impression", {
        event_id: race.analyticsEventId,
        event_slug: race.id,
        area_type: area.type,
        source: "event_page_accommodation",
      });
    });
  }, [areas, race.analyticsEventId, race.id]);

  return (
    <Section id="参赛住宿指南" eyebrow="Accommodation" title="参赛住宿指南" bare>
      <div className="grid gap-6 lg:grid-cols-3">
        {areas.map((area, index) => (
          <article
            key={area.id}
            className={`relative flex min-h-[285px] flex-col overflow-hidden rounded-lg border bg-[#f0ebe3] p-7 text-[#1A1A1A] ${
              index === 0 ? "border-[#d8cfc0] shadow-[0_14px_34px_rgba(26,26,26,0.06)]" : "border-[#e0d8ca] shadow-sm"
            }`}
          >
            <AccommodationVisual type={area.type} />
            <div className="relative z-10 flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#9d9386]">{area.label}</p>
                <h3 className="mt-4 text-2xl font-bold leading-tight">{area.areaName}</h3>
              </div>
            </div>
            <p className="relative z-10 mt-7 text-sm font-normal leading-7 text-[#666666]">{area.reason}</p>
            <p className="relative z-10 mt-5 text-sm font-medium leading-7 text-[#1A1A1A]">{area.advantages}</p>
            <div className="relative z-10 mt-auto pt-8">
              <a
                href={area.affiliateUrl}
                onClick={() => {
                  trackEvent("accommodation_click", {
                    event_id: race.analyticsEventId,
                    event_slug: race.id,
                    area_type: area.type,
                    provider: area.provider,
                    source: "event_page_accommodation",
                    transport_type: "beacon",
                  });
                }}
                className="block rounded-full bg-[#435044] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#354037]"
                style={{ color: "#ffffff" }}
              >
                {area.cta}
              </a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

function AccommodationVisual({ type }: { type: AccommodationArea["type"] }) {
  const common = "pointer-events-none absolute -right-8 top-5 h-32 w-32 text-[#b9ad9b] opacity-[0.12] sm:-right-10 sm:top-6 sm:h-40 sm:w-40";

  if (type === "distance") {
    return (
      <div className={common} aria-hidden="true">
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
          <path d="M11 32c7 4 17 5 27 1" />
          <path d="M14 30c4-8 10-12 18-12h4" />
          <path d="M18 27l8 7" />
          <path d="M29 18l7-7" />
          <circle cx="36" cy="11" r="3" />
        </svg>
      </div>
    );
  }

  if (type === "transportation") {
    return (
      <div className={common} aria-hidden="true">
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
          <path d="M9 35c6-9 10-13 17-13 5 0 8-3 12-9" />
          <path d="M33 13h6v6" />
          <path d="M12 35h8" />
          <path d="M17 31h7" />
          <circle cx="10" cy="35" r="2" />
        </svg>
      </div>
    );
  }

  return (
    <div className={common} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
        <path d="M13 36h22" />
        <path d="M18 36V15l13 5-13 5" />
        <path d="M14 29c8 0 13 0 21-4" />
        <path d="M24 31c3 2 7 3 11 3" />
      </svg>
    </div>
  );
}

function FaqSection({ faq }: { faq: RaceDecisionPageViewModel["faq"] }) {
  return (
    <Section id="FAQ" eyebrow="Search FAQ" title="常见问题">
      <div className="divide-y divide-[#ded6c5]">
        {faq.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="cursor-pointer list-none text-base font-semibold leading-7 text-[#1A1A1A]">{item.question}</summary>
            <p className="mt-2 text-sm font-normal leading-7 text-[#666666]">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function NextRaces({ races }: { races: RaceDecisionPageViewModel["nextRaces"] }) {
  return (
    <Section id="下一场推荐" eyebrow="Next" title="下一场推荐">
      <div className="grid gap-3">
        {races.map((race) => (
          <Link key={race.id} href={`/races/${race.id}`} className="grid overflow-hidden rounded-lg border border-[#e2ddd2] bg-white transition hover:border-[#1A1A1A]/20 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="relative h-40 bg-[#1e2b26] sm:h-full sm:min-h-[190px]">
              <img src={race.coverImage ?? getRecommendationImage(race.type)} alt={`${race.name}赛事图片`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101815]/50 to-transparent" />
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end sm:p-6">
              <div className="min-w-0 self-start">
                <h3 className="text-lg font-bold leading-7 text-[#1A1A1A]">{race.name}</h3>
                <div className="mt-5 grid gap-2 text-sm font-normal leading-6 text-[#666666]">
                  <RecommendedFact label="比赛时间" value={race.dateText ?? "待官方更新"} />
                  <RecommendedFact label="比赛地点" value={race.locationText ?? "地点待官方更新"} />
                  <RecommendedFact label="报名状态" value={race.registrationStatusText} />
                </div>
              </div>
              <span className="rounded-full border border-[#435044]/35 px-4 py-2 text-center text-sm font-semibold text-[#435044]">
                查看住宿指南
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Section({ id, eyebrow, title, children, bare = false }: { id: string; eyebrow: string; title: string; children: ReactNode; bare?: boolean }) {
  return (
    <section id={id} className={bare ? "py-2" : "rounded-lg border border-[#e2ddd2] bg-white p-5 shadow-sm sm:p-7"}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#888888]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#1A1A1A] sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function RecommendedFact({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-[#888888]">{label}</span>
      <span className="mx-1.5 text-[#9d9888]">/</span>
      <span>{value}</span>
    </p>
  );
}

function getRecommendationImage(type: RaceDecisionPageViewModel["type"]) {
  if (type === "trail" || type === "ultra_trail") {
    return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=85";
  }
  return "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=85";
}

function buildAccommodationAreas(race: RaceDecisionPageViewModel): AccommodationArea[] {
  if (race.accommodationAreas.length) {
    return race.accommodationAreas.map((area, index) => ({
      id: `${area.priorityType}-${index}`,
      type: area.priorityType,
      areaName: area.areaName,
      label: accommodationPriorityLabels[area.priorityType],
      reason: area.recommendationReason,
      advantages: area.coreAdvantage,
      cta: "查看住宿选择",
      affiliateUrl: buildAccommodationTrackingUrl(race.analyticsEventId, area.priorityType, "ctrip"),
      provider: "ctrip",
    }));
  }

  const place = race.venue ?? race.city ?? race.district ?? race.province;
  if (!place) return [];

  return [
    {
      id: "near-event",
      type: "distance",
      areaName: "住在比赛附近",
      label: "距离优先",
      reason: "适合希望减少比赛日通勤不确定性的跑者。",
      advantages: "离比赛区域近，检录和存包更从容。",
      cta: "查看住宿选择",
      affiliateUrl: buildAffiliatePlaceholder(race.id, "distance"),
      provider: "placeholder",
    },
    {
      id: "transport",
      type: "transportation",
      areaName: "住交通方便的位置",
      label: "交通优先",
      reason: "适合兼顾高铁、机场和市内公共交通的跑者。",
      advantages: "到达和离开更顺，换乘成本更低。",
      cta: "查看住宿选择",
      affiliateUrl: buildAffiliatePlaceholder(race.id, "transportation"),
      provider: "placeholder",
    },
    {
      id: "value",
      type: "balance",
      areaName: "平衡距离与成本",
      label: "综合优先",
      reason: "适合在便利性和住宿成本之间取得平衡的跑者。",
      advantages: "兼顾距离、交通和价格，整体参赛成本更可控。",
      cta: "查看住宿选择",
      affiliateUrl: buildAffiliatePlaceholder(race.id, "balance"),
      provider: "placeholder",
    },
  ];
}

const accommodationPriorityLabels: Record<AccommodationArea["type"], string> = {
  distance: "距离优先",
  transportation: "交通优先",
  balance: "综合优先",
};

function buildAffiliatePlaceholder(eventId: string, areaType: AccommodationArea["type"]) {
  return buildAccommodationTrackingUrl(eventId, areaType, "placeholder");
}

function buildAccommodationTrackingUrl(eventId: string, areaType: AccommodationArea["type"], provider: AccommodationArea["provider"]) {
  const params = new URLSearchParams({
    eventId,
    areaType,
    provider,
    source: "event_page_accommodation",
  });
  return `/go/accommodation?${params.toString()}`;
}

function formatLocationText(race: RaceDecisionPageViewModel) {
  return [race.province, race.city, race.district].filter(Boolean).join(" · ") || race.venue || "地点待官方更新";
}

function formatCategoryLabels(race: RaceDecisionPageViewModel) {
  const labels = race.categories
    .map((category) => category.name || (category.distanceKm ? formatDistance(category.distanceKm) : null))
    .filter((label): label is string => Boolean(label));
  return [...new Set(labels)];
}
