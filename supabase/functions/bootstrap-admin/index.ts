import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Só funciona enquanto NÃO existir nenhum admin (bootstrap único).
    const { data: existingAdmins } = await admin
      .from('user_roles').select('user_id').eq('role', 'admin').limit(1)
    if (existingAdmins && existingAdmins.length > 0) {
      return json({ error: 'Já existe um administrador. Bootstrap desabilitado.' }, 403)
    }

    const email = 'fabio.ramon@smartestsolution.com'
    const password = 'Ssfjf2025'
    const fullName = 'Fabio Ramon'
    const companyName = 'Smartest Solution'

    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (createError || !userData?.user) return json({ error: createError?.message ?? 'falha' }, 400)
    const userId = userData.user.id

    await admin.from('profiles').insert({ user_id: userId, full_name: fullName, company: companyName })
    await admin.from('user_roles').insert({ user_id: userId, role: 'admin' })

    // Garante que a empresa exista
    const { data: client } = await admin.from('clients').select('id').ilike('name', companyName).maybeSingle()
    if (!client) {
      await admin.from('clients').insert({ name: companyName })
    }

    return json({ success: true, userId, email })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})
