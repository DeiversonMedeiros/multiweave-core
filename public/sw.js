// Versão do cache - incrementar para forçar atualização
const CACHE_NAME = 'vision-v4';
const MODAL_VERSION = '1.0.0-unified'; // Versão do modal unificado
const IS_DEV = self.location && self.location.hostname === 'localhost';

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker', { CACHE_NAME, MODAL_VERSION, timestamp: new Date().toISOString() });
  
  if (IS_DEV) {
    event.waitUntil(
      caches.keys().then((names) => {
        console.log('[SW][DEV] Limpando caches antigos:', names);
        return Promise.all(names.map((n) => caches.delete(n)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        console.log('[SW][DEV] Service Worker desregistrado e cache limpo');
        self.skipWaiting();
      })
    );
    return;
  }
  
  // Limpar todos os caches antigos antes de instalar novo
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Caches encontrados:', cacheNames);
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      if (oldCaches.length > 0) {
        console.log('[SW] Removendo caches antigos:', oldCaches);
        return Promise.all(oldCaches.map(name => caches.delete(name)));
      }
      return Promise.resolve();
    }).then(() => {
      return caches.open(CACHE_NAME);
    }).then((cache) => {
      console.log('[SW] Cache criado:', CACHE_NAME);
      return cache.addAll(['/', '/manifest.json', '/sw.js']);
    }).catch((err) => {
      console.error('[SW] Erro ao instalar:', err);
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker', { CACHE_NAME, MODAL_VERSION, timestamp: new Date().toISOString() });
  
  if (IS_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((names) => {
          console.log('[SW][DEV] Limpando todos os caches:', names);
          return Promise.all(names.map((n) => caches.delete(n)));
        })
        .then(() => {
          console.log('[SW][DEV] Cache limpo, reivindicando clientes');
          // Atrasar clients.claim() para não interferir na renderização inicial
          return new Promise((resolve) => {
            setTimeout(() => {
              self.clients.claim().then(resolve).catch(() => {
                resolve();
              });
            }, 500);
          });
        })
    );
    return;
  }
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Caches atuais:', cacheNames);
      const cachesToDelete = cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);
      if (cachesToDelete.length > 0) {
        console.log('[SW] Removendo caches antigos:', cachesToDelete);
      }
      return Promise.all(
        cachesToDelete.map((cacheName) => {
          console.log('[SW] Deletando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Cache limpo, reivindicando clientes');
      // Atrasar clients.claim() para não interferir na renderização inicial do React
      // Isso evita problemas de insertBefore em navegadores móveis antigos
      return new Promise((resolve) => {
        setTimeout(() => {
          self.clients.claim().then(resolve).catch(() => {
            // Ignorar erros de claim - não é crítico
            resolve();
          });
        }, 500);
      });
    })
  );
});

// Interceptar requisições de rede
self.addEventListener('fetch', (event) => {
  if (IS_DEV) {
    // Em dev, não interceptar para permitir HMR/WebSocket do Vite.
    return;
  }
  // Ignorar requisições não-GET (POST, PUT, DELETE, etc.) - deixar passar direto
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para APIs do Supabase quando offline
  const url = new URL(event.request.url);
  const isSupabaseRequest = url.hostname.includes('supabase.co');
  
  // Ignorar requisições de extensões do Chrome e outros esquemas não suportados
  const unsupportedSchemes = ['chrome-extension:', 'chrome:', 'about:', 'moz-extension:', 'edge:'];
  const isUnsupportedScheme = unsupportedSchemes.some(scheme => event.request.url.startsWith(scheme));
  
  if (isUnsupportedScheme) {
    // Deixar passar direto sem interceptar
    return;
  }
  
  // Não cachear favicon para permitir atualizações
  const isFavicon = url.pathname.includes('favicon.ico') || url.pathname.includes('favicon');
  
  if (isFavicon) {
    // Sempre buscar do servidor, sem cache
    event.respondWith(fetch(event.request));
    return;
  }

  if (isSupabaseRequest) {
    event.respondWith(
      fetch(event.request).catch(
        () => new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Para outras requisições, usar cache primeiro
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Cachear apenas requisições de GET bem-sucedidas e básicas
            // Verificar novamente se não é um esquema não suportado antes de cachear
            if (response && response.status === 200 && response.type === 'basic' && !isUnsupportedScheme) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                // Adicionar tratamento de erro para evitar que erros de cache quebrem o Service Worker
                cache.put(event.request, responseToCache).catch((error) => {
                  // Silenciosamente ignorar erros de cache (ex: chrome-extension, etc)
                  console.warn('[SW] Erro ao fazer cache:', error.message);
                });
              });
            }
            return response;
          })
          .catch(() => {
            // Em caso de erro e estar offline, retornar página offline apenas para documentos
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            // Para outras requisições, retornar resposta de erro
            return new Response('Offline', { status: 503 });
          });
      })
      .catch(() => {
        // Último recurso: retornar página offline para documentos
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Sincronizar em background quando voltar online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-time-records') {
    event.waitUntil(Promise.resolve());
  }
});

// Mensagens do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recebida mensagem SKIP_WAITING, pulando espera');
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Recebida mensagem CLEAR_CACHE, limpando todos os caches');
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((n) => caches.delete(n)));
      }).then(() => {
        console.log('[SW] Todos os caches foram limpos');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  } else if (event.data && event.data.type === 'GET_VERSION') {
    console.log('[SW] Recebida mensagem GET_VERSION');
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        cacheVersion: CACHE_NAME, 
        modalVersion: MODAL_VERSION,
        timestamp: new Date().toISOString()
      });
    }
  }
});

