import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { usePendingAttendanceCorrections, useApproveAttendanceCorrection, useRejectAttendanceCorrection, useAttendanceCorrectionsStats } from '@/hooks/rh/useAttendanceCorrections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Search, Filter, Eye, Check, X, AlertTriangle, Users, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CorrectionDetails {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  data_original: string;
  entrada_original?: string;
  saida_original?: string;
  entrada_corrigida?: string;
  saida_corrigida?: string;
  entrada_almoco_original?: string;
  saida_almoco_original?: string;
  entrada_almoco_corrigida?: string;
  saida_almoco_corrigida?: string;
  entrada_extra1_original?: string;
  saida_extra1_original?: string;
  entrada_extra1_corrigida?: string;
  saida_extra1_corrigida?: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
}

export default function AprovacaoCorrecoesPonto() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionDetails | null>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Hooks de dados
  const { data: pendingCorrections, isLoading: pendingLoading, error: pendingError } = usePendingAttendanceCorrections(selectedCompany?.id || '');
  const { data: stats, isLoading: statsLoading } = useAttendanceCorrectionsStats(selectedCompany?.id || '');
  
  // Mutations
  const approveMutation = useApproveAttendanceCorrection();
  const rejectMutation = useRejectAttendanceCorrection();

  // Filtrar correções
  const filteredCorrections = pendingCorrections?.filter(correction => {
    const matchesSearch = correction.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         correction.funcionario_matricula?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || correction.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  /** Formata data + horário para exibição no modal de detalhes (dd/MM/yyyy HH:mm). */
  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!timeStr) return '-';
    // Extrair HH:MM (aceita "HH:MM", "HH:MM:SS" ou ISO "YYYY-MM-DDTHH:MM...")
    const timeOnly = timeStr.includes('T')
      ? timeStr.substring(timeStr.indexOf('T') + 1, timeStr.indexOf('T') + 6)
      : timeStr.substring(0, 5);
    if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return timeOnly;
    const parts = dateStr.split(/[-T]/).map(Number);
    const [y, m, d] = [parts[0], parts[1], parts[2]];
    if (!y || !m || !d) return timeOnly;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return timeOnly;
    const dateFormatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${dateFormatted} ${timeOnly}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    
    // Se for string no formato YYYY-MM-DD, tratar como data local (sem timezone)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Para outros formatos, usar conversão padrão
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleApprove = async () => {
    if (!selectedCorrection) return;

    try {
      await approveMutation.mutateAsync({
        id: selectedCorrection.id,
        observacoes: aprovacaoObservacoes || undefined
      });

      toast({
        title: "Correção aprovada!",
        description: `A correção de ponto foi aprovada com sucesso.`,
      });

      setIsAprovacaoDialogOpen(false);
      setAprovacaoObservacoes('');
      setSelectedCorrection(null);
    } catch (error) {
      toast({
        title: "Erro ao aprovar correção",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedCorrection || !rejeicaoObservacoes.trim()) return;

    try {
      await rejectMutation.mutateAsync({
        id: selectedCorrection.id,
        observacoes: rejeicaoObservacoes
      });

      toast({
        title: "Correção rejeitada!",
        description: `A correção de ponto foi rejeitada.`,
      });

      setIsRejeicaoDialogOpen(false);
      setRejeicaoObservacoes('');
      setSelectedCorrection(null);
    } catch (error) {
      toast({
        title: "Erro ao rejeitar correção",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const openAprovacaoDialog = (correction: CorrectionDetails) => {
    setSelectedCorrection(correction);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const openRejeicaoDialog = (correction: CorrectionDetails) => {
    setSelectedCorrection(correction);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const openDetailsDialog = (correction: CorrectionDetails) => {
    setSelectedCorrection(correction);
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
          Erro ao carregar correções: {pendingError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Correções de Ponto</h1>
          <p className="text-gray-600">
            Gerencie as solicitações de correção de ponto dos funcionários
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Aprovadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.aprovadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejeitadas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejeitadas}</p>
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
            <div className="sm:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovadas</SelectItem>
                  <SelectItem value="rejeitado">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Correções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Correções de Ponto</CardTitle>
          <CardDescription>
            {filteredCorrections.length} correção(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCorrections.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma correção encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário Original</TableHead>
                    <TableHead>Horário Corrigido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Solicitado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCorrections.map((correction) => (
                    <TableRow key={correction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{correction.funcionario_nome}</p>
                          <p className="text-sm text-gray-500">{correction.funcionario_matricula}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(correction.data_original)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Entrada: {formatTime(correction.entrada_original)}</p>
                          <p>Saída: {formatTime(correction.saida_original)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Entrada: {formatTime(correction.entrada_corrigida)}</p>
                          <p>Saída: {formatTime(correction.saida_corrigida)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(correction.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(correction.status)}
                            {correction.status.charAt(0).toUpperCase() + correction.status.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(correction.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsDialog(correction)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {correction.status === 'pendente' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAprovacaoDialog(correction)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejeicaoDialog(correction)}
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
              Aprovar Correção de Ponto
            </DialogTitle>
            <DialogDescription>
              Confirme a aprovação da correção de ponto para {selectedCorrection?.funcionario_nome}
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
                'Aprovar Correção'
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
              Rejeitar Correção de Ponto
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição da correção de ponto para {selectedCorrection?.funcionario_nome}
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
                'Rejeitar Correção'
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
              Detalhes da Correção
            </DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de correção
            </DialogDescription>
          </DialogHeader>
          {selectedCorrection && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Funcionário</Label>
                  <p className="text-sm">{selectedCorrection.funcionario_nome}</p>
                  <p className="text-xs text-gray-500">{selectedCorrection.funcionario_matricula}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Data</Label>
                  <p className="text-sm">{formatDate(selectedCorrection.data_original)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horário Original</Label>
                  <div className="text-sm space-y-1">
                    <p>Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_original)}</p>
                    <p>Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_original)}</p>
                    {(selectedCorrection.entrada_almoco_original || selectedCorrection.saida_almoco_original) && (
                      <>
                        <p className="text-xs text-gray-500 mt-2">Almoço:</p>
                        <p className="text-xs">Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_almoco_original)}</p>
                        <p className="text-xs">Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_almoco_original)}</p>
                      </>
                    )}
                    {(selectedCorrection.entrada_extra1_original || selectedCorrection.saida_extra1_original) && (
                      <>
                        <p className="text-xs text-gray-500 mt-2">Hora Extra:</p>
                        <p className="text-xs">Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_extra1_original)}</p>
                        <p className="text-xs">Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_extra1_original)}</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Horário Corrigido</Label>
                  <div className="text-sm space-y-1">
                    <p>Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_corrigida)}</p>
                    <p>Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_corrigida)}</p>
                    {(selectedCorrection.entrada_almoco_corrigida || selectedCorrection.saida_almoco_corrigida) && (
                      <>
                        <p className="text-xs text-gray-500 mt-2">Almoço:</p>
                        <p className="text-xs">Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_almoco_corrigida)}</p>
                        <p className="text-xs">Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_almoco_corrigida)}</p>
                      </>
                    )}
                    {(selectedCorrection.entrada_extra1_corrigida || selectedCorrection.saida_extra1_corrigida) && (
                      <>
                        <p className="text-xs text-gray-500 mt-2">Hora Extra:</p>
                        <p className="text-xs">Entrada: {formatDateTime(selectedCorrection.data_original, selectedCorrection.entrada_extra1_corrigida)}</p>
                        <p className="text-xs">Saída: {formatDateTime(selectedCorrection.data_original, selectedCorrection.saida_extra1_corrigida)}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Justificativa</Label>
                <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                  {selectedCorrection.justificativa}
                </p>
              </div>

              {selectedCorrection.observacoes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Observações</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {selectedCorrection.observacoes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-600">Status:</Label>
                <Badge className={getStatusColor(selectedCorrection.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(selectedCorrection.status)}
                    {selectedCorrection.status.charAt(0).toUpperCase() + selectedCorrection.status.slice(1)}
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