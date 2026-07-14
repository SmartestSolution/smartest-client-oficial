import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No authorization header' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !requestingUser) return json({ error: 'Invalid token' }, 401)

    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', requestingUser.id).eq('role', 'admin').maybeSingle()
    if (!roleData) return json({ error: 'Only admins allowed' }, 403)

    const body = await req.json()
    const { action } = body

    if (action === 'list') {
      const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (listErr) return json({ error: listErr.message }, 400)

      const userIds = usersData.users.map(u => u.id)
      const [{ data: profiles }, { data: roles }, { data: projectUsers }] = await Promise.all([
        supabaseAdmin.from('profiles').select('user_id, full_name, company').in('user_id', userIds),
        supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', userIds),
        supabaseAdmin.from('project_users').select('user_id, project_id').in('user_id', userIds),
      ])

      const users = usersData.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: profiles?.find(p => p.user_id === u.id)?.full_name || '',
        company: profiles?.find(p => p.user_id === u.id)?.company || null,
        role: roles?.find(r => r.user_id === u.id)?.role || 'client',
        project_ids: projectUsers?.filter(pu => pu.user_id === u.id).map(pu => pu.project_id) || [],
      }))
      return json({ users })
    }

    if (action === 'create') {
      const { email, password, fullName, role, projectIds } = body
      if (!email || !password || !fullName || !role) return json({ error: 'Missing required fields' }, 400)

      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true
      })
      if (createError) return json({ error: createError.message }, 400)
      const userId = userData.user.id

      await supabaseAdmin.from('profiles').insert({ user_id: userId, full_name: fullName })
      await supabaseAdmin.from('user_roles').insert({ user_id: userId, role })

      if (role === 'client' && Array.isArray(projectIds) && projectIds.length > 0) {
        await supabaseAdmin.from('project_users').insert(
          projectIds.map((pid: string) => ({ user_id: userId, project_id: pid }))
        )
      }
      return json({ success: true, userId })
    }

    if (action === 'update') {
      const { userId, fullName, password, role, projectIds } = body
      if (!userId) return json({ error: 'Missing userId' }, 400)

      if (fullName !== undefined) {
        await supabaseAdmin.from('profiles').update({ full_name: fullName }).eq('user_id', userId)
      }
      if (password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
        if (pwErr) return json({ error: pwErr.message }, 400)
      }
      if (role) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role })
      }
      if (Array.isArray(projectIds)) {
        await supabaseAdmin.from('project_users').delete().eq('user_id', userId)
        if (projectIds.length > 0) {
          await supabaseAdmin.from('project_users').insert(
            projectIds.map((pid: string) => ({ user_id: userId, project_id: pid }))
          )
        }
      }
      return json({ success: true })
    }

    if (action === 'delete') {
      const { userId } = body
      if (!userId) return json({ error: 'Missing userId' }, 400)
      if (userId === requestingUser.id) return json({ error: 'Não é possível excluir a si mesmo' }, 400)

      await supabaseAdmin.from('project_users').delete().eq('user_id', userId)
      await supabaseAdmin.from('client_users').delete().eq('user_id', userId)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (delErr) return json({ error: delErr.message }, 400)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: msg }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
