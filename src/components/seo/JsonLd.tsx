import { SITE } from "@/lib/site";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "RadioStation",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo/fmheart-badge.png`,
    description: SITE.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: "No. 128/2b, High Level Road",
      addressLocality: "Kottawa",
      addressCountry: "LK",
    },
    telephone: SITE.phones[0],
    sameAs: [
      SITE.social.facebook,
      SITE.social.instagram,
      SITE.social.youtube,
      SITE.social.tiktok,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ArticleJsonLd({
  title,
  description,
  image,
  publishedAt,
  author,
  url,
}: {
  title: string;
  description: string;
  image: string;
  publishedAt: string;
  author: string;
  url: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: [image],
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/logo/fmheart-badge.png`,
      },
    },
    mainEntityOfPage: url,
    inLanguage: "si",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
