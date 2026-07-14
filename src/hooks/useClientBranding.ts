import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientBranding {
  id: string;
  name: string;
  logo_url: string | null;
  sidebar_color: string | null;
}

export function useClientBranding() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['client-branding', user?.id],
    queryFn: async () => {
      if (!user || isAdmin) return null;

      // First get the client_id for this user
      const { data: clientUser, error: clientUserError } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientUserError || !clientUser) return null;

      // Then get the client branding info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, logo_url, sidebar_color')
        .eq('id', clientUser.client_id)
        .maybeSingle();

      if (clientError) throw clientError;
      return client as ClientBranding;
    },
    enabled: !!user && !isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
