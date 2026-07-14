import { useState, useRef } from 'react';
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
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Users,
  FolderKanban,
  Upload,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  logo_url: string | null;
  sidebar_color: string | null;
  created_at: string;
  sla_high_hours?: number | null;
  sla_medium_hours?: number | null;
  sla_low_hours?: number | null;
}

const PRESET_COLORS = [
  { name: 'Azul Escuro', value: '#1A1F2C' },
  { name: 'Azul Primário', value: '#1565C0' },
  { name: 'Verde Floresta', value: '#1B5E20' },
  { name: 'Roxo', value: '#4A148C' },
  { name: 'Vermelho Escuro', value: '#B71C1C' },
  { name: 'Laranja', value: '#E65100' },
  { name: 'Cinza', value: '#37474F' },
  { name: 'Preto', value: '#121212' },
];

export default function AdminClients() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cnpj: '',
    sidebar_color: '#1A1F2C',
    sla_high_hours: 4,
    sla_medium_hours: 12,
    sla_low_hours: 24,
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem.');
        return;
      }
      if (file.size > 2097152) { // 2MB max
        toast.error('A logo deve ter no máximo 2MB.');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (clientId: string): Promise<string | null> => {
    if (!logoFile) return null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${clientId}/logo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(fileName, logoFile, { upsert: true });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return null;
    }

    return fileName;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First create the client
      const { data: newClient, error } = await (supabase as any)
        .from('clients')
        .insert({
          name: data.name,
          phone: data.phone || null,
          cnpj: data.cnpj || null,
          sidebar_color: data.sidebar_color,
          sla_high_hours: data.sla_high_hours,
          sla_medium_hours: data.sla_medium_hours,
          sla_low_hours: data.sla_low_hours,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Then upload logo if provided
      if (logoFile && newClient) {
        const logoPath = await uploadLogo(newClient.id);
        if (logoPath) {
          await supabase
            .from('clients')
            .update({ logo_url: logoPath })
            .eq('id', newClient.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      toast.success('Empresa cadastrada com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao cadastrar empresa: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      // Upload new logo if provided
      let logoPath = editingClient?.logo_url;
      if (logoFile) {
        const newLogoPath = await uploadLogo(id);
        if (newLogoPath) logoPath = newLogoPath;
      }

      const { error } = await (supabase as any)
        .from('clients')
        .update({
          name: data.name,
          phone: data.phone || null,
          cnpj: data.cnpj || null,
          sidebar_color: data.sidebar_color,
          logo_url: logoPath,
          sla_high_hours: data.sla_high_hours,
          sla_medium_hours: data.sla_medium_hours,
          sla_low_hours: data.sla_low_hours,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      toast.success('Empresa atualizada com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar empresa: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      toast.success('Empresa removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover empresa: ' + error.message);
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditingClient(null);
    setLogoFile(null);
    setLogoPreview(null);
    setFormData({ name: '', phone: '', cnpj: '', sidebar_color: '#1A1F2C', sla_high_hours: 4, sla_medium_hours: 12, sla_low_hours: 24 });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      cnpj: client.cnpj || '',
      sidebar_color: client.sidebar_color || '#1A1F2C',
      sla_high_hours: client.sla_high_hours ?? 4,
      sla_medium_hours: client.sla_medium_hours ?? 12,
      sla_low_hours: client.sla_low_hours ?? 24,
    });
    // Set logo preview from existing logo
    if (client.logo_url) {
      const { data } = supabase.storage.from('client-assets').getPublicUrl(client.logo_url);
      setLogoPreview(data.publicUrl);
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const getClientLogoUrl = (logoUrl: string | null) => {
    if (!logoUrl) return null;
    return supabase.storage.from('client-assets').getPublicUrl(logoUrl).data.publicUrl;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as empresas cadastradas no sistema.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingClient(null); setFormData({ name: '', phone: '', cnpj: '', sidebar_color: '#1A1F2C', sla_high_hours: 4, sla_medium_hours: 12, sla_low_hours: 24 }); setLogoFile(null); setLogoPreview(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Editar Empresa' : 'Nova Empresa'}
                </DialogTitle>
                <DialogDescription>
                  {editingClient 
                    ? 'Atualize os dados da empresa.'
                    : 'Preencha os dados para cadastrar uma nova empresa.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Logo da Empresa</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Escolher Logo
                        </Button>
                        {logoPreview && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 text-destructive"
                            onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          A logo será exibida para os usuários clientes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Color */}
                  <div className="space-y-2">
                    <Label>Cor da Barra Lateral</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-full h-10 rounded-md border-2 transition-all ${
                            formData.sidebar_color === color.value 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-transparent hover:border-muted-foreground/50'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, sidebar_color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Label htmlFor="custom-color" className="text-xs">Cor customizada:</Label>
                      <Input
                        id="custom-color"
                        type="color"
                        value={formData.sidebar_color}
                        onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
                        className="w-12 h-8 p-0 border-none cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">{formData.sidebar_color}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / Celular</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  {/* SLA de Suporte */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label>SLA de Suporte (em horas)</Label>
                    <p className="text-xs text-muted-foreground">
                      Tempo máximo para resolução por prioridade. Tickets "críticos" usam o SLA de prioridade alta.
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <Label htmlFor="sla_high" className="text-xs">Alta</Label>
                        <Input id="sla_high" type="number" min={1} value={formData.sla_high_hours}
                          onChange={(e) => setFormData({ ...formData, sla_high_hours: Number(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label htmlFor="sla_med" className="text-xs">Média</Label>
                        <Input id="sla_med" type="number" min={1} value={formData.sla_medium_hours}
                          onChange={(e) => setFormData({ ...formData, sla_medium_hours: Number(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label htmlFor="sla_low" className="text-xs">Baixa</Label>
                        <Input id="sla_low" type="number" min={1} value={formData.sla_low_hours}
                          onChange={(e) => setFormData({ ...formData, sla_low_hours: Number(e.target.value) || 0 })} />
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
                    {editingClient ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas Cadastradas
            </CardTitle>
            <CardDescription>
              Lista de todas as empresas com acesso ao sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clients && clients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {client.logo_url ? (
                            <img 
                              src={getClientLogoUrl(client.logo_url) || ''} 
                              alt={client.name} 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.cnpj || '—'}</TableCell>
                      <TableCell>{client.phone || '—'}</TableCell>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: client.sidebar_color || '#1A1F2C' }}
                          title={client.sidebar_color || '#1A1F2C'}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/empresas/${client.id}/usuarios`}>
                              <Users className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/empresas/${client.id}/projetos`}>
                              <FolderKanban className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja remover esta empresa?')) {
                                deleteMutation.mutate(client.id);
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
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Nenhuma empresa cadastrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Nova Empresa" para começar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
