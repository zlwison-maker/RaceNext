import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { createPublicRaceDetailResult } from "../lib/raceGraphPublic.ts";
import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import type { PublicRaceDetail } from "../miniprogram/types/races.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z0-9]+$/i.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* use original */ }
    }
    return nextResolve(specifier, context);
  },
});

const { createRaceDetailViewModel, selectRaceCategory } = await import(
  "../miniprogram/utils/raceDetailPresentation.ts"
);
const { openHotelMiniProgram } = await import("../miniprogram/services/accommodation.ts");

const canonical = JSON.parse(readFileSync(
  new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8",
)) as unknown;

function getPublicRace(editionId: string): PublicRaceDetail {
  const result = createPublicRaceDetailResult(canonical, editionId);
  if (result.status !== 200) throw new Error(`Missing public race fixture: ${editionId}`);
  return result.body.race;
}

const batchOneAccommodation = [
  {
    editionId: "xian-marathon-2026",
    hotels: [
      {
        hotelName: "西安钟楼永宁门雅致酒店",
        recommendationTitle: "比赛日最省事",
        recommendationReason: "位于永宁门附近，适合优先步行前往起点，减少比赛日清晨交通的不确定性。",
        path: "/pages/hotel/detail/index?id=120417383&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981783929&sct=open_platform",
      },
      {
        hotelName: "CitiGO Hotel 西安钟楼南门店",
        recommendationTitle: "古城内兼顾起跑",
        recommendationReason: "位于钟楼—南门核心区域，在保持起跑便利的同时，也方便把参赛和古城体验结合起来。",
        path: "/pages/hotel/detail/index?id=29790928&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981839974&sct=open_platform",
      },
      {
        hotelName: "全季西安奥体国际会展中心酒店",
        recommendationTitle: "全马完赛后更省事",
        recommendationReason: "位于奥体片区，更适合把全马完赛后的返程便利放在首位的跑者；比赛日则需要提前安排前往永宁门起点的交通。",
        path: "/pages/hotel/detail/index?id=111253418&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981897661&sct=open_platform",
      },
    ],
  },
  {
    editionId: "chengdu-marathon-2026",
    hotels: [
      {
        hotelName: "桔子酒店（成都一品天下金沙博物馆地铁站店）",
        recommendationTitle: "起点最直接",
        recommendationReason: "位于金沙遗址核心区域，适合把比赛日清晨少折腾、方便到达起点放在第一位的跑者。",
        path: "/pages/hotel/detail/index?id=98999166&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983064850&sct=open_platform",
      },
      {
        hotelName: "成都金沙世纪酒店",
        recommendationTitle: "往届跑者实测",
        recommendationReason: "位于金沙片区，往届已有成马跑者实际入住，去起点也比较方便，适合希望参考真实参赛住宿经验的跑者。",
        path: "/pages/hotel/detail/index?id=2272797&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983024767&sct=open_platform",
      },
      {
        hotelName: "和颐至格酒店（成都西南财大文化宫地铁站店）",
        recommendationTitle: "交通更均衡",
        recommendationReason: "位于文化宫片区，在保持金沙起点可达性的同时，也方便赛前赛后的城市出行。",
        path: "/pages/hotel/detail/index?id=1669899&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983097816&sct=open_platform",
      },
      {
        hotelName: "成都泓宇酒店",
        recommendationTitle: "实用型起点选择",
        recommendationReason: "靠近金沙起点区域，也有往届成都马跑者实际入住反馈，适合不一定要住到起点门口、但希望比赛日出发足够省事的跑者。",
        path: "/pages/hotel/detail/index?id=1432148&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983132105&sct=open_platform",
      },
      {
        hotelName: "成都世纪城假日酒店-东楼",
        recommendationTitle: "全马完赛后更省事",
        recommendationReason: "位于世纪城片区，更适合把全马完赛后的返程便利放在首位的跑者；比赛日则需要提前前往金沙起点。",
        path: "/pages/hotel/detail/index?id=429874&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983165797&sct=open_platform",
      },
    ],
  },
  {
    editionId: "tsaigu-kuocang-2026",
    hotels: [
      {
        hotelName: "临海三抚一宅民宿（紫阳街台州府城店）",
        recommendationTitle: "离起终点最近",
        recommendationReason: "距兴善门很近，适合希望凌晨出门后直接步行去起点、长距离完赛后也尽快回住宿的跑者。",
        path: "/pages/hotel/detail/index?id=31572972&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984047649&sct=open_platform",
      },
      {
        hotelName: "临海畣畣 dádá 民宿",
        recommendationTitle: "古城核心·跑者实测",
        recommendationReason: "位于临海古城核心区域，也有往届柴古跑者实际入住经验，适合希望住在起终点附近、同时参考真实参赛住宿体验的跑者。",
        path: "/pages/hotel/detail/index?id=127002105&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984020007&sct=open_platform",
      },
      {
        hotelName: "台州府城印酒店",
        recommendationTitle: "酒店型步行方案",
        recommendationReason: "仍在兴善门步行范围内，同时更接近标准酒店住宿形态，适合不太想住小型民宿的跑者。",
        path: "/pages/hotel/detail/index?id=125785721&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984128706&sct=open_platform",
      },
      {
        hotelName: "芊杉·M⁺民宿（临海紫阳街台州府城店）",
        recommendationTitle: "古城内步行优先",
        recommendationReason: "位于台州府城核心区域，起终点、古城和赛前赛后活动都集中在步行范围内。",
        path: "/pages/hotel/detail/index?id=131562564&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984181370&sct=open_platform",
      },
      {
        hotelName: "台州临海开元名庭酒店",
        recommendationTitle: "标准酒店平衡型",
        recommendationReason: "距兴善门比前几家稍远，但仍处于合理步行范围，适合希望住标准酒店、又不想比赛日依赖车辆的跑者。",
        path: "/pages/hotel/detail/index?id=133280371&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984212838&sct=open_platform",
      },
    ],
  },
] as const;

