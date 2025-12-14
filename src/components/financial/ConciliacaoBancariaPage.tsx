// =====================================================
// COMPONENTE: PÁGINA DE CONCILIAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-12-12
// Descrição: Página para gerenciar conciliação bancária
// Autor: Sistema MultiWeave Core
// Módulo: M4 - Conciliação Bancária

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { useMovimentacoesBancarias } from '@/hooks/financial/useMovimentacoesBancarias';
import { MovimentacaoBancaria, ConciliacaoPendencia } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CSVParseOptions } from '@/services/bancario/csvParser';

interface ConciliacaoBancariaPageProps {
  className?: string;
}

export function ConciliacaoBancariaPage({ className }: ConciliacaoBancariaPageProps) {
  const { selectedCompany } = useCompany();
  const [contaBancariaId, setContaBancariaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPendenciaDialog, setShowPendenciaDialog] = useState(false);
  const [selectedPendencia, setSelectedPendencia] = useState<ConciliacaoPendencia | null>(null);
  const [solucaoPendencia, setSolucaoPendencia] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'ofx' | 'csv'>('ofx');
  const [importing, setImporting] = useState(false);

  const {
    movimentacoes,
    pendencias,
    loading,
    error,
    importarExtrato,
    criarMovimentacao,
    conciliarAutomatico,
    atualizarStatusConciliacao,
    resolverPendencia,
    refresh,
  } = useMovimentacoesBancarias(contaBancariaId || undefined);

  // Filtrar movimentações por status
  const movimentacoesPendentes = movimentacoes.filter(m => m.status_conciliacao === 'pendente');
  const movimentacoesConciliadas = movimentacoes.filter(m => m.status_conciliacao === 'conciliada');
  const movimentacoesDivergentes = movimentacoes.filter(m => m.status_conciliacao === 'divergente');

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
      conciliada: { label: 'Conciliada', variant: 'default' as const, icon: CheckCircle },
      parcial: { label: 'Parcial', variant: 'default' as const, icon: AlertTriangle },
      divergente: { label: 'Divergente', variant: 'destructive' as const, icon: XCircle },
      ignorada: { label: 'Ignorada', variant: 'outline' as const, icon: XCircle },
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

  const handleConciliarAutomatico = async () => {
    if (!contaBancariaId) {
      alert('Selecione uma conta bancária');
      return;
    }
    try {
      await conciliarAutomatico(contaBancariaId, dataInicio || undefined, dataFim || undefined);
    } catch (error) {
      console.error('Erro ao conciliar:', error);
    }
  };

  const handleResolverPendencia = async () => {
    if (!selectedPendencia || !solucaoPendencia.trim()) {
      alert('Descreva a solução aplicada');
      return;
    }
    try {
      await resolverPendencia(selectedPendencia.id, solucaoPendencia);
      setShowPendenciaDialog(false);
      setSelectedPendencia(null);
      setSolucaoPendencia('');
    } catch (error) {
      console.error('Erro ao resolver pendência:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conciliação Bancária</h2>
          <p className="text-muted-foreground">
            Importe extratos e concilie movimentações bancárias com títulos a pagar/receber
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Extrato
          </Button>
          <Button onClick={handleConciliarAutomatico} disabled={!contaBancariaId}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Conciliação Automática
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Carregar contas bancárias */}
                  <SelectItem value="">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={refresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Total Movimentações</Label>
              <p className="text-2xl font-bold">{movimentacoes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Pendentes</Label>
              <p className="text-2xl font-bold text-yellow-600">{movimentacoesPendentes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Conciliadas</Label>
              <p className="text-2xl font-bold text-green-600">{movimentacoesConciliadas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Pendências</Label>
              <p className="text-2xl font-bold text-red-600">{pendencias.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de movimentações e pendências */}
      <Tabs defaultValue="movimentacoes" className="w-full">
        <TabsList>
          <TabsTrigger value="movimentacoes">
            Movimentações ({movimentacoes.length})
          </TabsTrigger>
          <TabsTrigger value="pendencias">
            Pendências ({pendencias.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Bancárias</CardTitle>
              <CardDescription>
                Movimentações importadas do extrato bancário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : movimentacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma movimentação encontrada. Importe um extrato para começar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Título Vinculado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{formatDate(mov.data_movimento)}</TableCell>
                        <TableCell className="max-w-xs truncate">{mov.historico}</TableCell>
                        <TableCell>
                          <Badge variant={mov.tipo_movimento === 'credito' ? 'default' : 'destructive'}>
                            {mov.tipo_movimento === 'credito' ? 'Crédito' : 'Débito'}
                          </Badge>
                        </TableCell>
                        <TableCell className={mov.tipo_movimento === 'credito' ? 'text-green-600' : 'text-red-600'}>
                          {mov.tipo_movimento === 'credito' ? '+' : '-'}{formatCurrency(Math.abs(mov.valor))}
                        </TableCell>
                        <TableCell>{getStatusBadge(mov.status_conciliacao)}</TableCell>
                        <TableCell>
                          {mov.conta_pagar_id || mov.conta_receber_id || mov.lote_pagamento_id ? (
                            <Badge variant="outline">Vinculado</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {mov.status_conciliacao === 'divergente' && (
                            <Button variant="ghost" size="sm">
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendencias">
          <Card>
            <CardHeader>
              <CardTitle>Pendências de Conciliação</CardTitle>
              <CardDescription>
                Movimentações que requerem análise manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendencias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma pendência encontrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor Esperado</TableHead>
                      <TableHead>Valor Real</TableHead>
                      <TableHead>Diferença</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendencias.map((pendencia) => (
                      <TableRow key={pendencia.id}>
                        <TableCell>
                          <Badge variant="destructive">{pendencia.tipo_pendencia.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">{pendencia.descricao}</TableCell>
                        <TableCell>
                          {pendencia.valor_esperado ? formatCurrency(pendencia.valor_esperado) : '-'}
                        </TableCell>
                        <TableCell>
                          {pendencia.valor_real ? formatCurrency(pendencia.valor_real) : '-'}
                        </TableCell>
                        <TableCell>
                          {pendencia.diferenca ? (
                            <span className={pendencia.diferenca > 0 ? 'text-red-600' : 'text-green-600'}>
                              {formatCurrency(Math.abs(pendencia.diferenca))}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPendencia(pendencia);
                              setShowPendenciaDialog(true);
                            }}
                          >
                            Resolver
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
      </Tabs>

      {/* Dialog de importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Extrato Bancário</DialogTitle>
            <DialogDescription>
              Selecione o arquivo OFX ou CSV do extrato bancário para importar as movimentações
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Arquivo *</Label>
              <Select 
                value={fileType} 
                onValueChange={(value) => {
                  setFileType(value as 'ofx' | 'csv');
                  setSelectedFile(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ofx">OFX (Open Financial Exchange)</SelectItem>
                  <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <Input 
                type="file" 
                accept={fileType === 'ofx' ? '.ofx' : '.csv'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos suportados: {fileType === 'ofx' ? 'OFX' : 'CSV'}
              </p>
            </div>
            {fileType === 'csv' && (
              <div className="space-y-2 p-4 bg-muted rounded-md">
                <Label className="text-sm font-semibold">Opções de Importação CSV</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  O sistema tentará detectar automaticamente o formato. Se necessário, ajuste as opções abaixo.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Delimitador</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                        <SelectItem value=",">Vírgula (,)</SelectItem>
                        <SelectItem value="\t">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Formato de Data</Label>
                    <Select defaultValue="DD/MM/YYYY">
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setSelectedFile(null);
              }}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedFile || !contaBancariaId) {
                  toast.error('Selecione um arquivo e uma conta bancária');
                  return;
                }

                try {
                  setImporting(true);
                  await importarExtrato(contaBancariaId, selectedFile, fileType);
                  setShowImportDialog(false);
                  setSelectedFile(null);
                } catch (error) {
                  console.error('Erro ao importar:', error);
                } finally {
                  setImporting(false);
                }
              }}
              disabled={!selectedFile || !contaBancariaId || importing}
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importando...
                </>
              ) : (
                'Importar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de resolução de pendência */}
      <Dialog open={showPendenciaDialog} onOpenChange={setShowPendenciaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Pendência</DialogTitle>
            <DialogDescription>
              Descreva a solução aplicada para esta pendência
            </DialogDescription>
          </DialogHeader>
          {selectedPendencia && (
            <div className="space-y-4">
              <div>
                <Label>Descrição da Pendência</Label>
                <p className="text-sm text-muted-foreground">{selectedPendencia.descricao}</p>
              </div>
              <div className="space-y-2">
                <Label>Solução Aplicada *</Label>
                <Textarea
                  value={solucaoPendencia}
                  onChange={(e) => setSolucaoPendencia(e.target.value)}
                  rows={4}
                  placeholder="Descreva como a pendência foi resolvida..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPendenciaDialog(false);
              setSelectedPendencia(null);
              setSolucaoPendencia('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleResolverPendencia}>
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

