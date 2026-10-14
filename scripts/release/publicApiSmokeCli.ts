import { readFile } from "node:fs/promises";
import { verifyPublicRelease } from "./canonicalRelease.ts";
const manifest = JSON.parse(
  await readFile("artifacts/release/canonical-release-manifest.json", "utf8"),
);
const count = await verifyPublicRelease(manifest, "https://racenext.run");
console.log(
  `PRODUCTION_PUBLIC_API_SMOKE=PASS ENDPOINTS=${count} EXPECTED_SHA=${manifest.commitSha}`,
);
