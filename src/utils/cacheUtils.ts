/**
 * Utilitários para gerenciamento de cache do Service Worker
 * Útil para depuração e forçar atualização do modal
 */

const CACHE_VERSION = 'vision-v4';
const MODAL_VERSION = '1.0.0-unified';

/**
 * Limpa todos os caches do navegador
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    console.warn('[CacheUtils] Cache API não disponível');
    return;
  }

  try {
    const keys = await caches.keys();
    console.log('[CacheUtils] 🧹 Limpando caches:', keys);
    await Promise.all(keys.map((k) => caches.delete(k)));
    console.log('[CacheUtils] ✅ Todos os caches foram limpos');
  } catch (error) {
    console.error('[CacheUtils] ❌ Erro ao limpar caches:', error);
    throw error;
  }
}

/**
 * Limpa apenas caches antigos (diferentes da versão atual)
 */
export async function clearOldCaches(): Promise<void> {
  if (!('caches' in window)) {
    console.warn('[CacheUtils] Cache API não disponível');
    return;
  }

  try {
    const keys = await caches.keys();
    const oldCaches = keys.filter((k) => !k.includes(CACHE_VERSION));
    
    if (oldCaches.length === 0) {
      console.log('[CacheUtils] ✅ Nenhum cache antigo encontrado');
      return;
    }

    console.log('[CacheUtils] 🧹 Limpando caches antigos:', oldCaches);
    await Promise.all(oldCaches.map((k) => caches.delete(k)));
    console.log('[CacheUtils] ✅ Caches antigos foram limpos');
  } catch (error) {
    console.error('[CacheUtils] ❌ Erro ao limpar caches antigos:', error);
    throw error;
  }
}

/**
 * Desregistra todos os Service Workers
 */
export async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[CacheUtils] Service Worker API não disponível');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('[CacheUtils] 🔄 Desregistrando Service Workers:', registrations.length);
    
    await Promise.all(registrations.map((r) => r.unregister()));
    console.log('[CacheUtils] ✅ Todos os Service Workers foram desregistrados');
  } catch (error) {
    console.error('[CacheUtils] ❌ Erro ao desregistrar Service Workers:', error);
    throw error;
  }
}

/**
 * Obtém informações sobre o Service Worker atual
 */
export async function getServiceWorkerInfo(): Promise<{
  controller: ServiceWorker | null;
  registrations: ServiceWorkerRegistration[];
  version: { cacheVersion: string; modalVersion: string } | null;
}> {
  const info = {
    controller: navigator.serviceWorker?.controller || null,
    registrations: await navigator.serviceWorker?.getRegistrations() || [],
    version: null as { cacheVersion: string; modalVersion: string } | null,
  };

  // Tentar obter versão do Service Worker
  if (info.controller) {
    try {
      const version = await new Promise<{ cacheVersion: string; modalVersion: string } | null>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        info.controller?.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        setTimeout(() => resolve(null), 2000);
      });
      info.version = version;
    } catch (error) {
      console.warn('[CacheUtils] Não foi possível obter versão do SW:', error);
    }
  }

  return info;
}

/**
 * Força atualização completa: limpa cache e recarrega Service Worker
 */
export async function forceUpdate(): Promise<void> {
  console.log('[CacheUtils] 🔄 Iniciando atualização forçada...');
  
  try {
    // 1. Limpar todos os caches
    await clearAllCaches();
    
    // 2. Desregistrar Service Workers
    await unregisterServiceWorkers();
    
    // 3. Recarregar página
    console.log('[CacheUtils] ✅ Atualização concluída, recarregando página...');
    window.location.reload();
  } catch (error) {
    console.error('[CacheUtils] ❌ Erro durante atualização forçada:', error);
    throw error;
  }
}

/**
 * Exibe informações de debug sobre cache e Service Worker
 */
export async function debugCacheInfo(): Promise<void> {
  console.group('[CacheUtils] 📊 Informações de Cache e Service Worker');
  
  // Informações de versão
  console.log('Versões:', {
    cacheVersion: CACHE_VERSION,
    modalVersion: MODAL_VERSION,
  });

  // Informações de cache
  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    console.log('Caches encontrados:', cacheKeys);
    
    for (const key of cacheKeys) {
      const cache = await caches.open(key);
      const keys = await cache.keys();
      console.log(`  - ${key}: ${keys.length} itens`);
    }
  } else {
    console.warn('Cache API não disponível');
  }

  // Informações de Service Worker
  if ('serviceWorker' in navigator) {
    const swInfo = await getServiceWorkerInfo();
    console.log('Service Worker:', {
      controller: swInfo.controller ? 'Ativo' : 'Inativo',
      registrations: swInfo.registrations.length,
      version: swInfo.version,
    });
  } else {
    console.warn('Service Worker API não disponível');
  }

  console.groupEnd();
}

// Expor funções globalmente para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).cacheUtils = {
    clearAll: clearAllCaches,
    clearOld: clearOldCaches,
    unregisterSW: unregisterServiceWorkers,
    getInfo: getServiceWorkerInfo,
    forceUpdate,
    debug: debugCacheInfo,
    versions: {
      cache: CACHE_VERSION,
      modal: MODAL_VERSION,
    },
  };

  console.log(
    '%c[CacheUtils] 🛠️ Utilitários de cache disponíveis no console',
    'color: #4CAF50; font-weight: bold;'
  );
  console.log(
    '%cUse: window.cacheUtils.debug() para ver informações',
    'color: #2196F3;'
  );
  console.log(
    '%cUse: window.cacheUtils.forceUpdate() para forçar atualização completa',
    'color: #FF9800;'
  );
}

