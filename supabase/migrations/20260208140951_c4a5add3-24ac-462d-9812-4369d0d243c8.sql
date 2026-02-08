
-- Add campaign_type column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN campaign_type text NOT NULL DEFAULT 'freelancer';

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.campaign_type IS 'Type of campaign: freelancer, direct_client, or investor';
