import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Video {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

export function useVideos(projectId: string | undefined) {
  return useQuery({
    queryKey: ['videos', projectId],
    queryFn: async (): Promise<Video[]> => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index')
        .order('name');

      if (error) {
        throw error;
      }

      return data as Video[];
    },
    enabled: !!projectId,
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
