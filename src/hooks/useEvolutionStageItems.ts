import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectStageItem, StageItemType, StageItemPriority } from './useProjectStageItems';

export type EvolutionStageItem = ProjectStageItem & { evolution_stage_id: string };

export function useEvolutionStageItems(evolutionStageId: string | undefined) {
  return useQuery({
    queryKey: ['evolution-stage-items', evolutionStageId],
    queryFn: async (): Promise<EvolutionStageItem[]> => {
      if (!evolutionStageId) return [];
      const { data, error } = await (supabase as any)
        .from('evolution_stage_items')
        .select('*, documents(name, file_path)')
        .eq('evolution_stage_id', evolutionStageId)
        .order('order_index');
      if (error) throw error;
      return (data as any[]).map((item: any) => ({
        ...item,
        stage_id: item.evolution_stage_id, // alias for StageChecklist
        document: item.documents || null,
      }));
    },
    enabled: !!evolutionStageId,
  });
}

export function useCreateEvolutionStageItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      evolution_stage_id: string;
      title: string;
      order_index?: number;
      item_type?: StageItemType;
      priority?: StageItemPriority;
    }) => {
      const { error } = await (supabase as any).from('evolution_stage_items').insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evolution-stage-items'] });
      qc.invalidateQueries({ queryKey: ['all-evolution-stage-items'] });
    },
  });
}

export function useUpdateEvolutionStageItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EvolutionStageItem> }) => {
      const { error } = await (supabase as any)
        .from('evolution_stage_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evolution-stage-items'] });
      qc.invalidateQueries({ queryKey: ['all-evolution-stage-items'] });
    },
  });
}

export function useDeleteEvolutionStageItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('evolution_stage_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evolution-stage-items'] });
      qc.invalidateQueries({ queryKey: ['all-evolution-stage-items'] });
    },
  });
}

export function useAllEvolutionStageItems(evolutionId: string | undefined) {
  return useQuery({
    queryKey: ['all-evolution-stage-items', evolutionId],
    queryFn: async () => {
      if (!evolutionId) return { totalItems: 0, completedItems: 0 };
      const { data: stages, error: sErr } = await (supabase as any)
        .from('evolution_stages')
        .select('id')
        .eq('evolution_id', evolutionId);
      if (sErr) throw sErr;
      if (!stages?.length) return { totalItems: 0, completedItems: 0 };
      const ids = stages.map((s: any) => s.id);
      const { data: items, error: iErr } = await (supabase as any)
        .from('evolution_stage_items')
        .select('is_completed')
        .in('evolution_stage_id', ids);
      if (iErr) throw iErr;
      return {
        totalItems: items?.length || 0,
        completedItems: items?.filter((i: any) => i.is_completed).length || 0,
      };
    },
    enabled: !!evolutionId,
  });
}
