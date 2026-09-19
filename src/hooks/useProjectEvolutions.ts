import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildTemplateSchedule, DEFAULT_PROJECT_TEMPLATE } from './useProjectStages';

export type EvolutionMode = 'standard' | 'custom';

export interface ProjectEvolution {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  start_date: string | null;
  end_date: string | null;
  evolution_mode?: EvolutionMode;
  created_at: string;
  updated_at: string;
}

export function useProjectEvolutions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-evolutions', projectId],
    queryFn: async (): Promise<ProjectEvolution[]> => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('project_evolutions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProjectEvolution[];
    },
    enabled: !!projectId,
  });
}

export function useCreateEvolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; title: string; description?: string; start_date?: string | null; end_date?: string | null; evolution_mode: EvolutionMode }) => {
      const { data: evo, error } = await (supabase as any)
        .from('project_evolutions')
        .insert({
          project_id: input.project_id,
          title: input.title,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          evolution_mode: input.evolution_mode,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.evolution_mode === 'standard') {
        try {
          const schedule = buildTemplateSchedule(input.start_date, input.end_date);
          const stages = DEFAULT_PROJECT_TEMPLATE.map((stage, index) => ({
            evolution_id: evo.id,
            stage_name: stage.stage,
            order_index: index,
            status: 'pending',
            started_at: schedule?.[index]?.start_date
              ? new Date(`${schedule[index].start_date}T12:00:00`).toISOString()
              : null,
            completed_at: schedule?.[index]?.end_date
              ? new Date(`${schedule[index].end_date}T12:00:00`).toISOString()
              : null,
          }));
          const { data: createdStages, error: stageErr } = await (supabase as any)
            .from('evolution_stages')
            .insert(stages)
            .select('id, stage_name');
          if (stageErr) throw stageErr;

          const items = DEFAULT_PROJECT_TEMPLATE.flatMap((stage, stageIndex) => {
            const createdStage = (createdStages as { id: string; stage_name: string }[] | null)
              ?.find(row => row.stage_name === stage.stage);
            if (!createdStage) return [];
            return stage.items.map((title, itemIndex) => ({
              evolution_stage_id: createdStage.id,
              title,
              order_index: itemIndex,
              item_type: 'task',
              priority: 'medium',
              start_date: schedule?.[stageIndex]?.items[itemIndex]?.start_date ?? null,
              end_date: schedule?.[stageIndex]?.items[itemIndex]?.end_date ?? null,
            }));
          });

          if (items.length > 0) {
            const { error: itemErr } = await (supabase as any)
              .from('evolution_stage_items')
              .insert(items);
            if (itemErr) throw itemErr;
          }
        } catch (creationError) {
          await (supabase as any).from('project_evolutions').delete().eq('id', evo.id);
          throw creationError;
        }
      }
      return evo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-evolutions'] });
    },
  });
}

export function useUpdateEvolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectEvolution> }) => {
      const { error } = await (supabase as any)
        .from('project_evolutions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-evolutions'] });
    },
  });
}

export function useDeleteEvolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('project_evolutions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-evolutions'] });
    },
  });
}

export interface EvolutionStage {
  id: string;
  evolution_id: string;
  stage_name: string;
  status: string;
  order_index: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export function useEvolutionStages(evolutionId: string | undefined) {
  return useQuery({
    queryKey: ['evolution-stages', evolutionId],
    queryFn: async (): Promise<EvolutionStage[]> => {
      if (!evolutionId) return [];
      const { data, error } = await (supabase as any)
        .from('evolution_stages')
        .select('*')
        .eq('evolution_id', evolutionId)
        .order('order_index');
      if (error) throw error;
      return data as EvolutionStage[];
    },
    enabled: !!evolutionId,
  });
}

export function useUpdateEvolutionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EvolutionStage> }) => {
      const { error } = await (supabase as any)
        .from('evolution_stages')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-stages'] });
    },
  });
}

export function useCreateEvolutionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evolutionId, stageName, orderIndex }: { evolutionId: string; stageName: string; orderIndex: number }) => {
      const name = stageName.trim();
      if (!name || name.length > 120) throw new Error('Informe um nome de etapa com até 120 caracteres.');
      const { error } = await (supabase as any).from('evolution_stages').insert({
        evolution_id: evolutionId,
        stage_name: name,
        order_index: orderIndex,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evolution-stages'] }),
  });
}

export function useDeleteEvolutionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('evolution_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-stages'] });
      queryClient.invalidateQueries({ queryKey: ['evolution-stage-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-evolution-stage-items'] });
    },
  });
}