const batchTwoAccommodation = [
  {
    editionId: "ninghai-ultra-trail-2026",
    hotels: [
      ["宁波宁海霞客居酒店（徐霞客大道店）", "比赛日最省事", "距西门城楼约 1 公里，适合把比赛日清晨少折腾、长距离完赛后尽快回住宿放在第一位的跑者。", "/pages/hotel/detail/index?id=1701230&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790043627133&sct=open_platform"],
      ["宁波宁海西子国际亚朵酒店", "近起点·标准连锁", "靠近西门城楼，适合希望兼顾比赛日起终点便利和标准连锁住宿体验的跑者。", "/pages/hotel/detail/index?id=114605638&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790043663265&sct=open_platform"],
      ["汉庭酒店（宁海西子国际广场店）", "近起点实用备选", "位于西子国际一带，属于西门城楼附近的实用型住宿选择，适合热门比赛期间为近起点酒店多留一个可订备选。", "/pages/hotel/detail/index?id=109887818&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790043703024&sct=open_platform"],
      ["宁海世贸中心大酒店", "县城核心备选", "位于宁海县城核心区域，往届赛事曾作为前往西门城楼的官方接驳点，适合近起点酒店紧张时作为补充选择；2026 接驳安排仍以赛事官方最终通知为准。", "/pages/hotel/detail/index?id=1302028&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790043735313&sct=open_platform"],
      ["天港漫非酒店（宁海店）", "往届跑者实测", "有往届宁海越野跑者实际入住反馈，酒店曾为赛事调整早餐时间并提供参赛服务；但距西门城楼更远，更适合作为近起点酒店紧张时的备选。", "/pages/hotel/detail/index?id=67463121&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790043771020&sct=open_platform"],
    ],
  },
  {
    editionId: "shanghai-marathon-2026",
    hotels: [
      ["上海外滩南京东路亚朵酒店", "起点最直接", "位于外滩核心区域，适合把比赛日清晨少折腾、稳定前往金牛广场起点放在第一位的跑者。", "/pages/hotel/detail/index?id=444194&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790046858865&sct=open_platform"],
      ["景莱·不舍酒店（上海南京东路外滩店）", "外滩近起点备选", "靠近外滩金牛广场，适合希望住在起点附近、同时为热门比赛多保留一个可订选择的跑者。", "/pages/hotel/detail/index?id=132520733&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790046891590&sct=open_platform"],
      ["上海外滩南京路步行街锦江都城酒店", "外滩成熟酒店方案", "位于南京东路外滩片区，兼顾起点便利和成熟酒店住宿体验，适合希望比赛日出发省事、又偏好传统酒店形态的跑者。", "/pages/hotel/detail/index?id=1114675&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790047146691&sct=open_platform"],
      ["上海奥林匹克俱乐部丽笙酒店", "全马完赛后最省事", "位于徐家汇体育公园一带，更适合把全马完赛后的休息和返程便利放在首位的跑者；比赛日则需要提前前往外滩起点。", "/pages/hotel/detail/index?id=127319172&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790047207692&sct=open_platform"],
      ["锦江都城酒店（上海徐家汇南华亭宾馆）", "终点侧实用备选", "靠近徐家汇体育公园，适合希望全马完赛后尽快回住宿、同时为终点附近多留一个可订选择的跑者。", "/pages/hotel/detail/index?id=396373&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790047234883&sct=open_platform"],
    ],
  },
  {
    editionId: "guangzhou-marathon-2026",
    hotels: [
      ["广州天河体育中心美居酒店", "比赛日最省事", "紧邻天河体育中心，适合把比赛日清晨少折腾、稳定前往起点放在第一位的跑者。", "/pages/hotel/detail/index?id=90697851&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790049420243&sct=open_platform"],
      ["广州天河大厦（天河体育中心店）", "起点旁稳定备选", "位于天河体育中心旁，适合希望住得离起点足够近，同时为热门比赛多保留一个标准酒店选择的跑者。", "/pages/hotel/detail/index?id=710694&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790049465853&sct=open_platform"],
      ["全季酒店（广州天河体育西路地铁站）", "往届跑者实测", "有往届广州马拉松跑者实际住宿反馈，前往天河体育中心也比较方便，适合希望参考真实参赛住宿经验的跑者。", "/pages/hotel/detail/index?id=125122144&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790049495110&sct=open_platform"],
      ["广州海心沙英迪格酒店", "完赛后最省事", "位于海心沙一带，更适合把全马完赛后的休息和返程便利放在首位的跑者；比赛日则需要提前前往天河体育中心起点。", "/pages/hotel/detail/index?id=107151174&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790049527744&sct=open_platform"],
      ["维福顿公寓（广州塔珠江新城店）", "终点侧实用备选", "靠近海心沙终点区域，适合希望完赛后尽快回住宿，同时为终点附近多留一个可订选择的跑者。", "/pages/hotel/detail/index?id=1526389&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790049552550&sct=open_platform"],
    ],
  },
  {
    editionId: "shenzhen-100-2026",
    hotels: [
      ["深圳大梅沙希尔顿欢朋酒店", "大梅沙标准酒店首选", "位于大梅沙核心区域，适合 60K、35K 和 10K 跑者优先降低比赛日出发和完赛后的交通不确定性。", "/pages/hotel/detail/index?id=91417515&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790050713448&sct=open_platform"],
      ["深圳大梅沙君宜全海景公寓", "往届跑者实测", "有往届深圳100跑者实际入住反馈，起终点和地铁都比较方便，适合希望参考真实参赛住宿经验的跑者。", "/pages/hotel/detail/index?id=1887786&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790050741674&sct=open_platform"],
      ["瑞米酒店（深圳大梅沙海滨公园店）", "大梅沙近起点备选", "靠近大梅沙海滨公园，适合希望比赛日少依赖车辆，同时为热门赛事多保留一个可订选择的跑者。", "/pages/hotel/detail/index?id=130373188&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790050767596&sct=open_platform"],
      ["在海边·海景泡池度假别墅", "100K 起点优先", "位于大鹏所城、较场尾一带，更适合 100K 跑者把 6:00 起跑前的交通确定性放在首位，避免比赛日凌晨从大梅沙跨区前往起点。", "/pages/hotel/detail/index?id=123097654&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790050799012&sct=open_platform"],
      ["深圳听海·海景居（大鹏所城较场尾沙滩店）", "100K 起点侧备选", "位于大鹏所城附近，适合 100K 跑者希望前一晚住在起点侧，同时为大鹏所城附近多保留一个可订选择。", "/pages/hotel/detail/index?id=68522172&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790050836722&sct=open_platform"],
    ],
  },
] as const;

