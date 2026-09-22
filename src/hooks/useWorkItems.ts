import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { expandMilestoneRecurrence } from '@/lib/milestoneRecurrence';

export type WorkSource = 'project' | 'evolution' | 'support' | 'agenda';
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
  /** Tarefas de projeto/evolução não têm prioridade: ficam "Agendadas" quando possuem data. */
  scheduled: boolean;
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

function computeBucket(item: Omit<WorkItem, 'bucket'>): WorkBucket {
  if (item.status === 'done') return 'done';
  const today = new Date();
  const isSupport = item.source === 'support';

  const limit = toLocalDate(item.dueDate) || toLocalDate(item.plannedDate);
  const isLate = !!limit && startOfDay(limit).getTime() < startOfDay(today).getTime();

  // Prioridade só existe no suporte; tarefas seguem exclusivamente o cronograma.
  if (isSupport && item.priority === 'urgent') return 'urgent';
  if (isLate) return 'late';
  if (isSupport && item.priority === 'high') return 'high';

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
  backlog: 'A agendar (sem data)',
  done: 'Concluídas',
};

export function useWorkItems() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['work-items', user?.id, isAdmin],
    enabled: !!user,
    queryFn: async (): Promise<WorkItem[]> => {
      const [projectsRes, clientsRes, stagesRes, itemsRes, evolutionsRes, evolutionStagesRes, evolutionItemsRes, ticketsRes, milestonesRes, profilesRes] = await Promise.all([
        supabase.from('projects').select('id, name, client_id'),
        supabase.from('clients').select('id, name'),
        (supabase as any).from('project_stages').select('id, name, project_id'),
        (supabase as any)
          .from('project_stage_items')
          .select('id, stage_id, title, description, is_completed, completed_at, start_date, end_date, priority, status, assignee_id, created_at'),
        (supabase as any)
          .from('project_evolutions')
          .select('id, title, project_id'),
        (supabase as any)
          .from('evolution_stages')
          .select('id, evolution_id, stage_name'),
        (supabase as any)
          .from('evolution_stage_items')
          .select('id, evolution_stage_id, title, description, is_completed, completed_at, start_date, end_date, priority, status, assignee_id, created_at'),
        (supabase as any)
          .from('support_tickets')
          .select('id, subject, message, project_id, priority, status, start_at, end_at, created_at, assignee_id, user_id'),
        (supabase as any)
          .from('project_milestones')
          .select('id, title, description, project_id, client_id, milestone_type, start_date, due_date, recurrence, status, created_at')
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
      const evolutionMap = new Map(((evolutionsRes as any).data || []).map((e: any) => [e.id, e]));
      const evolutionStageMap = new Map(((evolutionStagesRes as any).data || []).map((stage: any) => [stage.id, stage]));
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
          priority: 'medium' as WorkPriority,
          scheduled: !!(it.start_date || it.end_date),
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
          scheduled: !!t.start_at,
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

      const evolutionItems: WorkItem[] = (((evolutionItemsRes as any).data || []) as any[]).map((item: any) => {
        const stage = evolutionStageMap.get(item.evolution_stage_id) as any;
        const evolution = stage ? evolutionMap.get(stage.evolution_id) as any : undefined;
        const project = evolution ? projectMap.get(evolution.project_id) : undefined;
        const base = {
          id: item.id,
          source: 'evolution' as const,
          title: item.title,
          description: item.description,
          projectId: evolution?.project_id || null,
          projectName: project?.name || null,
          clientName: project?.clientName || null,
          stageName: evolution ? `${evolution.title} · ${stage?.stage_name || 'Etapa'}` : stage?.stage_name || null,
          priority: 'medium' as WorkPriority,
          scheduled: !!(item.start_date || item.end_date),
          status: item.is_completed
            ? ('done' as WorkStatus)
            : item.status === 'in_progress' || item.status === 'review'
              ? ('in_progress' as WorkStatus)
              : ('pending' as WorkStatus),
          requestedAt: item.created_at,
          plannedDate: item.start_date,
          dueDate: item.end_date,
          startedAt: null,
          completedAt: item.completed_at,
          assigneeId: item.assignee_id,
          assigneeName: item.assignee_id ? profileMap.get(item.assignee_id) || null : null,
          link: evolution?.project_id ? `/projeto/${evolution.project_id}` : '/dashboard',
        };
        return { ...base, bucket: computeBucket(base) };
      });

      const expandedMilestones = expandMilestoneRecurrence((((milestonesRes as any).data || []) as any[]));
      const agendaItems: WorkItem[] = expandedMilestones.map((milestone: any) => {
        const project = milestone.project_id ? projectMap.get(milestone.project_id) : undefined;
        const clientName = milestone.client_id ? clientMap.get(milestone.client_id) || null : project?.clientName || null;
        const dueDate = toLocalDate(milestone.due_date);
        const isPast = !!dueDate && startOfDay(dueDate).getTime() < startOfDay(new Date()).getTime();
        const base = {
          id: milestone.occurrence_key,
          source: 'agenda' as const,
          title: milestone.title,
          description: milestone.description,
          projectId: milestone.project_id,
          projectName: project?.name || null,
          clientName,
          stageName: milestone.milestone_type === 'consultoria' ? 'Consultoria' : 'Reunião',
          priority: 'medium' as WorkPriority,
          scheduled: !!milestone.due_date,
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
      const all = [...projectItems, ...evolutionItems, ...supportItems, ...agendaItems];
      const rank = (w: WorkItem) => BUCKET_ORDER.indexOf(w.bucket);
      // Ordem: suporte primeiro, depois as tarefas agendadas por data, e por fim as sem data.
      const sourceRank = (w: WorkItem) => (w.source === 'support' ? 0 : w.scheduled ? 1 : 2);
      return all.sort((a, b) => {
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        if (sourceRank(a) !== sourceRank(b)) return sourceRank(a) - sourceRank(b);
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
      } else if (item.source === 'project' || item.source === 'evolution') {
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
          .from(item.source === 'evolution' ? 'evolution_stage_items' : 'project_stage_items')
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
      queryClient.invalidateQueries({ queryKey: ['evolution-stage-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-evolution-stage-items'] });
    },
  });
}
