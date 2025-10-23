// =====================================================
// COMPONENTE: PÁGINA DE TESOURARIA
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar tesouraria
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  Building, 
  FileText,
  BarChart3,
  Settings,
  CreditCard,
  Receipt,
  Calculator,
  Upload,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useTesouraria } from '@/hooks/financial/useTesouraria';
import { ContaBancaria, FluxoCaixa, ConciliacaoBancaria } from '@/integrations/supabase/financial-types';
import { ContaBancariaForm } from './ContaBancariaForm';
import { FluxoCaixaForm } from './FluxoCaixaForm';
import { ConciliacaoForm } from './ConciliacaoForm';
import { FluxoCaixaChart } from './FluxoCaixaChart';
import { ConciliacaoDetails } from './ConciliacaoDetails';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TesourariaPageProps {
  className?: string;
}

export function TesourariaPage({ className }: TesourariaPageProps) {
  const {
    contasBancarias,
    fluxoCaixa,
    conciliacoes,
    loading,
    error,
    createContaBancaria,
    updateContaBancaria,
    deleteContaBancaria,
    createFluxoCaixa,
    updateFluxoCaixa,
    deleteFluxoCaixa,
    processarConciliacao,
    importarExtrato,
    gerarProjecaoFluxo,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canProcess,
  } = useTesouraria();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showContaForm, setShowContaForm] = useState(false);
  const [showFluxoForm, setShowFluxoForm] = useState(false);
  const [showConciliacaoForm, setShowConciliacaoForm] = useState(false);
  const [showConciliacaoDetails, setShowConciliacaoDetails] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaBancaria | null>(null);
  const [selectedFluxo, setSelectedFluxo] = useState<FluxoCaixa | null>(null);
  const [selectedConciliacao, setSelectedConciliacao] = useState<ConciliacaoBancaria | null>(null);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [editingFluxo, setEditingFluxo] = useState<FluxoCaixa | null>(null);

  // Calcular estatísticas
  const stats = {
    totalContas: contasBancarias.length,
    saldoTotal: contasBancarias.reduce((sum, conta) => sum + conta.saldo_atual, 0),
    saldoDisponivel: contasBancarias.reduce((sum, conta) => sum + conta.saldo_disponivel, 0),
    limiteTotal: contasBancarias.reduce((sum, conta) => sum + conta.limite_credito, 0),
    conciliacoesPendentes: conciliacoes.filter(c => c.status === 'pendente').length,
    fluxoEntradas: fluxoCaixa.filter(f => f.tipo_movimento === 'entrada').reduce((sum, f) => sum + f.valor, 0),
    fluxoSaidas: fluxoCaixa.filter(f => f.tipo_movimento === 'saida').reduce((sum, f) => sum + f.valor, 0),
    fluxoLiquido: 0, // Calculado abaixo
  };

  stats.fluxoLiquido = stats.fluxoEntradas - stats.fluxoSaidas;

  // Handlers
  const handleCreateConta = () => {
    setEditingConta(null);
    setShowContaForm(true);
  };

  const handleEditConta = (conta: ContaBancaria) => {
    setEditingConta(conta);
    setShowContaForm(true);
  };

  const handleDeleteConta = async (conta: ContaBancaria) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.banco_nome} - ${conta.conta}"?`)) {
      try {
        await deleteContaBancaria(conta.id);
      } catch (error) {
        console.error('Erro ao deletar conta:', error);
      }
    }
  };

  const handleCreateFluxo = () => {
    setEditingFluxo(null);
    setShowFluxoForm(true);
  };

  const handleEditFluxo = (fluxo: FluxoCaixa) => {
    setEditingFluxo(fluxo);
    setShowFluxoForm(true);
  };

  const handleDeleteFluxo = async (fluxo: FluxoCaixa) => {
    if (window.confirm(`Tem certeza que deseja excluir o fluxo "${fluxo.descricao}"?`)) {
      try {
        await deleteFluxoCaixa(fluxo.id);
      } catch (error) {
        console.error('Erro ao deletar fluxo:', error);
      }
    }
  };

  const handleCreateConciliacao = () => {
    setShowConciliacaoForm(true);
  };

  const handleViewConciliacao = (conciliacao: ConciliacaoBancaria) => {
    setSelectedConciliacao(conciliacao);
    setShowConciliacaoDetails(true);
  };

  const handleProcessConciliacao = async (conciliacao: ConciliacaoBancaria) => {
    try {
      await processarConciliacao(conciliacao.conta_bancaria_id, conciliacao.data_inicio, conciliacao.data_fim);
    } catch (error) {
      console.error('Erro ao processar conciliação:', error);
    }
  };

  const handleSaveConta = async (data: any) => {
    try {
      if (editingConta) {
        await updateContaBancaria(editingConta.id, data);
      } else {
        await createContaBancaria(data);
      }
      setShowContaForm(false);
      setEditingConta(null);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }
  };

  const handleSaveFluxo = async (data: any) => {
    try {
      if (editingFluxo) {
        await updateFluxoCaixa(editingFluxo.id, data);
      } else {
        await createFluxoCaixa(data);
      }
      setShowFluxoForm(false);
      setEditingFluxo(null);
    } catch (error) {
      console.error('Erro ao salvar fluxo:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return 'Data não informada';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Data inválida';
    return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      processando: { label: 'Processando', variant: 'default' as const, icon: RefreshCw },
      concluida: { label: 'Concluída', variant: 'success' as const, icon: CheckCircle },
      erro: { label: 'Erro', variant: 'destructive' as const, icon: AlertTriangle },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando tesouraria...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar tesouraria: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesouraria</h1>
          <p className="text-muted-foreground">
            Gestão de contas bancárias, conciliação e fluxo de caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.saldoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.saldoDisponivel)} disponível
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Bancárias</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conciliacoesPendentes} conciliações pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.fluxoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.fluxoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.fluxoEntradas)} entradas - {formatCurrency(stats.fluxoSaidas)} saídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.limiteTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Limite de crédito disponível
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="contas" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Contas Bancárias
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Conciliação
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa - Últimos 30 dias</CardTitle>
                <CardDescription>
                  Projeção de entradas e saídas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FluxoCaixaChart data={fluxoCaixa} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contas Bancárias</CardTitle>
                <CardDescription>
                  Resumo das contas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contasBancarias.map((conta) => (
                    <div key={conta.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{conta.banco_nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {conta.agencia} - {conta.conta}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(conta.saldo_atual)}</p>
                        <p className="text-sm text-muted-foreground">
                          {conta.tipo_conta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contas Bancárias */}
        <TabsContent value="contas" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contas Bancárias</CardTitle>
                  <CardDescription>
                    Gerencie as contas bancárias da empresa
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateConta}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contasBancarias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conta bancária cadastrada.
                  </div>
                ) : (
                  contasBancarias.map((conta) => (
                    <div
                      key={conta.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conta.banco_nome}</span>
                          <Badge variant="outline">{conta.tipo_conta}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Agência: {conta.agencia} | Conta: {conta.conta}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Saldo: {formatCurrency(conta.saldo_atual)}</span>
                          <span>Disponível: {formatCurrency(conta.saldo_disponivel)}</span>
                          <span>Limite: {formatCurrency(conta.limite_credito)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditConta(conta)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConta(conta)}
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
        </TabsContent>

        {/* Fluxo de Caixa */}
        <TabsContent value="fluxo" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fluxo de Caixa</CardTitle>
                  <CardDescription>
                    Projeções e movimentações de caixa
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateFluxo}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Projeção
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fluxoCaixa.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma projeção de fluxo de caixa cadastrada.
                  </div>
                ) : (
                  fluxoCaixa.map((fluxo) => (
                    <div
                      key={fluxo.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fluxo.descricao}</span>
                          <Badge variant={fluxo.tipo_movimento === 'entrada' ? 'default' : 'secondary'}>
                            {fluxo.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                          <Badge variant="outline">{fluxo.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {fluxo.categoria} • {formatDate(fluxo.data_projecao)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-semibold ${fluxo.tipo_movimento === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {fluxo.tipo_movimento === 'entrada' ? '+' : '-'}{formatCurrency(fluxo.valor)}
                        </span>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFluxo(fluxo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFluxo(fluxo)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conciliação */}
        <TabsContent value="conciliacao" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conciliação Bancária</CardTitle>
                  <CardDescription>
                    Processe e acompanhe conciliações bancárias
                  </CardDescription>
                </div>
                {canProcess && (
                  <Button onClick={handleCreateConciliacao}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conciliação
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conciliacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conciliação encontrada.
                  </div>
                ) : (
                  conciliacoes.map((conciliacao) => (
                    <div
                      key={conciliacao.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {conciliacao.data_inicio} - {conciliacao.data_fim}
                          </span>
                          {getStatusBadge(conciliacao.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Saldo Inicial: {formatCurrency(conciliacao.saldo_inicial)} | 
                          Saldo Final: {formatCurrency(conciliacao.saldo_final)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewConciliacao(conciliacao)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canProcess && conciliacao.status === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProcessConciliacao(conciliacao)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {showContaForm && (
        <ContaBancariaForm
          conta={editingConta}
          onSave={handleSaveConta}
          onCancel={() => {
            setShowContaForm(false);
            setEditingConta(null);
          }}
        />
      )}

      {showFluxoForm && (
        <FluxoCaixaForm
          fluxo={editingFluxo}
          onSave={handleSaveFluxo}
          onCancel={() => {
            setShowFluxoForm(false);
            setEditingFluxo(null);
          }}
        />
      )}

      {showConciliacaoForm && (
        <ConciliacaoForm
          onSave={() => {
            setShowConciliacaoForm(false);
            refresh();
          }}
          onCancel={() => setShowConciliacaoForm(false)}
        />
      )}

      {showConciliacaoDetails && selectedConciliacao && (
        <ConciliacaoDetails
          conciliacao={selectedConciliacao}
          onClose={() => {
            setShowConciliacaoDetails(false);
            setSelectedConciliacao(null);
          }}
        />
      )}
    </div>
  );
}
