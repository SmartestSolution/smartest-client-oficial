import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  platform: string;
  description: string | null;
  icon_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDashboardLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-links', projectId],
    queryFn: async (): Promise<DashboardLink[]> => {
      if (!projectId) return [];

      const { data, error } = await (supabase as any)
        .from('dashboard_links')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) throw error;
      return data as DashboardLink[];
    },
    enabled: !!projectId,
  });
}

export function useCreateDashboardLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: Omit<DashboardLink, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await (supabase as any)
        .from('dashboard_links')
        .insert(link);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-links'] });
    },
  });
}

export function useUpdateDashboardLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DashboardLink> }) => {
      const { error } = await (supabase as any)
        .from('dashboard_links')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-links'] });
    },
  });
}

export function useDeleteDashboardLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('dashboard_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-links'] });
    },
  });
}
