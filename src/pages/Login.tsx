import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import logo from '@/assets/logo-smartest.svg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha inválidos. Tente novamente.');
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #12579A 0%, #0a3d6e 50%, #878E97 100%)' }}>
        {/* Geometric shapes inspired by logo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[8%] left-[8%] w-36 h-36 rounded-lg rotate-12" style={{ backgroundColor: 'rgba(18,87,154,0.4)' }} />
          <div className="absolute top-[25%] right-[10%] w-52 h-52 rounded-lg -rotate-6" style={{ backgroundColor: 'rgba(135,142,151,0.25)' }} />
          <div className="absolute bottom-[10%] left-[15%] w-44 h-44 rounded-lg rotate-45" style={{ backgroundColor: 'rgba(18,87,154,0.3)' }} />
          <div className="absolute bottom-[35%] right-[20%] w-28 h-28 rounded-lg rotate-12" style={{ backgroundColor: 'rgba(135,142,151,0.3)' }} />
          <div className="absolute top-[55%] left-[3%] w-24 h-24 rounded-lg -rotate-12" style={{ backgroundColor: 'rgba(18,87,154,0.2)' }} />
          <div className="absolute top-0 right-[30%] w-1 h-full" style={{ backgroundColor: 'rgba(135,142,151,0.15)' }} />
          <div className="absolute top-0 right-[60%] w-1 h-full" style={{ backgroundColor: 'rgba(135,142,151,0.1)' }} />
        </div>
        <div className="relative z-10 text-center px-12 space-y-6">
          <img src={logo} alt="Smartest Solution" className="h-24 object-contain mx-auto brightness-0 invert" />
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Smartest Solution
          </h2>
          <p className="text-lg font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Solução inteligente para o seu negócio
          </p>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'rgba(135,142,151,0.6)' }} />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center lg:hidden space-y-3">
            <img src={logo} alt="Smartest Solution" className="h-16 object-contain" />
            <p className="text-sm text-muted-foreground">Solução inteligente para o seu negócio</p>
          </div>

          {/* Login Card */}
          <Card className="border border-border/50 shadow-xl">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-bold text-foreground">
                Área do Cliente
              </CardTitle>
              <CardDescription>
                Digite suas credenciais para acessar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Esqueci minha senha
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Smartest Solution. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
