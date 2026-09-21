export const SHARE_ACTION_RESTORE_DELAY_MS = 1200;

export type RaceShareChannel = "app_message" | "timeline";
export type RaceShareSource = "bottom_action" | "native_menu";

type RaceShareContext = {
  editionId: string;
  raceId: string;
  name: string;
  coverImage: string | null;
  heroImage: string | null;
};

export type RaceShareConfig = {
  appMessage: {
    title: string;
    path: string;
    imageUrl?: string;
  };
  timeline: {
    title: string;
    query: string;
    imageUrl?: string;
  };
};

export function createRaceShareConfig(context: RaceShareContext): RaceShareConfig {
  const title = `${context.name}｜下一场参赛指南`;
  const editionId = encodeURIComponent(context.editionId);
  const imageUrl = [context.coverImage, context.heroImage]
    .map(toShareImageUrl)
    .find((value): value is string => value !== null);
  const image = imageUrl
    ? { imageUrl }
    : {};

  return {
    appMessage: {
      title,
      path: `/pages/races/detail/index?editionId=${editionId}`,
      ...image,
    },
    timeline: {
      title,
      query: `editionId=${editionId}`,
      ...image,
    },
  };
}

export function createRaceShareAnalyticsData(
  context: Pick<RaceShareContext, "editionId" | "raceId">,
  channel: RaceShareChannel,
  source: RaceShareSource,
): {
  editionId: string;
  raceId: string;
  channel: RaceShareChannel;
  source: RaceShareSource;
} {
  return {
    editionId: context.editionId,
    raceId: context.raceId,
    channel,
    source,
  };
}

export function getShareActionVisibilityUpdate(
  currentVisible: boolean,
  nextVisible: boolean,
): boolean | null {
  return currentVisible === nextVisible ? null : nextVisible;
}

function toShareImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const raceAsset = /^(https?:\/\/[^/?#]+)?(\/races\/[^/?#]+\/\d{4}\/)[^/?#]+(?:[?#].*)?$/i.exec(imageUrl);
  if (raceAsset) return `${raceAsset[1] ?? ""}${raceAsset[2]}share-cover-5x4.jpg`;
  return isSupportedShareImage(imageUrl) ? imageUrl : null;
}

function isSupportedShareImage(imageUrl: string): boolean {
  return Boolean(imageUrl && /\.(?:png|jpe?g)(?:[?#].*)?$/i.test(imageUrl));
}
