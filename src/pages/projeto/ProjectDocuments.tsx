import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useGithubDocuments, fetchGithubFile, GithubEntry } from '@/hooks/useGithubDocuments';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Download, Eye, Loader2, File, Folder, ChevronRight, Home, Github, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDocuments() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const [path, setPath] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useGithubDocuments(id, path);

  const segments = path ? path.split('/').filter(Boolean) : [];

  const openFile = async (entry: GithubEntry, mode: 'view' | 'download') => {
    if (!id) return;
    setBusy(entry.path);
    try {
      const blob = await fetchGithubFile(id, entry.path);
      const url = URL.createObjectURL(blob);
      if (mode === 'view') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = entry.name;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error('Não foi possível abrir o arquivo: ' + (err as Error).message);
    } finally {
      setBusy(null);
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
          <Button asChild className="mt-4"><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const items = (data?.items || []).filter((entry) =>
    entry.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Github className="h-4 w-4" />
              {data?.repo ? `Arquivos do repositório ${data.repo}` : `Documentos do projeto ${project.name}`}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        {data?.notConfigured ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Github className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Repositório não configurado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Um administrador precisa informar o repositório do GitHub nas configurações deste projeto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setPath('')}>
                  <Home className="h-4 w-4" /> Início
                </Button>
                {segments.map((segment, index) => (
                  <span key={`${segment}-${index}`} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Button variant="ghost" size="sm" onClick={() => setPath(segments.slice(0, index + 1).join('/'))}>
                      {segment}
                    </Button>
                  </span>
                ))}
              </div>
              <Input
                className="ml-auto w-full sm:w-64"
                placeholder="Buscar arquivo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="border-destructive/40">
                <CardContent className="py-8 text-center text-sm text-destructive">
                  Não foi possível carregar os arquivos: {(error as Error).message}
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhum documento nesta pasta</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {items.map((entry) => (
                  <Card key={entry.path} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          {entry.type === 'dir'
                            ? <Folder className="h-5 w-5 text-primary" />
                            : <File className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {entry.type === 'dir' ? (
                            <button className="font-medium truncate hover:underline" onClick={() => setPath(entry.path)}>
                              {entry.name}
                            </button>
                          ) : (
                            <p className="font-medium truncate">{entry.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.type === 'dir' ? 'Pasta' : formatFileSize(entry.size)}
                          </p>
                        </div>
                        {entry.type === 'file' && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={busy === entry.path} onClick={() => openFile(entry, 'view')}>
                              {busy === entry.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy === entry.path} onClick={() => openFile(entry, 'download')}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
