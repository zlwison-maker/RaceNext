# RaceNext Detail Page System V1

Version: 1.0  
Status: Active detail page implementation standard  
Visual baseline: current approved `2027厦门马拉松` page  
Route: `/races/[slug]`

---

## 1. Purpose

RaceNext Detail Page System V1 turns the approved Xiamen Marathon detail page into the reusable standard for future race pages.

The system exists so a new race can be added through verified race facts, race-specific editorial content, accommodation recommendations, recommendation data, and SEO metadata without copying or redesigning a React page.

This document is the implementation authority for Detail Page System V1. The current Xiamen page is the only visual baseline. Older MVP and Decision Page documents remain historical product context; they must not be used to override the four-module structure or visual values recorded here.

This system is:

- A reusable event detail page.
- A runner decision path.
- A typed editorial content model.
- A restrained commercial path into accommodation.

It is not:

- A new redesign.
- A CMS or database project.
- A SaaS dashboard.
- A reason to migrate every existing race at once.

## 2. Page Architecture

Every V1 page uses four top-level modules in this order:

```text
01 HERO
Hero + Race Meta

02 RACE GUIDE
Race-specific editorial judgment

03 ACCOMMODATION
Accommodation decision support

04 NEXT
Race discovery and internal links
```

No module may be inserted into this path by default. A missing or unverified field is hidden rather than replaced with invented content.

## 3. User Journey

The fixed user journey is:

```text
认识比赛
↓
判断比赛
↓
解决住宿
↓
发现下一场
```

Every content or design change must support this sequence. Features that interrupt it require a separate product decision.

## 4. Module Structure

### 4.1 Hero + Race Meta

Hero carries the page H1 and lets the runner confirm:

- Race name.
- Race date.
- Location.
- Category and distance.
- Registration status.

Hero has no extra module heading. It remains image-led and full width.

### 4.2 Race Guide

Race Guide is RaceNext's primary differentiated content. It has four internal sections:

1. `impression`: Opening / race impression.
2. `viewpoint`: explicit RaceNext editorial judgment.
3. `evidence`: normally three core experiences supporting the judgment.
4. `suitability`: normally three runner-fit judgments.

It may end with one `transition` sentence that moves the reader toward accommodation. The transition is not another subsection.

### 4.3 Accommodation

Accommodation follows demonstrated race interest and supports the next practical decision. V1 displays three decision types:

- Distance priority.
- Transportation priority.
- Overall value priority.

It recommends areas, not individual hotels, prices, ratings, or inventory.

### 4.4 Next

Next closes the page with existing race cards. It supports:

- Internal linking.
- Continued race discovery.
- Search-engine understanding of relationships between race pages.

Recommendation algorithms and race data remain outside the presentation system.

## 5. Module Heading Standard

Race Guide, Accommodation, and Next use the same heading grammar:

```text
EYEBROW
MODULE TITLE
CONTENT
```

The implementation is `DetailSection` for standard modules and the same tokens inside `RaceGuide`.

| Element | Current V1 value |
| --- | --- |
| Eyebrow | 12px, 500, uppercase, `0.18em`, `#888888` |
| Eyebrow to title | 12px |
| Module title mobile | 28px, 600, line-height 1.3, letter-spacing 0, `#1A1A1A` |
| Module title desktop | 32px, 600, line-height 1.3, letter-spacing 0, `#1A1A1A` |
| Module title to content | 24px |

Do not create a second module heading style for a specific race.

## 6. Typography

The page has four primary levels. Eyebrows and race-meta labels are supporting styles, not additional headline levels.

### Level 1: Hero H1

| Viewport | Size | Weight | Line-height | Letter-spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile | 36px | 700 | 1.04 | 0 | White |
| `sm` | 48px | 700 | 1.04 | 0 | White |
| `lg` | 60px | 700 | 1.04 | 0 | White |

### Level 2: Module Title

| Viewport | Size | Weight | Line-height | Letter-spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile | 28px | 600 | 1.3 | 0 | `#1A1A1A` |
| Desktop | 32px | 600 | 1.3 | 0 | `#1A1A1A` |

### Level 3: Subsection Title

