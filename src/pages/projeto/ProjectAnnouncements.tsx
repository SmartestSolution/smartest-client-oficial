import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectAnnouncements, ProjectAnnouncement } from '@/hooks/useProjectAnnouncements';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, Pin, Sparkles, Bug, Wrench, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeConfig: Record<string, { label: string; icon: typeof Megaphone; color: string }> = {
  update: { label: 'Atualização', icon: Sparkles, color: 'bg-primary/10 text-primary' },
  fix: { label: 'Correção', icon: Bug, color: 'bg-destructive/10 text-destructive' },
  improvement: { label: 'Melhoria', icon: Wrench, color: 'bg-warning/10 text-warning' },
  info: { label: 'Informativo', icon: Info, color: 'bg-muted text-muted-foreground' },
};

export default function ProjectAnnouncements() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: announcements, isLoading } = useProjectAnnouncements(id);

  if (projectLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Comunicados
          </h1>
          <p className="text-muted-foreground mt-1">
            Atualizações e novidades do projeto {project?.name}
          </p>
        </div>

        {announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((a) => {
              const config = typeConfig[a.announcement_type] || typeConfig.info;
              const Icon = config.icon;
              return (
                <Card key={a.id} className={`transition-shadow hover:shadow-md ${a.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {a.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                        <CardTitle className="text-base">{a.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(a.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum comunicado publicado ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
