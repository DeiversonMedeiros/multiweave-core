import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReimbursementRequests } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const AprovacaoReembolsos: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  const { selectedCompany } = useCompany();
  const { reimbursements, loading, error, approveReimbursement, rejectReimbursement } = useReimbursementRequests(selectedCompany?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'alimentacao': return 'Alimentação';
      case 'transporte': return 'Transporte';
      case 'hospedagem': return 'Hospedagem';
      case 'combustivel': return 'Combustível';
      case 'outros': return 'Outros';
      default: return tipo;
    }
  };

  const filteredReimbursements = reimbursements.filter(reimbursement => {
    const matchesSearch = reimbursement.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reimbursement.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || reimbursement.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    if (!selectedReimbursement || !user?.id) return;
    
    try {
      await approveReimbursement(selectedReimbursement.id, user.id, aprovacaoObservacoes);
      toast({
        title: "Reembolso aprovado!",
        description: `O reembolso de ${selectedReimbursement.funcionario_nome} foi aprovado com sucesso.`,
      });
      setIsAprovacaoDialogOpen(false);
      setSelectedReimbursement(null);
      setAprovacaoObservacoes('');
    } catch (error) {
      console.error('Erro ao aprovar reembolso:', error);
      toast({
        title: "Erro ao aprovar reembolso",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const confirmarRejeicao = async () => {
    if (!selectedReimbursement || !rejeicaoObservacoes.trim() || !user?.id) return;
    
    try {
      await rejectReimbursement(selectedReimbursement.id, user.id, rejeicaoObservacoes);
      toast({
        title: "Reembolso rejeitado!",
        description: `O reembolso de ${selectedReimbursement.funcionario_nome} foi rejeitado.`,
      });
      setIsRejeicaoDialogOpen(false);
      setSelectedReimbursement(null);
      setRejeicaoObservacoes('');
    } catch (error) {
      console.error('Erro ao rejeitar reembolso:', error);
      toast({
        title: "Erro ao rejeitar reembolso",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const getReembolsosPendentes = () => {
    return reimbursements.filter(r => r.status === 'pendente').length;
  };

  if (loading) {
    return (

    <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando reembolsos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar reembolsos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Reembolsos</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de reembolso de despesas da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-600">
            {getReembolsosPendentes()} Pendentes
          </Badge>
          <Button onClick={() => navigate('/portal-gestor/aprovacoes')}>
            Voltar para Central
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredReimbursements.length} solicitação(ões) de reembolso encontrada(s)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredReimbursements.map((reimbursement) => (
            <Card key={reimbursement.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{reimbursement.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {reimbursement.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getTipoLabel(reimbursement.tipo_despesa)} • R$ {(reimbursement.valor_solicitado || reimbursement.valor || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Data: {new Date(reimbursement.data_despesa).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {reimbursement.comprovante_url && (
                            <div className="flex items-center space-x-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Comprovante anexado
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Descrição:</strong> {reimbursement.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em: {new Date(reimbursement.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(reimbursement.status)}
                      <Badge className={getStatusColor(reimbursement.status)}>
                        {reimbursement.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReimbursement(reimbursement)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {reimbursement.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(reimbursement)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(reimbursement)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReimbursements.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de reembolso encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Reembolso</DialogTitle>
            <DialogDescription>
              Confirme a aprovação do reembolso de {selectedReimbursement?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReimbursement && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedReimbursement.funcionario_nome}</p>
                <p><strong>Tipo:</strong> {getTipoLabel(selectedReimbursement.tipo_despesa)}</p>
                <p><strong>Valor:</strong> R$ {selectedReimbursement.valor_solicitado.toFixed(2)}</p>
                <p><strong>Data:</strong> {new Date(selectedReimbursement.data_despesa).toLocaleDateString('pt-BR')}</p>
                <p><strong>Descrição:</strong> {selectedReimbursement.descricao}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Adicione observações sobre a aprovação..."
                value={aprovacaoObservacoes}
                onChange={(e) => setAprovacaoObservacoes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAprovacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovacao} className="bg-green-600 hover:bg-green-700">
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Reembolso</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do reembolso de {selectedReimbursement?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReimbursement && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedReimbursement.funcionario_nome}</p>
                <p><strong>Tipo:</strong> {getTipoLabel(selectedReimbursement.tipo_despesa)}</p>
                <p><strong>Valor:</strong> R$ {selectedReimbursement.valor_solicitado.toFixed(2)}</p>
                <p><strong>Data:</strong> {new Date(selectedReimbursement.data_despesa).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={rejeicaoObservacoes}
                onChange={(e) => setRejeicaoObservacoes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarRejeicao} 
              variant="destructive"
              disabled={!rejeicaoObservacoes.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
};

export default AprovacaoReembolsos;
