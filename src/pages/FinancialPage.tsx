// =====================================================
// PÁGINA: MÓDULO FINANCEIRO
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal do módulo financeiro
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building, 
  FileText,
  BarChart3,
  Settings,
  CreditCard,
  Receipt,
  Banknote,
  Calculator
} from 'lucide-react';
import { ContasPagarPage } from '@/components/financial/ContasPagarPage';
import { ContasReceberPage } from '@/components/financial/ContasReceberPage';
import { TesourariaPage } from '@/components/financial/TesourariaPage';
import { FiscalPage } from '@/components/financial/FiscalPage';
import { ContabilidadePage } from '@/components/financial/ContabilidadePage';
import { ConfiguracaoSefazPage } from '@/components/financial/ConfiguracaoSefazPage';
import { ConfiguracaoBancariaPage } from '@/components/financial/ConfiguracaoBancariaPage';
import { useAuthorization } from '@/hooks/useAuthorization';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface FinancialPageProps {
  className?: string;
}

export function FinancialPage({ className }: FinancialPageProps) {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { checkModulePermission } = useAuthorization();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [permissions, setPermissions] = useState({
    canViewContasPagar: false,
    canViewContasReceber: false,
    canViewTesouraria: false,
    canViewFiscal: false,
    canViewContabilidade: false
  });

  // Detectar aba ativa baseada na URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/financeiro' || path === '/financeiro/') {
      setActiveTab('dashboard');
    } else if (path === '/financeiro/contas-pagar') {
      setActiveTab('contas-pagar');
    } else if (path === '/financeiro/contas-receber') {
      setActiveTab('contas-receber');
    } else if (path === '/financeiro/tesouraria') {
      setActiveTab('tesouraria');
    } else if (path === '/financeiro/fiscal') {
      setActiveTab('fiscal');
    } else if (path === '/financeiro/contabilidade') {
      setActiveTab('contabilidade');
    }
  }, [location.pathname]);

  // Carregar permissões
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const [
          canViewContasPagar,
          canViewContasReceber,
          canViewTesouraria,
          canViewFiscal,
          canViewContabilidade
        ] = await Promise.all([
          checkModulePermission('financeiro', 'read'),
          checkModulePermission('financeiro', 'read'),
          checkModulePermission('financeiro', 'read'),
          checkModulePermission('financeiro', 'read'),
          checkModulePermission('financeiro', 'read')
        ]);

        setPermissions({
          canViewContasPagar,
          canViewContasReceber,
          canViewTesouraria,
          canViewFiscal,
          canViewContabilidade
        });

        // Debug: Log das permissões
        console.log('Permissões Financeiro:', {
          canViewContasPagar,
          canViewContasReceber,
          canViewTesouraria,
          canViewFiscal,
          canViewContabilidade
        });
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        // Em caso de erro, negar acesso por segurança
        setPermissions({
          canViewContasPagar: false,
          canViewContasReceber: false,
          canViewTesouraria: false,
          canViewFiscal: false,
          canViewContabilidade: false
        });
      }
    };

    loadPermissions();
  }, [checkModulePermission]);

  // Dados mockados para o dashboard
  const dashboardData = {
    totalPagar: 125000.00,
    totalReceber: 180000.00,
    saldoCaixa: 55000.00,
    contasPendentes: 15,
    contasVencidas: 3,
    dso: 25.5,
    dpo: 18.2,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <RequireModule moduleName="financeiro" action="read">
      <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo Financeiro</h1>
          <p className="text-muted-foreground">
            Gerencie contas a pagar/receber, tesouraria, fiscal e contabilidade
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Settings className="h-3 w-3 mr-1" />
          Configurações
        </Badge>
      </div>


      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="contas-pagar" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewContasPagar}
          >
            <TrendingDown className="h-4 w-4" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger 
            value="contas-receber" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewContasReceber}
          >
            <TrendingUp className="h-4 w-4" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger 
            value="tesouraria" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewTesouraria}
          >
            <Banknote className="h-4 w-4" />
            Tesouraria
          </TabsTrigger>
          <TabsTrigger 
            value="fiscal" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewFiscal}
          >
            <Receipt className="h-4 w-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger 
            value="contabilidade" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewContabilidade}
          >
            <Calculator className="h-4 w-4" />
            Contabilidade
          </TabsTrigger>
          <TabsTrigger 
            value="config-sefaz" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewFiscal}
          >
            <Settings className="h-4 w-4" />
            SEFAZ
          </TabsTrigger>
          <TabsTrigger 
            value="config-bancaria" 
            className="flex items-center gap-2"
            disabled={!permissions.canViewTesouraria}
          >
            <Building className="h-4 w-4" />
            Bancária
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(dashboardData.totalPagar)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.contasPendentes} contas pendentes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardData.totalReceber)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recebimentos previstos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo de Caixa</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(dashboardData.saldoCaixa)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disponível para pagamentos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {dashboardData.contasVencidas}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requerem atenção imediata
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Indicadores Financeiros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Indicadores Financeiros</CardTitle>
                  <CardDescription>
                    Principais métricas de performance financeira
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DSO (Dias de Vendas)</span>
                    <span className="text-sm font-bold">{dashboardData.dso} dias</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DPO (Dias de Pagamento)</span>
                    <span className="text-sm font-bold">{dashboardData.dpo} dias</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fluxo de Caixa Líquido</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(dashboardData.totalReceber - dashboardData.totalPagar)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                  <CardDescription>
                    Acesso rápido às principais funcionalidades
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {permissions.canViewContasPagar && (
                    <button
                      onClick={() => setActiveTab('contas-pagar')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Contas a Pagar</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gerencie contas a pagar e aprovações
                      </p>
                    </button>
                  )}
                  {permissions.canViewContasReceber && (
                    <button
                      onClick={() => setActiveTab('contas-receber')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Contas a Receber</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gerencie contas a receber e cobrança
                      </p>
                    </button>
                  )}
                  {permissions.canViewTesouraria && (
                    <button
                      onClick={() => setActiveTab('tesouraria')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Tesouraria</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Conciliação bancária e fluxo de caixa
                      </p>
                    </button>
                  )}
                  {permissions.canViewFiscal && (
                    <button
                      onClick={() => setActiveTab('fiscal')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Fiscal</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        NF-e, NFS-e e integração SEFAZ
                      </p>
                    </button>
                  )}
                  {permissions.canViewContabilidade && (
                    <button
                      onClick={() => setActiveTab('contabilidade')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Contabilidade</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Plano de contas, lançamentos e SPED
                      </p>
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contas-pagar" className="mt-6">
                      {permissions.canViewContasPagar ? (
            <ContasPagarPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar contas a pagar.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contas-receber" className="mt-6">
                      {permissions.canViewContasReceber ? (
            <ContasReceberPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar contas a receber.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tesouraria" className="mt-6">
                      {permissions.canViewTesouraria ? (
            <TesourariaPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar tesouraria.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
                      {permissions.canViewFiscal ? (
            <FiscalPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar o módulo fiscal.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contabilidade" className="mt-6">
                      {permissions.canViewContabilidade ? (
            <ContabilidadePage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar o módulo contabilidade.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config-sefaz" className="mt-6">
          {permissions.canViewFiscal ? (
            <ConfiguracaoSefazPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar as configurações SEFAZ.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config-bancaria" className="mt-6">
          {permissions.canViewTesouraria ? (
            <ConfiguracaoBancariaPage />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem permissão para acessar as configurações bancárias.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </RequireModule>
  );
}

