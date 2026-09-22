import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/github';

interface Payload {
  projectId?: string;
  path?: string;
  action?: 'list' | 'file';
}

function normalizePath(base: string | null, extra: string | null): string {
  const parts = [base || '', extra || '']
    .join('/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GITHUB_API_KEY = Deno.env.get('GITHUB_API_KEY');
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const useGateway = !GITHUB_TOKEN;
    if (useGateway && (!LOVABLE_API_KEY || !GITHUB_API_KEY)) {
      return json({ error: 'Conexão com o GitHub não configurada.' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: 'Não autenticado.' }, 401);

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const projectId = typeof payload.projectId === 'string' ? payload.projectId : '';
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return json({ error: 'Projeto inválido.' }, 400);
    const action = payload.action === 'file' ? 'file' : 'list';
    const requestedPath = typeof payload.path === 'string' ? payload.path : '';

    // RLS garante que o usuário só enxerga projetos liberados para ele
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, github_repo, github_path, github_branch')
      .eq('id', projectId)
      .maybeSingle();
    if (projectError) return json({ error: projectError.message }, 400);
    if (!project) return json({ error: 'Projeto não encontrado ou sem permissão.' }, 403);

    const repo = (project as Record<string, string | null>).github_repo;
    if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      return json({ error: 'not_configured', message: 'Este projeto ainda não está conectado a um repositório.' }, 200);
    }

    const branch = (project as Record<string, string | null>).github_branch || '';
    const fullPath = normalizePath((project as Record<string, string | null>).github_path || '', requestedPath);
    const query = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    const encodedPath = fullPath.split('/').map(encodeURIComponent).join('/');
    const url = `${GATEWAY_URL}/repos/${repo}/contents/${encodedPath}${query}`;

    const response = await fetch(url, {
      headers: {
        Accept: action === 'file' ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GITHUB_API_KEY,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`GitHub request failed [${response.status}]: ${details}`);
      return json({ error: 'Falha ao consultar o GitHub', status: response.status, details }, response.status);
    }

    if (action === 'file') {
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return json({
        contentBase64: btoa(binary),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
      });
    }

    const body = await response.json();
    const entries = Array.isArray(body) ? body : [body];
    const items = entries
      .filter((entry: Record<string, unknown>) => entry.type === 'file' || entry.type === 'dir')
      .map((entry: Record<string, unknown>) => ({
        name: entry.name as string,
        path: String(entry.path).slice(
          normalizePath((project as Record<string, string | null>).github_path || '', '').length,
        ).replace(/^\//, ''),
        type: entry.type as 'file' | 'dir',
        size: (entry.size as number) ?? null,
        htmlUrl: (entry.html_url as string) ?? null,
      }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));

    return json({ repo, branch, path: requestedPath, items });
  } catch (error) {
    console.error('github-documents error', error);
    return json({ error: (error as Error).message }, 500);
  }
});
