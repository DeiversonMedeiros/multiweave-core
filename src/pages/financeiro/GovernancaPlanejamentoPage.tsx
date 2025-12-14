// =====================================================
// PÁGINA: M7 - GOVERNANÇA, PLANEJAMENTO E MÉRITO
// =====================================================
// Data: 2025-12-12
// Descrição: Página para visualizar e gerenciar governança e planejamento
// Autor: Sistema MultiWeave Core
// Módulo: M7 - Governança, Planejamento e Mérito

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Settings,
  BarChart3,
  FileText,
  Users,
  DollarSign,
  XCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useGovernancaPlanejamento } from '@/hooks/financial/useGovernancaPlanejamento';
import { 
  TipoEventoPlanejamento, 
  EtapaProcesso,
  SLAEtapaFormData 
} from '@/integrations/supabase/financial-types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RequireModule } from '@/components/RequireAuth';

interface GovernancaPlanejamentoPageProps {
  className?: string;
}

const ETAPAS_PROCESSO: { value: EtapaProcesso; label: string }[] = [
  { value: 'criacao_requisicao', label: 'Criação de Requisição' },
  { value: 'aprovacao_requisicao', label: 'Aprovação de Requisição' },
  { value: 'criacao_cotacao', label: 'Criação de Cotação' },
  { value: 'aprovacao_cotacao', label: 'Aprovação de Cotação' },
  { value: 'criacao_pedido', label: 'Criação de Pedido' },
  { value: 'envio_pedido', label: 'Envio de Pedido' },
  { value: 'envio_medicao', label: 'Envio de Medição' },
  { value: 'criacao_conta_pagar', label: 'Criação de Conta a Pagar' },
  { value: 'envio_documentos_pagamento', label: 'Envio de Documentos para Pagamento' },
  { value: 'aprovacao_pagamento', label: 'Aprovação de Pagamento' },
  { value: 'pagamento', label: 'Pagamento' }
];

const TIPOS_EVENTO: { value: TipoEventoPlanejamento; label: string; color: string }[] = [
  { value: 'pagamento_hoje', label: 'Pagamento para Hoje', color: 'bg-red-100 text-red-800' },
  { value: 'compra_urgente', label: 'Compra Urgente', color: 'bg-orange-100 text-orange-800' },
  { value: 'medicao_fora_janela', label: 'Medição Fora da Janela', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'documento_fora_prazo', label: 'Documento Fora do Prazo', color: 'bg-purple-100 text-purple-800' },
  { value: 'requisicao_sem_antecedencia', label: 'Requisição Sem Antecedência', color: 'bg-blue-100 text-blue-800' }
];

export function GovernancaPlanejamentoPage({ className }: GovernancaPlanejamentoPageProps) {
  return (
    <RequireModule moduleName="financeiro" action="read">
      <GovernancaPlanejamentoContent className={className} />
    </RequireModule>
  );
}

