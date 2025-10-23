import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  Filter
} from 'lucide-react';
import { useCompensationRequests } from '@/hooks/rh/useCompensationRequests';
import { useCompany } from '@/lib/company-context';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// COMPONENTE DE RELATÓRIOS AVANÇADOS
// =====================================================

interface ReportFilters {
  period: string;
  status: string;
  type: string;
  employee: string;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export function CompensationReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'last-6-months',
    status: 'all',
    type: 'all',
    employee: 'all'
  });
  
  const { selectedCompany } = useCompany();
  const { data: compensations = [], isLoading } = useCompensationRequests();

  // Filtrar dados baseado nos filtros
  const filteredData = useMemo(() => {
    let filtered = [...compensations];

    // Filtro por período
    if (filters.period !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.period) {
        case 'last-month':
          startDate = subMonths(now, 1);
          break;
        case 'last-3-months':
          startDate = subMonths(now, 3);
          break;
        case 'last-6-months':
          startDate = subMonths(now, 6);
          break;
        case 'last-year':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(comp => 
        new Date(comp.created_at) >= startDate
      );
    }

    // Filtro por status
    if (filters.status !== 'all') {
      filtered = filtered.filter(comp => comp.status === filters.status);
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(comp => comp.tipo === filters.type);
    }

    return filtered;
  }, [compensations, filters]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = filteredData.length;
    const approved = filteredData.filter(c => c.status === 'aprovado').length;
    const pending = filteredData.filter(c => c.status === 'pendente').length;
    const rejected = filteredData.filter(c => c.status === 'rejeitado').length;
    const realized = filteredData.filter(c => c.status === 'realizado').length;
    
    const totalHours = filteredData.reduce((sum, c) => sum + (c.quantidade_horas || 0), 0);
    const approvedHours = filteredData
      .filter(c => c.status === 'aprovado')
      .reduce((sum, c) => sum + (c.quantidade_horas || 0), 0);

    return {
      total,
      approved,
      pending,
      rejected,
      realized,
      totalHours,
      approvedHours,
      approvalRate: total > 0 ? (approved / total) * 100 : 0
    };
  }, [filteredData]);

  // Dados por status
  const statusData: ChartData[] = useMemo(() => [
    { label: 'Aprovadas', value: stats.approved, color: '#10b981' },
    { label: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { label: 'Rejeitadas', value: stats.rejected, color: '#ef4444' },
    { label: 'Realizadas', value: stats.realized, color: '#3b82f6' }
  ], [stats]);

  // Dados por tipo
  const typeData: ChartData[] = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    filteredData.forEach(comp => {
      const type = comp.tipo || 'outros';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    return Array.from(typeMap.entries()).map(([type, count]) => ({
      label: type.replace('_', ' ').toUpperCase(),
      value: count
    }));
  }, [filteredData]);

  // Dados mensais
  const monthlyData: ChartData[] = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    
    filteredData.forEach(comp => {
      const month = format(new Date(comp.created_at), 'MMM/yyyy', { locale: ptBR });
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ label: month, value: count }))
      .sort((a, b) => {
        const dateA = new Date(a.label.split('/')[1], parseInt(a.label.split('/')[0]) - 1);
        const dateB = new Date(b.label.split('/')[1], parseInt(b.label.split('/')[0]) - 1);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredData]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportReport = () => {
    // Implementar exportação de relatório
    console.log('Exportando relatório...', { filters, stats, filteredData });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando relatórios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros do Relatório</span>
            </CardTitle>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="last-month">Último mês</SelectItem>
                  <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                  <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
                  <SelectItem value="last-year">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="banco_horas">Banco de Horas</SelectItem>
                  <SelectItem value="horas_extras">Horas Extras</SelectItem>
                  <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                  <SelectItem value="dsr">DSR</SelectItem>
                  <SelectItem value="feriado">Feriado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Funcionário</label>
              <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {/* Implementar lista de funcionários */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Solicitações</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Aprovação</p>
                <p className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Totais</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Aprovadas</p>
                <p className="text-2xl font-bold">{stats.approvedHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Por Status</TabsTrigger>
          <TabsTrigger value="type">Por Tipo</TabsTrigger>
          <TabsTrigger value="monthly">Evolução Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Distribuição por Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statusData.map((item) => (
                  <div key={item.label} className="text-center">
                    <div 
                      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.value}
                    </div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">
                      {stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="type">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Distribuição por Tipo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {typeData.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Evolução Mensal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ 
                            width: `${monthlyData.length > 0 ? (item.value / Math.max(...monthlyData.map(d => d.value))) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
