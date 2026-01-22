import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Package,
  DollarSign,
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useEstoqueAtual, useEstoqueKPIs } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const DashboardEstoquePage: React.FC = () => {
  const { canReadPage } = usePermissions();
  const { data: estoque = [], isLoading: estoqueLoading, refetch: refetchEstoque } = useEstoqueAtual();
  const { data: kpis, isLoading: kpisLoading } = useEstoqueKPIs();
  const { data: materiais = [], isLoading: materiaisLoading } = useMateriaisEquipamentos();

  const loading = estoqueLoading || kpisLoading || materiaisLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <RequirePage pagePath="/almoxarifado/estoque*" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <BarChart3 className="inline-block mr-3 h-8 w-8" />
          Dashboard de Estoque
        </h1>
        <p className="text-gray-600">
          Visão geral dos indicadores e KPIs do almoxarifado
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Carregando dados do estoque...</span>
        </div>
      )}

      {/* KPIs Principais */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Estoque</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.valor_total_estoque)}</div>
              <p className="text-xs text-muted-foreground">
                +0% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_materiais}</div>
              <p className="text-xs text-muted-foreground">
                Materiais cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens em Ruptura</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{kpis.itens_ruptura}</div>
              <p className="text-xs text-muted-foreground">
                Necessitam reposição
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Giro de Estoque</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.giro_estoque.toFixed(1)}x</div>
              <p className="text-xs text-muted-foreground">
                Vezes por mês
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas e Notificações */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Alertas de Validade
              </CardTitle>
              <CardDescription>
                Itens próximos do vencimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{kpis.alertas_validade > 0 ? `${kpis.alertas_validade} itens próximos do vencimento` : 'Nenhum item próximo do vencimento'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-blue-500" />
                Solicitações de Compra
              </CardTitle>
              <CardDescription>
                Itens que atingiram estoque mínimo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{kpis.itens_ruptura > 0 ? `${kpis.itens_ruptura} itens precisam de reposição` : 'Nenhuma solicitação pendente'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos e Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Movimentação Mensal</CardTitle>
            <CardDescription>
              Entradas e saídas dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Gráfico em desenvolvimento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Materiais por Valor</CardTitle>
            <CardDescription>
              Materiais com maior valor em estoque
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Relatório em desenvolvimento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Iniciar Inventário
              </Button>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Relatório Mensal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </RequirePage>
  );
};

export default DashboardEstoquePage;