function GovernancaPlanejamentoContent({ className }: GovernancaPlanejamentoPageProps) {
  const governancaData = useGovernancaPlanejamento();
  
  const {
    slas,
    slasLoading,
    eventos,
    eventosLoading,
    kpis,
    kpisLoading,
    eventosFilters,
    setEventosFilters,
    kpisFilters,
    setKpisFilters,
    criarSLA,
    atualizarSLA,
    deletarSLA,
    criarSLAsPadrao,
    marcarEventoResolvido,
    calcularKPIs,
    calcularKPIsTodosGestores,
    refreshSLAs,
    refreshEventos,
    refreshKPIs
  } = governancaData;

  const [activeTab, setActiveTab] = useState('eventos');
  const [slaDialogOpen, setSlaDialogOpen] = useState(false);
  const [slaFormData, setSlaFormData] = useState<SLAEtapaFormData>({
    etapa_processo: 'criacao_requisicao',
    prazo_minimo_horas: 24,
    prazo_ideal_horas: 72,
    descricao: ''
  });

  // Estatísticas resumidas
  const estatisticas = useMemo(() => {
    const eventosNaoResolvidos = eventos.filter(e => !e.resolvido);
    const eventosComViolacao = eventos.filter(e => e.violou_sla);
    const totalEventos = eventos.length;
    const percentualViolacoes = totalEventos > 0 ? (eventosComViolacao.length / totalEventos) * 100 : 0;

    return {
      totalEventos,
      eventosNaoResolvidos: eventosNaoResolvidos.length,
      eventosComViolacao: eventosComViolacao.length,
      percentualViolacoes,
      totalSLAs: slas.length,
      totalKPIs: kpis.length
    };
  }, [eventos, slas, kpis]);

  const handleCriarSLA = async () => {
    try {
      await criarSLA(slaFormData);
      setSlaDialogOpen(false);
      setSlaFormData({
        etapa_processo: 'criacao_requisicao',
        prazo_minimo_horas: 24,
        prazo_ideal_horas: 72,
        descricao: ''
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleCalcularKPIsMes = async () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    try {
      await calcularKPIsTodosGestores(
        inicioMes.toISOString().split('T')[0],
        hoje.toISOString().split('T')[0]
      );
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const formatarHoras = (horas: number) => {
    if (horas >= 24) {
      const dias = Math.floor(horas / 24);
      const horasRestantes = horas % 24;
      if (horasRestantes === 0) {
        return `${dias} dia${dias > 1 ? 's' : ''}`;
      }
      return `${dias} dia${dias > 1 ? 's' : ''} e ${horasRestantes}h`;
    }
    return `${horas}h`;
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Governança e Planejamento</h1>
            <p className="text-muted-foreground">
              M7 - Mensurar nível de organização de gestores e identificar violações de SLA
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshEventos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleCalcularKPIsMes} disabled={kpisLoading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Calcular KPIs do Mês
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalEventos}</div>
              <p className="text-xs text-muted-foreground">
                {estatisticas.eventosNaoResolvidos} não resolvidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Violações de SLA</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.eventosComViolacao}</div>
              <p className="text-xs text-muted-foreground">
                {estatisticas.percentualViolacoes.toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLAs Configurados</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalSLAs}</div>
              <p className="text-xs text-muted-foreground">
                Etapas com prazo definido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KPIs Calculados</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalKPIs}</div>
              <p className="text-xs text-muted-foreground">
                Períodos analisados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="eventos">Eventos de Planejamento</TabsTrigger>
            <TabsTrigger value="slas">Configuração de SLAs</TabsTrigger>
            <TabsTrigger value="kpis">KPIs por Gestor</TabsTrigger>
          </TabsList>

          {/* Tab: Eventos */}
          <TabsContent value="eventos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Eventos de Planejamento</CardTitle>
                    <CardDescription>
                      Registro de pagamentos urgentes, compras urgentes e medições fora da janela
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label>Tipo de Evento</Label>
                    <Select
                      value={eventosFilters.tipo_evento || 'all'}
                      onValueChange={(value) => 
                        setEventosFilters({ ...eventosFilters, tipo_evento: value === 'all' ? undefined : value as TipoEventoPlanejamento })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {TIPOS_EVENTO.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Violou SLA</Label>
                    <Select
                      value={eventosFilters.violou_sla === undefined ? 'all' : eventosFilters.violou_sla ? 'true' : 'false'}
                      onValueChange={(value) => 
                        setEventosFilters({ ...eventosFilters, violou_sla: value === 'all' ? undefined : value === 'true' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={eventosFilters.resolvido === undefined ? 'all' : eventosFilters.resolvido ? 'resolvido' : 'pendente'}
                      onValueChange={(value) => 
                        setEventosFilters({ ...eventosFilters, resolvido: value === 'all' ? undefined : value === 'resolvido' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={eventosFilters.data_inicio || ''}
                      onChange={(e) => 
                        setEventosFilters({ ...eventosFilters, data_inicio: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>

                {/* Lista de Eventos */}
                {eventosLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : eventos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum evento encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventos.map(evento => {
                      const tipoEvento = TIPOS_EVENTO.find(t => t.value === evento.tipo_evento);
                      return (
                        <Card key={evento.id} className={evento.violou_sla ? 'border-orange-500' : ''}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={tipoEvento?.color || 'bg-gray-100 text-gray-800'}>
                                    {tipoEvento?.label || evento.tipo_evento}
                                  </Badge>
                                  {evento.violou_sla && (
                                    <Badge variant="destructive">Violou SLA</Badge>
                                  )}
                                  {evento.resolvido && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolvido
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium">{evento.motivo}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {evento.gestor_nome || 'Gestor não identificado'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatarData(evento.data_evento)}
                                  </span>
                                  {evento.antecedencia_horas !== undefined && (
                                    <span className="flex items-center gap-1">
                                      {evento.antecedencia_horas < 0 ? (
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                      ) : (
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                      )}
                                      Antecedência: {formatarHoras(Math.abs(evento.antecedencia_horas))}
                                    </span>
                                  )}
                                  {evento.valor && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      R$ {evento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                {evento.observacoes && (
                                  <p className="text-sm text-muted-foreground mt-2">{evento.observacoes}</p>
                                )}
                              </div>
                              {!evento.resolvido && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => marcarEventoResolvido(evento.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolver
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: SLAs */}
          <TabsContent value="slas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configuração de SLAs</CardTitle>
                    <CardDescription>
                      Defina prazos mínimos e ideais para cada etapa do processo financeiro
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={criarSLAsPadrao}>
                      Criar SLAs Padrão
                    </Button>
                    <Dialog open={slaDialogOpen} onOpenChange={setSlaDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo SLA
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo SLA</DialogTitle>
                          <DialogDescription>
                            Configure o prazo mínimo e ideal para uma etapa do processo
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Etapa do Processo</Label>
                            <Select
                              value={slaFormData.etapa_processo}
                              onValueChange={(value) => 
                                setSlaFormData({ ...slaFormData, etapa_processo: value as EtapaProcesso })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ETAPAS_PROCESSO.map(etapa => (
                                  <SelectItem key={etapa.value} value={etapa.value}>
                                    {etapa.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Prazo Mínimo (horas)</Label>
                            <Input
                              type="number"
                              value={slaFormData.prazo_minimo_horas}
                              onChange={(e) => 
                                setSlaFormData({ ...slaFormData, prazo_minimo_horas: parseInt(e.target.value) || 0 })
                              }
                            />
                          </div>
                          <div>
                            <Label>Prazo Ideal (horas)</Label>
                            <Input
                              type="number"
                              value={slaFormData.prazo_ideal_horas}
                              onChange={(e) => 
                                setSlaFormData({ ...slaFormData, prazo_ideal_horas: parseInt(e.target.value) || 0 })
                              }
                            />
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={slaFormData.descricao || ''}
                              onChange={(e) => 
                                setSlaFormData({ ...slaFormData, descricao: e.target.value })
                              }
                              placeholder="Descrição opcional do SLA"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSlaDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCriarSLA}>
                            Criar SLA
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  {slasLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : slas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum SLA configurado. Clique em "Criar SLAs Padrão" para começar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slas.map(sla => {
                        const etapa = ETAPAS_PROCESSO.find(e => e.value === sla.etapa_processo);
                        return (
                          <Card key={sla.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-medium">{etapa?.label || sla.etapa_processo}</h3>
                                  {sla.descricao && (
                                    <p className="text-sm text-muted-foreground mt-1">{sla.descricao}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">Mínimo: {formatarHoras(sla.prazo_minimo_horas)}</Badge>
                                      <Badge variant="outline">Ideal: {formatarHoras(sla.prazo_ideal_horas)}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletarSLA(sla.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          {/* Tab: KPIs */}
          <TabsContent value="kpis" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>KPIs de Planejamento por Gestor</CardTitle>
                    <CardDescription>
                      Indicadores de organização e planejamento de cada gestor
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="Data início"
                      value={kpisFilters.periodo_inicio || ''}
                      onChange={(e) => 
                        setKpisFilters({ ...kpisFilters, periodo_inicio: e.target.value || undefined })
                      }
                      className="w-40"
                    />
                    <Input
                      type="date"
                      placeholder="Data fim"
                      value={kpisFilters.periodo_fim || ''}
                      onChange={(e) => 
                        setKpisFilters({ ...kpisFilters, periodo_fim: e.target.value || undefined })
                      }
                      className="w-40"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : kpis.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum KPI calculado. Use o botão "Calcular KPIs do Mês" para gerar os indicadores.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kpis.map(kpi => (
                      <Card key={kpi.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{kpi.gestor_nome || 'Gestor não identificado'}</CardTitle>
                              <CardDescription>
                                {new Date(kpi.periodo_inicio).toLocaleDateString('pt-BR')} até{' '}
                                {new Date(kpi.periodo_fim).toLocaleDateString('pt-BR')}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Operações Urgentes</p>
                              <p className="text-2xl font-bold">
                                {kpi.percentual_operacoes_urgentes.toFixed(1)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {kpi.operacoes_urgentes} de {kpi.total_operacoes}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Tempo Médio Antecedência</p>
                              <p className="text-2xl font-bold">
                                {kpi.tempo_medio_antecedencia_dias >= 0 ? '+' : ''}
                                {kpi.tempo_medio_antecedencia_dias.toFixed(1)} dias
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatarHoras(Math.abs(kpi.tempo_medio_antecedencia_horas))}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Violações de SLA</p>
                              <p className="text-2xl font-bold text-orange-600">
                                {kpi.percentual_violacoes_sla.toFixed(1)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {kpi.total_violacoes_sla} violações
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Valor Total</p>
                              <p className="text-2xl font-bold">
                                R$ {kpi.valor_total_operacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                R$ {kpi.valor_operacoes_urgentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} urgentes
                              </p>
                            </div>
                          </div>
                          
                          {/* Detalhamento por tipo */}
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Detalhamento por Tipo de Evento</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Pagamento Hoje: </span>
                                <span className="font-medium">{kpi.eventos_pagamento_hoje}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Compra Urgente: </span>
                                <span className="font-medium">{kpi.eventos_compra_urgente}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Medição Fora Janela: </span>
                                <span className="font-medium">{kpi.eventos_medicao_fora_janela}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Documento Fora Prazo: </span>
                                <span className="font-medium">{kpi.eventos_documento_fora_prazo}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sem Antecedência: </span>
                                <span className="font-medium">{kpi.eventos_requisicao_sem_antecedencia}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
