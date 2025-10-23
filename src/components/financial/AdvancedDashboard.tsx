// =====================================================
// COMPONENTE: DASHBOARD AVANÇADO
// =====================================================
// Data: 2025-01-15
// Descrição: Dashboard avançado com relatórios personalizados
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Download, 
  RefreshCw, 
  Filter, 
  Settings,
  Eye,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  CreditCard,
  Banknote,
  Receipt,
  Calculator
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { reportsService } from '@/services/financial/reportsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdvancedDashboardProps {
  className?: string;
}

interface DashboardData {
  kpis: Array<{
    id: string;
    titulo: string;
    valor: number;
    valor_anterior: number;
    variacao: number;
    variacao_percentual: number;
    tendencia: 'alta' | 'baixa' | 'estavel';
    cor: string;
    icone: string;
    unidade: string;
  }>;
  graficos: Array<{
    id: string;
    tipo: 'linha' | 'barra' | 'pizza' | 'area' | 'coluna';
    titulo: string;
    dados: any[];
    eixos: { x: string; y: string };
    cores?: string[];
    legenda?: boolean;
  }>;
  tabelas: Array<{
    id: string;
    titulo: string;
    colunas: string[];
    dados: any[][];
    totalizadores?: Record<string, number>;
  }>;
  alertas: Array<{
    id: string;
    tipo: 'info' | 'warning' | 'error' | 'success';
    titulo: string;
    mensagem: string;
    acao?: string;
    prioridade: 'baixa' | 'media' | 'alta';
    data_criacao: string;
  }>;
}

