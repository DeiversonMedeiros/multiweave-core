import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompensationRequests } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const AprovacaoCompensacoes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedCompensation, setSelectedCompensation] = useState<any>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  const { selectedCompany } = useCompany();
  const { compensations, loading, error, approveCompensation, rejectCompensation } = useCompensationRequests(selectedCompany?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'compensado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'compensado': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'banco_horas': return 'Banco de Horas';
      case 'hora_extra': return 'Hora Extra';
      case 'adicional_noturno': return 'Adicional Noturno';
      case 'sobreaviso': return 'Sobreaviso';
      default: return tipo;
    }
  };

  const filteredCompensations = compensations.filter(compensation => {
    const matchesSearch = compensation.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compensation.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || compensation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (compensation: any) => {
    setSelectedCompensation(compensation);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (compensation: any) => {
    setSelectedCompensation(compensation);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    if (!selectedCompensation || !user?.id) return;
    
    try {
      await approveCompensation(selectedCompensation.id, user.id, aprovacaoObservacoes);
      toast({
        title: "Compensação aprovada!",
        description: `A compensação de ${selectedCompensation.funcionario_nome} foi aprovada com sucesso.`,
      });
      setIsAprovacaoDialogOpen(false);
      setSelectedCompensation(null);
      setAprovacaoObservacoes('');
    } catch (error) {
      console.error('Erro ao aprovar compensação:', error);
      toast({
        title: "Erro ao aprovar compensação",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const confirmarRejeicao = async () => {
    if (!selectedCompensation || !rejeicaoObservacoes.trim() || !user?.id) return;
    
    try {
      await rejectCompensation(selectedCompensation.id, user.id, rejeicaoObservacoes);
      toast({
        title: "Compensação rejeitada!",
        description: `A compensação de ${selectedCompensation.funcionario_nome} foi rejeitada.`,
      });
      setIsRejeicaoDialogOpen(false);
      setSelectedCompensation(null);
      setRejeicaoObservacoes('');
    } catch (error) {
      console.error('Erro ao rejeitar compensação:', error);
      toast({
        title: "Erro ao rejeitar compensação",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const getCompensacoesPendentes = () => {
    return compensations.filter(c => c.status === 'pendente').length;
  };

  if (loading) {
    return (

    <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando compensações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar compensações: {error}</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Compensações</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de compensação de horas da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-600">
            {getCompensacoesPendentes()} Pendentes
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
                  <SelectItem value="compensado">Compensado</SelectItem>
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
            {filteredCompensations.length} solicitação(ões) de compensação encontrada(s)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredCompensations.map((compensation) => (
            <Card key={compensation.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{compensation.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {compensation.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getTipoLabel(compensation.tipo_compensacao)} • {compensation.quantidade_horas} horas
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Data: {new Date(compensation.data_compensacao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Saldo: {compensation.saldo_horas_disponivel} horas
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Motivo:</strong> {compensation.motivo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em: {new Date(compensation.created_at).toLocaleDateString('pt-BR', {
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
                      {getStatusIcon(compensation.status)}
                      <Badge className={getStatusColor(compensation.status)}>
                        {compensation.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCompensation(compensation)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {compensation.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(compensation)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(compensation)}
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

        {filteredCompensations.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de compensação encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Compensação</DialogTitle>
            <DialogDescription>
              Confirme a aprovação da compensação de {selectedCompensation?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCompensation && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedCompensation.funcionario_nome}</p>
                <p><strong>Tipo:</strong> {getTipoLabel(selectedCompensation.tipo_compensacao)}</p>
                <p><strong>Horas:</strong> {selectedCompensation.quantidade_horas}</p>
                <p><strong>Data:</strong> {new Date(selectedCompensation.data_compensacao).toLocaleDateString('pt-BR')}</p>
                <p><strong>Saldo Disponível:</strong> {selectedCompensation.saldo_horas_disponivel} horas</p>
                <p><strong>Motivo:</strong> {selectedCompensation.motivo}</p>
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
            <DialogTitle>Rejeitar Compensação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição da compensação de {selectedCompensation?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCompensation && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedCompensation.funcionario_nome}</p>
                <p><strong>Tipo:</strong> {getTipoLabel(selectedCompensation.tipo_compensacao)}</p>
                <p><strong>Horas:</strong> {selectedCompensation.quantidade_horas}</p>
                <p><strong>Data:</strong> {new Date(selectedCompensation.data_compensacao).toLocaleDateString('pt-BR')}</p>
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

export default AprovacaoCompensacoes;
