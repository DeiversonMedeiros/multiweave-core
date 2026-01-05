import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useOrdensProducao } from '@/hooks/metalurgica/useOrdensProducao';
import { useOrdensServico } from '@/hooks/metalurgica/useOrdensServico';
import { useLotes } from '@/hooks/metalurgica/useLotes';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';
import { useMemo } from 'react';
import { ProducaoCharts } from '@/components/metalurgica/ProducaoCharts';

const DashboardMetalurgicaPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { canReadModule } = usePermissions();
  
  const { data: opsData, isLoading: opsLoading } = useOrdensProducao();
  const { data: osData, isLoading: osLoading } = useOrdensServico();
  const { data: lotesData, isLoading: lotesLoading } = useLotes();

  const ops = opsData?.data || [];
  const os = osData?.data || [];
  const lotes = lotesData?.data || [];

  const loading = opsLoading || osLoading || lotesLoading;

  // Calcular KPIs
  const kpis = useMemo(() => {
    const opsEmProducao = ops.filter(op => op.status === 'em_producao').length;
    const opsConcluidas = ops.filter(op => op.status === 'concluida').length;
    const osEmProducao = os.filter(os => os.status === 'em_producao').length;
    const lotesAguardandoInspecao = lotes.filter(l => l.status === 'aguardando_inspecao').length;
    const lotesAprovados = lotes.filter(l => l.status === 'aprovado').length;
    
    const totalProducao = ops.reduce((acc, op) => acc + op.quantidade_produzida, 0);
    const totalPeso = lotes.reduce((acc, l) => acc + (l.peso_total_kg || 0), 0);

    return {
      opsEmProducao,
      opsConcluidas,
      osEmProducao,
      lotesAguardandoInspecao,
      lotesAprovados,
      totalProducao,
      totalPeso,
    };
  }, [ops, os, lotes]);

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Factory className="inline-block mr-3 h-8 w-8" />
            Dashboard Metalúrgica
          </h1>
          <p className="text-gray-600">
            Visão geral da produção e indicadores do módulo metalúrgica
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando dados...</span>
          </div>
        )}

        {/* KPIs Principais */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OPs em Produção</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.opsEmProducao}</div>
                <p className="text-xs text-muted-foreground">
                  Ordens de produção ativas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OPs Concluídas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{kpis.opsConcluidas}</div>
                <p className="text-xs text-muted-foreground">
                  Total concluídas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes Aguardando Inspeção</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{kpis.lotesAguardandoInspecao}</div>
                <p className="text-xs text-muted-foreground">
                  Aguardando qualidade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Produzido (kg)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalPeso.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Peso total em produção
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cards de Ação Rápida */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Ordens de Produção
                </CardTitle>
                <CardDescription>
                  Gerenciar OPs e produção de produtos finais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Em produção:</span>
                    <span className="font-semibold">{kpis.opsEmProducao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Concluídas:</span>
                    <span className="font-semibold text-green-600">{kpis.opsConcluidas}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Factory className="h-5 w-5 mr-2" />
                  Ordens de Serviço
                </CardTitle>
                <CardDescription>
                  Gerenciar OSs e produção de semiacabados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Em produção:</span>
                    <span className="font-semibold">{kpis.osEmProducao}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Controle de Qualidade
                </CardTitle>
                <CardDescription>
                  Inspeções e certificados de qualidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Aguardando inspeção:</span>
                    <span className="font-semibold text-orange-600">{kpis.lotesAguardandoInspecao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Aprovados:</span>
                    <span className="font-semibold text-green-600">{kpis.lotesAprovados}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos */}
        {!loading && (
          <div className="mb-8">
            <ProducaoCharts ops={ops} os={os} lotes={lotes} />
          </div>
        )}

        {/* Alertas */}
        {!loading && kpis.lotesAguardandoInspecao > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Atenção: Lotes Aguardando Inspeção
              </CardTitle>
              <CardDescription className="text-orange-700">
                {kpis.lotesAguardandoInspecao} {kpis.lotesAguardandoInspecao === 1 ? 'lote aguarda' : 'lotes aguardam'} inspeção de qualidade
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </RequireModule>
  );
};

export default DashboardMetalurgicaPage;

