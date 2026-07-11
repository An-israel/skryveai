-- Name the 3rd competitor in the seeded comparison piece.
-- Idempotent: only touches the placeholder row created by the tiptip seed.
UPDATE public.tiptip_content
   SET title = 'Skryve vs Freelancer.com: honest comparison',
       target_keyword = 'Freelancer.com alternative',
       keyword_tier = 1
 WHERE title = 'Skryve vs [3rd competitor] comparison';
