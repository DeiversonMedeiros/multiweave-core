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
import { FiscalPage } from "./pages/financeiro/FiscalPage";
import { ContabilidadePage } from "./pages/financeiro/ContabilidadePage";
import { ClassesFinanceirasPage } from "./pages/financeiro/ClassesFinanceirasPage";
import { SefazPage } from "./pages/financeiro/SefazPage";
import { BancariaPage } from "./pages/financeiro/BancariaPage";
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
// Imports das páginas de Frota
import FrotaRoutes from "./pages/frota/FrotaRoutes";

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
        isReactError: error?.stack?.includes('react') || error?.stack?.includes('React')
      };
      
      console.error('[APP][GLOBAL_ERROR] ❌ Erro global capturado', errorInfo);
      
      // Log especial para erros de removeChild (mas não interromper execução)
      // Erros de removeChild são geralmente inofensivos e ocorrem quando o React tenta
      // remover nós do DOM que já foram removidos pelo Leaflet ou outros componentes
      // Isso é comum em dispositivos mais antigos com navegadores que têm problemas
      // com a reconciliação do DOM do React
      if (errorInfo.isRemoveChildError) {
        // Log apenas em modo debug, não como erro crítico
        // Suprimir completamente o erro em dispositivos antigos para melhor UX
        console.warn('[APP][GLOBAL_ERROR] ⚠️ Erro de removeChild detectado (suprimido - inofensivo)', {
          message: event.message,
          userAgent: navigator.userAgent,
          currentPath: window.location.pathname
        });
        // Prevenir que o erro seja propagado (não é crítico)
        event.preventDefault();
        event.stopPropagation();
        return false;
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
        isRemoveChildError: event.reason?.message?.includes('removeChild') || String(event.reason).includes('removeChild')
      };
      
      console.error('[APP][GLOBAL_ERROR] ❌ Promise rejeitada não tratada', errorInfo);
      
      if (errorInfo.isRemoveChildError) {
        // Log apenas em modo debug, não como erro crítico
        // Suprimir completamente o erro em dispositivos antigos para melhor UX
        console.warn('[APP][GLOBAL_ERROR] ⚠️ Erro de removeChild em promise (suprimido - inofensivo)', {
          message: event.reason?.message || String(event.reason),
          userAgent: navigator.userAgent
        });
        // Prevenir que o erro seja propagado (não é crítico)
        event.preventDefault();
        return;
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
                <Route path="/cadastros/departamentos" element={<UnitsPageNew />} />
                <Route path="/permissoes" element={<Permissions />} />
                <Route path="/menu-test" element={<MenuTest />} />
                <Route path="/financeiro" element={<DashboardFinanceiroPage />} />
                <Route path="/financeiro/contas-pagar" element={<ContasPagarPage />} />
                <Route path="/financeiro/contas-receber" element={<ContasReceberPage />} />
                <Route path="/financeiro/tesouraria" element={<TesourariaPage />} />
                <Route path="/financeiro/fiscal" element={<FiscalPage />} />
                <Route path="/financeiro/contabilidade" element={<ContabilidadePage />} />
                <Route path="/financeiro/classes-financeiras" element={<ClassesFinanceirasPage />} />
                <Route path="/financeiro/sefaz" element={<SefazPage />} />
                <Route path="/financeiro/bancaria" element={<BancariaPage />} />
                <Route path="/compras" element={<RequisicoesCompra />} />
                <Route path="/compras/requisicoes" element={<RequisicoesCompra />} />
                <Route path="/compras/cotacoes" element={<Cotacoes />} />
                <Route path="/compras/pedidos" element={<PedidosCompra />} />
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
                <Route path="/logistica" element={<div className="text-2xl font-bold">Logística - Em desenvolvimento</div>} />
                <Route path="/rh/*" element={<RHRoutesNew />} />
                <Route path="/portal-colaborador/*" element={<PortalColaboradorRoutes />} />
                <Route path="/portal-gestor/*" element={<PortalGestorRoutes />} />
                <Route path="/test-portal" element={<TestPortal />} />
                <Route path="/debug-permissions" element={<DebugPermissions />} />
                <Route path="/combustivel" element={<div className="text-2xl font-bold">Combustível - Em desenvolvimento</div>} />
                <Route path="/metalurgica" element={<div className="text-2xl font-bold">Metalúrgica - Em desenvolvimento</div>} />
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
