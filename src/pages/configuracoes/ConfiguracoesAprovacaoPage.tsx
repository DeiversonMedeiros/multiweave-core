// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Users,
  DollarSign,
  Building2,
  User,
  FolderKanban,
  Truck
} from 'lucide-react';
import { useApprovalConfigs, useCreateApprovalConfig, useUpdateApprovalConfig, useDeleteApprovalConfig } from '@/hooks/approvals/useApprovalConfigs';
import { useCompany } from '@/lib/company-context';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { ApprovalConfig } from '@/services/approvals/approvalService';
import { ApprovalConfigForm } from '@/components/approvals/ApprovalConfigForm';
import { useActiveProjects } from '@/hooks/useProjects';
import { useActiveClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { useCostCenters } from '@/hooks/useCostCenters';

const ConfiguracoesAprovacaoPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcesso, setFilterProcesso] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApprovalConfig | null>(null);

  // Hooks para dados
  const { 
    data: configs = [], 
    isLoading, 
    error 
  } = useApprovalConfigs({
    processo_tipo: filterProcesso !== 'todos' ? filterProcesso : undefined,
    ativo: filterStatus !== 'todos' ? filterStatus === 'ativo' : undefined
  });
  const { data: activeProjectsData } = useActiveProjects();
  const projects = activeProjectsData?.data || [];
  const { data: classesFinanceirasData } = useActiveClassesFinanceiras();
  const classesFinanceiras = classesFinanceirasData?.data || [];
  const { data: costCentersData } = useCostCenters();
  const costCenters = costCentersData?.data || [];
  const projectMap = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; codigo?: string | null }>();
    projects.forEach((project: any) => {
      map.set(project.id, project);
    });
    return map;
  }, [projects]);
  const classeMap = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; codigo: string }>();
    classesFinanceiras.forEach((classe: any) => {
      map.set(classe.id, classe);
    });
    return map;
  }, [classesFinanceiras]);
  const costCenterMap = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; codigo?: string | null }>();
    costCenters.forEach((cc: any) => {
      map.set(cc.id, cc);
    });
    return map;
  }, [costCenters]);

  const createConfig = useCreateApprovalConfig();
  const updateConfig = useUpdateApprovalConfig();
  const deleteConfig = useDeleteApprovalConfig();

  // Filtrar dados localmente
  const filteredConfigs = configs.filter(config => {
    const search = searchTerm.toLowerCase();
    const project = config.projeto_id ? projectMap.get(config.projeto_id) : null;
    const projectName = project?.nome?.toLowerCase() || '';
    const projectCode = project?.codigo?.toLowerCase() || '';
    const classeNames = (config.classe_financeiras || [])
      .map((id) => classeMap.get(id)?.nome?.toLowerCase() || '')
      .join(' ');
    const classeCodes = (config.classe_financeiras || [])
      .map((id) => classeMap.get(id)?.codigo?.toLowerCase() || '')
      .join(' ');
    const nomeConfig = config.nome?.toLowerCase() || '';
    const matchesSearch = nomeConfig.includes(search) ||
                         config.processo_tipo.toLowerCase().includes(search) ||
                         projectName.includes(search) ||
                         projectCode.includes(search) ||
                         classeNames.includes(search) ||
                         classeCodes.includes(search);
    return matchesSearch;
  });

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const handleEditConfig = (config: ApprovalConfig) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta configuração de aprovação?')) {
      await deleteConfig.mutateAsync(id);
    }
  };

  const handleFormSubmit = async (data: Omit<ApprovalConfig, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingConfig) {
      await updateConfig.mutateAsync({ id: editingConfig.id, data });
    } else {
      await createConfig.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingConfig(null);
  };

  const getProcessoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'conta_pagar': 'Contas a Pagar',
      'requisicao_compra': 'Requisições de Compra',
      'cotacao_compra': 'Cotações de Compra',
      'solicitacao_saida_material': 'Saídas de Materiais',
      'solicitacao_transferencia_material': 'Transferências de Materiais',
      'logistica': 'Logística'
    };
    return labels[tipo] || tipo;
  };

  const getProcessoIcon = (tipo: string) => {
    const icons: Record<string, React.ReactNode> = {
      'conta_pagar': <DollarSign className="h-4 w-4" />,
      'requisicao_compra': <Building2 className="h-4 w-4" />,
      'cotacao_compra': <Building2 className="h-4 w-4" />,
      'solicitacao_saida_material': <Settings className="h-4 w-4" />,
      'solicitacao_transferencia_material': <Settings className="h-4 w-4" />,
      'logistica': <Truck className="h-4 w-4" />
    };
    return icons[tipo] || <Settings className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erro ao carregar configurações de aprovação</p>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/portal-gestor/aprovacoes*" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações de Aprovação</h1>
            <p className="text-muted-foreground mt-2">
              Configure os fluxos de aprovação para diferentes processos
            </p>
          </div>
          <PermissionButton
            page="/configuracoes/aprovacoes*"
            action="create"
            onClick={handleCreateConfig}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 whitespace-nowrap flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </PermissionButton>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar configurações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterProcesso('todos');
                    setFilterStatus('todos');
                  }}
                  className="w-full border-gray-300 hover:bg-gray-50 font-medium px-4 py-2"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Configurações */}
        <div className="grid gap-4">
          {filteredConfigs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterProcesso !== 'todos' || filterStatus !== 'todos'
                    ? 'Tente ajustar os filtros para encontrar configurações.'
                    : 'Comece criando sua primeira configuração de aprovação.'}
                </p>
                {!searchTerm && filterProcesso === 'todos' && filterStatus === 'todos' && (
                  <div className="flex justify-center">
                    <PermissionButton
                      page="/configuracoes/aprovacoes*"
                      action="create"
                      onClick={handleCreateConfig}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 whitespace-nowrap flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Configuração
                    </PermissionButton>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredConfigs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProcessoIcon(config.processo_tipo)}
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {getProcessoLabel(config.processo_tipo)}
                        </CardTitle>
                        {config.nome && (
                          <CardTitle className="text-lg text-primary">
                            {config.nome}
                          </CardTitle>
                        )}
                        <CardDescription>
                          Nível {config.nivel_aprovacao} • 
                          {config.valor_limite ? ` Até R$ ${config.valor_limite.toLocaleString('pt-BR')}` : ' Sem limite de valor'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.ativo ? 'default' : 'secondary'}>
                        {config.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <PermissionButton
                        page="/configuracoes/aprovacoes*"
                        action="edit"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditConfig(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </PermissionButton>
                      <PermissionButton
                        page="/configuracoes/aprovacoes*"
                        action="delete"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </PermissionButton>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Critérios:</span>
                      <div className="mt-1 space-y-1">
                        {config.centro_custo_id && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>
                              Centro de Custo: {(() => {
                                const cc = costCenterMap.get(config.centro_custo_id!);
                                return cc ? (cc.codigo ? `${cc.codigo} - ${cc.nome}` : cc.nome) : 'Não encontrado';
                              })()}
                            </span>
                          </div>
                        )}
                        {config.projeto_id && (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            <span>
                              Projeto: {projectMap.get(config.projeto_id)?.codigo 
                                ? `${projectMap.get(config.projeto_id)?.codigo} - ${projectMap.get(config.projeto_id)?.nome}` 
                                : (projectMap.get(config.projeto_id)?.nome || 'Não encontrado')}
                            </span>
                          </div>
                        )}
                        {config.classe_financeiras && config.classe_financeiras.length > 0 && (
                          <div className="flex items-start gap-1">
                            <DollarSign className="h-3 w-3 mt-1" />
                            <div className="space-y-1">
                              {config.classe_financeiras.map((id) => {
                                const classe = classeMap.get(id);
                                return (
                                  <div key={id} className="text-sm">
                                    {classe
                                      ? `${classe.codigo} - ${classe.nome}`
                                      : 'Classe não encontrada'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {config.usuario_id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Usuário específico</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-muted-foreground">Aprovadores:</span>
                      <div className="mt-1">
                        <span className="text-sm">
                          {config.aprovadores.length} aprovador(es) configurado(s)
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-muted-foreground">Criado em:</span>
                      <div className="mt-1">
                        <span className="text-sm">
                          {new Date(config.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Formulário */}
        {isFormOpen && (
          <ApprovalConfigForm
            config={editingConfig}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingConfig(null);
            }}
            isLoading={createConfig.isPending || updateConfig.isPending}
          />
        )}
      </div>
    </RequirePage>
  );
};

export default ConfiguracoesAprovacaoPage;
