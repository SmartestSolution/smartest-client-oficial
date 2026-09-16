-- =============================================================
-- Corrige o campo profiles.company
-- 1) Permite que admins atualizem qualquer profile (RLS)
-- 2) Preenche company para todos os usuários já existentes
-- 3) Mantém company sincronizada automaticamente via trigger
-- =============================================================

-- ------------------------------------------------------------
-- 1) RLS: admin pode ler e editar qualquer profile
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Users view own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 2) Backfill: company = nome da empresa vinculada em client_users
-- ------------------------------------------------------------
UPDATE public.profiles p
SET company = c.name
FROM public.client_users cu
JOIN public.clients c ON c.id = cu.client_id
WHERE cu.user_id = p.user_id
  AND (p.company IS DISTINCT FROM c.name);

-- ------------------------------------------------------------
-- 3) Trigger: ao vincular/alterar a empresa do usuário em
--    client_users, grava automaticamente em profiles.company
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  SELECT name INTO _name FROM public.clients WHERE id = NEW.client_id;

  UPDATE public.profiles SET company = _name WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, company)
    VALUES (NEW.user_id, _name)
    ON CONFLICT (user_id) DO UPDATE SET company = EXCLUDED.company;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_company ON public.client_users;
CREATE TRIGGER trg_sync_profile_company
AFTER INSERT OR UPDATE OF client_id ON public.client_users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_company();

-- ------------------------------------------------------------
-- 4) Trigger: se o nome da empresa mudar, atualiza os perfis
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profiles_on_client_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.profiles p
    SET company = NEW.name
    FROM public.client_users cu
    WHERE cu.user_id = p.user_id
      AND cu.client_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profiles_on_client_rename ON public.clients;
CREATE TRIGGER trg_sync_profiles_on_client_rename
AFTER UPDATE OF name ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_on_client_rename();

-- ------------------------------------------------------------
-- Conferência
-- ------------------------------------------------------------
-- SELECT p.user_id, p.full_name, p.company FROM public.profiles p ORDER BY p.company NULLS FIRST;
