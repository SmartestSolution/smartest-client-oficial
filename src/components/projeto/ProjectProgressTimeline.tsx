import { ProjectStage } from '@/hooks/useProjectStages';
import { useProjectStageItems } from '@/hooks/useProjectStageItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardList, Database, Code, TestTube, Rocket, TrendingUp, Wrench,
  CheckCircle2, Circle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectProgressTimelineProps {
  stages: ProjectStage[];
  isLoading?: boolean;
}

const stageIcons: Record<string, React.ElementType> = {
  'Levantamento': ClipboardList,
  'Modelagem': Database,
  'Desenvolvimento': Code,
  'Homologação': TestTube,
  'Produção': Rocket,
  'Suporte': Wrench,
  'Evolução': TrendingUp,
};

const parseDateOnly = (value: string) => {
  const datePart = value.split('T')[0];
  return new Date(datePart + 'T00:00:00');
};

function TimelineStageItem({ stage, isLast }: { stage: ProjectStage; isLast: boolean }) {
  const { data: items } = useProjectStageItems(stage.id);
  const total = items?.length || 0;
  const completed = items?.filter(i => i.is_completed).length || 0;
  const status = total === 0 ? 'pending' : completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';

  const Icon = stageIcons[stage.stage_name] || Circle;
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const isPending = status === 'pending';

  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
          isCompleted && 'border-primary bg-primary text-primary-foreground',
          isInProgress && 'border-primary bg-accent text-primary animate-pulse',
          isPending && 'border-muted-foreground/30 bg-muted text-muted-foreground'
        )}>
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        {!isLast && (
          <div className={cn('w-0.5 flex-1 min-h-[24px]', isCompleted ? 'bg-primary' : 'bg-muted-foreground/20')} />
        )}
      </div>
      <div className="flex-1 pt-1.5">
        <p className={cn(
          'font-medium text-sm',
          isCompleted && 'text-foreground',
          isInProgress && 'text-primary font-semibold',
          isPending && 'text-muted-foreground'
        )}>
          {stage.order_index + 1}. {stage.stage_name}
          {total > 0 && <span className="text-xs font-normal ml-2">({completed}/{total})</span>}
        </p>
        {stage.notes && <p className="text-xs text-muted-foreground mt-0.5">{stage.notes}</p>}
        <div className="flex gap-3 mt-0.5">
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
  );
}

export function ProjectProgressTimeline({ stages, isLoading }: ProjectProgressTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso do Projeto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stages || stages.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Timeline do Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {stages.map((stage, index) => (
            <TimelineStageItem key={stage.id} stage={stage} isLast={index === stages.length - 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
