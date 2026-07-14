import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProjectAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, ProjectAnnouncement } from '@/hooks/useProjectAnnouncements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, ArrowLeft, Megaphone, Pencil, Trash2, Pin, Sparkles, Bug, Wrench, Info } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const typeOptions = [
  { value: 'update', label: 'Atualização', icon: Sparkles },
  { value: 'fix', label: 'Correção', icon: Bug },
  { value: 'improvement', label: 'Melhoria', icon: Wrench },
  { value: 'info', label: 'Informativo', icon: Info },
];

const typeConfig: Record<string, { label: string; color: string }> = {
  update: { label: 'Atualização', color: 'bg-primary/10 text-primary' },
  fix: { label: 'Correção', color: 'bg-destructive/10 text-destructive' },
  improvement: { label: 'Melhoria', color: 'bg-warning/10 text-warning' },
  info: { label: 'Informativo', color: 'bg-muted text-muted-foreground' },
};

export default function AdminProjectAnnouncements() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: announcements, isLoading } = useProjectAnnouncements(projectId);
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectAnnouncement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('update');
  const [isPinned, setIsPinned] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('update');
    setIsPinned(false);
    setEditing(null);
  };

  const openEdit = (a: ProjectAnnouncement) => {
    setEditing(a);
    setTitle(a.title);
    setContent(a.content);
    setType(a.announcement_type);
    setIsPinned(a.is_pinned);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !projectId) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          project_id: projectId,
          title: title.trim(),
          content: content.trim(),
          announcement_type: type,
          is_pinned: isPinned,
        });
        toast({ title: 'Comunicado atualizado!' });
      } else {
        await createMutation.mutateAsync({
          project_id: projectId,
          title: title.trim(),
          content: content.trim(),
          announcement_type: type,
          is_pinned: isPinned,
        });
        toast({ title: 'Comunicado criado!' });
      }
      resetForm();
      setDialogOpen(false);
    } catch {
      toast({ title: 'Erro ao salvar comunicado', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    try {
      await deleteMutation.mutateAsync({ id, projectId });
      toast({ title: 'Comunicado removido!' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/admin/empresas`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-primary" />
                Comunicados do Projeto
              </h1>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Comunicado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Comunicado' : 'Novo Comunicado'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do comunicado" />
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Descreva a atualização..." rows={5} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                  <Label>Fixar no topo</Label>
                </div>
                <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim()} className="w-full">
                  {editing ? 'Salvar' : 'Publicar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {announcements && announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => {
              const config = typeConfig[a.announcement_type] || typeConfig.info;
              return (
                <Card key={a.id} className={a.is_pinned ? 'border-primary/30' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <Badge variant="outline" className={config.color}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">
                          {format(new Date(a.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum comunicado ainda. Crie o primeiro!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
