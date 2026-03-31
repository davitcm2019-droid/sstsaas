import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookMarked,
  Briefcase,
  Building2,
  CalendarRange,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Command,
  FileText,
  HardHat,
  Home,
  Layers3,
  LogOut,
  Menu,
  Search,
  Settings2,
  Shield,
  User,
  Users,
  X
} from 'lucide-react';

const navigationConfig = [
  {
    group: 'Visao Geral',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Agenda', href: '/agenda', icon: CalendarRange, permission: 'events:read' },
      { name: 'Relatorios', href: '/relatorios', icon: BarChart3, permission: 'reports:read' }
    ]
  },
  {
    group: 'Estrutura Organizacional',
    items: [
      { name: 'Empresas', href: '/empresas', icon: Building2, permission: 'companies:read' },
      { name: 'Ambientes SST', href: '/levantamento-riscos/ambientes', icon: Layers3, permission: 'riskSurvey:read' }
    ]
  },
  {
    group: 'Operacao SST',
    items: [
      { name: 'Levantamento de Riscos', href: '/levantamento-riscos', icon: AlertTriangle, permission: 'riskSurvey:read' },
      { name: 'Dashboard SST', href: '/sst', icon: Shield, permission: 'checklists:read' },
      { name: 'Checklists', href: '/checklists', icon: ClipboardCheck, permission: 'checklists:read' },
      { name: 'Tarefas', href: '/tarefas', icon: CheckSquare, permission: 'tasks:read' },
      { name: 'Treinamentos', href: '/treinamentos', icon: BookMarked, permission: 'trainings:read' },
      { name: 'Acoes', href: '/acoes', icon: Briefcase, permission: 'actions:read' },
      { name: 'CIPA', href: '/cipa', icon: Users, permission: 'cipas:read' },
      { name: 'Incidentes', href: '/incidentes', icon: HardHat, permission: 'incidents:read' }
    ]
  },
  {
    group: 'Documentacao e Gestao',
    items: [
      { name: 'Documentos', href: '/documentos', icon: FileText, permission: 'documents:read' },
      { name: 'Usuarios', href: '/usuarios', icon: Users, permission: 'users:manage' }
    ]
  }
];

