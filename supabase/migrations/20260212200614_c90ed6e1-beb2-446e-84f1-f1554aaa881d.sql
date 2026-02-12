
-- Create team_members table first (no cross-reference RLS)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'team_basic',
  max_members INTEGER NOT NULL DEFAULT 7,
  max_profiles INTEGER NOT NULL DEFAULT 5,
  credits INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add FK from team_members to teams
ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Create team_profiles table
CREATE TABLE IF NOT EXISTS public.team_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  expertise TEXT[] DEFAULT '{}',
  cv_url TEXT,
  portfolio_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can manage their teams"
  ON public.teams FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their team"
  ON public.teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.status = 'active'
  ));

-- RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can manage members"
  ON public.team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  ));

CREATE POLICY "Members can view their team members"
  ON public.team_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

-- RLS on team_profiles
ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can manage profiles"
  ON public.team_profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_profiles.team_id
    AND teams.owner_id = auth.uid()
  ));

CREATE POLICY "Team members can view profiles"
  ON public.team_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = team_profiles.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.status = 'active'
  ));

CREATE POLICY "Team members can create profiles"
  ON public.team_profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = team_profiles.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.status = 'active'
  ));

-- Unique constraint and indexes
ALTER TABLE public.team_members ADD CONSTRAINT unique_team_member UNIQUE (team_id, email);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_profiles_team_id ON public.team_profiles(team_id);
