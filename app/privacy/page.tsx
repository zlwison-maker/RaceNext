import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "隐私政策 - RaceNext",
  description: "RaceNext 隐私政策。",
};

const sections = [
  {
    title: "一、信息收集",
    body: [
      "RaceNext 是一个赛事信息展示网站。",
      "在正常访问过程中，我们可能通过第三方统计工具收集部分匿名访问信息，例如：",
    ],
    list: ["页面访问记录", "访问时间", "浏览器类型", "设备信息", "来源渠道"],
    after: ["这些信息仅用于：", "分析网站访问情况、优化网站内容、改善用户体验。", "我们不会主动收集您的姓名、身份证号码、联系方式等个人身份信息。"],
  },
  {
    title: "二、第三方服务",
    body: ["为了了解网站访问情况，本站可能使用第三方统计服务，包括但不限于："],
    list: ["Google Analytics", "百度统计"],
    after: ["这些服务可能根据其隐私政策收集匿名访问数据。", "相关数据处理方式请参考对应第三方平台的隐私政策。"],
  },
  {
    title: "三、第三方链接",
    body: ["本站部分页面可能包含指向第三方网站的链接，例如赛事官方网站、酒店服务平台等。", "当您访问第三方网站时，相关信息处理将遵循第三方平台自身的隐私政策。", "RaceNext 不负责第三方网站的数据收集与处理行为。"],
  },
  {
    title: "四、Cookies",
    body: ["本站可能使用 Cookies 或类似技术，用于："],
    list: ["保存基础访问信息", "分析网站使用情况", "改善网站体验"],
    after: ["您可以通过浏览器设置管理或关闭 Cookies。"],
  },
  {
    title: "五、政策更新",
    body: ["我们可能根据网站发展情况对本隐私政策进行调整。", "更新后的内容将在本站页面展示。"],
  },
  {
    title: "六、联系我们",
    body: ["如果您对本隐私政策有任何问题，可以通过以下方式联系我们：", "邮箱：35880366@qq.com"],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">
      <InfoHeader title="隐私政策" />
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="space-y-6 text-base font-normal leading-8 text-[#666666]">
          <p className="font-medium text-[#1A1A1A]">更新日期：2026年8月5日</p>
          <p>感谢您访问 RaceNext（以下简称“本站”）。</p>
          <p>我们重视您的隐私保护，并希望通过本隐私政策向您说明本站如何处理相关信息。</p>
        </div>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-[#ddd6ca] pt-9">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">{section.title}</h2>
              <div className="mt-5 space-y-5 text-base font-normal leading-8 text-[#666666]">
                {section.body.map((item) => (
                  <p key={item}>{item}</p>
                ))}
                {section.list ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {section.after?.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

function InfoHeader({ title }: { title: string }) {
  return (
    <section className="bg-[#18231f] px-5 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-white/54">
          RaceNext
        </Link>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>
      </div>
    </section>
  );
}
