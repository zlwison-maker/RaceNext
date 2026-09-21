import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const projectRoot = join(import.meta.dirname, "..");
const graphPath = join(projectRoot, "data/canonical/race-graph-v1.json");
const graph = JSON.parse(readFileSync(graphPath, "utf8"));
const checkOnly = process.argv.includes("--check");

const outputs = [];

for (const record of graph.records) {
  const coverImage = record.edition?.coverImage;
  if (typeof coverImage !== "string" || !coverImage.startsWith("/races/")) continue;

  const sourcePath = join(projectRoot, "public", coverImage);
  const outputPath = join(dirname(sourcePath), "share-cover-5x4.jpg");
  const output = await sharp(sourcePath)
    .rotate()
    .resize(750, 600, { fit: "cover", position: "centre" })
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
  if (metadata.format !== "jpeg" || metadata.width !== 750 || metadata.height !== 600) {
    throw new Error(`Invalid share derivative: ${outputPath}`);
  }

  outputs.push({
    editionId: record.edition.editionId,
    outputPath,
    sha256: createHash("sha256").update(output).digest("hex"),
  });
}

if (outputs.length !== graph.records.length) {
  throw new Error(`Expected ${graph.records.length} share derivatives, generated ${outputs.length}`);
}

console.log(`${checkOnly ? "Verified" : "Generated"} ${outputs.length} centered 5:4 share derivatives.`);
