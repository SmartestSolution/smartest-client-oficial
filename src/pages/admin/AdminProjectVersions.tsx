import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectVersions, useCreateProjectVersion, useDeleteProjectVersion } from '@/hooks/useProjectVersions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tag, Plus, Trash2, Loader2, ArrowLeft, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminProjectVersions() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    version_number: '',
    title: '',
    description: '',
    release_notes: '',
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: versions, isLoading } = useProjectVersions(projectId);
  const createMutation = useCreateProjectVersion(projectId);
  const deleteMutation = useDeleteProjectVersion(projectId);

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ version_number: '', title: '', description: '', release_notes: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version_number.trim() || !formData.title.trim()) {
      toast.error('Versão e título são obrigatórios');
      return;
    }
    createMutation.mutate(
      {
        version_number: formData.version_number,
        title: formData.title,
        description: formData.description || undefined,
        release_notes: formData.release_notes || undefined,
        created_by: user?.id,
      },
      {
        onSuccess: () => {
          toast.success('Versão publicada com sucesso!');
          handleClose();
        },
        onError: (err: Error) => toast.error('Erro: ' + err.message),
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/admin/empresas/${project?.client_id}/projetos`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FolderKanban className="h-4 w-4" />
              {project?.name || 'Carregando...'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Versões</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Versão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Versão</DialogTitle>
                <DialogDescription>Publique uma nova versão do projeto.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número da Versão *</Label>
                      <Input
                        value={formData.version_number}
                        onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                        placeholder="1.0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Release inicial"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Breve descrição da versão"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas de Release (Changelog)</Label>
                    <Textarea
                      value={formData.release_notes}
                      onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                      placeholder={"- Novo módulo de relatórios\n- Correção no filtro de datas\n- Melhoria de performance"}
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Publicar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Versões</CardTitle>
            <CardDescription>Histórico de versões publicadas do projeto.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : versions && versions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell><Badge variant="outline">v{v.version_number}</Badge></TableCell>
                      <TableCell className="font-medium">{v.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.description || '—'}</TableCell>
                      <TableCell>{new Date(v.released_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Remover esta versão?')) {
                              deleteMutation.mutate(v.id, {
                                onSuccess: () => toast.success('Versão removida!'),
                                onError: (err: Error) => toast.error('Erro: ' + err.message),
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma versão publicada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Nova Versão" para publicar uma release.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
