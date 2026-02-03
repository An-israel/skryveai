-- Allow super_admins to delete signup_ips entries
CREATE POLICY "Super admins can delete signup IPs"
ON public.signup_ips
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));