import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BookOpen,
  UserCheck,
  ClipboardCheck,
  FileText
} from 'lucide-react';
import { useReports, useReportExport } from '@/hooks/rh/useReports';
import { useCompany } from '@/lib/company-context';
import ParticipationReport from './ParticipationReport';
import CertificateReport from './CertificateReport';

interface ReportsDashboardProps {
  onFilterChange: (filters: any) => void;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onFilterChange }) => {
  const { selectedCompany } = useCompany();
  const { 
    stats, 
    monthlyTrends, 
    isLoadingStats, 
    isLoadingTrends 
  } = useReports(selectedCompany?.id || '');
  const { exportToCSV, exportToPDF } = useReportExport();
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: 'all',
    status: 'all'
  });

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      // Exportar dados atuais
      const data = [
        { metric: 'Total de Treinamentos', value: stats?.total_trainings || 0 },
        { metric: 'Treinamentos Concluídos', value: stats?.completed_trainings || 0 },
        { metric: 'Total de Inscrições', value: stats?.total_enrollments || 0 },
        { metric: 'Taxa de Presença', value: `${stats?.average_attendance_percentage || 0}%` },
        { metric: 'Certificados Emitidos', value: stats?.total_certificates || 0 }
      ];
      exportToCSV(data, 'relatorio_treinamentos');
    } else {
      exportToPDF([], 'relatorio_treinamentos');
    }
  };

  if (isLoadingStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Dashboard de Relatórios
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="ti">TI</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Treinamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treinamentos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_trainings || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.completed_trainings || 0} concluídos
            </div>
            <div className="mt-2 flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats?.active_trainings || 0} ativos
            </div>
          </CardContent>
        </Card>

        {/* Inscrições */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_enrollments || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.approved_enrollments || 0} aprovadas
            </div>
            <div className="mt-2 flex items-center text-xs text-yellow-600">
              <Users className="h-3 w-3 mr-1" />
              {stats?.pending_enrollments || 0} pendentes
            </div>
          </CardContent>
        </Card>

        {/* Presença */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presença</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_attendance_percentage || 0}%</div>
            <div className="text-xs text-muted-foreground">
              {stats?.present_records || 0} presentes
            </div>
            <div className="mt-2 flex items-center text-xs text-red-600">
              <Users className="h-3 w-3 mr-1" />
              {stats?.absent_records || 0} ausentes
            </div>
          </CardContent>
        </Card>

        {/* Certificados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_certificates || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.valid_certificates || 0} válidos
            </div>
            <div className="mt-2 flex items-center text-xs text-orange-600">
              <FileText className="h-3 w-3 mr-1" />
              {stats?.expired_certificates || 0} expirados
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Relatórios */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="participation">Participação</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resumo de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Conclusão</span>
                    <span className="text-2xl font-bold text-green-600">
                      {stats?.total_trainings ? 
                        Math.round((stats.completed_trainings / stats.total_trainings) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Aprovação</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {stats?.total_enrollments ? 
                        Math.round((stats.approved_enrollments / stats.total_enrollments) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Presença</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {stats?.average_attendance_percentage || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Certificação</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {stats?.total_enrollments ? 
                        Math.round((stats.total_certificates / stats.total_enrollments) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status dos Treinamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Status dos Treinamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Concluídos</span>
                    </div>
                    <span className="font-bold">{stats?.completed_trainings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Ativos</span>
                    </div>
                    <span className="font-bold">{stats?.active_trainings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Cancelados</span>
                    </div>
                    <span className="font-bold">{stats?.cancelled_trainings || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participation">
          <ParticipationReport />
        </TabsContent>

        <TabsContent value="certificates">
          <CertificateReport />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTrends ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyTrends?.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{trend.month}</div>
                        <div className="text-sm text-gray-500">
                          {trend.trainings} treinamentos • {trend.enrollments} inscrições • {trend.certificates} certificados
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{trend.attendance_rate}%</div>
                        <div className="text-xs text-gray-500">presença</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsDashboard;
