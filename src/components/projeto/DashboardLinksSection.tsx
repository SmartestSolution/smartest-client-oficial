import { useDashboardLinks } from '@/hooks/useDashboardLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BarChart3, Loader2 } from 'lucide-react';

const platformLabels: Record<string, string> = {
  power_bi: 'Power BI',
  looker: 'Looker',
  metabase: 'Metabase',
  tableau: 'Tableau',
  google_data_studio: 'Google Data Studio',
  other: 'Dashboard',
};

const platformColors: Record<string, string> = {
  power_bi: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  looker: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  metabase: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  tableau: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  google_data_studio: 'bg-green-500/10 text-green-600 border-green-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  projectId: string | undefined;
}

export function DashboardLinksSection({ projectId }: Props) {
  const { data: links, isLoading } = useDashboardLinks(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!links || links.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Links Rápidos — Dashboards
        </CardTitle>
        <CardDescription>
          Acesse seus dashboards e relatórios diretamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-md hover:border-primary/30 hover:bg-accent/50"
            >
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${platformColors[link.platform] || platformColors.other}`}>
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-foreground truncate">
                    {link.title}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {platformLabels[link.platform] || link.platform}
                </span>
                {link.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {link.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
