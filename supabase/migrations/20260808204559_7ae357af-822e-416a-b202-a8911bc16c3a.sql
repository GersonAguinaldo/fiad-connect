CREATE OR REPLACE FUNCTION public.directory_members(_q text DEFAULT NULL, _ids uuid[] DEFAULT NULL)
RETURNS TABLE(id uuid, full_name text, city text, country text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
         nullif(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), '') AS full_name,
         p.city, p.country, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (_ids IS NULL OR p.id = ANY(_ids))
    AND (
      _q IS NULL OR btrim(_q) = '' OR
      (coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'') || ' ' || coalesce(p.city,'') || ' ' || coalesce(p.country,''))
        ILIKE '%' || btrim(_q) || '%'
    )
  ORDER BY p.first_name NULLS LAST
  LIMIT 200
$$;

REVOKE EXECUTE ON FUNCTION public.directory_members(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directory_members(text, uuid[]) TO authenticated;