import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WorkSource = 'project' | 'support' | 'agenda';
export type WorkStatus = 'pending' | 'in_progress' | 'done' | 'blocked';
export type WorkPriority = 'urgent' | 'high' | 'medium' | 'low';
export type WorkBucket = 'urgent' | 'late' | 'high' | 'today' | 'next' | 'backlog' | 'done';

export interface WorkItem {
  id: string;
  source: WorkSource;
  title: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  stageName: string | null;
  priority: WorkPriority;
  status: WorkStatus;
  requestedAt: string | null;   // data de solicitação
  plannedDate: string | null;   // data planejada (início)
  dueDate: string | null;       // data limite
  startedAt: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  bucket: WorkBucket;
  link: string;
}

const toLocalDate = (value: string | null): Date | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isSameDay = (a: Date | null, b: Date) =>
  !!a && startOfDay(a).getTime() === startOfDay(b).getTime();

const mapTicketPriority = (p: string): WorkPriority => {
  if (p === 'critical' || p === 'urgent') return 'urgent';
  if (p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
};

const mapTicketStatus = (s: string): WorkStatus => {
  if (s === 'done') return 'done';
  if (s === 'in_progress' || s === 'review') return 'in_progress';
  if (s === 'blocked') return 'blocked';
  return 'pending';
};

const mapItemPriority = (p: string | null): WorkPriority => {
  if (p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
};

function computeBucket(item: Omit<WorkItem, 'bucket'>): WorkBucket {
  if (item.status === 'done') return 'done';
  const today = new Date();

  const limit = toLocalDate(item.dueDate) || toLocalDate(item.plannedDate);
  const isLate = !!limit && startOfDay(limit).getTime() < startOfDay(today).getTime();

  if (item.priority === 'urgent') return 'urgent';
  if (isLate) return 'late';
  if (item.priority === 'high' && item.source === 'support') return 'high';

  const planned = toLocalDate(item.plannedDate);
  if (isSameDay(planned, today) || isSameDay(limit, today)) return 'today';
  if (planned && startOfDay(planned) > startOfDay(today)) return 'next';
  if (limit && startOfDay(limit) > startOfDay(today)) return 'next';
  return 'backlog';
}

export const BUCKET_ORDER: WorkBucket[] = ['urgent', 'late', 'high', 'today', 'next', 'backlog', 'done'];

export const BUCKET_LABEL: Record<WorkBucket, string> = {
  urgent: 'Agora (urgentes)',
  late: 'Atrasadas',
  high: 'Alta prioridade',
  today: 'Hoje',
  next: 'Próximas',
  backlog: 'Sem data / Backlog',
  done: 'Concluídas',
};

export function useWorkItems() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['work-items', user?.id, isAdmin],
    enabled: !!user,
    queryFn: async (): Promise<WorkItem[]> => {
      const [projectsRes, clientsRes, stagesRes, itemsRes, ticketsRes, milestonesRes, profilesRes] = await Promise.all([
        supabase.from('projects').select('id, name, client_id'),
        supabase.from('clients').select('id, name'),
        (supabase as any).from('project_stages').select('id, name, project_id'),
        (supabase as any)
          .from('project_stage_items')
          .select('id, stage_id, title, description, is_completed, completed_at, start_date, end_date, priority, status, assignee_id, created_at'),
        (supabase as any)
          .from('support_tickets')
          .select('id, subject, message, project_id, priority, status, start_at, end_at, created_at, assignee_id, user_id'),
        (supabase as any)
          .from('project_milestones')
          .select('id, title, description, project_id, client_id, milestone_type, due_date, status, created_at')
          .in('milestone_type', ['reuniao', 'consultoria']),
        supabase.from('profiles').select('user_id, full_name'),
      ]);

      const clientMap = new Map(((clientsRes.data || []) as any[]).map((c: any) => [c.id, c.name]));
      const projectMap = new Map(
        ((projectsRes.data || []) as any[]).map((p: any) => [
          p.id,
          { name: p.name, clientName: clientMap.get(p.client_id) || null },
        ]),
      );
      const stageMap = new Map(((stagesRes as any).data || []).map((s: any) => [s.id, s]));
      const profileMap = new Map(((profilesRes.data || []) as any[]).map((p: any) => [p.user_id, p.full_name]));

      const projectItems: WorkItem[] = (((itemsRes as any).data || []) as any[]).map((it: any) => {
        const stage = stageMap.get(it.stage_id) as any;
        const project = stage ? projectMap.get(stage.project_id) : undefined;
        const base = {
          id: it.id,
          source: 'project' as const,
          title: it.title,
          description: it.description,
          projectId: stage?.project_id || null,
          projectName: project?.name || null,
          clientName: project?.clientName || null,
          stageName: stage?.name || null,
          priority: mapItemPriority(it.priority),
          status: it.is_completed
            ? ('done' as WorkStatus)
            : it.status === 'in_progress' || it.status === 'review'
              ? ('in_progress' as WorkStatus)
              : ('pending' as WorkStatus),
          requestedAt: it.created_at,
          plannedDate: it.start_date,
          dueDate: it.end_date,
          startedAt: null,
          completedAt: it.completed_at,
          assigneeId: it.assignee_id,
          assigneeName: it.assignee_id ? profileMap.get(it.assignee_id) || null : null,
          link: stage?.project_id ? `/projeto/${stage.project_id}/progresso` : '/dashboard',
        };
        return { ...base, bucket: computeBucket(base) };
      });

      const supportItems: WorkItem[] = (((ticketsRes as any).data || []) as any[]).map((t: any) => {
        const project = t.project_id ? projectMap.get(t.project_id) : undefined;
        const base = {
          id: t.id,
          source: 'support' as const,
          title: t.subject,
          description: t.message,
          projectId: t.project_id,
          projectName: project?.name || null,
          clientName: project?.clientName || null,
          stageName: null,
          priority: mapTicketPriority(t.priority),
          status: mapTicketStatus(t.status),
          requestedAt: t.created_at,
          plannedDate: t.start_at,
          dueDate: t.end_at || (mapTicketPriority(t.priority) === 'urgent' ? t.created_at : null),
          startedAt: t.start_at,
          completedAt: t.status === 'done' ? t.end_at : null,
          assigneeId: t.assignee_id,
          assigneeName: t.assignee_id ? profileMap.get(t.assignee_id) || null : null,
          link: t.project_id ? `/projeto/${t.project_id}/suporte` : '/suporte',
        };
        return { ...base, bucket: computeBucket(base) };
      });

      const agendaItems: WorkItem[] = (((milestonesRes as any).data || []) as any[]).map((milestone: any) => {
        const project = milestone.project_id ? projectMap.get(milestone.project_id) : undefined;
        const clientName = milestone.client_id ? clientMap.get(milestone.client_id) || null : project?.clientName || null;
        const dueDate = toLocalDate(milestone.due_date);
        const isPast = !!dueDate && startOfDay(dueDate).getTime() < startOfDay(new Date()).getTime();
        const base = {
          id: milestone.id,
          source: 'agenda' as const,
          title: milestone.title,
          description: milestone.description,
          projectId: milestone.project_id,
          projectName: project?.name || null,
          clientName,
          stageName: milestone.milestone_type === 'consultoria' ? 'Consultoria' : 'Reunião',
          priority: 'medium' as WorkPriority,
          status: milestone.status === 'cancelled' || milestone.status === 'completed' || isPast
            ? ('done' as WorkStatus)
            : ('pending' as WorkStatus),
          requestedAt: milestone.created_at,
          plannedDate: milestone.due_date,
          dueDate: milestone.due_date,
          startedAt: null,
          completedAt: isPast || milestone.status === 'completed' ? milestone.due_date : null,
          assigneeId: null,
          assigneeName: null,
          link: '/agenda',
        };
        return { ...base, bucket: computeBucket(base) };
      });

      // As políticas do banco devolvem somente atividades permitidas para o usuário.
      const all = [...projectItems, ...supportItems, ...agendaItems];
      const rank = (w: WorkItem) => BUCKET_ORDER.indexOf(w.bucket);
      return all.sort((a, b) => {
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        const da = toLocalDate(a.plannedDate || a.dueDate || a.requestedAt)?.getTime() ?? Infinity;
        const db = toLocalDate(b.plannedDate || b.dueDate || b.requestedAt)?.getTime() ?? Infinity;
        return da - db;
      });
    },
  });
}

