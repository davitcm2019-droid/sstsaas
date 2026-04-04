import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RecuperarSenha = lazy(() => import('./pages/RecuperarSenha'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Empresas = lazy(() => import('./pages/Empresas'));
const EmpresaDetalhes = lazy(() => import('./pages/EmpresaDetalhes'));
const EmpresaSstDashboard = lazy(() => import('./pages/EmpresaSstDashboard'));
const SstDashboard = lazy(() => import('./pages/SstDashboard'));
const Tarefas = lazy(() => import('./pages/Tarefas'));
const Checklists = lazy(() => import('./pages/Checklists'));
const Incidentes = lazy(() => import('./pages/Incidentes'));
const Cipa = lazy(() => import('./pages/Cipa'));
const Treinamentos = lazy(() => import('./pages/Treinamentos'));
const Acoes = lazy(() => import('./pages/Acoes'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Documentos = lazy(() => import('./pages/Documentos'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const SstEstablishments = lazy(() => import('./pages/SstEstablishments'));
const SstSectors = lazy(() => import('./pages/SstSectors'));
const SstRoles = lazy(() => import('./pages/SstRoles'));
const SstAssessments = lazy(() => import('./pages/SstAssessments'));
const SstTechnicalDocuments = lazy(() => import('./pages/SstTechnicalDocuments'));
const SstCatalogs = lazy(() => import('./pages/SstCatalogs'));
const SstAudit = lazy(() => import('./pages/SstAudit'));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-lime-400" />
  </div>
);

const renderPage = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const renderProtectedPage = (Component, requiredPermission = null, withLayout = true) => {
  const content = withLayout ? <Layout>{renderPage(Component)}</Layout> : renderPage(Component);
  return <ProtectedRoute requiredPermission={requiredPermission}>{content}</ProtectedRoute>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={renderPage(Login)} />
      <Route path="/register" element={renderPage(Register)} />
      <Route path="/recuperar-senha" element={renderPage(RecuperarSenha)} />

      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />

      <Route path="/dashboard" element={renderProtectedPage(Dashboard)} />
      <Route path="/empresas" element={renderProtectedPage(Empresas, 'companies:read')} />
      <Route path="/sst/dashboard" element={renderProtectedPage(SstDashboard, 'checklists:read')} />
      <Route path="/sst" element={renderProtectedPage(() => <Navigate to="/sst/avaliacoes" replace />, 'sst:read', false)} />
      <Route path="/sst/estrutura/estabelecimentos" element={renderProtectedPage(SstEstablishments, 'sst:read')} />
      <Route path="/sst/estrutura/setores" element={renderProtectedPage(SstSectors, 'sst:read')} />
      <Route path="/sst/estrutura/cargos" element={renderProtectedPage(SstRoles, 'sst:read')} />
      <Route path="/sst/avaliacoes" element={renderProtectedPage(SstAssessments, 'sst:read')} />
      <Route path="/sst/avaliacoes/riscos" element={renderProtectedPage(SstAssessments, 'sst:read')} />
      <Route path="/sst/avaliacoes/acoes" element={renderProtectedPage(SstAssessments, 'sst:read')} />
      <Route path="/sst/documentos" element={renderProtectedPage(SstTechnicalDocuments, 'sst:read')} />
      <Route path="/sst/governanca/catalogos" element={renderProtectedPage(SstCatalogs, 'sst:read')} />
      <Route path="/sst/governanca/auditoria" element={renderProtectedPage(SstAudit, 'sst:read')} />
      <Route path="/empresas/:id" element={renderProtectedPage(EmpresaDetalhes, 'companies:read')} />
      <Route path="/empresas/:id/sst" element={renderProtectedPage(EmpresaSstDashboard, 'checklists:read')} />
      <Route path="/tarefas" element={renderProtectedPage(Tarefas, 'tasks:read')} />
      <Route path="/checklists" element={renderProtectedPage(Checklists, 'checklists:read')} />
      <Route path="/levantamento-riscos" element={renderProtectedPage(() => <Navigate to="/sst/avaliacoes" replace />, 'sst:read', false)} />
      <Route path="/levantamento-riscos/execucao" element={renderProtectedPage(() => <Navigate to="/sst/avaliacoes" replace />, 'sst:read', false)} />
      <Route path="/levantamento-riscos/ambientes" element={renderProtectedPage(() => <Navigate to="/sst/estrutura/setores" replace />, 'sst:read', false)} />
      <Route path="/incidentes" element={renderProtectedPage(Incidentes, 'incidents:read')} />
      <Route path="/cipa" element={renderProtectedPage(Cipa, 'cipas:read')} />
      <Route path="/treinamentos" element={renderProtectedPage(Treinamentos, 'trainings:read')} />
      <Route path="/acoes" element={renderProtectedPage(Acoes, 'actions:read')} />
      <Route path="/agenda" element={renderProtectedPage(Agenda, 'events:read')} />
      <Route path="/documentos" element={renderProtectedPage(Documentos, 'documents:read')} />
      <Route path="/relatorios" element={renderProtectedPage(Relatorios, 'reports:read')} />
      <Route path="/usuarios" element={renderProtectedPage(Usuarios, 'users:manage')} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
