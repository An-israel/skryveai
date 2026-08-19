-- PaymentRelease.tsx let either party on a project (client OR talent, via the
-- broad "proj_update_parties" policy) flip payment_status to 'released' — no
-- actual funds transfer happens anywhere in the codebase (no Paystack Transfers
-- call exists), so this was purely a status flag, but it could be set by the
-- talent being paid, not just the client paying. Add a narrow RPC restricted to
-- the paying client so at minimum the *confirmation* comes from the right party;
-- the frontend copy is being corrected separately to stop claiming this moves
-- money until a real payout integration exists.

CREATE OR REPLACE FUNCTION public.release_project_payment(_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  is_client boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.client_profiles c ON c.id = p.client_id
    WHERE p.id = _project_id AND c.user_id = auth.uid()
  ) INTO is_client;

  IF NOT is_client THEN
    RAISE EXCEPTION 'only the paying client can confirm payment for this project';
  END IF;

  UPDATE public.projects
    SET payment_status = 'released', status = 'completed'
    WHERE id = _project_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.release_project_payment(uuid) TO authenticated;
