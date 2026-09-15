import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  useWorkItems,
  useWorkItemAction,
  BUCKET_LABEL,
  BUCKET_ORDER,
  type WorkItem,
  type WorkBucket,
} from '@/hooks/useWorkItems';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  LifeBuoy,
  FolderKanban,
  Play,
  RotateCcw,
} from 'lucide-react';

const priorityLabel: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluído',
  blocked: 'Bloqueado',
};

const priorityClass: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  low: 'bg-muted text-muted-foreground',
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

type QuickFilter = 'all' | 'project' | 'support' | 'urgent' | 'late' | 'today' | 'next';

export default function WorkCenter() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useWorkItems();
  const action = useWorkItemAction();

  const [quick, setQuick] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('all');
  const [project, setProject] = useState('all');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('open');
  const [reopenItem, setReopenItem] = useState<WorkItem | null>(null);
  const [reopenStart, setReopenStart] = useState('');
  const [reopenEnd, setReopenEnd] = useState('');

  const clients = useMemo(
    () => [...new Set((items || []).map(i => i.clientName).filter(Boolean) as string[])].sort(),
    [items],
  );
  const projects = useMemo(
    () => [...new Set((items || []).map(i => i.projectName).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    return (items || []).filter(i => {
      if (status === 'open' && i.status === 'done') return false;
      if (status !== 'all' && status !== 'open' && i.status !== status) return false;
      if (quick === 'project' && i.source !== 'project') return false;
      if (quick === 'support' && i.source !== 'support') return false;
      if (quick === 'urgent' && i.bucket !== 'urgent') return false;
      if (quick === 'late' && i.bucket !== 'late') return false;
      if (quick === 'today' && i.bucket !== 'today') return false;
      if (quick === 'next' && i.bucket !== 'next') return false;
      if (client !== 'all' && i.clientName !== client) return false;
      if (project !== 'all' && i.projectName !== project) return false;
      if (priority !== 'all' && i.priority !== priority) return false;
      if (search && !`${i.title} ${i.projectName ?? ''} ${i.clientName ?? ''}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [items, quick, search, client, project, priority, status]);

  const counts = useMemo(() => {
    const open = (items || []).filter(i => i.status !== 'done');
    return {
      urgent: open.filter(i => i.bucket === 'urgent').length,
      late: open.filter(i => i.bucket === 'late').length,
      today: open.filter(i => i.bucket === 'today').length,
      next: open.filter(i => i.bucket === 'next').length,
    };
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<WorkBucket, WorkItem[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const i of filtered) map.get(i.bucket)!.push(i);
    return BUCKET_ORDER.map(b => ({ bucket: b, items: map.get(b)! })).filter(g => g.items.length > 0);
  }, [filtered]);

  const run = (item: WorkItem, act: 'start' | 'complete' | 'reopen' | 'schedule', date?: string) => {
    action.mutate(
      { item, action: act, date },
      {
        onSuccess: () =>
          toast({
            title:
              act === 'complete'
                ? 'Atividade concluída'
                : act === 'start'
                  ? 'Atividade iniciada'
                  : act === 'schedule'
                    ? 'Atividade agendada'
                    : 'Atividade reaberta',
          }),
        onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
      },
    );
  };

  const openReopen = (item: WorkItem) => {
    setReopenItem(item);
    const today = new Date().toISOString().slice(0, 10);
    setReopenStart((item.plannedDate || today).slice(0, 10));
    setReopenEnd((item.dueDate || '').slice(0, 10));
  };

  const confirmReopen = () => {
    if (!reopenItem) return;
    if (reopenEnd && reopenStart && reopenEnd < reopenStart) {
      toast({ title: 'Datas inválidas', description: 'A data final não pode ser anterior ao início.', variant: 'destructive' });
      return;
    }
    action.mutate(
      { item: reopenItem, action: 'reopen', date: reopenStart || undefined, endDate: reopenEnd || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Atividade reaberta e reagendada' });
          setReopenItem(null);
        },
        onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
      },
    );
  };

  const scheduleTomorrow = (item: WorkItem) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    run(item, 'schedule', item.source === 'support' ? d.toISOString() : d.toISOString().slice(0, 10));
  };

  const kpi = [
    { label: 'Urgentes', value: counts.urgent, icon: Flame, filter: 'urgent' as QuickFilter },
    { label: 'Atrasadas', value: counts.late, icon: AlertTriangle, filter: 'late' as QuickFilter },
    { label: 'Para hoje', value: counts.today, icon: CalendarDays, filter: 'today' as QuickFilter },
    { label: 'Próximas', value: counts.next, icon: CalendarClock, filter: 'next' as QuickFilter },
  ];

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'project', label: 'Projetos' },
    { key: 'support', label: 'Suportes' },
    { key: 'urgent', label: 'Urgentes' },
    { key: 'late', label: 'Atrasadas' },
    { key: 'today', label: 'Hoje' },
    { key: 'next', label: 'Próximas' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Central de Trabalho</h1>
          <p className="text-muted-foreground">Tudo que precisa ser executado, em uma única fila.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpi.map(k => (
            <Card
              key={k.label}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => setQuick(quick === k.filter ? 'all' : k.filter)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={quick === f.key ? 'default' : 'outline'}
              onClick={() => setQuick(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Buscar atividade..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma atividade encontrada com os filtros atuais.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(group => (
              <section key={group.bucket} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {BUCKET_LABEL[group.bucket]}
                  </h2>
                  <Badge variant="outline">{group.items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {group.items.map(item => (
                    <Card key={`${item.source}-${item.id}`}>
                      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.source === 'support' ? (
                              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-foreground">{item.title}</span>
                            <Badge className={priorityClass[item.priority]}>{priorityLabel[item.priority]}</Badge>
                            <Badge variant="outline">{statusLabel[item.status]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.source === 'support' ? 'Suporte' : 'Projeto'}
                            {item.projectName ? ` · ${item.projectName}` : ''}
                            {item.clientName ? ` · ${item.clientName}` : ''}
                            {item.stageName ? ` · ${item.stageName}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {formatDate(item.requestedAt) && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Solicitado {formatDate(item.requestedAt)}
                              </span>
                            )}
                            {formatDate(item.plannedDate) && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> Início {formatDate(item.plannedDate)}
                              </span>
                            )}
                            {formatDate(item.dueDate) && (
                              <span className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" /> Prazo {formatDate(item.dueDate)}
                              </span>
                            )}
                            {item.assigneeName && <span>Responsável: {item.assigneeName}</span>}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {item.status !== 'done' ? (
                            <>
                              {item.status !== 'in_progress' && (
                                <Button size="sm" variant="outline" onClick={() => run(item, 'start')}>
                                  <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
                                </Button>
                              )}
                              <Button size="sm" onClick={() => run(item, 'complete')}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concluir
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => scheduleTomorrow(item)}>
                                <CalendarClock className="mr-1 h-3.5 w-3.5" /> Amanhã
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => run(item, 'reopen')}>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reabrir
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => navigate(item.link)}>
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
