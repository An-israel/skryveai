-- Create function to increment emails_sent count
CREATE OR REPLACE FUNCTION public.increment_campaign_emails_sent(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns 
  SET emails_sent = emails_sent + 1, updated_at = now()
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to increment emails_opened count
CREATE OR REPLACE FUNCTION public.increment_campaign_emails_opened(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns 
  SET emails_opened = emails_opened + 1, updated_at = now()
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to increment replies count
CREATE OR REPLACE FUNCTION public.increment_campaign_replies(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.campaigns 
  SET replies = replies + 1, updated_at = now()
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;