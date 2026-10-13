# RaceNext home share V2 source

- `scene-trail-generated.png` is the Human-approved AI-generated, fictional trail-race scene. It shows an unbranded competition setting, not any real named race, and uses no external race asset from the repository.
- The NEXT mark comes unchanged from `miniprogram/assets/brand/next-logo-mini-header-black.png`.
- `render.mjs` places the approved Chinese copy and official mark over that scene, then creates `public/share/racenext-home-v2-5x4.jpg` and both review previews. The cover centers “赛事信息 · 参赛建议 · 住宿指南” above the lower edge; the mark and “你的下一场参赛指南” form the smaller brand group. The original logo alpha and proportions are preserved while its black pixels are rendered white for contrast, without a backing plate. It uses the repository's existing Sharp installation.
- No source photo with unconfirmed RaceNext promotional rights was used. The generated scene should not be described as documentation of an actual event.

Current background generation prompt: a photorealistic editorial image of a fictional trail-running race in progress, with a lead runner on a rugged mountain path, other competitors with generic unreadable bibs and hydration vests, subtle course ribbons and distant volunteers, mountain depth, quieter upper-left for brand, no named race, sponsor mark, readable text, logo, medal or watermark.

Run `node design/share/home-v2/render.mjs` from the repository root to regenerate the JPEG and previews. Human visual review passed; the JPEG still needs production deployment before real WeChat share QA.
