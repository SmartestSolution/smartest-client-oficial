import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarDays, Package, Users, Flag } from 'lucide-react';
import { format, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProjectMilestone } from '@/hooks/useProjectMilestones';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';

interface ProjectRoadmapProps {
  milestones: ProjectMilestone[];
  isLoading: boolean;
  events?: AgendaEvent[];
  showProjectName?: boolean;
}

const typeConfig = {
  entrega: { label: 'Entrega', icon: Package, color: 'bg-primary/10 text-primary border-primary/20' },
  reuniao: { label: 'Reunião', icon: Users, color: 'bg-accent/50 text-accent-foreground border-accent' },
  marco: { label: 'Marco', icon: Flag, color: 'bg-success/10 text-success border-success/20' },
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function ProjectRoadmap({ milestones, isLoading, events = [], showProjectName = false }: ProjectRoadmapProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getMilestonesForDay = (day: Date) => {
    const entries: Array<{ m: ProjectMilestone; kind: 'end' }> = [];
    milestones.forEach(m => {
      if (isSameDay(new Date(m.due_date + 'T00:00:00'), day)) {
        entries.push({ m, kind: 'end' });
      }
    });
    return entries;
  };

  const getEventsForDay = (day: Date) =>
    events.filter(ev => isSameDay(new Date(ev.date + 'T00:00:00'), day));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upcoming milestones (next items regardless of month)
  const upcoming = useMemo(() => {
    return milestones
      .filter(m => {
        const d = new Date(m.due_date + 'T00:00:00');
        return d >= today && m.status !== 'cancelled' && m.status !== 'completed';
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 8);
  }, [milestones]);

  const completed = useMemo(() => {
    return milestones
      .filter(m => {
        const d = new Date(m.due_date + 'T00:00:00');
        return m.status === 'completed' || (d < today && m.status !== 'cancelled');
      })
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
      .slice(0, 8);
  }, [milestones]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const startDay = getDay(days[0]); // 0=Sun

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Agenda de Entregas
              </CardTitle>
              <CardDescription>Calendário de entregas, reuniões e marcos do projeto</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Empty cells for offset */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card min-h-[80px] p-1" />
            ))}
            {days.map(day => {
              const dayMilestones = getMilestonesForDay(day);
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-card min-h-[80px] p-1 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <span className={`text-xs font-medium block text-right pr-1 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayMilestones.map(({ m }) => {
                      const cfg = typeConfig[m.milestone_type as keyof typeof typeConfig] || typeConfig.entrega;
                      return (
                        <div
                          key={m.id}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${cfg.color} ${m.status === 'completed' ? 'line-through opacity-60' : ''} ${m.status === 'cancelled' ? 'line-through opacity-40' : ''}`}
                          title={`${m.title} — ${statusLabels[m.status]}`}
                        >
                          {m.title}
                        </div>
                      );
                    })}
                    {dayEvents.map(ev => {
                      const isStart = ev.kind === 'start';
                      const kindLabel = isStart ? 'Início' : 'Fim';
                      const ringCls = isStart ? 'border-dashed' : '';
                      const colorCls = ev.source === 'evolution'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-accent/40 text-accent-foreground border-accent';
                      // For progress: title === stage_name; show only one. For evolution: title already includes stage.
                      const label = ev.source === 'progress' ? ev.stage_name : ev.title;
                      const tooltip = `${kindLabel} — ${label}${showProjectName ? ` · ${ev.project_name}` : ''}`;
                      return (
                        <div
                          key={ev.id + ev.kind}
                          className={`flex items-center gap-1 text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${colorCls} ${ringCls} ${ev.is_completed ? 'line-through opacity-60' : ''}`}
                          title={tooltip}
                        >
                          <span aria-hidden className="shrink-0">{isStart ? '▶' : '⬛'}</span>
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4">
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${cfg.color}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming + Completed */}
      {(upcoming.length > 0 || completed.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximas Entregas</CardTitle>
              <CardDescription>{upcoming.length} pendente(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum item pendente</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(m => {
                    const cfg = typeConfig[m.milestone_type as keyof typeof typeConfig] || typeConfig.entrega;
                    const Icon = cfg.icon;
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <Icon className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{m.title}</p>
                          {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium">{format(new Date(m.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entregas Concluídas</CardTitle>
              <CardDescription>Últimos itens finalizados</CardDescription>
            </CardHeader>
            <CardContent>
              {completed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nada concluído ainda</p>
              ) : (
                <div className="space-y-3">
                  {completed.map(m => {
                    const cfg = typeConfig[m.milestone_type as keyof typeof typeConfig] || typeConfig.entrega;
                    const Icon = cfg.icon;
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <Icon className="h-5 w-5 text-success shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm line-through opacity-70">{m.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-muted-foreground">{format(new Date(m.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {milestones.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma entrega agendada</h3>
            <p className="text-sm text-muted-foreground mt-1">As entregas e marcos serão exibidos aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
