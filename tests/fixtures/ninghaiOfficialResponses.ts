// Selected fields replayed from the public ninghai100.com frontend/API on 2026-10-13.
// These are test observations, not approved production facts or Registry sources.
export const homepageHtml = '<html><script type="module" src="/assets/index-live.js"></script></html>';
export const entryScript = 'VITE_API_URL:"/app-api"; import("./Index-live.js")';
export const routeScript = 'import{x}from"./index-live.js";import{y}from"./index-helper.js"';
export const apiScript = 'url:"/race/group/list";url:"/race/group/get";url:"/race/news/list"';

export const groupList = [
  { id: 5, name: "CNH-60" },
  { id: 6, name: "UTNH-100" },
  { id: 4, name: "YNH-25" },
];

export const groupDetails = [
  { id: 5, name: "CNH-60", distance: 58.8, elevationGain: 2400,
    startPoint: "西门城楼", endPoint: "西门城楼",
    buttons: [{ linkUrl: "https://qiongjing.oss-cn-shanghai.aliyuncs.com/20260924/CNH-60_2026可隆宁海越野挑战赛_1790222141652.gpx" }] },
  { id: 6, name: "UTNH-100", distance: 100.6, elevationGain: 4986,
    startPoint: "西门城楼", endPoint: "西门城楼",
    buttons: [{ linkUrl: "https://qiongjing.oss-cn-shanghai.aliyuncs.com/20260924/UTNH-100_2026可隆宁海越野挑战赛_1790222035043.gpx" }] },
  { id: 4, name: "YNH-25", distance: 24.8, elevationGain: 618,
    startPoint: "西门城楼", endPoint: "西门城楼",
    buttons: [{ linkUrl: "https://qiongjing.oss-cn-shanghai.aliyuncs.com/20260924/YNH-25_2026可隆宁海越野挑战赛_1790222117296.gpx" }] },
];

export const newsList = { list: [
  { id: 8, title: "UTNH-100赛道介绍", publishDate: [2026, 9, 24] },
  { id: 9, title: "CNH-60赛道介绍", publishDate: [2026, 9, 24] },
  { id: 7, title: "YNH-25赛道介绍", publishDate: [2026, 9, 24] },
] };
