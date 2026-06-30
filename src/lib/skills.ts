// Central skill catalog for Skryve — categorized, 150+ skills, with synonym-aware
// search so a query like "graphic designer" surfaces creative / visual design / etc.

export interface SkillCategory {
  category: string;
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    category: "Design",
    skills: [
      "Graphic Design", "UI/UX Design", "Product Design", "Web Design", "Logo Design",
      "Brand Identity", "Visual Design", "Illustration", "Figma", "Adobe Photoshop",
      "Adobe Illustrator", "Print Design", "Packaging Design", "Presentation Design",
      "Design Systems", "Wireframing", "Prototyping", "Typography",
    ],
  },
  {
    category: "Development",
    skills: [
      "Web Development", "Frontend Development", "Backend Development", "Full Stack Development",
      "Mobile App Development", "iOS Development", "Android Development", "React",
      "React Native", "Vue.js", "Angular", "Node.js", "Python", "Django", "Laravel",
      "PHP", "Ruby on Rails", "Java", "Go", "TypeScript", "WordPress", "Webflow",
      "Shopify Development", "No-Code Development", "API Development", "Database Design",
      "Game Development", "Smart Contracts", "Blockchain Development",
    ],
  },
  {
    category: "Data & AI",
    skills: [
      "Data Analysis", "Data Science", "Machine Learning", "AI Development",
      "Deep Learning", "Data Engineering", "Data Visualization", "Business Intelligence",
      "SQL", "Power BI", "Tableau", "Prompt Engineering", "Computer Vision", "NLP",
      "Statistical Analysis", "Excel & Spreadsheets",
    ],
  },
  {
    category: "Marketing",
    skills: [
      "Digital Marketing", "Social Media Management", "Social Media Marketing",
      "Content Marketing", "Email Marketing", "SEO", "SEM", "Google Ads", "Meta Ads",
      "PPC Advertising", "Affiliate Marketing", "Influencer Marketing", "Growth Hacking",
      "Marketing Strategy", "Brand Strategy", "Marketing Automation", "Lead Generation",
      "Public Relations", "Community Management", "Conversion Optimization",
    ],
  },
  {
    category: "Writing",
    skills: [
      "Copywriting", "Content Writing", "Blog Writing", "Technical Writing", "Ghostwriting",
      "Scriptwriting", "Proofreading", "Editing", "Translation", "Grant Writing",
      "Resume Writing", "UX Writing", "Creative Writing", "Transcription",
    ],
  },
  {
    category: "Video & Audio",
    skills: [
      "Video Editing", "Video Production", "Motion Graphics", "Animation", "2D Animation",
      "3D Animation", "3D Modeling", "Videography", "Voice Over", "Podcast Production",
      "Audio Editing", "Sound Design", "Music Production", "Photography", "Photo Editing",
      "After Effects", "Premiere Pro",
    ],
  },
  {
    category: "Business & Admin",
    skills: [
      "Virtual Assistant", "Project Management", "Product Management", "Business Consulting",
      "Business Analysis", "Operations Management", "Data Entry", "Customer Support",
      "Customer Success", "Executive Assistant", "Bookkeeping", "Accounting",
      "Financial Analysis", "Human Resources", "Recruiting", "Market Research",
      "Business Development",
    ],
  },
  {
    category: "Sales & E-commerce",
    skills: [
      "Sales", "Cold Calling", "Account Management", "E-commerce Management", "Dropshipping",
      "Amazon FBA", "Shopify", "Product Listing", "Supply Chain", "Inventory Management",
      "CRM Management",
    ],
  },
  {
    category: "Engineering & Tech",
    skills: [
      "DevOps", "Cloud Services", "AWS", "Azure", "Cybersecurity", "Penetration Testing",
      "Network Security", "IT Support", "QA Testing", "Automation Testing",
      "Systems Administration", "Technical Support", "GRC Consulting", "Mechanical Engineering",
      "Electrical Engineering", "CAD Design", "Architecture",
    ],
  },
  {
    category: "Professional Services",
    skills: [
      "Legal Consulting", "Contract Drafting", "Tax Consulting", "Financial Planning",
      "Career Coaching", "Life Coaching", "Tutoring", "Curriculum Development",
      "Instructional Design", "Event Planning", "Real Estate", "Interior Design",
    ],
  },
];

