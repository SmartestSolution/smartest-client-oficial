import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useTrainings, Training, formatDuration } from '@/hooks/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  GraduationCap, Play, Loader2, Clock, Tag, Download, FileText,
  Video as VideoIcon, Filter, Plus, Upload, X
} from 'lucide-react';

// Component for thumbnail with signed URL loading
function TrainingThumbnail({ training, getSignedUrl }: { 
  training: Training; 
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
    return (
      <img 
        src={thumbUrl} 
        alt={training.name}
        className="w-full h-full object-cover"
      />
    );
  }

  // Default icon based on content type
  const Icon = training.content_type === 'pdf' ? FileText : VideoIcon;
  return (
    <div className="w-full h-full flex items-center justify-center bg-primary/5">
      <Icon className="h-12 w-12 text-primary/40" />
    </div>
  );
}

function TrainingCard({ 
  training, 
  onOpen, 
  onDownload,
  getSignedUrl 
}: { 
  training: Training; 
  onOpen: (training: Training) => void; 
  onDownload: (training: Training) => void;
  getSignedUrl: (path: string) => Promise<string | undefined>;
}) {
  const isPdf = training.content_type === 'pdf';
  
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative aspect-video bg-muted cursor-pointer" onClick={() => onOpen(training)}>
        <TrainingThumbnail training={training} getSignedUrl={getSignedUrl} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="p-3 rounded-full bg-white/90">
            {isPdf ? (
              <FileText className="h-6 w-6 text-primary" />
            ) : (
              <Play className="h-6 w-6 text-primary fill-primary" />
            )}
          </div>
        </div>
        {training.duration_seconds && !isPdf && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
            {formatDuration(training.duration_seconds)}
          </div>
        )}
        {/* Content type badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
          isPdf ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'
        }`}>
          {isPdf ? 'PDF' : 'Vídeo'}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium line-clamp-2">{training.name}</h3>
            {training.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {training.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {training.theme && (
                <span className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {training.theme}
                </span>
              )}
              {training.duration_seconds && !isPdf && (
                <span className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(training.duration_seconds)}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(training);
            }}
            title="Baixar"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectTrainings() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: trainings, isLoading: trainingsLoading } = useTrainings(id);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTraining, setSelectedTraining] = useState<{ training: Training; url: string } | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [trainingName, setTrainingName] = useState('');
  const [trainingDesc, setTrainingDesc] = useState('');
  const [trainingTheme, setTrainingTheme] = useState('');
  const [contentType, setContentType] = useState('video');
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !trainingName.trim() || !id) return;
    setIsUploading(true);
    try {
      const sanitizedName = uploadFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${id}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await (supabase as any).from('videos').insert({
        project_id: id,
        name: trainingName,
        description: trainingDesc || null,
        video_url: filePath,
        content_type: contentType,
        theme: trainingTheme || null,
      });
      if (insertError) throw insertError;

      toast.success('Treinamento enviado!');
      queryClient.invalidateQueries({ queryKey: ['trainings', id] });
      setShowUpload(false); setUploadFile(null); setTrainingName(''); setTrainingDesc(''); setTrainingTheme('');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = projectLoading || trainingsLoading;

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const handleOpenTraining = async (training: Training) => {
    setIsLoadingContent(true);
    const url = await getSignedUrl(training.video_url);
    if (url) {
      if (training.content_type === 'pdf') {
        // Open PDF in new tab
        window.open(url, '_blank');
      } else {
        setSelectedTraining({ training, url });
      }
    }
    setIsLoadingContent(false);
  };

  const handleDownload = async (training: Training) => {
    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .download(training.video_url);
      
      if (error || !data) {
        // Fallback to signed URL
        const url = await getSignedUrl(training.video_url);
        if (url) {
          window.open(url, '_blank');
        }
        return;
      }

      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      // Extract file extension from video_url
      const ext = training.video_url.split('.').pop() || '';
      link.download = `${training.name}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback to signed URL in new tab
      const url = await getSignedUrl(training.video_url);
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  // Filter trainings by content type
  const filteredTrainings = trainings?.filter(training => {
    if (contentFilter === 'all') return true;
    return training.content_type === contentFilter;
  }) || [];

  // Group trainings by theme
  const trainingsByTheme = filteredTrainings.reduce((acc, training) => {
    const theme = training.theme || 'Sem tema';
    if (!acc[theme]) {
      acc[theme] = [];
    }
    acc[theme].push(training);
    return acc;
  }, {} as Record<string, Training[]>);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold">Projeto não encontrado</h2>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Count by type
  const videoCount = trainings?.filter(t => t.content_type === 'video').length || 0;
  const pdfCount = trainings?.filter(t => t.content_type === 'pdf').length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Treinamentos</h1>
            <p className="text-muted-foreground mt-1">
              Materiais de treinamento do projeto {project.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Treinamento
              </Button>
            )}
            {trainings && trainings.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <ToggleGroup type="single" value={contentFilter} onValueChange={v => v && setContentFilter(v)} className="bg-muted rounded-lg p-1">
                  <ToggleGroupItem value="all" className="text-xs px-3">Todos ({trainings?.length || 0})</ToggleGroupItem>
                  <ToggleGroupItem value="video" className="text-xs px-3"><VideoIcon className="h-3 w-3 mr-1" />Vídeos ({videoCount})</ToggleGroupItem>
                  <ToggleGroupItem value="pdf" className="text-xs px-3"><FileText className="h-3 w-3 mr-1" />PDFs ({pdfCount})</ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
          </div>
        </div>

        {/* Upload Form */}
        {isAdmin && showUpload && (
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-lg">Upload de Treinamento</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleUploadTraining} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={trainingName} onChange={e => setTrainingName(e.target.value)} placeholder="Nome do treinamento" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Input value={trainingTheme} onChange={e => setTrainingTheme(e.target.value)} placeholder="Ex: Módulo Financeiro" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={trainingDesc} onChange={e => setTrainingDesc(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo *</Label>
                  {uploadFile ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <VideoIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{uploadFile.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploadFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed rounded-lg p-3">
                      <Upload className="h-5 w-5" /><span>Clique para selecionar o arquivo</span>
                      <input type="file" className="hidden" accept={contentType === 'pdf' ? '.pdf' : 'video/*'} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isUploading || !uploadFile || !trainingName.trim()}>
                    {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {filteredTrainings.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(trainingsByTheme).map(([theme, themeTrainings]) => (
              <div key={theme}>
                <h2 className="text-lg font-semibold mb-4">{theme}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {themeTrainings.map((training) => (
                    <TrainingCard 
                      key={training.id} 
                      training={training} 
                      onOpen={handleOpenTraining}
                      onDownload={handleDownload}
                      getSignedUrl={getSignedUrl}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                {contentFilter === 'all' 
                  ? 'Nenhum treinamento disponível'
                  : contentFilter === 'video'
                    ? 'Nenhum vídeo disponível'
                    : 'Nenhum PDF disponível'
                }
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {contentFilter === 'all' 
                  ? 'Não há materiais de treinamento cadastrados para este projeto.'
                  : `Experimente mudar o filtro para ver outros tipos de conteúdo.`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading overlay */}
      {isLoadingContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Video Player Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.training.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedTraining && (
              <video
                src={selectedTraining.url}
                controls
                autoPlay
                className="w-full h-full"
              >
                Seu navegador não suporta reprodução de vídeo.
              </video>
            )}
          </div>
          {selectedTraining?.training.description && (
            <p className="text-sm text-muted-foreground">{selectedTraining.training.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
