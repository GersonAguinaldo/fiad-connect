
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS dues_period_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reminder_days_before integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS auto_status_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_status_run_at timestamptz;

CREATE TABLE IF NOT EXISTS public.member_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  reason text,
  changed_by uuid,
  automatic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_status_history_profile_idx ON public.member_status_history(profile_id, created_at DESC);
GRANT SELECT, INSERT ON public.member_status_history TO authenticated;
GRANT ALL ON public.member_status_history TO service_role;
ALTER TABLE public.member_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status history readable by owner or admin" ON public.member_status_history;
CREATE POLICY "status history readable by owner or admin"
  ON public.member_status_history FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins log status changes" ON public.member_status_history;
CREATE POLICY "admins log status changes"
  ON public.member_status_history FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications readable by owner or admin" ON public.notifications;
CREATE POLICY "notifications readable by owner or admin"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifications insert self or admin" ON public.notifications;
CREATE POLICY "notifications insert self or admin"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_profile_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.member_status_history (profile_id, old_status, new_status, reason, changed_by, automatic)
    VALUES (
      NEW.id, OLD.status, NEW.status,
      nullif(current_setting('app.status_reason', true), ''),
      auth.uid(),
      coalesce(current_setting('app.status_automatic', true), 'off') = 'on'
    );
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      NEW.id, 'statut', 'Votre statut a été mis à jour',
      format('Votre statut de membre est passé de « %s » à « %s ».%s',
             coalesce(OLD.status, '—'), NEW.status,
             coalesce(' Motif : ' || nullif(current_setting('app.status_reason', true), ''), '')),
      '/mon-profil'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_status_change ON public.profiles;
CREATE TRIGGER trg_log_profile_status_change
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_status_change();

CREATE OR REPLACE FUNCTION public.apply_membership_status_rules()
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
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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

REVOKE ALL ON FUNCTION public.apply_membership_status_rules() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_membership_status_rules() TO authenticated;
