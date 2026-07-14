import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, Search, Keyboard, PlayCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationBell } from './NotificationBell';
import { supabase } from '@/integrations/supabase/client';
import { resetOnboarding, startOnboardingTour } from '@/hooks/useOnboardingTour';

interface AppHeaderProps {
  onOpenSearch?: () => void;
  onOpenHelp?: () => void;
}

export function AppHeader({ onOpenSearch, onOpenHelp }: AppHeaderProps) {
  const { profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar public URL
  const avatarUrl = profile?.avatar_url 
    ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  return (
    <header className="sticky top-0 z-10 h-16 border-b bg-card flex items-center px-4 gap-4">
      <SidebarTrigger />
      
      <Breadcrumbs />
      
      <div className="flex-1" />

      {/* Global search trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOpenSearch?.()}
        data-tour="search"
        className="hidden md:inline-flex items-center gap-2 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="ml-2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => onOpenSearch?.()}
        data-tour="search"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </Button>

      <div data-tour="notifications">
        <NotificationBell />
      </div>

      {/* Role Badge */}
      <div className="hidden sm:flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          userRole === 'admin' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {userRole === 'admin' ? 'Administrador' : 'Cliente'}
        </span>
      </div>
      
      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-tour="profile">
            <Avatar>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'Usuário'}
              </p>
              {profile?.company && (
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.company}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/perfil">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações do Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenHelp?.()} className="cursor-pointer">
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Atalhos de teclado</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { resetOnboarding(); startOnboardingTour(); }}
            className="cursor-pointer"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Refazer tour guiado</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
