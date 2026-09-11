import type { RaceStrategyContent } from "@/types/raceDetail";

export const hk100RaceStrategy = {
    categoryId: "hk100-2027-hk100-100k",
    eyebrow: "RACE STRATEGY",
    title: "CP 点与补给策略",
    scopeNote:
      "以下内容主要基于2027 HK100 100K主赛官方路线特点，以及历届完赛跑者的真实赛记与补给反馈。不同年份的 CP 设置和具体补给可能变化，其他组别路线也不同，请以对应届别官方赛事信息为准。",
    sections: [
      {
        number: "01",
        title: "前半程：好跑的时候，更要忍住",
        paragraphs: [
          {
            text: "HK100官方明确提醒，大部分爬升集中在后半程，前半程需要合理控制速度。一位2023年100K完赛者也在复盘中提到，前约50公里有不少可跑路段，很容易跑快；他刻意把前55公里保持在稳定强度，为后半程留出余力。",
          },
          {
            text: "同一份复盘显示，这位跑者从前半程就在各个CP进食和补水，并没有等到后半程出现问题才开始处理能量。具体吃什么因人而异，但把摄入推迟到身体已经明显疲劳，并不是稳妥的执行方式。",
          },
          { text: "RaceNext 的判断是：" },
          { text: "HK100 前半程真正要控制的，是两件事：速度和补给节奏。", emphasis: true },
          {
            text: "因为它太容易让你觉得“今天状态不错”。更稳妥的思路，不是前 30–40 公里能跑多快，而是在进入后半程真正的大爬升之前，身体里还有没有稳定的能量、水分和耐心。",
          },
        ],
      },
      {
        number: "02",
        title: "中段以后：能继续吃，比吃得“完美”更重要",
        paragraphs: [
          {
            text: "公开完赛复盘显示，比赛过半后，后半程爬升、夜间和进食状态可能同时发生变化。一位跑者在前半程还能吃三明治、能量棒和饭团，过半后却难以继续咀嚼和吞咽固体食物，只能转向汤类、可乐等仍能接受的补给。",
          },
          {
            text: "另一份完赛记录提到，跑者在中段关键CP取用换装袋、补充自己熟悉的零食和电解质，再戴上头灯进入后半程；实际停留也比计划更久。这些反馈说明，入夜前的CP既是补给点，也是一次需要提前计划的状态切换。",
          },
          { text: "RaceNext 的判断是：" },
          { text: "中段以后，补给目标应该从“我要吃得最完美”，切换成“我要保证自己还能持续吃”。", emphasis: true },
          {
            text: "比记住某一种补给品更重要的，是赛前知道：当你已经不想再吃甜的、不想再嚼东西、身体开始发冷时，还有哪些经过自己训练验证、仍然能够接受的备选方案。",
          },
        ],
      },
      {
        number: "03",
        title: "后半程：把比赛拆成下一个 CP",
        paragraphs: [
          {
            text: "到了后半程，CP的意义已经不只是吃东西和补水。2023年的完赛者明确提到，他不再想着完整的100公里，而是把注意力放在接下来约10公里和下一个checkpoint；80公里以后，他也只专注于先抵达下一站。",
          },
          {
            text: "CP停留本身也会变成隐藏成本。这位跑者尽量高效完成进食和补水，只在少数站坐下；中段取换装袋的站点仍然花了更久。另一份完赛记录也提到，在中段站寻找空间、换装和整理补给让停留超过了原计划。",
          },
          { text: "RaceNext 不建议普通跑者机械模仿精英选手“快速过站”。" },
          { text: "更重要的是：进入一个关键 CP 之前，就知道自己要做什么。", emphasis: true },
          { text: "例如：补水、吃东西、处理装备、处理脚部、确认下一段、出站。" },
          { text: "RaceNext 的判断是：" },
          { text: "70–80km 以后，不要再管理整场比赛，只管理“下一个 CP”。", emphasis: true },
          {
            text: "到下一个 CP 之前，需要想清楚：我要吃什么？要带多少水？下一段是什么地形？我现在只解决这一段。",
          },
          { text: "同时，CP 可以休息，但不要让“没有计划的停留”持续消耗比赛。" },
        ],
      },
    ],
    closing:
      "如果把这些真实跑者反馈压缩成几句话，HK100 100K 的比赛策略核心不是记住每个 CP 吃什么，而是：前半程控制速度和规律进食，中段以后保证自己还能持续摄入，入夜后准备好补给切换方案，进入 CP 前知道要完成哪些动作，最后二三十公里只管理“下一个 CP”。",
  sources: [
    {
      sourceId: "hk100-official-hk100-category-2027",
      type: "official",
      title: "HK100 官方 2027 100K 赛事页",
      url: "https://hk100ultra.com/zh-hant/hk100/",
      supports: "2027 主赛日期、100K 路线结构，以及大部分爬升位于后半程、前半程应合理配速的官方说明。",
    },
    {
      sourceId: "hk100-runner-report-first-100k-2023",
      type: "runner_report",
      title: "My First 100km (HK100 race report)",
      url: "https://www.reddit.com/r/running/comments/118vth2/my_first_100km_hk100_race_report/",
      supports: "前 50km 与后半程难度变化、半程补给站停留，以及后半程固体食物接受度下降的个人完赛复盘。",
    },
    {
      sourceId: "hk100-runner-report-peaks-and-penguins",
      type: "runner_report",
      title: "Happiness is: Hong Kong 100k",
      url: "https://www.peaksandpenguins.com/races-in-asia/hong-kong-100k/",
      supports: "关键补给站换装、补充食物与电解质、停留时间超出计划，以及入夜前状态切换的个人完赛复盘。",
    },
  ]
} satisfies RaceStrategyContent;
