import { NextResponse } from "next/server";

import { loadPublicRaceListResult } from "../../../lib/raceGraphPublicServer";

export const revalidate = 300;

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
} as const;

export async function GET() {
  const result = await loadPublicRaceListResult();
  return NextResponse.json(result.body, { status: result.status, headers: PUBLIC_HEADERS });
}
