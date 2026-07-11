// JSON-LD schema builders (Growth Doc 2, Part 1). Typed helpers that return
// schema.org objects to feed into SEOHead's `jsonLd` prop (or SiteSchema).
// Validate output against Google's Rich Results Test.

export const SITE_URL = "https://skryveai.com";
const LOGO = `${SITE_URL}/logo.png`;

const SOCIALS = [
  "https://twitter.com/SkryveAI",
  "https://www.linkedin.com/company/skryve",
  "https://www.instagram.com/skryveai",
];

/** Organization — defines Skryve as an entity for Google + AI engines. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Skryve",
    url: SITE_URL,
    logo: LOGO,
    description:
      "Skryve is an all-in-one freelance platform: a job aggregator, AI proposal and CV tools, a talent marketplace, and a learning platform.",
    foundingDate: "2025",
    founder: { "@type": "Person", name: "Aniekan Israel" },
    sameAs: SOCIALS,
  };
}

/** WebSite + SearchAction — enables the sitelinks search box. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Skryve",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/jobs?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(a: {
  title: string;
  description?: string;
  slug: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: a.image || `${SITE_URL}/og-image.png`,
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    author: { "@type": "Organization", name: a.author || "Skryve Team" },
    publisher: {
      "@type": "Organization",
      name: "Skryve",
      logo: { "@type": "ImageObject", url: LOGO },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${a.slug}` },
  };
}

export function faqPageSchema(faq: { q: string; a: string }[]) {
  if (!faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function jobPostingSchema(j: {
  title: string;
  description: string;
  datePosted?: string;
  validThrough?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  salary?: string | number;
  currency?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: j.description,
    datePosted: j.datePosted,
    validThrough: j.validThrough,
    employmentType: j.employmentType || "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: j.company || "Skryve",
      sameAs: SITE_URL,
    },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: j.location || "Anywhere" },
  };
  if (j.salary) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: j.currency || "USD",
      value: { "@type": "QuantitativeValue", value: j.salary, unitText: "MONTH" },
    };
  }
  return schema;
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  if (!items?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}

export function courseSchema(c: { name: string; description?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.name,
    description: c.description,
    provider: { "@type": "Organization", name: "Skryve", sameAs: SITE_URL },
  };
}
