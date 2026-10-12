/**
 * Verbatim selected CMS records observed 2026-10-12 08:45 UTC; surrounding lists are reduced for offline replay.
 * Full-response SHA-256: homeIndex 16648c74ece3e5d7baa767af3f536006e537247fde7b8b47513a2192a0dd1fe1;
 * news 1dc567bc536323374edd0e2fd1954c10650a134a916a2d869b74e2eb41cc3676.
 * These are discovery records, NOT verified article bodies or facts.
 */
export const homepageHtml = '<script>window.WEBURL={"WKEY":"BJCN"}</script><script src="https://res.mararun.com/online/mara-race/assets/js/beijing/common.022d5ece.js"></script><script src="https://res.mararun.com/online/mara-race/assets/js/beijing/index.3e33815f.js"></script>';

export const frontendScript = 'var baseUrl = "https://mara-public-res-online.oss-cn-beijing.aliyuncs.com/beta/cms/internal"; baseUrl + "/homeIndex.json?t="; baseUrl + "/articles/";';
export const routeScript = 'window.open("/subject.html?topicId=" + res[0].id + "&detailId=" + v.id + "&type=" + n_type);';

export const homeIndexResponse = {
  topics: [
    { id: "7793646346787704", title: "赛事新闻", mode: "news", structTag: "news" },
    { id: "7793646850104219", title: "比赛公告", mode: "notice", structTag: "notice" },
  ],
  articles: {
    notice: [
      {
        title: "2026中国银行北京马拉松暨全国马拉松锦标赛报名须知",
        publishTime: "",
        tag: "2026",
        noticeImg: "",
        dename: "2026中国银行北京马拉松暨全国马拉松锦标赛报名须知",
        label: "报名须知",
        position: "175",
        createtime: "2026-09-13 20:02:40",
        updatetime: "2026-10-10 11:23:14",
        id: "9024245728409368",
      },
      { title: "2025北京马拉松报名须知", tag: "2025", id: "1111111111111111" },
    ],
  },
};

export const newsResponse = {
  total: 1, // Reduced replay wrapper; the full live response returned 111 records.
  datas: [
    {
      relation: {
        appKey: "BJCN", topicID: "7793646346787704", articleID: "9056984619947595",
        position: "0", id: "9056984619947596", createtime: "2026-10-06 10:05:51",
        updatetime: "2026-10-06 10:05:51", status: "1",
      },
      article: {
        appKey: "BJCN", name: "北马二抽结果今日公布，缴费通道同步开启",
        data: {
          URL: "https://mp.weixin.qq.com/s/rslZoUfFlE0oN6v9Fmum2w",
          image: "https://pub.mararun.com/cms/pic/BJCN/9d88f516e41c83c2f5137d5eeee8f8a9.jpg?x-oss-process=image/resize,w_1280,limit_1/quality,q_80",
          title: "北马二抽结果今日公布，缴费通道同步开启", tag: "2026",
        },
        tag: "news", position: "117", isShow: "1", id: "9056984619947595",
        createtime: "2026-10-06 10:05:50", updatetime: "2026-10-06 10:06:38", status: "1",
      },
      topic: {
        appKey: "BJCN", title: "赛事新闻", image: "", url: "", mode: "news",
        parentID: "7793637220341546", position: "8998", structTag: "news", isShow: "1",
        id: "7793646346787704", createtime: "2024-05-17 21:12:01",
        updatetime: "2024-05-17 21:12:01", status: "1",
      },
    },
  ],
};