const batchThreeAccommodation = [
  {
    editionId: "xiamen-marathon-2027",
    hotels: [
      ["厦门滨海悦华酒店（厦门国际会展店）", "比赛日最省事", "靠近厦门国际会展中心，适合把比赛日清晨少折腾、尽量步行前往赛事区域放在第一位的跑者。", "/pages/hotel/detail/index?id=428108&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790055774620&sct=open_platform"],
      ["厦门日航酒店（会展中心环岛路店）", "往届跑者实测", "靠近会展中心，并有往届厦马跑者实际入住反馈，酒店曾提供延迟退房和赛后服务，适合希望参考真实参赛住宿经验的跑者。", "/pages/hotel/detail/index?id=375296&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790055823371&sct=open_platform"],
      ["厦门国际会议中心酒店", "近起终点成熟酒店", "位于会展中心片区，适合希望兼顾比赛日出发便利和成熟酒店住宿体验，同时为热门赛事多保留一个可订选择的跑者。", "/pages/hotel/detail/index?id=427947&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790055855630&sct=open_platform"],
      ["厦门天元君隆大酒店（环岛路会展中心店）", "往届赛事服务实测", "有往届厦马跑者实际入住反馈，酒店曾为参赛者提供赛后姜茶、甜品等服务，适合希望参考真实赛事住宿体验的跑者；比赛日交通仍以 2027 官方安排为准。", "/pages/hotel/detail/index?biz=1&id=734162&inday=2026-09-22&outday=2026-09-23&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790055913452&sct=open_platform"],
      ["喜之缘酒店（会展中心环岛路店）", "会展中心近距离备选", "靠近厦门国际会展中心，适合热门赛事期间希望尽量住在赛事区域附近，同时多保留一个可订选择的跑者。", "/pages/hotel/detail/index?biz=1&id=133526885&inday=2026-09-22&outday=2026-09-23&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790055959331&sct=open_platform"],
    ],
  },
  {
    editionId: "chongqing-marathon-2027",
    hotels: [
      ["重庆南山忆江景公寓（南滨公园店）", "往届跑者实测", "有往届重庆马拉松跑者实际入住反馈，靠近海棠烟雨公园起终点，适合把比赛日出发和完赛后返回住宿的便利放在第一位的跑者。", "/pages/hotel/detail/index?id=106801379&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790056714570&sct=open_platform"],
      ["重庆喜来登大酒店", "起终点旁标准酒店", "靠近海棠烟雨公园起终点，适合希望比赛日少折腾，同时更偏好标准大酒店住宿体验的跑者。", "/pages/hotel/detail/index?biz=1&id=386932&inday=2026-09-22&outday=2026-09-23&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790056523626&sct=open_platform"],
      ["汉庭酒店（重庆南滨路皇冠国际江景店）", "近起终点连锁备选", "靠近海棠烟雨公园，适合希望兼顾比赛日便利和标准连锁住宿，同时为热门赛事多留一个可订选择的跑者。", "/pages/hotel/detail/index?id=130203655&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790056562789&sct=open_platform"],
      ["全季酒店（重庆南滨路皇冠国际江景店）", "近起终点品质连锁备选", "靠近海棠烟雨公园，适合希望兼顾比赛日便利和标准连锁住宿，同时为起终点核心区域多保留一个可订选择的跑者。", "/pages/hotel/detail/index?id=116697356&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057109552&sct=open_platform"],
      ["朗丽兹酒店（重庆南滨路圣地温泉店）", "南滨路成熟酒店备选", "位于南滨路一带，距海棠烟雨公园比前几家稍远，但住宿供给更稳定，适合核心起终点附近酒店紧张时作为补充选择。", "/pages/hotel/detail/index?id=430215&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790056611273&sct=open_platform"],
    ],
  },
  {
    editionId: "hk100-2027",
    hotels: [
      ["香港沙田丽豪酒店", "官方接驳·综合最稳", "2027 港百官方合作住宿，并设有前往北潭涌起点的官方接驳；同时有往届 HK100 跑者实际入住经验，适合希望把比赛日交通确定性放在第一位的跑者。", "/pages/hotel/detail/index?id=436847&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057418982&sct=open_platform"],
      ["香港 WM 酒店", "西贡侧起点优先", "2027 港百官方合作住宿，位于西贡，更适合 The Third、The Half 和 Grand Sam 跑者减少前往北潭涌的距离；HK100 100K 完赛后返回西贡则相对更远。", "/pages/hotel/detail/index?id=78146199&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057448417&sct=open_platform"],
      ["香港龙堡国际", "高铁到港·官方接驳", "2027 港百官方合作住宿，并设有前往北潭涌的官方接驳，靠近西九龙和佐敦一带，适合从内地高铁到港、希望把住宿和比赛日交通一起解决的跑者。", "/pages/hotel/detail/index?id=436496&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057477897&sct=open_platform"],
      ["香港九龙维景酒店", "九龙官方接驳备选", "2027 港百官方合作住宿，并设有前往北潭涌的官方接驳，适合希望住在九龙市区，同时避免比赛日凌晨自行安排前往起点交通的跑者。", "/pages/hotel/detail/index?id=344967&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057506631&sct=open_platform"],
      ["湾景国际", "港岛住宿·官方接驳", "2027 港百官方合作住宿，并设有前往北潭涌的官方接驳，适合希望住在香港岛、同时把比赛日凌晨交通确定性交给官方安排的跑者。", "/pages/hotel/detail/index?id=436871&inday=2026-09-24&outday=2026-09-25&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1790057561544&sct=open_platform"],
    ],
  },
] as const;

