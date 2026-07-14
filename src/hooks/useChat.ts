import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatConversation {
  id: string;
  project_id: string | null;
  client_user_id: string;
  created_at: string;
  updated_at: string;
  // joined
  profile?: { full_name: string; avatar_url: string | null } | null;
  project?: { name: string } | null;
  last_message?: string | null;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  // joined
  sender_profile?: { full_name: string; avatar_url: string | null } | null;
}

export function useConversations() {
  const { isAdmin, user } = useAuth();
  
  return useQuery({
    queryKey: ['chat-conversations', isAdmin],
    queryFn: async (): Promise<ChatConversation[]> => {
      const { data, error } = await (supabase as any)
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const conversations = data as ChatConversation[];
      if (conversations.length === 0) return [];

      // Fetch profiles and projects
      const userIds = [...new Set(conversations.map(c => c.client_user_id))];
      const projectIds = [...new Set(conversations.filter(c => c.project_id).map(c => c.project_id!))];

      const [profilesRes, projectsRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds) : { data: [] },
        (supabase as any).from('chat_messages').select('conversation_id, content, created_at, is_read, sender_id').order('created_at', { ascending: false }),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const projectMap = new Map<string, { id: string; name: string }>(((projectsRes as any).data || []).map((p: any) => [p.id, p]));
      const messages = (messagesRes.data || []) as any[];

      return conversations.map(c => {
        const lastMsg = messages.find((m: any) => m.conversation_id === c.id);
        const unread = messages.filter((m: any) => 
          m.conversation_id === c.id && !m.is_read && m.sender_id !== user?.id
        ).length;
        return {
          ...c,
          profile: profileMap.get(c.client_user_id) || null,
          project: c.project_id ? projectMap.get(c.project_id) || null : null,
          last_message: lastMsg?.content || null,
          unread_count: unread,
        };
      });
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId) return [];
      
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const messages = data as ChatMessage[];
      if (messages.length === 0) return [];

      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Mark unread messages as read
      const unread = messages.filter(m => !m.is_read && m.sender_id !== user?.id);
      if (unread.length > 0) {
        await (supabase as any)
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unread.map(m => m.id));
      }

      return messages.map(m => ({
        ...m,
        sender_profile: profileMap.get(m.sender_id) || null,
      }));
    },
    enabled: !!conversationId,
  });
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  senderId: string;
  attachment?: {
    url: string;
    name: string;
    type: string;
    size: number;
  } | null;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, senderId, attachment }: SendMessageInput) => {
      const payload: any = { conversation_id: conversationId, sender_id: senderId, content };
      if (attachment) {
        payload.attachment_url = attachment.url;
        payload.attachment_name = attachment.name;
        payload.attachment_type = attachment.type;
        payload.attachment_size = attachment.size;
      }
      const { error } = await (supabase as any)
        .from('chat_messages')
        .insert(payload);
      if (error) throw error;

      // Update conversation updated_at
      await (supabase as any)
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, clientUserId }: { projectId: string | null; clientUserId: string }) => {
      const { data, error } = await (supabase as any)
        .from('chat_conversations')
        .insert({ project_id: projectId, client_user_id: clientUserId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
}
