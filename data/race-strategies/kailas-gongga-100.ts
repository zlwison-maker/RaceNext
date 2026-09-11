import type { RaceStrategyContent } from "@/types/raceDetail";

export const kailasGongga100RaceStrategy = {
    categoryId: "kailas-gongga-100-2026-glacier-100",
    eyebrow: "RACE STRATEGY",
    title: "CP 点与补给策略",
    scopeNote:
      "以下内容主要基于2026贡嘎100 100K官方路线特点，以及2025首届赛事公开参赛反馈整理。2026赛事尚未举行，具体CP补给、天气和现场情况可能变化，请以赛事技术会及官方最终信息为准。当前策略只针对100K核心组别，其他组别路线和执行方式可能不同。",
    sections: [
      {
        number: "01",
        title: "前21公里：先处理海拔，不要处理成绩",
        paragraphs: [
          {
            text: "贡嘎100最特殊的一点，是比赛一开始就进入持续大爬升。2026官方路线显示，从约1743米起步，到21公里左右就要爬上4578米垭口。",
          },
          {
            text: "官方报名资格要求3500米以上户外经验，高反相关风险和撤离安排也出现在官方赛事规则里。",
          },
          { text: "RaceNext 的判断是：" },
          {
            text: "这段真正的问题不是“我能不能爬得快”，而是“我的身体进入3000米、4000米以后，还能不能稳定工作”。",
          },
          {
            text: "前段最重要的策略不是抢时间，而是主动降低强度、保持规律摄入，同时持续观察身体对海拔的反应。",
            emphasis: true,
          },
          {
            text: "如果身体状态持续恶化，不应该简单把它理解成“今天状态不好”。这里尤其不能用普通低海拔越野的经验硬顶。",
          },
        ],
      },
      {
        number: "02",
        title: "4000米以上：能吃、能喝、能保暖，比计划配速更重要",
        paragraphs: [
          {
            text: "翻过第一座垭口后，比赛并没有立刻结束高海拔阶段。2026官方路线仍将经过4000m+山脊，并再次翻越约4500m垭口，之后才逐步进入四号营地、冰川等区域。",
          },
          {
            text: "也就是说，这不是一次短暂触碰高海拔后迅速下降的比赛，高海拔环境本身会持续相当一段赛程。",
          },
          { text: "RaceNext 的判断是：" },
          { text: "这个阶段不要继续执着于计划配速。" },
          {
            text: "比“跑得是否符合计划”更重要的，是自己是否还能稳定摄入、保持体温、维持清晰判断，并及时识别状态是否正在恶化。",
            emphasis: true,
          },
          {
            text: "高海拔状态下自己还能接受什么食物和饮料，最好在赛前已经有真实训练或户外经验。",
          },
        ],
      },
      {
        number: "03",
        title: "离开高海拔以后，比赛并没有结束",
        paragraphs: [
          {
            text: "2026 100K总距离约100.1km、累计爬升超过7000m。",
          },
          {
            text: "翻过两个高海拔垭口并离开冰川区域后，赛程仍继续经过多个山地、村落和后段爬升，距离终点还有相当长的一段比赛。",
          },
          { text: "RaceNext 的判断是：" },
          {
            text: "真正稳妥的目标，不是“熬过高海拔”，而是离开高海拔以后依然有能力继续完成一场长距离越野。",
            emphasis: true,
          },
          {
            text: "前面已经产生的体力消耗，以及补给和装备管理压力，不会因为海拔下降自动清零。",
          },
          {
            text: "进入后半程关键CP时，更值得重新判断一次自己的状态：前面高海拔阶段造成的消耗有没有得到控制，以及自己是否还有能力持续完成接下来的赛程。",
          },
          {
            text: "不要因为“最难的山已经过去了”，就默认比赛已经结束。",
            emphasis: true,
          },
        ],
      },
    ],
    closing:
      "如果把贡嘎100 100K的执行策略压缩成几句话，就是：前段先适应海拔，不抢时间；4000米以上先保证能吃、能喝、能保暖；离开高海拔以后，不要误以为比赛结束了。真正的目标，是把高山阶段的消耗控制在自己还能完成后半程的范围内。",
  sources: [
    {
      sourceId: "kailas-gongga-100-official",
      type: "official",
      title: "Gongga 100 官方赛事与 2026 路线说明",
      url: "https://www.letoursports.net/gongga-100",
      supports: "2026 100K 前段连续爬升、高海拔山脊、第二座垭口、技术下降和后段龙华山爬升。",
    },
    {
      sourceId: "kailas-gongga-100-official-regulations-2026",
      type: "official",
      title: "2026 凯乐石贡嘎100冰川极限挑战赛竞赛规程",
      url: "https://moganshan.saihuitong.com/article?id=70868&mid=57201",
      supports: "2026 100K 距离、累计爬升、出发与关门时间、路线节点、装备和高海拔赛事规则。",
    },
    {
      sourceId: "kailas-gongga-100-2025-media-runner-feedback",
      type: "media_report",
      title: "2025 凯乐石贡嘎100冰川极限挑战赛收官报道",
      url: "https://finance.sina.com.cn/jjxw/2025-09-29/doc-infscnsr8364562.shtml",
      supports: "2025 首届赛事路线体验及公开参赛者反馈；不用于定义 2026 路线或补给事实。",
    },
  ]
} satisfies RaceStrategyContent;
