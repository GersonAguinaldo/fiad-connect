CREATE TABLE public.admin_permissions (
  user_id uuid NOT NULL PRIMARY KEY,
  is_super_admin boolean NOT NULL DEFAULT false,
  modules text[] NOT NULL DEFAULT '{}',
  cities text[] NOT NULL DEFAULT '{}',
  countries text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE user_id = _user_id AND is_super_admin = true
  )
$$;

CREATE POLICY "own permissions readable"
  ON public.admin_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "super admins insert permissions"
  ON public.admin_permissions FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "super admins update permissions"
  ON public.admin_permissions FOR UPDATE TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "super admins delete permissions"
  ON public.admin_permissions FOR DELETE TO authenticated
  USING (private.is_super_admin(auth.uid()));

CREATE TRIGGER admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.admin_permissions (user_id, is_super_admin, modules)
SELECT ur.user_id, true, '{}'::text[]
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

DROP POLICY IF EXISTS "super admins manage roles" ON public.user_roles;
CREATE POLICY "super admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));