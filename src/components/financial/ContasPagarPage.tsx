// =====================================================
// COMPONENTE: PÁGINA DE CONTAS A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar contas a pagar
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingDown
} from 'lucide-react';
import { useContasPagar } from '@/hooks/financial/useContasPagar';
import { ContaPagarFormData } from '@/integrations/supabase/financial-types';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarDetails } from './ContaPagarDetails';
import { ContaPagarFilters } from './ContaPagarFilters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    payContaPagar,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  } = useContasPagar();

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar contas por termo de busca
  const filteredContas = contasPagar.filter(conta =>
    conta.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.numero_titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estatísticas
  const stats = {
    total: contasPagar.length,
    pendentes: contasPagar.filter(c => c.status === 'pendente').length,
    aprovadas: contasPagar.filter(c => c.status === 'aprovado').length,
    pagas: contasPagar.filter(c => c.status === 'pago').length,
    vencidas: contasPagar.filter(c => c.status === 'vencido').length,
    valorTotal: contasPagar.reduce((sum, c) => sum + c.valor_atual, 0),
    valorPendente: contasPagar.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor_atual, 0),
    valorAprovado: contasPagar.filter(c => c.status === 'aprovado').reduce((sum, c) => sum + c.valor_atual, 0),
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

  const handlePay = async (conta: ContaPagar) => {
    const valorPago = prompt('Valor pago:', conta.valor_atual.toString());
    const dataPagamento = prompt('Data do pagamento (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'));
    
    if (valorPago && dataPagamento) {
      try {
        await payContaPagar(conta.id, dataPagamento, parseFloat(valorPago));
      } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
      }
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

  const getApprovalStatusBadge = (approvalStatus?: string, totalAprovacoes?: number, aprovacoesPendentes?: number) => {
    if (!approvalStatus || approvalStatus === 'sem_aprovacao') {
      return null;
    }

    const approvalConfig = {
      pendente: { label: 'Aguardando Aprovação', variant: 'secondary' as const, icon: AlertTriangle },
      em_aprovacao: { 
        label: `Em Aprovação (${aprovacoesPendentes || 0}/${totalAprovacoes || 0})`, 
        variant: 'default' as const, 
        icon: AlertTriangle 
      },
      aprovado: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle },
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
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
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
    <div className={`space-y-6 ${className}`}>
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
              Requer atenção
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
          <CardTitle>Contas a Pagar</CardTitle>
          <CardDescription>
            {filteredContas.length} conta(s) encontrada(s)
          </CardDescription>
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
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{conta.numero_titulo}</span>
                      {getStatusBadge(conta.status)}
                      {getApprovalStatusBadge(
                        conta.approval_status,
                        conta.total_aprovacoes,
                        conta.aprovacoes_pendentes
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{conta.fornecedor_nome}</span>
                      <span className="mx-2">•</span>
                      <span>{conta.descricao}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Venc: {formatDate(conta.data_vencimento)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(conta.valor_atual)}
                      </span>
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
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canApprove && conta.status === 'pendente' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(conta)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(conta)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
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
                    {canDelete && (
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
    </div>
  );
}

