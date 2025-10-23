import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Laptop, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquipmentRentals } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';

const AprovacaoEquipamentos: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  const { selectedCompany } = useCompany();
  const { equipments, loading, error, approveEquipment, rejectEquipment } = useEquipmentRentals(selectedCompany?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'ativo': return 'bg-blue-100 text-blue-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Laptop className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ativo': return <Laptop className="h-4 w-4 text-blue-600" />;
      case 'finalizado': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  const filteredEquipments = equipments.filter(equipment => {
    const matchesSearch = equipment.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || equipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (equipment: any) => {
    setSelectedEquipment(equipment);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (equipment: any) => {
    setSelectedEquipment(equipment);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    if (selectedEquipment) {
      try {
        await approveEquipment(selectedEquipment.id, 'current-user-id', aprovacaoObservacoes);
        setIsAprovacaoDialogOpen(false);
        setSelectedEquipment(null);
      } catch (error) {
        console.error('Erro ao aprovar equipamento:', error);
      }
    }
  };

  const confirmarRejeicao = async () => {
    if (selectedEquipment && rejeicaoObservacoes.trim()) {
      try {
        await rejectEquipment(selectedEquipment.id, 'current-user-id', rejeicaoObservacoes);
        setIsRejeicaoDialogOpen(false);
        setSelectedEquipment(null);
      } catch (error) {
        console.error('Erro ao rejeitar equipamento:', error);
      }
    }
  };

  const getEquipamentosPendentes = () => {
    return equipments.filter(e => e.status === 'pendente').length;
  };

  if (loading) {
    return (

    <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando equipamentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar equipamentos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de aluguel de equipamentos da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-600">
            {getEquipamentosPendentes()} Pendentes
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
          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
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
            {filteredEquipments.length} solicitação(ões) de equipamento encontrada(s)
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredEquipments.map((equipment) => (
            <Card key={equipment.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Laptop className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{equipment.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {equipment.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {equipment.tipo_equipamento} • R$ {equipment.valor_mensal.toFixed(2)}/mês
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Início: {new Date(equipment.data_inicio).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {equipment.data_fim && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Fim: {new Date(equipment.data_fim).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Justificativa:</strong> {equipment.justificativa}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em: {new Date(equipment.created_at).toLocaleDateString('pt-BR', {
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
                      {getStatusIcon(equipment.status)}
                      <Badge className={getStatusColor(equipment.status)}>
                        {equipment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEquipment(equipment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {equipment.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(equipment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(equipment)}
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

        {filteredEquipments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de equipamento encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Equipamento</DialogTitle>
            <DialogDescription>
              Confirme a aprovação do equipamento de {selectedEquipment?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEquipment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedEquipment.funcionario_nome}</p>
                <p><strong>Equipamento:</strong> {selectedEquipment.tipo_equipamento}</p>
                <p><strong>Valor:</strong> R$ {selectedEquipment.valor_mensal.toFixed(2)}/mês</p>
                <p><strong>Início:</strong> {new Date(selectedEquipment.data_inicio).toLocaleDateString('pt-BR')}</p>
                {selectedEquipment.data_fim && (
                  <p><strong>Fim:</strong> {new Date(selectedEquipment.data_fim).toLocaleDateString('pt-BR')}</p>
                )}
                <p><strong>Justificativa:</strong> {selectedEquipment.justificativa}</p>
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
            <DialogTitle>Rejeitar Equipamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do equipamento de {selectedEquipment?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEquipment && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedEquipment.funcionario_nome}</p>
                <p><strong>Equipamento:</strong> {selectedEquipment.tipo_equipamento}</p>
                <p><strong>Valor:</strong> R$ {selectedEquipment.valor_mensal.toFixed(2)}/mês</p>
                <p><strong>Início:</strong> {new Date(selectedEquipment.data_inicio).toLocaleDateString('pt-BR')}</p>
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

export default AprovacaoEquipamentos;