test("legacy Detail DTO without accommodationRecommendations remains usable", () => {
  const {
    accommodationRecommendations: _accommodationRecommendations,
    ...legacyRace
  } = getPublicRace("beijing-marathon-2026");

  for (const race of [legacyRace, { ...legacyRace, accommodationRecommendations: undefined }]) {
    const detail = createRaceDetailViewModel(race);
    equal(detail.hasAccommodation, false);
    deepEqual(detail.accommodationRecommendations, []);
    ok(detail.raceGuide);
  }
});

test("an empty accommodationRecommendations array keeps accommodation hidden", () => {
  const detail = createRaceDetailViewModel({
    ...getPublicRace("beijing-marathon-2026"),
    accommodationRecommendations: [],
  });
  equal(detail.hasAccommodation, false);
  deepEqual(detail.accommodationRecommendations, []);
  ok(detail.raceGuide);
});

test("Beijing shows the accommodation tab with three ordered hotel cards", () => {
  const detail = createRaceDetailViewModel(getPublicRace("beijing-marathon-2026"));
  equal(detail.hasAccommodation, true);
  equal(detail.accommodationRecommendations.length, 3);
  deepEqual(detail.accommodationRecommendations.map(({ hotelName }) => hotelName), [
    "宜尚酒店（北京天安门广场前门地铁站店）",
    "全季酒店（北京天安门广场王府井店）",
    "万豪万枫酒店（北京鸟巢国家会议中心店）",
  ]);
  ok(detail.accommodationRecommendations.every(({ recommendationTitle, recommendationReason }) => recommendationTitle && recommendationReason));
  ok(detail.accommodationRecommendations.every(({ actions }) => actions.wechat?.appId === "wx0e6ed4f51db9d078"));
  ok(detail.accommodationRecommendations.every(({ actions }) => Boolean(actions.wechat?.path)));
});

