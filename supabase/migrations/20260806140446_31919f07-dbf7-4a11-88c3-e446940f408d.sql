REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;