/** Clientes podem solicitar somente a prioridade, sem alterar execução ou datas. */
export function useRequestWorkItemPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, priority }: { item: WorkItem; priority: WorkPriority }) => {
      if (item.source === 'agenda') throw new Error('Compromissos de agenda não aceitam prioridade');
      const { error } = await (supabase as any).rpc('request_work_item_priority', {
        _source: item.source,
        _item_id: item.id,
        _priority: priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['project-stage-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-items'] });
    },
  });
}

/** Ações executadas direto na Central, atualizando o registro de origem. */
export function useWorkItemAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      item,
      action,
      date,
      endDate,
    }: {
      item: WorkItem;
      action: 'start' | 'complete' | 'reopen' | 'block' | 'schedule';
      date?: string;
      endDate?: string;
    }) => {
      const now = new Date().toISOString();
      // Conclusão segue a data de término planejada, quando existir.
      const completionIso = (() => {
        const d = item.dueDate;
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T12:00:00`).toISOString();
        if (d) {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }
        return now;
      })();

      if (item.source === 'agenda') {
        throw new Error('Compromissos de agenda são gerenciados pela Agenda Geral');
      } else if (item.source === 'project') {
        const updates: any = { updated_at: now };
        if (action === 'start') {
          updates.status = 'in_progress';
          updates.is_completed = false;
          if (!item.assigneeId) updates.assignee_id = user?.id ?? null;
        } else if (action === 'complete') {
          updates.status = 'done';
          updates.is_completed = true;
          updates.completed_at = completionIso;
          if (!item.assigneeId) updates.assignee_id = user?.id ?? null;
        } else if (action === 'reopen') {
          updates.status = 'todo';
          updates.is_completed = false;
          updates.completed_at = null;
          if (date) updates.start_date = date.slice(0, 10);
          if (endDate) updates.end_date = endDate.slice(0, 10);
        } else if (action === 'block') {
          updates.status = 'review';
        } else if (action === 'schedule') {
          if (date) updates.start_date = date.slice(0, 10);
          if (endDate) updates.end_date = endDate.slice(0, 10);
        }
        const { error } = await (supabase as any)
          .from('project_stage_items')
          .update(updates)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const updates: any = { updated_at: now };
        if (action === 'start') {
          updates.status = 'in_progress';
          if (!item.startedAt) updates.start_at = now;
          if (!item.assigneeId) updates.assignee_id = user?.id ?? null;
        } else if (action === 'complete') {
          updates.status = 'done';
          if (!item.startedAt) updates.start_at = now;
          updates.end_at = item.dueDate ? completionIso : now;
          if (!item.assigneeId) updates.assignee_id = user?.id ?? null;
        } else if (action === 'reopen') {
          updates.status = 'todo';
          updates.end_at = null;
          if (date) updates.start_at = new Date(`${date.slice(0, 10)}T09:00:00`).toISOString();
          if (endDate) updates.end_at = new Date(`${endDate.slice(0, 10)}T18:00:00`).toISOString();
        } else if (action === 'block') {
          updates.status = 'review';
        } else if (action === 'schedule') {
          if (date) updates.start_at = date;
          if (endDate) updates.end_at = new Date(`${endDate.slice(0, 10)}T18:00:00`).toISOString();
        }
        const { error } = await (supabase as any)
          .from('support_tickets')
          .update(updates)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['project-stage-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-stage-items'] });
    },
  });
}
