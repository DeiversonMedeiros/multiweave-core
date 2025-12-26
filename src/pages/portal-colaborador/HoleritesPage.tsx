import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download,
  Calendar,
  DollarSign,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Payroll, PayrollEvent, Employee } from '@/integrations/supabase/rh-types';
import { toast } from 'sonner';
import { generatePayslipPDF, downloadPayslip } from '@/services/rh/payslipService';
import { usePayrollEvents } from '@/hooks/rh/usePayrollCalculation';

export default function HoleritesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar contracheques
  const { data: payrollSlips, isLoading } = useQuery({
    queryKey: ['payroll-slips', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'mes_referencia',
        orderDirection: 'DESC'
      });
      
      // Adicionar dados do funcionário a cada folha
      return result.data.map(slip => ({
        ...slip,
        employee: employee
      }));
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Visualizar folha
  const handleView = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setIsViewDialogOpen(true);
  };

  // Ver em PDF
  const handleViewPDF = async (payroll: Payroll) => {
    if (!selectedCompany?.id || !employee) {
      toast.error('Dados insuficientes para gerar o contracheque');
      return;
    }

    try {
      toast.loading('Gerando contracheque em PDF...', { id: 'generate-pdf' });

      // Buscar eventos da folha
      const { getPayrollEvents } = await import('@/services/rh/payrollCalculationService');
      const eventsResult = await getPayrollEvents(selectedCompany.id, payroll.id);
      const events = eventsResult.data || [];

      // Gerar PDF
      const blob = await generatePayslipPDF({
        payroll,
        employee,
        events,
        company: {
          name: selectedCompany.nome || 'Empresa',
          cnpj: selectedCompany.cnpj,
          address: selectedCompany.endereco
        }
      });

      // Fazer download
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[(payroll.mes_referencia || 1) - 1];
      const filename = `Contracheque_${employee.nome}_${monthName}_${payroll.ano_referencia}.html`;
      
      downloadPayslip(blob, filename);
      
      toast.success('Contracheque gerado com sucesso!', { id: 'generate-pdf' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar contracheque em PDF', { id: 'generate-pdf' });
    }
  };

  const handleDownload = async (slipId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('holerites')
        .download(fileName);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar contracheque:', error);
      toast.error('Erro ao baixar contracheque');
    }
  };

  if (isLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contracheques</h1>
        <p className="text-gray-600">
          Visualize e baixe seus contracheques
        </p>
      </div>

      {/* Lista de contracheques */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Contracheques</CardTitle>
          <CardDescription>
            Histórico de contracheques disponíveis para download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payrollSlips && payrollSlips.length > 0 ? (
            <div className="space-y-4">
              {payrollSlips.map((slip) => (
                <div
                  key={slip.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Contracheque - {slip.mes_referencia.toString().padStart(2, '0')}/{slip.ano_referencia}
                      </p>
                      <p className="text-sm text-gray-600">
                        Salário líquido: R$ {slip.salario_liquido?.toFixed(2) || '0,00'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Processado em {new Date(slip.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {slip.status === 'processado' ? 'Disponível' : 'Processando'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(slip)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewPDF(slip)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver em PDF
                    </Button>
                    {slip.arquivo_pdf && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(slip.id, slip.arquivo_pdf)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum contracheque encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização de Detalhes */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Contracheque
            </DialogTitle>
            <DialogDescription>
              Visualize os detalhes completos do seu contracheque
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && employee && (
            <PayrollDetailsView payroll={selectedPayroll} employee={employee} />
          )}
        </DialogContent>
      </Dialog>
    </div>
    );
}

// =====================================================
// COMPONENTE DE VISUALIZAÇÃO DE DETALHES
// =====================================================

function PayrollDetailsView({ payroll, employee }: { payroll: Payroll; employee: Employee }) {
  const { selectedCompany } = useCompany();
  const { data: eventsData, isLoading: isLoadingEvents } = usePayrollEvents(payroll.id);
  const events = eventsData?.data || [];

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthNames[(payroll.mes_referencia || 1) - 1];

  const proventos = events.filter(e => e.tipo_rubrica === 'provento');
  const descontos = events.filter(e => e.tipo_rubrica === 'desconto');

  const formatCurrency = (value: number) => {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Funcionário</p>
              <p className="font-medium">{employee.nome || 'N/A'}</p>
              {employee.matricula && (
                <p className="text-xs text-muted-foreground">Matrícula: {employee.matricula}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">{monthName}/{payroll.ano_referencia}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={
                payroll.status === 'pago' ? 'default' :
                payroll.status === 'processado' ? 'outline' :
                payroll.status === 'cancelado' ? 'destructive' : 'secondary'
              }>
                {payroll.status === 'pago' ? 'Pago' :
                 payroll.status === 'processado' ? 'Processado' :
                 payroll.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
              </Badge>
            </div>
            {payroll.data_pagamento && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                <p className="font-medium">
                  {new Date(payroll.data_pagamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Valores Resumidos */}
      <Card>
        <CardHeader>
          <CardTitle>Valores Resumidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Salário Base</p>
              <p className="text-lg font-bold">R$ {formatCurrency(payroll.salario_base || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vencimentos</p>
              <p className="text-lg font-bold text-green-600">
                R$ {formatCurrency(payroll.total_vencimentos || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Descontos</p>
              <p className="text-lg font-bold text-red-600">
                R$ {formatCurrency(payroll.total_descontos || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salário Líquido</p>
              <p className="text-lg font-bold text-blue-600">
                R$ {formatCurrency(payroll.salario_liquido || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horas Trabalhadas */}
      {(payroll.horas_trabalhadas || payroll.horas_extras) && (
        <Card>
          <CardHeader>
            <CardTitle>Horas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {payroll.horas_trabalhadas && (
                <div>
                  <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                  <p className="text-lg font-medium">{payroll.horas_trabalhadas}h</p>
                </div>
              )}
              {payroll.horas_extras && payroll.horas_extras > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Horas Extras</p>
                  <p className="text-lg font-medium">{payroll.horas_extras}h</p>
                </div>
              )}
              {payroll.valor_horas_extras && payroll.valor_horas_extras > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor Horas Extras</p>
                  <p className="text-lg font-medium">R$ {formatCurrency(payroll.valor_horas_extras)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proventos */}
      {proventos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proventos.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{event.descricao_rubrica}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {event.codigo_rubrica}
                      {event.quantidade && event.quantidade !== 1 && ` • Qtd: ${event.quantidade}`}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    R$ {formatCurrency(event.valor_total || 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descontos */}
      {descontos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Descontos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {descontos.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{event.descricao_rubrica}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {event.codigo_rubrica}
                      {event.quantidade && event.quantidade !== 1 && ` • Qtd: ${event.quantidade}`}
                    </p>
                  </div>
                  <p className="font-bold text-red-600">
                    R$ {formatCurrency(event.valor_total || 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingEvents && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Carregando eventos...</p>
        </div>
      )}

      {!isLoadingEvents && events.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum evento registrado para esta folha</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
