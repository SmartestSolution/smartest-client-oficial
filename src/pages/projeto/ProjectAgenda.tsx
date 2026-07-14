import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectMilestones, useCreateMilestone } from '@/hooks/useProjectMilestones';
import { useProjectAgendaEvents } from '@/hooks/useAgendaEvents';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectRoadmap } from '@/components/projeto/ProjectRoadmap';
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
import { ArrowLeft, Plus, CalendarIcon, Loader2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const typeOptions = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'reuniao', label: 'Reunião' },
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

export default function ProjectAgenda() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  const { data: milestones, isLoading } = useProjectMilestones(id);
  const { data: events } = useProjectAgendaEvents(id);
  const { isAdmin } = useAuth();
  const createMutation = useCreateMilestone();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', milestone_type: 'entrega',
    due_date: undefined as Date | undefined, recurrence: 'none',
  });

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ title: '', description: '', milestone_type: 'entrega', due_date: undefined, recurrence: 'none' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      toast.error('Título e data são obrigatórios');
      return;
    }
    const dueDateStr = format(formData.due_date, 'yyyy-MM-dd');
    createMutation.mutate({
      title: formData.title,
      description: formData.description || null,
      milestone_type: formData.milestone_type as any,
      due_date: dueDateStr,
      status: computeStatus(dueDateStr) as any,
      project_id: id!,
      recurrence: formData.recurrence === 'none' ? null : formData.recurrence,
    } as any, {
      onSuccess: () => { toast.success('Compromisso criado!'); handleClose(); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const milestonesWithAutoStatus = useMemo(() => {
    return (milestones || []).map(m => ({
      ...m,
      status: m.status === 'cancelled' ? 'cancelled' : computeStatus(m.due_date) as any,
    }));
  }, [milestones]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/projeto/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              {project?.name || 'Carregando...'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Agenda de Entregas</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Exibe compromissos do projeto e as datas de início/término de tarefas dos progressos e evoluções.
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData({ title: '', description: '', milestone_type: 'entrega', due_date: undefined, recurrence: 'none' })}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Compromisso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Compromisso</DialogTitle>
                  <DialogDescription>Adicione um marco, entrega ou reunião na agenda.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
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
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.due_date ? format(formData.due_date, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formData.due_date} onSelect={d => setFormData({ ...formData, due_date: d })} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <ProjectRoadmap milestones={milestonesWithAutoStatus} isLoading={isLoading} events={events || []} />
      </div>
    </AppLayout>
  );
}
