const HOME_SHARE_IMAGE_URL = "https://racenext.run/share/racenext-home-v2-5x4.jpg";

export function createHomeShareConfig() {
  return {
    appMessage: {
      title: "下一场跑哪场？马拉松与越野参赛指南",
      path: "/pages/index/index?source=share",
      imageUrl: HOME_SHARE_IMAGE_URL,
    },
    timeline: {
      title: "马拉松与越野参赛指南｜RaceNext",
      query: "source=share",
      imageUrl: HOME_SHARE_IMAGE_URL,
    },
  };
}