test("Accommodation Batch 1 exposes all 13 approved hotels and exact Ctrip actions", () => {
  let total = 0;
  for (const expectedRace of batchOneAccommodation) {
    const shared = getRaceAccommodationRecommendations(expectedRace.editionId);
    const publicRace = getPublicRace(expectedRace.editionId);
    const detail = createRaceDetailViewModel(publicRace);
    total += shared.length;

    equal(shared.length, expectedRace.hotels.length);
    equal(publicRace.accommodationRecommendations.length, expectedRace.hotels.length);
    equal(detail.hasAccommodation, true);
    ok(detail.raceGuide?.closing);
    deepEqual(detail.accommodationRecommendations.map((recommendation) => ({
      hotelName: recommendation.hotelName,
      recommendationTitle: recommendation.recommendationTitle,
      recommendationReason: recommendation.recommendationReason,
      appId: recommendation.wechatAction?.appId,
      path: recommendation.wechatAction?.path,
    })), expectedRace.hotels.map((hotel) => ({
      ...hotel,
      appId: "wx0e6ed4f51db9d078",
    })));
    deepEqual(
      publicRace.accommodationRecommendations.map(({ displayOrder }) => displayOrder),
      expectedRace.hotels.map((_, index) => index + 1),
    );
    deepEqual(
      publicRace.accommodationRecommendations.map(({ actions }) => actions.wechat),
      shared.map(({ hotel }) => hotel.actions.wechat),
    );
  }
  equal(total, 13);
});

