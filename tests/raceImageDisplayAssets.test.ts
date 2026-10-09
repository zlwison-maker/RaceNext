import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { equal, match, ok } from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import { FIRST5_EVENT_BASE_DATA } from "../data/events/first5-events.ts";
import {
  createPublicRaceDetailResult,
  createPublicRaceListResult,
} from "../lib/raceGraphPublic.ts";

type Asset = {
  assetId: string;
  editionId: string;
  role: "cover" | "hero";
  publicPath: string;
  originalPublicPath: string;
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  sha256: string;
  original: {
    fileSizeBytes: number;
    sha256: string;
  };
  derived: null | {
    publicPath: string;
    width: number;
    height: number;
    format: string;
    fileSizeBytes: number;
    sha256: string;
    derivation: string;
  };
};

type CanonicalRecord = {
  event: { eventId: string };
  edition: {
    editionId: string;
    coverImage: string;
    heroImage: string;
  };
};

type Canonical = {
  records: CanonicalRecord[];
};

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const canonical = JSON.parse(readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as Canonical;
const registry = JSON.parse(readFileSync(new URL("../data/assets/race-image-assets-v1.json", import.meta.url), "utf8")) as {
  assets: Asset[];
};

const expectedDisplayAssets = new Set([
  "beijing-marathon-2026|cover",
  "xiamen-marathon-2027|cover",
  "hk100-2027|cover",
  "kailas-gongga-100-2026|cover",
  "chengdu-marathon-2026|cover",
  "tsaigu-kuocang-2026|cover",
  "guangzhou-marathon-2026|cover",
  "shenzhen-100-2026|cover",
  "chongqing-marathon-2027|cover",
  "shanghai-marathon-2026|hero",
  "beijing-marathon-2026|hero",
  "xiamen-marathon-2027|hero",
  "hk100-2027|hero",
  "chengdu-marathon-2026|hero",
  "tsaigu-kuocang-2026|hero",
  "guangzhou-marathon-2026|hero",
  "shenzhen-100-2026|hero",
]);

function publicFile(publicPath: string): URL {
  return new URL(`../public${publicPath}`, import.meta.url);
}

function fileSha256(file: URL): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

test("Display Asset V1 files match the registry and preserve every Original Asset", async () => {
  equal(registry.assets.length, 24);
  equal(registry.assets.filter(({ publicPath }) => publicPath.includes("-display-v1.")).length, 17);

  for (const asset of registry.assets) {
    const key = `${asset.editionId}|${asset.role}`;
    const selectedFile = publicFile(asset.publicPath);
    const originalFile = publicFile(asset.originalPublicPath);

    ok(existsSync(selectedFile), `Missing selected asset ${asset.publicPath}`);
    equal(statSync(selectedFile).size, asset.fileSizeBytes);
    equal(fileSha256(selectedFile), asset.sha256);
    ok(existsSync(originalFile), `Missing Original Asset ${asset.originalPublicPath}`);
    equal(statSync(originalFile).size, asset.original.fileSizeBytes);
    equal(fileSha256(originalFile), asset.original.sha256);

    const metadata = await sharp(fileURLToPath(selectedFile)).metadata();
    equal(metadata.width, asset.width);
    equal(metadata.height, asset.height);
    equal(metadata.format, asset.format);

    if (!expectedDisplayAssets.has(key)) continue;
    match(asset.publicPath, new RegExp(`/${asset.role}-display-v1\\.jpg$`));
    equal(asset.format, "jpeg");
    equal(asset.derived?.publicPath, asset.publicPath);
    equal(asset.derived?.width, asset.width);
    equal(asset.derived?.height, asset.height);
    equal(asset.derived?.fileSizeBytes, asset.fileSizeBytes);
    equal(asset.derived?.sha256, asset.sha256);
    match(asset.derived?.derivation ?? "", /resize=max_width_\d+_without_enlargement/);
    match(asset.derived?.derivation ?? "", /encode=jpeg_quality_(84|86|88)_mozjpeg_progressive_4:4:4/);
    ok(asset.originalPublicPath !== asset.publicPath);
    ok(asset.width <= (asset.role === "cover" ? 1600 : 2400));
  }
});

test("Canonical and Public DTOs expose all 12 selected Display Asset paths", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status !== 200) return;
  equal(list.body.races.length, 12);

  for (const record of canonical.records) {
    const { edition } = record;
    const assets = registry.assets.filter(({ editionId }) => editionId === edition.editionId);
    const cover = assets.find(({ role }) => role === "cover");
    const hero = assets.find(({ role }) => role === "hero");
    equal(cover?.publicPath, edition.coverImage);
    equal(hero?.publicPath, edition.heroImage);
    match(edition.coverImage, /^\/races\/.+\.(?:jpe?g|png|webp)$/);
    match(edition.heroImage, /^\/races\/.+\.(?:jpe?g|png|webp)$/);

    const listItem: { editionId: string; coverImage: string | null; heroImage: string | null } | undefined =
      list.body.races.find(({ editionId }) => editionId === edition.editionId);
    equal(listItem?.coverImage, edition.coverImage);
    equal(listItem?.heroImage, edition.heroImage);
    const detail = createPublicRaceDetailResult(canonical, edition.editionId);
    equal(detail.status, 200);
    if (detail.status === 200) {
      equal(detail.body.race.coverImage, edition.coverImage);
      equal(detail.body.race.heroImage, edition.heroImage);
    }
  }
});

test("Web First5 uses the same Cover and Hero asset paths as Canonical", () => {
  for (const event of FIRST5_EVENT_BASE_DATA) {
    const editionId = `${event.eventId}-${event.eventYear}`;
    const canonicalRecord = canonical.records.find(({ edition }) => edition.editionId === editionId);
    ok(canonicalRecord, `Missing Canonical First5 Edition ${editionId}`);
    equal(event.coverImage, canonicalRecord.edition.coverImage);
    equal(event.heroImage, canonicalRecord.edition.heroImage);
  }
});

test("selected 12-race Cover and Hero assets remain below one MiB each", () => {
  for (const asset of registry.assets) {
    ok(asset.fileSizeBytes < 1024 * 1024, `${asset.assetId ?? `${asset.editionId}-${asset.role}`} exceeds one MiB`);
  }
});
