import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  document_type: 'technical_docs' | 'data_modeling' | 'user_manuals';
  file_path: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async (): Promise<Document[]> => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('document_type')
        .order('name');

      if (error) {
        throw error;
      }

      return data as Document[];
    },
    enabled: !!projectId,
  });
}

export function getDocumentTypeLabel(type: Document['document_type']): string {
  const labels = {
    technical_docs: 'Documentação Técnica',
    data_modeling: 'Modelagem de Dados',
    user_manuals: 'Manuais de Uso',
  };
  return labels[type];
}
