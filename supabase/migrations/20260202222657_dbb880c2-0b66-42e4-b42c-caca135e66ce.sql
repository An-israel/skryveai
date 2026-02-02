-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'searching', 'analyzing', 'pitching', 'sending', 'completed')),
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_opened INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER,
  category TEXT,
  place_id TEXT,
  email TEXT,
  selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_analyses table
CREATE TABLE public.website_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_score INTEGER NOT NULL DEFAULT 0,
  analyzed BOOLEAN NOT NULL DEFAULT false,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pitches table
CREATE TABLE public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  edited BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emails table for tracking
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pitch_id UUID NOT NULL REFERENCES public.pitches(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'replied', 'bounced', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for businesses (via campaign ownership)
CREATE POLICY "Users can view businesses in their campaigns" ON public.businesses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = businesses.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can create businesses in their campaigns" ON public.businesses FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = businesses.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can update businesses in their campaigns" ON public.businesses FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = businesses.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can delete businesses in their campaigns" ON public.businesses FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = businesses.campaign_id AND campaigns.user_id = auth.uid()));

-- RLS policies for website_analyses (via business -> campaign ownership)
CREATE POLICY "Users can view analyses for their businesses" ON public.website_analyses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = website_analyses.business_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can create analyses for their businesses" ON public.website_analyses FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = website_analyses.business_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update analyses for their businesses" ON public.website_analyses FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = website_analyses.business_id AND c.user_id = auth.uid()));

-- RLS policies for pitches (via business -> campaign ownership)
CREATE POLICY "Users can view pitches for their businesses" ON public.pitches FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = pitches.business_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can create pitches for their businesses" ON public.pitches FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = pitches.business_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update pitches for their businesses" ON public.pitches FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.businesses b JOIN public.campaigns c ON b.campaign_id = c.id WHERE b.id = pitches.business_id AND c.user_id = auth.uid()));

-- RLS policies for emails (via campaign ownership)
CREATE POLICY "Users can view emails in their campaigns" ON public.emails FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = emails.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can create emails in their campaigns" ON public.emails FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = emails.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can update emails in their campaigns" ON public.emails FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = emails.campaign_id AND campaigns.user_id = auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pitches_updated_at BEFORE UPDATE ON public.pitches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();