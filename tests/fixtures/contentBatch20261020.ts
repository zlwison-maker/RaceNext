// Explicit release expectations: unverified Editions must not appear just because they are in Canonical.
export const existingTwelveEditionIds = [
  "shanghai-marathon-2026", "beijing-marathon-2026", "xiamen-marathon-2027", "hk100-2027",
  "kailas-gongga-100-2026", "xian-marathon-2026", "ninghai-ultra-trail-2026", "guangzhou-marathon-2026",
  "chengdu-marathon-2026", "tsaigu-kuocang-2026", "shenzhen-100-2026", "chongqing-marathon-2027",
];
export const newPublicEditionIds = ["guangzhou-100-2027", "nanjing-marathon-2026", "shaoxing-marathon-2026", "shenzhen-marathon-2026", "hengqin-marathon-2026"];
export const stagedEditionIds = ["fuzhou-marathon-2026", "panda-shudao-shan-2027"];
export const expectedPublicEditionIds = [...existingTwelveEditionIds, ...newPublicEditionIds];
