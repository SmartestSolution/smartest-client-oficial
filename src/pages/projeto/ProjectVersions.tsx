import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectVersions } from '@/hooks/useProjectVersions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Loader2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectVersions() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: versions, isLoading: versionsLoading } = useProjectVersions(id);

  const isLoading = projectLoading || versionsLoading;

  if (isLoading) {
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
          <Button asChild className="mt-4"><Link to="/dashboard">Voltar</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Versões</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de versões e releases do projeto {project.name}
          </p>
        </div>

        {versions && versions.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {versions.map((version, index) => (
                <div key={version.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                    index === 0 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}>
                    <Tag className="h-5 w-5" />
                  </div>

                  <Card className="flex-1">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>
                              v{version.version_number}
                            </Badge>
                            <h3 className="font-semibold text-foreground">{version.title}</h3>
                          </div>
                          {version.description && (
                            <p className="text-sm text-muted-foreground">{version.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(version.released_at), 'dd/MM/yyyy')}
                        </span>
                      </div>

                      {version.release_notes && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                          {version.release_notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma versão publicada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As versões do projeto aparecerão aqui quando forem publicadas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
