import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StageItemsSummary {
  totalItems: number;
  completedItems: number;
  byStage: Record<string, { total: number; completed: number }>;
}

export function useAllStageItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['all-stage-items', projectId],
    queryFn: async (): Promise<StageItemsSummary> => {
      const empty: StageItemsSummary = { totalItems: 0, completedItems: 0, byStage: {} };
      if (!projectId) return empty;

      const { data: stages, error: stagesError } = await (supabase as any)
        .from('project_stages')
        .select('id')
        .eq('project_id', projectId);

      if (stagesError) throw stagesError;
      if (!stages || stages.length === 0) return empty;

      const stageIds = stages.map((s: any) => s.id);

      const { data: items, error: itemsError } = await (supabase as any)
        .from('project_stage_items')
        .select('is_completed, stage_id')
        .in('stage_id', stageIds);

      if (itemsError) throw itemsError;

      const byStage: Record<string, { total: number; completed: number }> = {};
      for (const sid of stageIds) byStage[sid] = { total: 0, completed: 0 };
      for (const it of items || []) {
        const entry = byStage[it.stage_id] || { total: 0, completed: 0 };
        entry.total += 1;
        if (it.is_completed) entry.completed += 1;
        byStage[it.stage_id] = entry;
      }

      const totalItems = items?.length || 0;
      const completedItems = items?.filter((i: any) => i.is_completed).length || 0;

      return { totalItems, completedItems, byStage };
    },
    enabled: !!projectId,
  });
}
