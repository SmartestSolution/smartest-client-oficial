import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  Loader2,
  Calendar,
  Clock,
  Building2,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { isAdmin } = useAuth();

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
          <Button asChild className="mt-4">
            <Link to="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const details = [
    { 
      label: 'ID do Projeto', 
      value: project.id, 
      icon: Hash 
    },
    { 
      label: 'Nome', 
      value: project.name, 
      icon: Building2 
    },
    { 
      label: 'Status', 
      value: project.status === 'active' ? 'Ativo' : project.status, 
      icon: Settings 
    },
    { 
      label: 'Data de Criação', 
      value: format(new Date(project.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), 
      icon: Calendar 
    },
    { 
      label: 'Última Atualização', 
      value: format(new Date(project.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), 
      icon: Clock 
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações do Projeto</h1>
          <p className="text-muted-foreground mt-1">
            Informações detalhadas do projeto {project.name}
          </p>
        </div>

        {/* Read-only notice for clients */}
        {!isAdmin && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Settings className="h-5 w-5 text-warning" />
              <p className="text-sm text-muted-foreground">
                As configurações do projeto estão disponíveis apenas para visualização.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Projeto</CardTitle>
            <CardDescription>
              Informações gerais sobre o projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-background">
                  <detail.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{detail.label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{detail.value}</p>
                </div>
              </div>
            ))}

            {project.description && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
