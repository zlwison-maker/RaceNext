const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMON_CATEGORY_SEPARATOR_PATTERN = /[\s_./\\:|‐‑‒–—−]+/g;

function assertStableId(value: string, label: string): string {
  if (!STABLE_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase kebab-case stable ID: ${value}`);
  }

  return value;
}

/** Event IDs are manually governed, cross-year brand identifiers. */
export function validateEventId(eventId: string): string {
  return assertStableId(eventId, "eventId");
}

/** Build an Edition ID from its stable Event ID and four-digit edition year. */
export function createEditionId(eventId: string, editionYear: number): string {
  const stableEventId = validateEventId(eventId);

  if (!Number.isInteger(editionYear) || editionYear < 1000 || editionYear > 9999) {
    throw new Error(`editionYear must be a four-digit integer: ${editionYear}`);
  }

  return `${stableEventId}-${editionYear}`;
}

/** Normalize formatting only; this deliberately does not infer semantic equivalence. */
export function normalizeStableCategoryKey(categoryKey: string): string {
  const normalized = categoryKey
    .trim()
    .toLowerCase()
    .replace(COMMON_CATEGORY_SEPARATOR_PATTERN, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return assertStableId(normalized, "categoryKey");
}

/** Build a Category ID from stable semantic identity, never display order or array index. */
export function createCategoryId(editionId: string, categoryKey: string): string {
  const stableEditionId = assertStableId(editionId, "editionId");
  const stableCategoryKey = normalizeStableCategoryKey(categoryKey);

  if (!/[a-z]/.test(stableCategoryKey)) {
    throw new Error(`categoryKey must contain a stable semantic code, not an array index: ${categoryKey}`);
  }

  return `${stableEditionId}-${stableCategoryKey}`;
}
