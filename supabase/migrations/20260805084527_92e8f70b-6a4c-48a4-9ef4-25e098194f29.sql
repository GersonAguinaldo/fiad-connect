CREATE TABLE public.benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Général',
  access_conditions text,
  link_url text,
  status text not null default 'Actif',
  position integer not null default 0,
  target_categories text[] not null default '{}',
  target_membership_types text[] not null default '{}',
  target_statuses text[] not null default '{}',
  target_cities text[] not null default '{}',
  target_countries text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benefits_read_authenticated" ON public.benefits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "benefits_admin_insert" ON public.benefits
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "benefits_admin_update" ON public.benefits
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "benefits_admin_delete" ON public.benefits
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER benefits_updated_at BEFORE UPDATE ON public.benefits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.benefit_usage (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references public.benefits(id) on delete cascade,
  user_id uuid not null,
  note text,
  rating integer check (rating between 1 and 5),
  feedback text,
  used_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefit_usage TO authenticated;
GRANT ALL ON public.benefit_usage TO service_role;
ALTER TABLE public.benefit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benefit_usage_own_read" ON public.benefit_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "benefit_usage_own_insert" ON public.benefit_usage
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "benefit_usage_own_update" ON public.benefit_usage
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "benefit_usage_admin_delete" ON public.benefit_usage
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE INDEX benefit_usage_user_idx ON public.benefit_usage(user_id);
CREATE INDEX benefit_usage_benefit_idx ON public.benefit_usage(benefit_id);