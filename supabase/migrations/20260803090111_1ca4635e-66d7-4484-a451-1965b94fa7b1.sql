
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason text;

CREATE OR REPLACE FUNCTION public.log_profile_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
  v_auto boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_auto := coalesce(current_setting('app.status_automatic', true), 'off') = 'on';
    v_reason := coalesce(
      nullif(current_setting('app.status_reason', true), ''),
      nullif(NEW.status_reason, '')
    );

    INSERT INTO public.member_status_history (profile_id, old_status, new_status, reason, changed_by, automatic)
    VALUES (NEW.id, OLD.status, NEW.status, v_reason, auth.uid(), v_auto);

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      NEW.id, 'statut', 'Votre statut a été mis à jour',
      format('Votre statut de membre est passé de « %s » à « %s ».%s',
             coalesce(OLD.status, '—'), NEW.status,
             coalesce(' Motif : ' || v_reason, '')),
      '/mon-profil'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_profile_status_change() FROM public, anon, authenticated;
