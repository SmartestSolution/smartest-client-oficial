import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalTraining {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number | null;
  theme: string | null;
  content_type: 'video' | 'pdf';
  is_public: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useGlobalTrainings() {
  return useQuery({
    queryKey: ['global-trainings'],
    queryFn: async (): Promise<GlobalTraining[]> => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('order_index')
        .order('name');

      if (error) throw error;
      return data as GlobalTraining[];
    },
  });
}
