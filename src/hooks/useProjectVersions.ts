import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: string;
  title: string;
  description: string | null;
  release_notes: string | null;
  released_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-versions', projectId],
    queryFn: async (): Promise<ProjectVersion[]> => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('released_at', { ascending: false });

      if (error) throw error;
      return data as ProjectVersion[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProjectVersion(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      version_number: string;
      title: string;
      description?: string;
      release_notes?: string;
      created_by?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('project_versions')
        .insert({
          project_id: projectId!,
          ...data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-versions', projectId] });
    },
  });
}

export function useDeleteProjectVersion(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('project_versions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-versions', projectId] });
    },
  });
}
