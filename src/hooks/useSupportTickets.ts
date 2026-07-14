import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicket {
  id: string;
  user_id: string;
  project_id: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;            // 'todo' | 'in_progress' | 'review' | 'done'
  priority: string;          // 'low' | 'medium' | 'high' | 'critical'
  ticket_type: string;       // 'bug' | 'task' | 'question' | 'improvement'
  assignee_id: string | null;
  start_at: string | null;   // timestamptz
  end_at: string | null;     // timestamptz
  start_date: string | null; // legacy date
  end_date: string | null;   // legacy date
  admin_response: string | null;
  resolution_notes: string | null;
  responded_at: string | null;
  responded_by: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: { full_name: string; avatar_url: string | null } | null;
  assignee?: { full_name: string; avatar_url: string | null } | null;
  project_name?: string | null;
}

/** Fetch tickets, optionally filtered by project. */
export function useSupportTickets(projectId?: string) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['support-tickets', isAdmin, projectId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) query = query.eq('project_id', projectId);
      if (!isAdmin && !projectId) query = query.eq('user_id', user?.id);

      const { data, error } = await query;
      if (error) throw error;
      const tickets = (data || []) as unknown as SupportTicket[];

      // Project names
      const projectIds = [...new Set(tickets.filter(t => t.project_id).map(t => t.project_id!))];
      let projectMap = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabase.from('projects').select('id, name').in('id', projectIds);
        projectMap = new Map((projects || []).map(p => [p.id, p.name]));
      }

      // Profiles for requester + assignee
      const userIds = [
        ...new Set([
          ...tickets.map(t => t.user_id),
          ...tickets.filter(t => t.assignee_id).map(t => t.assignee_id!),
        ]),
      ];
      let profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      }

      return tickets.map(t => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null,
        assignee: t.assignee_id ? profileMap.get(t.assignee_id) || null : null,
        project_name: t.project_id ? projectMap.get(t.project_id) || null : null,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      subject: string;
      message: string;
      category?: string;
      ticket_type?: string;
      priority?: string;
      attachmentUrl?: string | null;
      projectId?: string | null;
      start_at?: string | null;
      end_at?: string | null;
      assignee_id?: string | null;
    }) => {
      const payload: any = {
        user_id: user?.id,
        subject: input.subject,
        message: input.message,
        category: input.category || 'question',
        ticket_type: input.ticket_type || 'task',
        priority: input.priority || 'medium',
        status: 'todo',
        attachment_url: input.attachmentUrl || null,
        project_id: input.projectId || null,
        // start_at fica vazio até admin confirmar (mover para fora de 'todo')
        start_at: input.start_at || null,
        end_at: input.end_at || null,
        assignee_id: input.assignee_id || null,
      };
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      updates,
    }: {
      ticketId: string;
      updates: Partial<{
        status: string;
        priority: string;
        ticket_type: string;
        category: string;
        subject: string;
        message: string;
        start_at: string | null;
        end_at: string | null;
        assignee_id: string | null;
        admin_response: string | null;
        resolution_notes: string | null;
      }>;
    }) => {
      const payload: any = { ...updates, updated_at: new Date().toISOString() };
      if (updates.admin_response !== undefined && updates.admin_response) {
        payload.responded_at = new Date().toISOString();
        payload.responded_by = user?.id;
      }
      // Auto-define start_at quando o admin "confirma" o ticket (sai de 'todo')
      // e ainda não havia data de início
      if (updates.status && updates.status !== 'todo' && updates.start_at === undefined) {
        const { data: existing } = await supabase
          .from('support_tickets' as any)
          .select('start_at')
          .eq('id', ticketId)
          .maybeSingle();
        if (existing && !(existing as any).start_at) {
          payload.start_at = new Date().toISOString();
        }
      }
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .update(payload)
        .eq('id', ticketId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });
}

// Backwards compat alias used by deleted Support.tsx
export const useRespondTicket = useUpdateTicket;

/** Fetch admins (for assignee picker). */
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin' as any);
      if (error) throw error;
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) return [] as Array<{ user_id: string; full_name: string; avatar_url: string | null }>;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', ids);
      return (profiles || []) as Array<{ user_id: string; full_name: string; avatar_url: string | null }>;
    },
  });
}
