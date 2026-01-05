// =====================================================
// COMPONENTE: PÁGINA DE CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar contas a receber
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Calendar,
  Building,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  User,
  Building2,
  CreditCard,
  Tag,
  FileCheck,
  Percent,
  Info,
  X,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useContasReceber } from '@/hooks/financial/useContasReceber';
import { ContaReceberFormData } from '@/integrations/supabase/financial-types';
import { ContaReceberFilters } from './ContaReceberFilters';
import { ContaReceberForm } from './ContaReceberForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { useTesouraria } from '@/hooks/financial/useTesouraria';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import {
  DialogFooter,
} from '@/components/ui/dialog';

interface ContasReceberPageProps {
  className?: string;
}

export function ContasReceberPage({ className }: ContasReceberPageProps) {
  const { selectedCompany } = useCompany();
  const {
    contasReceber,
    loading,
    error,
    filters,
    setFilters,
    createContaReceber,
    updateContaReceber,
    deleteContaReceber,
    confirmContaReceber,
    receiveContaReceber,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canConfirm,
  } = useContasReceber();

  // Buscar dados relacionados
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  const { contasBancarias } = useTesouraria();
  const { data: classesFinanceirasData } = useClassesFinanceiras();

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [editingConta, setEditingConta] = useState<any>(null);
  const [receivingConta, setReceivingConta] = useState<any>(null);
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [dataRecebimento, setDataRecebimento] = useState<string>('');
  const [isReceiving, setIsReceiving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para dados relacionados da conta selecionada
  const [relatedData, setRelatedData] = useState<{
    centroCustoNome?: string;
    projetoNome?: string;
    classeFinanceiraNome?: string;
    contaBancariaNome?: string;
  }>({});

  // Filtrar contas por termo de busca
  const filteredContas = contasReceber.filter(conta =>
    conta.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.numero_titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estatísticas
  const stats = {
    total: contasReceber.length,
    pendentes: contasReceber.filter(c => c.status === 'pendente').length,
    confirmadas: contasReceber.filter(c => c.status === 'confirmado').length,
    recebidas: contasReceber.filter(c => c.status === 'recebido').length,
    vencidas: contasReceber.filter(c => c.status === 'vencido').length,
    valorTotal: contasReceber.reduce((sum, c) => sum + c.valor_atual, 0),
    valorPendente: contasReceber.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor_atual, 0),
    valorConfirmado: contasReceber.filter(c => c.status === 'confirmado').reduce((sum, c) => sum + c.valor_atual, 0),
  };

  // Handlers
  const handleCreate = () => {
    setEditingConta(null);
    setShowForm(true);
  };

  const handleEdit = (conta: any) => {
    if (conta.status === 'recebido') {
      alert('Não é possível editar uma conta que já foi recebida.');
      return;
    }
    setEditingConta(conta);
    setShowForm(true);
  };

  const handleView = (conta: any) => {
    setSelectedConta(conta);
    setShowDetails(true);
  };

  const handleDelete = async (conta: any) => {
    if (conta.status === 'recebido') {
      alert('Não é possível excluir uma conta que já foi recebida.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.numero_titulo}"?`)) {
      try {
        await deleteContaReceber(conta.id);
      } catch (error) {
        console.error('Erro ao deletar conta:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao excluir conta.';
        alert(errorMessage);
      }
    }
  };

  const handleConfirm = async (conta: any) => {
    try {
      await confirmContaReceber(conta.id);
    } catch (error) {
      console.error('Erro ao confirmar conta:', error);
    }
  };

  const handleReceive = (conta: any) => {
    setReceivingConta(conta);
    setValorRecebido(conta.valor_atual.toString());
    setDataRecebimento(format(new Date(), 'yyyy-MM-dd'));
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async () => {
    if (!receivingConta || !valorRecebido || !dataRecebimento) {
      return;
    }

    const valor = parseFloat(valorRecebido);
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }

    // Validar se nota fiscal está anexada e número informado
    if (!receivingConta.numero_nota_fiscal || !receivingConta.anexo_nota_fiscal) {
      alert('Não é possível marcar a conta como recebida sem anexar a nota fiscal e informar o número da nota fiscal. Por favor, edite a conta e adicione essas informações antes de recebê-la.');
      setShowReceiveModal(false);
      setReceivingConta(null);
      setValorRecebido('');
      setDataRecebimento('');
      return;
    }

    setIsReceiving(true);
    try {
      await receiveContaReceber(receivingConta.id, dataRecebimento, valor);
      setShowReceiveModal(false);
      setReceivingConta(null);
      setValorRecebido('');
      setDataRecebimento('');
    } catch (error) {
      console.error('Erro ao registrar recebimento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar recebimento. Por favor, tente novamente.';
      alert(errorMessage);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSave = async (data: ContaReceberFormData) => {
    try {
      if (editingConta) {
        if (editingConta.status === 'recebido') {
          alert('Não é possível editar uma conta que já foi recebida.');
          return;
        }
        await updateContaReceber(editingConta.id, data);
      } else {
        await createContaReceber(data);
      }
      setShowForm(false);
      setEditingConta(null);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao salvar conta.';
      alert(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      confirmado: { label: 'Confirmado', variant: 'default' as const, icon: CheckCircle },
      recebido: { label: 'Recebido', variant: 'success' as const, icon: CheckCircle },
      vencido: { label: 'Vencido', variant: 'destructive' as const, icon: XCircle },
      cancelado: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return formatDateOnly(date);
  };

  // Função para formatar timestamp (data com hora) sem problemas de timezone
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      // Extrair apenas a parte da data para evitar problemas de timezone
      const datePart = formatDateOnly(dateString);
      // Extrair hora local
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${datePart} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  // Buscar dados relacionados quando uma conta é selecionada
  useEffect(() => {
    async function loadRelatedData() {
      if (!selectedConta || !selectedCompany?.id) {
        setRelatedData({});
        return;
      }

      const data: typeof relatedData = {};

      // Buscar centro de custo
      if (selectedConta.centro_custo_id) {
        try {
          const centroCusto = costCentersData?.data?.find(cc => cc.id === selectedConta.centro_custo_id);
          if (centroCusto) {
            data.centroCustoNome = centroCusto.nome;
          } else {
            const result = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'cost_centers',
              id: selectedConta.centro_custo_id,
              companyId: selectedCompany.id
            });
            data.centroCustoNome = result?.nome;
          }
        } catch (err) {
          console.warn('Erro ao buscar centro de custo:', err);
        }
      }

      // Buscar projeto
      if (selectedConta.projeto_id) {
        try {
          const projeto = projectsData?.data?.find(p => p.id === selectedConta.projeto_id);
          if (projeto) {
            data.projetoNome = projeto.nome;
          } else {
            const result = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'projects',
              id: selectedConta.projeto_id,
              companyId: selectedCompany.id
            });
            data.projetoNome = result?.nome;
          }
        } catch (err) {
          console.warn('Erro ao buscar projeto:', err);
        }
      }

      // Buscar classe financeira
      if (selectedConta.classe_financeira) {
        try {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(selectedConta.classe_financeira)) {
            const classe = classesFinanceirasData?.data?.find(cf => cf.id === selectedConta.classe_financeira);
            if (classe) {
              data.classeFinanceiraNome = classe.codigo ? `${classe.codigo} - ${classe.nome}` : classe.nome;
            } else {
              const result = await EntityService.getById<{ id: string; nome: string; codigo?: string }>({
                schema: 'financeiro',
                table: 'classes_financeiras',
                id: selectedConta.classe_financeira,
                companyId: selectedCompany.id
              });
              data.classeFinanceiraNome = result?.codigo ? `${result.codigo} - ${result.nome}` : result?.nome;
            }
          } else {
            data.classeFinanceiraNome = selectedConta.classe_financeira;
          }
        } catch (err) {
          console.warn('Erro ao buscar classe financeira:', err);
        }
      }

      // Buscar conta bancária
      if (selectedConta.conta_bancaria_id) {
        try {
          const contaBancaria = contasBancarias?.find(cb => cb.id === selectedConta.conta_bancaria_id);
          if (contaBancaria) {
            data.contaBancariaNome = `${contaBancaria.banco} - ${contaBancaria.agencia}/${contaBancaria.conta}`;
          } else {
            const result = await EntityService.getById<{ id: string; banco: string; agencia: string; conta: string }>({
              schema: 'financeiro',
              table: 'contas_bancarias',
              id: selectedConta.conta_bancaria_id,
              companyId: selectedCompany.id
            });
            if (result) {
              data.contaBancariaNome = `${result.banco} - ${result.agencia}/${result.conta}`;
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar conta bancária:', err);
        }
      }

      setRelatedData(data);
    }

    loadRelatedData();
  }, [selectedConta, selectedCompany?.id, costCentersData, projectsData, classesFinanceirasData, contasBancarias]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contas a receber...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar contas a receber: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
          <p className="text-muted-foreground">
            Gerencie as contas a receber da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {canCreate && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendentes} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorPendente)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmadas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorConfirmado)} em valor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.recebidas}</div>
            <p className="text-xs text-muted-foreground">
              Recebimentos realizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, descrição ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta a receber encontrada.
              </div>
            ) : (
              filteredContas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{conta.numero_titulo}</span>
                      {getStatusBadge(conta.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{conta.cliente_nome}</span>
                      <span className="mx-2">•</span>
                      <span>{conta.descricao}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Venc: {formatDate(conta.data_vencimento)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(conta.valor_atual)}
                      </span>
                      {conta.numero_nota_fiscal && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          NF: {conta.numero_nota_fiscal}
                        </span>
                      )}
                      {conta.anexo_nota_fiscal && (
                        <span className="flex items-center gap-1 text-green-600">
                          <FileCheck className="h-3 w-3" />
                          NF Anexada
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(conta)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && conta.status !== 'recebido' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canConfirm && conta.status === 'pendente' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(conta)}
                        className="text-green-600 hover:text-green-700"
                        title="Confirmar conta"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && conta.status !== 'recebido' && conta.status !== 'cancelado' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleReceive(conta)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        title={
                          !conta.numero_nota_fiscal || !conta.anexo_nota_fiscal
                            ? "É necessário anexar a nota fiscal e informar o número antes de receber"
                            : "Marcar como recebida"
                        }
                        disabled={!conta.numero_nota_fiscal || !conta.anexo_nota_fiscal}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Receber
                      </Button>
                    )}
                    {canDelete && conta.status !== 'recebido' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(conta)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      {showForm && (
        <ContaReceberForm
          conta={editingConta}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingConta(null);
          }}
          loading={loading}
        />
      )}

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedConta && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      Detalhes da Conta a Receber
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      {selectedConta.numero_titulo} - {selectedConta.descricao}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConta.status)}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Número do Título
                      </label>
                      <p className="text-sm font-medium">{selectedConta.numero_titulo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <div className="mt-1">{getStatusBadge(selectedConta.status)}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Descrição
                      </label>
                      <p className="text-sm">{selectedConta.descricao || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Categoria
                      </label>
                      <p className="text-sm">{selectedConta.categoria || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Departamento
                      </label>
                      <p className="text-sm">{selectedConta.departamento || '-'}</p>
                    </div>
                    {selectedConta.numero_nota_fiscal && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Número da Nota Fiscal
                        </label>
                        <p className="text-sm font-medium">{selectedConta.numero_nota_fiscal}</p>
                      </div>
                    )}
                    {selectedConta.anexo_nota_fiscal && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Nota Fiscal Anexada
                        </label>
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex items-center gap-2"
                          >
                            <a
                              href={selectedConta.anexo_nota_fiscal}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="h-4 w-4" />
                              Visualizar Nota Fiscal
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Informações do Cliente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Nome do Cliente
                      </label>
                      <p className="text-sm font-medium">{selectedConta.cliente_nome || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        CNPJ/CPF
                      </label>
                      <p className="text-sm">{selectedConta.cliente_cnpj || '-'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Valores e Financeiro */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Valores e Financeiro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Valor Original
                      </label>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(selectedConta.valor_original)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Valor Atual
                      </label>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(selectedConta.valor_atual)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Valor Recebido
                      </label>
                      <p className="text-sm font-medium">
                        {formatCurrency(selectedConta.valor_recebido || 0)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Valor Restante
                      </label>
                      <p className="text-sm font-medium">
                        {formatCurrency(selectedConta.valor_atual - (selectedConta.valor_recebido || 0))}
                      </p>
                    </div>
                    {(selectedConta.valor_desconto > 0 || selectedConta.valor_juros > 0 || selectedConta.valor_multa > 0) && (
                      <>
                        {selectedConta.valor_desconto > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Desconto
                            </label>
                            <p className="text-sm text-green-600">
                              - {formatCurrency(selectedConta.valor_desconto)}
                            </p>
                          </div>
                        )}
                        {selectedConta.valor_juros > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Juros
                            </label>
                            <p className="text-sm text-red-600">
                              + {formatCurrency(selectedConta.valor_juros)}
                            </p>
                          </div>
                        )}
                        {selectedConta.valor_multa > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Multa
                            </label>
                            <p className="text-sm text-red-600">
                              + {formatCurrency(selectedConta.valor_multa)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Impostos */}
                {(selectedConta.valor_pis || selectedConta.valor_cofins || selectedConta.valor_csll || 
                  selectedConta.valor_ir || selectedConta.valor_inss || selectedConta.valor_iss) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Percent className="h-5 w-5" />
                        Impostos e Retenções
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedConta.valor_pis && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              PIS
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_pis)}</p>
                          </div>
                        )}
                        {selectedConta.valor_cofins && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              COFINS
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_cofins)}</p>
                          </div>
                        )}
                        {selectedConta.valor_csll && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              CSLL
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_csll)}</p>
                          </div>
                        )}
                        {selectedConta.valor_ir && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              IR
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_ir)}</p>
                          </div>
                        )}
                        {selectedConta.valor_inss && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              INSS
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_inss)}</p>
                          </div>
                        )}
                        {selectedConta.valor_iss && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              ISS
                            </label>
                            <p className="text-sm">{formatCurrency(selectedConta.valor_iss)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Datas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Datas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Data de Emissão
                      </label>
                      <p className="text-sm">{formatDate(selectedConta.data_emissao)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Data de Vencimento
                      </label>
                      <p className="text-sm font-medium">
                        {formatDate(selectedConta.data_vencimento)}
                        {new Date(selectedConta.data_vencimento) < new Date() && selectedConta.status !== 'recebido' && (
                          <span className="ml-2 text-red-600 text-xs">(Vencida)</span>
                        )}
                      </p>
                    </div>
                    {selectedConta.data_recebimento && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Data de Recebimento
                        </label>
                        <p className="text-sm">{formatDate(selectedConta.data_recebimento)}</p>
                      </div>
                    )}
                    {selectedConta.data_confirmacao && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Data de Confirmação
                        </label>
                        <p className="text-sm">
                          {formatDateTime(selectedConta.data_confirmacao)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Classificação e Projeto */}
                {(selectedConta.centro_custo_id || selectedConta.projeto_id || selectedConta.classe_financeira) && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Classificação
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relatedData.centroCustoNome && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Centro de Custo
                            </label>
                            <p className="text-sm">{relatedData.centroCustoNome}</p>
                          </div>
                        )}
                        {relatedData.projetoNome && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Projeto
                            </label>
                            <p className="text-sm">{relatedData.projetoNome}</p>
                          </div>
                        )}
                        {relatedData.classeFinanceiraNome && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Classe Financeira
                            </label>
                            <p className="text-sm">{relatedData.classeFinanceiraNome}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Forma de Recebimento */}
                {(selectedConta.forma_recebimento || selectedConta.conta_bancaria_id || selectedConta.condicao_recebimento) && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Forma de Recebimento
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedConta.forma_recebimento && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Forma de Recebimento
                            </label>
                            <p className="text-sm">{selectedConta.forma_recebimento}</p>
                          </div>
                        )}
                        {relatedData.contaBancariaNome && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Conta Bancária
                            </label>
                            <p className="text-sm">{relatedData.contaBancariaNome}</p>
                          </div>
                        )}
                        {selectedConta.condicao_recebimento && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Condição de Recebimento
                            </label>
                            <p className="text-sm">{selectedConta.condicao_recebimento} dias</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Observações e Anexos */}
                {(selectedConta.observacoes || (selectedConta.anexos && selectedConta.anexos.length > 0)) && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Informações Adicionais
                      </h3>
                      {selectedConta.observacoes && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Observações
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{selectedConta.observacoes}</p>
                        </div>
                      )}
                      {selectedConta.anexos && selectedConta.anexos.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Anexos ({selectedConta.anexos.length})
                          </label>
                          <div className="mt-2 space-y-1">
                            {selectedConta.anexos.map((anexo, index) => (
                              <a
                                key={index}
                                href={anexo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileCheck className="h-4 w-4" />
                                Anexo {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Informações do Sistema */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Data de Criação
                      </label>
                      <p className="text-sm">
                        {formatDateTime(selectedConta.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Última Atualização
                      </label>
                      <p className="text-sm">
                        {formatDateTime(selectedConta.updated_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status do Registro
                      </label>
                      <p className="text-sm">
                        {selectedConta.is_active ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <X className="h-4 w-4" />
                            Inativo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                {canEdit && selectedConta.status !== 'recebido' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetails(false);
                      handleEdit(selectedConta);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              <Button onClick={() => setShowDetails(false)}>
                Fechar
              </Button>
        </div>
            </>
      )}
        </DialogContent>
      </Dialog>

      {showFilters && (
        <ContaReceberFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Modal de Recebimento */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Conta como Recebida</DialogTitle>
            <DialogDescription>
              Informe os dados do recebimento da conta {receivingConta?.numero_titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {receivingConta && (
              <>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Cliente: {receivingConta.cliente_nome}</p>
                  <p className="text-sm text-muted-foreground">Descrição: {receivingConta.descricao}</p>
                  <p className="text-sm font-semibold text-green-600 mt-2">
                    Valor Atual: {formatCurrency(receivingConta.valor_atual)}
                  </p>
                </div>
                {(!receivingConta.numero_nota_fiscal || !receivingConta.anexo_nota_fiscal) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Atenção:</strong> Esta conta não pode ser recebida sem anexar a nota fiscal e informar o número da nota fiscal. 
                      Por favor, edite a conta e adicione essas informações antes de recebê-la.
                    </AlertDescription>
                  </Alert>
                )}
                {receivingConta.numero_nota_fiscal && receivingConta.anexo_nota_fiscal && (
                  <Alert>
                    <FileCheck className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Nota Fiscal:</strong> {receivingConta.numero_nota_fiscal} - Anexada ✓
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="valor_recebido">Valor Recebido (R$) *</Label>
              <Input
                id="valor_recebido"
                type="number"
                step="0.01"
                min="0"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                placeholder="0.00"
                disabled={isReceiving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_recebimento">Data do Recebimento *</Label>
              <Input
                id="data_recebimento"
                type="date"
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(e.target.value)}
                disabled={isReceiving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReceiveModal(false);
                setReceivingConta(null);
                setValorRecebido('');
                setDataRecebimento('');
              }}
              disabled={isReceiving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReceive}
              disabled={isReceiving || !valorRecebido || !dataRecebimento || !receivingConta?.numero_nota_fiscal || !receivingConta?.anexo_nota_fiscal}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReceiving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Recebimento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

