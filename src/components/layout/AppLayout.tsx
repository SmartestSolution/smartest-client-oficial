import { ReactNode, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import { KeyboardShortcutsDialog } from '@/components/shortcuts/KeyboardShortcutsDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onOpenHelp: () => setHelpOpen(true),
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader onOpenSearch={() => setSearchOpen(true)} onOpenHelp={() => setHelpOpen(true)} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </SidebarProvider>
  );
}
