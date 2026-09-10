# RaceNext First5 Image Asset Delivery Report

**Date:** 2026-09-10
**Status:** Complete for current MVP

## Canonical First5

| Edition | Cover Image | Hero Image | Date status |
| --- | --- | --- | --- |
| `shanghai-marathon-2026` | `/races/shanghai-marathon/2026/cover-original.jpg` | `/races/shanghai-marathon/2026/hero-original.png` | Official fact retained |
| `beijing-marathon-2026` | `/races/beijing-marathon/2026/cover-homepage-16x9.png` | `/races/beijing-marathon/2026/hero-original.webp` | 2026-10-18; AIMS + World Athletics |
| `xiamen-marathon-2027` | `/races/xiamen-marathon/2027/cover-hero-original.png` | `/races/xiamen-marathon/2027/cover-hero-original.png` | 2027-01-10; AIMS + reviewed cross-check |
| `hk100-2027` | `/races/hk100/2027/cover-homepage-16x9.jpg` | `/races/hk100/2027/hero-original.png` | Event window 2027-01-21–24; HK100 100K on 2027-01-23 |
| `kailas-gongga-100-2026` | `/races/kailas-gongga-100/2026/cover-original.png` | `/races/kailas-gongga-100/2026/hero-original.jpeg` | Official fact retained |

All images were supplied and human-selected by the project owner. No network replacement, AI generation, AI upscaling, or mechanical upscaling was used. Usage rights remain `requires_confirmation` until documentary permission is retained.

## Original Asset Quality Check

| Edition / role | Original file | Dimensions | Ratio | Format | Size | Image year | Quality status |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| Shanghai / cover | 上马 cover.jpg | 1024x683 | 1.4993 | JPEG | 181,018 B | unknown | `needs_higher_resolution` |
| Shanghai / hero | 上马 hero.png | 4000x692 | 5.7803 | PNG | 2,998,207 B | 2026, visible in artwork | `approved` |
| Beijing / cover | 北马 cover.png | 1080x721 | 1.4979 | PNG | 983,370 B | unknown | `needs_higher_resolution` |
| Beijing / hero | 北马 hero.webp | 5472x3252 | 1.6827 | WebP | 738,902 B | unknown | `approved` |
| Xiamen / cover + hero | 夏马 hero&cover.png | 2000x1333 | 1.5004 | PNG | 3,636,928 B | unknown | `approved` |
| HK100 / cover | hk 100 cover.jpg | 3000x2000 | 1.5000 | JPEG | 6,362,553 B | unknown | `approved` |
| HK100 / hero | hk100 hero.png | 1200x800 | 1.5000 | PNG | 1,562,597 B | 2023, visible in medal artwork | `needs_higher_resolution` |
| Gongga 100 / cover | 贡嘎 100 cover.jpg | 1080x608 | 1.7763 | PNG data | 1,359,001 B | unknown | `needs_higher_resolution` |
| Gongga 100 / hero | 贡嘎 100 hero.jpeg | 851x351 | 2.4245 | JPEG | 215,734 B | unknown | `needs_higher_resolution` |

HK100 asset binding moved from Edition 2026 to Edition 2027 without changing image bytes. The hero's `imageYear` remains 2023 because that metadata describes the year visible in the supplied artwork, not the Canonical Edition year.

The supplied Gongga cover used a `.jpg` filename but contains PNG data. The production original therefore uses the truthful `.png` extension while preserving the supplied bytes exactly.

## Cover Crop Review

[Open the First5 16:9 crop review](preview/FIRST5_COVER_CROP_REVIEW.png).

- Beijing: center `aspectFill` removed most of the official bottom-right event mark. A bottom-anchored 1080x608 crop was created from the preserved original.
- HK100: center `aspectFill` threatened the official bottom-right event mark. A bottom-anchored 3000x1688 crop was created from the preserved original.
- Shanghai, Xiamen, and Gongga: the originals remain the selected Cover assets; current centered `aspectFill` keeps the essential race subject and location identity.
- No image was stretched. The two derived covers use crop-only transforms.

## Source Registry

The following active `primary_official` sources were registered at Edition level:

- Shanghai: `https://static.shang-ma.com/web/index.html`
- Beijing: `https://www.beijing-marathon.com/`
- Xiamen: `https://www.xmim.org/`
- HK100: `https://hk100ultra.com/zh-hant/`
- Gongga 100: `https://moganshan.saihuitong.com/`

Each registry note requires target event identity and edition year validation. An official domain is not treated as proof that its current page describes the target Edition.

## Public and Client Result

- Canonical contains five First5 records.
- Public list returns five records and exposes both `coverImage` and `heroImage`.
- Beijing 2026 and Xiamen 2027 now expose their evidence-backed dates. HK100 is bound to the active 2027 Edition while retaining the same approved image bytes.
- Mini Program Home still calls `getRaces()` and maps the returned Cover Image. Relative public asset paths are resolved against the configured API origin.
- Header and card structure were not expanded; no detail page work was added.

## Visual Review

In WeChat Developer Tools, review these points at actual device widths:

1. Beijing and HK100 official marks remain inside the 16:9 card crop.
2. Shanghai and Xiamen lower runner groups remain legible under the bottom scrim and copy.
3. Gongga's runner and snow peak remain balanced after `aspectFill`.
4. Long Gongga event naming stays within the existing two-line clamp.
5. Remote static image URLs resolve from the production API host and do not fall back to the placeholder.

No production deployment was performed. A deployment is required before `https://racenext.run/api/races` and the new `/races/...` assets change in production.

## Verification

- Web TypeScript: PASS
- Mini Program TypeScript: PASS
- Tests: PASS, 110/110
- Production build: PASS, 118 static pages generated
- `git diff --check`: PASS

The first build attempt was blocked by the restricted environment when Turbopack tried to bind a local port for its CSS worker. The same production build passed after running with the required local build permission. The remaining `metadataBase` message is an existing Next.js warning and is unrelated to the First5 image work.
