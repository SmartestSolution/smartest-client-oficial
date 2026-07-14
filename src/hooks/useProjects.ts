import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  client_id: string;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      return data as unknown as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as unknown as Project;
    },
    enabled: !!id,
  });
}

export function computeProjectStatus(project: Project, stages?: { status: string }[]): string {
  // If manually set to archived, keep it
  if (project.status === 'archived') return 'archived';
  
  const allCompleted = stages && stages.length > 0 && stages.every(s => s.status === 'completed');
  if (allCompleted) return 'completed';
  
  const hasInProgress = stages?.some(s => s.status === 'in_progress' || s.status === 'completed');
  
  if (project.end_date) {
    const endDate = new Date(project.end_date + 'T23:59:59');
    const today = new Date();
    if (today > endDate && !allCompleted) return 'delayed';
  }
  
  if (hasInProgress) return 'in_progress';
  
  return 'pending';
}
