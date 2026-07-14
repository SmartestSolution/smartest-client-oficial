import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useDashboardLinks,
  useCreateDashboardLink,
  useUpdateDashboardLink,
  useDeleteDashboardLink,
  DashboardLink,
} from '@/hooks/useDashboardLinks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Loader2,
  Link2,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const platforms = [
  { value: 'power_bi', label: 'Power BI' },
  { value: 'looker', label: 'Looker' },
  { value: 'metabase', label: 'Metabase' },
  { value: 'tableau', label: 'Tableau' },
  { value: 'google_data_studio', label: 'Google Data Studio' },
  { value: 'other', label: 'Outro' },
];

const defaultForm = {
  title: '',
  url: '',
  platform: 'power_bi',
  description: '',
  is_active: true,
  order_index: 0,
};

export default function AdminProjectLinks() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: links, isLoading } = useDashboardLinks(projectId);
  const createLink = useCreateDashboardLink();
  const updateLink = useUpdateDashboardLink();
  const deleteLink = useDeleteDashboardLink();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<DashboardLink | null>(null);
  const [form, setForm] = useState(defaultForm);

  const handleClose = () => {
    setIsOpen(false);
    setEditingLink(null);
    setForm(defaultForm);
  };

  const handleEdit = (link: DashboardLink) => {
    setEditingLink(link);
    setForm({
      title: link.title,
      url: link.url,
      platform: link.platform,
      description: link.description || '',
      is_active: link.is_active,
      order_index: link.order_index,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Título e URL são obrigatórios');
      return;
    }

    const payload = {
      ...form,
      project_id: projectId!,
      description: form.description || null,
      icon_url: null,
    };

    if (editingLink) {
      updateLink.mutate(
        { id: editingLink.id, updates: payload },
        {
          onSuccess: () => { toast.success('Link atualizado!'); handleClose(); },
          onError: (err: Error) => toast.error('Erro: ' + err.message),
        }
      );
    } else {
      createLink.mutate(payload, {
        onSuccess: () => { toast.success('Link criado!'); handleClose(); },
        onError: (err: Error) => toast.error('Erro: ' + err.message),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja remover este link?')) return;
    deleteLink.mutate(id, {
      onSuccess: () => toast.success('Link removido!'),
      onError: (err: Error) => toast.error('Erro: ' + err.message),
    });
  };

  const isPending = createLink.isPending || updateLink.isPending;

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
            <div className="text-sm text-muted-foreground mb-1">
              {project?.name || 'Carregando...'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Links de Dashboards</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingLink(null); setForm(defaultForm); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLink ? 'Editar Link' : 'Novo Link'}</DialogTitle>
                <DialogDescription>
                  {editingLink
                    ? 'Atualize as informações do link.'
                    : 'Adicione um link para um dashboard externo.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Dashboard de Vendas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://app.powerbi.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={form.platform}
                      onValueChange={(val) => setForm({ ...form, platform: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descrição opcional do dashboard"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Ordem</Label>
                    <Input
                      id="order"
                      type="number"
                      value={form.order_index}
                      onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    />
                    <Label>Ativo (visível para clientes)</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingLink ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Links de Dashboards
            </CardTitle>
            <CardDescription>
              Gerencie os links de dashboards externos deste projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : links && links.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="text-muted-foreground">
                        {link.order_index}
                      </TableCell>
                      <TableCell className="font-medium">{link.title}</TableCell>
                      <TableCell>
                        {platforms.find((p) => p.value === link.platform)?.label || link.platform}
                      </TableCell>
                      <TableCell>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-sm max-w-[200px] truncate"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{link.url}</span>
                        </a>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            link.is_active
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {link.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(link)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)}>
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
                <Link2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhum link cadastrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Novo Link" para adicionar um dashboard.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