// Flat, sorted, de-duplicated list of every skill.
export const ALL_SKILLS: string[] = Array.from(
  new Set(SKILL_CATEGORIES.flatMap((c) => c.skills))
).sort((a, b) => a.localeCompare(b));

// Synonym/keyword expansion: a search term maps to extra related skill keywords.
// Matching is substring-based and case-insensitive in both directions.
const SKILL_SYNONYMS: Record<string, string[]> = {
  "graphic designer": ["graphic design", "logo", "brand identity", "visual design", "illustration", "creative", "photoshop", "illustrator", "print"],
  "graphic design": ["logo", "brand identity", "visual design", "illustration", "creative"],
  designer: ["design", "ui/ux", "graphic", "product design", "visual", "creative"],
  creative: ["design", "illustration", "graphic", "art", "visual", "video"],
  developer: ["development", "engineer", "frontend", "backend", "full stack", "programming"],
  programmer: ["development", "developer", "frontend", "backend", "software"],
  "software engineer": ["development", "full stack", "backend", "frontend", "node", "python"],
  "web developer": ["web development", "frontend", "backend", "react", "wordpress", "full stack"],
  "video editor": ["video editing", "video production", "motion graphics", "premiere", "after effects", "animation"],
  video: ["video editing", "video production", "motion graphics", "animation", "videography"],
  writer: ["writing", "copywriting", "content", "blog", "ghostwriting", "editing"],
  marketer: ["marketing", "seo", "ads", "social media", "growth", "content marketing"],
  "social media": ["social media management", "social media marketing", "community", "content"],
  seo: ["search engine", "sem", "google ads", "content marketing"],
  "data scientist": ["data science", "machine learning", "ai", "data analysis", "python", "statistics"],
  "data analyst": ["data analysis", "sql", "excel", "tableau", "power bi", "business intelligence"],
  ai: ["artificial intelligence", "machine learning", "ai development", "deep learning", "nlp", "prompt"],
  "machine learning": ["ai", "deep learning", "data science", "computer vision", "nlp"],
  "virtual assistant": ["admin", "data entry", "customer support", "executive assistant"],
  "project manager": ["project management", "product management", "operations", "scrum", "agile"],
  accountant: ["accounting", "bookkeeping", "financial", "tax"],
  photographer: ["photography", "photo editing", "videography"],
  animator: ["animation", "motion graphics", "2d animation", "3d animation"],
  "ui designer": ["ui/ux", "product design", "figma", "wireframing", "prototyping"],
  "ux designer": ["ui/ux", "product design", "wireframing", "prototyping", "user research"],
  mobile: ["mobile app development", "ios", "android", "react native"],
  ecommerce: ["e-commerce", "shopify", "dropshipping", "amazon fba", "product listing"],
  "e-commerce": ["shopify", "dropshipping", "amazon fba", "product listing"],
};

/** Expand a query into the set of keywords to match against (the query + any synonyms). */
function expandQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = new Set<string>([q]);
  for (const [key, syns] of Object.entries(SKILL_SYNONYMS)) {
    if (key.includes(q) || q.includes(key)) {
      terms.add(key);
      syns.forEach((s) => terms.add(s));
    }
  }
  return Array.from(terms);
}

/**
 * Filter a pool of skill names by a query, synonym-aware.
 * "graphic designer" → Graphic Design, Logo Design, Brand Identity, Illustration, …
 */
export function searchSkills(query: string, pool: string[] = ALL_SKILLS): string[] {
  const terms = expandQuery(query);
  if (terms.length === 0) return pool;
  return pool.filter((skill) => {
    const s = skill.toLowerCase();
    return terms.some((t) => s.includes(t) || t.includes(s));
  });
}

/**
 * Does any of a person's skills (or free text) match the query, synonym-aware?
 * Used to filter talents in the directory.
 */
export function matchesSkillQuery(haystack: string, query: string): boolean {
  const terms = expandQuery(query);
  if (terms.length === 0) return true;
  const h = haystack.toLowerCase();
  return terms.some((t) => h.includes(t));
}
