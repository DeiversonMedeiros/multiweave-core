import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReports, useReportExport } from '@/hooks/rh/useReports';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface AnalyticsData {
  total_funcionarios: number;
  funcionarios_ativos: number;
  funcionarios_inativos: number;
  total_folhas: number;
  folhas_pagas: number;
  folhas_pendentes: number;
  total_horas_trabalhadas: number;
  total_horas_extras: number;
  total_ferias: number;
  total_licencas: number;
}

export default function AnalyticsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { toast } = useToast();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('');

  // Hooks
  const { stats, isLoading } = useReports('default-company-id');
  const { exportToCSV, exportToPDF } = useReportExport();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Simular carregamento de dados analíticos
      // Em produção, isso seria uma consulta complexa ao banco
      const mockData: AnalyticsData = {
        total_funcionarios: 150,
        funcionarios_ativos: 142,
        funcionarios_inativos: 8,
        total_folhas: 12,
        folhas_pagas: 10,
        folhas_pendentes: 2,
        total_horas_trabalhadas: 2840,
        total_horas_extras: 120,
        total_ferias: 25,
        total_licencas: 5
      };

      setAnalyticsData(mockData);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados analíticos: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  // Função removida - agora usando hooks

  const handleGenerateReport = async (reportType: string) => {
    try {
      // Simular geração de relatório
      const reportData = {
        nome: `Relatório ${reportType}`,
        tipo: reportType,
        periodo: new Date().toLocaleDateString('pt-BR'),
        data_geracao: new Date().toISOString()
      };

      // Exportar como CSV
      exportToCSV([reportData], `relatorio_${reportType}`);

      setShowReportDialog(false);
      
      toast({
        title: 'Relatório Gerado',
        description: 'O relatório foi gerado com sucesso!'
      });

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDownloadReport = (report: any) => {
    // Simular download
    toast({
      title: 'Download Iniciado',
      description: 'O relatório está sendo baixado.'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'gerado': 'default',
      'processando': 'secondary',
      'erro': 'destructive'
    } as const;

    const labels = {
      'gerado': 'Gerado',
      'processando': 'Processando',
      'erro': 'Erro'
    };

    return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-spin" />
          <p className="text-muted-foreground">Carregando dados analíticos...</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Relatórios</h1>
          <p className="text-muted-foreground">Análise de dados e geração de relatórios do RH</p>
        </div>
        <Button onClick={() => setShowReportDialog(true)}>
          <Download className="mr-2 h-4 w-4" />
          Gerar Relatório
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.total_funcionarios}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.funcionarios_ativos} ativos, {analyticsData?.funcionarios_inativos} inativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folhas de Pagamento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.total_folhas}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.folhas_pagas} pagas, {analyticsData?.folhas_pendentes} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.total_horas_trabalhadas}h</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.total_horas_extras}h extras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Férias e Licenças</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.total_ferias}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.total_licencas} licenças
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Análise de Funcionários
            </CardTitle>
            <CardDescription>
              Distribuição de funcionários por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Funcionários Ativos</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(analyticsData?.funcionarios_ativos || 0) / (analyticsData?.total_funcionarios || 1) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analyticsData?.funcionarios_ativos || 0) / (analyticsData?.total_funcionarios || 1) * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Funcionários Inativos</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(analyticsData?.funcionarios_inativos || 0) / (analyticsData?.total_funcionarios || 1) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analyticsData?.funcionarios_inativos || 0) / (analyticsData?.total_funcionarios || 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Status das Folhas
            </CardTitle>
            <CardDescription>
              Situação das folhas de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Folhas Pagas</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(analyticsData?.folhas_pagas || 0) / (analyticsData?.total_folhas || 1) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analyticsData?.folhas_pagas || 0) / (analyticsData?.total_folhas || 1) * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Folhas Pendentes</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${(analyticsData?.folhas_pendentes || 0) / (analyticsData?.total_folhas || 1) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analyticsData?.folhas_pendentes || 0) / (analyticsData?.total_folhas || 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Gerados</CardTitle>
          <CardDescription>
            Relatórios disponíveis para download
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Use o botão "Gerar Relatório" para criar novos relatórios</p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Geração de Relatório */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
            <DialogDescription>
              Selecione o tipo de relatório que deseja gerar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('funcionarios')}
                className="h-20 flex flex-col items-center justify-center"
              >
                <Users className="h-6 w-6 mb-2" />
                <span>Funcionários</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('folha')}
                className="h-20 flex flex-col items-center justify-center"
              >
                <DollarSign className="h-6 w-6 mb-2" />
                <span>Folha de Pagamento</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('horas')}
                className="h-20 flex flex-col items-center justify-center"
              >
                <Clock className="h-6 w-6 mb-2" />
                <span>Horas Trabalhadas</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('ferias')}
                className="h-20 flex flex-col items-center justify-center"
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span>Férias e Licenças</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
}
