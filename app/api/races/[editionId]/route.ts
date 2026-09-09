import { NextResponse } from "next/server";

import { loadPublicRaceDetailResult } from "../../../../lib/raceGraphPublicServer";

export const revalidate = 300;

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
} as const;

type Context = {
  params: Promise<{ editionId: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { editionId } = await params;
  const result = await loadPublicRaceDetailResult(editionId);
  return NextResponse.json(result.body, { status: result.status, headers: PUBLIC_HEADERS });
}
