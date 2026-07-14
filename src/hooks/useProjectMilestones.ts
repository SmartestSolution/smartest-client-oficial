import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  milestone_type: 'entrega' | 'reuniao' | 'marco';
  due_date: string;
  start_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async (): Promise<ProjectMilestone[]> => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date');
      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: Omit<ProjectMilestone, 'id' | 'created_at' | 'updated_at' | 'recurrence' | 'start_date'> & { recurrence?: string | null; start_date?: string | null }) => {
      const { error } = await (supabase as any)
        .from('project_milestones')
        .insert(milestone);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectMilestone> }) => {
      const { error } = await (supabase as any)
        .from('project_milestones')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('project_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}
