// Explicit release expectations after Human accepted temporary use of the supplied Panda image.
export const existingTwelveEditionIds = [
  "shanghai-marathon-2026", "beijing-marathon-2026", "xiamen-marathon-2027", "hk100-2027",
  "kailas-gongga-100-2026", "xian-marathon-2026", "ninghai-ultra-trail-2026", "guangzhou-marathon-2026",
  "chengdu-marathon-2026", "tsaigu-kuocang-2026", "shenzhen-100-2026", "chongqing-marathon-2027",
];
export const newPublicEditionIds = ["guangzhou-100-2027", "nanjing-marathon-2026", "shaoxing-marathon-2026", "shenzhen-marathon-2026", "hengqin-marathon-2026", "fuzhou-marathon-2026", "panda-shudao-shan-2027"];
export const november2027EditionIds = ["standard-chartered-hong-kong-marathon-2027", "ultra-trail-mogan-by-utmb-2027"];
export const outopiaEditionId = "outopia-mogan-cloud-flower-trail-2027";
export const huangshanEditionId = "huangshan-huizhou-ancient-city-trail-2027";
export const expectedPublicEditionIds = [...existingTwelveEditionIds, ...newPublicEditionIds, ...november2027EditionIds, outopiaEditionId];
export const expectedCanonicalEditionIds = [...expectedPublicEditionIds, huangshanEditionId];
