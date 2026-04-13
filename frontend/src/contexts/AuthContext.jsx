import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { hasPermission as roleHasPermission } from '../auth/permissions';
import { authService, setTokenCache } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

const getApiMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // M-3 (rerender-lazy-state-init): lazy initializer — lê o localStorage apenas uma vez.
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // A-1 (advanced-use-latest): ref para acessar o perfil mais recente em hasPermission
  // sem adicionar user como dependência do useCallback.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; });

  // C-2 (async-parallel / waterfall): deps vazio — executa apenas no mount.
  // Não usa token como dep para evitar re-disparar após login/logout.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) { setLoading(false); return; } // js-early-exit

    (async () => {
      try {
        const response = await authService.getMe();
        if (response.data.success) {
          setUser(response.data.data);
        } else {
          localStorage.removeItem('token');
          setTokenCache(null); // H-1: sincroniza o cache do interceptor
          setToken(null);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticacao:', error);
        localStorage.removeItem('token');
        setTokenCache(null); // H-1
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // ← mount only — não re-dispara em login/logout

  const login = async (email, senha) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, senha });

      if (response.data.success) {
        const { user: userData, token: newToken } = response.data.data;
        setUser(userData);
        setToken(newToken);
        localStorage.setItem('token', newToken);
        setTokenCache(newToken); // H-1: mantém o cache do interceptor sincronizado
        return { success: true };
      }

      return { success: false, error: response.data.message || response.data.error };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: getApiMessage(error, 'Erro ao fazer login')
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);

      if (response.data.success) {
        const { user: newUser, token: newToken } = response.data.data;
        setUser(newUser);
        setToken(newToken);
        localStorage.setItem('token', newToken);
        setTokenCache(newToken); // H-1
        return { success: true };
      }

      return { success: false, error: response.data.message || response.data.error };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: getApiMessage(error, 'Erro ao registrar usuario')
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      setTokenCache(null); // H-1: limpa o cache do interceptor
    }
  };

  // H-2 (rerender-dependencies): useCallback com dep primitiva user?.perfil
  // em vez do objeto user inteiro — evita recriar a função a cada render do contexto.
  // A-1 (advanced-use-latest): usa userRef para garantir acesso ao valor mais recente
  // sem inflar as dependências do useCallback.
  const hasPermission = useCallback(
    (permission) => roleHasPermission(userRef.current?.perfil, permission),
    [] // estável — userRef é uma ref, não causa re-memoização
  );

  const hasRole = useCallback(
    (role) => userRef.current?.perfil === role,
    []
  );

  // H-3 (rerender-derived-state): booleans derivados em vez de funções.
  // Evita consumidores que acidentalmente fazem `if (isAdmin)` (sempre true, é função)
  // vs `if (isAdmin())` (correto). Atualiza apenas quando o perfil muda.
  const perfil = user?.perfil;
  const isAdmin = perfil === 'administrador';
  const isTecnico = perfil === 'tecnico_seguranca';
  const isAuditor = perfil === 'auditor';
  const isVisualizador = perfil === 'visualizador';

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    hasPermission,
    hasRole,
    isAdmin,
    isTecnico,
    isAuditor,
    isVisualizador,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
