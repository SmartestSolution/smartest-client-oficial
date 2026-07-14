import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAllStageItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['all-stage-items', projectId],
    queryFn: async () => {
      if (!projectId) return { totalItems: 0, completedItems: 0 };

      // Get all stages for this project
      const { data: stages, error: stagesError } = await (supabase as any)
        .from('project_stages')
        .select('id')
        .eq('project_id', projectId);

      if (stagesError) throw stagesError;
      if (!stages || stages.length === 0) return { totalItems: 0, completedItems: 0 };

      const stageIds = stages.map((s: any) => s.id);

      const { data: items, error: itemsError } = await (supabase as any)
        .from('project_stage_items')
        .select('is_completed, stage_id')
        .in('stage_id', stageIds);

      if (itemsError) throw itemsError;

      const totalItems = items?.length || 0;
      const completedItems = items?.filter((i: any) => i.is_completed).length || 0;

      return { totalItems, completedItems };
    },
    enabled: !!projectId,
  });
}
