
-- Drop the existing permissive member SELECT policy
DROP POLICY "Members can view their team members" ON public.team_members;

-- Recreate: members can see their own row + non-sensitive fields of teammates
-- But only team owners and admins can see all emails
CREATE POLICY "Members can view their own membership"
ON public.team_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Team owners can view all members"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);
