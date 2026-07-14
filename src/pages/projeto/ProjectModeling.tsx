import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useDocuments, Document } from '@/hooks/useDocuments';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Download,
  Eye,
  Loader2,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ModelingCard({ doc }: { doc: Document }) {
  const handleView = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .download(doc.file_path);
    
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-accent">
            <FileSpreadsheet className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{doc.name}</h3>
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {doc.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(doc.created_at), 'dd/MM/yyyy')}
              </span>
              <span>{formatFileSize(doc.file_size)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectModeling() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: documents, isLoading: docsLoading } = useDocuments(id);

  const isLoading = projectLoading || docsLoading;
  const modelingDocs = documents?.filter(d => d.document_type === 'data_modeling') || [];

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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modelagem de Dados</h1>
          <p className="text-muted-foreground mt-1">
            Diagramas e documentos de modelagem do projeto {project.name}
          </p>
        </div>

        {/* Content */}
        {modelingDocs.length > 0 ? (
          <div className="grid gap-4">
            {modelingDocs.map((doc) => (
              <ModelingCard key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Nenhum documento de modelagem disponível
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Não há diagramas ou documentos de modelagem cadastrados para este projeto.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
