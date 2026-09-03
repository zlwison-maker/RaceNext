import { detailPageV1 } from "@/components/race-detail/styles";
import type { RaceStrategyContent } from "@/types/raceDetail";

export function RaceStrategy({ content }: { content: RaceStrategyContent }) {
  const styles = detailPageV1.raceGuide;

  return (
    <section id={content.title} className={styles.section}>
      <div className={styles.readingWidth}>
        <p className={detailPageV1.moduleEyebrow}>{content.eyebrow}</p>
        <h2 className={`${detailPageV1.moduleTitleSpacing} ${detailPageV1.moduleTitle}`}>{content.title}</h2>
        <p className={`${detailPageV1.moduleContentSpacing} ${styles.body} text-[#777777]`}>{content.scopeNote}</p>

        <div className={styles.subsectionSpacing}>
          {content.sections.map((section, index) => (
            <article key={section.number} className={index ? styles.subsectionSpacing : undefined}>
              <h3 className={styles.itemTitle}>
                <span className="mr-2 font-normal text-[#9d9386]">{section.number}</span>
                <span className="font-normal text-[#9d9386]">/</span>
                <span className="ml-2">{section.title}</span>
              </h3>
              <div className={`${styles.evidenceTitleToBody} ${styles.paragraphStack} ${styles.body}`}>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.text} className={paragraph.emphasis ? "font-normal text-[#1A1A1A]" : undefined}>
                    {paragraph.text}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        {content.closing ? <p className={styles.closing}>{content.closing}</p> : null}
      </div>
    </section>
  );
}
