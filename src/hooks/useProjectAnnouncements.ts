import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAnnouncement {
  id: string;
  project_id: string;
  title: string;
  content: string;
  announcement_type: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectAnnouncements(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-announcements', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_announcements' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProjectAnnouncement[];
    },
    enabled: !!projectId,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: {
      project_id: string;
      title: string;
      content: string;
      announcement_type: string;
      is_pinned?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('project_announcements' as any)
        .insert(announcement as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-announcements', variables.project_id] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; project_id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('project_announcements' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-announcements', variables.project_id] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_announcements' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-announcements', variables.projectId] });
    },
  });
}
