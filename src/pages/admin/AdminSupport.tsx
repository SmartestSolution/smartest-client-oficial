import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  useSupportTickets,
  useCreateTicket,
  useUpdateTicket,
  useAdminUsers,
  SupportTicket,
} from '@/hooks/useSupportTickets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Plus, Loader2, Bug, ListTodo, HelpCircle, Sparkles,
  Search, Calendar, User, Flag, Check, ChevronsUpDown, LifeBuoy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SYSTEM_SUPPORT_LABEL = 'Central de Dúvidas';

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  bug: { label: 'Bug', icon: Bug, cls: 'bg-destructive/10 text-destructive' },
  task: { label: 'Tarefa', icon: ListTodo, cls: 'bg-primary/10 text-primary' },
  question: { label: 'Dúvida', icon: HelpCircle, cls: 'bg-muted text-muted-foreground' },
  improvement: { label: 'Melhoria', icon: Sparkles, cls: 'bg-warning/10 text-warning' },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: 'Baixa', cls: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', cls: 'bg-warning/10 text-warning' },
  high: { label: 'Alta', cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  critical: { label: 'Crítica', cls: 'bg-destructive/10 text-destructive' },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  todo: { label: 'A Fazer', cls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em Progresso', cls: 'bg-primary/10 text-primary' },
  review: { label: 'Em Revisão', cls: 'bg-warning/10 text-warning' },
  done: { label: 'Concluído', cls: 'bg-success/10 text-success' },
};

function normalizeStatus(s: string) {
  if (s === 'open') return 'todo';
  if (s === 'answered') return 'in_progress';
  if (s === 'closed') return 'done';
  return s;
}

function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export default function AdminSupport() {
  const { data: tickets, isLoading } = useSupportTickets();
  const { data: admins } = useAdminUsers();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  // Projects list with client name
  const { data: projects } = useQuery({
    queryKey: ['admin-support-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, clients(name)')
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; clients: { name: string } | null }>;
    },
  });

  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [openProjectFilter, setOpenProjectFilter] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [openFormProject, setOpenFormProject] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);

  const [f, setF] = useState({
    subject: '', message: '', project_id: '', ticket_type: 'task',
    priority: 'medium', start_at: '', end_at: '', assignee_id: '',
  });

  const projectLabel = useMemo(() => {
    if (filterProject === 'all') return 'Todos projetos';
    const p = projects?.find(p => p.id === filterProject);
    return p ? `${p.name}${p.clients ? ` · ${p.clients.name}` : ''}` : 'Selecionar';
  }, [filterProject, projects]);

  const formProjectLabel = useMemo(() => {
    if (!f.project_id) return SYSTEM_SUPPORT_LABEL;
    const p = projects?.find(p => p.id === f.project_id);
    return p ? `${p.name}${p.clients ? ` · ${p.clients.name}` : ''}` : 'Selecione o projeto';
  }, [f.project_id, projects]);

  const filtered = useMemo(() => {
    let list = tickets || [];
    if (filterProject !== 'all') list = list.filter(t => t.project_id === filterProject);
    if (filterStatus !== 'all') list = list.filter(t => normalizeStatus(t.status) === filterStatus);
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority);
    if (filterType !== 'all') list = list.filter(t => t.ticket_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q) ||
        (t.project_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, search, filterProject, filterStatus, filterPriority, filterType]);

  const handleCreate = async () => {
    if (!f.subject.trim() || !f.message.trim()) {
      toast.error('Preencha assunto e descrição');
      return;
    }
    if (!f.project_id) {
      toast.error('Selecione um projeto');
      return;
    }
    try {
      await createTicket.mutateAsync({
        subject: f.subject,
        message: f.message,
        projectId: f.project_id,
        ticket_type: f.ticket_type,
        priority: f.priority,
        start_at: f.start_at ? fromDatetimeLocal(f.start_at) : null,
        end_at: f.end_at ? fromDatetimeLocal(f.end_at) : null,
        assignee_id: f.assignee_id || null,
      });
      toast.success('Ticket criado');
      setF({ subject: '', message: '', project_id: '', ticket_type: 'task', priority: 'medium', start_at: '', end_at: '', assignee_id: '' });
      setShowForm(false);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const counts = useMemo(() => {
    const all = tickets || [];
    return {
      total: all.length,
      todo: all.filter(t => normalizeStatus(t.status) === 'todo').length,
      in_progress: all.filter(t => normalizeStatus(t.status) === 'in_progress').length,
      done: all.filter(t => normalizeStatus(t.status) === 'done').length,
    };
  }, [tickets]);

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Administração de Suporte</h1>
              <p className="text-sm text-muted-foreground">Tickets de todos os projetos</p>
            </div>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Ticket</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Projeto *</label>
                  <Popover open={openFormProject} onOpenChange={setOpenFormProject}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        <span className="truncate">{formProjectLabel}</span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar projeto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="central de duvidas"
                              onSelect={() => {
                                setF({ ...f, project_id: '' });
                                setOpenFormProject(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !f.project_id ? 'opacity-100' : 'opacity-0')} />
                              <span className="truncate font-medium">{SYSTEM_SUPPORT_LABEL}</span>
                              <span className="ml-auto text-xs text-muted-foreground">Geral</span>
                            </CommandItem>
                            {projects?.map(p => (
                              <CommandItem
                                key={p.id}
                                value={`${p.name} ${p.clients?.name || ''}`}
                                onSelect={() => {
                                  setF({ ...f, project_id: p.id });
                                  setOpenFormProject(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', f.project_id === p.id ? 'opacity-100' : 'opacity-0')} />
                                <span className="truncate">{p.name}</span>
                                {p.clients && <span className="ml-auto text-xs text-muted-foreground">{p.clients.name}</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input placeholder="Assunto" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
                <Textarea placeholder="Descreva..." rows={4} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <Select value={f.ticket_type} onValueChange={v => setF({ ...f, ticket_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">🧩 Tarefa</SelectItem>
                        <SelectItem value="bug">🐞 Bug</SelectItem>
                        <SelectItem value="question">❓ Dúvida</SelectItem>
                        <SelectItem value="improvement">✨ Melhoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prioridade</label>
                    <Select value={f.priority} onValueChange={v => setF({ ...f, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Baixa</SelectItem>
                        <SelectItem value="medium">🟡 Média</SelectItem>
                        <SelectItem value="high">🟠 Alta</SelectItem>
                        <SelectItem value="critical">🔴 Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Início</label>
                    <Input type="datetime-local" value={f.start_at} onChange={e => setF({ ...f, start_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prazo final</label>
                    <Input type="datetime-local" value={f.end_at} onChange={e => setF({ ...f, end_at: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Responsável</label>
                  <Select value={f.assignee_id || 'none'} onValueChange={v => setF({ ...f, assignee_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {admins?.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: counts.total, cls: 'text-foreground' },
            { label: 'A Fazer', value: counts.todo, cls: 'text-muted-foreground' },
            { label: 'Em Progresso', value: counts.in_progress, cls: 'text-primary' },
            { label: 'Concluídos', value: counts.done, cls: 'text-success' },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={cn('text-2xl font-bold', k.cls)}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Buscar tickets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Popover open={openProjectFilter} onOpenChange={setOpenProjectFilter}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-[240px] h-9 justify-between">
                  <span className="truncate">{projectLabel}</span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar projeto..." />
                  <CommandList>
                    <CommandEmpty>Nenhum projeto.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="todos" onSelect={() => { setFilterProject('all'); setOpenProjectFilter(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', filterProject === 'all' ? 'opacity-100' : 'opacity-0')} />
                        Todos projetos
                      </CommandItem>
                      {projects?.map(p => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.clients?.name || ''}`}
                          onSelect={() => { setFilterProject(p.id); setOpenProjectFilter(false); }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', filterProject === p.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate">{p.name}</span>
                          {p.clients && <span className="ml-auto text-xs text-muted-foreground">{p.clients.name}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum ticket encontrado.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => {
              const type = TYPE_META[t.ticket_type] || TYPE_META.task;
              const prio = PRIORITY_META[t.priority] || PRIORITY_META.medium;
              const status = STATUS_META[normalizeStatus(t.status)] || STATUS_META.todo;
              const TypeIcon = type.icon;
              return (
                <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setOpenTicket(t)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded', type.cls)}>
                        <TypeIcon className="h-3 w-3" /> {type.label}
                      </span>
                      <Badge variant="outline" className={cn('text-[10px]', status.cls)}>{status.label}</Badge>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', prio.cls)}>
                        <Flag className="h-2.5 w-2.5 inline mr-0.5" /> {prio.label}
                      </span>
                      {t.project_name ? (
                        <Badge variant="secondary" className="text-[10px] ml-auto">{t.project_name}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] ml-auto text-primary border-primary/30">{SYSTEM_SUPPORT_LABEL}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Solicitado por {t.profiles?.full_name || '—'}</span>
                      <span>· {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {t.assignee && (
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{t.assignee.full_name}</span>
                      )}
                      {t.end_at && (
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(t.end_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick detail/edit dialog */}
        <Dialog open={!!openTicket} onOpenChange={(o) => !o && setOpenTicket(null)}>
          <DialogContent className="max-w-xl">
            {openTicket && (
              <>
                <DialogHeader>
                  <DialogTitle>{openTicket.subject}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {openTicket.project_name ? (
                    <Badge variant="secondary">{openTicket.project_name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-primary border-primary/30">{SYSTEM_SUPPORT_LABEL}</Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{openTicket.message}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select
                        value={normalizeStatus(openTicket.status)}
                        onValueChange={async (v) => {
                          await updateTicket.mutateAsync({ ticketId: openTicket.id, updates: { status: v } });
                          toast.success('Status atualizado');
                          setOpenTicket({ ...openTicket, status: v });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Responsável</label>
                      <Select
                        value={openTicket.assignee_id || 'none'}
                        onValueChange={async (v) => {
                          const assignee_id = v === 'none' ? null : v;
                          await updateTicket.mutateAsync({ ticketId: openTicket.id, updates: { assignee_id } });
                          toast.success('Responsável atualizado');
                          setOpenTicket({ ...openTicket, assignee_id });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem responsável</SelectItem>
                          {admins?.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {openTicket.project_id && (
                    <p className="text-xs text-muted-foreground">
                      Para gerenciar o ticket no contexto do projeto, acesse a página de Suporte do projeto.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenTicket(null)}>Fechar</Button>
                  {openTicket.project_id && (
                    <Button asChild>
                      <a href={`/projeto/${openTicket.project_id}/suporte`}>Abrir no projeto</a>
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
