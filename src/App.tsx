import React, { useEffect } from "react";
// import { Toaster } from "@/components/ui/toaster"; // removed to avoid shadcn hook issues
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { CompanyProvider } from "@/lib/company-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "./pages/Login";
import CompanySelect from "./pages/CompanySelect";
import Dashboard from "./pages/Dashboard";
import CadastrosIndex from "./pages/cadastros/Index";
import Empresas from "./pages/cadastros/Empresas";
import Usuarios from "./pages/cadastros/Usuarios";
import UserCompanies from "./pages/cadastros/UserCompanies";
import Perfis from "./pages/cadastros/Perfis";
import CentrosCusto from "./pages/cadastros/CentrosCusto";
import Projetos from "./pages/cadastros/Projetos";
import Parceiros from "./pages/cadastros/Parceiros";
import Servicos from "./pages/cadastros/Servicos";
import UnitsPageNew from "./pages/rh/UnitsPageNew";
import Permissions from "./pages/Permissions";
import { MenuTest } from "./components/MenuTest";
import NotFound from "./pages/NotFound";
import { RHRoutesNew } from "./pages/rh/routesNew";
import PortalColaboradorRoutes from "./pages/portal-colaborador/PortalColaboradorRoutes";
import PortalGestorRoutes from "./pages/portal-gestor/PortalGestorRoutes";
import TestPortal from "./pages/portal-colaborador/TestPortal";
import DebugPermissions from "./pages/DebugPermissions";
import { FinancialPage } from "./pages/FinancialPage";
// Imports das páginas do Financeiro
import { DashboardFinanceiroPage } from "./pages/financeiro/DashboardFinanceiroPage";
import { ContasPagarPage } from "./pages/financeiro/ContasPagarPage";
import { ContasReceberPage } from "./pages/financeiro/ContasReceberPage";
import { TesourariaPage } from "./pages/financeiro/TesourariaPage";
import LotesPagamentoPage from "./pages/financeiro/LotesPagamentoPage";
import ConciliacaoBancariaPage from "./pages/financeiro/ConciliacaoBancariaPage";
import ParametrizacaoTributariaPage from "./pages/financeiro/ParametrizacaoTributariaPage";
import ObrigacoesFiscaisPage from "./pages/financeiro/ObrigacoesFiscaisPage";
import { FiscalPage } from "./pages/financeiro/FiscalPage";
import { ContabilidadePage } from "./pages/financeiro/ContabilidadePage";
import { ClassesFinanceirasPage } from "./pages/financeiro/ClassesFinanceirasPage";
import { SefazPage } from "./pages/financeiro/SefazPage";
import { BancariaPage } from "./pages/financeiro/BancariaPage";
import { GovernancaPlanejamentoPage } from "./pages/financeiro/GovernancaPlanejamentoPage";
import AlmoxarifadoPage from "./pages/AlmoxarifadoPage";
import DashboardEstoquePage from "./pages/almoxarifado/DashboardEstoquePage";
import MateriaisEquipamentosPage from "./pages/almoxarifado/MateriaisEquipamentosPage";
import EntradasMateriaisPage from "./pages/almoxarifado/EntradasMateriaisPage";
import SaidasTransferenciasPage from "./pages/almoxarifado/SaidasTransferenciasPage";
import HistoricoMovimentacoesPage from "./pages/almoxarifado/HistoricoMovimentacoesPage";
import InventarioPage from "./pages/almoxarifado/InventarioPage";
import RelatoriosPage from "./pages/almoxarifado/RelatoriosPage";
import EstoqueAtualPage from "./pages/almoxarifado/EstoqueAtualPage";
import TestPage from "./pages/almoxarifado/TestPage";
import AlmoxarifadosPage from "./pages/almoxarifado/AlmoxarifadosPage";
import LocalizacoesFisicasPage from "./pages/almoxarifado/LocalizacoesFisicasPage";
import ConfiguracoesAprovacaoPage from "./pages/configuracoes/ConfiguracoesAprovacaoPage";
// Imports das páginas de Compras
import RequisicoesCompra from "./pages/Compras/RequisicoesCompra";
import Cotacoes from "./pages/Compras/Cotacoes";
import PedidosCompra from "./pages/Compras/PedidosCompra";
import AvaliacaoFornecedores from "./pages/Compras/AvaliacaoFornecedores";
import ContratosRecorrentes from "./pages/Compras/ContratosRecorrentes";
import HistoricoCompras from "./pages/Compras/HistoricoCompras";
import FollowUpCompras from "./pages/Compras/FollowUpCompras";
// Imports das páginas de Frota
import FrotaRoutes from "./pages/frota/FrotaRoutes";
import LogisticaRoutes from "./pages/logistica/LogisticaRoutes";
import CombustivelRoutes from "./pages/combustivel/CombustivelRoutes";
import { MetalurgicaRoutes } from "./pages/metalurgica/MetalurgicaRoutes";

