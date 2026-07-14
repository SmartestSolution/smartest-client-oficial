import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  User, 
  Camera, 
  Loader2, 
  KeyRound,
  Save,
  Trash2
} from 'lucide-react';

export default function ProfileSettings() {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initialize state from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem.');
      return;
    }

    if (file.size > 2097152) { // 2MB max
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        await supabase.storage
          .from('avatars')
          .remove([avatarUrl]);
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(filePath);
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto: ' + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    setIsUploadingAvatar(true);

    try {
      // Delete from storage
      await supabase.storage
        .from('avatars')
        .remove([avatarUrl]);

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setAvatarUrl(null);
      toast.success('Foto removida com sucesso!');
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error('Erro ao remover foto: ' + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha: ' + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Get avatar public URL
  const avatarPublicUrl = avatarUrl 
    ? supabase.storage.from('avatars').getPublicUrl(avatarUrl).data.publicUrl
    : null;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações do Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua foto de perfil e credenciais de acesso.
          </p>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Sua foto será exibida no cabeçalho da aplicação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPublicUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Alterar Foto
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seu nome e outras informações do perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Defina uma nova senha para sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a nova senha novamente"
                />
              </div>
              <Button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword}>
                {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
