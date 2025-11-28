import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { usePendingOvertimeRecords, useApproveOvertimeRecord, useRejectOvertimeRecord, useOvertimeApprovalsStats } from '@/hooks/rh/useOvertimeApprovals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Search, Eye, Check, X, AlertTriangle, TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface OvertimeRecordDetails {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  data_registro: string;
  entrada?: string;
  saida?: string;
  entrada_almoco?: string;
  saida_almoco?: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  horas_trabalhadas: number;
  horas_extras: number; // Mantido para compatibilidade
  horas_extras_50?: number;
  horas_extras_100?: number;
  horas_para_banco?: number;
  horas_para_pagamento?: number;
  horas_faltas: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
}

export default function AprovacaoHorasExtras() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecordDetails | null>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Hooks de dados
  const { data: pendingRecords, isLoading: pendingLoading, error: pendingError } = usePendingOvertimeRecords();
  const { data: stats, isLoading: statsLoading } = useOvertimeApprovalsStats();
  
  // Mutations
  const approveMutation = useApproveOvertimeRecord();
  const rejectMutation = useRejectOvertimeRecord();

  // Filtrar registros
  const filteredRecords = pendingRecords?.filter(record => {
    const matchesSearch = record.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.funcionario_matricula?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800 border-green-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejeitado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;

    try {
      await approveMutation.mutateAsync({
        id: selectedRecord.id,
        observacoes: aprovacaoObservacoes || undefined
      });

      const totalExtras = (selectedRecord.horas_extras_50 || 0) + (selectedRecord.horas_extras_100 || 0) || selectedRecord.horas_extras;
      const extras50 = selectedRecord.horas_extras_50 ? `${selectedRecord.horas_extras_50.toFixed(1)}h (50%)` : '';
      const extras100 = selectedRecord.horas_extras_100 ? `${selectedRecord.horas_extras_100.toFixed(1)}h (100%)` : '';
      const extrasDesc = extras50 && extras100 ? `${extras50} e ${extras100}` : extras50 || extras100 || `${selectedRecord.horas_extras.toFixed(1)}h`;
      
      toast({
        title: "Hora extra aprovada!",
        description: `O registro de ponto com ${extrasDesc} de hora extra foi aprovado com sucesso.`,
      });

      setIsAprovacaoDialogOpen(false);
      setAprovacaoObservacoes('');
      setSelectedRecord(null);
    } catch (error) {
      toast({
        title: "Erro ao aprovar hora extra",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !rejeicaoObservacoes.trim()) return;

    try {
      await rejectMutation.mutateAsync({
        id: selectedRecord.id,
        observacoes: rejeicaoObservacoes
      });

      toast({
        title: "Hora extra rejeitada!",
        description: `O registro de ponto com hora extra foi rejeitado.`,
      });

      setIsRejeicaoDialogOpen(false);
      setRejeicaoObservacoes('');
      setSelectedRecord(null);
    } catch (error) {
      toast({
        title: "Erro ao rejeitar hora extra",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const openAprovacaoDialog = (record: OvertimeRecordDetails) => {
    setSelectedRecord(record);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const openRejeicaoDialog = (record: OvertimeRecordDetails) => {
    setSelectedRecord(record);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const openDetailsDialog = (record: OvertimeRecordDetails) => {
    setSelectedRecord(record);
    setIsDetailsDialogOpen(true);
  };

  if (pendingLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pendingError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Erro ao carregar registros de hora extra: {pendingError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Horas Extras</h1>
          <p className="text-gray-600">
            Gerencie os registros de ponto com hora extra que precisam de aprovação
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.total_pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Horas Extras</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_horas_extras.toFixed(2)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Funcionários</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Object.keys(stats.por_funcionario).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou matrícula do funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registros de Ponto com Hora Extra</CardTitle>
          <CardDescription>
            {filteredRecords.length} registro(s) pendente(s) de aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum registro de hora extra pendente</p>
              <p className="text-sm text-gray-400 mt-2">
                Registros sem hora extra são aprovados automaticamente
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário Normal</TableHead>
                    <TableHead>Horário Extra</TableHead>
                    <TableHead>Horas Trabalhadas</TableHead>
                    <TableHead>Hora Extra</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.funcionario_nome}</p>
                          <p className="text-sm text-gray-500">{record.funcionario_matricula}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.data_registro)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Entrada: {formatTime(record.entrada)}</p>
                          <p>Saída: {formatTime(record.saida)}</p>
                          {record.entrada_almoco && record.saida_almoco && (
                            <p className="text-xs text-gray-500">
                              Almoço: {formatTime(record.entrada_almoco)} - {formatTime(record.saida_almoco)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.entrada_extra1 && record.saida_extra1 ? (
                          <div className="text-sm">
                            <p>Extra Início: {formatTime(record.entrada_extra1)}</p>
                            <p>Extra Fim: {formatTime(record.saida_extra1)}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{record.horas_trabalhadas.toFixed(2)}h</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {/* Mostrar horas separadas se disponível */}
                          {((record.horas_extras_50 && record.horas_extras_50 > 0) || 
                            (record.horas_extras_100 && record.horas_extras_100 > 0)) ? (
                            <>
                              {record.horas_extras_50 && record.horas_extras_50 > 0 && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {record.horas_extras_50.toFixed(2)}h (50% - Banco)
                                </Badge>
                              )}
                              {record.horas_extras_100 && record.horas_extras_100 > 0 && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {record.horas_extras_100.toFixed(2)}h (100% - Pagamento)
                                </Badge>
                              )}
                            </>
                          ) : (
                            // Fallback para registros antigos
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {record.horas_extras.toFixed(2)}h
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(record.status)}
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsDialog(record)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {record.status === 'pendente' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAprovacaoDialog(record)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejeicaoDialog(record)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Aprovar Hora Extra
            </DialogTitle>
            <DialogDescription>
              Confirme a aprovação do registro de ponto com {selectedRecord?.horas_extras.toFixed(2)}h de hora extra
              para {selectedRecord?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="aprovacao-observacoes">Observações (opcional)</Label>
              <Textarea
                id="aprovacao-observacoes"
                placeholder="Adicione observações sobre a aprovação..."
                value={aprovacaoObservacoes}
                onChange={(e) => setAprovacaoObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAprovacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Aprovando...
                </div>
              ) : (
                'Aprovar Hora Extra'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejeitar Hora Extra
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do registro de ponto com hora extra para {selectedRecord?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejeicao-observacoes">Motivo da Rejeição *</Label>
              <Textarea
                id="rejeicao-observacoes"
                placeholder="Descreva o motivo da rejeição..."
                value={rejeicaoObservacoes}
                onChange={(e) => setRejeicaoObservacoes(e.target.value)}
                rows={3}
                className={!rejeicaoObservacoes.trim() ? 'border-red-500' : ''}
              />
              {!rejeicaoObservacoes.trim() && (
                <p className="text-sm text-red-500 mt-1">O motivo da rejeição é obrigatório</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejeicaoObservacoes.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Rejeitando...
                </div>
              ) : (
                'Rejeitar Hora Extra'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Detalhes do Registro de Ponto
            </DialogTitle>
            <DialogDescription>
              Informações completas do registro de ponto com hora extra
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Funcionário</Label>
                  <p className="text-sm">{selectedRecord.funcionario_nome}</p>
                  <p className="text-xs text-gray-500">{selectedRecord.funcionario_matricula}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Data</Label>
                  <p className="text-sm">{formatDate(selectedRecord.data_registro)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horário Normal</Label>
                  <div className="text-sm space-y-1 bg-gray-50 p-3 rounded-md mt-1">
                    <p>Entrada: {formatTime(selectedRecord.entrada)}</p>
                    <p>Saída: {formatTime(selectedRecord.saida)}</p>
                    {selectedRecord.entrada_almoco && selectedRecord.saida_almoco && (
                      <p className="text-xs text-gray-500">
                        Almoço: {formatTime(selectedRecord.entrada_almoco)} - {formatTime(selectedRecord.saida_almoco)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horário Extra</Label>
                  <div className="text-sm space-y-1 bg-orange-50 p-3 rounded-md mt-1">
                    {selectedRecord.entrada_extra1 && selectedRecord.saida_extra1 ? (
                      <>
                        <p>Extra Início: {formatTime(selectedRecord.entrada_extra1)}</p>
                        <p>Extra Fim: {formatTime(selectedRecord.saida_extra1)}</p>
                      </>
                    ) : (
                      <p className="text-gray-400">Nenhum horário extra registrado</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horas Trabalhadas</Label>
                  <p className="text-sm font-bold text-blue-600">{selectedRecord.horas_trabalhadas.toFixed(2)}h</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horas Extras</Label>
                  <div className="space-y-1">
                    {/* Mostrar horas separadas se disponível */}
                    {((selectedRecord.horas_extras_50 && selectedRecord.horas_extras_50 > 0) || 
                      (selectedRecord.horas_extras_100 && selectedRecord.horas_extras_100 > 0)) ? (
                      <>
                        {selectedRecord.horas_extras_50 && selectedRecord.horas_extras_50 > 0 && (
                          <p className="text-xs text-blue-600">
                            {selectedRecord.horas_extras_50.toFixed(2)}h (50% - Banco)
                          </p>
                        )}
                        {selectedRecord.horas_extras_100 && selectedRecord.horas_extras_100 > 0 && (
                          <p className="text-xs text-orange-600">
                            {selectedRecord.horas_extras_100.toFixed(2)}h (100% - Pagamento)
                          </p>
                        )}
                        <p className="text-sm font-bold text-orange-700 pt-1 border-t">
                          Total: {((selectedRecord.horas_extras_50 || 0) + (selectedRecord.horas_extras_100 || 0)).toFixed(2)}h
                        </p>
                      </>
                    ) : (
                      // Fallback para registros antigos
                      <p className="text-sm font-bold text-orange-600">{selectedRecord.horas_extras.toFixed(2)}h</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horas Faltas</Label>
                  <p className="text-sm font-bold text-red-600">{selectedRecord.horas_faltas.toFixed(2)}h</p>
                </div>
              </div>

              {selectedRecord.observacoes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Observações</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {selectedRecord.observacoes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-600">Status:</Label>
                <Badge className={getStatusColor(selectedRecord.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(selectedRecord.status)}
                    {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                  </div>
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

