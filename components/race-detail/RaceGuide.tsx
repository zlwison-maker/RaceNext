import { detailPageV1 } from "@/components/race-detail/styles";
import type { RaceEditorialContent, RaceEditorialParagraph } from "@/types/raceDetail";

export function RaceGuide({ content }: { content: RaceEditorialContent }) {
  const styles = detailPageV1.raceGuide;

  return (
    <section id={content.impression.title} className={styles.section}>
      <div className={styles.readingWidth}>
        <div>
          <p className={detailPageV1.moduleEyebrow}>{content.impression.eyebrow}</p>
          <h2 className={`${detailPageV1.moduleTitleSpacing} ${detailPageV1.moduleTitle}`}>{content.impression.title}</h2>

          <div className={`${detailPageV1.moduleContentSpacing} ${styles.paragraphStack} ${styles.body}`}>
            {content.impression.paragraphs.map((paragraph) => (
              <p key={paragraph.text} className={paragraph.emphasis ? "font-normal text-[#1A1A1A]" : undefined}>
                <EditorialParagraphText paragraph={paragraph} />
              </p>
            ))}
          </div>
        </div>

        <div className={styles.subsectionSpacing}>
          <h3 className={styles.subsectionTitle}>{content.viewpoint.title}</h3>
          <div className={`mt-5 ${styles.paragraphStack} ${styles.body} sm:mt-6`}>
            {content.viewpoint.paragraphs.map((paragraph) => (
              <p key={paragraph.text} className={paragraph.emphasis ? "font-normal text-[#1A1A1A]" : undefined}>
                {paragraph.text}
              </p>
            ))}
          </div>
        </div>

        <div className={styles.subsectionSpacing}>
          <h3 className={styles.subsectionTitle}>{content.evidence.title}</h3>
          <div className={`mt-6 ${styles.itemStack}`}>
            {content.evidence.sections.map((section) => (
              <article key={section.number}>
                <h4 className={styles.itemTitle}>
                  <span className="mr-2 font-normal text-[#9d9386]">{section.number}</span>
                  <span className="font-normal text-[#9d9386]">/</span>
                  <span className="ml-2">{section.title}</span>
                </h4>
                <div className={`${styles.evidenceTitleToBody} ${styles.paragraphStack} ${styles.body}`}>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <p className="font-normal text-[#1A1A1A]">{section.emphasis}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.subsectionSpacing}>
          <h3 className={styles.subsectionTitle}>{content.suitability.title}</h3>
          <p className={`mt-5 ${styles.body} sm:mt-6`}>{content.suitability.introduction}</p>
          <div className={`mt-8 ${styles.itemStack}`}>
            {content.suitability.items.map((item) => (
              <article key={item.title}>
                <h4 className={styles.itemTitle}>{item.title}</h4>
                <div className={`${styles.fitTitleToBody} ${styles.paragraphStack} ${styles.body}`}>
                  {item.paragraphs.map((paragraph) => (
                    <p key={paragraph.text} className={paragraph.emphasis ? "font-normal text-[#1A1A1A]" : undefined}>
                      {paragraph.text}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        {content.transition ? <p className={styles.closing}>{content.transition}</p> : null}
      </div>
    </section>
  );
}

function EditorialParagraphText({ paragraph }: { paragraph: RaceEditorialParagraph }) {
  if (!paragraph.emphasisText) return paragraph.text;

  const emphasisIndex = paragraph.text.indexOf(paragraph.emphasisText);
  if (emphasisIndex === -1) return paragraph.text;

  const before = paragraph.text.slice(0, emphasisIndex);
  const after = paragraph.text.slice(emphasisIndex + paragraph.emphasisText.length);
  return (
    <>
      {before}
      <span className="font-normal text-[#1A1A1A]">{paragraph.emphasisText}</span>
      {after}
    </>
  );
}
