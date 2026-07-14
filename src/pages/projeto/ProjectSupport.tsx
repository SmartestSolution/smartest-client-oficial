import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSupportTickets,
  useCreateTicket,
  useUpdateTicket,
  useAdminUsers,
  SupportTicket,
} from '@/hooks/useSupportTickets';
import { useProjectClientSLA, computeSlaInfo, DEFAULT_SLA, slaLimitForPriority } from '@/hooks/useClientSLA';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus, Loader2, ArrowLeft, Bug, ListTodo, HelpCircle, Sparkles,
  Search, Calendar, User, Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  bug: { label: 'Bug', icon: Bug, cls: 'bg-destructive/10 text-destructive' },
  task: { label: 'Tarefa', icon: ListTodo, cls: 'bg-primary/10 text-primary' },
  question: { label: 'Dúvida', icon: HelpCircle, cls: 'bg-muted text-muted-foreground' },
  improvement: { label: 'Melhoria', icon: Sparkles, cls: 'bg-warning/10 text-warning' },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Baixa',    cls: 'bg-muted text-muted-foreground' },
  medium:   { label: 'Média',    cls: 'bg-warning/10 text-warning' },
  high:     { label: 'Alta',     cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  critical: { label: 'Crítica',  cls: 'bg-destructive/10 text-destructive' },
};

const STATUS_COLUMNS: Array<{ id: string; label: string; cls: string }> = [
  { id: 'todo',        label: 'A Fazer',     cls: 'border-muted-foreground/40' },
  { id: 'in_progress', label: 'Em Progresso', cls: 'border-primary/60' },
  { id: 'review',      label: 'Em Revisão',   cls: 'border-warning/60' },
  { id: 'done',        label: 'Concluído',    cls: 'border-success/60' },
];

