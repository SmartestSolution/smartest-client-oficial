import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  kind: 'start' | 'end';
  source: 'progress' | 'evolution';
  item_type: string; // kept for back-compat with UI
  stage_name: string;
  project_id: string;
  project_name: string;
  is_completed: boolean;
}

const MAIN_STAGES = ['Levantamento', 'Modelagem', 'Desenvolvimento', 'Homologação', 'Produção'];

function toDateOnly(ts: string | null): string | null {
  if (!ts) return null;
  // started_at/completed_at are timestamps; take YYYY-MM-DD
  return ts.slice(0, 10);
}

async function fetchProgressEvents(projectId?: string): Promise<AgendaEvent[]> {
  let q = (supabase as any)
    .from('project_stages')
    .select('id, stage_name, started_at, completed_at, status, project_id, projects(name)')
    .in('stage_name', MAIN_STAGES);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  const out: AgendaEvent[] = [];
  for (const s of (data as any[]) || []) {
    const base = {
      id: s.id as string,
      title: s.stage_name as string,
      source: 'progress' as const,
      item_type: 'stage',
      stage_name: s.stage_name as string,
      project_id: s.project_id as string,
      project_name: (s.projects?.name as string) || 'Projeto',
      is_completed: s.status === 'completed',
    };
    const start = toDateOnly(s.started_at);
    const end = toDateOnly(s.completed_at);
    if (start) out.push({ ...base, date: start, kind: 'start' });
    if (end) out.push({ ...base, date: end, kind: 'end' });
  }
  return out;
}

async function fetchEvolutionEvents(projectId?: string): Promise<AgendaEvent[]> {
  let q = (supabase as any)
    .from('evolution_stages')
    .select(
      'id, stage_name, started_at, completed_at, status, project_evolutions!inner(id, title, project_id, projects(name))'
    )
    .in('stage_name', MAIN_STAGES);
  if (projectId) q = q.eq('project_evolutions.project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  const out: AgendaEvent[] = [];
  for (const s of (data as any[]) || []) {
    const evo = s.project_evolutions;
    if (!evo?.project_id) continue;
    const base = {
      id: s.id as string,
      title: `${evo.title} — ${s.stage_name}`,
      source: 'evolution' as const,
      item_type: 'stage',
      stage_name: s.stage_name as string,
      project_id: evo.project_id as string,
      project_name: (evo.projects?.name as string) || 'Projeto',
      is_completed: s.status === 'completed',
    };
    const start = toDateOnly(s.started_at);
    const end = toDateOnly(s.completed_at);
    if (start) out.push({ ...base, date: start, kind: 'start' });
    if (end) out.push({ ...base, date: end, kind: 'end' });
  }
  return out;
}

export function useProjectAgendaEvents(projectId: string | undefined) {
  return useQuery({
    queryKey: ['agenda-events', projectId],
    queryFn: async (): Promise<AgendaEvent[]> => {
      if (!projectId) return [];
      const [a, b] = await Promise.all([
        fetchProgressEvents(projectId),
        fetchEvolutionEvents(projectId),
      ]);
      return [...a, ...b];
    },
    enabled: !!projectId,
  });
}

export function useAllAgendaEvents() {
  return useQuery({
    queryKey: ['agenda-events', 'all'],
    queryFn: async (): Promise<AgendaEvent[]> => {
      const [a, b] = await Promise.all([
        fetchProgressEvents(),
        fetchEvolutionEvents(),
      ]);
      return [...a, ...b];
    },
  });
}