| Viewport | Size | Weight | Line-height | Letter-spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile | 19px | 500 | 1.4 | 0 | `#1A1A1A` |
| Desktop | 21px | 500 | 1.4 | 0 | `#1A1A1A` |

### Level 4: Item Title and Body

Item title:

| Viewport | Size | Weight | Line-height | Letter-spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile | 17px | 500 | 1.4 | 0 | `#1A1A1A` |
| Desktop | 18px | 500 | 1.4 | 0 | `#1A1A1A` |

Body:

| Viewport | Size | Weight | Line-height | Letter-spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile | 15px | 300 | 1.66 | 0 | `#4F4F4F` |
| Desktop | 16px | 300 | 1.66 | 0 | `#4F4F4F` |

Body emphasis uses weight 400 and `#1A1A1A`. The closing sentence uses the Body size, weight 500, and `#1A1A1A`.

### Supporting Styles

- Race-meta values: 14px mobile / 16px desktop, weight 300.
- Race-meta labels: weight 400, white at 55% opacity.
- Registration status value: weight 400, existing orange `#F1773D`.
- Experience numbers: Item Title size, weight 400, `#9D9386`.

Weight principle:

```text
Regular/light carries reading
Medium establishes hierarchy
Semibold is reserved for primary module and card titles
Bold is reserved for the Hero H1 in V1
```

## 7. Spacing

All values below are extracted from the approved implementation.

| Relationship | Mobile | Desktop |
| --- | ---: | ---: |
| Hero to content start | 64px | 96px |
| Top-level module gap | 48px | 80px |
| Module eyebrow to title | 12px | 12px |
| Module title to content | 24px | 24px |
| Race Guide subsection to subsection | 56px | 60px |
| Viewpoint title to body | 20px | 24px |
| Evidence title to first item | 24px | 24px |
| Fit title to introduction | 20px | 24px |
| Fit introduction to first item | 32px | 32px |
| Evidence item title to body | 14px | 14px |
| Fit item title to body | 12px | 12px |
| Item to item | 40px | 40px |
| Paragraph to paragraph | 16px | 16px |
| Last fit item to closing | 40px | 40px |
| Closing to Accommodation content | 64px | 96px |

Hierarchy comes from space, size, and weight. Do not add routine dividers, panels, or background blocks to recreate it.

## 8. Width and Layout

The page uses one left alignment system but two content widths:

- Hero: full viewport width; inner content uses `max-w-6xl`.
- Main content container: `max-w-6xl`, with 16px horizontal padding on mobile and 24px from `sm` upward.
- Race Guide reading column: `max-width: 800px`.
- Accommodation and Next: full main-content width.

The intended rhythm is:

```text
Full-width visual
↓
Medium-width reading
↓
Wide accommodation decision
↓
Wide race discovery
```

Do not make Race Guide as wide as Accommodation or Next. Alignment is established by the shared left edge, not by forcing every right edge to match.

## 9. Race Guide Content Model

Types live in `types/raceDetail.ts`. The renderer lives in `components/race-detail/RaceGuide.tsx`.

```ts
type RaceEditorialContent = {
  impression: {
    eyebrow: string;
    title: string;
    paragraphs: RaceEditorialParagraph[];
  };
  viewpoint: {
    title: string;
    paragraphs: RaceEditorialParagraph[];
  };
  evidence: {
    title: string;
    sections: RaceGuideExperience[];
  };
  suitability: {
    title: string;
    introduction: string;
    items: RaceGuideFitItem[];
  };
  transition: string;
};
```

Race-specific content lives under `data/race-guides/`. `data/race-guides/index.ts` is the event-ID registry. The presence of registered editorial content enables Detail Page System V1 for that race and suppresses the legacy/default FAQ.

The approved baseline is:

```text
data/race-guides/xiamen-marathon.ts
```

Do not place race prose in the renderer and do not create a race-specific React page.

### Chinese Editorial Rules

- Use natural Chinese wrapping.
- Never insert `<br />` to control body copy.
- Do not use `text-wrap: balance` on body text.
- Organize complete meanings into natural paragraphs.
- Avoid one-sentence paragraph chains.
- Do not apply narrower widths to individual paragraphs.
- Use emphasis sparingly and without introducing a larger type size.

