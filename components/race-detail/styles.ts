export const detailPageV1 = {
  contentContainer: "mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24",
  moduleStack: "grid gap-12 sm:gap-20",
  moduleEyebrow: "text-xs font-medium uppercase tracking-[0.18em] text-[#888888]",
  moduleTitle: "text-[28px] font-semibold leading-[1.3] tracking-normal text-[#1A1A1A] sm:text-[32px]",
  moduleTitleSpacing: "mt-3",
  moduleContentSpacing: "mt-6",
  cardFrame: "overflow-hidden rounded-lg border border-[#ddd8cf] bg-white transition-colors duration-200 hover:border-[#a9a195]",
  accommodationCta:
    "inline-flex min-h-10 items-center justify-center rounded-full bg-[#435044] px-5 py-2.5 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-[#354037]",
  nextCta:
    "inline-flex items-center justify-center rounded-full border border-[#435044]/35 px-4 py-2 text-center text-sm font-medium text-[#435044] transition-colors hover:border-[#435044]/65 hover:bg-[#f7f8f6]",
  raceGuide: {
    section: "py-2",
    readingWidth: "max-w-[800px]",
    subsectionTitle: "text-[19px] font-medium leading-[1.4] text-[#1A1A1A] sm:text-[21px]",
    itemTitle: "text-[17px] font-medium leading-[1.4] text-[#1A1A1A] sm:text-lg",
    body: "text-[15px] font-light leading-[1.66] text-[#4f4f4f] sm:text-base",
    subsectionSpacing: "mt-14 sm:mt-[60px]",
    paragraphStack: "space-y-4",
    itemStack: "space-y-10",
    evidenceTitleToBody: "mt-3.5",
    fitTitleToBody: "mt-3",
    closing: "mt-10 text-[15px] font-medium leading-[1.66] text-[#1A1A1A] sm:text-base",
  },
} as const;
