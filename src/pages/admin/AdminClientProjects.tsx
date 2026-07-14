import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FolderKanban, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  ArrowLeft,
  Building2,
  FileUp,
  GraduationCap,
  BarChart3,
  Link2,
  CalendarDays,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportProjectVersioning } from '@/lib/exportProjectVersioning';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  project_type: 'bi' | 'automation' | 'sql' | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  bi: 'BI',
  automation: 'Automação',
  sql: 'SQL',
};

export default function AdminClientProjects() {
  const { clientId } = useParams<{ clientId: string }>();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    project_type: 'bi' as 'bi' | 'automation' | 'sql',
    start_date: '',
    end_date: '',
    end_date_indeterminate: false,
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      
      if (error) throw error;
      return data as unknown as Project[];
    },
    enabled: !!clientId
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: data.name,
          description: data.description || null,
          status: data.status,
          project_type: data.project_type,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-projects', clientId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto criado com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar projeto: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description || null,
          status: data.status,
          project_type: data.project_type,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        } as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-projects', clientId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto atualizado com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar projeto: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-projects', clientId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover projeto: ' + error.message);
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditingProject(null);
    setFormData({ name: '', description: '', status: 'active', project_type: 'bi', start_date: '', end_date: '', end_date_indeterminate: false });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status || 'active',
      project_type: (project.project_type as 'bi' | 'automation' | 'sql') || 'bi',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      end_date_indeterminate: !project.end_date && !!project.start_date,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome do projeto é obrigatório');
      return;
    }

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/empresas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              {client?.name || 'Carregando...'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingProject(null); setFormData({ name: '', description: '', status: 'active', project_type: 'bi', start_date: '', end_date: '', end_date_indeterminate: false }); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProject 
                    ? 'Atualize os dados do projeto.'
                    : 'Preencha os dados para criar um novo projeto.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Projeto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do projeto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição do projeto"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project_type">Tipo do Projeto *</Label>
                      <Select
                        value={formData.project_type}
                        onValueChange={(value) => setFormData({ ...formData, project_type: value as 'bi' | 'automation' | 'sql' })}
                      >
                        <SelectTrigger id="project_type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bi">BI</SelectItem>
                          <SelectItem value="automation">Automação</SelectItem>
                          <SelectItem value="sql">SQL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => {
                          const today = new Date().toISOString().slice(0, 10);
                          setFormData({
                            ...formData,
                            status: value,
                            ...(value === 'completed' && !formData.end_date
                              ? { end_date: today, end_date_indeterminate: false }
                              : {}),
                          });
                        }}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Data de Início</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">
                        {formData.status === 'completed' ? 'Data de Conclusão' : 'Data de Término'}
                      </Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        disabled={formData.end_date_indeterminate}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="end_date_indeterminate"
                          checked={formData.end_date_indeterminate}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              end_date_indeterminate: !!checked,
                              end_date: checked ? '' : formData.end_date,
                            })
                          }
                        />
                        <Label htmlFor="end_date_indeterminate" className="text-xs font-normal cursor-pointer">
                          Prazo indeterminado
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingProject ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projetos da Empresa
            </CardTitle>
            <CardDescription>
              Gerencie os projetos desta empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects && projects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          project.project_type === 'automation'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : project.project_type === 'sql'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {PROJECT_TYPE_LABELS[project.project_type || 'bi']}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {project.description || '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : project.status === 'completed'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {project.status === 'active' ? 'Ativo' : 
                           project.status === 'completed' ? 'Concluído' : 
                           project.status === 'archived' ? 'Arquivado' : project.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(project.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="Documentos">
                            <Link to={`/admin/projetos/${project.id}/documentos`}>
                              <FileUp className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Treinamentos">
                            <Link to={`/admin/projetos/${project.id}/treinamentos`}>
                              <GraduationCap className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Etapas do Projeto">
                            <Link to={`/admin/projetos/${project.id}/etapas`}>
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Links de Dashboards">
                            <Link to={`/admin/projetos/${project.id}/links`}>
                              <Link2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Agenda de Entregas">
                            <Link to={`/admin/projetos/${project.id}/agenda`}>
                              <CalendarDays className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" title="Exportar versionamento" onClick={async () => {
                            try { await exportProjectVersioning(project.id); toast.success('Versionamento exportado!'); }
                            catch (e: any) { toast.error('Erro: ' + e.message); }
                          }}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja remover este projeto?')) {
                                deleteMutation.mutate(project.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Nenhum projeto cadastrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Novo Projeto" para criar um projeto.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
