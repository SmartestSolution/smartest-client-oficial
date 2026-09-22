import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DEFAULT_PROJECT_TEMPLATE, buildTemplateSchedule } from '@/hooks/useProjectStages';
import { CalendarDays, ExternalLink, FileText, FolderKanban, GraduationCap, LayoutList, Link2, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientOption { id: string; name: string }
interface AdminProject {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string | null;
  project_type: 'bi' | 'automation' | 'sql' | null;
  project_mode: 'standard' | 'retroactive' | 'custom' | null;
  start_date: string | null;
  end_date: string | null;
  github_repo?: string | null;
  github_path?: string | null;
  github_branch?: string | null;
  created_at: string;
  clients: { name: string } | null;
}

type FormData = {
  client_id: string;
  name: string;
  description: string;
  status: string;
  project_type: 'bi' | 'automation' | 'sql';
  project_mode: 'standard' | 'retroactive' | 'custom';
  start_date: string;
  end_date: string;
  github_repo: string;
  github_path: string;
  github_branch: string;
};

const EMPTY_FORM: FormData = {
  client_id: '', name: '', description: '', status: 'active', project_type: 'bi',
  project_mode: 'standard', start_date: '', end_date: '',
  github_repo: '', github_path: '', github_branch: '',
};
const MODE_LABELS = { standard: 'Padrão', retroactive: 'Retroativo', custom: 'Personalizado' };
const TYPE_LABELS = { bi: 'BI', automation: 'Automação', sql: 'SQL' };
const STATUS_LABELS: Record<string, string> = { active: 'Ativo', completed: 'Concluído', archived: 'Arquivado' };

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export default function AdminProjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState<AdminProject | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-project-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data as ClientOption[];
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-all-projects'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('projects').select('*, clients(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data as AdminProject[];
    },
  });

  const filtered = useMemo(() => projects.filter((project) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (term && !project.name.toLocaleLowerCase('pt-BR').includes(term)) return false;
    if (clientFilter !== 'all' && project.client_id !== clientFilter) return false;
    if (modeFilter !== 'all' && (project.project_mode || 'standard') !== modeFilter) return false;
    if (typeFilter !== 'all' && (project.project_type || 'bi') !== typeFilter) return false;
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    return true;
  }), [projects, search, clientFilter, modeFilter, typeFilter, statusFilter]);

  const counts = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    archived: projects.filter((p) => p.status === 'archived').length,
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); };
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (project: AdminProject) => {
    setEditing(project);
    setForm({
      client_id: project.client_id, name: project.name, description: project.description || '',
      status: project.status || 'active', project_type: project.project_type || 'bi',
      project_mode: project.project_mode || 'standard', start_date: project.start_date || '', end_date: project.end_date || '',
      github_repo: project.github_repo || '', github_path: project.github_path || '', github_branch: project.github_branch || '',
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editing) {
        const { error } = await (supabase as any).from('projects').update({
          client_id: data.client_id, name: data.name.trim(), description: data.description.trim() || null,
          status: data.status, project_type: data.project_type, start_date: data.start_date || null, end_date: data.end_date || null,
          github_repo: data.github_repo.trim() || null, github_path: data.github_path.trim() || null, github_branch: data.github_branch.trim() || null,
        }).eq('id', editing.id);
        if (error) throw error;
        return { id: editing.id, mode: editing.project_mode || 'standard', created: false };
      }

      const retro = data.project_mode === 'retroactive';
      const { data: created, error } = await (supabase as any).from('projects').insert({
        client_id: data.client_id, name: data.name.trim(), description: data.description.trim() || null,
        status: retro ? 'completed' : data.status, project_type: data.project_type, project_mode: data.project_mode,
        start_date: data.start_date || null, end_date: data.end_date || null,
        github_repo: data.github_repo.trim() || null, github_path: data.github_path.trim() || null, github_branch: data.github_branch.trim() || null,
      }).select('id').single();
      if (error) throw error;
      const projectId = created?.id as string | undefined;
      if (!projectId) throw new Error('Não foi possível identificar o projeto criado.');

      if (data.project_mode !== 'custom') {
        const schedule = buildTemplateSchedule(data.start_date, data.end_date);
        const iso = (date?: string | null) => date ? new Date(`${date}T12:00:00Z`).toISOString() : null;
        const { data: stages, error: stagesError } = await (supabase as any).from('project_stages').insert(
          DEFAULT_PROJECT_TEMPLATE.map((stage, index) => ({
            project_id: projectId, stage_name: stage.stage, order_index: index,
            status: retro ? 'completed' : 'pending',
            started_at: iso(schedule?.[index]?.start_date),
            completed_at: retro ? iso(schedule?.[index]?.end_date) : null,
          }))
        ).select('id, stage_name');
        if (stagesError) throw stagesError;
        const items = DEFAULT_PROJECT_TEMPLATE.flatMap((stage, stageIndex) => {
          const stageRow = (stages as { id: string; stage_name: string }[] | null)?.find((row) => row.stage_name === stage.stage);
          if (!stageRow) return [];
          return stage.items.map((title, itemIndex) => ({
            stage_id: stageRow.id, title, order_index: itemIndex, item_type: 'task', priority: 'medium',
            start_date: schedule?.[stageIndex]?.items[itemIndex]?.start_date || null,
            end_date: schedule?.[stageIndex]?.items[itemIndex]?.end_date || null,
            is_completed: retro, status: retro ? 'done' : 'todo',
            completed_at: retro ? iso(schedule?.[stageIndex]?.items[itemIndex]?.end_date) : null,
          }));
        });
        const { error: itemError } = await (supabase as any).from('project_stage_items').insert(items);
        if (itemError) throw itemError;
      }
      return { id: projectId, mode: data.project_mode, created: true };
    },
    onSuccess: ({ id, mode, created }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(created ? 'Projeto criado com sucesso!' : 'Projeto atualizado com sucesso!');
      closeDialog();
      if (created && mode === 'custom') navigate(`/admin/projetos/${id}/etapas`);
    },
    onError: (error: Error) => toast.error(`Erro ao salvar projeto: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleting(null);
      toast.success('Projeto excluído com sucesso!');
    },
    onError: (error: Error) => toast.error(`Erro ao excluir projeto: ${error.message}`),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.client_id || !form.name.trim()) return toast.error('Informe a empresa e o nome do projeto.');
    if (form.start_date && form.end_date && form.end_date < form.start_date) return toast.error('A data final não pode ser anterior à inicial.');
    if (!editing && form.project_mode !== 'custom' && (!form.start_date || !form.end_date)) return toast.error('Informe início e término para este tipo de projeto.');
    if (!editing && form.project_mode === 'retroactive' && form.end_date > new Date().toISOString().slice(0, 10)) return toast.error('O projeto retroativo deve terminar no passado ou hoje.');
    saveMutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Administração de Projetos</h1><p className="mt-1 text-muted-foreground">Gerencie todos os projetos e empresas em uma única página.</p></div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Projeto</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Total', counts.total], ['Ativos', counts.active], ['Concluídos', counts.completed], ['Arquivados', counts.archived]].map(([label, value]) => (
            <Card key={String(label)}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar projeto" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <FilterSelect value={clientFilter} onChange={setClientFilter} placeholder="Empresa" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={modeFilter} onChange={setModeFilter} placeholder="Modalidade" options={Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))} />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Categoria" options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
        </div>

        <Card><CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : filtered.length ? (
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Projeto</TableHead><TableHead>Empresa</TableHead><TableHead>Modalidade</TableHead><TableHead>Categoria</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead className="w-14" /></TableRow></TableHeader>
              <TableBody>{filtered.map((project) => <TableRow key={project.id}>
                <TableCell><Link to={`/projeto/${project.id}`} className="font-medium text-foreground hover:text-primary">{project.name}</Link></TableCell>
                <TableCell>{project.clients?.name || 'Sem empresa'}</TableCell>
                <TableCell><span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{MODE_LABELS[project.project_mode || 'standard']}</span></TableCell>
                <TableCell>{TYPE_LABELS[project.project_type || 'bi']}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dateLabel(project.start_date)} — {dateLabel(project.end_date)}</TableCell>
                <TableCell><span className={project.status === 'active' ? 'text-success' : project.status === 'completed' ? 'text-primary' : 'text-muted-foreground'}>{STATUS_LABELS[project.status || ''] || project.status}</span></TableCell>
                <TableCell><ProjectActions project={project} onEdit={() => openEdit(project)} onDelete={() => setDeleting(project)} /></TableCell>
              </TableRow>)}</TableBody>
            </Table></div>
          ) : <div className="flex flex-col items-center py-16"><FolderKanban className="mb-3 h-10 w-10 text-muted-foreground/50" /><p className="font-medium">Nenhum projeto encontrado</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou crie um novo projeto.</p></div>}
        </CardContent></Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle><DialogDescription>{editing ? 'Atualize os dados gerais sem alterar as etapas e tarefas.' : 'Escolha a empresa e configure o novo projeto.'}</DialogDescription></DialogHeader>
          <form onSubmit={submit}><div className="grid max-h-[65vh] gap-4 overflow-y-auto py-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Empresa *</Label><Select value={form.client_id} onValueChange={(value) => setForm({ ...form, client_id: value })}><SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Modalidade *</Label><Select disabled={Boolean(editing)} value={form.project_mode} onValueChange={(value) => setForm({ ...form, project_mode: value as FormData['project_mode'], status: value === 'retroactive' ? 'completed' : 'active' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Projeto Padrão</SelectItem><SelectItem value="retroactive">Projeto Retroativo</SelectItem><SelectItem value="custom">Projeto Personalizado</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Nome do projeto *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Categoria</Label><Select value={form.project_type} onValueChange={(value) => setForm({ ...form, project_type: value as FormData['project_type'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bi">BI</SelectItem><SelectItem value="automation">Automação</SelectItem><SelectItem value="sql">SQL</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Status</Label><Select disabled={!editing && form.project_mode === 'retroactive'} value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="archived">Arquivado</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Data de início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data de término</Label><Input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Repositório do GitHub</Label><Input placeholder="empresa/repositorio" value={form.github_repo} onChange={(e) => setForm({ ...form, github_repo: e.target.value })} /><p className="text-xs text-muted-foreground">Os documentos deste projeto virão direto deste repositório.</p></div>
            <div className="space-y-2"><Label>Pasta dos documentos</Label><Input placeholder="docs/projeto-x" value={form.github_path} onChange={(e) => setForm({ ...form, github_path: e.target.value })} /></div>
            <div className="space-y-2"><Label>Branch</Label><Input placeholder="main (opcional)" value={form.github_branch} onChange={(e) => setForm({ ...form, github_branch: e.target.value })} /></div>
          </div><DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Salvar' : 'Criar projeto'}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir projeto?</AlertDialogTitle><AlertDialogDescription>O projeto “{deleting?.name}” e todo o conteúdo relacionado serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) deleteMutation.mutate(deleting.id); }}>Excluir projeto</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </AppLayout>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="all">Todos: {placeholder}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function ProjectActions({ project, onEdit, onDelete }: { project: AdminProject; onEdit: () => void; onDelete: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações de ${project.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52">
    <DropdownMenuItem asChild><Link to={`/projeto/${project.id}`}><ExternalLink className="mr-2 h-4 w-4" />Visão geral</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to={`/admin/projetos/${project.id}/etapas`}><LayoutList className="mr-2 h-4 w-4" />Etapas e tarefas</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to={`/admin/projetos/${project.id}/documentos`}><FileText className="mr-2 h-4 w-4" />Documentos</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to={`/admin/projetos/${project.id}/treinamentos`}><GraduationCap className="mr-2 h-4 w-4" />Treinamentos</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to={`/admin/projetos/${project.id}/agenda`}><CalendarDays className="mr-2 h-4 w-4" />Agenda</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to={`/admin/projetos/${project.id}/links`}><Link2 className="mr-2 h-4 w-4" />Links</Link></DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}
