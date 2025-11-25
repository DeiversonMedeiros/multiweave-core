import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Limpar a pasta de saída antes de cada build
    emptyOutDir: true,
    // Garantir que os arquivos de ícones em public/ sejam copiados sem modificação
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar apenas dependências grandes e estáveis
          if (id.includes('node_modules')) {
            // React e dependências core - devem estar juntos
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            
            // Supabase - biblioteca grande e estável
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            
            // Charts - deixar no bundle principal para evitar problemas de inicialização
            // if (id.includes('recharts')) {
            //   return 'charts';
            // }
            
            // React Query - biblioteca estável
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            
            // Radix UI - componentes UI
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            
            // Utils - bibliotecas pequenas
            if (id.includes('date-fns') || id.includes('lodash')) {
              return 'utils';
            }
            
            // Deixar outras dependências no bundle principal para evitar problemas de inicialização
            // Não criar chunk 'vendor' genérico que pode causar dependências circulares
          }
          
          // Separar módulos grandes por funcionalidade (apenas se realmente necessário)
          // Módulo RH - muito grande (1.5MB), vale a pena separar
          // Mas monitorar se houver problemas de inicialização
          if (id.includes('/src/pages/rh/') || id.includes('/src/hooks/rh/') || id.includes('/src/services/rh/')) {
            return 'rh-module';
          }
          
          // Módulo Financeiro - deixar no bundle principal para evitar problemas de inicialização
          // if (id.includes('/src/pages/financeiro/') || id.includes('/src/services/financial/')) {
          //   return 'financeiro-module';
          // }
          
          // Módulo Almoxarifado - deixar no bundle principal para evitar problemas de inicialização
          // O módulo tem muitas dependências internas que podem causar problemas quando separado
          
          // Deixar o resto no bundle principal para evitar problemas de dependências circulares
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096, // Inline assets < 4KB
  },
}));
