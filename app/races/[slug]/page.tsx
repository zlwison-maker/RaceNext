import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RaceEventServicePage } from "@/components/RaceDecisionPage";
import { getRaceDecisionPage, getRaceDecisionPages } from "@/lib/raceDecision";

export function generateStaticParams() {
  return getRaceDecisionPages().map((race) => ({ slug: race.id }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const race = getRaceDecisionPage(slug);
  if (!race) return {};
  const canonical = `/races/${race.id}`;

  return {
    title: race.seo.title,
    description: race.seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: race.seo.title,
      description: race.seo.description,
      type: "website",
      url: canonical,
      images: race.coverImage
        ? [
            {
              url: race.coverImage,
              alt: `${race.name}赛事图片`,
            },
          ]
        : undefined,
    },
  };
}

export default async function RaceDetailPage({ params }: Props) {
  const { slug } = await params;
  const race = getRaceDecisionPage(slug);
  if (!race) notFound();

  const jsonLd = buildJsonLd(race);

  return (
    <>
      <RaceEventServicePage race={race} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

function buildJsonLd(race: NonNullable<ReturnType<typeof getRaceDecisionPage>>) {
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    startDate: race.raceDate ?? undefined,
    image: race.coverImage ? [race.coverImage] : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    location: race.city || race.province
      ? {
          "@type": "Place",
          name: [race.province, race.city, race.district].filter(Boolean).join(" "),
        }
      : undefined,
    offers: race.registrationUrl
      ? {
          "@type": "Offer",
          url: race.registrationUrl,
          availability: race.registrationStatus === "registration_open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        }
      : undefined,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: race.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "RaceNext",
        item: "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "赛事",
        item: "/races",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: race.name,
        item: `/races/${race.id}`,
      },
    ],
  };

  return [eventSchema, faqSchema, breadcrumbSchema];
}
