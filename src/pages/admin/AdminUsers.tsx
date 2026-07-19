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
  client_id: string | null;
  created_at: string;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'client';
  clientId: string;
  projectIds: string[];
};

const emptyForm: FormState = { fullName: '', email: '', password: '', role: 'client', clientId: '', projectIds: [] };

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
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

  const { data: clients } = useQuery({
    queryKey: ['admin-users-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['admin-users-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id, clients(name)')
        .order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string; client_id: string; clients: { name: string } | null }>;
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter(u => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (companyFilter !== 'all') {
        if (companyFilter === 'none') { if (u.client_id) return false; }
        else if (u.client_id !== companyFilter) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, companyFilter]);

  // Projetos filtrados pela empresa selecionada no formulário
  const formProjects = useMemo(() => {
    if (!projects) return [];
    if (!form.clientId) return [];
    return projects.filter(p => p.client_id === form.clientId);
  }, [projects, form.clientId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName: form.fullName,
        role: form.role,
        clientId: form.role === 'client' ? form.clientId : undefined,
        projectIds: form.role === 'client' ? form.projectIds : [],
      };
      if (editingUser) {
        const { data, error } = await supabase.functions.invoke('admin-manage-users', {
          body: {
            action: 'update',
            userId: editingUser.id,
            password: form.password || undefined,
            ...payload,
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
            ...payload,
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
      clientId: u.client_id || '',
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
    if (form.role === 'client' && !form.clientId) return toast.error('Selecione a empresa');
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
  const clientNameById = (id: string | null) => (id ? clients?.find(c => c.id === id)?.name : null) || null;

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
            <CardDescription>Admins visualizam todos os projetos. Usuários veem apenas os projetos vinculados à sua empresa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  <SelectItem value="none">Sem empresa</SelectItem>
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nível" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Usuário</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>Empresa</TableHead>
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
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : clientNameById(u.client_id) ? (
                          <Badge variant="outline" className="text-xs">{clientNameById(u.client_id)}</Badge>
                        ) : (
                          <span className="text-xs text-destructive">Sem empresa</span>
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
                  <Select value={form.role} onValueChange={(v: 'admin' | 'client') => setForm({ ...form, role: v, clientId: v === 'admin' ? '' : form.clientId, projectIds: v === 'admin' ? [] : form.projectIds })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — Vê todos os projetos</SelectItem>
                      <SelectItem value="client">Usuário — Vê apenas projetos selecionados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.role === 'client' && (
                  <>
                    <div className="space-y-2">
                      <Label>Empresa *</Label>
                      <Select
                        value={form.clientId}
                        onValueChange={(v) => setForm({ ...form, clientId: v, projectIds: [] })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                        <SelectContent>
                          {clients?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {form.clientId && (
                      <div className="space-y-2">
                        <Label>Restringir a projetos específicos (opcional)</Label>
                        <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-full justify-between">
                              {form.projectIds.length === 0
                                ? 'Todos os projetos da empresa'
                                : `${form.projectIds.length} projeto(s) selecionado(s)`}
                              <Check className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar projeto..." />
                              <CommandList>
                                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {formProjects.map(p => (
                                    <CommandItem key={p.id} onSelect={() => toggleProject(p.id)}>
                                      <Check className={cn('mr-2 h-4 w-4', form.projectIds.includes(p.id) ? 'opacity-100' : 'opacity-0')} />
                                      {p.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {form.projectIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {form.projectIds.map(id => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {projectNameById(id)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Deixe vazio para dar acesso a todos os projetos da empresa. Se selecionar projetos, o usuário só verá esses.
                        </p>
                      </div>
                    )}
                  </>
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
