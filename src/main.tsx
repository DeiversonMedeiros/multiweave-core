import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/cacheUtils"; // Importar utilitários de cache

// Service Worker handling com limpeza de cache e forçar atualização
if ("serviceWorker" in navigator) {
  const MODAL_VERSION = '1.0.0-unified';
  const CACHE_VERSION = 'vision-v4';
  
  // Função para limpar todos os caches
  const clearAllCaches = async () => {
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        console.log("[SW] Caches encontrados para limpeza:", keys);
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.log("[SW] ✅ Todos os caches foram limpos");
      } catch (error) {
        console.error("[SW] ❌ Erro ao limpar caches:", error);
      }
    }
  };

  // Função para obter versão do Service Worker
  const getSWVersion = async () => {
    if (navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        navigator.serviceWorker.controller?.postMessage(
          { type: 'GET_VERSION' },
          [channel.port2]
        );
        // Timeout após 2 segundos
        setTimeout(() => resolve(null), 2000);
      });
    }
    return null;
  };

  if (import.meta.env.DEV) {
    // Em desenvolvimento, sempre limpar e desregistrar
    navigator.serviceWorker.getRegistrations().then((regs) => {
      const hadSW = regs.length > 0;
      regs.forEach((r) => r.unregister());
      if (hadSW) console.info("[DEV] ✅ Service Workers desregistrados");
    });
    clearAllCaches();
  } else {
    // Em produção, limpar caches antigos e registrar novo
    window.addEventListener("load", async () => {
      try {
        // Limpar caches antigos primeiro
        await clearAllCaches();
        
        // Registrar novo Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: 'none' // Sempre buscar nova versão do SW
        });
        
        console.info("[SW] ✅ Service Worker registrado", {
          scope: registration.scope,
          active: registration.active?.scriptURL,
          waiting: registration.waiting?.scriptURL,
          installing: registration.installing?.scriptURL,
          modalVersion: MODAL_VERSION,
          cacheVersion: CACHE_VERSION,
          timestamp: new Date().toISOString()
        });

        // Verificar se há atualização pendente
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log("[SW] 🔄 Nova versão do Service Worker encontrada");
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log("[SW] ⚠️ Nova versão disponível. Recarregue a página para atualizar.");
                // Forçar atualização imediata
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          }
        });

        // Verificar versão após registro
        setTimeout(async () => {
          const version = await getSWVersion();
          if (version) {
            console.log("[SW] 📊 Versão do Service Worker:", version);
            if (version.cacheVersion !== CACHE_VERSION) {
              console.warn("[SW] ⚠️ Versão do cache não corresponde! Limpando...");
              await clearAllCaches();
              window.location.reload();
            }
          }
        }, 1000);

        // Limpar caches periodicamente (a cada 5 minutos)
        setInterval(async () => {
          const keys = await caches.keys();
          const oldCaches = keys.filter(k => !k.includes(CACHE_VERSION));
          if (oldCaches.length > 0) {
            console.log("[SW] 🧹 Limpando caches antigos periodicamente:", oldCaches);
            await Promise.all(oldCaches.map(k => caches.delete(k)));
          }
        }, 5 * 60 * 1000);

      } catch (e) {
        console.error("[SW] ❌ Erro ao registrar Service Worker:", e);
      }
    });
  }
}

// Forçar atualização do favicon para contornar cache do navegador
const updateFavicon = () => {
  const timestamp = Date.now();
  const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
  faviconLinks.forEach((link: any) => {
    if (link.href) {
      const url = new URL(link.href, window.location.origin);
      url.searchParams.set('t', timestamp.toString());
      link.href = url.toString();
    }
  });
};

// Atualizar favicon imediatamente e após um pequeno delay
updateFavicon();
setTimeout(updateFavicon, 100);

createRoot(document.getElementById("root")!).render(<App />);
