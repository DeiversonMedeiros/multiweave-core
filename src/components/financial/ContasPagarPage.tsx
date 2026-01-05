// =====================================================
// COMPONENTE: PÁGINA DE CONTAS A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar contas a pagar
// Autor: Sistema MultiWeave Core

import React, { useState, useMemo, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
  TrendingDown,
  RotateCcw,
  Ban,
  Target,
  Paperclip,
  FileText
} from 'lucide-react';
import { useContasPagar } from '@/hooks/financial/useContasPagar';
import { useUpdateContaPagarParcela } from '@/hooks/financial/useContasPagarParcelas';
import { ContaPagar, ContaPagarFormData, ContaPagarParcela } from '@/integrations/supabase/financial-types';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarDetails } from './ContaPagarDetails';
import { ContaPagarFilters } from './ContaPagarFilters';
import { ModalPagamentoContaPagar } from './ModalPagamentoContaPagar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';
import { getAlertBadgeColor, getAlertBadgeText } from '@/utils/financial/dueDateUtils';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { FolderKanban } from 'lucide-react';

interface ContasPagarPageProps {
  className?: string;
}

export function ContasPagarPage({ className }: ContasPagarPageProps) {
  const {
    contasPagar,
    loading,
    error,
    filters,
    setFilters,
    createContaPagar,
    updateContaPagar,
    deleteContaPagar,
    approveContaPagar,
    rejectContaPagar,
    reprovarContaPagar,
    suspenderContaPagar,
    payContaPagar,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  } = useContasPagar();

  const updateParcela = useUpdateContaPagarParcela();
  const { selectedCompany } = useCompany();

  // Buscar dados relacionados para exibir nomes
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();

  // Estados do componente
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContasIds, setSelectedContasIds] = useState<Set<string>>(new Set());
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [contaParaPagar, setContaParaPagar] = useState<ContaPagar | null>(null);
  const [uploadingBoleto, setUploadingBoleto] = useState<string | null>(null);
  const [uploadingNotaFiscal, setUploadingNotaFiscal] = useState<string | null>(null);

  // Filtrar contas por termo de busca
  const filteredContas = contasPagar.filter(conta =>
    conta.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.numero_titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Buscar parcelas para todas as contas parceladas
  const contasParceladas = filteredContas.filter(c => c.is_parcelada);
  const parcelasQueries = useQueries({
    queries: contasParceladas.map(conta => ({
      queryKey: ['financeiro', 'contas_pagar_parcelas', conta.id, selectedCompany?.id],
      queryFn: async () => {
        if (!selectedCompany?.id || !conta.id) return { data: [], total: 0 };
        const result = await EntityService.list<ContaPagarParcela>({
          schema: 'financeiro',
          table: 'contas_pagar_parcelas',
          companyId: selectedCompany.id,
          filters: { conta_pagar_id: conta.id },
          page: 1,
          pageSize: 1000
        });
        return result;
      },
      enabled: !!selectedCompany?.id && !!conta.id,
    }))
  });

  // Criar mapa de parcelas por conta
  const parcelasPorConta = useMemo(() => {
    const mapa = new Map<string, ContaPagarParcela[]>();
    contasParceladas.forEach((conta, index) => {
      const parcelasData = parcelasQueries[index]?.data;
      if (parcelasData?.data) {
        mapa.set(conta.id, parcelasData.data);
      }
    });
    return mapa;
  }, [contasParceladas, parcelasQueries]);

  // Calcular informações de parcelas pagas para cada conta
  const infoParcelas = useMemo(() => {
    const info = new Map<string, { pagas: number; total: number; temParcial: boolean; todasPagas: boolean }>();
    parcelasPorConta.forEach((parcelas, contaId) => {
      const total = parcelas.length;
      const pagas = parcelas.filter(p => p.status === 'pago').length;
      const todasPagas = pagas === total && total > 0;
      const temParcial = pagas > 0 && pagas < total;
      info.set(contaId, { pagas, total, temParcial, todasPagas });
    });
    return info;
  }, [parcelasPorConta]);

  // Função helper para verificar se há pagamento na conta
  const temPagamento = (conta: ContaPagar): boolean => {
    // Se for conta parcelada, verificar se há alguma parcela paga
    if (conta.is_parcelada) {
      const info = infoParcelas.get(conta.id);
      return (info?.pagas ?? 0) > 0;
    }
    // Se não for parcelada, verificar se há valor pago
    return (conta.valor_pago ?? 0) > 0;
  };

  // Criar mapas para busca rápida
  const costCentersMap = new Map(
    costCentersData?.data?.map(cc => [cc.id, cc]) || []
  );
  const projectsMap = new Map(
    projectsData?.data?.map(p => [p.id, p]) || []
  );

  // Atualizar selectedConta quando a lista for atualizada e o modal estiver aberto
  useEffect(() => {
    if (showDetails && selectedConta) {
      const contaAtualizada = contasPagar.find(c => c.id === selectedConta.id);
      if (contaAtualizada) {
        setSelectedConta(contaAtualizada);
      }
    }
  }, [contasPagar, showDetails, selectedConta?.id]);

  // Calcular estatísticas
  const stats = {
    total: contasPagar.length,
    pendentes: contasPagar.filter(c => c.status === 'pendente').length,
    aprovadas: contasPagar.filter(c => c.status === 'aprovado').length,
    pagas: contasPagar.filter(c => c.status === 'pago').length,
    vencidas: contasPagar.filter(c => c.status === 'vencido' || c.esta_vencida).length,
    proximasVencer: contasPagar.filter(c => c.esta_proxima_vencer && !c.esta_vencida).length,
    valorTotal: contasPagar.reduce((sum, c) => sum + c.valor_atual, 0),
    valorPendente: contasPagar.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor_atual, 0),
    valorAprovado: contasPagar.filter(c => c.status === 'aprovado').reduce((sum, c) => sum + c.valor_atual, 0),
    valorVencido: contasPagar.filter(c => c.esta_vencida).reduce((sum, c) => sum + c.valor_atual, 0),
    valorProximoVencer: contasPagar.filter(c => c.esta_proxima_vencer && !c.esta_vencida).reduce((sum, c) => sum + c.valor_atual, 0),
  };

  // Handlers
  const handleCreate = () => {
    setEditingConta(null);
    setShowForm(true);
  };

  const handleEdit = (conta: ContaPagar) => {
    setEditingConta(conta);
    setShowForm(true);
  };

  const handleView = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setShowDetails(true);
  };

  const handleDelete = async (conta: ContaPagar) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.numero_titulo}"?`)) {
      try {
        await deleteContaPagar(conta.id);
      } catch (error) {
        console.error('Erro ao deletar conta:', error);
      }
    }
  };

  const handleApprove = async (conta: ContaPagar) => {
    try {
      await approveContaPagar(conta.id);
    } catch (error) {
      console.error('Erro ao aprovar conta:', error);
    }
  };

  const handleReject = async (conta: ContaPagar) => {
    const observacoes = prompt('Motivo da rejeição:');
    if (observacoes) {
      try {
        await rejectContaPagar(conta.id, observacoes);
      } catch (error) {
        console.error('Erro ao rejeitar conta:', error);
      }
    }
  };

  const handleReprovar = async (conta: ContaPagar) => {
    const observacoes = prompt('Motivo da reprovação (opcional):');
    if (window.confirm(`Tem certeza que deseja reprovar a conta "${conta.numero_titulo}"?\n\nA conta será retornada para a primeira etapa de aprovação.`)) {
      try {
        await reprovarContaPagar(conta.id, observacoes || undefined);
      } catch (error) {
        console.error('Erro ao reprovar conta:', error);
        alert('Erro ao reprovar conta. Verifique o console para mais detalhes.');
      }
    }
  };

  const handleSuspender = async (conta: ContaPagar) => {
    const observacoes = prompt('Motivo da suspensão (opcional):');
    if (window.confirm(`Tem certeza que deseja suspender a conta "${conta.numero_titulo}"?\n\nA conta será cancelada e o processo de aprovação será finalizado.`)) {
      try {
        await suspenderContaPagar(conta.id, observacoes || undefined);
      } catch (error) {
        console.error('Erro ao suspender conta:', error);
        alert('Erro ao suspender conta. Verifique o console para mais detalhes.');
      }
    }
  };

  const handlePay = (conta: ContaPagar) => {
    setContaParaPagar(conta);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (data: {
    valorPago: number;
    dataPagamento: string;
    parcelaId?: string;
  }) => {
    if (!contaParaPagar) return;

    try {
      // Se for pagamento de parcela específica
      if (data.parcelaId) {
        // Atualizar a parcela individual
        await updateParcela.mutateAsync({
          parcelaId: data.parcelaId,
          contaPagarId: contaParaPagar.id,
          data: {
            status: 'pago',
            data_pagamento: data.dataPagamento,
            valor_pago: data.valorPago,
            valor_atual: data.valorPago,
          },
        });
      } else {
        // Pagar a conta toda
        await payContaPagar(contaParaPagar.id, data.dataPagamento, data.valorPago);
      }
      setShowPaymentModal(false);
      setContaParaPagar(null);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      throw error;
    }
  };

  // Handler para selecionar/desselecionar conta
  const handleToggleConta = (contaId: string, checked: boolean) => {
    setSelectedContasIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(contaId);
      } else {
        newSet.delete(contaId);
      }
      return newSet;
    });
  };

  // Handler para selecionar todas as contas
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContasIds(new Set(filteredContas.map(c => c.id)));
    } else {
      setSelectedContasIds(new Set());
    }
  };

  // Calcular soma das contas selecionadas
  const selectedContasTotal = filteredContas
    .filter(conta => selectedContasIds.has(conta.id))
    .reduce((sum, conta) => sum + conta.valor_atual, 0);

  const selectedContasCount = selectedContasIds.size;

  // Handler para confirmar pagamento em lote
  const handleConfirmBatchPayment = async () => {
    if (selectedContasCount === 0) return;

    const dataPagamento = prompt('Data do pagamento (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'));
    if (!dataPagamento) return;

    if (!window.confirm(`Confirmar pagamento de ${selectedContasCount} conta(s) no valor total de ${formatCurrency(selectedContasTotal)}?`)) {
      return;
    }

    setIsConfirmingPayment(true);
    try {
      const promises = Array.from(selectedContasIds).map(async (contaId) => {
        const conta = filteredContas.find(c => c.id === contaId);
        if (conta) {
          await payContaPagar(contaId, dataPagamento, conta.valor_atual);
        }
      });

      await Promise.all(promises);
      setSelectedContasIds(new Set());
      alert(`Pagamento confirmado para ${selectedContasCount} conta(s)!`);
    } catch (error) {
      console.error('Erro ao confirmar pagamento em lote:', error);
      alert('Erro ao confirmar pagamento. Verifique o console para mais detalhes.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleSave = async (data: ContaPagarFormData) => {
    try {
      if (editingConta) {
        await updateContaPagar(editingConta.id, data);
      } else {
        await createContaPagar(data);
      }
      setShowForm(false);
      setEditingConta(null);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }
  };

  // Função para fazer upload de boleto
  const handleUploadBoleto = async (conta: ContaPagar, file: File) => {
    if (!selectedCompany?.id) {
      alert('Empresa não selecionada');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setUploadingBoleto(conta.id);
    try {
      // Sanitizar nome do arquivo
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${selectedCompany.id}/boletos/${fileName}`;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL do arquivo
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('boletos')
        .createSignedUrl(filePath, 3600);
      
      let fileUrl = '';
      if (signedUrlError || !signedUrlData) {
        const { data: publicUrlData } = supabase.storage
          .from('boletos')
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        fileUrl = signedUrlData.signedUrl;
      }

      // Atualizar a conta com o anexo
      await updateContaPagar(conta.id, {
        anexo_boleto: fileUrl,
      });

      // Atualizar selectedConta se o modal estiver aberto
      if (showDetails && selectedConta && selectedConta.id === conta.id) {
        setSelectedConta({
          ...selectedConta,
          anexo_boleto: fileUrl,
        });
      }

      alert('Boleto anexado com sucesso!');
      refresh();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar boleto: ' + (error.message || 'Não foi possível enviar o arquivo.'));
    } finally {
      setUploadingBoleto(null);
    }
  };

  // Função para fazer upload de nota fiscal
  const handleUploadNotaFiscal = async (conta: ContaPagar, file: File) => {
    if (!selectedCompany?.id) {
      alert('Empresa não selecionada');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setUploadingNotaFiscal(conta.id);
    try {
      // Sanitizar nome do arquivo
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${selectedCompany.id}/notas-fiscais/${fileName}`;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL do arquivo
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('notas-fiscais')
        .createSignedUrl(filePath, 3600);
      
      let fileUrl = '';
      if (signedUrlError || !signedUrlData) {
        const { data: publicUrlData } = supabase.storage
          .from('notas-fiscais')
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        fileUrl = signedUrlData.signedUrl;
      }

      // Atualizar a conta com o anexo
      await updateContaPagar(conta.id, {
        anexo_nota_fiscal: fileUrl,
      });

      // Atualizar selectedConta se o modal estiver aberto
      if (showDetails && selectedConta && selectedConta.id === conta.id) {
        setSelectedConta({
          ...selectedConta,
          anexo_nota_fiscal: fileUrl,
        });
      }

      alert('Nota fiscal anexada com sucesso!');
      refresh();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar nota fiscal: ' + (error.message || 'Não foi possível enviar o arquivo.'));
    } finally {
      setUploadingNotaFiscal(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: AlertTriangle },
      aprovado: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle },
      pago: { label: 'Pago', variant: 'success' as const, icon: CheckCircle },
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

  const getApprovalStatusBadge = (
    approvalStatus?: string, 
    totalAprovacoes?: number, 
    aprovacoesPendentes?: number,
    aprovacoesAprovadas?: number
  ) => {
    if (!approvalStatus || approvalStatus === 'sem_aprovacao') {
      return null;
    }

    // Se todas as aprovações foram concluídas (aprovadas), mostrar "Aprovado"
    const todasAprovadas = totalAprovacoes && totalAprovacoes > 0 && 
      (aprovacoesAprovadas === totalAprovacoes || 
       (aprovacoesPendentes === 0 && aprovacoesAprovadas && aprovacoesAprovadas > 0));

    // Se o status é 'aprovado' ou todas foram aprovadas, mostrar badge de aprovado
    if (approvalStatus === 'aprovado' || todasAprovadas) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {totalAprovacoes ? `Aprovado (${totalAprovacoes}/${totalAprovacoes})` : 'Aprovado'}
        </Badge>
      );
    }

    const approvalConfig = {
      pendente: { label: 'Aguardando Aprovação', variant: 'secondary' as const, icon: AlertTriangle },
      em_aprovacao: { 
        label: `Em Aprovação (${aprovacoesPendentes || 0}/${totalAprovacoes || 0})`, 
        variant: 'default' as const, 
        icon: AlertTriangle 
      },
      rejeitado: { label: 'Rejeitado', variant: 'destructive' as const, icon: XCircle },
    };

    const config = approvalConfig[approvalStatus as keyof typeof approvalConfig];
    if (!config) return null;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contas a pagar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar contas a pagar: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className} ${selectedContasCount > 0 ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Gerencie as contas a pagar da empresa
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

      {/* Filtros Rápidos */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filters.apenas_vencidas ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setFilters({
              ...filters,
              apenas_vencidas: !filters.apenas_vencidas,
              apenas_proximas_vencer: filters.apenas_vencidas ? false : filters.apenas_proximas_vencer,
            });
          }}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Vencidas ({stats.vencidas})
        </Button>
        <Button
          variant={filters.apenas_proximas_vencer ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setFilters({
              ...filters,
              apenas_proximas_vencer: !filters.apenas_proximas_vencer,
              apenas_vencidas: filters.apenas_proximas_vencer ? false : filters.apenas_vencidas,
            });
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Próximas a Vencer ({stats.proximasVencer})
        </Button>
        {(filters.apenas_vencidas || filters.apenas_proximas_vencer) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({
                ...filters,
                apenas_vencidas: false,
                apenas_proximas_vencer: false,
              });
            }}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorPendente)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprovadas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorAprovado)} em valor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.vencidas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorVencido)} em valor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas a Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.proximasVencer}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.valorProximoVencer)} em valor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor, descrição ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>
                {filteredContas.length} conta(s) encontrada(s)
              </CardDescription>
            </div>
            {filteredContas.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedContasIds.size === filteredContas.length && filteredContas.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                />
                <Label className="text-sm text-muted-foreground cursor-pointer" onClick={handleSelectAll}>
                  Selecionar todas
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta a pagar encontrada.
              </div>
            ) : (
              filteredContas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedContasIds.has(conta.id)}
                      onCheckedChange={(checked) => handleToggleConta(conta.id, checked === true)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{conta.numero_titulo}</span>
                        {getStatusBadge(conta.status)}
                        {getApprovalStatusBadge(
                          conta.approval_status,
                          conta.total_aprovacoes,
                          conta.aprovacoes_pendentes,
                          conta.aprovacoes_aprovadas
                        )}
                        {/* Badge de Pagamento Parcial - só mostrar se houver parcial e não estiver tudo pago */}
                        {(() => {
                          const info = infoParcelas.get(conta.id);
                          // Não mostrar se todas as parcelas foram pagas ou se o valor total foi pago
                          const valorTotalPago = conta.valor_pago >= (conta.valor_original || conta.valor_atual);
                          if (info?.temParcial && !info.todasPagas && !valorTotalPago) {
                            return (
                              <Badge variant="default" className="flex items-center gap-1 bg-blue-600">
                                <DollarSign className="h-3 w-3" />
                                Pagamento Parcial
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        {/* Alerta de vencimento - não mostrar se houver pagamento parcial */}
                        {(() => {
                          const info = infoParcelas.get(conta.id);
                          const temParcial = info?.temParcial || false;
                          // Não mostrar alerta de vencida se houver pagamento parcial
                          if (temParcial && conta.tipo_alerta === 'vencida') {
                            return null;
                          }
                          return conta.tipo_alerta && conta.tipo_alerta !== 'sem_alerta' ? (
                            <Badge 
                              variant={getAlertBadgeColor(conta.tipo_alerta) as any}
                              className="flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {getAlertBadgeText(conta.tipo_alerta, conta.dias_ate_vencimento)}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{conta.fornecedor_nome}</span>
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
                        {conta.centro_custo_id && costCentersMap.has(conta.centro_custo_id) && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            CC: {costCentersMap.get(conta.centro_custo_id)?.codigo || costCentersMap.get(conta.centro_custo_id)?.nome}
                          </span>
                        )}
                        {conta.projeto_id && projectsMap.has(conta.projeto_id) && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Proj: {projectsMap.get(conta.projeto_id)?.codigo || projectsMap.get(conta.projeto_id)?.nome}
                          </span>
                        )}
                        {conta.is_parcelada && conta.numero_parcelas && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {conta.numero_parcelas} parcela(s)
                          </span>
                        )}
                      </div>
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
                    {/* Botão para anexar boleto - só aparece se não houver boleto anexado */}
                    {canEdit && !conta.anexo_boleto && (
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadBoleto(conta, file);
                              e.target.value = ''; // Limpar input
                            }
                          }}
                          disabled={uploadingBoleto === conta.id}
                          id={`boleto-input-${conta.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 relative"
                          title="Anexar Boleto"
                          disabled={uploadingBoleto === conta.id}
                        >
                          {uploadingBoleto === conta.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {/* Botão para anexar nota fiscal - só aparece se não houver nota fiscal anexada */}
                    {canEdit && !conta.anexo_nota_fiscal && (
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadNotaFiscal(conta, file);
                              e.target.value = ''; // Limpar input
                            }
                          }}
                          disabled={uploadingNotaFiscal === conta.id}
                          id={`nota-fiscal-input-${conta.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 relative"
                          title="Anexar Nota Fiscal"
                          disabled={uploadingNotaFiscal === conta.id}
                        >
                          {uploadingNotaFiscal === conta.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {canEdit && !temPagamento(conta) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canApprove && (conta.status === 'aprovado' || conta.status === 'pendente' || conta.approval_status === 'em_aprovacao') && !temPagamento(conta) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprovar(conta)}
                          className="text-orange-600 hover:text-orange-700"
                          title="Reprovar (volta para primeira etapa)"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSuspender(conta)}
                          className="text-red-600 hover:text-red-700"
                          title="Suspender (cancelar conta)"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canEdit && conta.status === 'aprovado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePay(conta)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && !temPagamento(conta) && (
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

      {/* Barra de Ações Fixa para Contas Selecionadas */}
      {selectedContasCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">
                  {selectedContasCount} conta(s) selecionada(s)
                </p>
                <p className="text-lg font-bold text-primary">
                  Total: {formatCurrency(selectedContasTotal)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedContasIds(new Set())}
                disabled={isConfirmingPayment}
              >
                Limpar Seleção
              </Button>
              <Button
                onClick={handleConfirmBatchPayment}
                disabled={isConfirmingPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                {isConfirmingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {showForm && (
        <ContaPagarForm
          conta={editingConta}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingConta(null);
          }}
        />
      )}

      {showDetails && selectedConta && (
        <ContaPagarDetails
          conta={selectedConta}
          onClose={() => {
            setShowDetails(false);
            setSelectedConta(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onReject={handleReject}
          onReprovar={handleReprovar}
          onSuspender={handleSuspender}
          onPay={handlePay}
          canEdit={canEdit}
          canDelete={canDelete}
          canApprove={canApprove}
        />
      )}

      {showFilters && (
        <ContaPagarFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Modal de Pagamento */}
      <ModalPagamentoContaPagar
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setContaParaPagar(null);
        }}
        conta={contaParaPagar}
        onConfirm={handleConfirmPayment}
        isLoading={updateParcela.isPending}
      />
    </div>
  );
}

