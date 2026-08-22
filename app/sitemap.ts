import type { MetadataRoute } from "next";

const baseUrl = "https://racenext.run";

const routes = [
  "",
  "/about",
  "/privacy",
  "/contact",
  "/races/shanghai-marathon",
  "/races/beijing-marathon",
  "/races/xiamen-marathon",
  "/races/hk100",
  "/races/kailas-gongga-100",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route.startsWith("/races") ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/races") ? 0.8 : 0.6,
  }));
}
