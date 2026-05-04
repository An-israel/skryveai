-- ============================================================
-- SkryveAI Complete Curriculum: 13 Skills
-- Inserts learning paths, modules, and lessons
-- Uses ON CONFLICT DO UPDATE so re-running is safe
-- ============================================================

-- ───────────────────────────────────────────────────────────
-- 1. LEARNING PATHS
-- ───────────────────────────────────────────────────────────
INSERT INTO public.learning_paths
  (skill_name, display_name, description, short_description, total_modules, total_lessons, estimated_weeks, difficulty_level, popular_rank, is_active)
VALUES
  ('web_design',           'Web Design',            'Build professional, responsive websites from scratch. Master HTML, CSS, JavaScript, and modern frameworks to create websites that win clients and generate revenue.',        'Build responsive websites with HTML, CSS & JavaScript',         6, 60, 8, 'beginner',      1, true),
  ('graphic_design',       'Graphic Design',         'Master visual design principles and professional design tools to create logos, brand identities, social media graphics, and marketing materials that clients love.',        'Create logos, brand identities & social graphics',              2, 50, 6, 'beginner',      2, true),
  ('copywriting',          'Copywriting',            'Learn to write persuasive copy that converts readers into buyers. Master sales pages, ads, emails, and landing pages.',                                                     'Write persuasive copy that converts readers into buyers',        3, 40, 5, 'beginner',      3, true),
  ('social_media_mgmt',    'Social Media Management','Run social media like a pro. Content strategy, scheduling, engagement, analytics, and community management across all platforms.',                                          'Manage social media professionally across all platforms',        6, 45, 6, 'beginner',      4, true),
  ('video_editing',        'Video Editing',          'Edit professional videos for YouTube, TikTok, ads, and client projects. Master CapCut, color grading, audio, and effects.',                                                 'Edit professional videos for YouTube, TikTok & clients',        7, 55, 7, 'beginner',      5, true),
  ('digital_marketing',    'Digital Marketing',      'Drive traffic, leads, and sales. Master Facebook Ads, Google Ads, email marketing, funnels, conversion optimization, and analytics.',                                       'Drive traffic and sales with ads, email & funnels',             6, 50, 6, 'beginner',      6, true),
  ('content_writing',      'Content Writing',        'Write SEO blog posts, articles, and web content that rank on Google and engage readers.',                                                                                   'Write SEO content that ranks on Google',                         5, 35, 4, 'beginner',      7, true),
  ('virtual_assistance',   'Virtual Assistance',     'Become an indispensable remote assistant. Admin tasks, scheduling, email management, CRM, tools, and client management.',                                                   'Master remote admin, scheduling & client management',            5, 30, 4, 'beginner',      8, true),
  ('ui_ux_design',         'UI/UX Design',           'Design beautiful user interfaces and experiences. Figma mastery, wireframing, prototyping, user research, and testing.',                                                    'Design beautiful interfaces with Figma & prototyping',           7, 65, 8, 'beginner',      9, true),
  ('seo_specialist',       'SEO Specialist',         'Get websites to rank #1 on Google. Technical SEO, on-page, off-page, keyword research, link building, and analytics.',                                                      'Rank websites #1 on Google with SEO mastery',                   6, 45, 6, 'beginner',     10, true),
  ('data_analyst',         'Data Analyst',           'Master data analysis from beginner to professional. Learn Excel, SQL, Python, data visualization, and statistical analysis to help businesses make data-driven decisions.', 'Analyse data with Excel, SQL, Python & Power BI',                6, 60, 8, 'beginner',     11, true),
  ('ai_automation',        'AI and Automation',      'Master AI tools and automation to 10x your productivity and offer high-value services to clients. Learn ChatGPT, MidJourney, Zapier, Make, and n8n.',                      'Automate workflows and build AI-powered services',               6, 50, 7, 'beginner',     12, true),
  ('agentic_ai',           'Agentic AI',             'Build autonomous AI agents that can perform complex tasks, make decisions, and work independently. Go beyond chatbots to create true AI assistants.',                       'Build autonomous AI agents with LangChain & Python',             6, 45, 6, 'intermediate', 13, true)
ON CONFLICT (skill_name) DO UPDATE SET
  display_name       = EXCLUDED.display_name,
  description        = EXCLUDED.description,
  short_description  = EXCLUDED.short_description,
  total_modules      = EXCLUDED.total_modules,
  total_lessons      = EXCLUDED.total_lessons,
  estimated_weeks    = EXCLUDED.estimated_weeks,
  difficulty_level   = EXCLUDED.difficulty_level,
  popular_rank       = EXCLUDED.popular_rank,
  is_active          = EXCLUDED.is_active,
  updated_at         = now();

