

# Design Overhaul: "Series A Aesthetic" for SkryveAI

The X feedback is about **visual authority** — making SkryveAI look like a funded, premium product rather than a generic SaaS template. Here's a focused plan addressing each critique:

## What the feedback means, practically

| Critique | Translation | Where it applies |
|----------|------------|-----------------|
| Visual Authority | Premium typography, generous whitespace, refined color palette | Landing page, all sections |
| Executive Precision | Sharp, deliberate design — no generic card grids | Dashboard, campaign flow |
| Surgical Hierarchy | Clear visual priority in audit results — severity should jump out | AnalyzeStep, PitchStep |
| Series A Aesthetic | Polished micro-interactions, sophisticated layouts, trust signals | Everything |

## Plan

### 1. Upgrade the Design System (index.css + tailwind.config.ts)
- Refine typography scale: larger headings (tracking-tight), more whitespace between sections (py-24 instead of py-20)
- Add subtle grain/noise texture overlay for depth
- Introduce a display font weight (800/900) for hero headlines
- Refine shadow system: softer, more layered shadows for cards
- Add `border-subtle` color token for lighter, more refined borders

### 2. Landing Page — Hero Section (HeroSection.tsx)
- Tighten heading line-height, increase max font size to `7xl` on desktop
- Replace plain text stats with glass-morphism stat cards with subtle borders
- Add a subtle animated gradient orb behind the hero for visual depth
- Improve the pill badge design (sharper, with a subtle glow)
- Better button design: add subtle shadow-glow to primary CTA

### 3. Landing Page — Sections (ProblemSection, DifferentiatorsSection, UseCasesSection, FAQSection)
- Problem cards: Add a top-colored accent bar per card instead of flat bg
- Comparison table: Add row hover states, alternating subtle backgrounds
- "How It Works" steps: Replace numbered circles with a connected timeline/rail design
- Campaign type cards: Add a subtle gradient hover effect and refined icon containers
- Increase section spacing consistency to `py-24`

### 4. Audit Results — Surgical Hierarchy (AnalyzeStep.tsx)
- Issue cards: Make severity visually dominant — large colored left border (4px) instead of full background tint
- High severity: bold red left border + stronger text weight
- Add an overall score ring/gauge visualization instead of just a badge count
- Group issues by category with collapsible sections and category headers
- Clearer typography hierarchy: issue title in `font-semibold text-base`, description in `text-sm text-muted`

### 5. Pitch Review — Executive Precision (PitchStep.tsx)
- Redesign pitch cards with a clean email-preview aesthetic (subtle header bar with To/Subject fields)
- Better visual separation between email metadata and body
- Verification badges: larger, more prominent with background pills
- Email edit input: refined inline-edit pattern with clear save/cancel states

### 6. Dashboard Polish (Dashboard.tsx)
- Stat cards: Add subtle gradient backgrounds and larger numbers
- Cleaner card headers with refined spacing
- Better empty states with illustrations or icons

### 7. Global Micro-interactions
- Add `transition-all duration-200` to all interactive cards
- Subtle scale on hover for clickable cards (`hover:scale-[1.02]`)
- Smoother framer-motion transitions (ease curves, stagger children)

### Files to modify
- `src/index.css` — design tokens, textures, new utility classes
- `tailwind.config.ts` — extended theme values
- `src/components/landing/HeroSection.tsx` — hero redesign
- `src/components/landing/ProblemSection.tsx` — refined cards
- `src/components/landing/DifferentiatorsSection.tsx` — polished comparison table
- `src/pages/Landing.tsx` — section spacing, "How It Works" timeline, campaign type cards
- `src/components/campaign/AnalyzeStep.tsx` — surgical hierarchy for audit results
- `src/components/campaign/PitchStep.tsx` — executive email preview design
- `src/pages/Dashboard.tsx` — stat card polish

### Also fix
- `src/lib/cv-download.ts` — resolve the `docx` module import error causing the blank preview

