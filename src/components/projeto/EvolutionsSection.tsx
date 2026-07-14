import { useState } from 'react';
import { useProjectEvolutions, useCreateEvolution, useDeleteEvolution, ProjectEvolution } from '@/hooks/useProjectEvolutions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, TrendingUp, Loader2, Calendar, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EvolutionDetail } from './EvolutionDetail';

interface Props {
  projectId: string;
  isAdmin: boolean;
  projectCompleted: boolean;
}

export function EvolutionsSection({ projectId, isAdmin, projectCompleted }: Props) {
  const { data: evolutions, isLoading } = useProjectEvolutions(projectId);
  const createEvolution = useCreateEvolution();
  const deleteEvolution = useDeleteEvolution();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '' });

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Informe um título');
      return;
    }
    try {
      await createEvolution.mutateAsync({
        project_id: projectId,
        title: form.title,
        description: form.description,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      toast.success('Evolução criada com 5 etapas padrão');
      setForm({ title: '', description: '', start_date: '', end_date: '' });
      setDialogOpen(false);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evoluções
            </CardTitle>
            <CardDescription>
              Novas demandas após a produção. Cada evolução tem suas próprias 5 etapas.
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!projectCompleted}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Evolução
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Evolução</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Título *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Início</Label>
                      <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Término</Label>
                      <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createEvolution.isPending}>
                    {createEvolution.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {isAdmin && !projectCompleted && (
          <p className="text-xs text-muted-foreground mt-2">
            Evoluções só podem ser criadas após o projeto principal estar concluído (todas as 5 etapas).
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !evolutions || evolutions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma evolução cadastrada.
          </p>
        ) : (
          <div className="space-y-2">
            {evolutions.map(evo => (
              <EvolutionItem
                key={evo.id}
                evolution={evo}
                projectId={projectId}
                expanded={expanded === evo.id}
                onToggle={() => setExpanded(expanded === evo.id ? null : evo.id)}
                onDelete={async () => {
                  if (!confirm('Excluir esta evolução?')) return;
                  await deleteEvolution.mutateAsync(evo.id);
                  toast.success('Evolução excluída');
                }}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvolutionItem({ evolution, projectId, expanded, onToggle, onDelete, isAdmin }: {
  evolution: ProjectEvolution;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <TrendingUp className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{evolution.title}</div>
          {evolution.description && (
            <div className="text-xs text-muted-foreground truncate">{evolution.description}</div>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
            {evolution.start_date && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(evolution.start_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
            )}
            {evolution.end_date && (
              <span>→ {format(new Date(evolution.end_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
            )}
          </div>
        </div>
        <Badge variant="outline">{evolution.status}</Badge>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      {expanded && (
        <div className="border-t p-4 bg-muted/20">
          <EvolutionDetail
            evolutionId={evolution.id}
            projectId={projectId}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}

