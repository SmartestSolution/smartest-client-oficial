import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useDocuments, getDocumentTypeLabel, Document } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, Eye, Loader2, File, Calendar, Plus, Upload, X
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({ doc }: { doc: Document }) {
  const handleView = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .download(doc.file_path);
    
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <File className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{doc.name}</h3>
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {doc.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(doc.created_at), 'dd/MM/yyyy')}
              </span>
              <span>{formatFileSize(doc.file_size)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectDocuments() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: documents, isLoading: docsLoading } = useDocuments(id);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docType, setDocType] = useState<string>('technical_docs');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !docName.trim() || !id) return;
    setIsUploading(true);
    try {
      const sanitizedName = uploadFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${id}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('documents').insert({
        project_id: id,
        name: docName,
        description: docDesc || null,
        document_type: docType as any,
        file_path: filePath,
        file_size: uploadFile.size,
      });
      if (insertError) throw insertError;

      toast.success('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      setShowUpload(false); setUploadFile(null); setDocName(''); setDocDesc(''); setDocType('technical_docs');
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = projectLoading || docsLoading;

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

  const technicalDocs = documents?.filter(d => d.document_type === 'technical_docs') || [];
  const modelingDocs = documents?.filter(d => d.document_type === 'data_modeling') || [];
  const manualDocs = documents?.filter(d => d.document_type === 'user_manuals') || [];

  const renderDocuments = (docs: Document[], type: string) => {
    if (docs.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              Nenhum documento disponível
            </h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Não há {type.toLowerCase()} cadastrados para este projeto.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {docs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
            <p className="text-muted-foreground mt-1">
              Documentação técnica e manuais do projeto {project.name}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Documento
            </Button>
          )}
        </div>

        {/* Upload Form */}
        {isAdmin && showUpload && (
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-lg">Upload de Documento</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Nome do documento" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical_docs">Documentação Técnica</SelectItem>
                        <SelectItem value="data_modeling">Modelagem de Dados</SelectItem>
                        <SelectItem value="user_manuals">Manuais de Uso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={docDesc} onChange={e => setDocDesc(e.target.value)} rows={2} placeholder="Descrição opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo *</Label>
                  {uploadFile ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <File className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{uploadFile.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploadFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed rounded-lg p-3">
                      <Upload className="h-5 w-5" /><span>Clique para selecionar o arquivo</span>
                      <input type="file" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isUploading || !uploadFile || !docName.trim()}>
                    {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Documents Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({documents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="technical">
              Documentação Técnica ({technicalDocs.length})
            </TabsTrigger>
            <TabsTrigger value="modeling">
              Modelagem ({modelingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="manuals">
              Manuais ({manualDocs.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="all">
              {documents && documents.length > 0 ? (
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">
                      Nenhum documento disponível
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Não há documentos cadastrados para este projeto.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="technical">
              {renderDocuments(technicalDocs, 'Documentação Técnica')}
            </TabsContent>

            <TabsContent value="modeling">
              {renderDocuments(modelingDocs, 'Modelagem de Dados')}
            </TabsContent>

            <TabsContent value="manuals">
              {renderDocuments(manualDocs, 'Manuais de Uso')}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
