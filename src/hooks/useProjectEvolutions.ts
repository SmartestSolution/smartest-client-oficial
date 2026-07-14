import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectEvolution {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_EVO_STAGES = [
  'Levantamento',
  'Modelagem',
  'Desenvolvimento',
  'Homologação',
  'Produção',
];

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
    mutationFn: async (input: { project_id: string; title: string; description?: string; start_date?: string | null; end_date?: string | null }) => {
      const { data: evo, error } = await (supabase as any)
        .from('project_evolutions')
        .insert({
          project_id: input.project_id,
          title: input.title,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Create default 5 stages
      const stages = DEFAULT_EVO_STAGES.map((name, idx) => ({
        evolution_id: evo.id,
        stage_name: name,
        order_index: idx,
        status: 'pending',
      }));
      const { error: stageErr } = await (supabase as any).from('evolution_stages').insert(stages);
      if (stageErr) throw stageErr;
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
