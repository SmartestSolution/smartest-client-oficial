import { useState, useRef } from 'react';
import { useProjectStageItems, useCreateStageItem, useUpdateStageItem, useDeleteStageItem, type StageItemType, type StageItemPriority } from '@/hooks/useProjectStageItems';
import { useEvolutionStageItems, useCreateEvolutionStageItem, useUpdateEvolutionStageItem, useDeleteEvolutionStageItem } from '@/hooks/useEvolutionStageItems';
import { useAdminUsers } from '@/hooks/useSupportTickets';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Upload, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_OPTIONS: { value: StageItemType; label: string }[] = [
  { value: 'task', label: 'Tarefa' },
  { value: 'development', label: 'Desenvolvimento' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'review', label: 'Revisão' },
  { value: 'other', label: 'Outro' },
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map(t => [t.value, t.label])) as Record<string, string>;

const PRIORITY_OPTIONS: { value: StageItemPriority; label: string; cls: string }[] = [
  { value: 'low',    label: '🟢 Baixa',  cls: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: '🟡 Média',  cls: 'bg-warning/10 text-warning' },
  { value: 'high',   label: '🟠 Alta',   cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
];

interface StageChecklistProps {
  stageId: string;
  projectId: string;
  isAdmin: boolean;
  source?: 'project' | 'evolution';
}

export function StageChecklist({ stageId, projectId, isAdmin, source = 'project' }: StageChecklistProps) {
  const isEvolution = source === 'evolution';
  const tableName = isEvolution ? 'evolution_stage_items' : 'project_stage_items';
  const stageFkColumn = isEvolution ? 'evolution_stage_id' : 'stage_id';

  const projectItems = useProjectStageItems(isEvolution ? undefined : stageId);
  const evolutionItems = useEvolutionStageItems(isEvolution ? stageId : undefined);
  const items = isEvolution ? evolutionItems.data : projectItems.data;
  const isLoading = isEvolution ? evolutionItems.isLoading : projectItems.isLoading;

  const createProject = useCreateStageItem();
  const createEvolution = useCreateEvolutionStageItem();
  const updateProject = useUpdateStageItem();
  const updateEvolution = useUpdateEvolutionStageItem();
  const deleteProject = useDeleteStageItem();
  const deleteEvolution = useDeleteEvolutionStageItem();

  const createItem = {
    mutate: (input: any, opts?: any) => {
      if (isEvolution) {
        const { stage_id, ...rest } = input;
        createEvolution.mutate({ ...rest, evolution_stage_id: stage_id }, opts);
      } else {
        createProject.mutate(input, opts);
      }
    },
    isPending: isEvolution ? createEvolution.isPending : createProject.isPending,
  };
  const updateItem = {
    mutate: (input: any, opts?: any) => isEvolution ? updateEvolution.mutate(input, opts) : updateProject.mutate(input, opts),
  };
  const deleteItem = {
    mutate: (id: string, opts?: any) => isEvolution ? deleteEvolution.mutate(id, opts) : deleteProject.mutate(id, opts),
  };

  const { data: admins } = useAdminUsers();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<StageItemType>('task');
  const [newItemPriority, setNewItemPriority] = useState<StageItemPriority>('medium');
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;
    createItem.mutate(
      {
        stage_id: stageId,
        title: newItemTitle.trim(),
        item_type: newItemType,
        priority: newItemPriority,
        order_index: items?.length || 0,
      },
      {
        onSuccess: () => {
          setNewItemTitle('');
          setNewItemType('task');
          setNewItemPriority('medium');
          toast.success('Item adicionado!');
        },
        onError: (err: Error) => toast.error('Erro: ' + err.message),
      }
    );
  };

  const handleToggle = (itemId: string, currentState: boolean) => {
    updateItem.mutate({
      id: itemId,
      updates: {
        is_completed: !currentState,
        completed_at: !currentState ? new Date().toISOString() : null,
        status: !currentState ? 'done' : 'todo',
      } as any,
    });
  };

  const handleDelete = (itemId: string) => {
    deleteItem.mutate(itemId, {
      onSuccess: () => toast.success('Item removido!'),
      onError: (err: Error) => toast.error('Erro: ' + err.message),
    });
  };

  const handleUploadClick = (itemId: string) => {
    setActiveItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItemId) return;

    setUploadingItemId(activeItemId);
    try {
      const filePath = `${projectId}/stage-items/${activeItemId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          document_type: 'technical_docs',
        })
        .select('id')
        .single();
      if (docError) throw docError;

      // Link document to checklist item
      const { error: linkError } = await (supabase as any)
        .from(tableName)
        .update({ document_id: doc.id })
        .eq('id', activeItemId);
      if (linkError) throw linkError;

      toast.success('Documento anexado!');
      // Refresh items
      updateItem.mutate({ id: activeItemId, updates: {} });
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally {
      setUploadingItemId(null);
      setActiveItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Erro ao baixar: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const completedCount = items?.filter(i => i.is_completed).length || 0;
  const totalCount = items?.length || 0;

  return (
    <div className="border-t pt-4 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Checklist</h4>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} concluídos
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-2">
        {items?.map((item) => (
          <div key={item.id} className="group">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={item.is_completed}
                onCheckedChange={() => handleToggle(item.id, item.is_completed)}
                disabled={!isAdmin}
              />
              <span className={cn(
                'text-sm flex-1',
                item.is_completed && 'line-through text-muted-foreground'
              )}>
                {item.title}
              </span>
              {isAdmin ? (
                <>
                  <Select
                    value={item.item_type || 'task'}
                    onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { item_type: v as StageItemType } as any })}
                  >
                    <SelectTrigger className="h-6 w-[130px] text-[11px] px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={item.priority || 'medium'}
                    onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { priority: v as StageItemPriority } as any })}
                  >
                    <SelectTrigger className="h-6 w-[100px] text-[11px] px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {TYPE_LABEL[item.item_type] || 'Tarefa'}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', PRIORITY_OPTIONS.find(p => p.value === item.priority)?.cls)}>
                    {PRIORITY_OPTIONS.find(p => p.value === item.priority)?.label.replace(/^.+ /, '') || 'Média'}
                  </Badge>
                </>
              )}
              {item.completed_at && (
                <span className="text-xs text-muted-foreground hidden group-hover:inline">
                  ✓ {format(new Date(item.completed_at), 'dd/MM', { locale: ptBR })}
                </span>
              )}
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleUploadClick(item.id)}
                    disabled={uploadingItemId === item.id}
                  >
                    {uploadingItemId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
            {/* Optional dates (admin) */}
            {isAdmin ? (
              <div className="ml-9 mt-1 flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Início:</label>
                <input
                  type="date"
                  value={item.start_date || ''}
                  onChange={(e) => updateItem.mutate({ id: item.id, updates: { start_date: e.target.value || null } as any })}
                  className="bg-transparent border rounded px-1.5 py-0.5 text-xs"
                />
                <label className="text-muted-foreground">Prazo:</label>
                <input
                  type="date"
                  value={item.end_date || ''}
                  onChange={(e) => updateItem.mutate({ id: item.id, updates: { end_date: e.target.value || null } as any })}
                  className="bg-transparent border rounded px-1.5 py-0.5 text-xs"
                />
                {item.completed_at && (
                  <span className="text-success">✓ {format(new Date(item.completed_at), 'dd/MM/yy', { locale: ptBR })}</span>
                )}
                <label className="text-muted-foreground ml-2">Responsável:</label>
                <Select
                  value={item.assignee_id || 'none'}
                  onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { assignee_id: v === 'none' ? null : v } as any })}
                >
                  <SelectTrigger className="h-6 w-[150px] text-[11px] px-2">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Sem responsável</SelectItem>
                    {admins?.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id} className="text-xs">{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              (item.start_date || item.end_date || item.assignee_id) && (
                <div className="ml-9 mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {item.start_date && <span>Início: {format(new Date(item.start_date + 'T00:00:00'), 'dd/MM/yy')}</span>}
                  {item.end_date && <span>Prazo: {format(new Date(item.end_date + 'T00:00:00'), 'dd/MM/yy')}</span>}
                  {item.completed_at && <span className="text-success">Concluído: {format(new Date(item.completed_at), 'dd/MM/yy')}</span>}
                  {item.assignee_id && (
                    <span>Resp.: {admins?.find(a => a.user_id === item.assignee_id)?.full_name || '—'}</span>
                  )}
                </div>
              )
            )}
            {/* Show linked document */}
            {item.document_id && item.document && (
              <div className="ml-9 mt-1 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                <FileText className="h-3 w-3 text-primary" />
                <span className="truncate flex-1">{item.document.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleDownload(item.document!.file_path, item.document!.name)}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="h-8 text-sm flex-1"
          />
          <Select value={newItemType} onValueChange={(v) => setNewItemType(v as StageItemType)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newItemPriority} onValueChange={(v) => setNewItemPriority(v as StageItemPriority)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            disabled={!newItemTitle.trim() || createItem.isPending}
            className="h-8"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {totalCount === 0 && !isAdmin && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhum item registrado nesta etapa.
        </p>
      )}
    </div>
  );
}
