import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Página não encontrada</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A página que você está procurando não existe ou você não tem permissão para acessá-la.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Ir para Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
