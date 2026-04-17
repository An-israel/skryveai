export const SIGNAL_LABELS: Record<string, string> = {
  no_trust_badges: "Missing trust badges (SSL, payment logos, guarantees)",
  slow_load: "Slow page load time",
  not_mobile_responsive: "Not mobile responsive",
  outdated_design: "Outdated visual design",
  no_clear_cta: "No clear call-to-action",
  no_email_capture: "No email capture / lead form",
  weak_copy: "Weak or generic copywriting",
  no_blog_or_content: "No blog or content marketing",
  no_social_links: "Missing social media links",
  broken_links: "Broken or dead links",
  thin_content: "Thin or insufficient content",
  no_seo_meta: "Missing SEO meta tags",
  no_https: "Site not using HTTPS",
  weak_brand: "Weak brand identity",
  generic_design: "Generic template-style design",
  no_video_content: "No video content",
  poor_navigation: "Poor or confusing navigation",
  no_testimonials: "No testimonials or social proof",
  outdated_copyright: "Outdated copyright year",
  no_about_page: "No About page",
};

export const ALL_SIGNALS = Object.keys(SIGNAL_LABELS);

export interface ServiceDefinition {
  rawDescription: string;
  industryVertical: string;
  targetProfile: string;
  signalsToDetect: string[];
  signalWeights?: Record<string, number>;
}

export interface SmartScoredBusiness {
  id: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  placeId?: string;
  email?: string;
  emailVerified?: boolean;
  needScore: number;
  signals: Record<string, boolean>;
  evidence: Record<string, string>;
  problemsFound: string[];
  selected?: boolean;
}
