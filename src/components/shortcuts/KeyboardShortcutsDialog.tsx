import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: 'Abrir busca global' },
  { keys: ['?'], label: 'Mostrar esta lista de atalhos' },
  { keys: ['g', 'd'], label: 'Ir para Dashboard' },
  { keys: ['g', 'a'], label: 'Ir para Agenda Geral' },
  { keys: ['g', 'c'], label: 'Ir para Chat' },
  { keys: ['g', 't'], label: 'Ir para Treinamentos' },
  { keys: ['g', 's'], label: 'Configurações do Perfil' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 text-xs font-mono font-semibold rounded border bg-muted text-muted-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Use os atalhos abaixo para navegar mais rápido pelo sistema.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 mt-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 text-sm">
              <span>{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground">+</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
