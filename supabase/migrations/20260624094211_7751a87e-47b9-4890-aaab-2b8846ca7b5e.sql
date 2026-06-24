
-- Allow admins to insert profiles (for CSV imports of existing members without auth accounts)
CREATE POLICY "Admins can insert any profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop FK to auth.users so imported members (no auth account yet) can exist.
-- They will be linked by email when they later create an account.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
