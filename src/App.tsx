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
import CentrosCusto from "./pages/cadastros/CentrosCusto";
import Projetos from "./pages/cadastros/Projetos";
import Parceiros from "./pages/cadastros/Parceiros";
import Materiais from "./pages/cadastros/Materiais";
import AccountsPayable from "./pages/financeiro/AccountsPayable";
import AccountsReceivable from "./pages/financeiro/AccountsReceivable";
import BankAccounts from "./pages/financeiro/BankAccounts";
import CashFlow from "./pages/financeiro/CashFlow";
import Permissions from "./pages/Permissions";
import { MenuTest } from "./components/MenuTest";
import NotFound from "./pages/NotFound";
import { RHRoutesNew } from "./pages/rh/routesNew";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                <Route path="/cadastros/centros-custo" element={<CentrosCusto />} />
                <Route path="/cadastros/projetos" element={<Projetos />} />
                <Route path="/cadastros/parceiros" element={<Parceiros />} />
                <Route path="/cadastros/materiais" element={<Materiais />} />
                <Route path="/permissoes" element={<Permissions />} />
                <Route path="/menu-test" element={<MenuTest />} />
                <Route path="/financeiro/contas-pagar" element={<AccountsPayable />} />
                <Route path="/financeiro/contas-receber" element={<AccountsReceivable />} />
                <Route path="/financeiro/contas-bancarias" element={<BankAccounts />} />
                <Route path="/financeiro/fluxo-caixa" element={<CashFlow />} />
                <Route path="/compras" element={<div className="text-2xl font-bold">Compras - Em desenvolvimento</div>} />
                <Route path="/almoxarifado" element={<div className="text-2xl font-bold">Almoxarifado - Em desenvolvimento</div>} />
                <Route path="/frota" element={<div className="text-2xl font-bold">Frota - Em desenvolvimento</div>} />
                <Route path="/logistica" element={<div className="text-2xl font-bold">Logística - Em desenvolvimento</div>} />
                <Route path="/rh/*" element={<RHRoutesNew />} />
                <Route path="/combustivel" element={<div className="text-2xl font-bold">Combustível - Em desenvolvimento</div>} />
                <Route path="/metalurgica" element={<div className="text-2xl font-bold">Metalúrgica - Em desenvolvimento</div>} />
                <Route path="/comercial" element={<div className="text-2xl font-bold">Comercial - Em desenvolvimento</div>} />
                <Route path="/implantacao" element={<div className="text-2xl font-bold">Implantação - Em desenvolvimento</div>} />
                <Route path="/configuracoes" element={<Permissions />} />
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
