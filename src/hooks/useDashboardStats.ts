import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardStats() {
  const documentsQuery = useQuery({
    queryKey: ['dashboard-documents-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const trainingsQuery = useQuery({
    queryKey: ['dashboard-trainings-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const stagesQuery = useQuery({
    queryKey: ['dashboard-stages-by-project'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_stages')
        .select('project_id, status');
      if (error) throw error;
      const grouped: Record<string, { status: string }[]> = {};
      for (const row of data || []) {
        if (!grouped[row.project_id]) grouped[row.project_id] = [];
        grouped[row.project_id].push({ status: row.status });
      }
      return grouped;
    },
  });

  return {
    documentsCount: documentsQuery.data ?? 0,
    trainingsCount: trainingsQuery.data ?? 0,
    stagesByProject: stagesQuery.data ?? {},
    isLoading: documentsQuery.isLoading || trainingsQuery.isLoading || stagesQuery.isLoading,
  };
}
