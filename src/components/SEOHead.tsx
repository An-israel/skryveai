import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: object;
  noindex?: boolean;
}

const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/eZbDQEygJ7QfLDNkEaOIRNnhMmf1/social-images/social-1773477930211-Screenshot_2026-03-14_094448.webp";

export function SEOHead({
  title,
  description,
  canonical,
  keywords,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  jsonLd,
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = title.includes("SkryveAI") ? title : `${title} | SkryveAI`;
  const url = canonical || "https://skryveai.com";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="SkryveAI" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@SkryveAI" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
