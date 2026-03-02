
-- Fix profiles SELECT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Also fix subscriptions SELECT policies (same issue)
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
