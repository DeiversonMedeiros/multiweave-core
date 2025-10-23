import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Plus, Edit, Trash, Shield, Users, Building } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  descricao: string;
  is_active: boolean;
}

interface ModulePermission {
  id: string;
  profile_id: string;
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface EntityPermission {
  id: string;
  profile_id: string;
  entity_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const PermissionManager: React.FC = () => {
  const { isAdmin } = usePermissions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [entityPermissions, setEntityPermissions] = useState<EntityPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const modules = [
    'dashboard',
    'usuarios',
    'empresas',
    'projetos',
    'materiais_equipamentos',
    'parceiros',
    'centros_custo',
    'portal_colaborador',
    'portal_gestor',
    'financeiro',
    'compras',
    'almoxarifado',
    'frota',
    'logistica',
    'rh',
    'recrutamento',
    'treinamento',
    'combustivel',
    'metalurgica',
    'comercial',
    'implantacao',
    'configuracoes'
  ];

  const entities = [
    // Entidades básicas
    'usuarios',
    'empresas',
    'perfis',
    'projetos',
    'materiais_equipamentos',
    'parceiros',
    'centros_custo',
    
    // Entidades RH
    'funcionarios',
    'registros_ponto',
    'ferias',
    'reembolsos',
    'exames_periodicos',
    'acoes_disciplinares',
    'treinamentos',
    
    // Entidades Financeiras
    'contas_pagar',
    'contas_receber',
    'borderos',
    'remessas_bancarias',
    'retornos_bancarios',
    'contas_bancarias',
    'conciliacoes_bancarias',
    'fluxo_caixa',
    'nfe',
    'nfse',
    'plano_contas',
    'lancamentos_contabeis',
    'configuracoes_aprovacao',
    'aprovacoes',
    
    // Entidades Almoxarifado
    'estoque_atual',
    'movimentacoes_estoque',
    'entradas_materiais',
    'entrada_itens',
    'checklist_recebimento',
    'transferencias',
    'transferencia_itens',
    'inventarios',
    'inventario_itens',
    'almoxarifados',
    
    // Entidades do Processo de Compras
    'solicitacoes_compra',
    'cotacoes',
    'pedidos_compra',
    'aprovacoes_compra',
    'fornecedores',
    'contratos_compra',
    'historico_compras',
    'avaliacao_fornecedores'
  ];

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedProfile) {
      loadModulePermissions();
      loadEntityPermissions();
    }
  }, [selectedProfile]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar perfis: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModulePermissions = async () => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('get_module_permissions_by_profile', { p_profile_id: selectedProfile });

