import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStages, useUpdateProjectStage, useCreateDefaultStages, ProjectStage } from '@/hooks/useProjectStages';
import { useProject } from '@/hooks/useProjects';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Loader2, 
  BarChart3,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  Circle
} from 'lucide-react';
import { toast } from 'sonner';
import { ProjectProgressTimeline } from '@/components/projeto/ProjectProgressTimeline';
import { useProjectStageItems } from '@/hooks/useProjectStageItems';
import { cn } from '@/lib/utils';

function StageStatusCell({ stageId }: { stageId: string }) {
  const { data: items } = useProjectStageItems(stageId);
  const total = items?.length || 0;
  const completed = items?.filter(i => i.is_completed).length || 0;
  const status = total === 0 ? 'pending' : completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';

  const icon = status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-primary" /> :
    status === 'in_progress' ? <Clock className="h-4 w-4 text-warning" /> :
    <Circle className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={cn(
        'text-xs px-2 py-0.5 rounded-full',
        status === 'completed' && 'bg-primary/10 text-primary',
        status === 'in_progress' && 'bg-warning/10 text-warning',
        status === 'pending' && 'bg-muted text-muted-foreground'
      )}>
        {status === 'completed' ? 'Concluída' : status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
        {total > 0 && ` (${completed}/${total})`}
      </span>
    </div>
  );
}

export default function AdminProjectStages() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: stages, isLoading } = useProjectStages(projectId);
  const updateStage = useUpdateProjectStage();
  const createDefaults = useCreateDefaultStages();
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingDates, setEditingDates] = useState<Record<string, { started_at?: string; completed_at?: string }>>({});

  const handleSaveDates = (stage: ProjectStage) => {
    const dates = editingDates[stage.id];
    if (!dates) return;

    const updates: Partial<ProjectStage> = {};
    if (dates.started_at !== undefined) {
      updates.started_at = dates.started_at ? new Date(dates.started_at).toISOString() : null;
    }
    if (dates.completed_at !== undefined) {
      updates.completed_at = dates.completed_at ? new Date(dates.completed_at).toISOString() : null;
    }

    updateStage.mutate(
      { id: stage.id, updates },
      {
        onSuccess: () => {
          toast.success('Datas atualizadas!');
          setEditingDates(prev => {
            const next = { ...prev };
            delete next[stage.id];
            return next;
          });
        },
        onError: (err: Error) => toast.error('Erro: ' + err.message),
      }
    );
  };

  const handleSaveNotes = (stage: ProjectStage) => {
    const notes = editingNotes[stage.id];
    if (notes === undefined) return;

    updateStage.mutate(
      { id: stage.id, updates: { notes: notes || null } },
      {
        onSuccess: () => {
          toast.success('Observação salva!');
          setEditingNotes(prev => {
            const next = { ...prev };
            delete next[stage.id];
            return next;
          });
        },
        onError: (err: Error) => toast.error('Erro: ' + err.message),
      }
    );
  };

  const handleCreateDefaults = () => {
    if (!projectId) return;
    createDefaults.mutate(projectId, {
      onSuccess: () => toast.success('Etapas padrão criadas!'),
      onError: (err: Error) => toast.error('Erro: ' + err.message),
    });
  };

  const getDateValue = (stage: ProjectStage, field: 'started_at' | 'completed_at') => {
    const edited = editingDates[stage.id]?.[field];
    if (edited !== undefined) return edited;
    if (!stage[field]) return '';
    return new Date(stage[field]!).toISOString().split('T')[0];
  };

  const setDateField = (stageId: string, field: 'started_at' | 'completed_at', value: string) => {
    setEditingDates(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value },
    }));
  };

    const mainStages = stages || [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/admin/empresas`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              {project?.name || 'Carregando...'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Etapas do Projeto</h1>
          </div>
        </div>

        {stages && stages.length > 0 && (
          <ProjectProgressTimeline stages={stages} />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gerenciar Etapas
                </CardTitle>
                <CardDescription>
                  Configure datas de início/término para o Gantt. O status é calculado automaticamente pelo checklist.
                </CardDescription>
              </div>
              {stages && stages.length === 0 && (
                <Button onClick={handleCreateDefaults} disabled={createDefaults.isPending}>
                  {createDefaults.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Etapas Padrão
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : stages && stages.length > 0 ? (
              <StagesTable 
                stages={mainStages}
                editingNotes={editingNotes}
                setEditingNotes={setEditingNotes}
                editingDates={editingDates}
                getDateValue={getDateValue}
                setDateField={setDateField}
                handleSaveNotes={handleSaveNotes}
                handleSaveDates={handleSaveDates}
                updatePending={updateStage.isPending}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma etapa cadastrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Criar Etapas Padrão" para iniciar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StagesTable({ stages, editingNotes, setEditingNotes, editingDates, getDateValue, setDateField, handleSaveNotes, handleSaveDates, updatePending }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Etapa</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[140px]">Início</TableHead>
          <TableHead className="w-[140px]">Término</TableHead>
          <TableHead>Observações</TableHead>
          <TableHead className="w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stages.map((stage: any) => (
          <TableRow key={stage.id}>
            <TableCell className="text-muted-foreground">
              {stage.order_index + 1}
            </TableCell>
            <TableCell>
              <span className="font-medium">{stage.stage_name}</span>
            </TableCell>
            <TableCell>
              <StageStatusCell stageId={stage.id} />
            </TableCell>
            <TableCell>
              <Input
                type="date"
                className="h-8 text-sm"
                value={getDateValue(stage, 'started_at')}
                onChange={(e) => setDateField(stage.id, 'started_at', e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Input
                type="date"
                className="h-8 text-sm"
                value={getDateValue(stage, 'completed_at')}
                onChange={(e) => setDateField(stage.id, 'completed_at', e.target.value)}
              />
            </TableCell>
            <TableCell>
              <Textarea
                className="min-h-[36px] h-9 resize-none text-sm"
                placeholder="Observação..."
                value={editingNotes[stage.id] ?? stage.notes ?? ''}
                onChange={(e: any) => setEditingNotes((prev: any) => ({ ...prev, [stage.id]: e.target.value }))}
                rows={1}
              />
            </TableCell>
            <TableCell>
              {(editingNotes[stage.id] !== undefined || editingDates[stage.id] !== undefined) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (editingNotes[stage.id] !== undefined) handleSaveNotes(stage);
                    if (editingDates[stage.id] !== undefined) handleSaveDates(stage);
                  }}
                  disabled={updatePending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