## 10. Accommodation Standard

V1 uses three cards in one desktop row and a natural mobile stack.

Card values:

- Grid gap: 12px.
- Desktop columns: three equal columns at `lg`.
- Minimum card height: 235px.
- Card padding: 24px.
- Background: white.
- Border: 1px `#DDD8CF`.
- Border radius: 8px.
- Shadow: none.
- Hover border: `#A9A195`.
- Internal layout: flex column.
- CTA wrapper: `margin-top: auto`, with 20px top padding.

Card typography:

- Label: 11px, 500, uppercase, `0.18em`, `#9D9386`.
- Title: 20px, 600, line-height 1.3.
- Description: 15px, 300, 24px line-height, `#666666`.
- Advantage: 15px, 400, 24px line-height, `#1A1A1A`.

CTA values:

- Brand green: `#435044`.
- Hover: `#354037`.
- Text: white, 14px, 500.
- Minimum height: 40px.
- Horizontal padding: 20px.
- Vertical padding: 10px.
- Radius: full semicircle/pill.
- Width: content width, never full-card width.
- Motion: color transition only.

All three CTA elements must use the same class and remain bottom-aligned. Do not change `accommodation_view`, `hotel_click`, affiliate URLs, or redirect behavior inside visual work.

## 11. Next Standard

Next uses the same module heading and card frame as Accommodation, without changing the current recommendation algorithm.

Card layout:

- Mobile: image above content; image height 160px.
- Desktop from `sm`: 240px image column plus flexible content column.
- Desktop image minimum height: 190px.
- Content padding: 20px mobile / 24px desktop.
- Card border, radius, background, and hover use the shared V1 card frame.
- Content becomes a flexible text column plus a 150px CTA column on desktop.

Typography:

- Race title: 20px, 600, line-height 1.3.
- Meta values: 15px, 300, 24px line-height.
- Meta labels: 15px, 400.
- CTA: 14px, 500, existing outlined green pill.

Recommendation links must resolve to real `/races/[slug]` pages. Do not hard-code unavailable races into the renderer.

## 12. Mobile Rules

Mobile keeps the same content and order as desktop:

- One column from top to bottom.
- One shared left edge.
- Race Guide uses all available width inside the 16px page padding.
- Accommodation cards stack vertically.
- Accommodation CTA stays content-width and at least 40px high.
- Next image moves above the content.
- No alternate copy or data logic is introduced for mobile.
- No horizontal scrolling is allowed.

## 13. Content Truth Rules

All content belongs to one of three layers.

### 13.1 Official / Event Facts

Dates, locations, routes, categories, registration rules, start/finish points, and official event information may only use confirmed public or official data.

Never infer missing facts. Hide or mark an unconfirmed field using the established product language.

### 13.2 Real Media / Runner Feedback

Media reports, race reports, community discussion, participant feedback, and repeated multi-source experience patterns may be summarized, reorganized, paraphrased, and edited for clarity.

Never invent runner experience, media opinion, consensus, or a race characteristic for SEO.

### 13.3 RaceNext Judgment

RaceNext may judge whether a race is worth considering, who it suits, what its real challenge may be, and what deserves preparation. The copy must clearly identify this as RaceNext editorial judgment, not an official fact or direct runner quotation.

The hard rule is:

> 事实写事实，评价写评价，RaceNext 判断明确写成判断。

If evidence is insufficient, omit the claim instead of guessing.

## 14. SEO Principles

Race Guide serves runner decision value first and SEO second.

Do:

- Write unique, useful race-specific content.
- Answer real decision questions.
- Keep metadata natural and specific.
- Preserve verified SportsEvent and Breadcrumb structured data.
- Use real internal links in Next.

Do not:

- Stuff keywords.
- Repeat the race name mechanically.
- Expand copy only to increase word count.
- Add low-value FAQ content.
- Fabricate facts or runner feedback.

Detail Page System V1 does not include FAQ by default. Add FAQ only after a separate review proves that it provides high-value information not already answered by Hero or Race Guide. Never add FAQ only for FAQPage schema.

