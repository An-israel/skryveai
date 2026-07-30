// Editable positioning copy — the August pivot puts INTERNATIONAL / REMOTE work
// at the centre of the freelancer message (the real hook), with the waitlist as
// the primary call to action. Change wording here; the surfaces read from it.
export const positioning = {
  // Homepage hero
  heroBadge: "Now live — international remote work for African talent",
  heroLead: "Get hired by",
  heroHighlight: "companies abroad",
  heroTrail: "— work remotely, get paid well",
  heroSub:
    "Skryve vets you once, then puts you in front of international companies hiring remote talent. Browse real remote roles before you sign up.",

  // Calls to action
  primaryCta: { label: "Join the waitlist", to: "/waitlist" },
  secondaryCta: { label: "Find remote work", to: "/signup" },
  clientCta: { label: "Hire talent", to: "/signup?role=client" },

  // SEO
  metaTitle: "Skryve — get hired by companies abroad, work remotely",
  metaDescription:
    "Skryve connects vetted African freelancers with international companies hiring remotely. Get vetted, get matched, get paid well.",
} as const;
