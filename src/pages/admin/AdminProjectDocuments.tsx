import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Loader2,
  ArrowLeft,
  FolderKanban,
  Download,
  Database,
  BookOpen,
  Video,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Database as DatabaseType } from '@/integrations/supabase/types';

type DocumentType = DatabaseType['public']['Enums']['document_type'];

interface Document {
  id: string;
  name: string;
  description: string | null;
  document_type: DocumentType;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface VideoItem {
  id: string;
  name: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  theme: string | null;
  order_index: number | null;
  created_at: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  'technical_docs': 'Documentação Técnica',
  'data_modeling': 'Modelagem de Dados',
  'user_manuals': 'Manuais de Uso'
};

export default function AdminProjectDocuments() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [docFormData, setDocFormData] = useState({
    name: '',
    description: '',
    document_type: 'technical_docs' as DocumentType,
    is_public: false
  });

  const [videoFormData, setVideoFormData] = useState({
    name: '',
    description: '',
    theme: '',
    order_index: 0,
    is_public: false
  });
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

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
    enabled: !!projectId
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!projectId
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['project-videos', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');
      
      if (error) throw error;
      return data as VideoItem[];
    },
    enabled: !!projectId
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (data: { file: File; formData: typeof docFormData }) => {
      setUploading(true);
      
      // Upload file to storage - sanitize filename for Supabase Storage
      const fileExt = data.file.name.split('.').pop();
      const sanitizedName = data.file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.\-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${projectId}/${Date.now()}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, data.file);
      
      if (uploadError) throw uploadError;
      
