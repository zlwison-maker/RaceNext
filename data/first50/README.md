# RaceNext First50 Data Layer

This directory is the MVP data enhancement layer for RaceNext First50.

It does not replace existing source records, seed files, Event, Edition, Category, or legacy Race data.

## Goal

First50 exists to build a small but high-quality race decision data asset.

The goal is to support pages that can answer:

- Is this race worth running?
- Is it suitable for me?
- When should I register?
- What is the course like?
- How should I prepare?
- How can I finish the race safely?

## Directory Structure

```text
data/first50/
  README.md
  first50_candidates.json
  first50_races.json
  content/
    {raceId}.json
    {raceId}.md
```

## Files

### `first50_candidates.json`

Candidate scoring and selection status.

Use this for:

- Runner attention score.
- Search value score.
- Recent timing value score.
- Commercial value score.
- Data completeness score.
- Content difficulty score.
- Candidate review status.

Do not store final RaceNext decision content here.

### `first50_races.json`

Human-maintained enrichment facts.

Use this for:

- Official website verification.
- Official registration URL verification.
- Organizer.
- Registration open / close date.
- Course description.
- Course map URL.
- Mandatory gear.
- Qualification rules.
- Source notes.

These fields are enhanced facts and review notes. They should remain traceable.

### `content/{raceId}.json`

RaceNext-owned decision content.

Use this for:

- Primary category.
- One-line verdict.
- RaceNext advice.
- Recommended users.
- Not recommended users.
- AI participation guide.
- FAQ variations.
- Travel tips.

This content is not raw race data.

### `content/{raceId}.md`

Optional editorial notes for human reviewers.

Use this for:

- Source links.
- Manual reasoning.
- Review comments.
- Copy notes before converting to JSON.

## Content Status Flow

RaceNext Decision Content must follow:

```text
draft
↓
ai_generated
↓
human_reviewed
↓
published
```

Rules:

- `draft`: internal notes only.
- `ai_generated`: AI output, not safe for production.
- `human_reviewed`: checked by a human, can enter pre-publish review.
- `published`: allowed for production pages.

Unreviewed AI content must not be displayed on official pages.

## How To Add A Race

1. Add the race to `first50_candidates.json`.
2. Score it using `docs/data/FIRST50_SELECTION.md`.
3. If selected, add an enrichment record to `first50_races.json`.
4. Create optional content files under `content/`.
5. Keep raw source facts and RaceNext decision content separate.
6. Mark content `published` only after human review.

## Do Not Invent Data

Do not fabricate:

- Registration dates.
- Official websites.
- Official registration links.
- Distances.
- Elevation gain.
- Cutoff time.
- Course maps.
- GPX links.
- User reviews.
- Race scores or star ratings.

If a field is unknown, use `null`, omit it, or add a source note explaining the gap.

## MVP Boundary

This layer is intentionally simple:

- JSON / Markdown only.
- No CMS.
- No database migration.
- No automatic AI publishing.
- No page integration in Stage 1.

