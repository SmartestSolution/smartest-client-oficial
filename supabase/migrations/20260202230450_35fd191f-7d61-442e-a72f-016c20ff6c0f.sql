-- Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Criar enum para tipos de documentos
CREATE TYPE public.document_type AS ENUM ('technical_docs', 'data_modeling', 'user_manuals');

-- Tabela de profiles (para dados adicionais do usuário)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'client',
    UNIQUE(user_id, role)
);

-- Tabela de clientes (empresas/organizações)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de associação cliente-usuário
CREATE TABLE public.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, user_id)
);

-- Tabela de projetos
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de documentos
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    document_type document_type NOT NULL DEFAULT 'technical_docs',
    file_path TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vídeos
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    order_index INTEGER DEFAULT 0,
    theme TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Função para verificar se usuário tem acesso ao projeto
CREATE OR REPLACE FUNCTION public.user_has_project_access(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.client_users cu ON cu.client_id = p.client_id
        WHERE p.id = _project_id AND cu.user_id = auth.uid()
    ) OR public.is_admin()
$$;

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Allow insert during signup" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para user_roles (somente admin pode gerenciar)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- Políticas para clients
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their client" ON public.clients FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.client_users WHERE client_id = clients.id AND user_id = auth.uid())
);

-- Políticas para client_users
CREATE POLICY "Admins can manage client_users" ON public.client_users FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own client associations" ON public.client_users FOR SELECT USING (auth.uid() = user_id);

-- Políticas para projects
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their projects" ON public.projects FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.client_users WHERE client_id = projects.client_id AND user_id = auth.uid())
);

-- Políticas para documents
CREATE POLICY "Admins can manage documents" ON public.documents FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view documents of their projects" ON public.documents FOR SELECT USING (
    public.user_has_project_access(project_id)
);

-- Políticas para videos
CREATE POLICY "Admins can manage videos" ON public.videos FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view videos of their projects" ON public.videos FOR SELECT USING (
    public.user_has_project_access(project_id)
);

-- Criar bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Políticas de storage para documents
CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Admins can update documents" ON storage.objects FOR UPDATE 
USING (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE 
USING (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Users can view documents they have access to" ON storage.objects FOR SELECT 
USING (
    bucket_id = 'documents' AND (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.documents d
            JOIN public.projects p ON d.project_id = p.id
            JOIN public.client_users cu ON cu.client_id = p.client_id
            WHERE d.file_path = storage.objects.name AND cu.user_id = auth.uid()
        )
    )
);