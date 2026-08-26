-- Replaces the 8-skill starter set of vetting briefs with the full 25-skill
-- set of calibrated task briefs (20-min-to-3-hour hands-on work, impossible
-- to fake, with a built-in trap where useful, plus a real submission window).
-- Adds the structured fields the old thin briefs didn't have: exact submit
-- format, named resources, hands-on time estimate, a submission window, and
-- a reviewer checklist (so two reviewers score the same submission the same
-- way, instead of each grading on vibes).

ALTER TABLE public.test_briefs
  ADD COLUMN IF NOT EXISTS submit_format       text,
  ADD COLUMN IF NOT EXISTS resources           text,
  ADD COLUMN IF NOT EXISTS hands_on_time       text,
  ADD COLUMN IF NOT EXISTS submit_within_days  integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reviewer_checklist  jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Per-submission record of which checklist items the reviewer confirmed —
-- the actual "apples to apples" artifact, not just a pass/fail gut call.
ALTER TABLE public.skill_submissions
  ADD COLUMN IF NOT EXISTS checklist_results jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Wholesale replace: the old 8-skill seed used a different, overlapping
-- taxonomy (e.g. both "Web Development" and "Frontend Development" existed
-- as separate, thinner briefs). skill_submissions.test_brief_id is
-- ON DELETE SET NULL, so any historical submissions keep their own copy of
-- what was submitted — only the FK link to the old brief row is cleared.
DELETE FROM public.test_briefs;

INSERT INTO public.test_briefs
  (skill_category, title, brief, submit_format, resources, hands_on_time, submit_within_days, reviewer_checklist, pass_criteria, is_active)
