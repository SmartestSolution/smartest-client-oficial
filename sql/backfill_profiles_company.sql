-- Preenche profiles.company com o nome da empresa vinculada em client_users.
-- Rode uma única vez no SQL Editor para corrigir usuários já cadastrados.

UPDATE public.profiles p
SET company = c.name
FROM public.client_users cu
JOIN public.clients c ON c.id = cu.client_id
WHERE cu.user_id = p.user_id
  AND (p.company IS DISTINCT FROM c.name);
