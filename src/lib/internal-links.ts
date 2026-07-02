// Internal-linking helper for blog posts (SEO): finds phrases in markdown
// content that relate to Skryve pages and turns the FIRST occurrence of each
// into a markdown link — skipping headings, code blocks, and existing links.

interface AnchorRule {
  phrases: string[]; // matched case-insensitively, whole-word
  url: string;
}

// Longest / most specific phrases first so they win over generic ones.
export const INTERNAL_LINK_RULES: AnchorRule[] = [
  { phrases: ["cv builder", "resume builder", "build your cv", "build a cv"], url: "/cv-builder" },
  { phrases: ["ats checker", "ats score", "ats-friendly", "applicant tracking system"], url: "/ats-checker" },
  { phrases: ["linkedin analyzer", "linkedin profile review"], url: "/linkedin-analyzer" },
  { phrases: ["job application", "job applications", "apply for jobs", "find jobs", "job search"], url: "/feed" },
  { phrases: ["talent marketplace", "hire talent", "hire freelancers", "post a job"], url: "/marketplace" },
  { phrases: ["learn new skills", "online courses", "upskill", "skill up", "learning platform"], url: "/learn" },
  { phrases: ["freelancers", "freelancer", "talents"], url: "/signup" },
  { phrases: ["pricing", "subscription plans", "upgrade to pro"], url: "/pricing" },
  { phrases: ["about skryve", "our mission", "our story"], url: "/about" },
  { phrases: ["contact us", "get in touch", "reach out to us"], url: "/contact" },
  { phrases: ["sign up", "create an account", "join skryve", "get started"], url: "/signup" },
  { phrases: ["skryve blog", "more articles"], url: "/blog" },
  { phrases: ["skryve"], url: "/" },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Spans of the content that must never be modified (existing links, images, code, headings). */
function protectedSpans(content: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  // Existing markdown links & images
  for (const m of content.matchAll(/!?\[[^\]]*\]\([^)]*\)/g)) {
    spans.push([m.index!, m.index! + m[0].length]);
  }
  // Fenced code blocks
  for (const m of content.matchAll(/```[\s\S]*?```/g)) {
    spans.push([m.index!, m.index! + m[0].length]);
  }
  // Inline code
  for (const m of content.matchAll(/`[^`\n]+`/g)) {
    spans.push([m.index!, m.index! + m[0].length]);
  }
  // Headings (whole line)
  for (const m of content.matchAll(/^#{1,6}[^\n]*$/gm)) {
    spans.push([m.index!, m.index! + m[0].length]);
  }
  return spans;
}

const inSpans = (spans: Array<[number, number]>, start: number, end: number) =>
  spans.some(([s, e]) => start < e && end > s);

export interface AutoLinkResult {
  content: string;
  added: Array<{ phrase: string; url: string }>;
}

/**
 * Insert internal links into markdown content. Links only the first occurrence
 * of each rule, never inside existing links/headings/code, one link per URL,
 * capped at `maxLinks` total so posts don't get spammy.
 */
export function autoLinkContent(content: string, maxLinks = 8): AutoLinkResult {
  let result = content;
  const added: Array<{ phrase: string; url: string }> = [];
  const usedUrls = new Set<string>();

  for (const rule of INTERNAL_LINK_RULES) {
    if (added.length >= maxLinks) break;
    if (usedUrls.has(rule.url)) continue;

    const spans = protectedSpans(result);
    let done = false;

    for (const phrase of rule.phrases) {
      if (done) break;
      const re = new RegExp(`(?<![\\w[/])(${escapeRegex(phrase)})(?![\\w\\]])`, "i");
      const m = re.exec(result);
      if (!m || m.index === undefined) continue;
      const start = m.index;
      const end = start + m[1].length;
      if (inSpans(spans, start, end)) continue;

      result = `${result.slice(0, start)}[${m[1]}](${rule.url})${result.slice(end)}`;
      added.push({ phrase: m[1], url: rule.url });
      usedUrls.add(rule.url);
      done = true;
    }
  }

  return { content: result, added };
}
