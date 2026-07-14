import { useLocation, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Extract project ID if on a project page
  const projectId = pathSegments[0] === 'projeto' ? pathSegments[1] : undefined;
  const { data: project } = useProject(projectId);

  const getBreadcrumbs = () => {
    const breadcrumbs: { label: string; path?: string }[] = [];

    if (pathSegments[0] === 'dashboard') {
      breadcrumbs.push({ label: 'Dashboard' });
    } else if (pathSegments[0] === 'projeto' && projectId) {
      breadcrumbs.push({ label: 'Dashboard', path: '/dashboard' });
      breadcrumbs.push({ label: project?.name || 'Projeto', path: `/projeto/${projectId}` });

      if (pathSegments[2]) {
        const subPageLabels: Record<string, string> = {
          documentos: 'Documentos',
          modelagem: 'Modelagem de Dados',
          treinamentos: 'Treinamentos',
          configuracoes: 'Configurações',
        };
        breadcrumbs.push({ label: subPageLabels[pathSegments[2]] || pathSegments[2] });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center text-sm">
      <Link 
        to="/dashboard" 
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
          {crumb.path && index < breadcrumbs.length - 1 ? (
            <Link 
              to={crumb.path}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
