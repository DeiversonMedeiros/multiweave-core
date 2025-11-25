import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { usePendingSignatures, useApproveSignature, useRejectSignature, useSignatureApprovalsStats } from '@/hooks/rh/useSignatureApprovals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Search, Eye, Check, X, AlertTriangle, FileSignature, RefreshCw, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SignatureDetails {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  month_year: string;
  signature_timestamp?: string;
  status: string;
  manager_approval_required: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function AprovacaoAssinaturasPonto() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignature, setSelectedSignature] = useState<SignatureDetails | null>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoMotivo, setRejeicaoMotivo] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  // Hooks de dados
  const { data: pendingSignatures, isLoading: pendingLoading, error: pendingError } = usePendingSignatures();
  const { data: stats, isLoading: statsLoading } = useSignatureApprovalsStats();
  
  // Mutations
  const approveMutation = useApproveSignature();
  const rejectMutation = useRejectSignature();

  // Filtrar assinaturas
  const filteredSignatures = pendingSignatures?.filter(signature => {
    const matchesSearch = signature.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         signature.funcionario_matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         signature.month_year?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatMonthYear = (monthYear: string) => {
    try {
      const [year, month] = monthYear.split('-');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `${monthNames[parseInt(month) - 1]} de ${year}`;
    } catch {
      return monthYear;
    }
  };

  const handleApprove = async () => {
    if (!selectedSignature) return;

    try {
      await approveMutation.mutateAsync({
        id: selectedSignature.id,
        observacoes: aprovacaoObservacoes || undefined
      });

      toast({
        title: "Assinatura aprovada!",
        description: `A assinatura de ponto de ${formatMonthYear(selectedSignature.month_year)} foi aprovada com sucesso.`,
      });

      setIsAprovacaoDialogOpen(false);
      setAprovacaoObservacoes('');
      setSelectedSignature(null);
    } catch (error) {
      toast({
        title: "Erro ao aprovar assinatura",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedSignature || !rejeicaoMotivo.trim()) return;

    try {
      await rejectMutation.mutateAsync({
        id: selectedSignature.id,
        rejectionReason: rejeicaoMotivo
      });

      toast({
        title: "Assinatura rejeitada!",
        description: `A assinatura de ponto foi rejeitada.`,
      });

      setIsRejeicaoDialogOpen(false);
      setRejeicaoMotivo('');
      setSelectedSignature(null);
    } catch (error) {
      toast({
        title: "Erro ao rejeitar assinatura",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const openAprovacaoDialog = (signature: SignatureDetails) => {
    setSelectedSignature(signature);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const openRejeicaoDialog = (signature: SignatureDetails) => {
    setSelectedSignature(signature);
    setRejeicaoMotivo('');
    setIsRejeicaoDialogOpen(true);
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
          Erro ao carregar assinaturas pendentes: {pendingError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Assinaturas de Ponto</h1>
          <p className="text-gray-600">
            Gerencie as assinaturas de folha de ponto que precisam de aprovação
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-yellow-600" />
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
                <User className="w-5 h-5 text-purple-600" />
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
                  placeholder="Nome, matrícula ou mês/ano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assinaturas Pendentes</CardTitle>
          <CardDescription>
            {filteredSignatures.length} assinatura(s) pendente(s) de aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSignatures.length === 0 ? (
            <div className="text-center py-8">
              <FileSignature className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma assinatura de ponto pendente</p>
              <p className="text-sm text-gray-400 mt-2">
                As assinaturas aparecerão aqui após os funcionários assinarem
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Assinado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignatures.map((signature) => (
                  <TableRow key={signature.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{signature.funcionario_nome}</p>
                        <p className="text-sm text-gray-500">Matrícula: {signature.funcionario_matricula}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatMonthYear(signature.month_year)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatDate(signature.signature_timestamp)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Eye className="w-3 h-3 mr-1" />
                        Aguardando Aprovação
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAprovacaoDialog(signature)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejeicaoDialog(signature)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Assinatura de Ponto</DialogTitle>
            <DialogDescription>
              Confirme a aprovação da assinatura de ponto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSignature && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <p><strong>Funcionário:</strong> {selectedSignature.funcionario_nome}</p>
                <p><strong>Matrícula:</strong> {selectedSignature.funcionario_matricula}</p>
                <p><strong>Período:</strong> {formatMonthYear(selectedSignature.month_year)}</p>
                <p><strong>Assinado em:</strong> {formatDate(selectedSignature.signature_timestamp)}</p>
              </div>
            )}
            <div className="space-y-2">
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
              className="bg-green-600 hover:bg-green-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Assinatura de Ponto</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição da assinatura de ponto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSignature && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <p><strong>Funcionário:</strong> {selectedSignature.funcionario_nome}</p>
                <p><strong>Matrícula:</strong> {selectedSignature.funcionario_matricula}</p>
                <p><strong>Período:</strong> {formatMonthYear(selectedSignature.month_year)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejeicao-motivo">Motivo da Rejeição *</Label>
              <Textarea
                id="rejeicao-motivo"
                placeholder="Informe o motivo da rejeição..."
                value={rejeicaoMotivo}
                onChange={(e) => setRejeicaoMotivo(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReject} 
              variant="destructive"
              disabled={!rejeicaoMotivo.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

