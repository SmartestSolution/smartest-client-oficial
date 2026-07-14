import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, Plus, Trash2, Loader2, Pencil, Check, Search, Shield, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ManagedUser = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  role: 'admin' | 'client';
  project_ids: string[];
  created_at: string;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'client';
  projectIds: string[];
};

const emptyForm: FormState = { fullName: '', email: '', password: '', role: 'client', projectIds: [] };

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.users as ManagedUser[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['admin-users-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, clients(name)')
        .order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string; clients: { name: string } | null }>;
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter(u =>
      !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        const { data, error } = await supabase.functions.invoke('admin-manage-users', {
          body: {
            action: 'update',
            userId: editingUser.id,
            fullName: form.fullName,
            password: form.password || undefined,
            role: form.role,
            projectIds: form.role === 'client' ? form.projectIds : [],
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        const { data, error } = await supabase.functions.invoke('admin-manage-users', {
          body: {
            action: 'create',
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            role: form.role,
            projectIds: form.role === 'client' ? form.projectIds : [],
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
      handleClose();
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'delete', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário excluído!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setProjectPopoverOpen(false);
  };

  const handleEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setForm({
      fullName: u.full_name,
      email: u.email,
      password: '',
      role: u.role,
      projectIds: u.project_ids,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error('Informe o nome');
    if (!editingUser) {
      if (!form.email.trim() || !form.password.trim()) return toast.error('Preencha email e senha');
    }
    saveMutation.mutate();
  };

  const toggleProject = (id: string) => {
    setForm(f => ({
      ...f,
      projectIds: f.projectIds.includes(id)
        ? f.projectIds.filter(x => x !== id)
        : [...f.projectIds, id],
    }));
  };

  const projectNameById = (id: string) => projects?.find(p => p.id === id)?.name || id;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os usuários e níveis de acesso do sistema.</p>
          </div>
          <Button onClick={() => { setEditingUser(null); setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Todos os Usuários
            </CardTitle>
            <CardDescription>Admins visualizam todos os projetos. Usuários veem apenas os projetos vinculados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Projetos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.role === 'admin' ? (
                          <Badge className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><UserCircle className="h-3 w-3" /> Usuário</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.role === 'admin' ? (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        ) : u.project_ids.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.project_ids.slice(0, 3).map(pid => (
                              <Badge key={pid} variant="outline" className="text-xs">{projectNameById(pid)}</Badge>
                            ))}
                            {u.project_ids.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{u.project_ids.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Excluir o usuário ${u.full_name || u.email}?`)) {
                              deleteMutation.mutate(u.id);
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
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isOpen} onOpenChange={(v) => (v ? setIsOpen(true) : handleClose())}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Atualize as informações e permissões do usuário.' : 'Preencha os dados para criar um usuário.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail {editingUser ? '' : '*'}</Label>
                  <Input type="email" value={form.email} disabled={!!editingUser}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{editingUser ? 'Nova Senha (opcional)' : 'Senha *'}</Label>
                  <Input type="password" value={form.password}
                    placeholder={editingUser ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Acesso *</Label>
                  <Select value={form.role} onValueChange={(v: 'admin' | 'client') => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — Vê todos os projetos</SelectItem>
                      <SelectItem value="client">Usuário — Vê apenas projetos selecionados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.role === 'client' && (
                  <div className="space-y-2">
                    <Label>Projetos com Acesso</Label>
                    <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {form.projectIds.length === 0
                              ? 'Selecione os projetos'
                              : `${form.projectIds.length} projeto(s) selecionado(s)`}
                          </span>
                          <Search className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popper-anchor-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar projeto..." />
                          <CommandList>
                            <CommandEmpty>Nenhum projeto encontrado</CommandEmpty>
                            <CommandGroup>
                              {projects?.map(p => (
                                <CommandItem key={p.id} onSelect={() => toggleProject(p.id)}>
                                  <Check className={cn('mr-2 h-4 w-4', form.projectIds.includes(p.id) ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex flex-col">
                                    <span>{p.name}</span>
                                    {p.clients?.name && <span className="text-xs text-muted-foreground">{p.clients.name}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.projectIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {form.projectIds.map(pid => (
                          <Badge key={pid} variant="secondary" className="text-xs cursor-pointer"
                            onClick={() => toggleProject(pid)}>
                            {projectNameById(pid)} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