test("Accommodation Batch 2 exposes all 20 approved hotels and exact Ctrip actions", () => {
  let total = 0;
  for (const expectedRace of batchTwoAccommodation) {
    const shared = getRaceAccommodationRecommendations(expectedRace.editionId);
    const publicRace = getPublicRace(expectedRace.editionId);
    const detail = createRaceDetailViewModel(publicRace);
    const expectedHotels = expectedRace.hotels.map(([
      hotelName,
      recommendationTitle,
      recommendationReason,
      path,
    ]) => ({
      hotelName,
      recommendationTitle,
      recommendationReason,
      appId: "wx0e6ed4f51db9d078",
      path,
    }));
    total += shared.length;

    equal(shared.length, 5);
    equal(publicRace.accommodationRecommendations.length, 5);
    equal(detail.hasAccommodation, true);
    ok(detail.raceGuide?.closing);
    deepEqual(detail.accommodationRecommendations.map((recommendation) => ({
      hotelName: recommendation.hotelName,
      recommendationTitle: recommendation.recommendationTitle,
      recommendationReason: recommendation.recommendationReason,
      appId: recommendation.wechatAction?.appId,
      path: recommendation.wechatAction?.path,
    })), expectedHotels);
    deepEqual(
      publicRace.accommodationRecommendations.map(({ displayOrder }) => displayOrder),
      [1, 2, 3, 4, 5],
    );
    deepEqual(
      publicRace.accommodationRecommendations.map(({ actions }) => actions.wechat),
      shared.map(({ hotel }) => hotel.actions.wechat),
    );
  }
  equal(total, 20);
  equal(
    [
      "beijing-marathon-2026",
      ...batchOneAccommodation.map(({ editionId }) => editionId),
      ...batchTwoAccommodation.map(({ editionId }) => editionId),
    ].reduce((sum, editionId) => sum + getRaceAccommodationRecommendations(editionId).length, 0),
    36,
  );
});

test("Accommodation Batch 3 exposes all 15 approved hotels and exact Ctrip actions", () => {
  let total = 0;
  for (const expectedRace of batchThreeAccommodation) {
    const shared = getRaceAccommodationRecommendations(expectedRace.editionId);
    const publicRace = getPublicRace(expectedRace.editionId);
    const detail = createRaceDetailViewModel(publicRace);
    const expectedHotels = expectedRace.hotels.map(([
      hotelName,
      recommendationTitle,
      recommendationReason,
      path,
    ]) => ({
      hotelName,
      recommendationTitle,
      recommendationReason,
      appId: "wx0e6ed4f51db9d078",
      path,
    }));
    total += shared.length;

    equal(shared.length, 5);
    equal(publicRace.accommodationRecommendations.length, 5);
    equal(detail.hasAccommodation, true);
    deepEqual(detail.accommodationRecommendations.map((recommendation) => ({
      hotelName: recommendation.hotelName,
      recommendationTitle: recommendation.recommendationTitle,
      recommendationReason: recommendation.recommendationReason,
      appId: recommendation.wechatAction?.appId,
      path: recommendation.wechatAction?.path,
    })), expectedHotels);
    deepEqual(
      publicRace.accommodationRecommendations.map(({ displayOrder }) => displayOrder),
      [1, 2, 3, 4, 5],
    );
    deepEqual(
      publicRace.accommodationRecommendations.map(({ actions }) => actions.wechat),
      shared.map(({ hotel }) => hotel.actions.wechat),
    );
  }
  equal(total, 15);
  equal(
    [
      "beijing-marathon-2026",
      ...batchOneAccommodation.map(({ editionId }) => editionId),
      ...batchTwoAccommodation.map(({ editionId }) => editionId),
      ...batchThreeAccommodation.map(({ editionId }) => editionId),
    ].reduce((sum, editionId) => sum + getRaceAccommodationRecommendations(editionId).length, 0),
    51,
  );
});

