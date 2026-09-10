import { getApiBaseUrl } from "../utils/config";

export function get<T extends Record<string, unknown>>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request<T>({
      url: `${getApiBaseUrl()}${path}`,
      method: "GET",
      timeout: 10000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
        } else {
          reject(new Error(`RaceNext API 请求失败（HTTP ${response.statusCode}）`));
        }
      },
      fail(error) {
        reject(new Error(error.errMsg));
      },
    });
  });
}
