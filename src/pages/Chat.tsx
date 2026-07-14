import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useConversations, useMessages, useSendMessage, useCreateConversation } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { MessageCircle, Send, Loader2, Plus, Users, Paperclip, FileText, Image as ImageIcon, Video as VideoIcon, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const { data: projects } = useProjects();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { data: messages, isLoading: messagesLoading } = useMessages(selectedConversationId);
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const [messageText, setMessageText] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!messageText.trim() && !pendingFile) || !selectedConversationId || !user) return;
    let attachment = null;
    if (pendingFile) {
      try {
        setUploading(true);
        const ext = pendingFile.name.split('.').pop() || 'bin';
        const path = `${user.id}/${selectedConversationId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('chat-attachments').upload(path, pendingFile);
        if (upErr) throw upErr;
        attachment = {
          url: path,
          name: pendingFile.name,
          type: pendingFile.type || 'application/octet-stream',
          size: pendingFile.size,
        };
      } catch (e: any) {
        toast.error('Erro ao enviar arquivo: ' + e.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    sendMessage.mutate({
      conversationId: selectedConversationId,
      content: messageText.trim() || (pendingFile ? `📎 ${pendingFile.name}` : ''),
      senderId: user.id,
      attachment,
    });
    setMessageText('');
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartVideoCall = () => {
    if (!selectedConversationId || !user) return;
    const room = `smartest-${selectedConversationId.replace(/-/g, '').slice(0, 12)}-${Date.now().toString(36)}`;
    const url = `https://meet.jit.si/${room}`;
    sendMessage.mutate({
      conversationId: selectedConversationId,
      content: `📹 Videochamada iniciada — entre pela sala: ${url}`,
      senderId: user.id,
    });
    window.open(url, '_blank', 'noopener');
    toast.success('Sala de vídeo criada e link enviado no chat');
  };

  const handleAttachmentDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 60);
    if (error || !data) { toast.error('Erro ao baixar'); return; }
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const getSignedUrl = (path: string) => 
    supabase.storage.from('chat-attachments').createSignedUrl(path, 3600).then(r => r.data?.signedUrl || '');

  const handleCreateConversation = async () => {
    if (!user) return;
    try {
      const result = await createConversation.mutateAsync({
        projectId: newProjectId || null,
        clientUserId: user.id,
      });
      setSelectedConversationId(result.id);
      setShowNewDialog(false);
      setNewProjectId('');
      toast.success('Conversa criada!');
    } catch {
      toast.error('Erro ao criar conversa. Verifique se já não existe uma para este projeto.');
    }
  };

  const getInitials = (name?: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const getAvatarUrl = (path?: string | null) => 
    path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null;

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">
        {/* Conversations List */}
        <Card className="w-80 shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat
              </CardTitle>
              {!isAdmin && (
                <Button size="sm" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="px-4 pb-4 space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversationId === c.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={getAvatarUrl(c.profile?.avatar_url) || undefined} className="object-cover" />
                        <AvatarFallback className="text-xs">{getInitials(c.profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {isAdmin ? c.profile?.full_name || 'Cliente' : 'Suporte'}
                          </span>
                          {(c.unread_count ?? 0) > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 text-[10px] rounded-full px-1.5">
                              {c.unread_count}
                            </Badge>
                          )}
                        </div>
                        {c.project?.name && (
                          <span className="text-[10px] text-muted-foreground">{c.project.name}</span>
                        )}
                        {c.last_message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? 'Nenhuma conversa ainda' : 'Inicie uma conversa'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarUrl(selectedConversation.profile?.avatar_url) || undefined} className="object-cover" />
                    <AvatarFallback className="text-xs">{getInitials(selectedConversation.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {isAdmin ? selectedConversation.profile?.full_name || 'Cliente' : 'Suporte Smartest'}
                    </p>
                    {selectedConversation.project?.name && (
                      <p className="text-xs text-muted-foreground truncate">{selectedConversation.project.name}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleStartVideoCall} title="Iniciar videochamada (Jitsi)">
                    <VideoIcon className="h-4 w-4" /> Videochamada
                  </Button>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages?.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-muted rounded-bl-md'
                          }`}>
                            {msg.attachment_url && <ChatAttachment msg={msg} isMe={isMe} onDownload={handleAttachmentDownload} />}
                            {msg.content && !msg.content.startsWith('📎 ') && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content.split(/(https?:\/\/\S+)/g).map((part, i) =>
                                  /^https?:\/\//.test(part) ? (
                                    <a
                                      key={i}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`underline ${isMe ? 'text-primary-foreground' : 'text-primary'}`}
                                    >
                                      {part}
                                    </a>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  )
                                )}
                              </p>
                            )}
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t space-y-2">
                {pendingFile && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{pendingFile.name}</span>
                    <span className="text-xs text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 25 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 25MB)'); return; }
                        setPendingFile(f);
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button onClick={handleSend} disabled={(!messageText.trim() && !pendingFile) || sendMessage.isPending || uploading}>
                    {(sendMessage.isPending || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa ao lado para começar</p>
            </div>
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Projeto (opcional)</label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateConversation} disabled={createConversation.isPending}>
              {createConversation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Iniciar Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ChatAttachment({ msg, isMe, onDownload }: { msg: any; isMe: boolean; onDownload: (path: string, name: string) => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = msg.attachment_type?.startsWith('image/');
  const isVideo = msg.attachment_type?.startsWith('video/');

  useEffect(() => {
    if (isImage || isVideo) {
      supabase.storage.from('chat-attachments').createSignedUrl(msg.attachment_url, 3600)
        .then(r => setSignedUrl(r.data?.signedUrl || null));
    }
  }, [msg.attachment_url, isImage, isVideo]);

  if (isImage && signedUrl) {
    return (
      <button onClick={() => onDownload(msg.attachment_url, msg.attachment_name)} className="block mb-2">
        <img src={signedUrl} alt={msg.attachment_name} className="rounded-lg max-w-full max-h-64 object-cover" />
      </button>
    );
  }
  if (isVideo && signedUrl) {
    return <video src={signedUrl} controls className="rounded-lg max-w-full max-h-64 mb-2" />;
  }
  const Icon = msg.attachment_type?.startsWith('image/') ? ImageIcon : msg.attachment_type?.startsWith('video/') ? VideoIcon : FileText;
  return (
    <button
      onClick={() => onDownload(msg.attachment_url, msg.attachment_name)}
      className={`flex items-center gap-2 p-2 rounded-lg mb-1 w-full text-left ${isMe ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background hover:bg-background/80'}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{msg.attachment_name}</p>
        <p className="text-[10px] opacity-70">{((msg.attachment_size || 0) / 1024).toFixed(0)} KB</p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </button>
  );
}

