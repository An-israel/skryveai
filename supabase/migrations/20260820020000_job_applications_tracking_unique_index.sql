-- ApplyWizard.trackExternal() upserts into job_applications with
-- onConflict: "user_id,role_title" but no matching unique index ever existed
-- — the upsert throws 42P10, the error was swallowed, and "Application
-- tracked" showed anyway while the row was never actually written.
CREATE UNIQUE INDEX IF NOT EXISTS job_applications_user_role_unique
  ON public.job_applications (user_id, role_title);
