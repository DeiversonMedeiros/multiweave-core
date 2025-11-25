// =====================================================
// PÁGINA: DASHBOARD FINANCEIRO
// =====================================================
// Data: 2025-01-15
// Descrição: Dashboard principal do módulo financeiro
// Autor: Sistema MultiWeave Core

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Banknote,
  Receipt,
  Calculator
} from 'lucide-react';
import { useAuthorization } from '@/hooks/useAuthorization';
import { RequireModule } from '@/components/RequireAuth';
import { useCompany } from '@/lib/company-context';
import { useFinanceiroData } from '@/hooks/generic/useEntityData';

interface DashboardFinanceiroPageProps {
  className?: string;
}

export function DashboardFinanceiroPage({ className }: DashboardFinanceiroPageProps) {
  const { checkModulePermission } = useAuthorization();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState({
    canViewContasPagar: false,
    canViewContasReceber: false,
    canViewTesouraria: false,
    canViewFiscal: false,
    canViewContabilidade: false
  });

  // Carregar dados financeiros
  const { data: contasPagar, isLoading: loadingPagar } = useFinanceiroData('contas_pagar', selectedCompany?.id || '');
  const { data: contasReceber, isLoading: loadingReceber } = useFinanceiroData('contas_receber', selectedCompany?.id || '');
  const { data: contasBancarias, isLoading: loadingBancarias } = useFinanceiroData('contas_bancarias', selectedCompany?.id || '');

  // Calcular métricas do dashboard
  const dashboardData = useMemo(() => {
    if (!contasPagar || !contasReceber) {
      return {
        totalPagar: 0,
        totalReceber: 0,
        saldoCaixa: 0,
        contasPendentes: 0,
        contasVencidas: 0,
        dso: 0,
        dpo: 0,
      };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Contas a Pagar
    const contasPagarPendentes = contasPagar.filter(cp => 
      cp.status === 'pendente' || cp.status === 'aprovado'
    );
    const totalPagar = contasPagarPendentes.reduce((sum, cp) => sum + (cp.valor_atual || 0), 0);
    const contasVencidasPagar = contasPagar.filter(cp => {
      if (!cp.data_vencimento) return false;
      const dataVenc = new Date(cp.data_vencimento);
      dataVenc.setHours(0, 0, 0, 0);
      return (cp.status === 'pendente' || cp.status === 'aprovado') && dataVenc < hoje;
    });

    // Contas a Receber
    const contasReceberPendentes = contasReceber.filter(cr => 
      cr.status === 'pendente'
    );
    const totalReceber = contasReceberPendentes.reduce((sum, cr) => sum + (cr.valor_atual || 0), 0);
    const contasVencidasReceber = contasReceber.filter(cr => {
      if (!cr.data_vencimento) return false;
      const dataVenc = new Date(cr.data_vencimento);
      dataVenc.setHours(0, 0, 0, 0);
      return cr.status === 'pendente' && dataVenc < hoje;
    });

    // Saldo de Caixa (soma dos saldos das contas bancárias)
    const saldoCaixa = contasBancarias?.reduce((sum, cb) => sum + (cb.saldo_atual || 0), 0) || 0;

    // Calcular DSO (Dias de Vendas) - simplificado
    const totalRecebido = contasReceber
      .filter(cr => cr.status === 'recebido' && cr.data_recebimento)
      .reduce((sum, cr) => sum + (cr.valor_atual || 0), 0);
    const mediaDiaria = totalRecebido / 30; // Últimos 30 dias
    const dso = mediaDiaria > 0 ? totalReceber / mediaDiaria : 0;

    // Calcular DPO (Dias de Pagamento) - simplificado
    const totalPago = contasPagar
      .filter(cp => cp.status === 'pago' && cp.data_pagamento)
      .reduce((sum, cp) => sum + (cp.valor_atual || 0), 0);
    const mediaDiariaPagar = totalPago / 30; // Últimos 30 dias
    const dpo = mediaDiariaPagar > 0 ? totalPagar / mediaDiariaPagar : 0;

    return {
      totalPagar,
      totalReceber,
      saldoCaixa,
      contasPendentes: contasPagarPendentes.length,
      contasVencidas: contasVencidasPagar.length + contasVencidasReceber.length,
      dso: Math.round(dso * 10) / 10,
      dpo: Math.round(dpo * 10) / 10,
    };
  }, [contasPagar, contasReceber, contasBancarias]);

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
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
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
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">
              Visão geral das principais métricas financeiras
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingPagar ? (
                  <div className="text-2xl font-bold text-muted-foreground">Carregando...</div>
                ) : (
                  <>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboardData.totalPagar)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.contasPendentes} contas pendentes
                </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingReceber ? (
                  <div className="text-2xl font-bold text-muted-foreground">Carregando...</div>
                ) : (
                  <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.totalReceber)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recebimentos previstos
                </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo de Caixa</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingBancarias ? (
                  <div className="text-2xl font-bold text-muted-foreground">Carregando...</div>
                ) : (
                  <>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.saldoCaixa)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Disponível para pagamentos
                </p>
                  </>
                )}
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
                    onClick={() => navigate('/financeiro/contas-pagar')}
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
                    onClick={() => navigate('/financeiro/contas-receber')}
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
                    onClick={() => navigate('/financeiro/tesouraria')}
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
                    onClick={() => navigate('/financeiro/fiscal')}
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
                    onClick={() => navigate('/financeiro/contabilidade')}
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
                {permissions.canViewContabilidade && (
                  <button
                    onClick={() => navigate('/financeiro/classes-financeiras')}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Classes Financeiras</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Classes gerenciais e vinculação com contas contábeis
                    </p>
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequireModule>
  );
}

