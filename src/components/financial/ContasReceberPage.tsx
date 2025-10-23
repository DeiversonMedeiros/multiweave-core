// =====================================================
// COMPONENTE: PÁGINA DE CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar contas a receber
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { useContasReceber } from '@/hooks/financial/useContasReceber';
import { ContaReceberFormData } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContasReceberPageProps {
  className?: string;
}

export function ContasReceberPage({ className }: ContasReceberPageProps) {
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

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [editingConta, setEditingConta] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    setEditingConta(conta);
    setShowForm(true);
  };

  const handleView = (conta: any) => {
    setSelectedConta(conta);
    setShowDetails(true);
  };

  const handleDelete = async (conta: any) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.numero_titulo}"?`)) {
      try {
        await deleteContaReceber(conta.id);
      } catch (error) {
        console.error('Erro ao deletar conta:', error);
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

  const handleReceive = async (conta: any) => {
    const valorRecebido = prompt('Valor recebido:', conta.valor_atual.toString());
    const dataRecebimento = prompt('Data do recebimento (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'));
    
    if (valorRecebido && dataRecebimento) {
      try {
        await receiveContaReceber(conta.id, dataRecebimento, parseFloat(valorRecebido));
      } catch (error) {
        console.error('Erro ao registrar recebimento:', error);
      }
    }
  };

  const handleSave = async (data: ContaReceberFormData) => {
    try {
      if (editingConta) {
        await updateContaReceber(editingConta.id, data);
      } else {
        await createContaReceber(data);
      }
      setShowForm(false);
      setEditingConta(null);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
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
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

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
                    {canConfirm && conta.status === 'pendente' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(conta)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && conta.status === 'confirmado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReceive(conta)}
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

      {/* Modais - Placeholder para futuras implementações */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Formulário de Conta a Receber</CardTitle>
              <CardDescription>
                Em desenvolvimento...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowForm(false)}>
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showDetails && selectedConta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Detalhes da Conta a Receber</CardTitle>
              <CardDescription>
                Em desenvolvimento...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowDetails(false)}>
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Filtros de Contas a Receber</CardTitle>
              <CardDescription>
                Em desenvolvimento...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowFilters(false)}>
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

