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

export const DEFAULT_PROJECT_TEMPLATE: { stage: string; items: string[] }[] = [
  {
    stage: 'Levantamento',
    items: ['Entendimento de Negócio', 'Levantamento de Requisitos', 'Levantamentos Adicionais'],
  },
  {
    stage: 'Modelagem',
    items: ['Fontes de Dados', 'Tipagem de Dados', 'Esquema'],
  },
  {
    stage: 'Desenvolvimento',
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
    items: ['Validação de Dados', 'Validação do Aplicativo'],
  },
  {
    stage: 'Produção',
    items: [
      'Postagem no Service',
      'Configuração de Gateway',
      'Agendamento de Atualização',
      'Permissões de Aplicativo',
    ],
  },
];

export function useCreateDefaultStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const stages = DEFAULT_PROJECT_TEMPLATE.map((s, index) => ({
        project_id: projectId,
        stage_name: s.stage,
        order_index: index,
        status: 'pending',
      }));

      const { data: created, error } = await (supabase as any)
        .from('project_stages')
        .insert(stages)
        .select('id, stage_name');

      if (error) throw error;

      const items = DEFAULT_PROJECT_TEMPLATE.flatMap((s) => {
        const stageRow = (created as any[])?.find((c) => c.stage_name === s.stage);
        if (!stageRow) return [];
        return s.items.map((title, idx) => ({
          stage_id: stageRow.id,
          title,
          order_index: idx,
          item_type: 'task',
          priority: 'medium',
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
