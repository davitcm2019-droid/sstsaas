import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Building2, 
  CheckSquare, 
  BarChart3, 
  Users, 
  Menu, 
  X,
  Shield,
  Bell,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  LogOut,
  User,
  Calendar
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isTecnico } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, permission: null },
    { name: 'Empresas', href: '/empresas', icon: Building2, permission: null },
    { name: 'Dashboard SST', href: '/sst', icon: Shield, permission: null },
    { name: 'Tarefas', href: '/tarefas', icon: CheckSquare, permission: null },
    { name: 'CIPA', href: '/cipa', icon: Users, permission: null },
    { name: 'Treinamentos', href: '/treinamentos', icon: ClipboardCheck, permission: null },
    { name: 'Ações', href: '/acoes', icon: AlertTriangle, permission: null },
    { name: 'Agenda', href: '/agenda', icon: Calendar, permission: null },
    { name: 'Checklists', href: '/checklists', icon: ClipboardCheck, permission: 'tecnico_seguranca' },
    { name: 'Incidentes', href: '/incidentes', icon: AlertTriangle, permission: null },
    { name: 'Documentos', href: '/documentos', icon: FileText, permission: null },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3, permission: null },
    { name: 'Usuários', href: '/usuarios', icon: Users, permission: 'administrador' },
  ].filter(item => !item.permission || (item.permission === 'tecnico_seguranca' && isTecnico()) || (item.permission === 'administrador' && isAdmin()));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Mobile */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold text-gray-900">SST SaaS</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <Shield className="h-8 w-8 text-primary-500" />
            <span className="ml-2 text-xl font-bold text-gray-900">SST SaaS</span>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-x-2 text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600" />
                  </div>
                  <span className="hidden lg:block">{user?.nome}</span>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user?.nome}</div>
                      <div className="text-gray-500">{user?.email}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {user?.perfil?.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