test("Race Guide Closing uses the same Accommodation availability as the guide tab", () => {
  const beijingRace = getPublicRace("beijing-marathon-2026");
  const beijing = createRaceDetailViewModel(beijingRace);

  equal(beijing.hasAccommodation, true);
  ok(beijing.raceGuide?.closing);
  for (const { editionId } of [...batchOneAccommodation, ...batchTwoAccommodation, ...batchThreeAccommodation]) {
    const detail = createRaceDetailViewModel(getPublicRace(editionId));
    equal(detail.hasAccommodation, true, editionId);
    ok(detail.raceGuide?.closing, editionId);
  }
  for (const editionId of ["kailas-gongga-100-2026"]) {
    const detail = createRaceDetailViewModel(getPublicRace(editionId));
    equal(detail.hasAccommodation, false, editionId);
  }

  const wxml = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
  ok(wxml.includes('wx:if="{{detail.hasAccommodation && detail.raceGuide.closing}}"'));

  const styles = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url), "utf8");
  ok(/\.race-guide__closing\s*\{[\s\S]*?color:\s*#3b3b3b;[\s\S]*?font-size:\s*30rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*50rpx;/.test(styles));
});

test("races without recommendations do not show an accommodation tab", () => {
  for (const editionId of ["kailas-gongga-100-2026"]) {
    equal(createRaceDetailViewModel(getPublicRace(editionId)).hasAccommodation, false);
  }
});

test("hotel jump passes the complete Ctrip action without rewriting it", () => {
  const recommendations = [...batchOneAccommodation, ...batchTwoAccommodation, ...batchThreeAccommodation].flatMap(({ editionId }) =>
    createRaceDetailViewModel(getPublicRace(editionId)).accommodationRecommendations);
  type CapturedJump = { appId: string; path?: string; envVersion?: string };
  const received: CapturedJump[] = [];
  (globalThis as typeof globalThis & { wx: { navigateToMiniProgram(option: CapturedJump): unknown } }).wx = {
    navigateToMiniProgram(option: CapturedJump) {
      received.push(option);
      return undefined;
    },
  };
  recommendations.forEach((recommendation) => {
    openHotelMiniProgram(recommendation.wechatAction!, { success() {}, fail() {} });
  });
  deepEqual(received.map(({ appId }) => appId), recommendations.map(({ wechatAction }) => wechatAction?.appId));
  deepEqual(received.map(({ envVersion }) => envVersion), recommendations.map(() => "release"));
  deepEqual(received.map(({ path }) => path), recommendations.map(({ wechatAction }) => wechatAction?.path));
});

test("clicking a Hotel Card invokes its exact action once", async () => {
  type PageDefinition = {
    handleHotelTap(this: unknown, event: {
      currentTarget: { dataset: { recommendationId: string } };
    }): void;
  };
  type JumpOption = { appId: string; path?: string; envVersion: string };
  const captured: { page: PageDefinition | null } = { page: null };
  const jumps: JumpOption[] = [];
  (globalThis as typeof globalThis & {
    Page(definition: PageDefinition): void;
    wx: {
      navigateToMiniProgram(option: JumpOption): void;
      reportEvent(eventName: string, data: Record<string, unknown>): void;
    };
  }).Page = (definition) => { captured.page = definition; };
  (globalThis as typeof globalThis & { wx: unknown }).wx = {
    navigateToMiniProgram(option: JumpOption) { jumps.push(option); },
    reportEvent() {},
  };

  await Function('return import("../miniprogram/pages/races/detail/index.ts")')();
  const pageDefinition = captured.page;
  if (!pageDefinition) throw new Error("Detail Page registration missing");
  const detail = createRaceDetailViewModel(getPublicRace("beijing-marathon-2026"));
  const recommendation = detail.accommodationRecommendations[1];
  pageDefinition.handleHotelTap.call(
    { data: { detail }, entrySource: "direct" },
    { currentTarget: { dataset: { recommendationId: recommendation.recommendationId } } },
  );

  equal(jumps.length, 1);
  equal(jumps[0].appId, recommendation.wechatAction?.appId);
  equal(jumps[0].path, recommendation.wechatAction?.path);
  equal(jumps[0].envVersion, "release");
});

