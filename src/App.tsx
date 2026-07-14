import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ProfileSettings from "./pages/ProfileSettings";
import ProjectOverview from "./pages/projeto/ProjectOverview";
import ProjectDocuments from "./pages/projeto/ProjectDocuments";
import ProjectTrainings from "./pages/projeto/ProjectTrainings";
import ProjectProgress from "./pages/projeto/ProjectProgress";
import ProjectAgenda from "./pages/projeto/ProjectAgenda";
import GlobalAgenda from "./pages/GlobalAgenda";
import NotFound from "./pages/NotFound";
import ProjectSupport from "./pages/projeto/ProjectSupport";
import GlobalTrainings from "./pages/GlobalTrainings";
import Chat from "./pages/Chat";

// Admin Pages
import AdminClients from "./pages/admin/AdminClients";
import AdminClientUsers from "./pages/admin/AdminClientUsers";
import AdminClientProjects from "./pages/admin/AdminClientProjects";
import AdminProjectDocuments from "./pages/admin/AdminProjectDocuments";
import AdminProjectTrainings from "./pages/admin/AdminProjectTrainings";
import AdminGlobalTrainings from "./pages/admin/AdminGlobalTrainings";
import AdminProjectStages from "./pages/admin/AdminProjectStages";
import AdminProjectLinks from "./pages/admin/AdminProjectLinks";
import AdminProjectMilestones from "./pages/admin/AdminProjectMilestones";
import AdminProjectAnnouncements from "./pages/admin/AdminProjectAnnouncements";
import AdminProjectVersions from "./pages/admin/AdminProjectVersions";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/perfil" element={
              <ProtectedRoute><ProfileSettings /></ProtectedRoute>
            } />
            <Route path="/agenda" element={
              <ProtectedRoute><GlobalAgenda /></ProtectedRoute>
            } />
            
            {/* Project routes */}
            <Route path="/projeto/:id" element={
              <ProtectedRoute><ProjectOverview /></ProtectedRoute>
            } />
            <Route path="/projeto/:id/progresso" element={
              <ProtectedRoute><ProjectProgress /></ProtectedRoute>
            } />
            <Route path="/projeto/:id/agenda" element={
              <ProtectedRoute><ProjectAgenda /></ProtectedRoute>
            } />
            <Route path="/projeto/:id/documentos" element={
              <ProtectedRoute><ProjectDocuments /></ProtectedRoute>
            } />
            <Route path="/projeto/:id/treinamentos" element={
              <ProtectedRoute><ProjectTrainings /></ProtectedRoute>
            } />
            <Route path="/projeto/:id/suporte" element={
              <ProtectedRoute><ProjectSupport /></ProtectedRoute>
            } />
            
            
            {/* Admin routes */}
            <Route path="/admin/empresas" element={
              <ProtectedRoute requireAdmin={true}><AdminClients /></ProtectedRoute>
            } />
            <Route path="/admin/empresas/:clientId/usuarios" element={
              <ProtectedRoute requireAdmin={true}><AdminClientUsers /></ProtectedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <ProtectedRoute requireAdmin={true}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/empresas/:clientId/projetos" element={
              <ProtectedRoute requireAdmin={true}><AdminClientProjects /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/documentos" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectDocuments /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/treinamentos" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectTrainings /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/etapas" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectStages /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/links" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectLinks /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/agenda" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectMilestones /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/comunicados" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectAnnouncements /></ProtectedRoute>
            } />
            <Route path="/admin/projetos/:projectId/versoes" element={
              <ProtectedRoute requireAdmin={true}><AdminProjectVersions /></ProtectedRoute>
            } />
            <Route path="/admin/treinamentos" element={
              <ProtectedRoute requireAdmin={true}><AdminGlobalTrainings /></ProtectedRoute>
            } />
            <Route path="/admin/suporte" element={
              <ProtectedRoute requireAdmin={true}><AdminSupport /></ProtectedRoute>
            } />
            <Route path="/suporte" element={
              <ProtectedRoute><AdminSupport /></ProtectedRoute>
            } />
            
            {/* Global Trainings */}
            <Route path="/treinamentos" element={
              <ProtectedRoute><GlobalTrainings /></ProtectedRoute>
            } />
            
            {/* Chat */}
            <Route path="/chat" element={
              <ProtectedRoute><Chat /></ProtectedRoute>
            } />
            
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
