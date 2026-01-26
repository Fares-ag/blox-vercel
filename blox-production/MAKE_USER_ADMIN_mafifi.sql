-- ============================================
-- Make a user ADMIN (mafifi@q-auto.com)
-- ============================================
-- Run in Supabase Dashboard -> SQL Editor
-- Safe to re-run.
-- ============================================

-- The user you provided:
-- id:    e76c4aee-42a9-47dc-b47c-c77bcec70446
-- email: mafifi@q-auto.com

-- 1) Source of truth for our app RBAC: public.users.role
--    (This is what is_admin() checks first.)
INSERT INTO public.users (id, email, role, updated_at)
VALUES (
  'e76c4aee-42a9-47dc-b47c-c77bcec70446',
  'mafifi@q-auto.com',
  'admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = 'admin',
  updated_at = NOW();

-- 2) Optional: also set auth.users metadata so JWT claims can carry role/user_role.
--    This is useful for any policies that check auth.jwt() metadata directly.
--    NOTE: After this, the user must sign out + sign back in to refresh JWT.
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin', 'user_role', 'admin')
WHERE id = 'e76c4aee-42a9-47dc-b47c-c77bcec70446';

-- 3) Quick verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'company_id'
  ) THEN
    EXECUTE $q$
      SELECT id, email, role, company_id, updated_at
      FROM public.users
      WHERE id = 'e76c4aee-42a9-47dc-b47c-c77bcec70446'
    $q$;
  ELSE
    EXECUTE $q$
      SELECT id, email, role, updated_at
      FROM public.users
      WHERE id = 'e76c4aee-42a9-47dc-b47c-c77bcec70446'
    $q$;
  END IF;
END $$;

