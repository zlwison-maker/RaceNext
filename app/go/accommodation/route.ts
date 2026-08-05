import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FIRST5_RACENEXT_DECISION_DATA } from "@/data/events/first5-events";
import type { AccommodationPriorityType } from "@/data/events/first5-events";

const allowedAreaTypes = new Set<AccommodationPriorityType>(["distance", "transportation", "balance"]);
const allowedProviders = new Set(["ctrip"]);

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId") ?? "";
  const areaType = searchParams.get("areaType") ?? "";
  const provider = searchParams.get("provider") ?? "";

  const targetUrl = resolveAccommodationUrl(eventId, areaType, provider);
  if (!targetUrl) {
    return NextResponse.redirect(new URL("/races", request.url), 302);
  }

  return NextResponse.redirect(targetUrl, 302);
}

function resolveAccommodationUrl(eventId: string, areaType: string, provider: string) {
  if (!allowedAreaTypes.has(areaType as AccommodationPriorityType)) return null;
  if (!allowedProviders.has(provider)) return null;

  const decisionData = FIRST5_RACENEXT_DECISION_DATA.find((event) => event.eventId === eventId);
  const accommodationArea = decisionData?.accommodationAreas.find((area) => area.priorityType === areaType);
  return accommodationArea?.affiliateLinks.ctrip[areaType as AccommodationPriorityType] ?? null;
}