      // Create document record
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: data.formData.name || data.file.name,
          description: data.formData.description || null,
          document_type: data.formData.document_type,
          file_path: fileName,
          file_size: data.file.size,
          uploaded_by: user?.id,
          is_public: data.formData.is_public
        });

      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast.success('Documento enviado com sucesso!');
      handleDocClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar documento: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: Document) => {
      // Delete from storage
      await supabase.storage.from('documents').remove([doc.file_path]);
      
      // Delete record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast.success('Documento removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover documento: ' + error.message);
    }
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async (data: { file: File; formData: typeof videoFormData }) => {
      setUploading(true);
      
      // Sanitize filename
      const sanitizedName = data.file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.\-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${projectId}/${Date.now()}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, data.file, { cacheControl: '3600' });
      
      if (uploadError) throw uploadError;
      
      const { error } = await supabase
        .from('videos')
        .insert({
          project_id: projectId,
          name: data.formData.name || data.file.name.replace(/\.[^/.]+$/, ''),
          description: data.formData.description || null,
          video_url: fileName,
          theme: data.formData.theme || null,
          order_index: data.formData.order_index,
          content_type: 'video',
          uploaded_by: user?.id,
          is_public: data.formData.is_public
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-videos', projectId] });
      toast.success('Vídeo enviado com sucesso!');
      handleVideoClose();
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar vídeo: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (video: VideoItem) => {
      // Delete file from storage
      await supabase.storage.from('videos').remove([video.video_url]);
      
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-videos', projectId] });
      toast.success('Vídeo removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover vídeo: ' + error.message);
    }
  });

  const handleDocClose = () => {
    setIsDocOpen(false);
    setSelectedFile(null);
    setDocFormData({ name: '', description: '', document_type: 'technical_docs', is_public: false });
  };

  const handleVideoClose = () => {
    setIsVideoOpen(false);
    setSelectedVideoFile(null);
    setVideoFormData({ name: '', description: '', theme: '', order_index: 0, is_public: false });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docFormData.name) {
        setDocFormData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }
    uploadDocMutation.mutate({ file: selectedFile, formData: docFormData });
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Selecione um arquivo de vídeo');
        return;
      }
      setSelectedVideoFile(file);
      if (!videoFormData.name) {
        setVideoFormData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoFile) {
      toast.error('Selecione um arquivo de vídeo');
      return;
    }
    uploadVideoMutation.mutate({ file: selectedVideoFile, formData: videoFormData });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
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
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Conteúdo</h1>
          </div>
        </div>

        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Vídeos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload de Documento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload de Documento</DialogTitle>
                    <DialogDescription>
                      Selecione um arquivo para enviar ao projeto.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDocSubmit}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Arquivo *</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {selectedFile ? selectedFile.name : 'Selecionar arquivo'}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="docName">Nome do Documento</Label>
                        <Input
                          id="docName"
                          value={docFormData.name}
                          onChange={(e) => setDocFormData({ ...docFormData, name: e.target.value })}
                          placeholder="Nome do documento"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="docType">Tipo</Label>
                        <Select
                          value={docFormData.document_type}
                          onValueChange={(value: DocumentType) => 
                            setDocFormData({ ...docFormData, document_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical_docs">Documentação Técnica</SelectItem>
                            <SelectItem value="data_modeling">Modelagem de Dados</SelectItem>
                            <SelectItem value="user_manuals">Manuais de Uso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="docDescription">Descrição</Label>
                        <Textarea
                          id="docDescription"
                          value={docFormData.description}
                          onChange={(e) => setDocFormData({ ...docFormData, description: e.target.value })}
                          placeholder="Descrição do documento"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="doc-is-public"
                          checked={docFormData.is_public}
                          onCheckedChange={(checked) => setDocFormData({ ...docFormData, is_public: checked === true })}
                        />
                        <Label htmlFor="doc-is-public" className="text-sm font-normal cursor-pointer">
                          Arquivo público (visível para todos os usuários)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleDocClose}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={uploading}>
                        {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enviar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos do Projeto
                </CardTitle>
                <CardDescription>
                  Arquivos disponíveis para os clientes visualizarem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : documents && documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {documentTypeLabels[doc.document_type]}
                            </span>
                          </TableCell>
                          <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                          <TableCell>
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja remover este documento?')) {
                                  deleteDocMutation.mutate(doc);
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
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum documento</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Upload de Documento" para adicionar arquivos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Vídeo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload de Vídeo</DialogTitle>
                    <DialogDescription>
                      Selecione um arquivo de vídeo do seu computador.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleVideoSubmit}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Arquivo de Vídeo *</Label>
                        <input
                          ref={videoFileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => videoFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {selectedVideoFile ? selectedVideoFile.name : 'Selecionar vídeo'}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="videoName">Nome do Vídeo</Label>
                        <Input
                          id="videoName"
                          value={videoFormData.name}
                          onChange={(e) => setVideoFormData({ ...videoFormData, name: e.target.value })}
                          placeholder="Título do vídeo"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="videoTheme">Tema</Label>
                          <Input
                            id="videoTheme"
                            value={videoFormData.theme}
                            onChange={(e) => setVideoFormData({ ...videoFormData, theme: e.target.value })}
                            placeholder="Ex: Introdução"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="videoOrder">Ordem</Label>
                          <Input
                            id="videoOrder"
                            type="number"
                            value={videoFormData.order_index}
                            onChange={(e) => setVideoFormData({ ...videoFormData, order_index: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="videoDescription">Descrição</Label>
                        <Textarea
                          id="videoDescription"
                          value={videoFormData.description}
                          onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                          placeholder="Descrição do vídeo"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="video-is-public"
                          checked={videoFormData.is_public}
                          onCheckedChange={(checked) => setVideoFormData({ ...videoFormData, is_public: checked === true })}
                        />
                        <Label htmlFor="video-is-public" className="text-sm font-normal cursor-pointer">
                          Arquivo público (visível para todos os usuários)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleVideoClose}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={uploading}>
                        {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enviar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vídeos do Projeto
                </CardTitle>
                <CardDescription>
                  Vídeos disponíveis para os clientes assistirem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videosLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : videos && videos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tema</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">{video.name}</TableCell>
                          <TableCell>{video.theme || '—'}</TableCell>
                          <TableCell>{video.order_index}</TableCell>
                          <TableCell>
                            {new Date(video.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja remover este vídeo?')) {
                                  deleteVideoMutation.mutate(video);
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
                    <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum vídeo</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Adicionar Vídeo" para incluir vídeos no projeto.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
