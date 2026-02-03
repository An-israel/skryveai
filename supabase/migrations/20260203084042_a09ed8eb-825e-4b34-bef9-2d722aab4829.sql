-- Create user_settings table for email templates and preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sender_name TEXT DEFAULT 'Your Name',
  sender_email TEXT,
  company_name TEXT,
  service_description TEXT DEFAULT 'web development and digital marketing',
  email_signature TEXT DEFAULT 'Best regards',
  delay_between_emails INTEGER DEFAULT 30, -- seconds between emails
  daily_send_limit INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create email_queue table for scheduled sending
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  pitch_id UUID NOT NULL REFERENCES public.pitches(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_queue (via campaign ownership)
CREATE POLICY "Users can view their queued emails" ON public.email_queue FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = email_queue.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can create queued emails" ON public.email_queue FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = email_queue.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can update their queued emails" ON public.email_queue FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = email_queue.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users can delete their queued emails" ON public.email_queue FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = email_queue.campaign_id AND campaigns.user_id = auth.uid()));