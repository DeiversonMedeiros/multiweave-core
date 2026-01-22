import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useVacationRequests, FeriasItem } from '@/hooks/rh/useGestorPortal';
import { useCompany } from '@/lib/company-context';
import { formatDateString } from '@/utils/dateUtils';
import { EntityService } from '@/services/generic/entityService';

// LOG DE VERSÃO - Se você ver este log, o código novo está carregado
console.log('🆕🆕🆕 [AprovacaoFerias] CÓDIGO NOVO CARREGADO - Versão com logs detalhados', new Date().toISOString());

const AprovacaoFerias: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedFerias, setSelectedFerias] = useState<FeriasItem | null>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false);

  // Buscar dados reais do banco
  const { ferias = [], loading, error, approveVacation, rejectVacation } = useVacationRequests(companyId);
  
  // LOG: Verificar se approveVacation está definido
  console.log('🔍 [AprovacaoFerias] Hook carregado:', {
    hasApproveVacation: typeof approveVacation === 'function',
    hasRejectVacation: typeof rejectVacation === 'function',
    feriasCount: ferias.length,
    loading,
    error
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'em_andamento': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'concluido': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'ferias': return 'Férias';
      case 'licenca_medica': return 'Licença Médica';
      case 'licenca_maternidade': return 'Licença Maternidade';
      case 'licenca_paternidade': return 'Licença Paternidade';
      case 'afastamento': return 'Afastamento';
      case 'outros': return 'Outros';
      default: return tipo;
    }
  };

  const filteredFerias = ferias.filter(feria => {
    const matchesSearch = feria.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feria.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || feria.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (feria: FeriasItem) => {
    console.log('🟡 [handleAprovar] Botão clicado:', feria);
    setSelectedFerias(feria);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
    console.log('🟡 [handleAprovar] Dialog aberto');
  };

  const handleRejeitar = (feria: FeriasItem) => {
    setSelectedFerias(feria);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    console.log('🟢 [confirmarAprovacao] Função chamada', {
      hasSelectedFerias: !!selectedFerias,
      hasUserId: !!user?.id,
      selectedFeriasId: selectedFerias?.id,
      userId: user?.id
    });
    
    if (!selectedFerias) {
      console.error('❌ [confirmarAprovacao] selectedFerias está null');
      alert('Erro: Nenhuma férias selecionada');
      return;
    }
    
    if (!user?.id) {
      console.error('❌ [confirmarAprovacao] user.id está null');
      alert('Erro: Usuário não autenticado');
      return;
    }
    
    try {
      console.log('🟢 [confirmarAprovacao] Confirmando aprovação:', {
        feriaId: selectedFerias.id,
        userId: user.id,
        observacoes: aprovacaoObservacoes
      });
      
      await approveVacation(selectedFerias.id, user.id, aprovacaoObservacoes);
      
      console.log('✅ [confirmarAprovacao] Aprovação confirmada com sucesso');
      setIsAprovacaoDialogOpen(false);
      setSelectedFerias(null);
      setAprovacaoObservacoes('');
    } catch (err: any) {
      console.error('❌ [confirmarAprovacao] Erro ao aprovar férias:', err);
      const errorMessage = err?.message || err?.error_description || 'Erro desconhecido ao aprovar férias';
      alert(`Erro ao aprovar férias: ${errorMessage}`);
    }
  };

  const confirmarRejeicao = async () => {
    if (selectedFerias && rejeicaoObservacoes.trim() && user?.id) {
      try {
        console.log('🔴 [confirmarRejeicao] Confirmando rejeição:', {
          feriaId: selectedFerias.id,
          userId: user.id,
          observacoes: rejeicaoObservacoes
        });
        
        await rejectVacation(selectedFerias.id, user.id, rejeicaoObservacoes);
        
        console.log('✅ [confirmarRejeicao] Rejeição confirmada com sucesso');
        setIsRejeicaoDialogOpen(false);
        setSelectedFerias(null);
        setRejeicaoObservacoes('');
      } catch (err: any) {
        console.error('❌ [confirmarRejeicao] Erro ao rejeitar férias:', err);
        const errorMessage = err?.message || err?.error_description || 'Erro desconhecido ao rejeitar férias';
        alert(`Erro ao rejeitar férias: ${errorMessage}`);
      }
    }
  };

  const getFeriasPendentes = () => {
    return ferias.filter(f => f.status === 'pendente').length;
  };

  // Loading state
  if (loading) {
    return (
      <RequirePage pagePath="/portal-gestor/aprovacoes/ferias*" action="read">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando férias...</span>
          </div>
        </div>
      </RequirePage>
    );
  }

  // Error state
  if (error) {
    return (
      <RequirePage pagePath="/portal-gestor/aprovacoes/ferias*" action="read">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar férias</h3>
            <p className="text-gray-600 mb-4">Não foi possível carregar os dados das férias.</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </RequirePage>
    );
  }

  return (
    <RequirePage pagePath="/portal-gestor/aprovacoes/ferias*" action="read">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Férias</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie solicitações de férias da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-yellow-600">
            {getFeriasPendentes()} Pendentes
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
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
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredFerias.length} solicitação(ões) de férias encontrada(s)
          </h2>
        </div>

        <div className="grid gap-6">
          {filteredFerias.map((feria) => (
            <Card key={feria.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{feria.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Matrícula: {feria.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTipoLabel(feria.tipo)} • {feria.dias_solicitados} dias
                          {feria.ano_aquisitivo && (
                            <span className="ml-2">• Ano de Referência: {feria.ano_aquisitivo}</span>
                          )}
                        </p>
                        <div className="flex items-center space-x-6 mt-3 flex-wrap">
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDateString(feria.data_inicio)} - {formatDateString(feria.data_fim)}
                            </span>
                          </div>
                          {feria.periodo_aquisitivo_inicio && feria.periodo_aquisitivo_fim && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Período Aquisitivo: {formatDateString(feria.periodo_aquisitivo_inicio)} - {formatDateString(feria.periodo_aquisitivo_fim)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Saldo: {feria.saldo_ferias_disponivel} dias
                            </span>
                          </div>
                        </div>
                        {feria.observacoes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {feria.observacoes}
                          </p>
                        )}
                        {feria.conflitos && feria.conflitos.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600">
                              Conflito: {feria.conflitos.join(', ')}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado em: {new Date(feria.created_at).toLocaleDateString('pt-BR', {
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
                      {getStatusIcon(feria.status)}
                      <Badge className={getStatusColor(feria.status)}>
                        {feria.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFerias(feria);
                          setIsDetalhesDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {feria.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(feria)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(feria)}
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

        {filteredFerias.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de férias encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Férias</DialogTitle>
            <DialogDescription>
              Confirme a aprovação das férias de {selectedFerias?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFerias && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedFerias.funcionario_nome}</p>
                <p><strong>Período:</strong> {new Date(selectedFerias.data_inicio).toLocaleDateString('pt-BR')} - {new Date(selectedFerias.data_fim).toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias:</strong> {selectedFerias.dias_solicitados}</p>
                <p><strong>Saldo Disponível:</strong> {selectedFerias.saldo_ferias_disponivel} dias</p>
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
            <Button 
              onClick={(e) => {
                console.log('🔴 [Button onClick] Botão Confirmar Aprovação clicado', e);
                e.preventDefault();
                e.stopPropagation();
                confirmarAprovacao();
              }} 
              className="bg-green-600 hover:bg-green-700"
              type="button"
            >
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Férias</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição das férias de {selectedFerias?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFerias && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedFerias.funcionario_nome}</p>
                <p><strong>Período:</strong> {new Date(selectedFerias.data_inicio).toLocaleDateString('pt-BR')} - {new Date(selectedFerias.data_fim).toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias:</strong> {selectedFerias.dias_solicitados}</p>
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

      {/* Dialog de Detalhes */}
      <Dialog open={isDetalhesDialogOpen} onOpenChange={setIsDetalhesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Férias</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação
            </DialogDescription>
          </DialogHeader>
          {selectedFerias && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Funcionário</p>
                  <p className="text-base">{selectedFerias.funcionario_nome}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Matrícula</p>
                  <p className="text-base">{selectedFerias.funcionario_matricula}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-base">{getTipoLabel(selectedFerias.tipo)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedFerias.status)}>
                    {selectedFerias.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
                  <p className="text-base">{new Date(selectedFerias.data_inicio).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Data de Fim</p>
                  <p className="text-base">{new Date(selectedFerias.data_fim).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Dias Solicitados</p>
                  <p className="text-base">{selectedFerias.dias_solicitados} dias</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                  <p className="text-base">{selectedFerias.saldo_ferias_disponivel} dias</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Data da Solicitação</p>
                  <p className="text-base">
                    {new Date(selectedFerias.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {selectedFerias.observacoes && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Observações</p>
                    <p className="text-base">{selectedFerias.observacoes}</p>
                  </div>
                )}
                {selectedFerias.conflitos && selectedFerias.conflitos.length > 0 && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Conflitos Detectados
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <ul className="list-disc list-inside space-y-1">
                        {selectedFerias.conflitos.map((conflito, index) => (
                          <li key={index} className="text-sm text-yellow-800">{conflito}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetalhesDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePage>
  );
};

export default AprovacaoFerias;
