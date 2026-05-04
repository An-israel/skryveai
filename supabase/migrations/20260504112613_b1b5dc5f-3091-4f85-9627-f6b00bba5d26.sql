BEGIN;
DELETE FROM public.learning_assignments;
DELETE FROM public.learning_lessons;
DELETE FROM public.learning_modules;
UPDATE public.user_learning SET completed_lessons=0, current_level=1, current_module=1, current_lesson=1;

INSERT INTO public.learning_paths (skill_name, display_name, short_description, description, total_lessons, total_modules, estimated_weeks, popular_rank, difficulty_level, is_active) VALUES
('web_design','Web Design','Build websites that win clients.','Build professional, responsive websites from scratch. Master HTML, CSS, JavaScript, and modern frameworks to create websites that win clients and generate revenue.',60,6,8,1,'beginner',true),
('graphic_design','Graphic Design','Design that sells.','Master visual design principles and professional design tools to create logos, brand identities, social media graphics, and marketing materials that clients love.',50,6,6,2,'beginner',true),
('copywriting','Copywriting','Words that move money.','Learn to write persuasive copy that converts readers into buyers. Master sales pages, ads, emails, and landing pages.',40,6,5,3,'beginner',true),
('social_media','Social Media Management','Run social like a pro.','Run social media like a pro. Content strategy, scheduling, engagement, analytics, community management across all platforms.',45,6,6,4,'beginner',true),
('video_editing','Video Editing','Edit videos that get watched.','Edit professional videos for YouTube, TikTok, ads, and client projects. Master CapCut and core editing principles.',35,7,7,5,'beginner',true),
('digital_marketing','Digital Marketing','Drive traffic, leads, sales.','Drive traffic, leads, and sales. Master Facebook Ads, Google Ads, email marketing, funnels, conversion optimization, analytics.',50,6,6,6,'beginner',true),
('content_writing','Content Writing','Write content that ranks.','Write SEO blog posts, articles, and web content that rank on Google and engage readers.',35,5,4,7,'beginner',true),
('virtual_assistant','Virtual Assistance','Become an indispensable VA.','Become an indispensable remote assistant. Admin tasks, scheduling, email management, CRM, tools, client management.',30,5,4,8,'beginner',true),
('ui_ux','UI/UX Design','Design products people love.','Design beautiful user interfaces and experiences. Figma mastery, wireframing, prototyping, user research, testing.',65,7,8,9,'beginner',true),
('seo','SEO Specialist','Rank sites on Google.','Get websites to rank #1 on Google. Technical SEO, on-page, off-page, keyword research, link building, analytics.',45,6,6,10,'beginner',true),
('data_analyst','Data Analyst','Turn data into business decisions.','Master data analysis from beginner to professional. Learn Excel, SQL, Python, data visualization, and statistical analysis to help businesses make data-driven decisions.',60,6,8,11,'beginner',true),
('ai_automation','AI and Automation','10x productivity with AI workflows.','Master AI tools and automation to 10x your productivity and offer high-value services to clients. Learn ChatGPT, MidJourney, automation tools, and how to build AI-powered workflows.',50,6,7,12,'beginner',true),
('agentic_ai','Agentic AI','Build autonomous AI agents.','Build autonomous AI agents that can perform complex tasks, make decisions, and work independently. Learn to create AI systems that go beyond simple chatbots to become true AI assistants.',45,6,6,13,'intermediate',true)
ON CONFLICT (skill_name) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  short_description=EXCLUDED.short_description,
  description=EXCLUDED.description,
  total_lessons=EXCLUDED.total_lessons,
  total_modules=EXCLUDED.total_modules,
  estimated_weeks=EXCLUDED.estimated_weeks,
  popular_rank=EXCLUDED.popular_rank,
  difficulty_level=EXCLUDED.difficulty_level,
  is_active=true,
  updated_at=now();

COMMIT;