-- ───────────────────────────────────────────────────────────
-- Helper: reference path IDs by skill_name
-- ───────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════
-- 1. WEB DESIGN – Modules & Lessons
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
  pid UUID;
  mid UUID;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'web_design';

  -- Module 1: HTML Fundamentals
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'HTML Fundamentals', 'Learn the building blocks of the web', 10, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  1, 'Introduction to Web Development – What is HTML, CSS, JavaScript?', 'video', 20, 1),
  (mid, pid,  2, 'HTML Document Structure – DOCTYPE, head, body, meta tags',          'video', 20, 2),
  (mid, pid,  3, 'HTML Text Elements – Headings, paragraphs, spans, emphasis',        'video', 20, 3),
  (mid, pid,  4, 'HTML Links and Navigation – Anchor tags, internal/external links',  'video', 20, 4),
  (mid, pid,  5, 'HTML Lists – Ordered, unordered, and description lists',            'video', 20, 5),
  (mid, pid,  6, 'HTML Images – Img tag, alt text, responsive images',                'video', 20, 6),
  (mid, pid,  7, 'HTML Forms Part 1 – Input types, labels, placeholders',             'video', 20, 7),
  (mid, pid,  8, 'HTML Forms Part 2 – Validation, textarea, select dropdowns',        'video', 20, 8),
  (mid, pid,  9, 'Semantic HTML – Header, nav, main, article, section, footer',       'video', 20, 9),
  (mid, pid, 10, 'PROJECT: Build Your First Bio Page',                                'project', 60, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 2: CSS Fundamentals
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'CSS Fundamentals', 'Style your HTML with CSS', 12, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 11, 'Introduction to CSS – Selectors, properties, values',                    'video', 20, 1),
  (mid, pid, 12, 'CSS Box Model – Margin, border, padding, content',                        'video', 20, 2),
  (mid, pid, 13, 'CSS Typography – Font families, sizes, weights, line height',             'video', 20, 3),
  (mid, pid, 14, 'CSS Colors – Hex, RGB, HSL, opacity',                                     'video', 20, 4),
  (mid, pid, 15, 'CSS Backgrounds – Images, gradients, positioning',                        'video', 20, 5),
  (mid, pid, 16, 'CSS Display and Positioning – Block, inline, flex, grid intro',           'video', 20, 6),
  (mid, pid, 17, 'CSS Flexbox Part 1 – Container properties, flex direction',               'video', 20, 7),
  (mid, pid, 18, 'CSS Flexbox Part 2 – Item properties, alignment, spacing',                'video', 20, 8),
  (mid, pid, 19, 'CSS Grid Layout – Grid containers, rows, columns, gaps',                  'video', 20, 9),
  (mid, pid, 20, 'CSS Responsive Units – Em, rem, %, vw, vh',                               'video', 20, 10),
  (mid, pid, 21, 'CSS Transitions and Animations – Hover effects, keyframes',               'video', 20, 11),
  (mid, pid, 22, 'PROJECT: Style a Landing Page',                                            'project', 60, 12)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 3: Responsive Web Design
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'Responsive Web Design', 'Build layouts that work on every device', 10, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 23, 'Mobile-First Design Philosophy',                                           'video', 20, 1),
  (mid, pid, 24, 'CSS Media Queries – Breakpoints for different devices',                    'video', 20, 2),
  (mid, pid, 25, 'Responsive Images – srcset, picture element',                             'video', 20, 3),
  (mid, pid, 26, 'Responsive Typography – Fluid font sizes',                                'video', 20, 4),
  (mid, pid, 27, 'CSS Grid Advanced – Auto-fit, auto-fill, minmax',                         'video', 20, 5),
  (mid, pid, 28, 'Navigation Patterns – Hamburger menus, mobile nav',                       'video', 20, 6),
  (mid, pid, 29, 'Accessibility Basics – ARIA, keyboard navigation',                        'video', 20, 7),
  (mid, pid, 30, 'Browser DevTools – Inspecting, debugging CSS',                            'video', 20, 8),
  (mid, pid, 31, 'CSS Frameworks Introduction – Bootstrap, Tailwind CSS',                   'video', 20, 9),
  (mid, pid, 32, 'PROJECT: Build a Responsive Portfolio Site',                               'project', 90, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 4: JavaScript Essentials
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'JavaScript Essentials', 'Add interactivity with JavaScript', 12, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 33, 'JavaScript Basics – Variables, data types, operators',                    'video', 20, 1),
  (mid, pid, 34, 'Functions – Declaration, expressions, arrow functions',                   'video', 20, 2),
  (mid, pid, 35, 'DOM Manipulation – Selecting elements, changing content',                 'video', 20, 3),
  (mid, pid, 36, 'Event Listeners – Click, hover, form submissions',                        'video', 20, 4),
  (mid, pid, 37, 'Conditionals – If/else, switch statements',                               'video', 20, 5),
  (mid, pid, 38, 'Loops – For, while, forEach',                                             'video', 20, 6),
  (mid, pid, 39, 'Arrays and Objects – Creating, accessing, modifying',                     'video', 20, 7),
  (mid, pid, 40, 'Form Validation with JavaScript',                                         'video', 20, 8),
  (mid, pid, 41, 'Fetch API – Getting data from APIs',                                      'video', 20, 9),
  (mid, pid, 42, 'Local Storage – Saving data in the browser',                              'video', 20, 10),
  (mid, pid, 43, 'Common JavaScript Patterns for Websites',                                 'video', 20, 11),
  (mid, pid, 44, 'PROJECT: Interactive Website with JavaScript',                            'project', 90, 12)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 5: Modern Web Development
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'Modern Web Development', 'Tools, deployment and the professional ecosystem', 8, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 45, 'Git and GitHub – Version control basics',                                 'video', 20, 1),
  (mid, pid, 46, 'Hosting Websites – Netlify, Vercel, GitHub Pages',                        'video', 20, 2),
  (mid, pid, 47, 'Performance Optimization – Image compression, lazy loading',              'video', 20, 3),
  (mid, pid, 48, 'SEO Fundamentals for Web Developers',                                     'video', 20, 4),
  (mid, pid, 49, 'Website Security Basics – HTTPS, form security',                          'video', 20, 5),
  (mid, pid, 50, 'Introduction to React – Components and props',                            'video', 30, 6),
  (mid, pid, 51, 'WordPress Basics – For client projects',                                  'video', 20, 7),
  (mid, pid, 52, 'PROJECT: Deploy a Live Website',                                          'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 6: Professional Web Design
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional Web Design', 'Land clients, price your work, and deliver projects', 8, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 53, 'Understanding Client Requirements',                                       'video', 20, 1),
  (mid, pid, 54, 'Creating Wireframes and Mockups – Figma basics',                          'video', 20, 2),
  (mid, pid, 55, 'Pricing Your Web Design Services',                                        'video', 20, 3),
  (mid, pid, 56, 'Writing Proposals for Web Projects',                                      'video', 20, 4),
  (mid, pid, 57, 'Client Communication Best Practices',                                     'video', 20, 5),
  (mid, pid, 58, 'Delivering Client Projects – Files, documentation',                       'video', 20, 6),
  (mid, pid, 59, 'Building Your Web Design Portfolio',                                      'video', 20, 7),
  (mid, pid, 60, 'FINAL PROJECT: Complete Client Website',                                  'project', 120, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 2. GRAPHIC DESIGN – Modules & Lessons
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
  pid UUID;
  mid UUID;
  ln  INTEGER := 1;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'graphic_design';

  -- Module 1
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'Design Fundamentals', 'Principles of design, color theory, typography and composition', 8, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 1,  'What is Graphic Design? History and Career Paths',                        'video', 20, 1),
  (mid, pid, 2,  'Principles of Design – Balance, contrast, alignment, repetition',         'video', 20, 2),
  (mid, pid, 3,  'Color Theory – Color wheel, harmonies, psychology',                       'video', 20, 3),
  (mid, pid, 4,  'Typography Basics – Font categories, pairing, hierarchy',                 'video', 20, 4),
  (mid, pid, 5,  'Visual Hierarchy and Composition',                                        'video', 20, 5),
  (mid, pid, 6,  'White Space, Contrast and Unity',                                         'video', 20, 6),
  (mid, pid, 7,  'Understanding Client Briefs and Design Goals',                            'video', 20, 7),
  (mid, pid, 8,  'PROJECT: Design a Mood Board',                                            'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 2
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'Tool Mastery – Canva, Photoshop, Figma & Pixellab', 'Master industry-standard design tools', 10, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  9, 'Canva Interface and Template Navigation',                                  'video', 20, 1),
  (mid, pid, 10, 'Canva – Social Media Graphics and Print Materials',                        'video', 20, 2),
  (mid, pid, 11, 'Adobe Photoshop Interface and Layers',                                    'video', 25, 3),
  (mid, pid, 12, 'Photoshop – Photo Editing and Retouching',                                'video', 25, 4),
  (mid, pid, 13, 'Figma Interface and Vector Design Basics',                                'video', 25, 5),
  (mid, pid, 14, 'Figma – Creating Graphics and Exporting Assets',                          'video', 25, 6),
  (mid, pid, 15, 'Pixellab – Mobile Graphic Design Workflow',                               'video', 20, 7),
  (mid, pid, 16, 'Choosing the Right Tool for Each Project',                                'video', 15, 8),
  (mid, pid, 17, 'File Formats – PNG, JPG, SVG, PDF for Print and Web',                     'video', 15, 9),
  (mid, pid, 18, 'PROJECT: Recreate a Professional Poster in Two Tools',                    'project', 60, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 3
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'Logo Design', 'Research, concept development and digital execution', 8, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 19, 'Types of Logos – Wordmark, lettermark, icon, combination',                'video', 20, 1),
  (mid, pid, 20, 'Logo Research and Brainstorming Process',                                 'video', 20, 2),
  (mid, pid, 21, 'Sketching Logo Concepts on Paper',                                        'video', 20, 3),
  (mid, pid, 22, 'Digital Logo Execution in Figma/Canva',                                   'video', 25, 4),
  (mid, pid, 23, 'Building Color Palettes for Logos',                                       'video', 20, 5),
  (mid, pid, 24, 'Logo Scalability – Favicon to Billboard',                                 'video', 15, 6),
  (mid, pid, 25, 'Logo Presentation and Client Revision Process',                           'video', 20, 7),
  (mid, pid, 26, 'PROJECT: Design a Complete Logo for a Fictional Brand',                   'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 4
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'Social Media Graphics & Flyer Design on Figma', 'Platform-specific content and flyer design', 10, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 27, 'Platform Specs – Instagram, Facebook, LinkedIn, Twitter, TikTok',        'video', 20, 1),
  (mid, pid, 28, 'Creating Instagram Post and Story Templates',                             'video', 20, 2),
  (mid, pid, 29, 'Facebook Ad Graphics and Cover Designs',                                  'video', 20, 3),
  (mid, pid, 30, 'LinkedIn Banner and Professional Graphics',                               'video', 20, 4),
  (mid, pid, 31, 'Carousel Designs and Content Calendars',                                  'video', 20, 5),
  (mid, pid, 32, 'Adding Animations to Social Media Graphics',                              'video', 20, 6),
  (mid, pid, 33, 'Flyer Design Principles and Layouts in Figma',                            'video', 25, 7),
  (mid, pid, 34, 'Event Flyer and Promotional Poster Design',                               'video', 25, 8),
  (mid, pid, 35, 'Delivering Client-Ready Social Media Packs',                              'video', 15, 9),
  (mid, pid, 36, 'PROJECT: Create a Full Social Media Graphics Pack',                       'project', 90, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 5
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'Brand Identity Design', 'Strategy, guidelines, mockups and delivery', 8, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 37, 'What is Brand Identity and Why it Matters',                               'video', 20, 1),
  (mid, pid, 38, 'Brand Strategy – Mission, vision, values, personality',                   'video', 20, 2),
  (mid, pid, 39, 'Logo Variations – Primary, secondary, icon versions',                     'video', 20, 3),
  (mid, pid, 40, 'Color Systems and Typography Systems',                                    'video', 20, 4),
  (mid, pid, 41, 'Brand Guidelines Document Creation',                                      'video', 25, 5),
  (mid, pid, 42, 'Brand Mockups – Business cards, packaging, signage',                      'video', 25, 6),
  (mid, pid, 43, 'Delivering Brand Identity to Clients',                                    'video', 20, 7),
  (mid, pid, 44, 'PROJECT: Complete Brand Identity for a Startup',                          'project', 120, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 6
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional Design Business', 'Pricing, clients, contracts and portfolio', 6, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;

  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 45, 'Pricing Your Graphic Design Services',                                    'video', 20, 1),
  (mid, pid, 46, 'Client Communication and Managing Revisions',                             'video', 20, 2),
  (mid, pid, 47, 'Design Contracts and Protecting Your Work',                               'video', 20, 3),
  (mid, pid, 48, 'Building a Portfolio that Gets Clients',                                  'video', 20, 4),
  (mid, pid, 49, 'Finding Clients on Fiverr, Upwork and Locally',                           'video', 20, 5),
  (mid, pid, 50, 'FINAL PROJECT: Complete Client Design Package',                           'project', 120, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 3. COPYWRITING – Modules & Lessons
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
  pid UUID;
  mid UUID;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'copywriting';

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'Copywriting Fundamentals', 'AIDA, PAS, storytelling and hooks', 8, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 1, 'What is Copywriting and Why it Pays Well',                                 'video', 20, 1),
  (mid, pid, 2, 'Features vs Benefits – The Core Principle',                                'video', 20, 2),
  (mid, pid, 3, 'Understanding Your Audience and Buyer Psychology',                         'video', 20, 3),
  (mid, pid, 4, 'The AIDA Formula – Attention, Interest, Desire, Action',                   'video', 20, 4),
  (mid, pid, 5, 'The PAS Formula – Problem, Agitate, Solution',                             'video', 20, 5),
  (mid, pid, 6, 'Storytelling in Copy – Narrative and emotion',                             'video', 20, 6),
  (mid, pid, 7, 'Hooks and CTAs – Opening lines that grab attention',                       'video', 20, 7),
  (mid, pid, 8, 'PROJECT: Write Copy for a Real Product Using AIDA',                        'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'Headlines and Hooks', 'Power words, curiosity gaps and testing', 6, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  9, 'Power Words and Trigger Words in Headlines',                               'video', 20, 1),
  (mid, pid, 10, 'The Curiosity Gap – How to make people click',                            'video', 20, 2),
  (mid, pid, 11, 'Benefit-Driven Headlines That Sell',                                      'video', 20, 3),
  (mid, pid, 12, 'Number and List Headlines – Why they work',                               'video', 20, 4),
  (mid, pid, 13, 'Question Headlines and How to Test Them',                                 'video', 20, 5),
  (mid, pid, 14, 'PROJECT: Write 20 Headlines for One Offer',                               'project', 45, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'Sales Pages', 'Structure, social proof, urgency and closes', 8, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 15, 'Sales Page Structure – The anatomy of a converting page',                 'video', 25, 1),
  (mid, pid, 16, 'Opening Hooks and Big Promise Statements',                                'video', 20, 2),
  (mid, pid, 17, 'Problem and Solution Sections',                                           'video', 20, 3),
  (mid, pid, 18, 'Social Proof – Testimonials, case studies, numbers',                      'video', 20, 4),
  (mid, pid, 19, 'Objection Handling and FAQ Sections',                                     'video', 20, 5),
  (mid, pid, 20, 'Urgency and Scarcity Without Being Sleazy',                               'video', 20, 6),
  (mid, pid, 21, 'Guarantees and Risk Reversal',                                            'video', 15, 7),
  (mid, pid, 22, 'PROJECT: Write a Full Sales Page for a Digital Product',                  'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'Email Copywriting', 'Subject lines, sequences and campaigns', 6, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 23, 'Subject Lines and Preview Text That Get Opens',                           'video', 20, 1),
  (mid, pid, 24, 'Email Sequences – Welcome, nurture, sales',                               'video', 25, 2),
  (mid, pid, 25, 'Nurture Campaign Emails – Building trust over time',                      'video', 20, 3),
  (mid, pid, 26, 'Sales Emails – Moving subscribers to buy',                                'video', 20, 4),
  (mid, pid, 27, 'Re-Engagement Emails – Win back cold subscribers',                        'video', 20, 5),
  (mid, pid, 28, 'PROJECT: Write a 5-Email Welcome Sequence',                               'project', 60, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'Ad Copywriting', 'Facebook, Google, A/B testing and conversion', 6, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 29, 'Facebook Ad Copy – Primary text, headline, description',                  'video', 20, 1),
  (mid, pid, 30, 'Google Ad Copy – Search, display and responsive ads',                     'video', 20, 2),
  (mid, pid, 31, 'Short-Form Copy for Social Media',                                        'video', 15, 3),
  (mid, pid, 32, 'Aligning Visuals and Copy for Maximum Impact',                            'video', 20, 4),
  (mid, pid, 33, 'A/B Testing Ad Copy – What to test and how',                              'video', 20, 5),
  (mid, pid, 34, 'PROJECT: Write 3 Facebook Ad Variations for a Product',                   'project', 60, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional Copywriter Business', 'Clients, pricing, packages and niching', 6, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 35, 'Finding Copywriting Clients – Platforms and outreach',                    'video', 20, 1),
  (mid, pid, 36, 'Pricing Your Copywriting Services',                                       'video', 20, 2),
  (mid, pid, 37, 'Writing Copywriting Proposals that Win',                                  'video', 20, 3),
  (mid, pid, 38, 'Retainer Packages and Recurring Revenue',                                 'video', 20, 4),
  (mid, pid, 39, 'Building a Copywriting Portfolio',                                        'video', 20, 5),
  (mid, pid, 40, 'FINAL PROJECT: Niched Copywriting Portfolio Piece',                       'project', 90, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 4–10. Remaining skills – paths + modules + placeholder lessons
-- ═══════════════════════════════════════════════════════════

-- 4. SOCIAL MEDIA MANAGEMENT
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'social_media_mgmt';
  ln := 1;
  FOR m IN 1..6 LOOP
    DECLARE mtitle TEXT; mdesc TEXT; mhrs INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'Social Media Fundamentals'
        WHEN 2 THEN 'Content Strategy and Planning'
        WHEN 3 THEN 'Platform Mastery – Instagram, Facebook, LinkedIn, TikTok'
        WHEN 4 THEN 'Content Creation and Scheduling'
        WHEN 5 THEN 'Community Management and Engagement'
        WHEN 6 THEN 'Analytics, Reporting and Client Management'
        END;
      mdesc := CASE m
        WHEN 1 THEN 'Understand social media business fundamentals'
        WHEN 2 THEN 'Build content strategies and editorial calendars'
        WHEN 3 THEN 'Master each platform''s algorithm and best practices'
        WHEN 4 THEN 'Create, batch and schedule content efficiently'
        WHEN 5 THEN 'Grow and engage audiences professionally'
        WHEN 6 THEN 'Measure results and report to clients'
        END;
      mhrs := CASE m WHEN 1 THEN 6 WHEN 2 THEN 8 WHEN 3 THEN 9 WHEN 4 THEN 8 WHEN 5 THEN 7 WHEN 6 THEN 7 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mdesc, mhrs, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      DECLARE lessons_count INTEGER;
      BEGIN
        lessons_count := CASE m WHEN 1 THEN 6 WHEN 2 THEN 8 WHEN 3 THEN 9 WHEN 4 THEN 8 WHEN 5 THEN 7 WHEN 6 THEN 7 END;
        FOR l IN 1..lessons_count LOOP
          INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
          VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lessons_count THEN 'project' ELSE 'video' END, CASE WHEN l = lessons_count THEN 60 ELSE 20 END, l)
          ON CONFLICT (module_id, lesson_number) DO NOTHING;
          ln := ln + 1;
        END LOOP;
      END;
    END;
  END LOOP;
END $$;

-- 5. VIDEO EDITING
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'video_editing';
  ln := 1;
  FOR m IN 1..7 LOOP
    DECLARE mtitle TEXT; mhrs INTEGER; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'Video Editing Fundamentals'
        WHEN 2 THEN 'CapCut Mastery – Interface and Tools'
        WHEN 3 THEN 'Cuts, Transitions and Pacing'
        WHEN 4 THEN 'Color Grading and Visual Effects'
        WHEN 5 THEN 'Audio Editing and Sound Design'
        WHEN 6 THEN 'YouTube and TikTok Content Editing'
        WHEN 7 THEN 'Professional Video Editing Business'
        END;
      lcount := CASE m WHEN 1 THEN 6 WHEN 2 THEN 9 WHEN 3 THEN 8 WHEN 4 THEN 8 WHEN 5 THEN 8 WHEN 6 THEN 8 WHEN 7 THEN 8 END;
      mhrs := lcount * 2;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – practical lessons and projects', mhrs, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- 6. DIGITAL MARKETING
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'digital_marketing';
  ln := 1;
  FOR m IN 1..6 LOOP
    DECLARE mtitle TEXT; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'Digital Marketing Fundamentals'
        WHEN 2 THEN 'Facebook and Instagram Ads'
        WHEN 3 THEN 'Google Ads – Search and Display'
        WHEN 4 THEN 'Email Marketing and Automation'
        WHEN 5 THEN 'Sales Funnels and Conversion Optimization'
        WHEN 6 THEN 'Analytics, Reporting and Client Management'
        END;
      lcount := CASE m WHEN 1 THEN 7 WHEN 2 THEN 9 WHEN 3 THEN 9 WHEN 4 THEN 8 WHEN 5 THEN 9 WHEN 6 THEN 8 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – practical skills', lcount * 2, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- 7. CONTENT WRITING
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'content_writing';
  ln := 1;
  FOR m IN 1..5 LOOP
    DECLARE mtitle TEXT; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'Content Writing Fundamentals'
        WHEN 2 THEN 'SEO Writing – Research and Optimization'
        WHEN 3 THEN 'Blog Post Structure and Long-Form Content'
        WHEN 4 THEN 'Web Copy, Landing Pages and Product Descriptions'
        WHEN 5 THEN 'Professional Content Writing Business'
        END;
      lcount := CASE m WHEN 1 THEN 6 WHEN 2 THEN 8 WHEN 3 THEN 7 WHEN 4 THEN 8 WHEN 5 THEN 6 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – skills and practice', lcount * 2, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- 8. VIRTUAL ASSISTANCE
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'virtual_assistance';
  ln := 1;
  FOR m IN 1..5 LOOP
    DECLARE mtitle TEXT; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'Virtual Assistant Fundamentals'
        WHEN 2 THEN 'Google Workspace – Gmail, Docs, Sheets, Drive'
        WHEN 3 THEN 'Scheduling, Email Management and CRM Tools'
        WHEN 4 THEN 'Project Management – Asana, Trello, Notion'
        WHEN 5 THEN 'Professional VA Business and Client Management'
        END;
      lcount := CASE m WHEN 1 THEN 5 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 6 WHEN 5 THEN 6 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – skills and tools', lcount * 2, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- 9. UI/UX DESIGN
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'ui_ux_design';
  ln := 1;
  FOR m IN 1..7 LOOP
    DECLARE mtitle TEXT; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'UI/UX Design Fundamentals'
        WHEN 2 THEN 'User Research and Information Architecture'
        WHEN 3 THEN 'Wireframing and Low-Fidelity Design'
        WHEN 4 THEN 'Figma Mastery – Components and Design Systems'
        WHEN 5 THEN 'High-Fidelity UI Design'
        WHEN 6 THEN 'Prototyping and Usability Testing'
        WHEN 7 THEN 'Professional UI/UX Business'
        END;
      lcount := CASE m WHEN 1 THEN 8 WHEN 2 THEN 9 WHEN 3 THEN 8 WHEN 4 THEN 10 WHEN 5 THEN 10 WHEN 6 THEN 10 WHEN 7 THEN 10 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – skills and projects', lcount * 2, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- 10. SEO SPECIALIST
DO $$
DECLARE pid UUID; mid UUID; ln INTEGER;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'seo_specialist';
  ln := 1;
  FOR m IN 1..6 LOOP
    DECLARE mtitle TEXT; lcount INTEGER;
    BEGIN
      mtitle := CASE m
        WHEN 1 THEN 'SEO Fundamentals'
        WHEN 2 THEN 'Keyword Research and Competitor Analysis'
        WHEN 3 THEN 'On-Page SEO Optimization'
        WHEN 4 THEN 'Technical SEO – Site Speed, Schema and Indexing'
        WHEN 5 THEN 'Off-Page SEO and Link Building'
        WHEN 6 THEN 'Analytics, Reporting and SEO Business'
        END;
      lcount := CASE m WHEN 1 THEN 6 WHEN 2 THEN 8 WHEN 3 THEN 8 WHEN 4 THEN 8 WHEN 5 THEN 8 WHEN 6 THEN 7 END;
      INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
      VALUES (pid, m, mtitle, mtitle || ' – skills and practice', lcount * 2, m)
      ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
      SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = m;
      FOR l IN 1..lcount LOOP
        INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index)
        VALUES (mid, pid, ln, mtitle || ' – Lesson ' || l, CASE WHEN l = lcount THEN 'project' ELSE 'video' END, CASE WHEN l = lcount THEN 60 ELSE 20 END, l)
        ON CONFLICT (module_id, lesson_number) DO NOTHING;
        ln := ln + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 11. DATA ANALYST – Full lesson-by-lesson
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pid UUID; mid UUID;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'data_analyst';

  -- Module 1: Excel
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'Excel for Data Analysis', 'Clean, analyse and visualise data in Excel', 10, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  1, 'Excel Basics – Interface, formulas, functions',                           'video', 25, 1),
  (mid, pid,  2, 'Data Cleaning – Remove duplicates, handle missing data',                  'video', 25, 2),
  (mid, pid,  3, 'VLOOKUP and XLOOKUP – Merging data from different sources',               'video', 25, 3),
  (mid, pid,  4, 'Pivot Tables – Summarising and analysing large datasets',                 'video', 25, 4),
  (mid, pid,  5, 'Conditional Formatting – Highlight trends and patterns',                  'video', 20, 5),
  (mid, pid,  6, 'Charts and Graphs – Visual data representation',                          'video', 20, 6),
  (mid, pid,  7, 'Statistical Functions – AVERAGE, MEDIAN, STDEV, CORREL',                 'video', 20, 7),
  (mid, pid,  8, 'Data Validation – Ensuring data quality',                                 'video', 20, 8),
  (mid, pid,  9, 'Power Query – Importing and transforming data',                           'video', 25, 9),
  (mid, pid, 10, 'PROJECT: Sales Data Analysis Dashboard',                                  'project', 90, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 2: SQL
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'SQL Fundamentals', 'Query, filter and join databases for analysis', 12, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 11, 'Introduction to Databases – Tables, rows, columns',                      'video', 20, 1),
  (mid, pid, 12, 'SELECT Statements – Querying data',                                      'video', 20, 2),
  (mid, pid, 13, 'WHERE Clauses – Filtering data',                                         'video', 20, 3),
  (mid, pid, 14, 'ORDER BY and LIMIT – Sorting and limiting results',                      'video', 20, 4),
  (mid, pid, 15, 'Aggregate Functions – SUM, COUNT, AVG, MIN, MAX',                        'video', 20, 5),
  (mid, pid, 16, 'GROUP BY – Grouping data for analysis',                                  'video', 20, 6),
  (mid, pid, 17, 'JOINs – Combining data from multiple tables',                            'video', 25, 7),
  (mid, pid, 18, 'Subqueries – Nested queries for complex analysis',                       'video', 25, 8),
  (mid, pid, 19, 'CASE Statements – Conditional logic in SQL',                             'video', 20, 9),
  (mid, pid, 20, 'Window Functions – Advanced analytical queries',                         'video', 25, 10),
  (mid, pid, 21, 'Creating Views – Saving complex queries',                                'video', 20, 11),
  (mid, pid, 22, 'PROJECT: Customer Database Analysis',                                    'project', 90, 12)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 3: Python
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'Python for Data Analysis', 'Pandas, NumPy, Matplotlib and EDA', 12, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 23, 'Python Basics – Variables, data types, loops',                           'video', 25, 1),
  (mid, pid, 24, 'Pandas Library – DataFrames and Series',                                 'video', 25, 2),
  (mid, pid, 25, 'Reading Data – CSV, Excel, SQL databases',                               'video', 20, 3),
  (mid, pid, 26, 'Data Cleaning with Pandas – Missing values, duplicates',                 'video', 25, 4),
  (mid, pid, 27, 'Data Manipulation – Filtering, sorting, grouping',                       'video', 25, 5),
  (mid, pid, 28, 'Data Aggregation – GroupBy operations',                                  'video', 20, 6),
  (mid, pid, 29, 'Merging and Joining DataFrames',                                         'video', 20, 7),
  (mid, pid, 30, 'NumPy for Numerical Analysis',                                           'video', 20, 8),
  (mid, pid, 31, 'Matplotlib – Creating visualisations',                                   'video', 20, 9),
  (mid, pid, 32, 'Seaborn – Statistical visualisations',                                   'video', 20, 10),
  (mid, pid, 33, 'Exploratory Data Analysis (EDA)',                                        'video', 30, 11),
  (mid, pid, 34, 'PROJECT: Python Data Analysis Pipeline',                                 'project', 90, 12)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 4: Data Visualisation
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'Data Visualisation – Power BI and Tableau', 'Dashboards, charts and executive reporting', 10, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 35, 'Principles of Data Visualisation',                                       'video', 20, 1),
  (mid, pid, 36, 'Power BI Basics – Interface and data import',                            'video', 25, 2),
  (mid, pid, 37, 'Power BI Visuals – Charts, tables, cards',                               'video', 25, 3),
  (mid, pid, 38, 'DAX Functions – Calculated columns and measures',                        'video', 25, 4),
  (mid, pid, 39, 'Power BI Dashboards – Interactive reports',                              'video', 25, 5),
  (mid, pid, 40, 'Tableau Basics – Connecting to data sources',                            'video', 25, 6),
  (mid, pid, 41, 'Tableau Charts – Bar, line, scatter, heatmaps',                          'video', 25, 7),
  (mid, pid, 42, 'Tableau Dashboards and Stories',                                         'video', 25, 8),
  (mid, pid, 43, 'Choosing the Right Chart Type',                                          'video', 20, 9),
  (mid, pid, 44, 'PROJECT: Executive Dashboard',                                           'project', 90, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 5: Statistics
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'Statistics for Data Analysis', 'Hypothesis testing, regression and forecasting', 8, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 45, 'Descriptive Statistics – Mean, median, mode, variance',                  'video', 20, 1),
  (mid, pid, 46, 'Probability Basics – Distributions, events',                             'video', 20, 2),
  (mid, pid, 47, 'Hypothesis Testing – T-tests, chi-square',                               'video', 25, 3),
  (mid, pid, 48, 'Correlation and Regression – Relationships between variables',           'video', 25, 4),
  (mid, pid, 49, 'A/B Testing – Statistical significance',                                 'video', 25, 5),
  (mid, pid, 50, 'Time Series Analysis – Trends and seasonality',                          'video', 25, 6),
  (mid, pid, 51, 'Forecasting Methods',                                                    'video', 25, 7),
  (mid, pid, 52, 'PROJECT: Statistical Analysis Report',                                   'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  -- Module 6: Professional
  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional Data Analyst', 'Portfolio, freelancing and career launch', 8, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 53, 'Business Intelligence Fundamentals',                                     'video', 20, 1),
  (mid, pid, 54, 'Communicating Insights to Stakeholders',                                 'video', 20, 2),
  (mid, pid, 55, 'Data Storytelling',                                                      'video', 20, 3),
  (mid, pid, 56, 'Creating Analysis Reports',                                              'video', 20, 4),
  (mid, pid, 57, 'Building a Data Analysis Portfolio',                                     'video', 20, 5),
  (mid, pid, 58, 'Job Interview Preparation',                                              'video', 20, 6),
  (mid, pid, 59, 'Freelance Data Analysis Business',                                       'video', 20, 7),
  (mid, pid, 60, 'FINAL PROJECT: Complete Business Analysis',                              'project', 120, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 12. AI AND AUTOMATION – Full lesson-by-lesson
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pid UUID; mid UUID;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'ai_automation';

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'AI Fundamentals', 'LLMs, ChatGPT, Claude and ethical AI usage', 8, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 1, 'What is AI – Types, capabilities, limitations',                           'video', 20, 1),
  (mid, pid, 2, 'Introduction to Large Language Models (LLMs)',                            'video', 20, 2),
  (mid, pid, 3, 'ChatGPT Basics – Interface, conversations',                               'video', 20, 3),
  (mid, pid, 4, 'Prompt Engineering Fundamentals',                                         'video', 25, 4),
  (mid, pid, 5, 'Claude AI – Features and use cases',                                      'video', 20, 5),
  (mid, pid, 6, 'Comparing AI Tools – ChatGPT vs Claude vs Others',                        'video', 20, 6),
  (mid, pid, 7, 'Ethical AI Usage and Limitations',                                        'video', 20, 7),
  (mid, pid, 8, 'PROJECT: AI-Powered Research Assistant',                                  'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'Advanced Prompt Engineering', 'Templates, chains, roles and prompt libraries', 10, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  9, 'Zero-Shot vs Few-Shot Prompting',                                        'video', 20, 1),
  (mid, pid, 10, 'Chain-of-Thought Prompting',                                             'video', 20, 2),
  (mid, pid, 11, 'Role-Based Prompting',                                                   'video', 20, 3),
  (mid, pid, 12, 'Prompt Templates and Frameworks',                                        'video', 20, 4),
  (mid, pid, 13, 'AI for Content Creation',                                                'video', 20, 5),
  (mid, pid, 14, 'AI for Code Generation',                                                 'video', 20, 6),
  (mid, pid, 15, 'AI for Data Analysis',                                                   'video', 20, 7),
  (mid, pid, 16, 'AI for Business Strategy',                                               'video', 20, 8),
  (mid, pid, 17, 'Prompt Libraries and Systems',                                           'video', 20, 9),
  (mid, pid, 18, 'PROJECT: Custom AI Assistant',                                           'project', 60, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'AI Image Generation', 'MidJourney, DALL-E, brand assets and video', 8, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 19, 'Introduction to MidJourney',                                             'video', 20, 1),
  (mid, pid, 20, 'MidJourney Prompting Techniques',                                        'video', 25, 2),
  (mid, pid, 21, 'DALL-E and Stable Diffusion',                                            'video', 20, 3),
  (mid, pid, 22, 'Image Editing with AI',                                                  'video', 20, 4),
  (mid, pid, 23, 'Creating Brand Assets with AI',                                          'video', 20, 5),
  (mid, pid, 24, 'AI Video Generation Basics',                                             'video', 20, 6),
  (mid, pid, 25, 'Commercial Use and Copyright',                                           'video', 15, 7),
  (mid, pid, 26, 'PROJECT: AI Brand Identity',                                             'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'Automation Fundamentals', 'Zapier, Make and multi-step workflows', 8, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 27, 'What is Automation – Benefits and use cases',                            'video', 20, 1),
  (mid, pid, 28, 'Introduction to Zapier',                                                 'video', 20, 2),
  (mid, pid, 29, 'Building Your First Zap',                                                'video', 25, 3),
  (mid, pid, 30, 'Multi-Step Workflows',                                                   'video', 25, 4),
  (mid, pid, 31, 'Introduction to Make (Integromat)',                                      'video', 20, 5),
  (mid, pid, 32, 'Advanced Automation Scenarios',                                          'video', 25, 6),
  (mid, pid, 33, 'Error Handling and Testing',                                             'video', 20, 7),
  (mid, pid, 34, 'PROJECT: Email Marketing Automation',                                    'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'AI-Powered Automation', 'AI workflows, chatbots and social automation', 8, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 35, 'Combining AI and Automation',                                            'video', 20, 1),
  (mid, pid, 36, 'AI Content Generation Workflows',                                        'video', 25, 2),
  (mid, pid, 37, 'AI Customer Service Automation',                                         'video', 25, 3),
  (mid, pid, 38, 'AI Data Processing Workflows',                                           'video', 25, 4),
  (mid, pid, 39, 'AI Social Media Automation',                                             'video', 25, 5),
  (mid, pid, 40, 'AI Email Response Systems',                                              'video', 25, 6),
  (mid, pid, 41, 'Building AI Chatbots',                                                   'video', 25, 7),
  (mid, pid, 42, 'PROJECT: Complete AI Workflow',                                          'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional AI Services', 'Consulting, portfolio, clients and ethics', 8, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 43, 'AI Consulting Business Model',                                           'video', 20, 1),
  (mid, pid, 44, 'Pricing AI Services',                                                    'video', 20, 2),
  (mid, pid, 45, 'Building an AI Portfolio',                                               'video', 20, 3),
  (mid, pid, 46, 'Finding AI Clients',                                                     'video', 20, 4),
  (mid, pid, 47, 'Delivering AI Projects',                                                 'video', 20, 5),
  (mid, pid, 48, 'Staying Updated with AI',                                                'video', 15, 6),
  (mid, pid, 49, 'AI Ethics for Professionals',                                            'video', 20, 7),
  (mid, pid, 50, 'FINAL PROJECT: Client AI Solution',                                      'project', 120, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 13. AGENTIC AI – Full lesson-by-lesson
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pid UUID; mid UUID;
BEGIN
  SELECT id INTO pid FROM public.learning_paths WHERE skill_name = 'agentic_ai';

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 1, 'Introduction to Agentic AI', 'What agents are, architecture and real-world use', 8, 1)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 1;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 1, 'What is Agentic AI – Agents vs Chatbots',                                 'video', 20, 1),
  (mid, pid, 2, 'Agent Architecture – Perception, reasoning, action',                      'video', 25, 2),
  (mid, pid, 3, 'Types of AI Agents – Reactive, deliberative, hybrid',                     'video', 20, 3),
  (mid, pid, 4, 'Agent Capabilities – Memory, tools, planning',                            'video', 25, 4),
  (mid, pid, 5, 'Real-World Agent Applications',                                           'video', 20, 5),
  (mid, pid, 6, 'OpenAI API Basics',                                                       'video', 25, 6),
  (mid, pid, 7, 'Setting Up Development Environment',                                      'video', 25, 7),
  (mid, pid, 8, 'PROJECT: Simple Task Agent',                                              'project', 60, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 2, 'Building AI Agents with LangChain', 'Chains, tools, memory and RAG', 10, 2)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 2;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid,  9, 'Introduction to LangChain',                                              'video', 20, 1),
  (mid, pid, 10, 'Chains and Sequential Processing',                                       'video', 25, 2),
  (mid, pid, 11, 'Agent Types in LangChain',                                               'video', 25, 3),
  (mid, pid, 12, 'Tools and Toolkits',                                                     'video', 25, 4),
  (mid, pid, 13, 'Memory Systems – Short-term and long-term',                              'video', 25, 5),
  (mid, pid, 14, 'Retrieval Augmented Generation (RAG)',                                   'video', 30, 6),
  (mid, pid, 15, 'Vector Databases – Pinecone, Weaviate',                                  'video', 25, 7),
  (mid, pid, 16, 'Document Loading and Processing',                                        'video', 20, 8),
  (mid, pid, 17, 'Agent Prompting Strategies',                                             'video', 20, 9),
  (mid, pid, 18, 'PROJECT: Research Agent',                                                'project', 90, 10)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 3, 'Advanced Agent Capabilities', 'Multi-agent systems, tools and APIs', 8, 3)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 3;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 19, 'Multi-Agent Systems',                                                    'video', 25, 1),
  (mid, pid, 20, 'Agent Communication Protocols',                                          'video', 25, 2),
  (mid, pid, 21, 'Planning and Reasoning',                                                 'video', 25, 3),
  (mid, pid, 22, 'Tool Creation for Agents',                                               'video', 30, 4),
  (mid, pid, 23, 'Web Browsing Agents',                                                    'video', 25, 5),
  (mid, pid, 24, 'Code Execution Agents',                                                  'video', 25, 6),
  (mid, pid, 25, 'API Integration for Agents',                                             'video', 25, 7),
  (mid, pid, 26, 'PROJECT: Multi-Tool Agent',                                              'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 4, 'AutoGPT and Autonomous Agents', 'Goals, loops, memory and file operations', 8, 4)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 4;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 27, 'Introduction to AutoGPT',                                                'video', 20, 1),
  (mid, pid, 28, 'Setting Goals and Constraints',                                          'video', 25, 2),
  (mid, pid, 29, 'Agent Loop – Think, act, observe',                                       'video', 25, 3),
  (mid, pid, 30, 'Memory Management in AutoGPT',                                           'video', 25, 4),
  (mid, pid, 31, 'File Operations and Persistence',                                        'video', 20, 5),
  (mid, pid, 32, 'Cost Management and Safety',                                             'video', 20, 6),
  (mid, pid, 33, 'Customising AutoGPT',                                                    'video', 25, 7),
  (mid, pid, 34, 'PROJECT: Autonomous Task Agent',                                         'project', 90, 8)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 5, 'Production AI Agents', 'Deployment, monitoring, security and scaling', 6, 5)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 5;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 35, 'Deploying Agents to Production',                                         'video', 25, 1),
  (mid, pid, 36, 'Agent Monitoring and Logging',                                           'video', 20, 2),
  (mid, pid, 37, 'Error Handling and Recovery',                                            'video', 20, 3),
  (mid, pid, 38, 'Security Best Practices',                                                'video', 20, 4),
  (mid, pid, 39, 'Scaling Agent Systems',                                                  'video', 25, 5),
  (mid, pid, 40, 'PROJECT: Production-Ready Agent',                                        'project', 90, 6)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;

  INSERT INTO public.learning_modules (learning_path_id, module_number, title, description, estimated_hours, order_index)
  VALUES (pid, 6, 'Professional Agentic AI Services', 'Business models, pricing, ethics and final project', 5, 6)
  ON CONFLICT (learning_path_id, module_number) DO UPDATE SET title = EXCLUDED.title;
  SELECT id INTO mid FROM public.learning_modules WHERE learning_path_id = pid AND module_number = 6;
  INSERT INTO public.learning_lessons (module_id, learning_path_id, lesson_number, title, content_type, estimated_minutes, order_index) VALUES
  (mid, pid, 41, 'Agentic AI Use Cases for Businesses',                                    'video', 20, 1),
  (mid, pid, 42, 'Building Agent Products',                                                'video', 25, 2),
  (mid, pid, 43, 'Pricing Agent Development Services',                                     'video', 20, 3),
  (mid, pid, 44, 'Agent Ethics and Responsible AI',                                        'video', 20, 4),
  (mid, pid, 45, 'FINAL PROJECT: Custom Business Agent',                                   'project', 120, 5)
  ON CONFLICT (module_id, lesson_number) DO UPDATE SET title = EXCLUDED.title;
END $$;
