import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  milestone_type: string;
  due_date: string;
  status: string;
  recurrence: string | null;
  created_at: string;
  project_name?: string;
}

export function useAllMilestones() {
  return useQuery({
    queryKey: ['all-milestones'],
    queryFn: async (): Promise<GlobalMilestone[]> => {
      const { data, error } = await (supabase as any)
        .from('project_milestones')
        .select('*, projects(name)')
        .order('due_date');
      if (error) throw error;
      return (data as any[]).map((m: any) => ({
        ...m,
        project_name: m.projects?.name || 'Projeto',
      }));
    },
  });
}

export function useCreateGlobalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: any) => {
      const { error } = await (supabase as any)
        .from('project_milestones')
        .insert(milestone);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}

export function useUpdateGlobalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any)
        .from('project_milestones')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}

export function useDeleteGlobalMilestone() {
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
      queryClient.invalidateQueries({ queryKey: ['all-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
  });
}
