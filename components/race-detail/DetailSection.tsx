import type { ReactNode } from "react";
import { detailPageV1 } from "@/components/race-detail/styles";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  systemV1?: boolean;
};

export function DetailSection({ id, eyebrow, title, children, systemV1 = false }: Props) {
  return (
    <section id={id} className="py-2">
      <p className={systemV1 ? detailPageV1.moduleEyebrow : "text-xs font-semibold uppercase tracking-[0.22em] text-[#888888]"}>{eyebrow}</p>
      <h2 className={systemV1 ? `${detailPageV1.moduleTitleSpacing} ${detailPageV1.moduleTitle}` : "mt-2 text-2xl font-bold tracking-normal text-[#1A1A1A] sm:text-3xl"}>{title}</h2>
      <div className={detailPageV1.moduleContentSpacing}>{children}</div>
    </section>
  );
}
