# RaceNext Image Display Assets V1 — Human Review

Status: **HUMAN VISUAL REVIEW PASS**
Baseline: `bde8ea9ca1a111a5985fce8c0424abf944bf95b7`
Branch: `work/race-image-display-optimization-v1`
Generated: 2026-10-09

## Scope

This batch adds static display derivatives only. Original assets remain present and recorded. No Mini Program, Web UI, API, schema, Nginx, PM2, or deployment code is changed.

Nine existing centered 5:4 Mini Program share derivatives were deterministically regenerated from their updated Cover inputs so the established share-image check remains current; the generator and client behavior are unchanged.

Encoding: progressive JPEG via Sharp/mozjpeg, 4:4:4 chroma, aspect ratio preserved, without enlargement. Cover uses max width 1600 px; Hero uses max width 2400 px, except Guangzhou Hero at 1920 px after quality/size review. Existing approved Cover crops remain the derivative source where applicable.

## Size result

| Role | Before | After | Reduction |
|---|---:|---:|---:|
| Cover (12) | 21.492 MiB | 3.470 MiB | −83.9% |
| Hero (12) | 23.534 MiB | 5.248 MiB | −77.7% |
| Combined role payload | 45.025 MiB | 8.718 MiB | −80.6% |
| Unique active URLs | 19 / 30.535 MiB | 24 / 8.718 MiB | −71.4% bytes |

The role-specific derivatives increase active URL count where Cover and Hero previously reused one URL, while reducing the unique URL byte total. All 24 active Cover/Hero references are below 1 MiB after this batch; the largest is 683.4 KiB. Target ranges are quality guidance rather than destructive hard limits.

## 12-race optimization summary

Values are active resource KiB before → after. “Display” means a new role-specific derivative; “kept” means the current active asset remains unchanged.

| Edition | Cover KiB | Hero KiB |
|---|---:|---:|
| shanghai-marathon-2026 | 176.8 → 176.8 kept | 2927.9 → 234.6 Display |
| beijing-marathon-2026 | 1136.1 → 196.5 Display | 721.6 → 584.3 Display |
| xiamen-marathon-2027 | 3551.7 → 373.7 Display | 3551.7 → 566.0 Display |
| hk100-2027 | 1828.7 → 428.5 Display | 1526.0 → 240.7 Display |
| kailas-gongga-100-2026 | 1327.1 → 195.7 Display | 210.7 → 210.7 kept |
| xian-marathon-2026 | 402.3 → 402.3 kept | 432.3 → 432.3 kept |
| guangzhou-marathon-2026 | 1995.4 → 169.1 Display | 3195.2 → 600.8 Display |
| ninghai-ultra-trail-2026 | 303.0 → 303.0 kept | 246.7 → 246.7 kept |
| chengdu-marathon-2026 | 3906.3 → 420.1 Display | 3906.3 → 594.8 Display |
| tsaigu-kuocang-2026 | 4657.7 → 429.8 Display | 4657.7 → 641.3 Display |
| chongqing-marathon-2027 | 683.4 → 120.3 Display | 683.4 → 683.4 kept |
| shenzhen-100-2026 | 2038.9 → 337.9 Display | 2038.9 → 337.9 Display |

## New display derivatives

