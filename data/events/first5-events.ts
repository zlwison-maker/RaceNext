export type MvpEventType = "city_marathon" | "trail";

export type AccommodationPriorityType = "distance" | "transportation" | "balance";

export type EventBaseSource = {
  name: string;
  url: string;
  verifiedAt: string;
  note: string;
};

export type EventBaseData = {
  eventId: string;
  eventName: string;
  eventYear: number | null;
  eventDate: string | null;
  eventLocation: string;
  eventStatus: string;
  coverImage: string;
  categories: string[];
  source: EventBaseSource;
  lastUpdated: string;
};

export type AffiliateLinks = {
  ctrip: Record<AccommodationPriorityType, string>;
};

export type MvpAccommodationArea = {
  areaName: string;
  priorityType: AccommodationPriorityType;
  recommendationReason: string;
  suitableUsers: string;
  coreAdvantage: string;
  affiliateLinks: AffiliateLinks;
};

export type RaceNextDecisionData = {
  eventId: string;
  accommodationAreas: MvpAccommodationArea[];
};

export type First5MvpEvent = {
  base: EventBaseData;
  decision: RaceNextDecisionData;
};

const eventTitle = (eventYear: number | null, officialTitle: string) => {
  if (!eventYear || officialTitle.includes(String(eventYear))) return officialTitle;
  return `${eventYear}${officialTitle}`;
};

const ctripLinks = (distance: string, transportation: string, balance: string): AffiliateLinks => ({
  ctrip: {
    distance,
    transportation,
    balance,
  },
});

const cityMarathonAreas = (affiliateLinks: AffiliateLinks): MvpAccommodationArea[] => [
  {
    areaName: "赛事地点附近",
    priorityType: "distance",
    recommendationReason: "适合希望减少比赛日通勤不确定性的跑者。",
    suitableUsers: "希望优先确保比赛日到达稳定性的跑者。",
    coreAdvantage: "离比赛区域近，检录和存包更从容。",
    affiliateLinks,
  },
  {
    areaName: "交通便利区域",
    priorityType: "transportation",
    recommendationReason: "适合兼顾高铁、机场和市内公共交通的跑者。",
    suitableUsers: "跨城参赛、需要灵活进出城市的跑者。",
    coreAdvantage: "到达和离开更顺，换乘成本更低。",
    affiliateLinks,
  },
  {
    areaName: "综合性价比区域",
    priorityType: "balance",
    recommendationReason: "适合在便利性和住宿成本之间取得平衡的跑者。",
    suitableUsers: "希望控制整体参赛成本的跑者。",
    coreAdvantage: "兼顾距离、交通和价格，整体参赛成本更可控。",
    affiliateLinks,
  },
];

const trailAreas = (affiliateLinks: AffiliateLinks): MvpAccommodationArea[] => [
  {
    areaName: "赛事地点附近",
    priorityType: "distance",
    recommendationReason: "适合希望减少比赛日通勤不确定性的跑者。",
    suitableUsers: "需要优先控制起跑前移动风险的跑者。",
    coreAdvantage: "离比赛区域近，赛前集合更从容。",
    affiliateLinks,
  },
  {
    areaName: "交通便利区域",
    priorityType: "transportation",
    recommendationReason: "适合兼顾机场、高铁和接驳交通的跑者。",
    suitableUsers: "外地参赛、需要多段交通衔接的跑者。",
    coreAdvantage: "到达和离开更顺，换乘成本更低。",
    affiliateLinks,
  },
  {
    areaName: "综合性价比区域",
    priorityType: "balance",
    recommendationReason: "适合在便利性和住宿成本之间取得平衡的跑者。",
    suitableUsers: "希望控制整体参赛成本的跑者。",
    coreAdvantage: "兼顾距离、交通和价格，整体参赛成本更可控。",
    affiliateLinks,
  },
];

