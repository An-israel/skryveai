-- Create smtp_credentials table for SMTP/IMAP email sending
CREATE TABLE public.smtp_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_address TEXT NOT NULL,
  app_password TEXT NOT NULL,
  smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  imap_host TEXT NOT NULL DEFAULT 'imap.gmail.com',
  imap_port INTEGER NOT NULL DEFAULT 993,
  provider_type TEXT NOT NULL DEFAULT 'gmail',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smtp_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own credentials
CREATE POLICY "Users can view their own SMTP credentials"
ON public.smtp_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMTP credentials"
ON public.smtp_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMTP credentials"
ON public.smtp_credentials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMTP credentials"
ON public.smtp_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_smtp_credentials_updated_at
BEFORE UPDATE ON public.smtp_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.smtp_credentials IS 'Stores SMTP/IMAP credentials for sending emails via user Gmail/Outlook with App Passwords';