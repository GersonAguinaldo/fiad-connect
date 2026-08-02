CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Move has_role out of the API-exposed schema (existing policies keep working by OID)
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Certificate verification is only for anonymous visitors
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM authenticated;
