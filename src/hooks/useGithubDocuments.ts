import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GithubEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number | null;
  htmlUrl: string | null;
}

export interface GithubListing {
  repo?: string;
  branch?: string;
  path?: string;
  items: GithubEntry[];
  notConfigured?: boolean;
}

export function useGithubDocuments(projectId: string | undefined, path: string) {
  return useQuery({
    queryKey: ['github-documents', projectId, path],
    queryFn: async (): Promise<GithubListing> => {
      const { data, error } = await supabase.functions.invoke('github-documents', {
        body: { projectId, path, action: 'list' },
      });
      if (error) throw error;
      if (data?.error === 'not_configured') return { items: [], notConfigured: true };
      if (data?.error) throw new Error(data.details || data.error);
      return data as GithubListing;
    },
    enabled: !!projectId,
  });
}

export async function fetchGithubFile(projectId: string, path: string) {
  const { data, error } = await supabase.functions.invoke('github-documents', {
    body: { projectId, path, action: 'file' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.details || data.error);
  const binary = atob(data.contentBase64 as string);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: data.contentType || 'application/octet-stream' });
}
