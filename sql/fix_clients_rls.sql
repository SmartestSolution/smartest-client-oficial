-- ============================================================
-- Fix / reset RLS policies for `clients` and `client_users`
-- Rode este script inteiro no SQL Editor do Supabase.
-- ============================================================

-- ---------- CLIENTS ----------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Garante privilégios básicos ao roles (a Data API precisa disso)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Remove qualquer política antiga com nomes conhecidos para evitar duplicidade
DROP POLICY IF EXISTS "Admins manage clients"          ON public.clients;
DROP POLICY IF EXISTS "Admins can select clients"      ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients"      ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients"      ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients"      ON public.clients;
DROP POLICY IF EXISTS "Clients read own client"        ON public.clients;
DROP POLICY IF EXISTS "Users read their client"        ON public.clients;
DROP POLICY IF EXISTS "Enable read for all users"      ON public.clients;

-- Admin (função is_admin já existe no projeto) pode tudo
CREATE POLICY "Admins manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Usuário comum pode ler apenas a(s) empresa(s) à qual está vinculado
CREATE POLICY "Users read their client"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id
        AND cu.user_id = auth.uid()
    )
  );

-- ---------- CLIENT_USERS ----------
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_users TO authenticated;
GRANT ALL ON public.client_users TO service_role;

DROP POLICY IF EXISTS "Admins manage client_users"     ON public.client_users;
DROP POLICY IF EXISTS "Users read own client_users"    ON public.client_users;

CREATE POLICY "Admins manage client_users"
  ON public.client_users FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users read own client_users"
  ON public.client_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
