CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  ambassador_fee_amount numeric(12,2) NOT NULL DEFAULT 25000,
  ambassador_fee_currency text NOT NULL DEFAULT 'XOF',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "App settings readable by everyone" ON public.app_settings;
CREATE POLICY "App settings readable by everyone"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins insert app settings" ON public.app_settings;
CREATE POLICY "Admins insert app settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update app settings" ON public.app_settings;
CREATE POLICY "Admins update app settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    country,
    city,
    address,
    birth_date,
    birth_place,
    sex,
    membership_type
  )
  VALUES (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'birth_place', ''),
    nullif(new.raw_user_meta_data ->> 'sex', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'membership_type', ''), 'Classique')
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
    INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, CASE WHEN is_first THEN 'admin'::app_role ELSE 'membre'::app_role END);

  RETURN new;
END;
$$;