function normalizeStatus(s: string) {
  if (s === 'open') return 'todo';
  if (s === 'answered') return 'in_progress';
  if (s === 'closed') return 'done';
  return s;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export default function ProjectSupport() {
  const { id: projectId } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: tickets, isLoading } = useSupportTickets(projectId);
  const { data: admins } = useAdminUsers();
  const { data: sla } = useProjectClientSLA(projectId);
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  const [view, setView] = useState<'backlog' | 'board'>('backlog');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);

  // create form
  const [f, setF] = useState({
    subject: '', message: '', ticket_type: 'task',
    priority: 'medium', start_at: '', end_at: '', assignee_id: '',
  });

  const filtered = useMemo(() => {
    let list = tickets || [];
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority);
    if (filterType !== 'all') list = list.filter(t => t.ticket_type === filterType);
    if (filterStatus !== 'all') list = list.filter(t => normalizeStatus(t.status) === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.subject.toLowerCase().includes(q) || t.message.toLowerCase().includes(q));
    }
    return list;
  }, [tickets, search, filterPriority, filterType, filterStatus]);

  const byStatus = useMemo(() => {
    const map: Record<string, SupportTicket[]> = { todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach(t => {
      const s = normalizeStatus(t.status);
      (map[s] ||= []).push(t);
    });
    return map;
  }, [filtered]);

  const handleCreate = async () => {
    if (!f.subject.trim() || !f.message.trim()) {
      toast.error('Preencha assunto e descrição');
      return;
    }
    try {
      await createTicket.mutateAsync({
        subject: f.subject,
        message: f.message,
        projectId,
        ticket_type: f.ticket_type,
        priority: f.priority,
        start_at: f.start_at ? fromDatetimeLocal(f.start_at) : null,
        end_at: f.end_at ? fromDatetimeLocal(f.end_at) : null,
        assignee_id: f.assignee_id || null,
      });
      toast.success('Ticket criado');
      setF({ subject: '', message: '', ticket_type: 'task', priority: 'medium', start_at: '', end_at: '', assignee_id: '' });
      setShowForm(false);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, status: string) => {
    try {
      await updateTicket.mutateAsync({ ticketId: ticket.id, updates: { status } });
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/projeto/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Suporte</h1>
              <p className="text-sm text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="backlog">Backlog</TabsTrigger>
                <TabsTrigger value="board">Board</TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Ticket</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Assunto" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
                  <Textarea placeholder="Descreva o que precisa..." rows={4} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} />
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
                    {isAdmin && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Início</label>
                          <Input type="datetime-local" value={f.start_at} onChange={e => setF({ ...f, start_at: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Prazo final</label>
                          <Input type="datetime-local" value={f.end_at} onChange={e => setF({ ...f, end_at: e.target.value })} />
                        </div>
                      </>
                    )}
                  </div>
                  {isAdmin && (
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
                  )}
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      O horário desta solicitação será registrado automaticamente. A equipe irá confirmar tipo, prioridade e definir o prazo de atendimento.
                    </p>
                  )}
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
        </div>

        {/* SLA Cards */}
        <SlaCards tickets={tickets || []} sla={sla || DEFAULT_SLA} />

        {/* Filters */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Buscar tickets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {STATUS_COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
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

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : view === 'backlog' ? (
          <BacklogList tickets={filtered} onOpen={setOpenTicket} />
        ) : (
          <Board byStatus={byStatus} onOpen={setOpenTicket} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
        )}

        {/* Detail dialog */}
        <TicketDialog
          ticket={openTicket}
          onClose={() => setOpenTicket(null)}
          isAdmin={isAdmin}
          admins={admins || []}
          onSave={async (updates) => {
            if (!openTicket) return;
            await updateTicket.mutateAsync({ ticketId: openTicket.id, updates });
            toast.success('Atualizado');
            setOpenTicket(null);
          }}
        />
      </div>
    </AppLayout>
  );
}

function TicketCard({ t, onOpen, compact }: { t: SupportTicket; onOpen: (t: SupportTicket) => void; compact?: boolean }) {
  const type = TYPE_META[t.ticket_type] || TYPE_META.task;
  const prio = PRIORITY_META[t.priority] || PRIORITY_META.medium;
  const TypeIcon = type.icon;
  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => onOpen(t)}>
      <CardContent className={cn('p-3 space-y-2', compact && 'p-2.5')}>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded', type.cls)}>
            <TypeIcon className="h-3 w-3" /> {type.label}
          </span>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto', prio.cls)}>
            <Flag className="h-2.5 w-2.5 inline mr-0.5" /> {prio.label}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2">{t.subject}</p>
        {!compact && <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>}
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          {t.end_at ? (
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(t.end_at), "dd/MM HH:mm", { locale: ptBR })}</span>
          ) : <span />}
          {t.assignee && (
            <span className="inline-flex items-center gap-1 truncate max-w-[120px]"><User className="h-3 w-3" />{t.assignee.full_name}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BacklogList({ tickets, onOpen }: { tickets: SupportTicket[]; onOpen: (t: SupportTicket) => void }) {
  if (tickets.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum ticket encontrado.</CardContent></Card>;
  }
  return (
    <div className="space-y-2">
      {tickets.map(t => <TicketCard key={t.id} t={t} onOpen={onOpen} />)}
    </div>
  );
}

function Board({
  byStatus, onOpen, onStatusChange, isAdmin,
}: {
  byStatus: Record<string, SupportTicket[]>;
  onOpen: (t: SupportTicket) => void;
  onStatusChange: (t: SupportTicket, s: string) => void;
  isAdmin: boolean;
}) {
  const onDragStart = (e: React.DragEvent, t: SupportTicket) => {
    e.dataTransfer.setData('ticket-id', t.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {STATUS_COLUMNS.map(col => (
        <div
          key={col.id}
          className={cn('rounded-lg border-2 border-dashed p-2 bg-muted/20 min-h-[300px]', col.cls)}
          onDragOver={isAdmin ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
          onDrop={isAdmin ? (e) => {
            const id = e.dataTransfer.getData('ticket-id');
            const all = Object.values(byStatus).flat();
            const t = all.find(x => x.id === id);
            if (t && normalizeStatus(t.status) !== col.id) onStatusChange(t, col.id);
          } : undefined}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
            <Badge variant="secondary" className="text-[10px]">{byStatus[col.id]?.length || 0}</Badge>
          </div>
          <div className="space-y-2">
            {(byStatus[col.id] || []).map(t => (
              <div key={t.id} draggable={isAdmin} onDragStart={(e) => onDragStart(e, t)}>
                <TicketCard t={t} onOpen={onOpen} compact />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TicketDialog({
  ticket, onClose, isAdmin, admins, onSave,
}: {
  ticket: SupportTicket | null;
  onClose: () => void;
  isAdmin: boolean;
  admins: Array<{ user_id: string; full_name: string }>;
  onSave: (updates: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>(null);

  // Initialize form when ticket opens
  useMemo(() => {
    if (ticket) {
      setForm({
        status: normalizeStatus(ticket.status),
        priority: ticket.priority,
        ticket_type: ticket.ticket_type,
        assignee_id: ticket.assignee_id || '',
        start_at: toDatetimeLocal(ticket.start_at),
        end_at: toDatetimeLocal(ticket.end_at),
        resolution_notes: ticket.resolution_notes || '',
      });
    }
  }, [ticket?.id]);

  if (!ticket || !form) return null;
  const type = TYPE_META[ticket.ticket_type] || TYPE_META.task;
  const TypeIcon = type.icon;

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" /> {ticket.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
          <div className="text-xs text-muted-foreground">
            Aberto por <span className="font-medium text-foreground">{ticket.profiles?.full_name || 'Usuário'}</span>{' '}
            em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_COLUMNS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={form.ticket_type} onValueChange={v => setForm({ ...form, ticket_type: v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Responsável</label>
              <Select value={form.assignee_id || 'none'} onValueChange={v => setForm({ ...form, assignee_id: v === 'none' ? '' : v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {admins.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Início</label>
              <Input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} disabled={!isAdmin} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Finalizado em</label>
              <Input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} disabled={!isAdmin} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Observação / O que foi feito</label>
            <Textarea
              rows={4}
              value={form.resolution_notes}
              onChange={e => setForm({ ...form, resolution_notes: e.target.value })}
              placeholder="Descreva a solução, ações realizadas..."
              disabled={!isAdmin}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {isAdmin && (
            <Button onClick={() => onSave({
              status: form.status,
              priority: form.priority,
              ticket_type: form.ticket_type,
              assignee_id: form.assignee_id || null,
              start_at: fromDatetimeLocal(form.start_at),
              end_at: fromDatetimeLocal(form.end_at),
              resolution_notes: form.resolution_notes,
            })}>
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlaCards({ tickets, sla }: { tickets: SupportTicket[]; sla: { high: number; medium: number; low: number } }) {
  const stats = useMemo(() => {
    const open = tickets.filter(t => normalizeStatus(t.status) !== 'done');
    const done = tickets.filter(t => normalizeStatus(t.status) === 'done');
    let breached = 0, atRisk = 0, onTrack = 0, doneOnTime = 0, doneLate = 0;
    let totalResolutionH = 0, doneCount = 0;
    open.forEach(t => {
      const info = computeSlaInfo(t as any, sla);
      if (info.state === 'breached') breached++;
      else if (info.state === 'at_risk') atRisk++;
      else if (info.state === 'on_track') onTrack++;
    });
    done.forEach(t => {
      const limit = slaLimitForPriority(t.priority, sla);
      const start = t.start_at || t.created_at;
      const end = t.end_at || t.responded_at || t.updated_at;
      if (limit != null && start && end) {
        const hours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
        totalResolutionH += hours;
        doneCount++;
        if (hours > limit) doneLate++;
        else doneOnTime++;
      }
    });
    const avgH = doneCount > 0 ? totalResolutionH / doneCount : 0;
    const compliance = doneCount > 0 ? Math.round((doneOnTime / doneCount) * 100) : 100;
    return { total: tickets.length, open: open.length, breached, atRisk, onTrack, doneOnTime, doneLate, avgH, compliance };
  }, [tickets, sla]);

  const cards = [
    { label: 'Abertos', value: stats.open, hint: `${stats.total} no total`, cls: 'text-foreground' },
    { label: 'Dentro do SLA', value: stats.onTrack, hint: 'a vencer normalmente', cls: 'text-success' },
    { label: 'Em risco', value: stats.atRisk, hint: '< 25% do prazo restante', cls: 'text-warning' },
    { label: 'SLA estourado', value: stats.breached, hint: 'fora do prazo', cls: 'text-destructive' },
    { label: 'Cumprimento SLA', value: `${stats.compliance}%`, hint: `${stats.doneOnTime} no prazo / ${stats.doneLate} atrasados`, cls: 'text-primary' },
    { label: 'Tempo médio', value: stats.avgH > 0 ? `${stats.avgH.toFixed(1)}h` : '—', hint: 'resolução média', cls: 'text-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map(c => (
        <Card key={c.label} className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{c.label}</p>
            <p className={cn('text-xl font-bold mt-0.5', c.cls)}>{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
