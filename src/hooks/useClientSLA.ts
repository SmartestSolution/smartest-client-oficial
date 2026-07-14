import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientSLA {
  high: number;   // horas
  medium: number;
  low: number;
}

export const DEFAULT_SLA: ClientSLA = { high: 4, medium: 12, low: 24 };

/** Returns SLA (in hours) for the client owning the given project. */
export function useProjectClientSLA(projectId?: string) {
  return useQuery({
    queryKey: ['project-client-sla', projectId],
    queryFn: async (): Promise<ClientSLA> => {
      if (!projectId) return DEFAULT_SLA;
      const { data: proj } = await supabase
        .from('projects').select('client_id').eq('id', projectId).maybeSingle();
      if (!proj?.client_id) return DEFAULT_SLA;
      const { data: client } = await (supabase as any)
        .from('clients')
        .select('sla_high_hours, sla_medium_hours, sla_low_hours')
        .eq('id', proj.client_id)
        .maybeSingle();
      return {
        high: client?.sla_high_hours ?? 4,
        medium: client?.sla_medium_hours ?? 12,
        low: client?.sla_low_hours ?? 24,
      };
    },
    enabled: !!projectId,
  });
}

/** Hours between two ISO dates. */
function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'na';

export interface SlaInfo {
  state: SlaState;
  limitHours: number | null;
  elapsedHours: number;
  remainingHours: number | null;
}

/** Map ticket priority to SLA hour limit. 'critical' falls back to 'high'. */
export function slaLimitForPriority(priority: string, sla: ClientSLA): number | null {
  switch (priority) {
    case 'high':
    case 'critical':
      return sla.high;
    case 'medium':
      return sla.medium;
    case 'low':
      return sla.low;
    default:
      return null;
  }
}

/** Compute SLA state for a ticket. */
export function computeSlaInfo(ticket: {
  status: string;
  priority: string;
  start_at: string | null;
  created_at: string;
  responded_at: string | null;
  end_at: string | null;
}, sla: ClientSLA): SlaInfo {
  const limit = slaLimitForPriority(ticket.priority, sla);
  if (limit == null) return { state: 'na', limitHours: null, elapsedHours: 0, remainingHours: null };

  const start = ticket.start_at || ticket.created_at;
  const isDone = ticket.status === 'done' || ticket.status === 'closed';
  const endRef = isDone ? (ticket.end_at || ticket.responded_at || new Date().toISOString()) : new Date().toISOString();
  const elapsed = hoursBetween(start, endRef);
  const remaining = limit - elapsed;

  let state: SlaState;
  if (elapsed > limit) state = 'breached';
  else if (remaining <= limit * 0.25) state = 'at_risk';
  else state = 'on_track';

  return { state, limitHours: limit, elapsedHours: elapsed, remainingHours: remaining };
}