// Configuração otimizada do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos padrão
      gcTime: 10 * 60 * 1000,   // 10 minutos padrão (antigo cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function App() {
  // Handler global de erros para capturar problemas de renderização do React
  useEffect(() => {
    // Capturar erros não tratados do JavaScript
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      const errorInfo = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: error,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        isRemoveChildError: event.message?.includes('removeChild') || error?.message?.includes('removeChild'),
        isInsertBeforeError: event.message?.includes('insertBefore') || error?.message?.includes('insertBefore'),
        isDOMError: event.message?.includes('removeChild') || 
                   event.message?.includes('insertBefore') ||
                   event.message?.includes('not a child') ||
                   error?.message?.includes('removeChild') ||
                   error?.message?.includes('insertBefore') ||
                   error?.message?.includes('not a child'),
        isReactError: error?.stack?.includes('react') || error?.stack?.includes('React')
      };
      
      console.error('[APP][GLOBAL_ERROR] ❌ Erro global capturado', errorInfo);
      
      // Log especial para erros de DOM (removeChild, insertBefore, etc)
      // Esses erros podem ocorrer durante transições de rota ou com componentes externos
      if (errorInfo.isDOMError) {
        const errorType = errorInfo.isInsertBeforeError ? 'insertBefore' : 
                         errorInfo.isRemoveChildError ? 'removeChild' : 'DOM';
        
        // Verificar se é durante uma transição crítica (login, mudança de rota)
        const isCriticalTransition = window.location.pathname === '/login' || 
                                     window.location.pathname === '/company-select' ||
                                     errorInfo.url?.includes('/login') ||
                                     errorInfo.url?.includes('/company-select');
        
        // Detectar navegadores móveis antigos que são mais propensos a este erro
        const isOldMobileBrowser = /Android [1-4]|iPhone OS [1-9]_|Mobile Safari\/[1-9][0-9][0-9]/.test(navigator.userAgent);
        const isWebView = /wv|WebView/.test(navigator.userAgent);
        
        if (isCriticalTransition) {
          // Durante transições críticas, logar como erro mas não quebrar a aplicação
          console.error(`[APP][GLOBAL_ERROR] ⚠️ Erro de ${errorType} durante transição crítica`, {
            message: event.message,
            userAgent: navigator.userAgent,
            currentPath: window.location.pathname,
            errorType,
            stack: error?.stack,
            isOldMobileBrowser,
            isWebView
          });
          
          // Em navegadores móveis antigos, suprimir o erro mesmo em transições críticas
          // para evitar tela branca
          if (isOldMobileBrowser || isWebView) {
            console.warn(`[APP][GLOBAL_ERROR] ⚠️ Suprimindo erro de ${errorType} em navegador móvel antigo para evitar tela branca`);
            event.preventDefault();
            event.stopPropagation();
            return false;
          }
        } else {
          // Em outros contextos, suprimir completamente o erro insertBefore
          // Isso evita que o erro apareça no console e quebre a aplicação
          console.warn(`[APP][GLOBAL_ERROR] ⚠️ Erro de ${errorType} detectado e suprimido (contexto não crítico)`, {
            message: event.message.substring(0, 100), // Log truncado para não poluir
            userAgent: navigator.userAgent,
            currentPath: window.location.pathname,
            errorType,
            suppressed: true,
            isOldMobileBrowser,
            isWebView
          });
          // Prevenir completamente a propagação do erro
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return false;
        }
      }
    };
    
    // Capturar rejeições de promises não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorInfo = {
        reason: event.reason,
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        isRemoveChildError: event.reason?.message?.includes('removeChild') || String(event.reason).includes('removeChild'),
        isInsertBeforeError: event.reason?.message?.includes('insertBefore') || String(event.reason).includes('insertBefore'),
        isDOMError: event.reason?.message?.includes('removeChild') || 
                   event.reason?.message?.includes('insertBefore') ||
                   event.reason?.message?.includes('not a child') ||
                   String(event.reason).includes('removeChild') ||
                   String(event.reason).includes('insertBefore') ||
                   String(event.reason).includes('not a child'),
        isAbortError: event.reason?.name === 'AbortError' || 
                     event.reason?.message?.includes('play() request was interrupted') ||
                     String(event.reason).includes('AbortError')
      };
      
      // Ignorar AbortError - é esperado quando operações de vídeo/áudio são interrompidas
      if (errorInfo.isAbortError) {
        // Log apenas em modo debug, não como erro crítico
        console.debug('[APP][GLOBAL_ERROR] ⚠️ AbortError em promise (suprimido - inofensivo)', {
          message: event.reason?.message || String(event.reason),
          name: event.reason?.name
        });
        // Prevenir que o erro seja propagado (não é crítico)
        event.preventDefault();
        return;
      }
      
      console.error('[APP][GLOBAL_ERROR] ❌ Promise rejeitada não tratada', errorInfo);
      
      // Tratar erros de DOM (removeChild, insertBefore, etc)
      if (errorInfo.isDOMError) {
        const errorType = errorInfo.isInsertBeforeError ? 'insertBefore' : 
                         errorInfo.isRemoveChildError ? 'removeChild' : 'DOM';
        
        // Verificar se é durante uma transição crítica
        const isCriticalTransition = window.location.pathname === '/login' || 
                                     window.location.pathname === '/company-select' ||
                                     errorInfo.url?.includes('/login') ||
                                     errorInfo.url?.includes('/company-select');
        
        // Detectar navegadores móveis antigos
        const isOldMobileBrowser = /Android [1-4]|iPhone OS [1-9]_|Mobile Safari\/[1-9][0-9][0-9]/.test(navigator.userAgent);
        const isWebView = /wv|WebView/.test(navigator.userAgent);
        
        if (isCriticalTransition) {
          console.error(`[APP][GLOBAL_ERROR] ⚠️ Erro de ${errorType} em promise durante transição crítica`, {
            message: event.reason?.message || String(event.reason),
            userAgent: navigator.userAgent,
            errorType,
            stack: event.reason?.stack,
            isOldMobileBrowser,
            isWebView
          });
          
          // Em navegadores móveis antigos, suprimir o erro mesmo em transições críticas
          if (isOldMobileBrowser || isWebView) {
            console.warn(`[APP][GLOBAL_ERROR] ⚠️ Suprimindo erro de ${errorType} em promise em navegador móvel antigo`);
            event.preventDefault();
            return;
          }
        } else {
          console.warn(`[APP][GLOBAL_ERROR] ⚠️ Erro de ${errorType} em promise (contexto não crítico)`, {
            message: event.reason?.message || String(event.reason),
            userAgent: navigator.userAgent,
            errorType,
            isOldMobileBrowser,
            isWebView
          });
          // Prevenir que o erro seja propagado apenas em contextos não críticos
          event.preventDefault();
          return;
        }
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {/* <Toaster /> */}
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <CompanyProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/company-select" element={
                <ProtectedRoute>
                  <CompanySelect />
                </ProtectedRoute>
              } />
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/cadastros" element={<CadastrosIndex />} />
                <Route path="/cadastros/empresas" element={<Empresas />} />
                <Route path="/cadastros/usuarios" element={<Usuarios />} />
                <Route path="/cadastros/perfis" element={<Perfis />} />
                <Route path="/cadastros/vinculos-usuario-empresa" element={<UserCompanies />} />
                <Route path="/cadastros/centros-custo" element={<CentrosCusto />} />
                <Route path="/cadastros/projetos" element={<Projetos />} />
                <Route path="/cadastros/parceiros" element={<Parceiros />} />
                <Route path="/cadastros/servicos" element={<Servicos />} />
                <Route path="/cadastros/departamentos" element={<UnitsPageNew />} />
                <Route path="/permissoes" element={<Permissions />} />
                <Route path="/menu-test" element={<MenuTest />} />
                <Route path="/financeiro" element={<DashboardFinanceiroPage />} />
                <Route path="/financeiro/contas-pagar" element={<ContasPagarPage />} />
                <Route path="/financeiro/contas-receber" element={<ContasReceberPage />} />
                <Route path="/financeiro/lotes-pagamento" element={<LotesPagamentoPage />} />
                <Route path="/financeiro/tesouraria" element={<TesourariaPage />} />
                <Route path="/financeiro/conciliacao-bancaria" element={<ConciliacaoBancariaPage />} />
                <Route path="/financeiro/parametrizacao-tributaria" element={<ParametrizacaoTributariaPage />} />
                <Route path="/financeiro/obrigacoes-fiscais" element={<ObrigacoesFiscaisPage />} />
                <Route path="/financeiro/fiscal" element={<FiscalPage />} />
                <Route path="/financeiro/contabilidade" element={<ContabilidadePage />} />
                <Route path="/financeiro/classes-financeiras" element={<ClassesFinanceirasPage />} />
                <Route path="/financeiro/sefaz" element={<SefazPage />} />
                <Route path="/financeiro/bancaria" element={<BancariaPage />} />
                <Route path="/financeiro/governanca" element={<GovernancaPlanejamentoPage />} />
                <Route path="/compras" element={<RequisicoesCompra />} />
                <Route path="/compras/requisicoes" element={<RequisicoesCompra />} />
                <Route path="/compras/cotacoes" element={<Cotacoes />} />
                <Route path="/compras/pedidos" element={<PedidosCompra />} />
                <Route path="/compras/follow-up" element={<FollowUpCompras />} />
                <Route path="/compras/fornecedores" element={<AvaliacaoFornecedores />} />
                <Route path="/compras/contratos" element={<ContratosRecorrentes />} />
                <Route path="/compras/historico" element={<HistoricoCompras />} />
                <Route path="/almoxarifado" element={<AlmoxarifadoPage />} />
                <Route path="/almoxarifado/dashboard" element={<DashboardEstoquePage />} />
                <Route path="/almoxarifado/estoque" element={<EstoqueAtualPage />} />
                <Route path="/almoxarifado/materiais" element={<MateriaisEquipamentosPage />} />
                <Route path="/almoxarifado/entradas" element={<EntradasMateriaisPage />} />
                <Route path="/almoxarifado/saidas" element={<SaidasTransferenciasPage />} />
                <Route path="/almoxarifado/inventario" element={<InventarioPage />} />
                <Route path="/almoxarifado/checklist" element={<div className="text-2xl font-bold">Checklist de Recebimento - Em desenvolvimento</div>} />
                <Route path="/almoxarifado/historico" element={<HistoricoMovimentacoesPage />} />
                <Route path="/almoxarifado/relatorios" element={<RelatoriosPage />} />
                <Route path="/almoxarifado/almoxarifados" element={<AlmoxarifadosPage />} />
                <Route path="/almoxarifado/localizacoes" element={<LocalizacoesFisicasPage />} />
                <Route path="/almoxarifado/test" element={<TestPage />} />
                <Route path="/frota/*" element={<FrotaRoutes />} />
                <Route path="/logistica/*" element={<LogisticaRoutes />} />
                <Route path="/rh/*" element={<RHRoutesNew />} />
                <Route path="/portal-colaborador/*" element={<PortalColaboradorRoutes />} />
                <Route path="/portal-gestor/*" element={<PortalGestorRoutes />} />
                <Route path="/test-portal" element={<TestPortal />} />
                <Route path="/debug-permissions" element={<DebugPermissions />} />
                <Route path="/combustivel/*" element={<CombustivelRoutes />} />
                <Route path="/metalurgica/*" element={<MetalurgicaRoutes />} />
                <Route path="/comercial" element={<div className="text-2xl font-bold">Comercial - Em desenvolvimento</div>} />
                <Route path="/implantacao" element={<div className="text-2xl font-bold">Implantação - Em desenvolvimento</div>} />
                <Route path="/configuracoes" element={<Permissions />} />
                <Route path="/configuracoes/aprovacoes" element={<ConfiguracoesAprovacaoPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
