import { useState, useEffect } from 'react';

// Cache de autenticação offline
const AUTH_CACHE_KEY = 'vision_auth_cache';
const USER_DATA_CACHE_KEY = 'vision_user_data_cache';

export function useOfflineAuth() {
  const [cachedAuth, setCachedAuth] = useState<any>(null);
  const [cachedUserData, setCachedUserData] = useState<any>(null);

  // Carregar dados do cache ao inicializar
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const authData = localStorage.getItem(AUTH_CACHE_KEY);
        const userData = localStorage.getItem(USER_DATA_CACHE_KEY);
        
        if (authData) {
          setCachedAuth(JSON.parse(authData));
        }
        if (userData) {
          setCachedUserData(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do cache:', error);
      }
    };

    loadCachedData();
  }, []);

  // Salvar dados no cache quando autenticado
  const saveAuthCache = (authData: any, userData: any) => {
    try {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(authData));
      localStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(userData));
      setCachedAuth(authData);
      setCachedUserData(userData);
      console.log('✅ Cache de autenticação salvo:', { authData, userData });
    } catch (error) {
      console.error('Erro ao salvar dados no cache:', error);
    }
  };

  // Limpar cache
  const clearAuthCache = () => {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem(USER_DATA_CACHE_KEY);
      setCachedAuth(null);
      setCachedUserData(null);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  };

  // Verificar se está autenticado offline
  const isOfflineAuthenticated = () => {
    // Verificar se há dados em cache E se o usuário está logado online OU offline
    const hasAuth = !!(cachedAuth && cachedUserData);
    // Removido log que causava loop infinito - só logar quando realmente necessário
    return hasAuth;
  };

  // Obter dados do usuário offline
  const getOfflineUser = () => {
    return cachedUserData;
  };

  // Obter dados da sessão offline
  const getOfflineSession = () => {
    return cachedAuth;
  };

  return {
    cachedAuth,
    cachedUserData,
    saveAuthCache,
    clearAuthCache,
    isOfflineAuthenticated,
    getOfflineUser,
    getOfflineSession
  };
}
