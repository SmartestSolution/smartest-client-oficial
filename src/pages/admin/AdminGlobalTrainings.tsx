import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, Plus, Trash2, Loader2, Upload, Play, Download,
  FileText, Video as VideoIcon, Filter, Globe
} from 'lucide-react';
import { formatDuration } from '@/hooks/useTrainings';

interface TrainingItem {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number | null;
  theme: string | null;
  content_type: 'video' | 'pdf';
  is_public: boolean;
  created_at: string;
}

function TrainingThumbnail({ training, getSignedUrl }: { 
  training: TrainingItem; 
  getSignedUrl: (path: string) => Promise<string | undefined>;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (training.thumbnail_url) {
      setIsLoading(true);
      getSignedUrl(training.thumbnail_url).then((url) => {
        if (url) setThumbUrl(url);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [training.thumbnail_url, getSignedUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-primary/5">
        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
      </div>
    );
  }

  if (thumbUrl) {
    return <img src={thumbUrl} alt={training.name} className="w-full h-full object-cover" />;
  }

  const Icon = training.content_type === 'pdf' ? FileText : VideoIcon;
  return (
    <div className="w-full h-full flex items-center justify-center bg-primary/5">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
    </div>
  );
}

export default function AdminGlobalTrainings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingItem | null>(null);
  const [contentFilter, setContentFilter] = useState<string>('all');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [contentType, setContentType] = useState<'video' | 'pdf'>('video');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Fetch global trainings (no project_id)
  const { data: trainings, isLoading } = useQuery({
    queryKey: ['admin-global-trainings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .is('project_id', null)
        .order('order_index')
        .order('name');
      if (error) throw error;
      return data as unknown as TrainingItem[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!contentFile) throw new Error('Arquivo obrigatório');

      setIsUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const sanitizedName = contentFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const filePath = `global/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, contentFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      let thumbnailPath: string | null = null;
      if (thumbnailFile) {
        const sanitizedThumbName = thumbnailFile.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        const thumbFileName = `${Date.now()}-thumb-${sanitizedThumbName}`;
        const thumbPath = `global/thumbnails/${thumbFileName}`;
        
        const { error: thumbError } = await supabase.storage
          .from('videos')
          .upload(thumbPath, thumbnailFile, { cacheControl: '3600', upsert: false });

        if (!thumbError) thumbnailPath = thumbPath;
      }

      // Insert without project_id - it's a global training
      const insertData: Record<string, unknown> = {
        name: name || contentFile.name.replace(/\.[^/.]+$/, ''),
        description: description || null,
        video_url: filePath,
        thumbnail_url: thumbnailPath,
        theme: theme || null,
        content_type: contentType,
        duration_seconds: null,
        uploaded_by: user.id,
        order_index: (trainings?.length || 0) + 1,
        is_public: true,
      };

      const { error: insertError } = await supabase
        .from('videos')
        .insert(insertData as any);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['global-trainings'] });
      toast({ title: 'Treinamento global enviado com sucesso!' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar arquivo', description: error.message, variant: 'destructive' });
    },
    onSettled: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (training: TrainingItem) => {
      await supabase.storage.from('videos').remove([training.video_url]);
      if (training.thumbnail_url) {
        await supabase.storage.from('videos').remove([training.thumbnail_url]);
      }
      const { error } = await supabase.from('videos').delete().eq('id', training.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['global-trainings'] });
      toast({ title: 'Treinamento excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setTheme('');
    setContentType('video');
    setContentFile(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setIsDialogOpen(false);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
        return;
      }
      if (file.size > 5242880) {
        toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB para capa.', variant: 'destructive' });
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('videos').createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf';
      
      if (contentType === 'video' && !isVideo) {
        toast({ title: 'Arquivo inválido', description: 'Selecione um vídeo.', variant: 'destructive' });
        return;
      }
      if (contentType === 'pdf' && !isPdf) {
        toast({ title: 'Arquivo inválido', description: 'Selecione um PDF.', variant: 'destructive' });
        return;
      }
      if (file.size > 524288000) {
        toast({ title: 'Arquivo muito grande', description: 'Máximo 500MB.', variant: 'destructive' });
        return;
      }
      setContentFile(file);
      if (!name) setName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleOpenTraining = async (training: TrainingItem) => {
    const url = await getSignedUrl(training.video_url);
    if (url) {
      if (training.content_type === 'pdf') {
        window.open(url, '_blank');
      } else {
        setSelectedTraining({ ...training, video_url: url });
      }
    }
  };

  const handleDownload = async (training: TrainingItem) => {
    const url = await getSignedUrl(training.video_url);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = training.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const filteredTrainings = trainings?.filter(t => {
    if (contentFilter === 'all') return true;
    return t.content_type === contentFilter;
  }) || [];

  const videoCount = trainings?.filter(t => t.content_type === 'video').length || 0;
  const pdfCount = trainings?.filter(t => t.content_type === 'pdf').length || 0;

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
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="h-6 w-6" />
              Treinamentos Globais
            </h1>
            <p className="text-muted-foreground">
              Materiais de treinamento públicos visíveis para todos os usuários
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Treinamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Treinamento Global</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo de Conteúdo *</Label>
                  <Select 
                    value={contentType} 
                    onValueChange={(value: 'video' | 'pdf') => {
                      setContentType(value);
                      setContentFile(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <VideoIcon className="h-4 w-4" />
                          Vídeo
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{contentType === 'video' ? 'Arquivo de Vídeo' : 'Arquivo PDF'} *</Label>
                  <Input
                    type="file"
                    accept={contentType === 'video' ? 'video/*' : 'application/pdf'}
                    onChange={handleFileChange}
                  />
                  {contentFile && (
                    <p className="text-sm text-muted-foreground">
                      {contentFile.name} ({formatFileSize(contentFile.size)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Capa (opcional)</Label>
                  <Input type="file" accept="image/*" onChange={handleThumbnailChange} />
                  {thumbnailPreview && (
                    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                      <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do treinamento" />
                </div>
                <div className="space-y-2">
                  <Label>Tema/Categoria</Label>
                  <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex: Treinamento, Tutorial" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição..." rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={() => uploadMutation.mutate()} disabled={!contentFile || isUploading}>
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Enviar</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {trainings && trainings.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <ToggleGroup type="single" value={contentFilter} onValueChange={(v) => v && setContentFilter(v)} className="bg-muted rounded-lg p-1">
              <ToggleGroupItem value="all" className="text-xs px-3">Todos ({trainings?.length || 0})</ToggleGroupItem>
              <ToggleGroupItem value="video" className="text-xs px-3"><VideoIcon className="h-3 w-3 mr-1" />Vídeos ({videoCount})</ToggleGroupItem>
              <ToggleGroupItem value="pdf" className="text-xs px-3"><FileText className="h-3 w-3 mr-1" />PDFs ({pdfCount})</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        {filteredTrainings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTrainings.map((training) => (
              <Card key={training.id} className="overflow-hidden group">
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  <TrainingThumbnail training={training} getSignedUrl={getSignedUrl} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => handleOpenTraining(training)}>
                      {training.content_type === 'pdf' ? <FileText className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="secondary" onClick={() => handleDownload(training)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                    training.content_type === 'pdf' ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'
                  }`}>
                    {training.content_type === 'pdf' ? 'PDF' : 'Vídeo'}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{training.name}</h3>
                      {training.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{training.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {training.theme && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{training.theme}</span>
                        )}
                        {training.duration_seconds && training.content_type === 'video' && (
                          <span>{formatDuration(training.duration_seconds)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este treinamento?')) {
                          deleteMutation.mutate(training);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Nenhum treinamento global cadastrado</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Faça upload de materiais de treinamento públicos para todos os usuários.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedTraining && (
              <video src={selectedTraining.video_url} controls autoPlay className="w-full h-full">
                Seu navegador não suporta reprodução de vídeo.
              </video>
            )}
          </div>
          {selectedTraining?.description && (
            <p className="text-sm text-muted-foreground">{selectedTraining.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
