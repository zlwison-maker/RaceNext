import type { PublicAccommodationRecommendation } from "../types/races";

type WechatHotelAction = NonNullable<PublicAccommodationRecommendation["actions"]["wechat"]>;
type MiniProgramJumpResult = { errMsg: string };
type MiniProgramJumpOption = Omit<WechatHotelAction, "type"> & {
  envVersion: "release";
  success(): void;
  fail(error: MiniProgramJumpResult): void;
};

declare const wx: {
  navigateToMiniProgram(option: MiniProgramJumpOption): unknown;
};

export function openHotelMiniProgram(
  action: WechatHotelAction,
  callbacks: { success(): void; fail(error: MiniProgramJumpResult): void },
): void {
  wx.navigateToMiniProgram({
    appId: action.appId,
    path: action.path,
    envVersion: "release",
    success: callbacks.success,
    fail: callbacks.fail,
  });
}
