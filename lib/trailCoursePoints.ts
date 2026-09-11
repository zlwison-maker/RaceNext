import type { CoursePoint, CoursePointDataStatus } from "../types/event.ts";

const COURSE_POINT_TYPES = new Set(["checkpoint", "water_point", "finish"]);
const COURSE_POINT_SERVICES = new Set(["water", "food", "hot_food", "drop_bag", "medical"]);
const ISO_DATETIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const ORDER_DERIVED_ID = /-(?:cp|point|checkpoint)-?\d+$/;

export type CoursePointValidationIssue = {
  pointId: string | null;
  field: string;
  message: string;
};

/**
 * Small pre-publication validator for accepted Category course-point facts.
 * Evidence stays in Category governance and is intentionally outside this shape.
 */
export function validateTrailCoursePoints(
  categoryId: string,
  points: CoursePoint[] | null | undefined,
): CoursePointValidationIssue[] {
  if (points === null || points === undefined) return [];

  const issues: CoursePointValidationIssue[] = [];
  const pointIds = new Set<string>();
  const displayOrders = new Set<number>();
  let previousDistance: number | null = null;
  let previousCutoff: number | null = null;

  for (const point of [...points].sort((left, right) => left.displayOrder - right.displayOrder)) {
    const pointId = typeof point.pointId === "string" ? point.pointId : null;
    const semanticKey = pointId?.startsWith(`${categoryId}-`) ? pointId.slice(categoryId.length + 1) : "";
    if (!pointId || !semanticKey || !/[a-z]/.test(semanticKey) || ORDER_DERIVED_ID.test(pointId)) {
      issues.push({ pointId, field: "pointId", message: "pointId must use a stable semantic Category identity" });
    } else if (pointIds.has(pointId)) {
      issues.push({ pointId, field: "pointId", message: "pointId must be unique within the Category" });
    }
    if (pointId) pointIds.add(pointId);

    if (!Number.isInteger(point.displayOrder) || point.displayOrder < 1 || displayOrders.has(point.displayOrder)) {
      issues.push({ pointId, field: "displayOrder", message: "displayOrder must be a unique positive integer" });
    }
    displayOrders.add(point.displayOrder);

    if (typeof point.name !== "string" || point.name.trim().length === 0) {
      issues.push({ pointId, field: "name", message: "name must be a non-empty source-backed label" });
    }

    if (!COURSE_POINT_TYPES.has(point.type)) {
      issues.push({ pointId, field: "type", message: "type is outside the V0.1 controlled enum" });
    }

    if (point.distanceKm !== null) {
      if (!Number.isFinite(point.distanceKm) || point.distanceKm < 0) {
        issues.push({ pointId, field: "distanceKm", message: "distanceKm must be null or a non-negative number" });
      } else if (previousDistance !== null && point.distanceKm < previousDistance) {
        issues.push({ pointId, field: "distanceKm", message: "distanceKm must not decrease along display order" });
      }
      previousDistance = point.distanceKm;
    }

    if (point.cutoffAt !== null) {
      const cutoff = ISO_DATETIME_WITH_OFFSET.test(point.cutoffAt) ? Date.parse(point.cutoffAt) : Number.NaN;
      if (!Number.isFinite(cutoff)) {
        issues.push({ pointId, field: "cutoffAt", message: "cutoffAt must include a complete date and timezone offset" });
      } else if (previousCutoff !== null && cutoff < previousCutoff) {
        issues.push({ pointId, field: "cutoffAt", message: "cutoffAt must not move backwards along display order" });
      }
      if (Number.isFinite(cutoff)) previousCutoff = cutoff;
    }

    if (point.services !== null && (!Array.isArray(point.services)
      || point.services.some((service) => !COURSE_POINT_SERVICES.has(service)))) {
      issues.push({ pointId, field: "services", message: "services must be null or use the V0.1 controlled enum" });
    }
  }

  return issues;
}

/**
 * Validates the Category-level publication status against the P0 core structure.
 * Services are optional enrichment and never affect available versus partial.
 */
export function validateCoursePointDataStatus(
  categoryId: string,
  points: CoursePoint[] | null | undefined,
  status: CoursePointDataStatus | null | undefined,
): CoursePointValidationIssue[] {
  const hasPoints = Array.isArray(points) && points.length > 0;
  if (!hasPoints) {
    return status === "available" || status === "partial"
      ? [{ pointId: null, field: "coursePointDataStatus", message: `${status} requires published Course Point data` }]
      : [];
  }

  const displayOrders = points.map(({ displayOrder }) => displayOrder);
  const coreStructureComplete = points.every((point) =>
    point.pointId.startsWith(`${categoryId}-`)
    && typeof point.name === "string"
    && point.name.trim().length > 0
    && Number.isInteger(point.displayOrder)
    && point.displayOrder > 0
    && point.distanceKm !== null
    && Number.isFinite(point.distanceKm)
    && point.cutoffAt !== null
    && ISO_DATETIME_WITH_OFFSET.test(point.cutoffAt)
    && Number.isFinite(Date.parse(point.cutoffAt)))
    && new Set(displayOrders).size === displayOrders.length;

  if (status === "available" && !coreStructureComplete) {
    return [{ pointId: null, field: "coursePointDataStatus", message: "available requires a complete P0 core structure" }];
  }
  if (status === null || status === undefined || status === "not_published" || status === "unknown") {
    return [{ pointId: null, field: "coursePointDataStatus", message: "published Course Point data requires available or partial" }];
  }

  return [];
}
