import React from "react";
import { Toaster } from "@/components/ui/toaster";
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
import ConfiguracoesAprovacaoPage from "./pages/configuracoes/ConfiguracoesAprovacaoPage";
// Imports das páginas de Compras
import RequisicoesCompra from "./pages/Compras/RequisicoesCompra";
import Cotacoes from "./pages/Compras/Cotacoes";
import PedidosCompra from "./pages/Compras/PedidosCompra";
import AvaliacaoFornecedores from "./pages/Compras/AvaliacaoFornecedores";
import ContratosRecorrentes from "./pages/Compras/ContratosRecorrentes";
import HistoricoCompras from "./pages/Compras/HistoricoCompras";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
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
                <Route path="/financeiro" element={<FinancialPage />} />
                <Route path="/financeiro/contas-pagar" element={<FinancialPage />} />
                <Route path="/financeiro/contas-receber" element={<FinancialPage />} />
                <Route path="/financeiro/tesouraria" element={<FinancialPage />} />
                <Route path="/financeiro/fiscal" element={<FinancialPage />} />
                <Route path="/financeiro/contabilidade" element={<FinancialPage />} />
                <Route path="/financeiro/configuracoes" element={<FinancialPage />} />
                <Route path="/financeiro/configuracoes/sefaz" element={<FinancialPage />} />
                <Route path="/financeiro/configuracoes/bancaria" element={<FinancialPage />} />
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
                <Route path="/almoxarifado/test" element={<TestPage />} />
                <Route path="/frota" element={<div className="text-2xl font-bold">Frota - Em desenvolvimento</div>} />
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
