import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo-smartest.svg';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : null;
        const errorDesc = url.searchParams.get('error_description') || hash?.get('error_description');

        if (errorDesc) {
          setError(decodeURIComponent(errorDesc));
          setChecking(false);
          return;
        }

        // PKCE flow: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError('Link inválido ou expirado. Solicite um novo.');
          } else {
            setIsValidSession(true);
          }
          setChecking(false);
          return;
        }

        // Implicit flow: #access_token=...&type=recovery
        const accessToken = hash?.get('access_token');
        const refreshToken = hash?.get('refresh_token');
        const type = hash?.get('type');
        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setError('Link inválido ou expirado. Solicite um novo.');
          } else {
            setIsValidSession(true);
          }
          setChecking(false);
          return;
        }

        // Fallback: existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setIsValidSession(true);
        setChecking(false);
      } catch (e) {
        setChecking(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError('Erro ao redefinir a senha. Tente novamente.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border border-border/50 shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">
              Link inválido ou expirado. Solicite um novo link de redefinição de senha.
            </p>
            <Button onClick={() => navigate('/forgot-password')} className="w-full">
              Solicitar novo link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <img src={logo} alt="Smartest Solution" className="h-16 object-contain" />
        </div>

        <Card className="border border-border/50 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Redefinir senha
            </CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Senha redefinida com sucesso! Você será redirecionado em instantes...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    'Redefinir senha'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
