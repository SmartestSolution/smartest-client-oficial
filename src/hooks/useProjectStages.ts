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

export function useCreateDefaultStages() {
  const queryClient = useQueryClient();

  const defaultStages = [
    'Levantamento',
    'Modelagem', 
    'Desenvolvimento',
    'Homologação',
    'Produção',
  ];

  return useMutation({
    mutationFn: async (projectId: string) => {
      const stages = defaultStages.map((name, index) => ({
        project_id: projectId,
        stage_name: name,
        order_index: index,
        status: 'pending',
      }));

      const { error } = await (supabase as any)
        .from('project_stages')
        .insert(stages);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stages'] });
    },
  });
}
