import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { isEditionPublishable } from "../lib/raceGraphPublic.ts";

const projectRoot = join(import.meta.dirname, "..");
const graphPath = join(projectRoot, "data/canonical/race-graph-v1.json");
const graph = JSON.parse(readFileSync(graphPath, "utf8"));
const checkOnly = process.argv.includes("--check");

const outputs = [];
// Staged Editions have no public share route.
const publicRecords = graph.records.filter(isEditionPublishable);

for (const record of publicRecords) {
  const coverImage = record.edition?.coverImage;
  if (typeof coverImage !== "string" || !coverImage.startsWith("/races/")) continue;

  const sourcePath = join(projectRoot, "public", coverImage);
  const outputPath = join(dirname(sourcePath), "share-cover-5x4.jpg");
  const source = await sharp(sourcePath).metadata();
  if (!source.width || !source.height) throw new Error(`Missing cover dimensions: ${sourcePath}`);
  // Narrow supplied artwork keeps native pixels; existing wide-cover outputs stay unchanged.
  const units = source.width < 750 ? Math.floor(Math.min(source.width / 5, source.height / 4)) : 150;
  if (units < 1) throw new Error(`Cover too small for a 5:4 derivative: ${sourcePath}`);
  const width = units * 5, height = units * 4;
  const output = await sharp(sourcePath)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4", progressive: false, mozjpeg: false })
    .toBuffer();

  if (checkOnly) {
    if (!existsSync(outputPath) || !readFileSync(outputPath).equals(output)) {
      throw new Error(`Share derivative is missing or stale: ${outputPath}`);
    }
  } else if (!existsSync(outputPath) || !readFileSync(outputPath).equals(output)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, output);
  }

  const metadata = await sharp(output).metadata();
  if (metadata.format !== "jpeg" || metadata.width !== width || metadata.height !== height) {
    throw new Error(`Invalid share derivative: ${outputPath}`);
  }

  outputs.push({
    editionId: record.edition.editionId,
    outputPath,
    sha256: createHash("sha256").update(output).digest("hex"),
  });
}

if (outputs.length !== publicRecords.length) {
  throw new Error(`Expected ${publicRecords.length} public share derivatives, generated ${outputs.length}`);
}

console.log(`${checkOnly ? "Verified" : "Generated"} ${outputs.length} centered 5:4 share derivatives.`);
