
-- === Cours hebdomadaires (sessions en direct) ===
CREATE TABLE public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  host text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_url text,
  recording_url text,
  notes_url text,
  status text not null default 'planifie',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_sessions_read" ON public.live_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_sessions_admin_write" ON public.live_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.live_session_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz,
  reminder_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_registrations TO authenticated;
GRANT ALL ON public.live_session_registrations TO service_role;
ALTER TABLE public.live_session_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lsr_own_read" ON public.live_session_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lsr_own_insert" ON public.live_session_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lsr_own_update" ON public.live_session_registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lsr_own_delete" ON public.live_session_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.live_session_resources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  kind text not null default 'document',
  title text not null,
  url text,
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_resources TO authenticated;
GRANT ALL ON public.live_session_resources TO service_role;
ALTER TABLE public.live_session_resources ENABLE ROW LEVEL SECURITY;
-- Ressources visibles uniquement aux inscrits (ou admins)
CREATE POLICY "lsres_read_registered" ON public.live_session_resources FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.live_session_registrations r
               WHERE r.session_id = live_session_resources.session_id AND r.user_id = auth.uid())
  );
CREATE POLICY "lsres_admin_write" ON public.live_session_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- === Formations : modules, prerequis, progression, certificats ===
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS prerequisites text,
  ADD COLUMN IF NOT EXISTS duration_hours numeric;

CREATE TABLE public.formation_modules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  resource_url text,
  duration_minutes integer,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_modules TO authenticated;
GRANT ALL ON public.formation_modules TO service_role;
ALTER TABLE public.formation_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fm_read" ON public.formation_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "fm_admin_write" ON public.formation_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.formation_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  formation_id uuid not null references public.formations(id) on delete cascade,
  module_id uuid not null references public.formation_modules(id) on delete cascade,
  completed boolean not null default true,
  completed_at timestamptz not null default now(),
  unique (user_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_module_progress TO authenticated;
GRANT ALL ON public.formation_module_progress TO service_role;
ALTER TABLE public.formation_module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fmp_read" ON public.formation_module_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fmp_insert" ON public.formation_module_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "fmp_update" ON public.formation_module_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "fmp_delete" ON public.formation_module_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  formation_id uuid not null references public.formations(id) on delete cascade,
  code text not null unique,
  holder_name text,
  formation_title text,
  issued_at timestamptz not null default now(),
  unique (user_id, formation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT SELECT ON public.certificates TO anon;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
-- Verification publique par code (lecture seule, donnees non sensibles)
CREATE POLICY "cert_public_verify" ON public.certificates FOR SELECT TO anon USING (true);
CREATE POLICY "cert_read" ON public.certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "cert_insert_own" ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cert_admin_manage" ON public.certificates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