export const FIRST5_MVP_EVENTS: First5MvpEvent[] = [
  {
    base: {
      eventId: "shanghai-marathon",
      eventYear: 2026,
      eventName: eventTitle(2026, "上海马拉松"),
      eventDate: "2026-12-06",
      eventLocation: "上海市黄浦区外滩金牛广场",
      eventStatus: "报名已截止",
      coverImage: "",
      categories: ["马拉松", "竞速轮椅马拉松"],
      source: {
        name: "上海市人民政府 / 上海马拉松",
        url: "https://english.shanghai.gov.cn/en-SportsEvents/20260427/8152288074a44b44a7efbfd4b0b67797.html",
        verifiedAt: "2026-08-04",
        note: "公开信息显示 2026 上海马拉松于 2026-12-06 举办，4月29日至5月29日预报名。",
      },
      lastUpdated: "2026-08-04",
    },
    decision: {
      eventId: "shanghai-marathon",
      accommodationAreas: cityMarathonAreas(ctripLinks("https://t.ctrip.cn/9j1JpWv", "https://t.ctrip.cn/wBaeYh1", "https://t.ctrip.cn/9xAw4et")),
    },
  },
  {
    base: {
      eventId: "beijing-marathon",
      eventYear: 2026,
      eventName: eventTitle(2026, "北京马拉松"),
      eventDate: "2026-10-18",
      eventLocation: "北京市天安门广场",
      eventStatus: "待官方开放",
      coverImage: "",
      categories: ["马拉松"],
      source: {
        name: "AIMS / 中国马拉松",
        url: "https://aims-worldrunning.org/zh-CN/races/852.html",
        verifiedAt: "2026-08-04",
        note: "AIMS 收录 2026 北京马拉松日期为 2026-10-18；中国马拉松信息为拟定日期，仍需上线前复核官方公告。",
      },
      lastUpdated: "2026-08-04",
    },
    decision: {
      eventId: "beijing-marathon",
      accommodationAreas: cityMarathonAreas(ctripLinks("https://t.ctrip.cn/4149V7L", "https://t.ctrip.cn/lQAuxBe", "https://t.ctrip.cn/yyG47Xq")),
    },
  },
  {
    base: {
      eventId: "xiamen-marathon",
      eventYear: 2027,
      eventName: eventTitle(2027, "厦门马拉松"),
      eventDate: "2027-01-10",
      eventLocation: "福建省厦门市",
      eventStatus: "待官方开放",
      coverImage: "",
      categories: ["马拉松"],
      source: {
        name: "AIMS / 厦门马拉松组委会公开信息",
        url: "https://aims-worldrunning.org/zh-CN/races/632.html",
        verifiedAt: "2026-08-04",
        note: "2026 厦门马拉松已于 2026-01-11 举办；当前可验证的下一届为 2027-01-10。",
      },
      lastUpdated: "2026-08-04",
    },
    decision: {
      eventId: "xiamen-marathon",
      accommodationAreas: cityMarathonAreas(ctripLinks("https://t.ctrip.cn/tCwweHk", "https://t.ctrip.cn/0nud5K2", "https://t.ctrip.cn/pzmT6Vm")),
    },
  },
  {
    base: {
      eventId: "hk100",
      eventYear: 2027,
      eventName: eventTitle(2027, "香港HK100越野赛"),
      eventDate: "2027-01-21/2027-01-24",
      eventLocation: "香港西贡北潭涌",
      eventStatus: "报名中",
      coverImage: "",
      categories: ["The Third", "The Half", "HK100", "The Grand Sam"],
      source: {
        name: "Hong Kong 100 Ultra Marathon",
        url: "https://hk100ultra.com/",
        verifiedAt: "2026-08-04",
        note: "官网当前展示 2027 Edition，公众抽签 7月30日开放，赛事日期覆盖 2027-01-21 至 2027-01-24。",
      },
      lastUpdated: "2026-08-04",
    },
    decision: {
      eventId: "hk100",
      accommodationAreas: trailAreas(ctripLinks("https://t.ctrip.cn/BZVndSi", "https://t.ctrip.cn/bxHYY02", "https://t.ctrip.cn/6EppQsO")),
    },
  },
  {
    base: {
      eventId: "kailas-gongga-100",
      eventYear: 2026,
      eventName: eventTitle(2026, "凯乐石贡嘎100冰川极限挑战赛"),
      eventDate: "2026-09-25/2026-09-27",
      eventLocation: "四川省甘孜州泸定县磨西镇海螺沟游客中心",
      eventStatus: "报名中",
      coverImage: "",
      categories: ["100km", "60km", "40km"],
      source: {
        name: "朗途体育 / Gongga 100",
        url: "https://www.letoursports.net/gongga-100",
        verifiedAt: "2026-08-04",
        note: "官网显示赛事日期为 2026-09-25 至 2026-09-27，组别为 100km / 60km / 40km，并标注 Registration Open。",
      },
      lastUpdated: "2026-08-04",
    },
    decision: {
      eventId: "kailas-gongga-100",
      accommodationAreas: trailAreas(ctripLinks("https://t.ctrip.cn/oY0j97A", "https://t.ctrip.cn/pSgTGqZ", "https://t.ctrip.cn/7tpj3IJ")),
    },
  },
];

export const FIRST5_EVENT_BASE_DATA = FIRST5_MVP_EVENTS.map((event) => event.base);

export const FIRST5_RACENEXT_DECISION_DATA = FIRST5_MVP_EVENTS.map((event) => event.decision);

export const FIRST5_EVENT_IDS = FIRST5_MVP_EVENTS.map((event) => event.base.eventId);

export function findFirst5MvpEvent(eventId: string, eventName: string) {
  const normalizedName = normalizeEventName(eventName);
  return FIRST5_MVP_EVENTS.find((event) => {
    const normalizedMvpName = normalizeEventName(event.base.eventName);
    return (
      event.base.eventId === eventId ||
      normalizedName.includes(normalizedMvpName) ||
      normalizedMvpName.includes(normalizedName) ||
      getEventMatchKeywords(event.base.eventId).some((keyword) => normalizedName.includes(keyword))
    );
  });
}

function normalizeEventName(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/20\d{2}/g, "")
    .replace(/[·・\-—“”"']/g, "")
    .toLowerCase();
}

function getEventMatchKeywords(eventId: string) {
  const keywords: Record<string, string[]> = {
    "shanghai-marathon": ["上海马拉松", "上马", "shanghaimarathon"],
    "beijing-marathon": ["北京马拉松", "北马", "beijingmarathon"],
    "xiamen-marathon": ["厦门马拉松", "厦马", "xiamenmarathon"],
    hk100: ["香港100", "hk100", "港百", "hongkong100"],
    "kailas-gongga-100": ["凯乐石贡嘎", "贡嘎100", "贡嘎", "kailasgongga"],
  };
  return keywords[eventId] ?? [];
}
