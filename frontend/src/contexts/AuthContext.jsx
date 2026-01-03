import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api';

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authService.getMe();
          if (response.data.success) {
            setUser(response.data.data);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, senha });

      if (response.data.success) {
        const { user: userData, token: newToken } = response.data.data;
        setUser(userData);
        setToken(newToken);
        localStorage.setItem('token', newToken);
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
        return { success: true };
      }

      return { success: false, error: response.data.message || response.data.error };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: getApiMessage(error, 'Erro ao registrar usuário')
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
    }
  };

  const hasPermission = (requiredProfile) => {
    if (!user) return false;

    const permissions = {
      visualizador: ['visualizador'],
      tecnico_seguranca: ['visualizador', 'tecnico_seguranca'],
      administrador: ['visualizador', 'tecnico_seguranca', 'administrador']
    };

    return permissions[user.perfil]?.includes(requiredProfile) || false;
  };

  const isAdmin = () => hasPermission('administrador');
  const isTecnico = () => hasPermission('tecnico_seguranca');
  const isVisualizador = () => hasPermission('visualizador');

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    hasPermission,
    isAdmin,
    isTecnico,
    isVisualizador,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

