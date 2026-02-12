
-- Create security definer functions to break circular RLS between teams and team_members

-- Function to check if user is owner of a team (bypasses RLS on teams)
CREATE OR REPLACE FUNCTION public.is_team_owner(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = _team_id AND owner_id = _user_id
  )
$$;

-- Function to check if user is an active member of a team (bypasses RLS on team_members)
CREATE OR REPLACE FUNCTION public.is_active_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND status = 'active'
  )
$$;

-- Fix teams policies: replace subquery on team_members with security definer function
DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
CREATE POLICY "Team members can view their team"
ON public.teams
FOR SELECT
USING (public.is_active_team_member(auth.uid(), id));

-- Fix team_members policies: replace subquery on teams with security definer function
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
CREATE POLICY "Team owners can manage members"
ON public.team_members
FOR ALL
USING (public.is_team_owner(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team owners can view all members" ON public.team_members;
CREATE POLICY "Team owners can view all members"
ON public.team_members
FOR SELECT
USING (public.is_team_owner(auth.uid(), team_id));

-- Fix team_profiles policies: replace subquery on team_members with security definer function
DROP POLICY IF EXISTS "Team members can create profiles" ON public.team_profiles;
CREATE POLICY "Team members can create profiles"
ON public.team_profiles
FOR INSERT
WITH CHECK (public.is_active_team_member(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team members can view profiles" ON public.team_profiles;
CREATE POLICY "Team members can view profiles"
ON public.team_profiles
FOR SELECT
USING (public.is_active_team_member(auth.uid(), team_id));

DROP POLICY IF EXISTS "Team owners can manage profiles" ON public.team_profiles;
CREATE POLICY "Team owners can manage profiles"
ON public.team_profiles
FOR ALL
USING (public.is_team_owner(auth.uid(), team_id));