| Edition | Role | Before | Display derivative | Before KiB | After KiB | Reduction | Active path |
|---|---|---|---|---:|---:|---:|---|
| shanghai-marathon-2026 | hero | 4000×692 PNG | 2400×415 JPEG q88 | 2927.9 | 234.6 | −92.0% | `/races/shanghai-marathon/2026/hero-display-v1.jpg` |
| beijing-marathon-2026 | cover | 1080×608 PNG | 1080×608 JPEG q88 | 1136.1 | 196.5 | −82.7% | `/races/beijing-marathon/2026/cover-display-v1.jpg` |
| beijing-marathon-2026 | hero | 5472×3252 WEBP | 2400×1426 JPEG q86 | 721.6 | 584.3 | −19.0% | `/races/beijing-marathon/2026/hero-display-v1.jpg` |
| xiamen-marathon-2027 | cover | 2000×1333 PNG | 1600×1066 JPEG q86 | 3551.7 | 373.7 | −89.5% | `/races/xiamen-marathon/2027/cover-display-v1.jpg` |
| xiamen-marathon-2027 | hero | 2000×1333 PNG | 2000×1333 JPEG q86 | 3551.7 | 566.0 | −84.1% | `/races/xiamen-marathon/2027/hero-display-v1.jpg` |
| hk100-2027 | cover | 3000×1688 JPEG | 1600×900 JPEG q86 | 1828.7 | 428.5 | −76.6% | `/races/hk100/2027/cover-display-v1.jpg` |
| hk100-2027 | hero | 1200×800 PNG | 1200×800 JPEG q88 | 1526.0 | 240.7 | −84.2% | `/races/hk100/2027/hero-display-v1.jpg` |
| kailas-gongga-100-2026 | cover | 1080×608 PNG | 1080×608 JPEG q88 | 1327.1 | 195.7 | −85.3% | `/races/kailas-gongga-100/2026/cover-display-v1.jpg` |
| guangzhou-marathon-2026 | cover | 5670×1980 JPEG | 1600×559 JPEG q88 | 1995.4 | 169.1 | −91.5% | `/races/guangzhou-marathon/2026/cover-display-v1.jpg` |
| guangzhou-marathon-2026 | hero | 5000×3333 JPEG | 1920×1280 JPEG q84 | 3195.2 | 600.8 | −81.2% | `/races/guangzhou-marathon/2026/hero-display-v1.jpg` |
| chengdu-marathon-2026 | cover | 2016×1414 PNG | 1600×1122 JPEG q86 | 3906.3 | 420.1 | −89.2% | `/races/chengdu-marathon/2026/cover-display-v1.jpg` |
| chengdu-marathon-2026 | hero | 2016×1414 PNG | 2016×1414 JPEG q86 | 3906.3 | 594.8 | −84.8% | `/races/chengdu-marathon/2026/hero-display-v1.jpg` |
| tsaigu-kuocang-2026 | cover | 2700×1214 PNG | 1600×719 JPEG q88 | 4657.7 | 429.8 | −90.8% | `/races/tsaigu-kuocang/2026/cover-display-v1.jpg` |
| tsaigu-kuocang-2026 | hero | 2700×1214 PNG | 2400×1079 JPEG q84 | 4657.7 | 641.3 | −86.2% | `/races/tsaigu-kuocang/2026/hero-display-v1.jpg` |
| chongqing-marathon-2027 | cover | 1886×1024 PNG | 1600×869 JPEG q88 | 683.4 | 120.3 | −82.4% | `/races/chongqing-marathon/2027/cover-display-v1.jpg` |
| shenzhen-100-2026 | cover | 1400×934 PNG | 1400×934 JPEG q88 | 2038.9 | 337.9 | −83.4% | `/races/shenzhen-100/2026/cover-display-v1.jpg` |
| shenzhen-100-2026 | hero | 1400×934 PNG | 1400×934 JPEG q88 | 2038.9 | 337.9 | −83.4% | `/races/shenzhen-100/2026/hero-display-v1.jpg` |

## Active assets retained unchanged

No derivative was introduced where the active file was already acceptably light or a change did not offer a clear quality/performance benefit. Xi’an PNGs retain alpha.

| Edition | Role | Active file | KiB | Active path |
|---|---|---|---:|---|
| shanghai-marathon-2026 | cover | 1024×683 JPEG | 176.8 | `/races/shanghai-marathon/2026/cover-original.jpg` |
| kailas-gongga-100-2026 | hero | 851×351 JPEG | 210.7 | `/races/kailas-gongga-100/2026/hero-original.jpeg` |
| xian-marathon-2026 | cover | 1700×700 PNG | 402.3 | `/races/xian-marathon/2026/cover-original.png` |
| xian-marathon-2026 | hero | 648×431 PNG | 432.3 | `/races/xian-marathon/2026/hero-original.png` |
| ninghai-ultra-trail-2026 | cover | 3000×2001 JPEG | 303.0 | `/races/ninghai-ultra-trail/2026/cover-original.jpg` |
| ninghai-ultra-trail-2026 | hero | 1280×853 JPEG | 246.7 | `/races/ninghai-ultra-trail/2026/hero-original.jpeg` |
| chongqing-marathon-2027 | hero | 1886×1024 PNG | 683.4 | `/races/chongqing-marathon/2027/cover-hero-original.png` |

## Human visual review

The user reviewed the full Original → Display comparisons, Mini Program Cover/Hero previews, Web Cover preview, and high-risk details. Visual Review: **PASS**; no further image regeneration or adjustment was requested. The preview composites remain local review material and are excluded from the Git PR.

The review covered the approved event photograph and role, existing Cover crops, Shanghai Hero's right-side focal area, text and event marks, runners, landscape, sky gradients, and rendering at Mini Program and Web display ratios. Xi’an transparent PNG assets remain unchanged. Shenzhen retains its AVIF Original while the active Display Asset uses compatible JPEG.
