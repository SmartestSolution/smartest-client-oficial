import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Users, 
  Plus, 
  Trash2, 
  Loader2,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientUser {
  id: string;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    company: string | null;
  };
  email?: string;
}

export default function AdminClientUsers() {
  const { clientId } = useParams<{ clientId: string }>();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
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

  const { data: clientUsers, isLoading } = useQuery({
    queryKey: ['client-users', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('client_id', clientId);
      
      if (error) throw error;
      
      // Fetch profiles for each user
      const usersWithProfiles = await Promise.all(
        data.map(async (cu) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company')
            .eq('user_id', cu.user_id)
            .single();
          
          return {
            ...cu,
            profile: profile || undefined
          };
        })
      );
      
      return usersWithProfiles as ClientUser[];
    },
    enabled: !!clientId
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Call edge function to create user
      const { data: result, error } = await supabase.functions.invoke('create-client-user', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          clientId: clientId
        }
      });
      
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-users', clientId] });
      toast.success('Usuário criado com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (clientUserId: string) => {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', clientUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-users', clientId] });
      toast.success('Usuário removido da empresa!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover usuário: ' + error.message);
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ email: '', password: '', fullName: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim() || !formData.fullName.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    createUserMutation.mutate(formData);
  };

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
            <h1 className="text-2xl font-bold text-foreground">Usuários da Empresa</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
                <DialogDescription>
                  Crie um usuário que terá acesso aos projetos desta empresa.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários com Acesso
            </CardTitle>
            <CardDescription>
              Usuários que podem visualizar os projetos desta empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clientUsers && clientUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientUsers.map((cu) => (
                    <TableRow key={cu.id}>
                      <TableCell className="font-medium">
                        {cu.profile?.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>{cu.profile?.company || '—'}</TableCell>
                      <TableCell>
                        {new Date(cu.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja remover este usuário?')) {
                              deleteUserMutation.mutate(cu.id);
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
                <h3 className="text-lg font-medium text-foreground">Nenhum usuário cadastrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Novo Usuário" para adicionar usuários.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
