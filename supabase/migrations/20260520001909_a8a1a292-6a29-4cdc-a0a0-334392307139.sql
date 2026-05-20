
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'Hebdomadaire',
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS resource_url text;

ALTER TABLE public.formation_enrollments
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP POLICY IF EXISTS "Users update own enrollment progress" ON public.formation_enrollments;
CREATE POLICY "Users update own enrollment progress"
ON public.formation_enrollments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS capacity int;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Gratuit',
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

-- Allow members to record their own (simulated) payments
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
CREATE POLICY "Users insert own transactions"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
