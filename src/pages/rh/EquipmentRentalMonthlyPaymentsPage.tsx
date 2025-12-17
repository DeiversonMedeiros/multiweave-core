import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar,
  DollarSign,
  Search,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ExternalLink
} from 'lucide-react';
import { 
  useMonthlyPayments, 
  useProcessMonthlyRentals
} from '@/hooks/rh/useEquipmentRentalMonthlyPayments';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const EquipmentRentalMonthlyPaymentsPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [monthReference, setMonthReference] = useState<number>(new Date().getMonth() + 1);
  const [yearReference, setYearReference] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar pagamentos
  const { data: payments = [], isLoading, refetch } = useMonthlyPayments({
    monthReference,
    yearReference,
    status: statusFilter !== 'all' ? statusFilter as any : undefined
  });

  // Processar pagamentos mensais
  const processMonthlyRentals = useProcessMonthlyRentals();

  const handleProcessMonthlyRentals = async () => {
    if (!selectedCompany?.id) return;

    try {
      const count = await processMonthlyRentals.mutateAsync({
        monthReference,
        yearReference
      });
      
      toast.success(`${count} pagamentos mensais gerados com sucesso!`);
      refetch();
    } catch (error) {
      console.error('Erro ao processar pagamentos mensais:', error);
      toast.error('Erro ao processar pagamentos mensais');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente_aprovacao': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'enviado_flash': return 'bg-blue-100 text-blue-800';
      case 'boleto_gerado': return 'bg-purple-100 text-purple-800';
      case 'enviado_contas_pagar': return 'bg-indigo-100 text-indigo-800';
      case 'pago': return 'bg-emerald-100 text-emerald-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pendente_aprovacao': 'Pendente Aprovação',
      'aprovado': 'Aprovado',
      'rejeitado': 'Rejeitado',
      'enviado_flash': 'Enviado Flash',
      'boleto_gerado': 'Boleto Gerado',
      'enviado_contas_pagar': 'Enviado Contas a Pagar',
      'pago': 'Pago',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Filtrar por termo de busca
  const filteredPayments = payments.filter(payment => {
    const employeeName = payment.employee?.nome?.toLowerCase() || '';
    const equipmentType = payment.equipment_rental?.tipo_equipamento?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return employeeName.includes(search) || equipmentType.includes(search);
  });

  // Pagamentos aprovados (agora são enviados automaticamente para Flash)
  const approvedPayments = filteredPayments.filter(p => p.status === 'aprovado');
  const flashPayments = filteredPayments.filter(p => p.flash_payment_id != null);
  const invoicePayments = filteredPayments.filter(p => p.flash_invoice_id != null);

  const handleViewAccountsPayable = (accountsPayableId: string) => {
    navigate(`/financeiro/contas-pagar?conta=${accountsPayableId}`);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <RequireEntity entityName="payroll" action="read">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pagamentos Mensais de Aluguéis</h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos mensais de aluguéis de equipamentos e veículos
            </p>
          </div>
        </div>

        {/* Filtros e Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros e Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select 
                  value={monthReference.toString()} 
                  onValueChange={(value) => setMonthReference(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {format(new Date(2024, month - 1, 1), 'MMMM', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select 
                  value={yearReference.toString()} 
                  onValueChange={(value) => setYearReference(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    <SelectItem value="enviado_flash">Enviado Flash</SelectItem>
                    <SelectItem value="boleto_gerado">Boleto Gerado</SelectItem>
                    <SelectItem value="enviado_contas_pagar">Enviado Contas a Pagar</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Funcionário ou equipamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button
                  onClick={handleProcessMonthlyRentals}
                  disabled={processMonthlyRentals.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {processMonthlyRentals.isPending ? 'Processando...' : 'Gerar Pagamentos'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Lista de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pagamentos ({filteredPayments.length})
            </CardTitle>
            <CardDescription>
              Período: {format(new Date(yearReference, monthReference - 1, 1), 'MMMM yyyy', { locale: ptBR })} | 
              {approvedPayments.length > 0 && ` ${approvedPayments.length} Aprovado(s)`} | 
              {flashPayments.length > 0 && ` ${flashPayments.length} Enviado(s) Flash`} | 
              {invoicePayments.length > 0 && ` ${invoicePayments.length} Boleto(s) Gerado(s)`}
              {filteredPayments.filter(p => p.status === 'enviado_contas_pagar').length > 0 && ` | ${filteredPayments.filter(p => p.status === 'enviado_contas_pagar').length} Enviado(s) Contas a Pagar`}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Ao aprovar um pagamento, ele é automaticamente enviado para Flash, que gera o boleto e cria a conta a pagar.
                A conta a pagar passa pelo sistema de aprovações configurado em Configurações/Aprovações.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando pagamentos...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum pagamento encontrado para o período selecionado.
                </p>
                <Button
                  onClick={handleProcessMonthlyRentals}
                  className="mt-4"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Gerar Pagamentos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="font-semibold">
                              {payment.employee?.nome || 'N/A'}
                            </h3>
                            <Badge className={getStatusColor(payment.status)}>
                              {getStatusLabel(payment.status)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Equipamento:</span>{' '}
                              {payment.equipment_rental?.tipo_equipamento || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Valor Base:</span>{' '}
                              {formatCurrency(payment.valor_base)}
                            </div>
                            <div>
                              <span className="font-medium">Dias Trabalhados:</span>{' '}
                              {payment.dias_trabalhados}
                            </div>
                            <div>
                              <span className="font-medium">Desconto:</span>{' '}
                              {formatCurrency(payment.desconto_ausencia)}
                            </div>
                            <div>
                              <span className="font-medium">Valor Calculado:</span>{' '}
                              <span className="font-semibold text-foreground">
                                {formatCurrency(payment.valor_calculado)}
                              </span>
                            </div>
                            {payment.valor_aprovado && payment.valor_aprovado !== payment.valor_calculado && (
                              <div>
                                <span className="font-medium">Valor Aprovado:</span>{' '}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(payment.valor_aprovado)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Histórico de envios */}
                          {(payment.enviado_flash_em || payment.enviado_contas_pagar_em || payment.aprovado_em) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Histórico:</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {payment.aprovado_em && (
                                  <span>
                                    Aprovado em {format(new Date(payment.aprovado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                  </span>
                                )}
                                {payment.enviado_flash_em && (
                                  <span>
                                    • Enviado Flash em {format(new Date(payment.enviado_flash_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                    {payment.flash_payment_id && ` (${payment.flash_payment_id})`}
                                  </span>
                                )}
                                {payment.enviado_contas_pagar_em && (
                                  <span>
                                    • Enviado Contas a Pagar em {format(new Date(payment.enviado_contas_pagar_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                    {payment.accounts_payable_id && ` (ID: ${payment.accounts_payable_id.substring(0, 8)}...)`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          {payment.status === 'aprovado' && (
                            <>
                              {/* Status automático: após aprovação, envia para Flash automaticamente */}
                              {payment.flash_invoice_id && (
                                <Badge variant="outline" className="text-xs">
                                  Flash: {payment.flash_invoice_id.substring(0, 8)}...
                                </Badge>
                              )}
                              {payment.accounts_payable_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewAccountsPayable(payment.accounts_payable_id!)}
                                  title="Ver Conta a Pagar"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                            </>
                          )}
                          {payment.flash_invoice_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://flash-api.example.com/invoices/${payment.flash_invoice_id}`, '_blank')}
                              title="Ver Boleto Flash"
                            >
                              <ExternalLink className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </RequireEntity>
  );
};

export default EquipmentRentalMonthlyPaymentsPage;

