import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return d; }
}

function fmtDay(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d.length <= 10 ? d + 'T00:00:00' : d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

export async function exportProjectVersioning(projectId: string) {
  const [proj, stages, items, milestones, docs, versions, tickets] = await Promise.all([
    (supabase as any).from('projects').select('*').eq('id', projectId).single(),
    (supabase as any).from('project_stages').select('*').eq('project_id', projectId).order('order_index'),
    (supabase as any).from('project_stage_items').select('*, project_stages!inner(project_id, stage_name)').eq('project_stages.project_id', projectId),
    (supabase as any).from('project_milestones').select('*').eq('project_id', projectId).order('due_date'),
    (supabase as any).from('documents').select('id,name,version,created_at,updated_at').eq('project_id', projectId).order('created_at'),
    (supabase as any).from('project_versions').select('*').eq('project_id', projectId).order('released_at', { ascending: false }),
    (supabase as any).from('support_tickets').select('id,subject,category,ticket_type,priority,status,start_at,end_at,created_at,responded_at,resolution_notes,admin_response,assignee_id').eq('project_id', projectId).order('created_at'),
  ]);

  if (proj.error) throw proj.error;
  const project = proj.data;

  const totalItems = items.data?.length || 0;
  const doneItems = items.data?.filter((i: any) => i.is_completed).length || 0;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // Build a chronological change log from all timestamps
  type Entry = { date: string; type: string; description: string };
  const entries: Entry[] = [];
  entries.push({ date: project.created_at, type: 'Projeto', description: `Projeto "${project.name}" criado` });
  if (project.start_date) entries.push({ date: project.start_date, type: 'Projeto', description: 'Data de início planejada' });
  if (project.end_date) entries.push({ date: project.end_date, type: 'Projeto', description: 'Data de término planejada' });

  (stages.data || []).forEach((s: any) => {
    if (s.started_at) entries.push({ date: s.started_at, type: 'Etapa', description: `Etapa "${s.stage_name}" iniciada` });
    if (s.completed_at) entries.push({ date: s.completed_at, type: 'Etapa', description: `Etapa "${s.stage_name}" concluída` });
  });
  (items.data || []).forEach((i: any) => {
    if (i.completed_at) entries.push({ date: i.completed_at, type: 'Checklist', description: `Item "${i.title}" (${i.project_stages.stage_name}) concluído` });
  });
  (milestones.data || []).forEach((m: any) => {
    entries.push({ date: m.due_date, type: 'Agenda', description: `${m.milestone_type}: ${m.title} (${m.status})` });
  });
  (docs.data || []).forEach((d: any) => {
    entries.push({ date: d.created_at, type: 'Documento', description: `Documento "${d.name}" v${d.version} adicionado` });
  });
  (versions.data || []).forEach((v: any) => {
    entries.push({ date: v.released_at, type: 'Versão', description: `${v.version_number} — ${v.title}` });
  });
  (tickets.data || []).forEach((t: any) => {
    entries.push({ date: t.created_at, type: 'Suporte', description: `Ticket "${t.subject}" (${t.category}, ${t.status})` });
  });

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const css = `
    body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
    h1 { color: #12579A; margin: 0 0 8px; }
    h2 { color: #12579A; border-bottom: 2px solid #12579A; padding-bottom: 6px; margin-top: 32px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .card { padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; }
    .card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .card .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { text-align: left; background: #f5f5f5; padding: 8px; border-bottom: 2px solid #12579A; }
    td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .b-completed { background: #d4edda; color: #155724; }
    .b-in_progress { background: #fff3cd; color: #856404; }
    .b-pending { background: #e9ecef; color: #495057; }
    .progress-bar { width: 100%; height: 12px; background: #eee; border-radius: 6px; overflow: hidden; }
    .progress-bar > div { height: 100%; background: #12579A; }
    @media print { body { padding: 16px; } }
  `;

  const stagesRows = (stages.data || []).map((s: any) => `
    <tr>
      <td>${s.order_index + 1}. ${s.stage_name}</td>
      <td><span class="badge b-${s.status}">${s.status}</span></td>
      <td>${fmtDate(s.started_at)}</td>
      <td>${fmtDate(s.completed_at)}</td>
    </tr>
  `).join('');

  const logRows = entries.map(e => `
    <tr>
      <td style="white-space:nowrap">${fmtDate(e.date)}</td>
      <td>${e.type}</td>
      <td>${e.description}</td>
    </tr>
  `).join('');

  const ticketRows = (tickets.data || []).map((t: any) => `
    <tr>
      <td>${t.subject}</td>
      <td>${t.ticket_type || '—'}</td>
      <td>${t.priority || '—'}</td>
      <td><span class="badge b-${t.status}">${t.status}</span></td>
      <td>${fmtDate(t.start_at || t.created_at)}</td>
      <td>${fmtDate(t.end_at || t.responded_at)}</td>
      <td>${(t.resolution_notes || t.admin_response || '').replace(/</g, '&lt;')}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Versionamento — ${project.name}</title><style>${css}</style></head><body>
    <h1>${project.name}</h1>
    <div class="meta">Relatório de Versionamento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
    ${project.description ? `<p>${project.description}</p>` : ''}

    <div class="grid">
      <div class="card"><div class="label">Data de Início</div><div class="value">${fmtDay(project.start_date)}</div></div>
      <div class="card"><div class="label">Data de Término</div><div class="value">${fmtDay(project.end_date)}</div></div>
      <div class="card"><div class="label">Status</div><div class="value">${project.status || '—'}</div></div>
      <div class="card"><div class="label">Progresso</div><div class="value">${progress}% (${doneItems}/${totalItems})</div>
        <div class="progress-bar" style="margin-top:8px"><div style="width:${progress}%"></div></div>
      </div>
    </div>

    <h2>Etapas</h2>
    <table><thead><tr><th>Etapa</th><th>Status</th><th>Início</th><th>Conclusão</th></tr></thead><tbody>${stagesRows}</tbody></table>

    <h2>Tickets de Suporte</h2>
    ${ticketRows ? `<table><thead><tr><th>Assunto</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Início</th><th>Fim</th><th>Observação</th></tr></thead><tbody>${ticketRows}</tbody></table>` : '<p style="color:#888">Nenhum ticket de suporte registrado.</p>'}

    <h2>Histórico de Alterações</h2>
    <table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th></tr></thead><tbody>${logRows}</tbody></table>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `versionamento-${project.name.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyy-MM-dd')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
