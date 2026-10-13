import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const scene = new URL("./scene-trail-generated.png", import.meta.url);
const logo = new URL("../../../miniprogram/assets/brand/next-logo-mini-header-black.png", import.meta.url);
const cover = new URL("../../../public/share/racenext-home-v2-5x4.jpg", import.meta.url);
const friendPreview = new URL("./previews/friend-card.png", import.meta.url);
const timelinePreview = new URL("./previews/timeline-square.png", import.meta.url);

const svg = (width, height, body) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
);

await mkdir(fileURLToPath(new URL("../../../public/share/", import.meta.url)), { recursive: true });
await mkdir(fileURLToPath(new URL("./previews/", import.meta.url)), { recursive: true });

const overlay = svg(750, 600, `
  <defs>
    <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#080c12" stop-opacity="0.84"/>
      <stop offset="0.65" stop-color="#080c12" stop-opacity="0.40"/>
      <stop offset="1" stop-color="#080c12" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#080c12" stop-opacity="0"/>
      <stop offset="1" stop-color="#080c12" stop-opacity="0.57"/>
    </linearGradient>
  </defs>
  <rect width="750" height="600" fill="url(#left)"/>
  <rect width="750" height="600" fill="url(#bottom)"/>
  <text x="105" y="145" fill="#f7f7f5" font-family="PingFang SC, STHeiti, sans-serif" font-size="24" font-weight="500">你的下一场参赛指南</text>
  <text x="375" y="356" text-anchor="middle" fill="#fff" font-family="PingFang SC, STHeiti, sans-serif" font-size="36" font-weight="700">赛事信息 · 参赛建议 · 住宿指南</text>
`);

const { data: logoPixels, info: logoInfo } = await sharp(fileURLToPath(logo))
  .resize({ width: 116 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let offset = 0; offset < logoPixels.length; offset += logoInfo.channels) {
  logoPixels[offset] = 255;
  logoPixels[offset + 1] = 255;
  logoPixels[offset + 2] = 255;
}
const logoBytes = await sharp(logoPixels, { raw: logoInfo }).png().toBuffer();
const coverBytes = await sharp(fileURLToPath(scene))
  .resize(750, 600, { fit: "cover", position: "centre" })
  .composite([
    { input: overlay },
    { input: logoBytes, left: 105, top: 62 },
  ])
  .jpeg({ quality: 88, mozjpeg: true, progressive: true })
  .toBuffer();
await sharp(coverBytes).toFile(fileURLToPath(cover));

const friendFrame = svg(900, 980, `
  <rect width="900" height="980" fill="#eef0ef"/>
  <rect x="112" y="90" width="676" height="774" rx="16" fill="#fff"/>
  <text x="152" y="158" fill="#1d2526" font-family="PingFang SC, STHeiti, sans-serif" font-size="30" font-weight="600">下一场跑哪场？马拉松与越野参赛指南</text>
  <text x="153" y="800" fill="#747b7b" font-family="PingFang SC, STHeiti, sans-serif" font-size="24">RaceNext  ·  小程序</text>
  <text x="113" y="924" fill="#6f7777" font-family="PingFang SC, STHeiti, sans-serif" font-size="20">好友卡片模拟预览 · 实际微信展示以真机为准</text>
`);
await sharp({ create: { width: 900, height: 980, channels: 4, background: "#eef0ef" } })
  .composite([
    { input: friendFrame },
    { input: await sharp(coverBytes).resize(596, 477).png().toBuffer(), left: 152, top: 232 },
  ])
  .png()
  .toFile(fileURLToPath(friendPreview));

const timelineFrame = svg(900, 1050, `
  <rect width="900" height="1050" fill="#f5f5f3"/>
  <text x="110" y="107" fill="#1c2527" font-family="PingFang SC, STHeiti, sans-serif" font-size="36" font-weight="600">马拉松与越野参赛指南｜RaceNext</text>
  <text x="110" y="960" fill="#6f7777" font-family="PingFang SC, STHeiti, sans-serif" font-size="20">朋友圈居中正方形裁切模拟预览 · 实际展示以真机为准</text>
`);
const square = await sharp(coverBytes).extract({ left: 75, top: 0, width: 600, height: 600 }).png().toBuffer();
await sharp({ create: { width: 900, height: 1050, channels: 4, background: "#f5f5f3" } })
  .composite([
    { input: timelineFrame },
    { input: await sharp(square).resize(680, 680).toBuffer(), left: 110, top: 170 },
  ])
  .png()
  .toFile(fileURLToPath(timelinePreview));

console.log(`Rendered RaceNext V2 share cover and previews from ${root}`);
