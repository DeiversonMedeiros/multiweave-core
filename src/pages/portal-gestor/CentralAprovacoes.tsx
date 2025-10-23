import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  DollarSign, 
  Stethoscope, 
  Laptop, 
  Edit,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCentralAprovacoes } from '@/hooks/portal-gestor/useCentralAprovacoes';

interface AprovacaoItem {
  id: string;
  tipo: 'ferias' | 'compensacao' | 'atestado' | 'reembolso' | 'equipamento' | 'correcao_ponto';
  funcionario_nome: string;
  funcionario_matricula: string;
  data_solicitacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  descricao: string;
  valor?: number;
  dias?: number;
  horas?: number;
}

const CentralAprovacoes: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [observacoes, setObservacoes] = useState('');
  const [selectedAprovacao, setSelectedAprovacao] = useState<AprovacaoItem | null>(null);
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  // Usar hook para buscar dados reais
  const { aprovacoesData, aprovar, rejeitar, isLoading, error } = useCentralAprovacoes({
    search: searchTerm,
    status: statusFilter,
    tipo: tipoFilter
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ferias': return <Calendar className="h-4 w-4" />;
      case 'compensacao': return <Clock className="h-4 w-4" />;
      case 'atestado': return <Stethoscope className="h-4 w-4" />;
      case 'reembolso': return <DollarSign className="h-4 w-4" />;
      case 'equipamento': return <Laptop className="h-4 w-4" />;
      case 'correcao_ponto': return <Edit className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const handleAprovar = (aprovacao: AprovacaoItem) => {
    setSelectedAprovacao(aprovacao);
    setObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (aprovacao: AprovacaoItem) => {
    setSelectedAprovacao(aprovacao);
    setObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = async () => {
    if (!selectedAprovacao) return;
    
    try {
      await aprovar.mutateAsync({
        tipo: selectedAprovacao.tipo,
        id: selectedAprovacao.id,
        observacoes: observacoes || undefined
      });
      setIsAprovacaoDialogOpen(false);
      setSelectedAprovacao(null);
      setObservacoes('');
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
    }
  };

  const confirmarRejeicao = async () => {
    if (!selectedAprovacao) return;
    
    try {
      await rejeitar.mutateAsync({
        tipo: selectedAprovacao.tipo,
        id: selectedAprovacao.id,
        observacoes: observacoes
      });
      setIsRejeicaoDialogOpen(false);
      setSelectedAprovacao(null);
      setObservacoes('');
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando aprovações...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar aprovações</h3>
          <p className="text-gray-600 mb-4">Não foi possível carregar as aprovações.</p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const aprovacoesDataData = aprovacoesData?.data || [];

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'ferias': return 'Férias';
      case 'compensacao': return 'Compensação';
      case 'atestado': return 'Atestado';
      case 'reembolso': return 'Reembolso';
      case 'equipamento': return 'Equipamento';
      case 'correcao_ponto': return 'Correção de Ponto';
      default: return tipo;
    }
  };

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
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredAprovacoes = (aprovacoesData || []).filter(aprovacao => {
    const matchesSearch = aprovacao.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         aprovacao.funcionario_matricula?.includes(searchTerm) || false;
    const matchesStatus = statusFilter === 'todos' || aprovacao.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || aprovacao.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });



  const handleVerDetalhes = (id: string, tipo: string) => {
    // Navegar para página de detalhes específica
    navigate(`/portal-gestor/aprovacoesData/${tipo}/${id}`);
  };

  const getAprovacoesPendentes = () => {
    return (aprovacoesData || []).filter(a => a.status === 'pendente').length;
  };

  return (
    <RequireEntity entityName="approval_center" action="read">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Aprovações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as solicitações da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-yellow-600">
            {getAprovacoesPendentes()} Pendentes
          </Badge>
          <Button onClick={() => navigate('/portal-gestor/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Funcionário ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="compensacao">Compensação</SelectItem>
                  <SelectItem value="atestado">Atestado</SelectItem>
                  <SelectItem value="reembolso">Reembolso</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="correcao_ponto">Correção de Ponto</SelectItem>
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
            {filteredAprovacoes.length} solicitação(ões) encontrada(s)
          </h2>
        </div>

        <div className="grid gap-6">
          {filteredAprovacoes.map((aprovacao) => (
            <Card key={aprovacao.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      {getTipoIcon(aprovacao.tipo)}
                      <div>
                        <h3 className="font-semibold">{aprovacao.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Matrícula: {aprovacao.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTipoLabel(aprovacao.tipo)} • {aprovacao.descricao}
                        </p>
                        {aprovacao.dias && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {aprovacao.dias} dias
                          </p>
                        )}
                        {aprovacao.horas && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {aprovacao.horas} horas
                          </p>
                        )}
                        {aprovacao.valor && (
                          <p className="text-sm text-muted-foreground mt-1">
                            R$ {aprovacao.valor.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(aprovacao.data_solicitacao).toLocaleDateString('pt-BR', {
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
                      {getStatusIcon(aprovacao.status)}
                      <Badge className={getStatusColor(aprovacao.status)}>
                        {aprovacao.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerDetalhes(aprovacao.id, aprovacao.tipo)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {aprovacao.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(aprovacao)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(aprovacao)}
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

        {(aprovacoesData || []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      {isAprovacaoDialogOpen && selectedAprovacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Aprovar Solicitação</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tem certeza que deseja aprovar a solicitação de {selectedAprovacao.funcionario_nome}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Observações (opcional)</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Adicione observações sobre a aprovação..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAprovacaoDialogOpen(false);
                  setSelectedAprovacao(null);
                  setObservacoes('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarAprovacao}
                disabled={aprovar.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {aprovar.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  'Aprovar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Rejeição */}
      {isRejeicaoDialogOpen && selectedAprovacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Rejeitar Solicitação</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tem certeza que deseja rejeitar a solicitação de {selectedAprovacao.funcionario_nome}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Motivo da rejeição *</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Informe o motivo da rejeição..."
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejeicaoDialogOpen(false);
                  setSelectedAprovacao(null);
                  setObservacoes('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarRejeicao}
                disabled={rejeitar.isPending || !observacoes.trim()}
                variant="destructive"
              >
                {rejeitar.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  'Rejeitar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireEntity>
  );
};

export default CentralAprovacoes;
