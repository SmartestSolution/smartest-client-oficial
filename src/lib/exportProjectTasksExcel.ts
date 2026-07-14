import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

function fmt(d: string | null | undefined): string {
  if (!d) return '';
  try { return format(new Date(d.length <= 10 ? d + 'T00:00:00' : d), 'dd/MM/yyyy HH:mm'); } catch { return d as string; }
}

const TYPE_LABEL: Record<string, string> = {
  task: 'Tarefa',
  development: 'Desenvolvimento',
  meeting: 'Reunião',
  review: 'Revisão',
  other: 'Outro',
  bug: 'Bug',
  question: 'Dúvida',
  improvement: 'Melhoria',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
  pending: 'Pendente',
  completed: 'Concluído',
  open: 'A Fazer',
  answered: 'Em Progresso',
  closed: 'Concluído',
};

/**
 * Tabela unificada Tarefas (checklist) + Suporte.
 * Todas as colunas são compartilhadas — nada de "Origem só preenche, Etapa só preenche".
 *
 * Colunas: Projeto | Vínculo | Origem | Etapa | Título | Descrição | Tipo |
 *          Prioridade | Status | Responsável | Solicitante | Início | Prazo |
 *          Concluído em | Observação / Resposta | Criado em
 */
export async function exportProjectTasksExcel(projectId: string) {
  const [proj, stages, items, milestones, tickets, profiles] = await Promise.all([
    (supabase as any).from('projects').select('id,name').eq('id', projectId).single(),
    (supabase as any).from('project_stages').select('id,stage_name,order_index,status').eq('project_id', projectId),
    (supabase as any).from('project_stage_items')
      .select('*, project_stages!inner(project_id, stage_name, order_index)')
      .eq('project_stages.project_id', projectId),
    (supabase as any).from('project_milestones').select('*').eq('project_id', projectId),
    (supabase as any).from('support_tickets').select('*').eq('project_id', projectId),
    (supabase as any).from('profiles').select('user_id, full_name'),
  ]);

  if (proj.error) throw proj.error;
  const projectName = proj.data.name;
  const nameOf = (id: string | null | undefined) =>
    id ? (profiles.data || []).find((p: any) => p.user_id === id)?.full_name || '' : '';

  type Row = Record<string, any>;
  const rows: Row[] = [];

  // ----- Checklist / Etapas -----
  (items.data || []).forEach((i: any) => {
    rows.push({
      'Projeto': projectName,
      'Vínculo': 'Projeto',
      'Origem': 'Checklist / Etapa',
      'Etapa': i.project_stages?.stage_name || '',
      'Título': i.title,
      'Descrição': i.description || '',
      'Tipo': TYPE_LABEL[i.item_type] || i.item_type || 'Tarefa',
      'Prioridade': PRIORITY_LABEL[i.priority] || PRIORITY_LABEL.medium,
      'Status': STATUS_LABEL[i.status] || (i.is_completed ? 'Concluído' : 'A Fazer'),
      'Responsável': nameOf(i.assignee_id),
      'Solicitante': '',
      'Início': fmt(i.start_date),
      'Prazo': fmt(i.end_date),
      'Concluído em': fmt(i.completed_at),
      'Observação / Resposta': i.description || '',
      'Criado em': fmt(i.created_at),
    });
  });

  // ----- Agenda / Marcos -----
  (milestones.data || []).forEach((m: any) => {
    rows.push({
      'Projeto': projectName,
      'Vínculo': 'Projeto',
      'Origem': 'Agenda',
      'Etapa': '',
      'Título': m.title,
      'Descrição': m.description || '',
      'Tipo': TYPE_LABEL[m.milestone_type] || m.milestone_type || 'Marco',
      'Prioridade': '',
      'Status': STATUS_LABEL[m.status] || m.status || '',
      'Responsável': '',
      'Solicitante': '',
      'Início': '',
      'Prazo': fmt(m.due_date),
      'Concluído em': '',
      'Observação / Resposta': m.recurrence ? `Recorrência: ${m.recurrence}` : '',
      'Criado em': fmt(m.created_at),
    });
  });

  // ----- Suporte -----
  (tickets.data || []).forEach((t: any) => {
    rows.push({
      'Projeto': projectName,
      'Vínculo': t.project_id ? 'Projeto' : 'Tarefa avulsa',
      'Origem': 'Suporte',
      'Etapa': '',
      'Título': t.subject,
      'Descrição': t.message || '',
      'Tipo': TYPE_LABEL[t.ticket_type] || t.ticket_type || '',
      'Prioridade': PRIORITY_LABEL[t.priority] || t.priority || '',
      'Status': STATUS_LABEL[t.status] || t.status || '',
      'Responsável': nameOf(t.assignee_id),
      'Solicitante': nameOf(t.user_id),
      'Início': fmt(t.start_at || t.start_date),
      'Prazo': fmt(t.end_at || t.end_date),
      'Concluído em': fmt(t.responded_at),
      'Observação / Resposta': t.resolution_notes || t.admin_response || '',
      'Criado em': fmt(t.created_at),
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = rows.length > 0
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([['(sem registros)']]);

  // Largura razoável das colunas
  const widths = [
    20, 14, 18, 22, 32, 40, 16, 12, 14, 22, 22, 18, 18, 18, 40, 18,
  ];
  (ws as any)['!cols'] = widths.map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Tarefas & Suporte');

  const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}-tarefas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
