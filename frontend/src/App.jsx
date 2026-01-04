import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import EmpresaDetalhes from './pages/EmpresaDetalhes';
import EmpresaSstDashboard from './pages/EmpresaSstDashboard';
import Tarefas from './pages/Tarefas';
import Checklists from './pages/Checklists';
import Incidentes from './pages/Incidentes';
import Cipa from './pages/Cipa';
import Treinamentos from './pages/Treinamentos';
import Acoes from './pages/Acoes';
import Agenda from './pages/Agenda';
import Documentos from './pages/Documentos';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Redirecionamento */}
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
      />
      
      {/* Rotas protegidas */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/empresas" element={
        <ProtectedRoute>
          <Layout>
            <Empresas />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/empresas/:id" element={
        <ProtectedRoute>
          <Layout>
            <EmpresaDetalhes />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/empresas/:id/sst" element={
        <ProtectedRoute>
          <Layout>
            <EmpresaSstDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tarefas" element={
        <ProtectedRoute>
          <Layout>
            <Tarefas />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/checklists" element={
        <ProtectedRoute requiredProfile="tecnico_seguranca">
          <Layout>
            <Checklists />
          </Layout>
        </ProtectedRoute>
      } />
      
          <Route path="/incidentes" element={
            <ProtectedRoute>
              <Layout>
                <Incidentes />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/cipa" element={
            <ProtectedRoute>
              <Layout>
                <Cipa />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/treinamentos" element={
            <ProtectedRoute>
              <Layout>
                <Treinamentos />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/acoes" element={
            <ProtectedRoute>
              <Layout>
                <Acoes />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/agenda" element={
        <ProtectedRoute>
          <Layout>
            <Agenda />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/documentos" element={
        <ProtectedRoute>
          <Layout>
            <Documentos />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/relatorios" element={
        <ProtectedRoute>
          <Layout>
            <Relatorios />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/usuarios" element={
        <ProtectedRoute requiredProfile="administrador">
          <Layout>
            <Usuarios />
          </Layout>
        </ProtectedRoute>
      } />
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
