import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: string;
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectStages(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-stages', projectId],
    queryFn: async (): Promise<ProjectStage[]> => {
      if (!projectId) return [];
      
      const { data, error } = await (supabase as any)
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) throw error;
      return data as ProjectStage[];
    },
    enabled: !!projectId,
  });
}

export function useUpdateProjectStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectStage> }) => {
      const { error } = await (supabase as any)
        .from('project_stages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stages'] });
    },
  });
}

export const DEFAULT_PROJECT_TEMPLATE: { stage: string; weight: number; items: string[] }[] = [
  {
    stage: 'Levantamento',
    weight: 0.15,
    items: ['Entendimento de Negócio', 'Levantamento de Requisitos', 'Levantamentos Adicionais'],
  },
  {
    stage: 'Modelagem',
    weight: 0.25,
    items: ['Fontes de Dados', 'Tipagem de Dados', 'Esquema'],
  },
  {
    stage: 'Desenvolvimento',
    weight: 0.45,
    items: [
      'Prototipação',
      'Relacionamentos',
      'Medidas',
      "Background's",
      'Visuais',
      'ETL - Completa',
      "KPI's e Métricas",
    ],
  },
  {
    stage: 'Homologação',
    weight: 0.10,
    items: ['Validação de Dados', 'Validação do Aplicativo'],
  },
  {
    stage: 'Produção',
    weight: 0.05,
    items: [
      'Postagem no Service',
      'Configuração de Gateway',
      'Agendamento de Atualização',
      'Permissões de Aplicativo',
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${toDateOnly(dateStr)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDays(start: string, end: string) {
  const a = new Date(`${toDateOnly(start)}T00:00:00Z`).getTime();
  const b = new Date(`${toDateOnly(end)}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

export interface PlannedStage {
  stage: string;
  weight: number;
  start_date: string;
  end_date: string;
  items: { title: string; start_date: string; end_date: string }[];
}

/**
 * Divide o período do projeto entre as etapas de acordo com o peso (%)
 * e, dentro de cada etapa, divide proporcionalmente entre as tarefas.
 */
export function buildTemplateSchedule(
  startDate?: string | null,
  endDate?: string | null
): PlannedStage[] | null {
  if (!startDate || !endDate) return null;
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const totalDays = diffDays(start, end) + 1; // inclusivo
  if (totalDays <= 0) return null;

  // dias por etapa (mínimo 1), ajustando o resto na maior etapa
  const raw = DEFAULT_PROJECT_TEMPLATE.map((s) => s.weight * totalDays);
  const days = raw.map((d) => Math.max(1, Math.floor(d)));
  let diff = totalDays - days.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const idx = diff > 0
      ? raw.indexOf(Math.max(...raw))
      : days.indexOf(Math.max(...days));
    if (diff > 0) {
      // distribui sobras nas etapas com maior peso, em ordem
      const order = raw.map((v, i) => i).sort((a, b) => raw[b] - raw[a]);
      for (const i of order) {
        if (diff === 0) break;
        days[i] += 1;
        diff -= 1;
      }
    } else {
      if (days[idx] > 1) {
        days[idx] -= 1;
        diff += 1;
      } else break;
    }
  }

  let cursor = start;
  return DEFAULT_PROJECT_TEMPLATE.map((s, i) => {
    const stageStart = cursor;
    const stageDays = days[i];
    const stageEnd = addDays(stageStart, stageDays - 1);
    cursor = addDays(stageEnd, 1);

    // divide os dias da etapa entre as tarefas
    const n = s.items.length || 1;
    const per = Math.max(1, Math.floor(stageDays / n));
    let iCursor = stageStart;
    const items = s.items.map((title, idx) => {
      const isLast = idx === s.items.length - 1;
      const itemStart = iCursor;
      const itemEnd = isLast ? stageEnd : addDays(itemStart, per - 1);
      const safeEnd = itemEnd > stageEnd ? stageEnd : itemEnd;
      iCursor = addDays(safeEnd, 1) > stageEnd ? stageEnd : addDays(safeEnd, 1);
      return { title, start_date: itemStart, end_date: safeEnd };
    });

    return { stage: s.stage, weight: s.weight, start_date: stageStart, end_date: stageEnd, items };
  });
}

export function useCreateDefaultStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('start_date, end_date')
        .eq('id', projectId)
        .maybeSingle();

      const schedule = buildTemplateSchedule(project?.start_date, project?.end_date);

      const stages = DEFAULT_PROJECT_TEMPLATE.map((s, index) => {
        const plan = schedule?.[index];
        return {
          project_id: projectId,
          stage_name: s.stage,
          order_index: index,
          status: 'pending',
          started_at: plan ? new Date(`${plan.start_date}T00:00:00Z`).toISOString() : null,
          completed_at: null,
        };
      });

      const { data: created, error } = await (supabase as any)
        .from('project_stages')
        .insert(stages)
        .select('id, stage_name');

      if (error) throw error;

      const items = DEFAULT_PROJECT_TEMPLATE.flatMap((s, index) => {
        const stageRow = (created as any[])?.find((c) => c.stage_name === s.stage);
        if (!stageRow) return [];
        const plan = schedule?.[index];
        return s.items.map((title, idx) => ({
          stage_id: stageRow.id,
          title,
          order_index: idx,
          item_type: 'task',
          priority: 'medium',
          start_date: plan?.items[idx]?.start_date ?? null,
          end_date: plan?.items[idx]?.end_date ?? null,
        }));
      });

      if (items.length > 0) {
        const { error: itemsError } = await (supabase as any)
          .from('project_stage_items')
          .insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stages'] });
      queryClient.invalidateQueries({ queryKey: ['project-stage-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-items'] });
    },
  });
}