export function AdvancedDashboard({ className }: AdvancedDashboardProps) {
  const { selectedCompany } = useCompany();
  const { checkModulePermission } = useAuthorization();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('30');
  const [filtros, setFiltros] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Verificar permissões
  const canViewReports = checkModulePermission('financeiro', 'read');

  // Carregar dados do dashboard
  const loadDashboard = async () => {
    if (!selectedCompany?.id || !canViewReports) return;

    try {
      setLoading(true);
      setError(null);

      const config = {
        company_id: selectedCompany.id,
        periodo_inicio: getPeriodoInicio(periodo),
        periodo_fim: new Date().toISOString().split('T')[0],
        filtros,
      };

      const data = await reportsService.gerarDashboard(config);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Obter data de início baseada no período
  const getPeriodoInicio = (periodo: string): string => {
    const hoje = new Date();
    const dias = parseInt(periodo);
    const dataInicio = new Date(hoje.getTime() - (dias * 24 * 60 * 60 * 1000));
    return dataInicio.toISOString().split('T')[0];
  };

  // Carregar dados quando a empresa ou período mudar
  useEffect(() => {
    loadDashboard();
  }, [selectedCompany?.id, periodo, filtros]);

  // Exportar relatório
  const handleExport = async (formato: 'pdf' | 'excel' | 'csv') => {
    if (!selectedCompany?.id) return;

    try {
      const config = {
        company_id: selectedCompany.id,
        periodo_inicio: getPeriodoInicio(periodo),
        periodo_fim: new Date().toISOString().split('T')[0],
        filtros,
        formato,
      };

      const blob = await reportsService.exportarRelatorio('dashboard', config, formato);
      
      // Download do arquivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_financeiro_${new Date().toISOString().split('T')[0]}.${formato}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
    }
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Formatar percentual
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Obter ícone do KPI
  const getKpiIcon = (icone: string) => {
    const icons = {
      'trending-up': TrendingUp,
      'trending-down': TrendingDown,
      'dollar-sign': DollarSign,
      'users': Users,
      'building': Building,
      'credit-card': CreditCard,
      'banknote': Banknote,
      'receipt': Receipt,
      'calculator': Calculator,
    };
    const Icon = icons[icone as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  // Obter cor do KPI
  const getKpiColor = (cor: string) => {
    const colors = {
      green: 'text-green-600',
      red: 'text-red-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
    };
    return colors[cor as keyof typeof colors] || 'text-gray-600';
  };

  // Obter ícone de tendência
  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'alta':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'baixa':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dashboard: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral e relatórios personalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {dashboardData.alertas.length > 0 && (
        <div className="space-y-2">
          {dashboardData.alertas.map((alerta) => (
            <Alert key={alerta.id} variant={alerta.tipo === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alerta.titulo}</p>
                    <p className="text-sm">{alerta.mensagem}</p>
                  </div>
                  {alerta.acao && (
                    <Button variant="outline" size="sm">
                      {alerta.acao}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardData.kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.titulo}</CardTitle>
              <div className={`${getKpiColor(kpi.cor)}`}>
                {getKpiIcon(kpi.icone)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.unidade === 'R$' ? formatCurrency(kpi.valor) : kpi.valor.toLocaleString()}
                {kpi.unidade !== 'R$' && ` ${kpi.unidade}`}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon(kpi.tendencia)}
                <span className={kpi.variacao >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercent(kpi.variacao_percentual)}
                </span>
                <span>vs período anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs de Relatórios */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="tabelas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tabelas
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
                <CardDescription>
                  Principais indicadores do período
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.kpis.slice(0, 4).map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`${getKpiColor(kpi.cor)}`}>
                        {getKpiIcon(kpi.icone)}
                      </div>
                      <span className="text-sm font-medium">{kpi.titulo}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {kpi.unidade === 'R$' ? formatCurrency(kpi.valor) : kpi.valor.toLocaleString()}
                        {kpi.unidade !== 'R$' && ` ${kpi.unidade}`}
                      </p>
                      <p className={`text-xs ${kpi.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(kpi.variacao_percentual)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Alertas e Notificações */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas e Notificações</CardTitle>
                <CardDescription>
                  Itens que requerem atenção
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.alertas.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>Nenhum alerta no momento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.alertas.map((alerta) => (
                      <div key={alerta.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`mt-1 ${
                          alerta.tipo === 'error' ? 'text-red-600' :
                          alerta.tipo === 'warning' ? 'text-yellow-600' :
                          alerta.tipo === 'success' ? 'text-green-600' :
                          'text-blue-600'
                        }`}>
                          {alerta.tipo === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                           alerta.tipo === 'warning' ? <Clock className="h-4 w-4" /> :
                           alerta.tipo === 'success' ? <CheckCircle className="h-4 w-4" /> :
                           <Activity className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{alerta.titulo}</p>
                          <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
                          <Badge variant="outline" className="mt-1">
                            {alerta.prioridade}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="graficos" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboardData.graficos.map((grafico) => (
              <Card key={grafico.id}>
                <CardHeader>
                  <CardTitle>{grafico.titulo}</CardTitle>
                  <CardDescription>
                    {grafico.tipo === 'linha' && 'Gráfico de linha'}
                    {grafico.tipo === 'barra' && 'Gráfico de barras'}
                    {grafico.tipo === 'pizza' && 'Gráfico de pizza'}
                    {grafico.tipo === 'area' && 'Gráfico de área'}
                    {grafico.tipo === 'coluna' && 'Gráfico de colunas'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Gráfico {grafico.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {grafico.dados.length} pontos de dados
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tabelas */}
        <TabsContent value="tabelas" className="mt-6">
          <div className="space-y-6">
            {dashboardData.tabelas.map((tabela) => (
              <Card key={tabela.id}>
                <CardHeader>
                  <CardTitle>{tabela.titulo}</CardTitle>
                  <CardDescription>
                    {tabela.dados.length} registros encontrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          {tabela.colunas.map((coluna, index) => (
                            <th key={index} className="text-left p-2 font-medium">
                              {coluna}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tabela.dados.map((linha, index) => (
                          <tr key={index} className="border-b">
                            {linha.map((celula, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-sm">
                                {celula}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {tabela.totalizadores && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-end gap-4">
                        {Object.entries(tabela.totalizadores).map(([key, value]) => (
                          <div key={key} className="text-right">
                            <p className="text-sm font-medium">{key}</p>
                            <p className="text-lg font-bold">{formatCurrency(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configuracoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Dashboard</CardTitle>
              <CardDescription>
                Personalize a exibição dos dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Período Padrão</label>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="365">1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Formato de Moeda</label>
                  <Select defaultValue="BRL">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={loadDashboard}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aplicar Configurações
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações Avançadas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