## 15. Analytics Requirements

The following event contract is protected:

| User action | Event | Required payload |
| --- | --- | --- |
| Detail page rendered | `race_detail_view` | `race_slug`, `race_name` |
| Accommodation category first becomes visible | `accommodation_view` | `race_slug`, `category` |
| Accommodation CTA clicked | `hotel_click` | `race_slug`, `category`, `hotel_name`, `hotel_url` |

The V1 renderer must preserve:

- GA4 delivery through `trackEvent`.
- Baidu event delivery through `trackEvent`.
- IntersectionObserver behavior and one-view-per-category protection.
- Existing affiliate destination and redirect parameters.

Never rename events or payload keys during styling or content work.

## 16. How to Add a New Race

1. Collect official race facts and record their sources.
2. Collect real media coverage and runner feedback; look for repeated, supportable patterns.
3. Define the race personality and the three most useful core experiences.
4. Write an explicit RaceNext judgment based on the first two evidence layers.
5. Create `data/race-guides/<slug>.ts` using `RaceEditorialContent`, covering Opening, RaceNext Judgment, Core Experiences, Runner Fit, and one closing sentence.
6. Register the configuration in `data/race-guides/index.ts`. Registration enables V1 rendering and disables the default FAQ.
7. Add or verify the three accommodation recommendations in the existing event data source. Keep all affiliate URLs and tracking fields valid.
8. Add the race to the existing recommendation dataset and verify that the current Next algorithm returns real `/races/[slug]` links. Do not create manual card links in the renderer.
9. Configure race-specific SEO metadata through the existing ViewModel path.
10. Audit every statement against Official Facts, Real Feedback, or RaceNext Judgment.
11. Verify `race_detail_view`, `accommodation_view`, and `hotel_click` without changing their payloads.
12. Run `npm run build`.
13. Review Desktop and Mobile for hierarchy, natural wrapping, CTA alignment, and zero horizontal overflow.

Adding a race should require content and data configuration, not a copied page component.

## 17. Do / Don't

### Do

- Use verified content.
- Keep a single reading column.
- Write natural Chinese paragraphs.
- Preserve clear hierarchy.
- Use restrained typography.
- Keep race content in typed configuration.
- Prioritize runner decision value.
- Reuse `RaceGuide`, `DetailSection`, and `detailPageV1`.

### Don't

- Add large decorative numbers.
- Create left-right reading jumps.
- Build SaaS card stacks.
- Use heavy bold throughout the page.
- Add more headline levels.
- Make every sentence a paragraph.
- Force body line breaks.
- Add words only for SEO.
- Invent user feedback.
- Add FAQ by default.
- Copy the React page for each race.
- Change analytics or affiliate behavior while styling.

## 18. Implementation Map

| Concern | Path |
| --- | --- |
| Route, metadata, structured data | `app/races/[slug]/page.tsx` |
| Shared page composition, Hero, Accommodation, Next, analytics calls | `components/RaceDecisionPage.tsx` |
| Shared module heading | `components/race-detail/DetailSection.tsx` |
| Shared Race Guide renderer | `components/race-detail/RaceGuide.tsx` |
| Typography, spacing, width, card, and CTA class tokens | `components/race-detail/styles.ts` |
| Race Guide TypeScript model | `types/raceDetail.ts` |
| Race Guide registry | `data/race-guides/index.ts` |
| Xiamen baseline content | `data/race-guides/xiamen-marathon.ts` |
| Race ViewModel and data adaptation | `lib/raceDecision.ts` |
| Analytics transport | `lib/analytics.ts` |

## 19. Review Gate

Before a V1 race page is accepted:

- Hero facts are sourced and correct.
- Race Guide follows all four internal sections.
- Judgment is clearly attributed to RaceNext.
- Body copy wraps naturally without manual breaks.
- Race Guide remains at 800px maximum width.
- Accommodation contains three useful area decisions.
- All three accommodation CTAs align and track correctly.
- Next links resolve to real race pages.
- FAQ is absent unless separately approved.
- Metadata is unique and truthful.
- Desktop and Mobile match the V1 baseline.
- `npm run build` passes.