test("Detail DTO preserves each opaque Ctrip action from shared Accommodation Data", () => {
  const shared = getRaceAccommodationRecommendations("beijing-marathon-2026");
  const publicRecommendations = getPublicRace("beijing-marathon-2026").accommodationRecommendations;
  equal(shared.length, 3);
  deepEqual(
    publicRecommendations.map(({ actions }) => actions.wechat),
    shared.map(({ hotel }) => hotel.actions.wechat),
  );
});

test("RaceNext application code does not interpret Ctrip stay-date parameters", () => {
  for (const path of [
    "../lib/raceGraphPublic.ts",
    "../miniprogram/utils/raceDetailPresentation.ts",
    "../miniprogram/services/accommodation.ts",
    "../miniprogram/pages/races/detail/index.ts",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    equal(/\b(?:inday|outday)\b/.test(source), false);
  }
});

test("Detail loads accommodation through the existing race request only", () => {
  const page = readFileSync(new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("../miniprogram/services/accommodation.ts", import.meta.url), "utf8");
  equal((page.match(/loadRaceDetail\(this\.editionId, getRace\)/g) ?? []).length, 1);
  equal(/wx\.request\s*\(/.test(`${page}\n${service}`), false);
  ok(service.includes("wx.navigateToMiniProgram"));
});

test("V1.3 trail category and Strategy state stay unchanged", () => {
  const gongga = createRaceDetailViewModel(getPublicRace("kailas-gongga-100-2026"));
  equal(gongga.showRaceStrategy, true);
  equal(selectRaceCategory(gongga, "kailas-gongga-100-2026-snow-60").showRaceStrategy, false);
  ok(gongga.selectedCategory?.coursePointSection);
  ok(gongga.raceGuide);
});

test("Detail template keeps race content and renders the minimal hotel card fields", () => {
  const wxml = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
  ok(wxml.includes("activeGuideTab === 'race'"));
  ok(wxml.includes("detail.accommodationRecommendations"));
  for (const field of ["item.hotelName", "item.recommendationTitle", "item.recommendationReason", "查看酒店 →"]) {
    ok(wxml.includes(field));
  }
  ok(wxml.indexOf('<text class="hotel-card__judgment"') < wxml.indexOf('<text class="hotel-card__name"'));
  ok(wxml.indexOf('<text class="hotel-card__name"') < wxml.indexOf('<text class="hotel-card__reason"'));
  ok(/class="hotel-card"[\s\S]*?bindtap="handleHotelTap"[\s\S]*?hover-class="hotel-card--pressed"/.test(wxml));
  equal((wxml.match(/bindtap="handleHotelTap"/g) ?? []).length, 1);
  const ctaMarkup = wxml.match(/<view\s+wx:if="\{\{item\.wechatAction\}\}"[\s\S]*?>查看酒店 →<\/view>/)?.[0] ?? "";
  ok(ctaMarkup.includes("查看酒店 →"));
  equal(ctaMarkup.includes("bindtap="), false);
});

test("accommodation analytics uses the approved event names and one lifecycle guard", () => {
  const page = readFileSync(new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url), "utf8");
  for (const eventName of ["accommodation_view", "hotel_card_impression", "hotel_click", "hotel_jump_success", "hotel_jump_fail"]) {
    ok(page.includes(`\"${eventName}\"`));
  }
  ok(page.includes("accommodationTracked"));
  ok(page.includes('channel: "wechat"'));
  ok(page.includes('partner: "ctrip"'));
});
