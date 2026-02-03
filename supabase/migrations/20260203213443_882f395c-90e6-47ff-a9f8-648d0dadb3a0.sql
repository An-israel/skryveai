-- Fix RLS policies to explicitly check auth.uid() IS NOT NULL

-- Drop and recreate businesses policies with auth check
DROP POLICY IF EXISTS "Users can view businesses in their campaigns" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses in their campaigns" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses in their campaigns" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses in their campaigns" ON public.businesses;

CREATE POLICY "Users can view businesses in their campaigns" ON public.businesses
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = businesses.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create businesses in their campaigns" ON public.businesses
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = businesses.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update businesses in their campaigns" ON public.businesses
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = businesses.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete businesses in their campaigns" ON public.businesses
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = businesses.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Drop and recreate website_analyses policies with auth check
DROP POLICY IF EXISTS "Users can view analyses for their businesses" ON public.website_analyses;
DROP POLICY IF EXISTS "Users can create analyses for their businesses" ON public.website_analyses;
DROP POLICY IF EXISTS "Users can update analyses for their businesses" ON public.website_analyses;

CREATE POLICY "Users can view analyses for their businesses" ON public.website_analyses
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = website_analyses.business_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create analyses for their businesses" ON public.website_analyses
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = website_analyses.business_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update analyses for their businesses" ON public.website_analyses
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = website_analyses.business_id 
    AND c.user_id = auth.uid()
  )
);

-- Drop and recreate pitches policies with auth check
DROP POLICY IF EXISTS "Users can view pitches for their businesses" ON public.pitches;
DROP POLICY IF EXISTS "Users can create pitches for their businesses" ON public.pitches;
DROP POLICY IF EXISTS "Users can update pitches for their businesses" ON public.pitches;

CREATE POLICY "Users can view pitches for their businesses" ON public.pitches
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = pitches.business_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create pitches for their businesses" ON public.pitches
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = pitches.business_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update pitches for their businesses" ON public.pitches
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN campaigns c ON b.campaign_id = c.id
    WHERE b.id = pitches.business_id 
    AND c.user_id = auth.uid()
  )
);

-- Drop and recreate emails policies with auth check
DROP POLICY IF EXISTS "Users can view emails in their campaigns" ON public.emails;
DROP POLICY IF EXISTS "Users can create emails in their campaigns" ON public.emails;
DROP POLICY IF EXISTS "Users can update emails in their campaigns" ON public.emails;

CREATE POLICY "Users can view emails in their campaigns" ON public.emails
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = emails.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create emails in their campaigns" ON public.emails
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = emails.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update emails in their campaigns" ON public.emails
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = emails.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Drop and recreate email_queue policies with auth check
DROP POLICY IF EXISTS "Users can view their queued emails" ON public.email_queue;
DROP POLICY IF EXISTS "Users can create queued emails" ON public.email_queue;
DROP POLICY IF EXISTS "Users can update their queued emails" ON public.email_queue;
DROP POLICY IF EXISTS "Users can delete their queued emails" ON public.email_queue;

CREATE POLICY "Users can view their queued emails" ON public.email_queue
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = email_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create queued emails" ON public.email_queue
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = email_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their queued emails" ON public.email_queue
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = email_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their queued emails" ON public.email_queue
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = email_queue.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Drop and recreate email_replies user policy with auth check
DROP POLICY IF EXISTS "Users can view replies to their emails" ON public.email_replies;

CREATE POLICY "Users can view replies to their emails" ON public.email_replies
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM emails e
    JOIN campaigns c ON e.campaign_id = c.id
    WHERE e.id = email_replies.email_id 
    AND c.user_id = auth.uid()
  )
);

-- Fix increment functions to validate campaign ownership
-- Note: These functions are called from edge functions using service role,
-- but we add ownership check for any direct RPC calls from client

CREATE OR REPLACE FUNCTION public.increment_campaign_emails_sent(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if campaign belongs to current user OR called from service role (auth.uid() is null)
  UPDATE public.campaigns 
  SET emails_sent = emails_sent + 1, updated_at = now()
  WHERE id = campaign_id
  AND (auth.uid() IS NULL OR user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_emails_opened(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns 
  SET emails_opened = emails_opened + 1, updated_at = now()
  WHERE id = campaign_id
  AND (auth.uid() IS NULL OR user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_replies(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns 
  SET replies = replies + 1, updated_at = now()
  WHERE id = campaign_id
  AND (auth.uid() IS NULL OR user_id = auth.uid());
END;
$$;