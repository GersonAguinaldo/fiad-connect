
REVOKE ALL ON FUNCTION public.log_profile_status_change() FROM public, anon, authenticated;

DROP FUNCTION IF EXISTS public.apply_membership_status_rules();

CREATE OR REPLACE FUNCTION private.apply_membership_status_rules()
RETURNS TABLE (deactivated integer, reminded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  p record;
  last_paid timestamptz;
  due_at timestamptz;
  n_deact integer := 0;
  n_remind integer := 0;
BEGIN
  SELECT * INTO s FROM public.app_settings WHERE id = true;
  IF s IS NULL OR NOT s.auto_status_enabled THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  PERFORM set_config('app.status_automatic', 'on', true);

  FOR p IN
    SELECT id, status, created_at FROM public.profiles
    WHERE category = 'Ambassadeur du Développement'
  LOOP
    SELECT max(occurred_at) INTO last_paid
    FROM public.transactions
    WHERE user_id = p.id
      AND status IN ('Réussi', 'Payé', 'paid')
      AND reason ILIKE 'Cotisation%';

    due_at := coalesce(last_paid, p.created_at) + make_interval(months => s.dues_period_months);

    IF p.status = 'Actif' AND now() > due_at + make_interval(days => s.grace_period_days) THEN
      PERFORM set_config('app.status_reason', 'Cotisation impayée au-delà du délai de grâce', true);
      UPDATE public.profiles SET status = 'Inactif', updated_at = now() WHERE id = p.id;
      n_deact := n_deact + 1;
    ELSIF p.status = 'Actif'
      AND now() >= due_at - make_interval(days => s.reminder_days_before)
      AND now() <= due_at + make_interval(days => s.grace_period_days)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p.id AND kind = 'relance' AND created_at > now() - interval '7 days'
      )
    THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (p.id, 'relance', 'Renouvellement de votre cotisation',
              format('Votre cotisation d''ambassadeur arrive à échéance le %s. Renouvelez-la pour conserver un statut actif.',
                     to_char(due_at, 'DD/MM/YYYY')),
              '/mes-finances');
      n_remind := n_remind + 1;
    END IF;
  END LOOP;

  PERFORM set_config('app.status_automatic', 'off', true);
  PERFORM set_config('app.status_reason', '', true);

  UPDATE public.app_settings SET last_status_run_at = now() WHERE id = true;

  RETURN QUERY SELECT n_deact, n_remind;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_membership_status_rules() FROM public, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'membership-status-rules';
SELECT cron.schedule(
  'membership-status-rules',
  '0 3 * * *',
  $$SELECT private.apply_membership_status_rules();$$
);
