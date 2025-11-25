// =====================================================
// COMPONENTE: PÁGINA DO MÓDULO CONTABILIDADE
// =====================================================
// Data: 2025-01-15
// Descrição: Página principal para gerenciar módulo contabilidade
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  FileText, 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Building,
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Calendar,
  Hash,
  DollarSign,
  BookOpen,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { useContabilidade } from '@/hooks/financial/useContabilidade';
import { PlanoContas, LancamentoContabil, SpedFiscal, SpedContabil } from '@/integrations/supabase/financial-types';
import { PlanoContasForm } from './PlanoContasForm';
import { LancamentoForm } from './LancamentoForm';
import { SpedGenerator } from './SpedGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ContabilidadePageProps {
  className?: string;
}

export function ContabilidadePage({ className }: ContabilidadePageProps) {
  const {
    planoContas,
    lancamentos,
    spedFiscal,
    spedContabil,
    loading,
    error,
    createPlanoContas,
    updatePlanoContas,
    deletePlanoContas,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    estornarLancamento,
    gerarSpedFiscal,
    gerarSpedContabil,
    validarSped,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canGenerate,
  } = useContabilidade();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPlanoContasForm, setShowPlanoContasForm] = useState(false);
  const [showLancamentoForm, setShowLancamentoForm] = useState(false);
  const [showSpedGenerator, setShowSpedGenerator] = useState(false);
  const [editingPlanoContas, setEditingPlanoContas] = useState<PlanoContas | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<LancamentoContabil | null>(null);

  // Calcular estatísticas
  const stats = {
    totalContas: planoContas.length,
    totalLancamentos: lancamentos.length,
    lancamentosAprovados: lancamentos.filter(l => l.status === 'aprovado').length,
    lancamentosPendentes: lancamentos.filter(l => l.status === 'rascunho').length,
    lancamentosEstornados: lancamentos.filter(l => l.status === 'estornado').length,
    totalSpedFiscal: spedFiscal.length,
    totalSpedContabil: spedContabil.length,
    valorTotalDebitos: lancamentos.reduce((sum, l) => sum + l.valor_total, 0),
    valorTotalCreditos: lancamentos.reduce((sum, l) => sum + l.valor_total, 0),
  };

  // Handlers
  const handleCreatePlanoContas = () => {
    setEditingPlanoContas(null);
    setShowPlanoContasForm(true);
  };

  const handleEditPlanoContas = (conta: PlanoContas) => {
    setEditingPlanoContas(conta);
    setShowPlanoContasForm(true);
  };

  const handleDeletePlanoContas = async (conta: PlanoContas) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.descricao}"?`)) {
      try {
        await deletePlanoContas(conta.id);
      } catch (error) {
        console.error('Erro ao deletar conta:', error);
      }
    }
  };

  const handleCreateLancamento = () => {
    setEditingLancamento(null);
    setShowLancamentoForm(true);
  };

  const handleEditLancamento = (lancamento: LancamentoContabil) => {
    setEditingLancamento(lancamento);
    setShowLancamentoForm(true);
  };

  const handleDeleteLancamento = async (lancamento: LancamentoContabil) => {
    if (window.confirm(`Tem certeza que deseja excluir o lançamento "${lancamento.numero_documento}"?`)) {
      try {
        await deleteLancamento(lancamento.id);
      } catch (error) {
        console.error('Erro ao deletar lançamento:', error);
      }
    }
  };

  const handleEstornarLancamento = async (lancamento: LancamentoContabil) => {
    if (window.confirm(`Tem certeza que deseja estornar o lançamento "${lancamento.numero_documento}"?`)) {
      try {
        await estornarLancamento(lancamento.id);
      } catch (error) {
        console.error('Erro ao estornar lançamento:', error);
      }
    }
  };


  const handleSavePlanoContas = async (data: any) => {
    try {
      // Mapear campos do formulário para o formato do banco
      const planoContasData: Partial<PlanoContas> = {
        codigo: data.codigo,
        descricao: data.nome || data.descricao, // Suporta ambos os formatos
        tipo_conta: data.tipo === 'patrimonio_liquido' ? 'patrimonio' : data.tipo,
        nivel: data.nivel,
        conta_pai_id: data.conta_pai_id || undefined,
        aceita_lancamento: data.aceita_lancamento,
        saldo_inicial: data.saldo_inicial,
        saldo_atual: data.saldo_inicial || 0,
        natureza: data.natureza,
        observacoes: data.observacoes,
        is_active: true,
      };
      
      if (editingPlanoContas) {
        await updatePlanoContas(editingPlanoContas.id, planoContasData);
      } else {
        await createPlanoContas(planoContasData);
      }
      setShowPlanoContasForm(false);
      setEditingPlanoContas(null);
    } catch (error) {
      console.error('Erro ao salvar plano de contas:', error);
    }
  };

  const handleSaveLancamento = async (data: any) => {
    try {
      if (editingLancamento) {
        await updateLancamento(editingLancamento.id, data);
      } else {
        await createLancamento(data);
      }
      setShowLancamentoForm(false);
      setEditingLancamento(null);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
    }
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      rascunho: { label: 'Rascunho', variant: 'secondary' as const, icon: Clock },
      aprovado: { label: 'Aprovado', variant: 'success' as const, icon: CheckCircle },
      estornado: { label: 'Estornado', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rascunho;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const tipoConfig = {
      ativo: { label: 'Ativo', variant: 'default' as const, className: 'bg-green-600 text-white hover:bg-green-700' },
      passivo: { label: 'Passivo', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
      patrimonio_liquido: { label: 'Patrimônio Líquido', variant: 'outline' as const, className: 'border-green-600 text-green-600 hover:bg-green-50' },
      receita: { label: 'Receita', variant: 'success' as const, className: 'bg-green-600 text-white hover:bg-green-700' },
      despesa: { label: 'Despesa', variant: 'destructive' as const, className: 'bg-red-600 text-white hover:bg-red-700' },
      custos: { label: 'Custos', variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
    };

    const config = tipoConfig[tipo as keyof typeof tipoConfig] || tipoConfig.ativo;

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getSpedStatusBadge = (status: string) => {
    const statusConfig = {
      gerando: { label: 'Gerando', variant: 'secondary' as const, icon: Clock },
      gerado: { label: 'Gerado', variant: 'success' as const, icon: CheckCircle },
      validado: { label: 'Validado', variant: 'default' as const, icon: CheckCircle },
      erro: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.gerando;
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
          <p className="text-muted-foreground">Carregando módulo contabilidade...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar módulo contabilidade: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo Contabilidade</h1>
          <p className="text-muted-foreground">
            Plano de contas, lançamentos contábeis e SPED
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSpedGenerator(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Gerar SPED
          </Button>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContas}</div>
            <p className="text-xs text-muted-foreground">
              Plano de contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLancamentos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lancamentosAprovados} aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centros de Custo</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCentrosCusto}</div>
            <p className="text-xs text-muted-foreground">
              Ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPED</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSpedFiscal + stats.totalSpedContabil}</div>
            <p className="text-xs text-muted-foreground">
              Fiscal + Contábil
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="plano-contas" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="sped" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            SPED
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Lançamentos</CardTitle>
                <CardDescription>
                  Estatísticas dos lançamentos contábeis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Lançamentos</span>
                  <span className="text-sm font-bold">{stats.totalLancamentos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aprovados</span>
                  <span className="text-sm font-bold text-green-600">{stats.lancamentosAprovados}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pendentes</span>
                  <span className="text-sm font-bold text-yellow-600">{stats.lancamentosPendentes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estornados</span>
                  <span className="text-sm font-bold text-red-600">{stats.lancamentosEstornados}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SPED Gerados</CardTitle>
                <CardDescription>
                  Relatórios SPED disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SPED Fiscal</span>
                  <span className="text-sm font-bold">{stats.totalSpedFiscal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SPED Contábil</span>
                  <span className="text-sm font-bold">{stats.totalSpedContabil}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-bold text-blue-600">{stats.totalSpedFiscal + stats.totalSpedContabil}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plano de Contas */}
        <TabsContent value="plano-contas" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plano de Contas</CardTitle>
                  <CardDescription>
                    Gerencie o plano de contas da empresa
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreatePlanoContas}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planoContas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conta encontrada.
                  </div>
                ) : (
                  planoContas.map((conta) => (
                    <div
                      key={conta.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conta.codigo}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium">{conta.descricao}</span>
                          {getTipoBadge(conta.tipo_conta)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Nível: {conta.nivel} | Natureza: {conta.natureza} | 
                          Saldo: {formatCurrency(conta.saldo_atual)}
                        </div>
                        {conta.observacoes && (
                          <div className="text-sm text-muted-foreground">
                            {conta.observacoes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPlanoContas(conta)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlanoContas(conta)}
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

        {/* Lançamentos Contábeis */}
        <TabsContent value="lancamentos" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lançamentos Contábeis</CardTitle>
                  <CardDescription>
                    Gerencie os lançamentos contábeis
                  </CardDescription>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateLancamento}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lançamento
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lancamentos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </div>
                ) : (
                  lancamentos.map((lancamento) => (
                    <div
                      key={lancamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lancamento.numero_documento}</span>
                          {getStatusBadge(lancamento.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {lancamento.historico}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Data: {formatDate(lancamento.data_lancamento)}</span>
                          <span>Valor: {formatCurrency(lancamento.valor_total)}</span>
                          <span>Tipo: {lancamento.tipo_lancamento}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && lancamento.status === 'rascunho' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLancamento(lancamento)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && lancamento.status === 'aprovado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEstornarLancamento(lancamento)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLancamento(lancamento)}
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


        {/* SPED */}
        <TabsContent value="sped" className="mt-6">
          <div className="space-y-6">
            {/* SPED Fiscal */}
            <Card>
              <CardHeader>
                <CardTitle>SPED Fiscal</CardTitle>
                <CardDescription>
                  Relatórios SPED Fiscal gerados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {spedFiscal.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum SPED Fiscal encontrado.
                    </div>
                  ) : (
                    spedFiscal.map((sped) => (
                      <div
                        key={sped.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">SPED Fiscal - {sped.periodo}</span>
                            {getSpedStatusBadge(sped.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Versão: {sped.versao_layout} | Gerado em: {formatDate(sped.data_geracao)}
                          </div>
                          {sped.observacoes && (
                            <div className="text-sm text-muted-foreground">
                              {sped.observacoes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {sped.arquivo_url && (
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {canGenerate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => validarSped(sped.id, 'fiscal')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SPED Contábil */}
            <Card>
              <CardHeader>
                <CardTitle>SPED Contábil</CardTitle>
                <CardDescription>
                  Relatórios SPED Contábil gerados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {spedContabil.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum SPED Contábil encontrado.
                    </div>
                  ) : (
                    spedContabil.map((sped) => (
                      <div
                        key={sped.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">SPED Contábil - {sped.periodo}</span>
                            {getSpedStatusBadge(sped.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Versão: {sped.versao_layout} | Gerado em: {formatDate(sped.data_geracao)}
                          </div>
                          {sped.observacoes && (
                            <div className="text-sm text-muted-foreground">
                              {sped.observacoes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {sped.arquivo_url && (
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {canGenerate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => validarSped(sped.id, 'contabil')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {showPlanoContasForm && (
        <PlanoContasForm
          conta={editingPlanoContas}
          onSave={handleSavePlanoContas}
          onCancel={() => {
            setShowPlanoContasForm(false);
            setEditingPlanoContas(null);
          }}
        />
      )}

      {showLancamentoForm && (
        <LancamentoForm
          lancamento={editingLancamento}
          onSave={handleSaveLancamento}
          onCancel={() => {
            setShowLancamentoForm(false);
            setEditingLancamento(null);
          }}
        />
      )}


      {showSpedGenerator && (
        <SpedGenerator
          onClose={() => setShowSpedGenerator(false)}
        />
      )}
    </div>
  );
}
