import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FIRST5_EVENT_IDS } from "@/data/events/first5-events";
import { getRaceDecisionPages } from "@/lib/raceDecision";
import type { RaceDecisionPage } from "@/lib/raceDecision";

export const metadata: Metadata = {
  title: "RaceNext - 找到下一场值得奔赴的比赛",
  description: "RaceNext 帮助跑者发现精选赛事，了解参赛信息，提前规划下一次出发。",
};

const heroImage =
  "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=2200&q=90";

const fallbackImages = {
  road: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1800&q=90",
  trail: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1800&q=90",
};

const textShadow = {
  textShadow: "0 3px 22px rgba(0,0,0,0.68)",
};

const englishNames: Record<string, string> = {
  "shanghai-marathon": "Shanghai Marathon",
  "beijing-marathon": "Beijing Marathon",
  "xiamen-marathon": "Xiamen Marathon",
  hk100: "Hong Kong 100",
  "kailas-gongga-100": "Kailas Gongga 100",
};

export default function Home() {
  const featuredRaces = getRaceDecisionPages()
    .filter((race) => FIRST5_EVENT_IDS.includes(race.id))
    .sort((a, b) => FIRST5_EVENT_IDS.indexOf(a.id) - FIRST5_EVENT_IDS.indexOf(b.id));

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">
      <HomeHero />
      <FeaturedRaces races={featuredRaces} />
      <RaceNextPhilosophy />
      <SiteFooter />
    </main>
  );
}

function HomeHero() {
  return (
    <section className="relative min-h-[640px] overflow-hidden bg-[#18231f] text-white sm:min-h-[760px]">
      <img src={heroImage} alt="山野跑者正在奔跑" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#101512]/88 via-[#101512]/42 to-[#101512]/16" />
      <div className="relative mx-auto flex min-h-[640px] max-w-6xl flex-col justify-end px-5 pb-14 pt-20 sm:min-h-[760px] sm:px-6 sm:pb-20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">RaceNext</p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-normal sm:text-7xl lg:text-8xl">
            下一场
            <span className="block">找到值得奔赴的比赛</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base font-normal leading-8 text-white/76 sm:text-lg">
            RaceNext 帮助跑者发现精选赛事，了解参赛信息，提前规划下一次出发。
          </p>
          <a
            href="#featured-races"
            className="mt-9 inline-flex rounded-full border border-white/34 px-7 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-[#1A1A1A]"
          >
            探索赛事
          </a>
        </div>
      </div>
    </section>
  );
}

function FeaturedRaces({ races }: { races: RaceDecisionPage[] }) {
  return (
    <section id="featured-races" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#888888]">Featured Races</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-5xl">精选赛事</h2>
        <p className="mt-5 text-base font-normal leading-8 text-[#666666] sm:text-lg">
          从热门马拉松到经典越野赛事，找到适合你的下一场挑战。
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {races.map((race, index) => (
          <FeaturedRaceCard key={race.id} race={race} priority={index === 0} />
        ))}
      </div>
    </section>
  );
}

function FeaturedRaceCard({ race, priority }: { race: RaceDecisionPage; priority: boolean }) {
  const image = race.coverImage ?? getRaceImage(race);
  const city = formatCity(race);

  return (
    <Link
      href={`/races/${race.id}`}
      className={`group relative min-h-[360px] overflow-hidden rounded-lg bg-[#1e2b26] text-white ${
        priority ? "lg:col-span-2 lg:min-h-[520px]" : ""
      }`}
    >
      <img src={image} alt={`${race.name}赛事图片`} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080b09]/92 via-[#101512]/50 to-[#101512]/18" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/42 to-transparent" />
      <div className="relative flex h-full min-h-[360px] flex-col justify-end p-6 sm:p-8 lg:min-h-[inherit]">
        <div className="max-w-2xl" style={textShadow}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/78">{englishNames[race.id] ?? "RaceNext Event"}</p>
          <h3 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">{race.name}</h3>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-white/88 sm:text-base">
            <span>{city}</span>
            <span>{race.dateText ?? "日期待官方更新"}</span>
          </div>
        </div>
        <span className="mt-8 inline-flex w-fit rounded-full border border-white/34 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:border-white group-hover:bg-white group-hover:text-[#1A1A1A]">
          查看赛事
        </span>
      </div>
    </Link>
  );
}

function RaceNextPhilosophy() {
  const values = [
    {
      title: "发现",
      description: "找到适合自己的比赛",
    },
    {
      title: "决策",
      description: "了解赛事信息与参赛准备",
    },
    {
      title: "出发",
      description: "规划下一次奔赴",
    },
  ];

  return (
    <section id="about" className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-24">
      <div className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#888888]">RaceNext Philosophy</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-5xl">为下一次奔赴做好准备</h2>
          <div className="mt-6 max-w-2xl space-y-2 text-base font-normal leading-8 text-[#666666]">
            <p>RaceNext 从赛事出发，但不止于赛事信息。</p>
            <p>我们关注跑者真正要完成的选择：去哪一场，如何准备，如何更从容地站上起点。</p>
          </div>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {values.map((value) => (
            <div key={value.title}>
              <h3 className="text-xl font-bold text-[#1A1A1A]">{value.title}</h3>
              <p className="mt-3 text-sm font-normal leading-7 text-[#666666]">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getRaceImage(race: RaceDecisionPage) {
  if (race.type === "trail" || race.type === "ultra_trail") return fallbackImages.trail;
  return fallbackImages.road;
}

function formatCity(race: RaceDecisionPage) {
  const parts = [race.province, race.city].filter(Boolean);
  if (!parts.length) return race.venue ?? "地点待官方更新";
  return Array.from(new Set(parts)).join(" · ");
}
