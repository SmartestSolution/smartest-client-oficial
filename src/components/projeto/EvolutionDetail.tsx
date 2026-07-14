import { useState, useEffect } from 'react';
import { useEvolutionStages, useUpdateEvolutionStage, useUpdateEvolution, useProjectEvolutions, EvolutionStage } from '@/hooks/useProjectEvolutions';
import { useAllEvolutionStageItems, useEvolutionStageItems } from '@/hooks/useEvolutionStageItems';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StageChecklist } from './StageChecklist';
import {
  ClipboardList, Database, Code, TestTube, Rocket,
  Circle, Loader2, ChevronDown, ChevronRight,
  TableIcon, BarChart3, Pencil, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const stageIcons: Record<string, React.ElementType> = {
  'Levantamento': ClipboardList,
  'Modelagem': Database,
  'Desenvolvimento': Code,
  'Homologação': TestTube,
  'Produção': Rocket,
};

const parseDateOnly = (value: string) => {
  const datePart = value.split('T')[0];
  return new Date(datePart + 'T00:00:00');
};

type ViewMode = 'table' | 'gantt';

interface Props {
  evolutionId: string;
  projectId: string;
  isAdmin: boolean;
}

export function EvolutionDetail({ evolutionId, projectId, isAdmin }: Props) {
  const { data: stages, isLoading } = useEvolutionStages(evolutionId);
  const { data: allItems } = useAllEvolutionStageItems(evolutionId);
  const { data: evolutions } = useProjectEvolutions(projectId);
  const evolution = evolutions?.find(e => e.id === evolutionId);
  const updateEvolution = useUpdateEvolution();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  useEffect(() => {
    if (evolution) setEditForm({ title: evolution.title, description: evolution.description || '' });
  }, [evolution?.id]);

  const progressPercent = allItems && allItems.totalItems > 0
    ? Math.round((allItems.completedItems / allItems.totalItems) * 100)
    : 0;

  const handleSaveInfo = async () => {
    if (!editForm.title.trim()) { toast.error('Informe um título'); return; }
    try {
      await updateEvolution.mutateAsync({
        id: evolutionId,
        updates: { title: editForm.title, description: editForm.description || null },
      });
      toast.success('Evolução atualizada');
      setEditOpen(false);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info card: title + description */}
      {evolution && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{evolution.title}</CardTitle>
                  <CardDescription className="mt-1 whitespace-pre-wrap">
                    {evolution.description || (isAdmin ? 'Sem descrição. Clique em editar para adicionar.' : 'Sem descrição.')}
                  </CardDescription>
                </div>
              </div>
              {isAdmin && (
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Evolução</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Título *</Label>
                        <Input
                          value={editForm.title}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Ex.: Novo módulo de relatórios"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          rows={5}
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Descreva o que será feito nesta evolução..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveInfo} disabled={updateEvolution.isPending}>
                        {updateEvolution.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted-foreground uppercase">Etapas da Evolução</div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-1.5 h-7"
          >
            <TableIcon className="h-3.5 w-3.5" />
            Tabela
          </Button>
          <Button
            variant={viewMode === 'gantt' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('gantt')}
            className="gap-1.5 h-7"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Gantt
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Visão Geral da Evolução</CardTitle>
            <span className="text-xl font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted mt-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {allItems?.completedItems || 0}/{allItems?.totalItems || 0} itens concluídos
          </p>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : stages && stages.length > 0 ? (
        viewMode === 'table' ? (
          <TableView
            stages={stages}
            expandedStage={expandedStage}
            setExpandedStage={setExpandedStage}
            projectId={projectId}
            isAdmin={isAdmin}
          />
        ) : (
          <GanttView stages={stages} />
        )
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma etapa.</p>
      )}
    </div>
  );
}

function StageStatusBadge({ stageId }: { stageId: string }) {
  const { data: items } = useEvolutionStageItems(stageId);
  const total = items?.length || 0;
  const completed = items?.filter(i => i.is_completed).length || 0;
  const status = total === 0 ? 'pending' : completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';
  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full',
      status === 'completed' && 'bg-primary/10 text-primary',
      status === 'in_progress' && 'bg-warning/10 text-warning',
      status === 'pending' && 'bg-muted text-muted-foreground'
    )}>
      {status === 'completed' ? 'Concluída' : status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
      {total > 0 && ` (${completed}/${total})`}
    </span>
  );
}

function TableView({ stages, expandedStage, setExpandedStage, projectId, isAdmin }: {
  stages: EvolutionStage[];
  expandedStage: string | null;
  setExpandedStage: (id: string | null) => void;
  projectId: string;
  isAdmin: boolean;
}) {
  const updateStage = useUpdateEvolutionStage();
  return (
    <div className="space-y-3">
      {stages.map(stage => {
        const Icon = stageIcons[stage.stage_name] || Circle;
        const isExpanded = expandedStage === stage.id;
        return (
          <Card key={stage.id} className="transition-all">
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 shrink-0 border-muted-foreground/30 bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {stage.order_index + 1}. {stage.stage_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <StageStatusBadge stageId={stage.id} />
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {stage.notes && <CardDescription className="mt-0.5">{stage.notes}</CardDescription>}
                  <div className="flex gap-3 mt-1">
                    {stage.started_at && (
                      <span className="text-xs text-muted-foreground">
                        Início: {format(parseDateOnly(stage.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                    {stage.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        Término: {format(parseDateOnly(stage.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                {isAdmin && (
                  <div className="flex items-center gap-2 text-xs border rounded p-2 bg-muted/30">
                    <label className="text-muted-foreground">Início:</label>
                    <input
                      type="date"
                      defaultValue={stage.started_at ? new Date(stage.started_at).toISOString().split('T')[0] : ''}
                      onBlur={(e) => updateStage.mutate({
                        id: stage.id,
                        updates: { started_at: e.target.value ? new Date(e.target.value).toISOString() : null },
                      })}
                      className="bg-transparent border rounded px-1.5 py-0.5 text-xs"
                    />
                    <label className="text-muted-foreground">Término:</label>
                    <input
                      type="date"
                      defaultValue={stage.completed_at ? new Date(stage.completed_at).toISOString().split('T')[0] : ''}
                      onBlur={(e) => {
                        const v = e.target.value;
                        updateStage.mutate({
                          id: stage.id,
                          updates: {
                            completed_at: v ? new Date(v).toISOString() : null,
                            status: v ? 'completed' : 'in_progress',
                          },
                        });
                      }}
                      className="bg-transparent border rounded px-1.5 py-0.5 text-xs"
                    />
                  </div>
                )}
                <StageChecklist stageId={stage.id} projectId={projectId} isAdmin={isAdmin} source="evolution" />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function GanttBar({ stageId, leftPercent, widthPercent }: { stageId: string; leftPercent: number; widthPercent: number }) {
  const { data: items } = useEvolutionStageItems(stageId);
  const total = items?.length || 0;
  const completed = items?.filter(i => i.is_completed).length || 0;
  const status = total === 0 ? 'pending' : completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';
  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded transition-all',
        status === 'completed' ? 'bg-primary' : status === 'in_progress' ? 'bg-warning' : 'bg-muted-foreground/30'
      )}
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '8px' }}
    />
  );
}

function GanttView({ stages }: { stages: EvolutionStage[] }) {
  const stagesWithDates = stages.filter(s => s.started_at);
  const allDates = stagesWithDates.flatMap(s => {
    const d = [parseDateOnly(s.started_at!)];
    if (s.completed_at) d.push(parseDateOnly(s.completed_at));
    return d;
  });

  if (allDates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">As etapas precisam ter datas para visualizar o Gantt.</p>
        </CardContent>
      </Card>
    );
  }

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime()), Date.now()));
  const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Gráfico de Gantt
        </CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{format(minDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
          <span>{format(maxDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map(stage => {
            const Icon = stageIcons[stage.stage_name] || Circle;
            let leftPercent = 0, widthPercent = 0;
            if (stage.started_at) {
              const start = parseDateOnly(stage.started_at);
              const end = stage.completed_at ? parseDateOnly(stage.completed_at) : new Date();
              leftPercent = (differenceInDays(start, minDate) / totalDays) * 100;
              widthPercent = Math.max((differenceInDays(end, start) / totalDays) * 100, 2);
            }
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{stage.order_index + 1}</span>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{stage.stage_name}</span>
                </div>
                <div className="flex-1 h-8 bg-muted rounded-md relative overflow-hidden">
                  {stage.started_at && (
                    <GanttBar stageId={stage.id} leftPercent={leftPercent} widthPercent={widthPercent} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
