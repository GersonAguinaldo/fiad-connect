-- 1. profiles: owner or admin only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. certificates: owner or admin; anon verification via RPC only
DROP POLICY IF EXISTS "cert_public_verify" ON public.certificates;
DROP POLICY IF EXISTS "cert_read" ON public.certificates;
CREATE POLICY "cert_read_own" ON public.certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (code text, holder_name text, formation_title text, issued_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.holder_name, c.formation_title, c.issued_at
  FROM public.certificates c
  WHERE _code IS NOT NULL
    AND length(btrim(_code)) BETWEEN 4 AND 64
    AND c.code = upper(btrim(_code))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 3. events: only rows the member is targeted by
DROP POLICY IF EXISTS "Events viewable by authenticated" ON public.events;
CREATE POLICY "Events viewable by targeted members" ON public.events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (cardinality(events.target_categories) = 0 OR p.category = ANY (events.target_categories))
        AND (cardinality(events.target_membership_types) = 0 OR p.membership_type = ANY (events.target_membership_types))
        AND (cardinality(events.target_cities) = 0 OR p.city = ANY (events.target_cities))
        AND (cardinality(events.target_countries) = 0 OR p.country = ANY (events.target_countries))
    )
  );

-- 4. storage: stop public listing of the event-resources bucket
DROP POLICY IF EXISTS "Event resources public read" ON storage.objects;
CREATE POLICY "Event resources readable by authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-resources');

-- 5. has_role must not be directly callable by API roles
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
