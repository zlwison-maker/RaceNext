// develop 使用 development；体验版与正式版使用 production。
// 开发阶段默认也访问正式 HTTPS 域名；需要联调时只在这里改为已配置的测试域名。
const API_BASE_URLS = {
  development: "https://racenext.run",
  production: "https://racenext.run",
} as const;

export function getApiBaseUrl(): string {
  const { envVersion } = wx.getAccountInfoSync().miniProgram;
  return API_BASE_URLS[envVersion === "develop" ? "development" : "production"];
}