VALUES
(
  'Graphic Design',
  'Design a logo and a small brand kit for a fictional client.',
  'A new coffee brand called Nomad Roast is launching, positioned for people who work out of cafes while traveling. They want a logo, a color palette of 3 to 4 colors, and one supporting graphic, like a social post or a product label mockup.',
  'One PDF containing the logo in at least two variations (full color and single color), the palette with hex codes, and the supporting graphic.',
  'None needed beyond their usual design software.',
  '2 to 3 hours',
  3,
  '["Original concept work, not a template", "Sound typography choices", "Consistency between the logo and the supporting graphic", "Real attention to spacing and layout"]'::jsonb,
  'Original concept work, not a template; sound typography choices; consistency between the logo and the supporting graphic; real attention to spacing and layout.',
  true
),
(
  'UI/UX Design',
  'Redesign one screen of a mobile app.',
  'A budgeting app''s "Add Expense" screen has no visual hierarchy, users say they can''t tell which fields are required. Redesign this one screen, mobile sizing, either iOS or Android, keeping the same core fields: amount, category, date, note.',
  'A Figma link with view access, or an exported PNG or PDF of the redesigned screen, plus 3 to 4 sentences explaining the decisions made.',
  'None needed.',
  '90 minutes',
  2,
  '["Clear visual hierarchy", "Sensible use of spacing and contrast", "Reasoning behind the choices rather than just a nice looking screen"]'::jsonb,
  'Clear visual hierarchy; sensible use of spacing and contrast; reasoning behind the choices rather than just a nice looking screen.',
  true
),
(
  'Frontend Web Development',
  'Build a responsive pricing section from a written description, no design file provided.',
  'Build a pricing page section with three plan cards, Basic, Pro, Team, side by side on desktop and stacked on mobile. Each card needs a plan name, price, three feature bullets, and a button. The Pro card should be visually highlighted as the recommended option.',
  'A CodeSandbox, StackBlitz, or GitHub link with working code, any stack.',
  'None needed.',
  '90 minutes',
  2,
  '["Responsive behavior that actually works", "Clean semantic markup", "The highlighted tier reading as clearly different", "No layout breaks at different widths"]'::jsonb,
  'Responsive behavior that actually works; clean semantic markup; the highlighted tier reading as clearly different; no layout breaks at different widths.',
  true
),
(
  'Backend Web Development',
  'Build a small API endpoint with real logic and validation.',
  'Build a REST API with one endpoint, POST /orders, that accepts a list of items (name, price, quantity) and returns subtotal, a flat 7.5 percent tax, and total as JSON. Reject the request if any quantity is 0 or negative.',
  'A GitHub repo with the code and a short README on running it locally.',
  'None needed, any language or framework.',
  '90 minutes',
  2,
  '["Correct math", "Validation that actually works and isn''t just claimed", "Readable code structure", "A README that lets someone else run it without guessing"]'::jsonb,
  'Correct math; validation that actually works and isn''t just claimed; readable code structure; a README that lets someone else run it without guessing.',
  true
),
(
  'Mobile App Development',
  'Build a single screen with a small logic twist.',
  'Build a one screen counter app. A button increments a count, but every 5th tap should trigger a different background color as a small reward. Any framework, Flutter, React Native, Swift, Kotlin.',
  'A GitHub repo plus a short screen recording or a few screenshots showing it working.',
  'None needed.',
  '60 to 90 minutes',
  2,
  '["Whether the 5th tap logic actually works", "Clean state handling", "Readable code"]'::jsonb,
  'Whether the 5th tap logic actually works; clean state handling; readable code.',
  true
),
(
  'Video Editing',
  'Edit a short promo video from raw stock footage.',
  'Download 3 free stock clips from Pexels or Pixabay related to "city life" or "remote work." Edit them into a 20 to 30 second promo for a fictional productivity app called Flowspace. Include at least one text overlay and a royalty free music track from YouTube Audio Library or Pixabay Music.',
  'Exported MP4, plus a link to the raw clips used.',
  'Pexels or Pixabay for footage and music.',
  '90 minutes',
  3,
  '["Pacing and cut timing", "Whether the text overlay is legible and well timed", "Whether the edit tells a small coherent story instead of clips stitched at random"]'::jsonb,
  'Pacing and cut timing; whether the text overlay is legible and well timed; whether the edit tells a small coherent story instead of clips stitched at random.',
  true
),
(
  'Motion Graphics / Animation',
  'Animate a short logo reveal.',
  'Design a simple text or shape based logo, doesn''t need to be polished, and animate a 5 to 8 second reveal, the kind that opens a YouTube video. It needs at least two distinct motion phases, for example shapes assembling, then settling into place.',
  'Exported MP4 or GIF.',
  'None needed.',
  '90 minutes',
  3,
  '["Smoothness of motion and proper easing, not linear robotic movement", "Timing", "Whether it looks intentional rather than a default template"]'::jsonb,
  'Smoothness of motion and proper easing, not linear robotic movement; timing; whether it looks intentional rather than a default template.',
  true
),
(
  'Content Writing',
  'Write a full blog article to a specific brief.',
  'Write 600 to 800 words titled "Why Most People Quit Their Side Hustle in the First 90 Days," aimed at first time freelancers. It needs real structure, an intro, clear sections, a conclusion, and at least one concrete, specific example, not just general advice.',
  'A Google Doc with view access, or a plain text file.',
  'None needed.',
  '90 minutes',
  2,
  '["Structure and flow", "Whether it says something specific instead of generic filler", "Grammar and readability", "Whether it sounds like a person wrote it"]'::jsonb,
  'Structure and flow; whether it says something specific instead of generic filler; grammar and readability; whether it sounds like a person wrote it.',
  true
),
(
  'Copywriting',
  'Write three ad copy variations with different angles.',
  'Write 3 Facebook ad copy variations, each 40 to 60 words with a headline, for a reusable water bottle that tracks how much you drink through an app. Each variation needs a different angle, for example health tracking, sustainability, or convenience.',
  'Google Doc or plain text.',
  'None needed.',
  '45 to 60 minutes',
  2,
  '["Whether each variation genuinely differs in angle, not just reworded", "Clarity of the call to action", "Whether it reads as persuasive writing rather than a feature list"]'::jsonb,
  'Whether each variation genuinely differs in angle, not just reworded; clarity of the call to action; whether it reads as persuasive writing rather than a feature list.',
  true
),
(
  'SEO',
  'Audit a real, published article and suggest keyword expansion.',
  'Pick any real, publicly published blog article and send the link. Write a short audit covering the likely current target keyword, 3 suggested improvements to the title, headers, or meta description, and 3 related keyword ideas the article is missing.',
  'A one page written report plus the link to the article reviewed.',
  'Any free keyword tool if they want one, not required.',
  '60 minutes',
  2,
  '["Whether suggestions are specific to the actual article, not generic SEO advice copied in", "Sound reasoning behind the keyword choices"]'::jsonb,
  'Whether suggestions are specific to the actual article, not generic SEO advice copied in; sound reasoning behind the keyword choices.',
  true
),
(
  'Social Media Management',
  'Build a 5 day content calendar and write one full caption.',
  'Build a 5 day Instagram content calendar for a fictional independent bakery. For each day give a one line post idea and a content type, reel, carousel, or single image. Then fully write the caption for one of the five days, ready to post.',
  'Google Doc or spreadsheet.',
  'None needed.',
  '60 minutes',
  2,
  '["Real variety across the 5 days", "Whether the written caption sounds human and fits the brand", "Understanding of which content type suits which idea"]'::jsonb,
  'Real variety across the 5 days; whether the written caption sounds human and fits the brand; understanding of which content type suits which idea.',
  true
),
(
  'Paid Ads / Digital Marketing',
  'Plan a small budget ad campaign with a real constraint.',
  'A fictional beginner Excel course wants to run a $500 Facebook campaign to sell a $49 course. Outline a simple campaign: audience(s) to target, primary objective, one piece of ad copy, and how you''d know within the first week if it''s working.',
  'A one page written plan.',
  'None needed.',
  '45 to 60 minutes',
  2,
  '["Sound targeting logic", "A success metric that''s actually measurable that early, not just \"sales\"", "Clear thinking under a small budget constraint"]'::jsonb,
  'Sound targeting logic; a success metric that''s actually measurable that early, not just "sales"; clear thinking under a small budget constraint.',
  true
),
(
  'Data Analysis',
  'Analyze a public dataset and report real findings.',
  'Find a free public dataset from Kaggle or data.gov with at least 500 rows, for example retail sales or movie ratings. Explore it and write a short report with 3 findings that would actually be useful to a business, with at least one supporting chart.',
  'A notebook (Jupyter, Colab, or similar) or a written report with the chart embedded.',
  'Kaggle or data.gov.',
  '2 hours',
  3,
  '["Findings that are genuinely insightful, not just restated numbers", "Chart choices that fit the data", "A written explanation a non-technical person could follow"]'::jsonb,
  'Findings that are genuinely insightful, not just restated numbers; chart choices that fit the data; a written explanation a non-technical person could follow.',
  true
),
(
  'Virtual Assistant / Admin Support',
  'Turn a messy inbox into a clean, prioritized plan.',
  E'Here is the inbox exactly as received:\n\n"From Boss: URGENT, need the vendor invoice sent by end of day. From Client A: can we push our Thursday call to Friday, no rush. Note to self: order more printer ink, running low. From HR: reminder, benefits enrollment closes Friday, needs to be submitted by end of week. From Boss: can you pull together last month''s expense report sometime this week. From Client B: loved the last delivery, when can we start on phase 2. Note to self: book flight for next month''s conference before prices go up. From IT: your laptop is due for a security update, please install this week. From Boss: also, don''t forget the all hands meeting Wednesday at 10am. From Client A: actually ignore my last email, Thursday works fine after all."\n\nTurn this into a clean, prioritized task list or simple calendar for the week, grouped in a way that would actually help someone execute it.',
  'A spreadsheet or document.',
  'None needed.',
  '45 minutes',
  2,
  '["Whether the Client A reversal was actually caught and the schedule reflects it", "Sensible prioritization", "A final format that reduces mental load instead of just reordering the mess"]'::jsonb,
  'Whether the Client A reversal was actually caught and the schedule reflects it; sensible prioritization; a final format that reduces mental load instead of just reordering the mess.',
  true
),
(
  'Voiceover',
  'Record the same script in two distinct tones.',
  E'Record this script twice, once upbeat and energetic, once calm and reassuring.\n\n"Tired of deciding what''s for dinner every single night? Freshly brings chef made meals straight to your door, ready in under ten minutes. No grocery runs. No dishes piling up. Just good food, on your schedule. Try your first week free, only at Freshly dot com."',
  'Two audio files, MP3 or WAV.',
  'Any recording device or mic they normally use.',
  '30 to 45 minutes',
  2,
  '["Clear diction", "Whether the two takes actually sound distinct in tone", "Minimal background noise", "Natural pacing and breathing"]'::jsonb,
  'Clear diction; whether the two takes actually sound distinct in tone; minimal background noise; natural pacing and breathing.',
  true
),
(
  'Illustration',
  'Illustrate a specific scene from a written prompt.',
  'Illustrate this scene in any style: a small robot waters a single plant growing out of a crack in a city sidewalk, at sunset. It needs to be one finished illustration, not a sketch.',
  'A PNG or JPG of the final piece.',
  'None needed.',
  '2 to 3 hours',
  3,
  '["Whether every described element is actually present and recognizable", "Composition and color choices", "Finish quality rather than rough sketch level"]'::jsonb,
  'Whether every described element is actually present and recognizable; composition and color choices; finish quality rather than rough sketch level.',
  true
),
(
  'Translation',
  'Translate a passage while preserving tone, not just meaning.',
  E'Translate this passage into your working language pair and note 2 to 3 phrases that couldn''t be translated literally, explaining how you handled them.\n\n"Most productivity apps make you feel like you''re falling behind the moment you open them. We built ours differently. No streaks to protect, no red notification badges shouting at you. Just a calm space to plan your day and actually get through it. Because staying organized shouldn''t feel like a second job."',
  'The written translation plus the notes on tricky phrases.',
  'Any reference tools they''d normally use.',
  '30 to 45 minutes',
  2,
  '["Whether the tone survived translation, not just a literal word for word conversion", "Fluency", "Thoughtfulness in the notes"]'::jsonb,
  'Whether the tone survived translation, not just a literal word for word conversion; fluency; thoughtfulness in the notes.',
  true
),
(
  'Proofreading & Editing',
  'Fix a flawed paragraph and explain what was wrong.',
  E'Correct this paragraph and list the 3 biggest issues found and why.\n\n"Our platform have helped over thousands of freelancer''s find work since we launched in 2019, which was actually three years ago. Many of user''s report that they got hired within there first week, and some people say it took them several months, so basically everyone gets hired fast. We think that this is do to are strong vetting process, which don''t let just anyone join."',
  'The corrected paragraph plus the list of the 3 biggest issues.',
  'None needed.',
  '20 to 30 minutes',
  2,
  '["Whether the grammar errors were actually caught", "Whether the internal contradiction (everyone gets hired fast, right after saying some took several months) was caught", "Whether meaning problems were caught, not only typos"]'::jsonb,
  'Whether the grammar errors were actually caught; whether the internal contradiction was caught; a good editor catches meaning problems, not only typos.',
  true
),
(
  'Photo Editing & Retouching',
  'Retouch a stock photo to a specific brief.',
  'Download any free stock photo of a person or product from Pexels or Unsplash. Even out the lighting or skin tone if it''s a portrait, remove one distracting background element, and adjust the color grading to feel warmer and more inviting.',
  'A before and after image, side by side or as two files.',
  'Pexels or Unsplash for the base photo.',
  '45 to 60 minutes',
  2,
  '["Whether the edits look natural instead of obviously overdone", "Whether every point in the brief was actually addressed", "Clean edges around anything removed"]'::jsonb,
  'Whether the edits look natural instead of obviously overdone; whether every point in the brief was actually addressed; clean edges around anything removed.',
  true
),
(
  'Bookkeeping & Accounting',
  'Reconcile a set of transactions and catch the discrepancies.',
  E'Here are 10 transactions for January. Build a clean income and expense summary and flag anything that looks off.\n\n"Jan 3, Client payment received, plus 1200. Jan 4, Software subscription, minus 29. Jan 4, Software subscription, minus 29. Jan 10, Client payment received, plus 1200. Jan 12, Office supplies, minus 45. Jan 15, Freelancer payment sent, minus 300. Jan 18, Client payment received, plus 600. Jan 20, Miscellaneous, minus 75. Jan 25, Bank fee, minus 12. Jan 28, Client payment received, plus 900. Note for reference: the invoice on file for the Jan 10 payment shows 850, not 1200."',
  'A spreadsheet with the clean summary and a short note on discrepancies found.',
  'None needed.',
  '30 to 45 minutes',
  2,
  '["Whether the duplicate Jan 4 entry was caught", "Whether the Jan 10 invoice mismatch was caught", "Accurate final totals and a clean, readable presentation"]'::jsonb,
  'Whether the duplicate Jan 4 entry and the Jan 10 invoice mismatch were both caught; accurate final totals; a clean and readable presentation.',
  true
),
(
  'Project Management',
  'Turn a vague one line brief into a real project plan.',
  'A client says: "We need a new landing page for our product launch, ideally live in 3 weeks." That''s the whole brief given. Build a simple project plan, phases and tasks with rough time estimates, and flag at least 2 questions that would need answering before work could realistically start.',
  'A project timeline in a spreadsheet, doc, or a tool like Notion or Trello, exported or shared.',
  'None needed.',
  '45 to 60 minutes',
  2,
  '["Whether the plan is realistic inside 3 weeks", "Whether the flagged questions are the ones that actually matter (scope, content readiness, sign-off)", "No generic filler questions"]'::jsonb,
  'Whether the plan is realistic inside 3 weeks; whether the flagged questions are the ones that actually matter, not generic filler.',
  true
),
(
  'Email Marketing',
  'Write a 3 email welcome sequence with a distinct job for each email.',
  'Write a 3 email sequence for someone who just started a free trial of a fictional invoicing tool for freelancers. Email 1 sends immediately, email 2 three days later, email 3 seven days later. Each needs a subject line and full body, and each should do something different, not repeat the same pitch three times.',
  'A Google Doc or plain text with all three emails clearly labeled.',
  'None needed.',
  '60 to 90 minutes',
  2,
  '["Whether each email genuinely has a different purpose (e.g. onboarding, feature highlight, urgency)", "Subject line quality", "Whether the tone stays consistent across all three"]'::jsonb,
  'Whether each email genuinely has a different purpose; subject line quality; whether the tone stays consistent across all three.',
  true
),
(
  'QA / Software Testing',
  'Write test cases that actually cover edge cases, not just the happy path.',
  'A checkout form has three fields, card number, expiry date, CVV, and a Pay Now button. Write 10 test cases covering expected behavior and edge cases, for example an expired card, a CVV containing letters, an empty field, a card number that''s too short. State the input and the expected result for each.',
  'A document or spreadsheet listing all 10 test cases.',
  'None needed.',
  '45 minutes',
  2,
  '["Genuine edge case coverage instead of 10 versions of the same successful path", "Correctness of the expected results", "Clarity of how each case is written"]'::jsonb,
  'Genuine edge case coverage instead of 10 versions of the same successful path; correctness of the expected results; clarity of how each case is written.',
  true
),
(
  'Data Science / Machine Learning',
  'Build a simple predictive model and explain it in plain language.',
  'Pick a small public dataset from Kaggle with a clear target variable, for example housing prices. Build a simple model to predict that variable, then write a short explanation of which features mattered most and why, in language a non-technical person could actually understand.',
  'A notebook (Colab or Jupyter, link or export) plus the plain language summary.',
  'Kaggle for the dataset.',
  '2 to 3 hours',
  3,
  '["A sound modeling approach even if simple", "A plain language explanation that''s genuinely clear", "Basic rigor like checking for obvious data issues"]'::jsonb,
  'A sound modeling approach even if simple; a plain language explanation that''s genuinely clear; basic rigor like checking for obvious data issues.',
  true
),
(
  'Music Production / Sound Design',
  'Produce a short original loop to a mood brief.',
  'Produce a 20 to 30 second original instrumental loop for a calm, minimalist productivity app. It should feel unobtrusive, no vocals, no jarring transitions, something someone could listen to on repeat while working.',
  'An exported MP3 or WAV.',
  'Whatever DAW or tools they normally use.',
  '2 hours',
  3,
  '["Whether it actually loops cleanly", "Whether the mood matches the brief instead of skewing energetic or dramatic", "Basic mixing quality, not just a good idea poorly produced"]'::jsonb,
  'Whether it actually loops cleanly; whether the mood matches the brief instead of skewing energetic or dramatic; basic mixing quality.',
  true
);
