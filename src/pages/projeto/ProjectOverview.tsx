import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useDocuments } from '@/hooks/useDocuments';
import { useVideos } from '@/hooks/useVideos';
import { useProjectStages } from '@/hooks/useProjectStages';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useAllStageItems } from '@/hooks/useAllStageItems';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardLinksSection } from '@/components/projeto/DashboardLinksSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Video, ArrowRight, Loader2, Calendar,
  BarChart3, CalendarDays, CheckCircle2, Clock, GraduationCap,
  Download, Flag, PlayCircle, Target, LifeBuoy,
} from 'lucide-react';
import { format, isSameDay, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportProjectVersioning } from '@/lib/exportProjectVersioning';
import { exportProjectTasksExcel } from '@/lib/exportProjectTasksExcel';
import { toast } from 'sonner';
import { useState } from 'react';

function computeStatus(dueDate: string): string {
  const date = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isSameDay(date, today)) return 'in_progress';
  if (isPast(date)) return 'completed';
  return 'pending';
}

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: documents } = useDocuments(id);
  const { data: videos } = useVideos(id);
  const { data: stages } = useProjectStages(id);
  const { data: milestones } = useProjectMilestones(id);
  const { data: allItems } = useAllStageItems(id);
  const [exporting, setExporting] = useState(false);
  const [exportingTasks, setExportingTasks] = useState(false);

  const handleExport = async () => {
    if (!id) return;
    try {
      setExporting(true);
      await exportProjectVersioning(id);
      toast.success('Versionamento exportado!');
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportTasks = async () => {
    if (!id) return;
    try {
      setExportingTasks(true);
      await exportProjectTasksExcel(id);
      toast.success('Planilha exportada!');
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + e.message);
    } finally {
      setExportingTasks(false);
    }
  };

  if (projectLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold">Projeto não encontrado</h2>
          <p className="text-muted-foreground mt-2">O projeto solicitado não existe ou você não tem permissão para acessá-lo.</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const progressPercent = allItems && allItems.totalItems > 0 
    ? Math.round((allItems.completedItems / allItems.totalItems) * 100) 
    : 0;

  // Determine current/active stage: first stage that's not completed
  const sortedStages = [...(stages || [])].sort((a, b) => a.order_index - b.order_index);
  const currentStage = sortedStages.find(s => s.status !== 'completed') || sortedStages[sortedStages.length - 1];
  const completedStagesCount = sortedStages.filter(s => s.status === 'completed').length;

  const today = new Date();
  const startDate = project.start_date ? new Date(project.start_date + 'T00:00:00') : null;
  const endDate = project.end_date ? new Date(project.end_date + 'T23:59:59') : null;
  const totalDays = startDate && endDate ? Math.max(1, differenceInDays(endDate, startDate)) : null;
  const elapsedDays = startDate ? Math.max(0, differenceInDays(today, startDate)) : null;
  const daysRemaining = endDate ? differenceInDays(endDate, today) : null;
  const timeProgress = totalDays && elapsedDays !== null
    ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
    : null;

  const statusBadge = (() => {
    if (completedStagesCount === sortedStages.length && sortedStages.length > 0) 
      return { label: 'Concluído', cls: 'bg-success/10 text-success border-success/30' };
    if (daysRemaining !== null && daysRemaining < 0) 
      return { label: 'Atrasado', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (currentStage?.status === 'in_progress' || sortedStages.some(s => s.status === 'in_progress')) 
      return { label: 'Em Andamento', cls: 'bg-warning/10 text-warning border-warning/30' };
    return { label: 'Pendente', cls: 'bg-muted text-muted-foreground border-border' };
  })();

  const upcomingMilestones = milestones
    ?.filter(m => {
      const auto = computeStatus(m.due_date);
      return auto !== 'completed' && m.status !== 'cancelled';
    })
    .slice(0, 3) || [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header */}
        <div className="rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${statusBadge.cls} border`}>{statusBadge.label}</Badge>
                {currentStage && (
                  <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30">
                    <PlayCircle className="h-3 w-3 mr-1" /> {currentStage.stage_name}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-primary-foreground/80 mt-2 max-w-2xl">{project.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link to={`/projeto/${id}/suporte`}>
                  <LifeBuoy className="h-4 w-4 mr-2" /> Suporte
                </Link>
              </Button>
              <Button variant="secondary" onClick={handleExportTasks} disabled={exportingTasks}>
                {exportingTasks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Exportar Tarefas (.xlsx)
              </Button>
              <Button variant="secondary" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Exportar Versionamento
              </Button>
            </div>
          </div>

          {/* Timeline metrics */}
          <div className="grid gap-3 md:grid-cols-4 mt-6">
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" /> Início
              </div>
              <p className="text-lg font-semibold mt-1">
                {startDate ? format(startDate, "dd MMM yyyy", { locale: ptBR }) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                <Flag className="h-3.5 w-3.5" /> Término
              </div>
              <p className="text-lg font-semibold mt-1">
                {endDate ? format(endDate, "dd MMM yyyy", { locale: ptBR }) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" /> Prazo
              </div>
              <p className="text-lg font-semibold mt-1">
                {daysRemaining === null ? '—' :
                  daysRemaining < 0 ? `${Math.abs(daysRemaining)} dias atrasado` :
                  daysRemaining === 0 ? 'Hoje' :
                  `${daysRemaining} dias restantes`}
              </p>
            </div>
            <div className="rounded-lg bg-primary-foreground/10 p-3">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70 uppercase tracking-wider">
                <Target className="h-3.5 w-3.5" /> Etapas
              </div>
              <p className="text-lg font-semibold mt-1">
                {completedStagesCount}/{sortedStages.length} concluídas
              </p>
            </div>
          </div>

          {/* Progress bars */}
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Progresso de Entregas
                </span>
                <span className="font-bold">{progressPercent}% ({allItems?.completedItems || 0}/{allItems?.totalItems || 0})</span>
              </div>
              <div className="h-2.5 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div className="h-full bg-primary-foreground transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            {timeProgress !== null && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tempo Decorrido
                  </span>
                  <span className="font-bold">{timeProgress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-primary-foreground/20 overflow-hidden">
                  <div className="h-full bg-primary-foreground/70 transition-all duration-500" style={{ width: `${timeProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stages timeline summary */}
        {sortedStages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Linha do Tempo das Etapas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {sortedStages.map((s, idx) => {
                  const isDone = s.status === 'completed';
                  const isCurrent = s.id === currentStage?.id && !isDone;
                  return (
                    <Link key={s.id} to={`/projeto/${id}/progresso`} className="group">
                      <div className={`text-[10px] uppercase tracking-wider mb-1 truncate font-medium ${
                        isDone ? 'text-success' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {idx + 1}. {s.stage_name}
                      </div>
                      <div className={`h-1.5 rounded-full ${
                        isDone ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-muted'
                      } group-hover:opacity-80 transition`} />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agenda Summary */}
        <Card className="hover:shadow-md transition-shadow group">
          <Link to={`/projeto/${id}/agenda`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Próximos Compromissos
                </CardTitle>
                <span className="text-sm text-muted-foreground">{upcomingMilestones.length} próximos</span>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingMilestones.length > 0 ? (
                <div className="space-y-2">
                  {upcomingMilestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      {computeStatus(m.due_date) === 'in_progress' ? (
                        <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate flex-1">{m.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(m.due_date + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento próximo</p>
              )}
              <div className="flex items-center text-primary text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver agenda <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <Link to={`/projeto/${id}/documentos`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{documents?.length || 0} arquivos</p>
                <div className="flex items-center text-primary text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Acessar <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <Link to={`/projeto/${id}/treinamentos`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Treinamentos</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{videos?.length || 0} vídeos</p>
                <div className="flex items-center text-primary text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Acessar <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Dashboard Links */}
        <DashboardLinksSection projectId={id} />

        {/* Content Preview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Documentos Recentes</CardTitle>
                  <CardDescription>Últimos documentos adicionados</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/projeto/${id}/documentos`}>Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <FileText className="h-8 w-8 text-primary/70" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento disponível</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Treinamentos Recentes</CardTitle>
                  <CardDescription>Últimos treinamentos adicionados</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/projeto/${id}/treinamentos`}>Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {videos && videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.slice(0, 3).map((video) => (
                    <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <Video className="h-8 w-8 text-primary/70" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{video.name}</p>
                        <p className="text-xs text-muted-foreground">{video.theme || 'Sem tema definido'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum vídeo disponível</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
