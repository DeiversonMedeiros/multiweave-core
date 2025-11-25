import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Laptop, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  DollarSign,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquipmentRentals } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { 
  useMonthlyPayments, 
  useApproveMonthlyPayment, 
  useRejectMonthlyPayment 
} from '@/hooks/rh/useEquipmentRentalMonthlyPayments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AprovacaoEquipamentos: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);
  
  // Estados para pagamentos mensais
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentAprovacaoObservacoes, setPaymentAprovacaoObservacoes] = useState('');
  const [paymentRejeicaoObservacoes, setPaymentRejeicaoObservacoes] = useState('');
  const [paymentValorAprovado, setPaymentValorAprovado] = useState<string>('');
  const [isPaymentAprovacaoDialogOpen, setIsPaymentAprovacaoDialogOpen] = useState(false);
  const [isPaymentRejeicaoDialogOpen, setIsPaymentRejeicaoDialogOpen] = useState(false);
  const [monthReference, setMonthReference] = useState<number>(new Date().getMonth() + 1);
  const [yearReference, setYearReference] = useState<number>(new Date().getFullYear());

  const { selectedCompany } = useCompany();
  const { equipments, loading, error, approveEquipment, rejectEquipment } = useEquipmentRentals(selectedCompany?.id || '');
  
  // Hooks para pagamentos mensais
  const { data: monthlyPayments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useMonthlyPayments({
    monthReference,
    yearReference,
    status: 'pendente_aprovacao'
  });
  const approveMonthlyPayment = useApproveMonthlyPayment();
  const rejectMonthlyPayment = useRejectMonthlyPayment();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'ativo': return 'bg-blue-100 text-blue-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Laptop className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ativo': return <Laptop className="h-4 w-4 text-blue-600" />;
      case 'finalizado': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  const filteredEquipments = equipments.filter(equipment => {
    const matchesSearch = equipment.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || equipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (equipment: any) => {
    setSelectedEquipment(equipment);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (equipment: any) => {
    setSelectedEquipment(equipment);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    if (selectedEquipment) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }
        
        await approveEquipment(selectedEquipment.id, user.id, aprovacaoObservacoes);
        setIsAprovacaoDialogOpen(false);
        setSelectedEquipment(null);
      } catch (error) {
        console.error('Erro ao aprovar equipamento:', error);
        alert(error instanceof Error ? error.message : 'Erro ao aprovar equipamento');
      }
    }
  };

  const confirmarRejeicao = async () => {
    if (selectedEquipment && rejeicaoObservacoes.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }
        
        await rejectEquipment(selectedEquipment.id, user.id, rejeicaoObservacoes);
        setIsRejeicaoDialogOpen(false);
        setSelectedEquipment(null);
      } catch (error) {
        console.error('Erro ao rejeitar equipamento:', error);
        alert(error instanceof Error ? error.message : 'Erro ao rejeitar equipamento');
      }
    }
  };

  const getEquipamentosPendentes = () => {
    return equipments.filter(e => e.status === 'pendente').length;
  };

  // Handlers para pagamentos mensais
  const handleAprovarPagamento = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentValorAprovado(payment.valor_calculado.toString());
    setPaymentAprovacaoObservacoes('');
    setIsPaymentAprovacaoDialogOpen(true);
  };

  const handleRejeitarPagamento = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentRejeicaoObservacoes('');
    setIsPaymentRejeicaoDialogOpen(true);
  };

  const confirmarAprovacaoPagamento = async () => {
    if (selectedPayment) {
      try {
        await approveMonthlyPayment.mutateAsync({
          paymentId: selectedPayment.id,
          valorAprovado: paymentValorAprovado ? parseFloat(paymentValorAprovado) : undefined,
          observacoes: paymentAprovacaoObservacoes
        });
        setIsPaymentAprovacaoDialogOpen(false);
        setSelectedPayment(null);
        refetchPayments();
        alert('Pagamento aprovado com sucesso!');
      } catch (error) {
        console.error('Erro ao aprovar pagamento:', error);
        alert(error instanceof Error ? error.message : 'Erro ao aprovar pagamento');
      }
    }
  };

  const confirmarRejeicaoPagamento = async () => {
    if (selectedPayment && paymentRejeicaoObservacoes.trim()) {
      try {
        await rejectMonthlyPayment.mutateAsync({
          paymentId: selectedPayment.id,
          observacoes: paymentRejeicaoObservacoes
        });
        setIsPaymentRejeicaoDialogOpen(false);
        setSelectedPayment(null);
        refetchPayments();
        alert('Pagamento rejeitado com sucesso!');
      } catch (error) {
        console.error('Erro ao rejeitar pagamento:', error);
        alert(error instanceof Error ? error.message : 'Erro ao rejeitar pagamento');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (

    <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando equipamentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar equipamentos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações e pagamentos mensais de aluguel de equipamentos da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-600">
            {getEquipamentosPendentes()} Pendentes
          </Badge>
          {monthlyPayments.length > 0 && (
            <Badge variant="outline" className="text-orange-600">
              <Clock className="h-3 w-3 mr-1" />
              {monthlyPayments.length} Pagamentos Mensais
            </Badge>
          )}
          <Button onClick={() => navigate('/portal-gestor/aprovacoes')}>
            Voltar para Central
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="solicitacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitacoes">
            Solicitações de Aluguel
            {getEquipamentosPendentes() > 0 && (
              <Badge className="ml-2">{getEquipamentosPendentes()}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagamentos">
            Pagamentos Mensais
            {monthlyPayments.length > 0 && (
              <Badge className="ml-2">{monthlyPayments.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Solicitações de Aluguel */}
        <TabsContent value="solicitacoes" className="space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredEquipments.length} solicitação(ões) de equipamento encontrada(s)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredEquipments.map((equipment) => (
            <Card key={equipment.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Laptop className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{equipment.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {equipment.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {equipment.tipo_equipamento} • R$ {equipment.valor_mensal.toFixed(2)}/mês
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Início: {new Date(equipment.data_inicio).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {equipment.data_fim && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Fim: {new Date(equipment.data_fim).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Justificativa:</strong> {equipment.justificativa}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em: {new Date(equipment.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(equipment.status)}
                      <Badge className={getStatusColor(equipment.status)}>
                        {equipment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEquipment(equipment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {equipment.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(equipment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(equipment)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEquipments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de equipamento encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Equipamento</DialogTitle>
            <DialogDescription>
              Confirme a aprovação do equipamento de {selectedEquipment?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEquipment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedEquipment.funcionario_nome}</p>
                <p><strong>Equipamento:</strong> {selectedEquipment.tipo_equipamento}</p>
                <p><strong>Valor:</strong> R$ {selectedEquipment.valor_mensal.toFixed(2)}/mês</p>
                <p><strong>Início:</strong> {new Date(selectedEquipment.data_inicio).toLocaleDateString('pt-BR')}</p>
                {selectedEquipment.data_fim && (
                  <p><strong>Fim:</strong> {new Date(selectedEquipment.data_fim).toLocaleDateString('pt-BR')}</p>
                )}
                <p><strong>Justificativa:</strong> {selectedEquipment.justificativa}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Adicione observações sobre a aprovação..."
                value={aprovacaoObservacoes}
                onChange={(e) => setAprovacaoObservacoes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAprovacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovacao} className="bg-green-600 hover:bg-green-700">
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Equipamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do equipamento de {selectedEquipment?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEquipment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedEquipment.funcionario_nome}</p>
                <p><strong>Equipamento:</strong> {selectedEquipment.tipo_equipamento}</p>
                <p><strong>Valor:</strong> R$ {selectedEquipment.valor_mensal.toFixed(2)}/mês</p>
                <p><strong>Início:</strong> {new Date(selectedEquipment.data_inicio).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={rejeicaoObservacoes}
                onChange={(e) => setRejeicaoObservacoes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarRejeicao} 
              variant="destructive"
              disabled={!rejeicaoObservacoes.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        {/* Tab: Pagamentos Mensais */}
        <TabsContent value="pagamentos" className="space-y-6">
          {/* Filtros para Pagamentos Mensais */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros - Pagamentos Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
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
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <div className="text-sm text-muted-foreground pt-2">
                    {format(new Date(yearReference, monthReference - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pagamentos Mensais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {monthlyPayments.length} pagamento(s) mensal(is) pendente(s) de aprovação
              </h2>
            </div>

            {isLoadingPayments ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Carregando pagamentos...</p>
                </CardContent>
              </Card>
            ) : monthlyPayments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum pagamento mensal pendente de aprovação para o período selecionado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {monthlyPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="font-semibold">
                              {payment.employee?.nome || 'N/A'}
                            </h3>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pendente Aprovação
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-2">
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
                          </div>
                          
                          <div className="mt-2">
                            <span className="font-medium text-foreground">Valor Calculado: </span>
                            <span className="font-semibold text-lg text-foreground">
                              {formatCurrency(payment.valor_calculado)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAprovarPagamento(payment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitarPagamento(payment)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Aprovação de Pagamento Mensal */}
      <Dialog open={isPaymentAprovacaoDialogOpen} onOpenChange={setIsPaymentAprovacaoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Pagamento Mensal</DialogTitle>
            <DialogDescription>
              Confirme a aprovação do pagamento mensal de {selectedPayment?.employee?.nome || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedPayment.employee?.nome || 'N/A'}</p>
                <p><strong>Equipamento:</strong> {selectedPayment.equipment_rental?.tipo_equipamento || 'N/A'}</p>
                <p><strong>Período:</strong> {format(new Date(selectedPayment.year_reference, selectedPayment.month_reference - 1, 1), 'MMMM yyyy', { locale: ptBR })}</p>
                <p><strong>Valor Calculado:</strong> {formatCurrency(selectedPayment.valor_calculado)}</p>
                <p><strong>Dias Trabalhados:</strong> {selectedPayment.dias_trabalhados}</p>
                <p><strong>Desconto:</strong> {formatCurrency(selectedPayment.desconto_ausencia)}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Aprovado (opcional)</label>
              <Input
                type="number"
                step="0.01"
                placeholder={selectedPayment?.valor_calculado.toString()}
                value={paymentValorAprovado}
                onChange={(e) => setPaymentValorAprovado(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para aprovar o valor calculado automaticamente
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Adicione observações sobre a aprovação..."
                value={paymentAprovacaoObservacoes}
                onChange={(e) => setPaymentAprovacaoObservacoes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentAprovacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarAprovacaoPagamento} 
              className="bg-green-600 hover:bg-green-700"
              disabled={approveMonthlyPayment.isPending}
            >
              {approveMonthlyPayment.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Pagamento Mensal */}
      <Dialog open={isPaymentRejeicaoDialogOpen} onOpenChange={setIsPaymentRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pagamento Mensal</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do pagamento de {selectedPayment?.employee?.nome || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedPayment.employee?.nome || 'N/A'}</p>
                <p><strong>Equipamento:</strong> {selectedPayment.equipment_rental?.tipo_equipamento || 'N/A'}</p>
                <p><strong>Valor Calculado:</strong> {formatCurrency(selectedPayment.valor_calculado)}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={paymentRejeicaoObservacoes}
                onChange={(e) => setPaymentRejeicaoObservacoes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarRejeicaoPagamento} 
              variant="destructive"
              disabled={!paymentRejeicaoObservacoes.trim() || rejectMonthlyPayment.isPending}
            >
              {rejectMonthlyPayment.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AprovacaoEquipamentos;
