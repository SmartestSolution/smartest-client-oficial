import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectStages } from '@/hooks/useProjectStages';
import { useProjectStageItems } from '@/hooks/useProjectStageItems';
import { useAllStageItems } from '@/hooks/useAllStageItems';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { StageChecklist } from '@/components/projeto/StageChecklist';
import { EvolutionsSection } from '@/components/projeto/EvolutionsSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, Database, Code, TestTube, Rocket, TrendingUp, Wrench,
  CheckCircle2, Circle, Loader2, ArrowLeft, ChevronDown, ChevronRight,
  TableIcon, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const stageIcons: Record<string, React.ElementType> = {
  'Levantamento': ClipboardList,
  'Modelagem': Database,
  'Desenvolvimento': Code,
  'Homologação': TestTube,
  'Produção': Rocket,
  'Suporte': Wrench,
  'Evolução': TrendingUp,
};

type ViewMode = 'table' | 'gantt';

export default function ProjectProgress() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  const { data: stages, isLoading } = useProjectStages(id);
  const { data: allItems } = useAllStageItems(id);
  const { isAdmin } = useAuth();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const progressPercent = allItems && allItems.totalItems > 0 
    ? Math.round((allItems.completedItems / allItems.totalItems) * 100) 
    : 0;
  
  const currentStage = stages?.find(s => s.status === 'in_progress');

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
            <h1 className="text-2xl font-bold text-foreground">Progresso do Projeto</h1>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="gap-1.5"
            >
              <TableIcon className="h-4 w-4" />
              Tabela
            </Button>
            <Button
              variant={viewMode === 'gantt' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('gantt')}
              className="gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Gantt
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Visão Geral</CardTitle>
              <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted mt-2">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-muted-foreground">
                {allItems?.completedItems || 0}/{allItems?.totalItems || 0} itens concluídos
              </p>
              {currentStage && (
                <p className="text-sm text-muted-foreground">
                  Etapa atual: <span className="font-medium text-foreground">{currentStage.stage_name}</span>
                </p>
              )}
              {progressPercent === 100 && (allItems?.totalItems || 0) > 0 && (
                <p className="text-sm font-medium text-primary">✅ Projeto Concluído</p>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* View Toggle Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stages && stages.length > 0 ? (
          viewMode === 'table' ? (
            <TableView
              stages={stages}
              expandedStage={expandedStage}
              setExpandedStage={setExpandedStage}
              projectId={id!}
              isAdmin={isAdmin}
            />
          ) : (
            <GanttView stages={stages} project={project} />
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma etapa cadastrada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As etapas do projeto ainda não foram configuradas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Evoluções (pós-produção) */}
        {id && (
          <EvolutionsSection
            projectId={id}
            isAdmin={isAdmin}
            projectCompleted={progressPercent === 100 && (allItems?.totalItems || 0) > 0}
          />
        )}
      </div>
    </AppLayout>
  );
}

function StageStatusBadge({ stageId }: { stageId: string }) {
  const { data: items } = useProjectStageItems(stageId);
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
  stages: any[];
  expandedStage: string | null;
  setExpandedStage: (id: string | null) => void;
  projectId: string;
  isAdmin: boolean;
}) {
  const renderStage = (stage: any) => {
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
              {stage.notes && (
                <CardDescription className="mt-0.5">{stage.notes}</CardDescription>
              )}
              <div className="flex gap-3 mt-1">
                {stage.started_at && (
                  <span className="text-xs text-muted-foreground">
                    Início: {format(new Date(stage.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                )}
                {stage.completed_at && (
                  <span className="text-xs text-muted-foreground">
                    Término: {format(new Date(stage.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            <StageChecklist stageId={stage.id} projectId={projectId} isAdmin={isAdmin} />
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {stages.map(renderStage)}
    </div>
  );
}

function GanttView({ stages, project }: { stages: any[]; project: any }) {
  const stagesWithDates = stages.filter(s => s.started_at);
  const allDates = stagesWithDates.flatMap(s => {
    const dates = [new Date(s.started_at)];
    if (s.completed_at) dates.push(new Date(s.completed_at));
    return dates;
  });

  if (allDates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Sem dados para o Gantt</h3>
          <p className="text-sm text-muted-foreground mt-1">
            As etapas precisam ter datas de início e término para visualizar o gráfico de Gantt.
          </p>
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
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Gráfico de Gantt
        </CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{format(minDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
          <span>{format(maxDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage) => {
            const Icon = stageIcons[stage.stage_name] || Circle;

            let leftPercent = 0;
            let widthPercent = 0;

            if (stage.started_at) {
              const start = new Date(stage.started_at);
              const end = stage.completed_at ? new Date(stage.completed_at) : new Date();
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
        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-primary" />
            <span>Concluída</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-warning" />
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-muted-foreground/30" />
            <span>Pendente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GanttBar({ stageId, leftPercent, widthPercent }: { stageId: string; leftPercent: number; widthPercent: number }) {
  const { data: items } = useProjectStageItems(stageId);
  const total = items?.length || 0;
  const completed = items?.filter(i => i.is_completed).length || 0;
  const status = total === 0 ? 'pending' : completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';

  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded transition-all',
        status === 'completed' ? 'bg-primary' : status === 'in_progress' ? 'bg-warning' : 'bg-muted-foreground/30'
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '8px',
      }}
    />
  );
}
