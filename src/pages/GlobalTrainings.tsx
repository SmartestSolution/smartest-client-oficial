import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalTrainings, GlobalTraining } from '@/hooks/useGlobalTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { 
  GraduationCap,
  Play,
  Loader2,
  Clock,
  Tag,
  Download,
  FileText,
  Video as VideoIcon,
  Filter,
  Globe,
  Lock
} from 'lucide-react';
import { formatDuration } from '@/hooks/useTrainings';

function TrainingThumbnail({ training, getSignedUrl }: { 
  training: GlobalTraining; 
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
      <Icon className="h-12 w-12 text-primary/40" />
    </div>
  );
}

function GlobalTrainingCard({ 
  training, 
  onOpen, 
  onDownload,
  getSignedUrl 
}: { 
  training: GlobalTraining; 
  onOpen: (training: GlobalTraining) => void; 
  onDownload: (training: GlobalTraining) => void;
  getSignedUrl: (path: string) => Promise<string | undefined>;
}) {
  const isPdf = training.content_type === 'pdf';
  
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative aspect-video bg-muted cursor-pointer" onClick={() => onOpen(training)}>
        <TrainingThumbnail training={training} getSignedUrl={getSignedUrl} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 rounded-full bg-white/90">
            {isPdf ? <FileText className="h-6 w-6 text-primary" /> : <Play className="h-6 w-6 text-primary fill-primary" />}
          </div>
        </div>
        {training.duration_seconds && !isPdf && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
            {formatDuration(training.duration_seconds)}
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
          isPdf ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'
        }`}>
          {isPdf ? 'PDF' : 'Vídeo'}
        </div>
        {/* Public/Private badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
          training.is_public ? 'bg-green-500/90 text-white' : 'bg-gray-700/90 text-white'
        }`}>
          {training.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {training.is_public ? 'Público' : 'Privado'}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium line-clamp-2">{training.name}</h3>
            {training.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{training.description}</p>
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

export default function GlobalTrainings() {
  const { data: trainings, isLoading } = useGlobalTrainings();
  const [selectedTraining, setSelectedTraining] = useState<{ training: GlobalTraining; url: string } | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<string>('all');

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const handleOpenTraining = async (training: GlobalTraining) => {
    setIsLoadingContent(true);
    const url = await getSignedUrl(training.video_url);
    if (url) {
      if (training.content_type === 'pdf') {
        window.open(url, '_blank');
      } else {
        setSelectedTraining({ training, url });
      }
    }
    setIsLoadingContent(false);
  };

  const handleDownload = async (training: GlobalTraining) => {
    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .download(training.video_url);
      
      if (error || !data) {
        const url = await getSignedUrl(training.video_url);
        if (url) window.open(url, '_blank');
        return;
      }

      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = training.video_url.split('.').pop() || '';
      link.download = `${training.name}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const url = await getSignedUrl(training.video_url);
      if (url) window.open(url, '_blank');
    }
  };

  const filteredTrainings = trainings?.filter(training => {
    if (contentFilter === 'all') return true;
    return training.content_type === contentFilter;
  }) || [];

  const trainingsByTheme = filteredTrainings.reduce((acc, training) => {
    const theme = training.theme || 'Sem tema';
    if (!acc[theme]) acc[theme] = [];
    acc[theme].push(training);
    return acc;
  }, {} as Record<string, GlobalTraining[]>);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const videoCount = trainings?.filter(t => t.content_type === 'video').length || 0;
  const pdfCount = trainings?.filter(t => t.content_type === 'pdf').length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Treinamentos</h1>
            <p className="text-muted-foreground mt-1">
              Todos os materiais de treinamento disponíveis para você
            </p>
          </div>
          
          {trainings && trainings.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <ToggleGroup 
                type="single" 
                value={contentFilter} 
                onValueChange={(value) => value && setContentFilter(value)}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem value="all" className="text-xs px-3">
                  Todos ({trainings?.length || 0})
                </ToggleGroupItem>
                <ToggleGroupItem value="video" className="text-xs px-3">
                  <VideoIcon className="h-3 w-3 mr-1" />
                  Vídeos ({videoCount})
                </ToggleGroupItem>
                <ToggleGroupItem value="pdf" className="text-xs px-3">
                  <FileText className="h-3 w-3 mr-1" />
                  PDFs ({pdfCount})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
        </div>

        {filteredTrainings.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(trainingsByTheme).map(([theme, themeTrainings]) => (
              <div key={theme}>
                <h2 className="text-lg font-semibold mb-4">{theme}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {themeTrainings.map((training) => (
                    <GlobalTrainingCard 
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
                Nenhum treinamento disponível
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Não há materiais de treinamento disponíveis no momento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoadingContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.training.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedTraining && (
              <video src={selectedTraining.url} controls autoPlay className="w-full h-full">
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
