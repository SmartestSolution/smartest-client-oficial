import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAllMilestones, useCreateGlobalMilestone, useUpdateGlobalMilestone, useDeleteGlobalMilestone } from '@/hooks/useAllMilestones';
import { useAllAgendaEvents } from '@/hooks/useAgendaEvents';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Clock, CheckCircle2, Circle, Loader2, FolderKanban,
  Plus, CalendarIcon, ChevronLeft, ChevronRight, Package, Users, Flag, Pencil, Trash2, BriefcaseBusiness, Building2,
} from 'lucide-react';
import {
  format, isToday, isTomorrow, isPast, isFuture, isSameMonth, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  entrega: { label: 'Entrega', icon: Package, color: 'bg-primary/10 text-primary border-primary/20' },
  reuniao: { label: 'Reunião', icon: Users, color: 'bg-accent/50 text-accent-foreground border-accent' },
  consultoria: { label: 'Consultoria', icon: BriefcaseBusiness, color: 'bg-warning/10 text-warning border-warning/20' },
  marco: { label: 'Marco', icon: Flag, color: 'bg-success/10 text-success border-success/20' },
};

const typeOptions = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'marco', label: 'Marco' },
];

const recurrenceOptions = [
  { value: 'none', label: 'Única vez' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

function computeStatus(dueDate: string): string {
  const date = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isSameDay(date, today)) return 'in_progress';
  if (date < today) return 'completed';
  return 'pending';
}

const statusDisplay: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em andamento', color: 'bg-warning/10 text-warning' },
  completed: { label: 'Concluído', color: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' },
};

export default function GlobalAgenda() {
  const { data: milestones, isLoading } = useAllMilestones();
  const { data: events } = useAllAgendaEvents();
  const { data: projects } = useProjects();
  const { data: clients } = useQuery({
    queryKey: ['agenda-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });
  const { isAdmin } = useAuth();
  const createMutation = useCreateGlobalMilestone();
  const updateMutation = useUpdateGlobalMilestone();
  const deleteMutation = useDeleteGlobalMilestone();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', milestone_type: 'entrega',
    start_date: undefined as Date | undefined, due_date: undefined as Date | undefined,
    project_id: '', client_id: '', recurrence: 'none',
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    setFormData({ title: '', description: '', milestone_type: 'entrega', start_date: undefined, due_date: undefined, project_id: '', client_id: '', recurrence: 'none' });
  };

  const handleEdit = (m: any) => {
    setEditing(m);
    setFormData({
      title: m.title, description: m.description || '',
      milestone_type: m.milestone_type,
      start_date: m.start_date ? new Date(`${m.start_date}T12:00:00`) : undefined,
      due_date: new Date(`${m.series_end_date || m.due_date}T12:00:00`),
      project_id: m.project_id || '', client_id: m.client_id || '', recurrence: m.recurrence || 'none',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      toast.error('Título e data são obrigatórios');
      return;
    }
    if (formData.recurrence !== 'none' && !formData.start_date) {
      toast.error('Informe o início da recorrência');
      return;
    }
    if (formData.start_date && formData.due_date < formData.start_date) {
      toast.error('A data de término não pode ser anterior ao início');
      return;
    }
    const selectedProject = projects?.find(project => project.id === formData.project_id);
    const payload = {
      title: formData.title,
      description: formData.description || null,
      milestone_type: formData.milestone_type,
      start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
      due_date: format(formData.due_date, 'yyyy-MM-dd'),
      project_id: formData.project_id || null,
      client_id: selectedProject?.client_id || formData.client_id || null,
      status: computeStatus(format(formData.due_date, 'yyyy-MM-dd')),
      recurrence: formData.recurrence === 'none' ? null : formData.recurrence,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: payload }, {
        onSuccess: () => { toast.success('Agenda atualizada!'); handleClose(); },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => { toast.success('Agenda criada!'); handleClose(); },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  // Compute auto-status for display
  const milestonesWithAutoStatus = useMemo(() => {
    return (milestones || []).map(m => ({
      ...m,
      autoStatus: m.status === 'cancelled' ? 'cancelled' : computeStatus(m.due_date),
    }));
  }, [milestones]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getMilestonesForDay = (day: Date) => {
    return milestonesWithAutoStatus.filter(m => isSameDay(new Date(m.due_date + 'T00:00:00'), day));
  };

  const getEventsForDay = (day: Date) => {
    return (events || []).filter(ev => isSameDay(new Date(ev.date + 'T00:00:00'), day));
  };

  const upcoming = milestonesWithAutoStatus
    .filter(m => m.autoStatus !== 'completed' && m.autoStatus !== 'cancelled')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const completed = milestonesWithAutoStatus.filter(m => m.autoStatus === 'completed');

  const startDay = days.length > 0 ? getDay(days[0]) : 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda Geral</h1>
            <p className="text-muted-foreground mt-1">Todos os compromissos de todos os projetos</p>
          </div>
          {isAdmin && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditing(null); setFormData({ title: '', description: '', milestone_type: 'entrega', start_date: undefined, due_date: undefined, project_id: '', client_id: '', recurrence: 'none' }); }}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Compromisso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar Compromisso' : 'Novo Compromisso'}</DialogTitle>
                  <DialogDescription>Preencha os dados do compromisso.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Empresa (opcional)</Label>
                        <Select value={formData.client_id || 'none'} onValueChange={v => setFormData({ ...formData, client_id: v === 'none' ? '' : v, project_id: formData.project_id && projects?.find(p => p.id === formData.project_id)?.client_id !== v ? '' : formData.project_id })}>
                          <SelectTrigger><SelectValue placeholder="Sem empresa" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem empresa</SelectItem>
                            {clients?.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Projeto (opcional)</Label>
                        <Select value={formData.project_id || 'none'} onValueChange={v => {
                          const project = projects?.find(item => item.id === v);
                          setFormData({ ...formData, project_id: v === 'none' ? '' : v, client_id: project?.client_id || formData.client_id });
                        }}>
                        <SelectTrigger><SelectValue placeholder="Sem projeto" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem projeto</SelectItem>
                          {projects?.filter(project => !formData.client_id || project.client_id === formData.client_id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Reunião de alinhamento" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={formData.milestone_type} onValueChange={v => setFormData({ ...formData, milestone_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Recorrência</Label>
                        <Select value={formData.recurrence} onValueChange={v => setFormData({ ...formData, recurrence: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {recurrenceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{formData.recurrence === 'none' ? 'Início (opcional)' : 'Início da recorrência *'}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.start_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.start_date ? format(formData.start_date, 'dd/MM/yyyy') : 'Selecione'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formData.start_date} onSelect={d => setFormData({ ...formData, start_date: d })} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>{formData.recurrence === 'none' ? 'Data *' : 'Término da recorrência *'}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.due_date ? format(formData.due_date, 'dd/MM/yyyy') : 'Selecione'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formData.due_date} onSelect={d => setFormData({ ...formData, due_date: d })} disabled={day => !!formData.start_date && day < formData.start_date} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editing ? 'Salvar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5" /> Calendário
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                      {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-card min-h-[80px] p-1" />
                  ))}
                  {days.map(day => {
                    const dayMilestones = getMilestonesForDay(day);
                    const dayEvents = getEventsForDay(day);
                    const today = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} className={`bg-card min-h-[80px] p-1 ${today ? 'ring-2 ring-primary ring-inset' : ''}`}>
                        <span className={`text-xs font-medium block text-right pr-1 ${today ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="space-y-0.5 mt-0.5">
                          {dayMilestones.map(m => {
                            const cfg = typeConfig[m.milestone_type] || typeConfig.entrega;
                            return (
                              <div
                                key={m.id}
                                className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate cursor-pointer ${cfg.color} ${m.autoStatus === 'completed' ? 'line-through opacity-60' : ''}`}
                                title={`${m.title} — ${m.project_name || m.client_name || 'Agenda geral'} — ${statusDisplay[m.autoStatus]?.label}`}
                                onClick={() => isAdmin && handleEdit(m)}
                              >
                                {m.title}
                              </div>
                            );
                          })}
                          {dayEvents.map(ev => {
                            const prefix = ev.kind === 'start' ? '▶ ' : '■ ';
                            const ringCls = ev.kind === 'start' ? 'border-dashed' : '';
                            const colorCls = ev.source === 'evolution'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-accent/40 text-accent-foreground border-accent';
                            return (
                              <div
                                key={ev.id + ev.kind}
                                className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${colorCls} ${ringCls} ${ev.is_completed ? 'line-through opacity-60' : ''}`}
                                title={`${prefix}${ev.stage_name}: ${ev.title} — ${ev.project_name}`}
                              >
                                {prefix}{ev.title}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded border ${cfg.color}`} />
                      <span className="text-xs text-muted-foreground">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Próximos Compromissos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcoming.map(m => {
                      const cfg = typeConfig[m.milestone_type] || typeConfig.entrega;
                      const date = new Date(m.due_date + 'T00:00:00');
                      return (
                        <div key={m.id} className={cn('flex items-center gap-4 p-3 rounded-lg border transition-all',
                          isToday(date) && 'border-primary/50 bg-primary/5'
                        )}>
                          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0 text-center',
                            isToday(date) ? 'bg-primary/10' : 'bg-muted'
                          )}>
                            <span className="text-xs font-bold leading-tight">
                              {format(date, 'dd')}<br/>
                              <span className="text-[9px] uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{m.title}</span>
                              {isToday(date) && <Badge className="text-[10px] bg-primary">Hoje</Badge>}
                              {isTomorrow(date) && <Badge variant="secondary" className="text-[10px]">Amanhã</Badge>}
                              {m.recurrence && <Badge variant="outline" className="text-[10px]">🔁 {m.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                 {m.project_name ? <FolderKanban className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                 {m.project_name || m.client_name || 'Agenda geral'}
                              </span>
                              <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                            </div>
                          </div>
                          <Badge className={cn('shrink-0', statusDisplay[m.autoStatus]?.color)}>
                            {statusDisplay[m.autoStatus]?.label}
                          </Badge>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(m)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                if (confirm('Remover este compromisso?')) deleteMutation.mutate(m.id, {
                                  onSuccess: () => toast.success('Removido!'),
                                  onError: (err: Error) => toast.error(err.message),
                                });
                              }}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-muted-foreground">Concluídos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {completed.slice(0, 10).map(m => (
                      <div key={m.id} className="flex items-center gap-4 py-2 opacity-60">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium line-through">{m.title}</span>
                           <span className="text-xs text-muted-foreground ml-2">{m.project_name || m.client_name || 'Agenda geral'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(m.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {milestonesWithAutoStatus.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhum compromisso agendado</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAdmin ? 'Clique em "Novo Compromisso" para adicionar.' : 'Os compromissos serão exibidos aqui.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