      if (error) throw error;
      setModulePermissions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar permissões de módulos: ' + error.message);
    }
  };

  const loadEntityPermissions = async () => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('get_entity_permissions_by_profile', { p_profile_id: selectedProfile });

      if (error) throw error;
      setEntityPermissions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar permissões de entidades: ' + error.message);
    }
  };

  const updateModulePermission = async (
    moduleName: string,
    action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('update_module_permission_production', {
          p_profile_id: selectedProfile,
          p_module_name: moduleName,
          p_action: action,
          p_value: value
        });

      if (error) throw error;

      // Atualizar estado local
      if (data && data.length > 0) {
        const updatedPermission = data[0];
        setModulePermissions(prev => {
          const existing = prev.find(p => p.module_name === moduleName);
          if (existing) {
            return prev.map(p => 
              p.module_name === moduleName 
                ? { ...p, ...updatedPermission }
                : p
            );
          } else {
            return [...prev, updatedPermission];
          }
        });
      }

      toast.success('Permissão de módulo atualizada com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar permissão de módulo:', error);
      toast.error('Erro ao atualizar permissão de módulo: ' + error.message);
    }
  };

  const updateEntityPermission = async (
    entityName: string,
    action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('update_entity_permission_production', {
          p_profile_id: selectedProfile,
          p_entity_name: entityName,
          p_action: action,
          p_value: value
        });

      if (error) throw error;

      // Atualizar estado local
      if (data && data.length > 0) {
        const updatedPermission = data[0];
        setEntityPermissions(prev => {
          const existing = prev.find(p => p.entity_name === entityName);
          if (existing) {
            return prev.map(p => 
              p.entity_name === entityName 
                ? { ...p, ...updatedPermission }
                : p
            );
          } else {
            return [...prev, updatedPermission];
          }
        });
      }

      toast.success('Permissão de entidade atualizada com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar permissão de entidade:', error);
      toast.error('Erro ao atualizar permissão de entidade: ' + error.message);
    }
  };

  const getModulePermissionValue = (moduleName: string, action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete') => {
    const permission = modulePermissions.find(p => p.module_name === moduleName);
    return permission ? permission[action] : false;
  };

  const getEntityPermissionValue = (entityName: string, action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete') => {
    const permission = entityPermissions.find(p => p.entity_name === entityName);
    return permission ? permission[action] : false;
  };

  // Função para obter nome de exibição dos módulos em português
  const getModuleDisplayName = (moduleName: string) => {
    const moduleNames: { [key: string]: string } = {
      'dashboard': 'Painel Principal',
      'usuarios': 'Usuários',
      'empresas': 'Empresas',
      'projetos': 'Projetos',
      'materiais_equipamentos': 'Materiais e Equipamentos',
      'parceiros': 'Parceiros',
      'centros_custo': 'Centros de Custo',
      'portal_colaborador': 'Portal do Colaborador',
      'portal_gestor': 'Portal do Gestor',
      'financeiro': 'Financeiro',
      'compras': 'Compras',
      'almoxarifado': 'Almoxarifado',
      'frota': 'Frota',
      'logistica': 'Logística',
      'rh': 'Recursos Humanos',
      'recrutamento': 'Recrutamento',
      'treinamento': 'Treinamento',
      'combustivel': 'Combustível',
      'metalurgica': 'Metalúrgica',
      'comercial': 'Comercial',
      'implantacao': 'Implantação',
      'configuracoes': 'Configurações'
    };
    return moduleNames[moduleName] || moduleName.replace('_', ' ');
  };

  // Função para obter nome de exibição das entidades em português
  const getEntityDisplayName = (entityName: string) => {
    const entityNames: { [key: string]: string } = {
      'usuarios': 'Usuários',
      'empresas': 'Empresas',
      'perfis': 'Perfis',
      'projetos': 'Projetos',
      'materiais_equipamentos': 'Materiais e Equipamentos',
      'parceiros': 'Parceiros',
      'centros_custo': 'Centros de Custo',
      'funcionarios': 'Funcionários',
      'registros_ponto': 'Registros de Ponto',
      'ferias': 'Férias',
      'reembolsos': 'Reembolsos',
      'exames_periodicos': 'Exames Periódicos',
      'acoes_disciplinares': 'Ações Disciplinares',
      'treinamentos': 'Treinamentos',
      'contas_pagar': 'Contas a Pagar',
      'contas_receber': 'Contas a Receber',
      'borderos': 'Borderôs',
      'remessas_bancarias': 'Remessas Bancárias',
      'retornos_bancarios': 'Retornos Bancários',
      'contas_bancarias': 'Contas Bancárias',
      'conciliacoes_bancarias': 'Conciliações Bancárias',
      'fluxo_caixa': 'Fluxo de Caixa',
      'nfe': 'NF-e',
      'nfse': 'NFS-e',
      'plano_contas': 'Plano de Contas',
      'lancamentos_contabeis': 'Lançamentos Contábeis',
      'configuracoes_aprovacao': 'Configurações de Aprovação',
      'aprovacoes': 'Aprovações',
      'estoque_atual': 'Estoque Atual',
      'movimentacoes_estoque': 'Movimentações de Estoque',
      'entradas_materiais': 'Entradas de Materiais',
      'entrada_itens': 'Itens de Entrada',
      'checklist_recebimento': 'Checklist de Recebimento',
      'transferencias': 'Transferências',
      'transferencia_itens': 'Itens de Transferência',
      'inventarios': 'Inventários',
      'inventario_itens': 'Itens de Inventário',
      'almoxarifados': 'Almoxarifados',
      'solicitacoes_compra': 'Solicitações de Compra',
      'cotacoes': 'Cotações',
      'pedidos_compra': 'Pedidos de Compra',
      'aprovacoes_compra': 'Aprovações de Compra',
      'fornecedores': 'Fornecedores',
      'contratos_compra': 'Contratos de Compra',
      'historico_compras': 'Histórico de Compras',
      'avaliacao_fornecedores': 'Avaliação de Fornecedores'
    };
    return entityNames[entityName] || entityName.replace('_', ' ');
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground">
            Apenas super administradores podem gerenciar permissões.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciador de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-select">Selecionar Perfil</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {profile.nome}
                        {!profile.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProfile && (
              <Tabs defaultValue="modules" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="modules">Módulos</TabsTrigger>
                  <TabsTrigger value="entities">Entidades</TabsTrigger>
                </TabsList>
                
                <TabsContent value="modules" className="space-y-4">
                  <div className="grid gap-4">
                    {modules.map(module => (
                      <Card key={module}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium">
                              {getModuleDisplayName(module)}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-read`}
                                checked={getModulePermissionValue(module, 'can_read')}
                                onCheckedChange={(checked) => 
                                  updateModulePermission(module, 'can_read', checked)
                                }
                              />
                              <Label htmlFor={`${module}-read`} className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Visualizar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-create`}
                                checked={getModulePermissionValue(module, 'can_create')}
                                onCheckedChange={(checked) => 
                                  updateModulePermission(module, 'can_create', checked)
                                }
                              />
                              <Label htmlFor={`${module}-create`} className="flex items-center gap-1">
                                <Plus className="h-3 w-3" />
                                Criar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-edit`}
                                checked={getModulePermissionValue(module, 'can_edit')}
                                onCheckedChange={(checked) => 
                                  updateModulePermission(module, 'can_edit', checked)
                                }
                              />
                              <Label htmlFor={`${module}-edit`} className="flex items-center gap-1">
                                <Edit className="h-3 w-3" />
                                Editar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-delete`}
                                checked={getModulePermissionValue(module, 'can_delete')}
                                onCheckedChange={(checked) => 
                                  updateModulePermission(module, 'can_delete', checked)
                                }
                              />
                              <Label htmlFor={`${module}-delete`} className="flex items-center gap-1">
                                <Trash className="h-3 w-3" />
                                Excluir
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="entities" className="space-y-4">
                  <div className="grid gap-4">
                    {entities.map(entity => (
                      <Card key={entity}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium">
                              {getEntityDisplayName(entity)}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${entity}-read`}
                                checked={getEntityPermissionValue(entity, 'can_read')}
                                onCheckedChange={(checked) => 
                                  updateEntityPermission(entity, 'can_read', checked)
                                }
                              />
                              <Label htmlFor={`${entity}-read`} className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Visualizar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${entity}-create`}
                                checked={getEntityPermissionValue(entity, 'can_create')}
                                onCheckedChange={(checked) => 
                                  updateEntityPermission(entity, 'can_create', checked)
                                }
                              />
                              <Label htmlFor={`${entity}-create`} className="flex items-center gap-1">
                                <Plus className="h-3 w-3" />
                                Criar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${entity}-edit`}
                                checked={getEntityPermissionValue(entity, 'can_edit')}
                                onCheckedChange={(checked) => 
                                  updateEntityPermission(entity, 'can_edit', checked)
                                }
                              />
                              <Label htmlFor={`${entity}-edit`} className="flex items-center gap-1">
                                <Edit className="h-3 w-3" />
                                Editar
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${entity}-delete`}
                                checked={getEntityPermissionValue(entity, 'can_delete')}
                                onCheckedChange={(checked) => 
                                  updateEntityPermission(entity, 'can_delete', checked)
                                }
                              />
                              <Label htmlFor={`${entity}-delete`} className="flex items-center gap-1">
                                <Trash className="h-3 w-3" />
                                Excluir
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

