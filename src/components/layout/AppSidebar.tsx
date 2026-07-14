import { useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { useClientBranding } from '@/hooks/useClientBranding';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  FolderKanban, 
  ChevronRight, 
  FileText, 
  GraduationCap,
  Loader2,
  Building2,
  LifeBuoy,
  BarChart3,
  CalendarDays,
  MessageCircle,
  Search,
  Check,
  Users,
} from 'lucide-react';
import logo from '@/assets/logo-smartest.svg';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Logical order: Overview → Agenda → Progress → Docs → Trainings → Versions → Announcements → Settings
const projectSubMenuItems = [
  { title: 'Visão Geral', path: '', icon: LayoutDashboard },
  { title: 'Agenda', path: '/agenda', icon: CalendarDays },
  { title: 'Progresso', path: '/progresso', icon: BarChart3 },
  { title: 'Documentos', path: '/documentos', icon: FileText },
  { title: 'Treinamentos', path: '/treinamentos', icon: GraduationCap },
  { title: 'Suporte', path: '/suporte', icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { id: projectIdFromParams } = useParams();
  const { data: projects, isLoading } = useProjects();
  const { isAdmin } = useAuth();
  const { data: clientBranding } = useClientBranding();
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [openClientPopover, setOpenClientPopover] = useState(false);
  const [openProjectPopover, setOpenProjectPopover] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['sidebar-clients'],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (clientFilter !== 'all' && p.client_id !== clientFilter) return false;
      if (projectFilter !== 'all' && p.id !== projectFilter) return false;
      return true;
    });
  }, [projects, clientFilter, projectFilter]);

  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return clientFilter === 'all'
      ? projects
      : projects.filter((p) => p.client_id === clientFilter);
  }, [projects, clientFilter]);

  const currentProjectId = projectIdFromParams || location.pathname.match(/\/projeto\/([^/]+)/)?.[1];

  const clientLogoUrl = clientBranding?.logo_url 
    ? supabase.storage.from('client-assets').getPublicUrl(clientBranding.logo_url).data.publicUrl
    : null;

  const toggleProject = (projectId: string) => {
    setOpenProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const isProjectOpen = (projectId: string) => {
    if (openProjects[projectId] !== undefined) return openProjects[projectId];
    return projectId === currentProjectId;
  };

  const isSubItemActive = (projectId: string, subPath: string) => {
    const basePath = `/projeto/${projectId}`;
    return subPath === '' ? location.pathname === basePath : location.pathname === `${basePath}${subPath}`;
  };

  const hexToHslComponents = (hex: string): { h: number; s: number; l: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const getSidebarStyles = (): React.CSSProperties | undefined => {
    if (isAdmin || !clientBranding?.sidebar_color) return undefined;
    const hsl = hexToHslComponents(clientBranding.sidebar_color);
    if (!hsl) return undefined;
    const baseHsl = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    const accentHsl = `${hsl.h} ${Math.max(hsl.s - 10, 0)}% ${Math.min(hsl.l + 15, 50)}%`;
    const borderHsl = `${hsl.h} ${Math.max(hsl.s - 15, 0)}% ${Math.min(hsl.l + 20, 55)}%`;
    const mutedHsl = `${hsl.h} ${Math.max(hsl.s - 20, 0)}% ${Math.min(hsl.l + 25, 60)}%`;
    return {
      '--sidebar-background': baseHsl,
      '--sidebar-accent': accentHsl,
      '--sidebar-border': borderHsl,
      '--sidebar-muted': mutedHsl,
    } as React.CSSProperties;
  };

  const clientLabel = useMemo(() => {
    if (clientFilter === 'all') return 'Todos os clientes';
    return clients?.find((c) => c.id === clientFilter)?.name || 'Todos os clientes';
  }, [clientFilter, clients]);

  const projectLabel = useMemo(() => {
    if (projectFilter === 'all') return 'Todos os projetos';
    return projectOptions.find((p) => p.id === projectFilter)?.name || 'Todos os projetos';
  }, [projectFilter, projectOptions]);

  return (
    <Sidebar className="border-r-0" style={getSidebarStyles()}>
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
        {!collapsed ? (
          clientLogoUrl && !isAdmin ? (
            <img src={clientLogoUrl} alt={clientBranding?.name || 'Logo'} className="h-10 object-contain" />
          ) : (
            <img src={logo} alt="Smartest Solution" className="h-10 object-contain brightness-0 invert" />
          )
        ) : (
          <div className="w-8 h-8 bg-sidebar-foreground/20 rounded flex items-center justify-center">
            <span className="text-sidebar-foreground font-bold text-sm">
              {clientBranding?.name?.[0] || 'S'}
            </span>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem data-tour="dashboard">
                <SidebarMenuButton asChild isActive={location.pathname === '/dashboard'}>
                  <NavLink to="/dashboard" className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem data-tour="agenda">
                <SidebarMenuButton asChild isActive={location.pathname === '/agenda'}>
                  <NavLink to="/agenda" className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4" />
                    {!collapsed && <span>Agenda Geral</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/treinamentos'}>
                      <NavLink to="/treinamentos" className="flex items-center gap-3">
                        <GraduationCap className="h-4 w-4" />
                        {!collapsed && <span>Treinamentos</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/suporte'}>
                      <NavLink to="/suporte" className="flex items-center gap-3">
                        <LifeBuoy className="h-4 w-4" />
                        {!collapsed && <span>Suporte</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <div className="px-3 py-2">
                <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  Administração
                </span>
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname.startsWith('/admin/empresas')}>
                    <NavLink to="/admin/empresas" className="flex items-center gap-3">
                      <Building2 className="h-4 w-4" />
                      {!collapsed && <span>Empresas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/admin/usuarios'}>
                    <NavLink to="/admin/usuarios" className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/admin/treinamentos'}>
                    <NavLink to="/admin/treinamentos" className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4" />
                      {!collapsed && <span>Treinamentos</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/admin/suporte'}>
                    <NavLink to="/admin/suporte" className="flex items-center gap-3">
                      <LifeBuoy className="h-4 w-4" />
                      {!collapsed && <span>Suporte</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Global Trainings - only for non-admin users, inside main nav group */}

        {/* Projects List */}
        <SidebarGroup data-tour="projects-list">
          {!collapsed && (
            <div className="px-3 py-2">
              <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                Projetos
              </span>
            </div>
          )}
          {!collapsed && projects && projects.length > 0 && (
            <div className="px-2 pb-2 space-y-2">
              {isAdmin && (
                <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
                    >
                      <span className="truncate">{clientLabel}</span>
                      <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popper-anchor-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty className="text-xs py-2 text-center">Nenhum cliente encontrado</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            className="text-xs"
                            onSelect={() => {
                              setClientFilter('all');
                              setProjectFilter('all');
                              setOpenClientPopover(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-3.5 w-3.5', clientFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                            Todos os clientes
                          </CommandItem>
                          {clients?.map((c) => (
                            <CommandItem
                              key={c.id}
                              className="text-xs"
                              onSelect={() => {
                                setClientFilter(c.id);
                                setProjectFilter('all');
                                setOpenClientPopover(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-3.5 w-3.5', clientFilter === c.id ? 'opacity-100' : 'opacity-0')} />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <Popover open={openProjectPopover} onOpenChange={setOpenProjectPopover}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-full items-center justify-between rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
                  >
                    <span className="truncate">{projectLabel}</span>
                    <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popper-anchor-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar projeto..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty className="text-xs py-2 text-center">Nenhum projeto encontrado</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          className="text-xs"
                          onSelect={() => {
                            setProjectFilter('all');
                            setOpenProjectPopover(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-3.5 w-3.5', projectFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                          Todos os projetos
                        </CommandItem>
                        {projectOptions.map((p) => (
                          <CommandItem
                            key={p.id}
                            className="text-xs"
                            onSelect={() => {
                              setProjectFilter(p.id);
                              setOpenProjectPopover(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-3.5 w-3.5', projectFilter === p.id ? 'opacity-100' : 'opacity-0')} />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/60" />
                </div>
              ) : filteredProjects && filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <Collapsible
                    key={project.id}
                    open={isProjectOpen(project.id)}
                    onOpenChange={() => toggleProject(project.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className="w-full justify-between"
                          isActive={location.pathname.startsWith(`/projeto/${project.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <FolderKanban className="h-4 w-4" />
                            {!collapsed && (
                              <span className="truncate max-w-[140px]">{project.name}</span>
                            )}
                          </div>
                          {!collapsed && (
                            <ChevronRight className={`h-4 w-4 transition-transform ${
                              isProjectOpen(project.id) ? 'rotate-90' : ''
                            }`} />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {projectSubMenuItems.map((item) => (
                              <SidebarMenuSubItem key={item.path}>
                                <SidebarMenuSubButton 
                                  asChild
                                  isActive={isSubItemActive(project.id, item.path)}
                                >
                                  <NavLink to={`/projeto/${project.id}${item.path}`}>
                                    <item.icon className="h-3.5 w-3.5 mr-2" />
                                    <span>{item.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-sidebar-foreground/60">
                    {collapsed ? '—' : (projects && projects.length > 0 ? 'Nenhum projeto encontrado' : 'Nenhum projeto disponível')}
                  </p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem data-tour="chat">
                <SidebarMenuButton asChild isActive={location.pathname === '/chat'}>
                  <NavLink to="/chat" className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4" />
                    {!collapsed && <span>Chat</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}