const routeDescriptions = {
  '/dashboard': 'Leitura executiva e operacional da carteira SST.',
  '/agenda': 'Janela de compromissos, vencimentos e renovacoes.',
  '/relatorios': 'Analises, exportacoes e pacotes documentais.',
  '/empresas': 'Carteira de clientes com filtros tecnicos e conformidade.',
  '/levantamento-riscos/ambientes': 'Ambientes e pontos de exposicao por contexto operacional.',
  '/levantamento-riscos': 'Estrutura empresa > unidade > setor > cargo > atividade > risco.',
  '/sst': 'Painel sintetico para acompanhar conformidade e acao.',
  '/checklists': 'Inspecoes e requisitos normativos em execucao.',
  '/tarefas': 'Fila de execucao, responsaveis e prazos.',
  '/treinamentos': 'Capacitacoes, evidencias e ciclos de renovacao.',
  '/acoes': 'Plano de acao com criticidade e rastreabilidade.',
  '/cipa': 'Acompanhamento de comissoes e mandatos.',
  '/incidentes': 'Ocorrencias, tratativas e status de fechamento.',
  '/documentos': 'Biblioteca de laudos, documentos e historico.',
  '/usuarios': 'Governanca de acesso e perfis.'
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();

  const navigationGroups = useMemo(
    () =>
      navigationConfig
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.permission || hasPermission(item.permission))
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission]
  );

  const navigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.group }))),
    [navigationGroups]
  );

  const currentItem = useMemo(() => {
    return [...navigationItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));
  }, [location.pathname, navigationItems]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return [];
    return navigationItems
      .filter((item) => item.name.toLowerCase().includes(normalized) || item.group.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [navigationItems, searchQuery]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleNavigate = (href) => {
    setSidebarOpen(false);
    setSearchQuery('');
    navigate(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavigation = () => {
    return navigationGroups.map((group) => (
      <section key={group.group} className="app-sidebar__section">
        {!sidebarCollapsed ? <p className="app-sidebar__label">{group.group}</p> : null}
        <nav className="app-sidebar__nav">
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavigate(item.href)}
                className={`app-nav-link ${isActive(item.href) ? 'app-nav-link--active' : ''}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed ? <span>{item.name}</span> : null}
              </button>
            );
          })}
        </nav>
      </section>
    ));
  };

  return (
    <div className="app-shell">
      <div className={`app-mobile-overlay ${sidebarOpen ? 'app-mobile-overlay--open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`app-sidebar ${sidebarCollapsed ? 'app-sidebar--collapsed' : ''} ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-sidebar__header">
          <div className="app-brand">
            <div className="app-brand__mark">
              <Shield className="h-5 w-5" />
            </div>
            {!sidebarCollapsed ? (
              <div className="app-brand__copy">
                <strong>SST SaaS</strong>
                <span>Painel enterprise de SST</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="app-icon-button hidden xl:inline-flex"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button type="button" className="app-icon-button xl:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu lateral">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!sidebarCollapsed ? (
          <div className="app-sidebar__status">
            <span className="app-status-dot" />
            Operacao ativa
          </div>
        ) : null}

        <div className="app-sidebar__body">{renderNavigation()}</div>

        <div className="app-sidebar__footer">
          <div className="app-user-chip">
            <div className="app-user-chip__avatar">
              <User className="h-4 w-4" />
            </div>
            {!sidebarCollapsed ? (
              <div className="app-user-chip__copy">
                <strong>{user?.nome || 'Operador'}</strong>
                <span>{String(user?.perfil || 'visualizador').replace('_', ' ')}</span>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__left">
            <button type="button" className="app-icon-button xl:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu lateral">
              <Menu className="h-5 w-5" />
            </button>

            <div className="app-context">
              <span>{currentItem?.group || 'Operacao'}</span>
              <strong>{currentItem?.name || 'Painel'}</strong>
              <p>{routeDescriptions[currentItem?.href] || 'Camada operacional, documental e gerencial do sistema.'}</p>
            </div>
          </div>

          <div className="app-topbar__right">
            <div className="app-search">
              <Search className="h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar modulo, area ou tarefa"
                aria-label="Buscar modulos"
              />
              <span className="app-search__hint">
                <Command className="h-3.5 w-3.5" />
                K
              </span>

              {searchQuery && (
                <div className="app-search__results">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <button key={item.href} type="button" className="app-search__result" onClick={() => handleNavigate(item.href)}>
                        <span>{item.name}</span>
                        <small>{item.group}</small>
                      </button>
                    ))
                  ) : (
                    <div className="app-search__empty">Nenhum modulo encontrado.</div>
                  )}
                </div>
              )}
            </div>

            <div className="app-chip">
              <Activity className="h-4 w-4" />
              Camada operacional
            </div>

            <div className="relative">
              <button type="button" className="app-user-button" onClick={() => setUserMenuOpen((prev) => !prev)}>
                <div className="app-user-button__avatar">
                  <User className="h-4 w-4" />
                </div>
                <div className="app-user-button__copy">
                  <strong>{user?.nome || 'Operador'}</strong>
                  <span>{user?.email || 'sem-email'}</span>
                </div>
              </button>

              {userMenuOpen ? (
                <div className="app-user-menu">
                  <div className="app-user-menu__meta">
                    <strong>{user?.nome || 'Operador'}</strong>
                    <span>{user?.email || 'sem-email'}</span>
                    <small>{String(user?.perfil || 'visualizador').replace('_', ' ')}</small>
                  </div>
                  <div className="app-user-menu__action">
                    <Settings2 className="h-4 w-4" />
                    Preferencias em breve
                  </div>
                  <button type="button" className="app-user-menu__action app-user-menu__action--danger" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-content">
          <div className="app-content__canvas">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
