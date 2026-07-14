import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Plus, Pencil, Trash2, Loader2, ArrowLeft, CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useProjectMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useProjectMilestones';
import type { ProjectMilestone } from '@/hooks/useProjectMilestones';

const typeOptions = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'marco', label: 'Marco' },
];

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function AdminProjectMilestones() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();
  const deleteMutation = useDeleteMilestone();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    milestone_type: 'entrega',
    due_date: undefined as Date | undefined,
    status: 'pending',
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    setFormData({ title: '', description: '', milestone_type: 'entrega', due_date: undefined, status: 'pending' });
  };

  const handleEdit = (m: ProjectMilestone) => {
    setEditing(m);
    setFormData({
      title: m.title,
      description: m.description || '',
      milestone_type: m.milestone_type,
      due_date: new Date(m.due_date),
      status: m.status,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      toast.error('Título e data são obrigatórios');
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      milestone_type: formData.milestone_type as 'entrega' | 'reuniao' | 'marco',
      due_date: format(formData.due_date, 'yyyy-MM-dd'),
      status: formData.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: payload }, {
        onSuccess: () => { toast.success('Marco atualizado!'); handleClose(); },
        onError: (err: Error) => toast.error(err.message),
      });
    } else {
      createMutation.mutate({ ...payload, project_id: projectId! }, {
        onSuccess: () => { toast.success('Marco criado!'); handleClose(); },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Agenda de Entregas</h1>
            <p className="text-sm text-muted-foreground">Gerencie entregas, reuniões e marcos do projeto</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setFormData({ title: '', description: '', milestone_type: 'entrega', due_date: undefined, status: 'pending' }); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Marco
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Marco' : 'Novo Marco'}</DialogTitle>
                <DialogDescription>Preencha os dados do marco, entrega ou reunião.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Entrega do módulo financeiro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes adicionais" rows={2} />
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
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Prevista *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.due_date ? format(formData.due_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={d => setFormData({ ...formData, due_date: d })}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Marcos e Entregas
            </CardTitle>
            <CardDescription>Todos os marcos, entregas e reuniões agendadas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : milestones && milestones.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{m.title}</p>
                          {m.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{m.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize">{typeOptions.find(t => t.value === m.milestone_type)?.label || m.milestone_type}</span>
                      </TableCell>
                      <TableCell>{format(new Date(m.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          m.status === 'completed' ? 'bg-success/10 text-success' :
                          m.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                          m.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {statusOptions.find(s => s.value === m.status)?.label || m.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('Remover este marco?')) deleteMutation.mutate(m.id, {
                              onSuccess: () => toast.success('Marco removido!'),
                              onError: (err: Error) => toast.error(err.message),
                            });
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhum marco cadastrado</h3>
                <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Marco" para adicionar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
