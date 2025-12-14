// =====================================================
// COMPONENTE: CAIXA DE ENTRADA DE OBRIGAÇÕES FISCAIS
// =====================================================
// Data: 2025-12-12
// Descrição: Interface centralizada para gerenciar obrigações fiscais
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Inbox, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Filter,
  Search,
  FileText,
  Download
} from 'lucide-react';
import { useObrigacoesFiscais } from '@/hooks/tributario/useObrigacoesFiscais';
import { ObrigacaoFiscal, ObrigacaoFiscalFormData } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';

interface ObrigacoesFiscaisPageProps {
  className?: string;
}

const TIPOS_OBRIGACAO = [
  { value: 'darf', label: 'DARF' },
  { value: 'gps', label: 'GPS (INSS)' },
  { value: 'dctf', label: 'DCTF' },
  { value: 'efd', label: 'EFD (Escrituração Fiscal Digital)' },
  { value: 'sped', label: 'SPED' },
  { value: 'sefip', label: 'SEFIP' },
  { value: 'rais', label: 'RAIS' },
  { value: 'caged', label: 'CAGED' },
  { value: 'dirf', label: 'DIRF' },
  { value: 'darf_anual', label: 'DARF Anual' },
  { value: 'outros', label: 'Outros' },
] as const;

export function ObrigacoesFiscaisPage({ className }: ObrigacoesFiscaisPageProps) {
  const {
    obrigacoes,
    loading,
    error,
    createObrigacao,
    updateObrigacao,
    deleteObrigacao,
    marcarComoApresentada,
    marcarComoPaga,
    getObrigacoesVencidas,
    getObrigacoesVencendo,
    refresh,
  } = useObrigacoesFiscais();

  const [showForm, setShowForm] = useState(false);
  const [showApresentacaoDialog, setShowApresentacaoDialog] = useState(false);
  const [selectedObrigacao, setSelectedObrigacao] = useState<ObrigacaoFiscal | null>(null);
  const [protocoloApresentacao, setProtocoloApresentacao] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  // Calcular resumo usando useMemo para evitar recálculos desnecessários
  const resumo = useMemo(() => {
    if (loading) {
      return {
        total: 0,
        pendentes: 0,
        vencidas: 0,
        vencendo7dias: 0,
        valorTotal: 0,
        valorVencido: 0,
        valorVencendo7dias: 0,
      };
    }

    const vencidas = getObrigacoesVencidas();
    const vencendo = getObrigacoesVencendo(7);

    return {
      total: obrigacoes.length,
      pendentes: obrigacoes.filter(o => o.status === 'pendente').length,
      vencidas: vencidas.length,
      vencendo7dias: vencendo.length,
      valorTotal: obrigacoes.reduce((sum, o) => sum + o.valor_total, 0),
      valorVencido: vencidas.reduce((sum, o) => sum + o.valor_total, 0),
      valorVencendo7dias: vencendo.reduce((sum, o) => sum + o.valor_total, 0),
    };
  }, [obrigacoes, loading, getObrigacoesVencidas, getObrigacoesVencendo]);

  const [formData, setFormData] = useState<ObrigacaoFiscalFormData>({
    tipo_obrigacao: 'darf',
    descricao: '',
    periodo_referencia: format(new Date(), 'yyyy-MM'),
    data_vencimento: '',
    data_competencia: format(new Date(), 'yyyy-MM-dd'),
    valor_principal: 0,
    valor_multa: 0,
    valor_juros: 0,
    prioridade: 'normal',
  });

  // Resumo é calculado via useMemo acima, não precisa de useEffect

  // Filtrar obrigações
  const filteredObrigacoes = obrigacoes.filter(ob => {
    const matchSearch = ob.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       ob.periodo_referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       ob.codigo_receita?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filtroStatus === 'all' || ob.status === filtroStatus;
    const matchTipo = filtroTipo === 'all' || ob.tipo_obrigacao === filtroTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const obrigacoesVencidas = getObrigacoesVencidas();
  const obrigacoesVencendo = getObrigacoesVencendo(7);

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
    const config = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: AlertTriangle },
      em_analise: { label: 'Em Análise', variant: 'default' as const, icon: AlertTriangle },
      apresentada: { label: 'Apresentada', variant: 'default' as const, icon: FileText },
      paga: { label: 'Paga', variant: 'default' as const, icon: CheckCircle },
      vencida: { label: 'Vencida', variant: 'destructive' as const, icon: XCircle },
      cancelada: { label: 'Cancelada', variant: 'outline' as const, icon: XCircle },
    };
    const statusConfig = config[status as keyof typeof config] || config.pendente;
    const Icon = statusConfig.icon;
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const config = {
      baixa: { label: 'Baixa', variant: 'outline' as const },
      normal: { label: 'Normal', variant: 'default' as const },
      alta: { label: 'Alta', variant: 'default' as const },
      critica: { label: 'Crítica', variant: 'destructive' as const },
    };
    const prioridadeConfig = config[prioridade as keyof typeof config] || config.normal;
    return <Badge variant={prioridadeConfig.variant}>{prioridadeConfig.label}</Badge>;
  };

  const getDiasAteVencimento = (dataVencimento: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    return differenceInDays(vencimento, hoje);
  };

  const handleOpenForm = (obrigacao?: ObrigacaoFiscal) => {
    if (obrigacao) {
      setSelectedObrigacao(obrigacao);
      setFormData({
        tipo_obrigacao: obrigacao.tipo_obrigacao,
        codigo_receita: obrigacao.codigo_receita,
        descricao: obrigacao.descricao,
        periodo_referencia: obrigacao.periodo_referencia,
        data_vencimento: obrigacao.data_vencimento,
        data_competencia: obrigacao.data_competencia,
        valor_principal: obrigacao.valor_principal,
        valor_multa: obrigacao.valor_multa,
        valor_juros: obrigacao.valor_juros,
        prioridade: obrigacao.prioridade,
        observacoes: obrigacao.observacoes,
      });
    } else {
      setSelectedObrigacao(null);
      setFormData({
        tipo_obrigacao: 'darf',
        descricao: '',
        periodo_referencia: format(new Date(), 'yyyy-MM'),
        data_vencimento: '',
        data_competencia: format(new Date(), 'yyyy-MM-dd'),
        valor_principal: 0,
        valor_multa: 0,
        valor_juros: 0,
        prioridade: 'normal',
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (selectedObrigacao) {
        await updateObrigacao(selectedObrigacao.id, formData);
      } else {
        await createObrigacao(formData);
      }
      setShowForm(false);
      setSelectedObrigacao(null);
    } catch (error) {
      console.error('Erro ao salvar obrigação:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caixa de Entrada de Obrigações Fiscais</h2>
          <p className="text-muted-foreground">
            Centralize e gerencie todas as obrigações fiscais da empresa
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Obrigação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Total</Label>
              <p className="text-2xl font-bold">{resumo.total}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(resumo.valorTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Pendentes</Label>
              <p className="text-2xl font-bold">{resumo.pendentes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Vencidas</Label>
              <p className="text-2xl font-bold text-red-600">{resumo.vencidas}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(resumo.valorVencido)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Vencendo (7 dias)</Label>
              <p className="text-2xl font-bold text-yellow-600">{resumo.vencendo7dias}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(resumo.valorVencendo7dias)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descrição, período ou código de receita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="apresentada">Apresentada</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS_OBRIGACAO.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="todas" className="w-full">
        <TabsList>
          <TabsTrigger value="todas">
            Todas ({filteredObrigacoes.length})
          </TabsTrigger>
          <TabsTrigger value="vencidas">
            Vencidas ({obrigacoesVencidas.length})
          </TabsTrigger>
          <TabsTrigger value="vencendo">
            Vencendo (7 dias) ({obrigacoesVencendo.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Obrigações</CardTitle>
              <CardDescription>
                {filteredObrigacoes.length} obrigação(ões) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : filteredObrigacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma obrigação encontrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObrigacoes.map((ob) => {
                      const diasAteVencimento = getDiasAteVencimento(ob.data_vencimento);
                      return (
                        <TableRow key={ob.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {TIPOS_OBRIGACAO.find(t => t.value === ob.tipo_obrigacao)?.label || ob.tipo_obrigacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">{ob.descricao}</TableCell>
                          <TableCell>{ob.periodo_referencia}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(ob.data_vencimento)}</span>
                              {diasAteVencimento < 0 && (
                                <span className="text-xs text-red-600">
                                  {Math.abs(diasAteVencimento)} dia(s) atrasado
                                </span>
                              )}
                              {diasAteVencimento >= 0 && diasAteVencimento <= 7 && (
                                <span className="text-xs text-yellow-600">
                                  Vence em {diasAteVencimento} dia(s)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(ob.valor_total)}</TableCell>
                          <TableCell>{getStatusBadge(ob.status)}</TableCell>
                          <TableCell>{getPrioridadeBadge(ob.prioridade)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {ob.status === 'pendente' || ob.status === 'em_analise' ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedObrigacao(ob);
                                      setShowApresentacaoDialog(true);
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => marcarComoPaga(ob.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(ob)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Deseja realmente excluir esta obrigação?')) {
                                    deleteObrigacao(ob.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas">
          <Card>
            <CardHeader>
              <CardTitle>Obrigações Vencidas</CardTitle>
              <CardDescription>
                {obrigacoesVencidas.length} obrigação(ões) vencida(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obrigacoesVencidas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma obrigação vencida
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obrigacoesVencidas.map((ob) => (
                      <TableRow key={ob.id} className="bg-red-50">
                        <TableCell>
                          <Badge variant="outline">
                            {TIPOS_OBRIGACAO.find(t => t.value === ob.tipo_obrigacao)?.label || ob.tipo_obrigacao}
                          </Badge>
                        </TableCell>
                        <TableCell>{ob.descricao}</TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {formatDate(ob.data_vencimento)}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(ob.valor_total)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(ob)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencendo">
          <Card>
            <CardHeader>
              <CardTitle>Obrigações Vencendo (Próximos 7 dias)</CardTitle>
              <CardDescription>
                {obrigacoesVencendo.length} obrigação(ões) vencendo em breve
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obrigacoesVencendo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma obrigação vencendo nos próximos 7 dias
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obrigacoesVencendo.map((ob) => {
                      const diasAteVencimento = getDiasAteVencimento(ob.data_vencimento);
                      return (
                        <TableRow key={ob.id} className="bg-yellow-50">
                          <TableCell>
                            <Badge variant="outline">
                              {TIPOS_OBRIGACAO.find(t => t.value === ob.tipo_obrigacao)?.label || ob.tipo_obrigacao}
                            </Badge>
                          </TableCell>
                          <TableCell>{ob.descricao}</TableCell>
                          <TableCell className="text-yellow-600 font-semibold">
                            {formatDate(ob.data_vencimento)} ({diasAteVencimento} dia(s))
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(ob.valor_total)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenForm(ob)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedObrigacao ? 'Editar Obrigação Fiscal' : 'Nova Obrigação Fiscal'}
            </DialogTitle>
            <DialogDescription>
              Registre uma nova obrigação fiscal ou edite uma existente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Obrigação *</Label>
                <Select
                  value={formData.tipo_obrigacao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_obrigacao: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OBRIGACAO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código de Receita</Label>
                <Input
                  value={formData.codigo_receita || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_receita: e.target.value })}
                  placeholder="Ex: 2880"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Período de Referência *</Label>
                <Input
                  type="month"
                  value={formData.periodo_referencia}
                  onChange={(e) => setFormData({ ...formData, periodo_referencia: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Competência *</Label>
                <Input
                  type="date"
                  value={formData.data_competencia}
                  onChange={(e) => setFormData({ ...formData, data_competencia: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Valor Principal *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_principal}
                  onChange={(e) => setFormData({ ...formData, valor_principal: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Multa</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_multa || 0}
                  onChange={(e) => setFormData({ ...formData, valor_multa: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Juros</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_juros || 0}
                  onChange={(e) => setFormData({ ...formData, valor_juros: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {selectedObrigacao ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de apresentação */}
      <Dialog open={showApresentacaoDialog} onOpenChange={setShowApresentacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Apresentada</DialogTitle>
            <DialogDescription>
              Informe o protocolo de apresentação (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocolo de Apresentação</Label>
              <Input
                value={protocoloApresentacao}
                onChange={(e) => setProtocoloApresentacao(e.target.value)}
                placeholder="Número do protocolo (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApresentacaoDialog(false);
              setProtocoloApresentacao('');
              setSelectedObrigacao(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              if (selectedObrigacao) {
                await marcarComoApresentada(selectedObrigacao.id, protocoloApresentacao || undefined);
                setShowApresentacaoDialog(false);
                setProtocoloApresentacao('');
                setSelectedObrigacao(null);
              }
            }}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

