import { useAuth } from '@/contexts/AuthContext';
import { useProjects, computeProjectStatus } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAllMilestones } from '@/hooks/useAllMilestones';
import { useAutoStartOnboarding } from '@/hooks/useOnboardingTour';

import { 
  FolderKanban, 
  FileText, 
  GraduationCap, 
  ArrowRight,
  Loader2,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile, userRole } = useAuth();
  const { data: projects, isLoading } = useProjects();
  const { documentsCount, trainingsCount, stagesByProject } = useDashboardStats();
  useAutoStartOnboarding(true);

  const { data: milestones } = useAllMilestones();

  const upcomingMilestones = milestones
    ?.filter(m => {
      const date = new Date(m.due_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today && m.status !== 'cancelled';
    })
    .slice(0, 5) || [];

  // KPI calculations
  const projectsWithStatus = projects?.map(p => {
    const stages = stagesByProject?.[p.id] || [];
    return { ...p, computedStatus: computeProjectStatus(p, stages) };
  }) || [];

  const completedProjects = projectsWithStatus.filter(p => p.computedStatus === 'completed').length;
  const inProgressProjects = projectsWithStatus.filter(p => p.computedStatus === 'in_progress').length;
  const delayedProjects = projectsWithStatus.filter(p => p.computedStatus === 'delayed').length;
  const totalProjects = projects?.length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bem-vindo, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'admin' 
              ? 'Gerencie os projetos e conteúdos dos seus clientes.'
              : 'Acesse seus projetos e materiais técnicos.'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projetos</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">projetos disponíveis</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{inProgressProjects}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: totalProjects ? `${(inProgressProjects / totalProjects) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-muted-foreground">{totalProjects ? Math.round((inProgressProjects / totalProjects) * 100) : 0}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{completedProjects}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: totalProjects ? `${(completedProjects / totalProjects) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-muted-foreground">{totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{delayedProjects}</div>
              <p className="text-xs text-muted-foreground">projetos com prazo vencido</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documentsCount}</div>
              <p className="text-xs text-muted-foreground">arquivos no total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Treinamentos</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainingsCount}</div>
              <p className="text-xs text-muted-foreground">treinamentos disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Próximos Compromissos
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agenda">Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length > 0 ? (
              <div className="space-y-3">
                {upcomingMilestones.map((m) => {
                  const date = new Date(m.due_date + 'T00:00:00');
                  const today = isToday(date);
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0 text-center">
                        <span className="text-xs font-bold leading-tight">
                          {format(date, 'dd', { locale: ptBR })}
                          <br />
                          <span className="text-[9px] uppercase text-muted-foreground">{format(date, 'MMM', { locale: ptBR })}</span>
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.project_name}</p>
                      </div>
                      {today && <Badge className="text-[10px] bg-primary">Hoje</Badge>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum compromisso pendente</p>
            )}
          </CardContent>
        </Card>

        {/* Projects List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seus Projetos</h2>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : projectsWithStatus.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectsWithStatus.map((project) => {
                const statusConfig: Record<string, { label: string; class: string }> = {
                  pending: { label: 'Pendente', class: 'bg-muted text-muted-foreground' },
                  in_progress: { label: 'Em Andamento', class: 'bg-warning/10 text-warning' },
                  completed: { label: 'Concluído', class: 'bg-primary/10 text-primary' },
                  delayed: { label: 'Atrasado', class: 'bg-destructive/10 text-destructive' },
                  archived: { label: 'Arquivado', class: 'bg-muted text-muted-foreground' },
                };
                const st = statusConfig[project.computedStatus] || statusConfig.pending;

                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        <span className="truncate">{project.name}</span>
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${st.class}`}>
                          {st.label}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/projeto/${project.id}`}>
                            Acessar
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      {(project.start_date || project.end_date) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {project.start_date && format(new Date(project.start_date + 'T00:00:00'), 'dd/MM/yy', { locale: ptBR })}
                          {project.start_date && project.end_date && ' → '}
                          {project.end_date && format(new Date(project.end_date + 'T00:00:00'), 'dd/MM/yy', { locale: ptBR })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Nenhum projeto disponível</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {userRole === 'admin' 
                    ? 'Crie um novo projeto para começar.'
                    : 'Entre em contato com a Smartest Solution para obter acesso a projetos.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
