import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Clock,
  ArrowRight,
  Settings,
  DollarSign,
  Building2,
  User,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { usePendingApprovals, useProcessApproval, useTransferApproval } from '@/hooks/approvals/useApprovals';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { ApprovalModal } from '@/components/approvals/ApprovalModal';
import { TransferApprovalModal } from '@/components/approvals/TransferApprovalModal';
import { Approval } from '@/services/approvals/approvalService';

const CentralAprovacoesExpandida: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterProcesso, setFilterProcesso] = useState<string>('todos');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Hooks para dados
  const { 
    data: pendingApprovals = [], 
    isLoading, 
    error,
    refetch
  } = usePendingApprovals();

  const processApproval = useProcessApproval();
  const transferApproval = useTransferApproval();

  // Filtrar dados localmente
  const filteredApprovals = pendingApprovals.filter(approval => {
    const matchesSearch = approval.processo_tipo?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = filterStatus === 'todos' || approval.status === filterStatus;
    const matchesProcesso = filterProcesso === 'todos' || approval.processo_tipo === filterProcesso;
    return matchesSearch && matchesStatus && matchesProcesso;
  });

  const handleProcessApproval = async (status: 'aprovado' | 'rejeitado' | 'cancelado', observacoes: string) => {
    console.log('🔍 [CentralAprovacoesExpandida.handleProcessApproval] INÍCIO', {
      status,
      observacoes: observacoes?.substring(0, 100) || '(vazio)',
      selectedApproval: selectedApproval ? {
        id: selectedApproval.id,
        processo_tipo: selectedApproval.processo_tipo,
        processo_id: selectedApproval.processo_id
      } : null,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      timestamp: new Date().toISOString()
    });

    if (!selectedApproval) {
      console.error('❌ [CentralAprovacoesExpandida.handleProcessApproval] selectedApproval está null!');
      return;
    }

    // Identificar se é requisição de compra para logs específicos
    const isRequisicaoCompra = selectedApproval.processo_tipo === 'requisicao_compra';
    if (isRequisicaoCompra) {
      console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] ⚠️ REQUISIÇÃO DE COMPRA detectada!');
      if (status === 'aprovado') {
        console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] 📝 Se todas as aprovações forem concluídas, o trigger criará uma cotação automaticamente.');
        console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] 📝 Verifique os logs do banco de dados (RAISE NOTICE) para rastrear a criação da cotação.');
      }
    }

    if (!user?.id) {
      console.error('❌ [CentralAprovacoesExpandida.handleProcessApproval] user.id está null ou undefined!', {
        user,
        userId: user?.id,
        hasUser: !!user
      });
      return;
    }

    const mutationParams = {
      aprovacao_id: selectedApproval.id,
      status,
      observacoes: observacoes || '',
      aprovador_id: user.id
    };

    console.log('📤 [CentralAprovacoesExpandida.handleProcessApproval] Chamando mutation com:', {
      ...mutationParams,
      observacoes: observacoes?.substring(0, 100) || '(vazio)',
      aprovador_id_valid: !!mutationParams.aprovador_id && mutationParams.aprovador_id.trim() !== '',
      processo_tipo: selectedApproval.processo_tipo,
      is_requisicao_compra: isRequisicaoCompra
    });

    try {
      await processApproval.mutateAsync(mutationParams);
      console.log('✅ [CentralAprovacoesExpandida.handleProcessApproval] Sucesso!');
      
      // Log específico para requisição de compra aprovada
      if (isRequisicaoCompra && status === 'aprovado') {
        console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] ✅ Requisição de compra aprovada!');
        console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] 📝 Verifique os logs do banco de dados para confirmar se a cotação foi criada automaticamente.');
        console.log('🛒 [CentralAprovacoesExpandida.handleProcessApproval] 📝 Os logs do trigger criar_cotacao_automatica mostrarão o processo completo.');
      }
      
      setIsApprovalModalOpen(false);
      setSelectedApproval(null);
    } catch (error) {
      console.error('❌ [CentralAprovacoesExpandida.handleProcessApproval] Erro ao processar aprovação:', error);
      console.error('❌ [CentralAprovacoesExpandida.handleProcessApproval] Detalhes:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        stack: error instanceof Error ? error.stack : 'N/A',
        mutationParams,
        processo_tipo: selectedApproval.processo_tipo,
        is_requisicao_compra: isRequisicaoCompra
      });
    }
  };

  const handleTransferApproval = async (novoAprovadorId: string, motivo: string) => {
    if (!selectedApproval || !user?.id) return;

    try {
      await transferApproval.mutateAsync({
        aprovacao_id: selectedApproval.id,
        novo_aprovador_id: novoAprovadorId,
        motivo,
        transferido_por: user.id
      });
      setIsTransferModalOpen(false);
      setSelectedApproval(null);
    } catch (error) {
      console.error('Erro ao transferir aprovação:', error);
    }
  };

  const openApprovalModal = (approval: Approval) => {
    setSelectedApproval(approval);
    setIsApprovalModalOpen(true);
  };

  const openTransferModal = (approval: Approval) => {
    setSelectedApproval(approval);
    setIsTransferModalOpen(true);
  };

  const getProcessoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'conta_pagar': 'Contas a Pagar',
      'requisicao_compra': 'Requisições de Compra',
      'cotacao_compra': 'Cotações de Compra',
      'solicitacao_saida_material': 'Saídas de Materiais',
      'solicitacao_transferencia_material': 'Transferências de Materiais'
    };
    return labels[tipo] || tipo;
  };

  const getProcessoIcon = (tipo: string) => {
    const icons: Record<string, React.ReactNode> = {
      'conta_pagar': <DollarSign className="h-4 w-4" />,
      'requisicao_compra': <Building2 className="h-4 w-4" />,
      'cotacao_compra': <Building2 className="h-4 w-4" />,
      'solicitacao_saida_material': <Settings className="h-4 w-4" />,
      'solicitacao_transferencia_material': <Settings className="h-4 w-4" />
    };
    return icons[tipo] || <Settings className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (approval: Approval) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated >= 7) return 'border-red-200 bg-red-50';
    if (daysSinceCreated >= 3) return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando aprovações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erro ao carregar aprovações</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <RequireEntity entityName="approvals" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Aprovações</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie todas as aprovações pendentes do sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <PermissionButton
              entityName="approval_configs"
              action="read"
              href="/configuracoes/aprovacoes"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </PermissionButton>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {pendingApprovals.filter(a => 
                      Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)) >= 7
                    ).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Atrasadas (7+ dias)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {pendingApprovals.filter(a => a.transferido_em).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Transferidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(pendingApprovals.map(a => a.processo_tipo).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Tipos de Processo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por processo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Processo</label>
                <Select value={filterProcesso} onValueChange={setFilterProcesso}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os processos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os processos</SelectItem>
                    <SelectItem value="conta_pagar">Contas a Pagar</SelectItem>
                    <SelectItem value="requisicao_compra">Requisições de Compra</SelectItem>
                    <SelectItem value="cotacao_compra">Cotações de Compra</SelectItem>
                    <SelectItem value="solicitacao_saida_material">Saídas de Materiais</SelectItem>
                    <SelectItem value="solicitacao_transferencia_material">Transferências de Materiais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('todos');
                    setFilterProcesso('todos');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Aprovações */}
        <div className="space-y-4">
          {filteredApprovals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma aprovação encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'todos' || filterProcesso !== 'todos'
                    ? 'Tente ajustar os filtros para encontrar aprovações.'
                    : 'Não há aprovações pendentes no momento.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredApprovals.map((approval) => (
              <Card key={approval.id} className={`${getPriorityColor(approval)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProcessoIcon(approval.processo_tipo || '')}
                      <div>
                        <CardTitle className="text-lg">
                          {getProcessoLabel(approval.processo_tipo || '')}
                        </CardTitle>
                        <CardDescription>
                          Nível {approval.nivel_aprovacao} • 
                          Criado em {new Date(approval.created_at).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(approval.status)}>
                        {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                      </Badge>
                      {approval.transferido_em && (
                        <Badge variant="outline" className="text-blue-600">
                          Transferida
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      {approval.numero_requisicao ? (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Requisição: {approval.numero_requisicao}</span>
                          </div>
                          {approval.solicitante_nome && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>Solicitante: {approval.solicitante_nome}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>ID da Solicitação: {approval.processo_id?.slice(0, 8) || 'N/A'}...</span>
                        </div>
                      )}
                      {approval.transferido_em && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <ArrowRight className="h-4 w-4" />
                          <span>Transferida em {new Date(approval.transferido_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <PermissionButton
                        entityName="approvals"
                        action="edit"
                        variant="outline"
                        size="sm"
                        onClick={() => openApprovalModal(approval)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Processar
                      </PermissionButton>
                      <PermissionButton
                        entityName="approvals"
                        action="edit"
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferModal(approval)}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Transferir
                      </PermissionButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modais */}
        <ApprovalModal
          approval={selectedApproval}
          isOpen={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedApproval(null);
          }}
          onProcess={handleProcessApproval}
          isLoading={processApproval.isPending}
        />

        <TransferApprovalModal
          approval={selectedApproval}
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setSelectedApproval(null);
          }}
          onTransfer={handleTransferApproval}
          isLoading={transferApproval.isPending}
        />
      </div>
    </RequireEntity>
  );
};

export default CentralAprovacoesExpandida;
