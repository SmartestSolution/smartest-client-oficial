import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FolderKanban, FileText, LifeBuoy, MessageCircle, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Result =
  | { type: 'project'; id: string; title: string; subtitle?: string }
  | { type: 'document'; id: string; projectId: string; title: string; subtitle?: string }
  | { type: 'ticket'; id: string; title: string; subtitle?: string; projectId?: string | null }
  | { type: 'message'; id: string; conversationId: string; title: string; subtitle?: string };

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const debounced = useDebounced(query, 250);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!debounced.trim() || !user) {
      setResults([]);
      return;
    }
    const q = debounced.trim();
    const like = `%${q}%`;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [projRes, docRes, ticketRes, msgRes] = await Promise.all([
          supabase.from('projects').select('id, name, description').ilike('name', like).limit(6),
          supabase.from('documents').select('id, name, description, project_id').or(`name.ilike.${like},description.ilike.${like}`).limit(6),
          supabase.from('support_tickets').select('id, subject, message, project_id').or(`subject.ilike.${like},message.ilike.${like}`).limit(6),
          supabase.from('chat_messages').select('id, content, conversation_id').ilike('content', like).limit(6),
        ]);

        if (cancelled) return;

        const out: Result[] = [];
        (projRes.data || []).forEach((p: any) =>
          out.push({ type: 'project', id: p.id, title: p.name, subtitle: p.description || undefined })
        );
        (docRes.data || []).forEach((d: any) =>
          out.push({ type: 'document', id: d.id, projectId: d.project_id, title: d.name, subtitle: d.description || undefined })
        );
        (ticketRes.data || []).forEach((t: any) =>
          out.push({ type: 'ticket', id: t.id, title: t.subject, subtitle: t.message || undefined, projectId: t.project_id })
        );
        (msgRes.data || []).forEach((m: any) =>
          out.push({ type: 'message', id: m.id, conversationId: m.conversation_id, title: m.content?.slice(0, 80) || 'Mensagem' })
        );

        setResults(out);
      } catch (e) {
        console.error('search error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debounced, user]);

  const grouped = useMemo(() => {
    return {
      projects: results.filter((r) => r.type === 'project') as Extract<Result, { type: 'project' }>[],
      documents: results.filter((r) => r.type === 'document') as Extract<Result, { type: 'document' }>[],
      tickets: results.filter((r) => r.type === 'ticket') as Extract<Result, { type: 'ticket' }>[],
      messages: results.filter((r) => r.type === 'message') as Extract<Result, { type: 'message' }>[],
    };
  }, [results]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar projetos, documentos, tickets, mensagens..." value={query} onValueChange={setQuery} />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <CommandEmpty>Nenhum resultado para "{query}".</CommandEmpty>
        )}
        {!query && !loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            Digite para buscar em projetos, documentos, tickets e mensagens.
          </div>
        )}

        {grouped.projects.length > 0 && (
          <CommandGroup heading="Projetos">
            {grouped.projects.map((r) => (
              <CommandItem key={`p-${r.id}`} value={`projeto-${r.id}-${r.title}`} onSelect={() => go(`/projeto/${r.id}`)}>
                <FolderKanban className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span>{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground truncate max-w-[400px]">{r.subtitle}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {grouped.documents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documentos">
              {grouped.documents.map((r) => (
                <CommandItem key={`d-${r.id}`} value={`doc-${r.id}-${r.title}`} onSelect={() => go(`/projeto/${r.projectId}/documentos`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>{r.title}</span>
                    {r.subtitle && <span className="text-xs text-muted-foreground truncate max-w-[400px]">{r.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {grouped.tickets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Suporte (SAC)">
              {grouped.tickets.map((r) => (
                <CommandItem
                  key={`t-${r.id}`}
                  value={`tic-${r.id}-${r.title}`}
                  onSelect={() => go(r.projectId ? `/projeto/${r.projectId}/suporte` : `/dashboard`)}
                >
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>{r.title}</span>
                    {r.subtitle && <span className="text-xs text-muted-foreground truncate max-w-[400px]">{r.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {grouped.messages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Mensagens do chat">
              {grouped.messages.map((r) => (
                <CommandItem key={`m-${r.id}`} value={`msg-${r.id}-${r.title}`} onSelect={() => go('/chat')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  <span className="truncate max-w-[460px]">{r.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
