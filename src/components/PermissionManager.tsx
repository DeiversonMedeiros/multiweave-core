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
import { Eye, Plus, Edit, Trash, Shield, Users, FileText } from 'lucide-react';

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

interface PagePermission {
  id: string;
  profile_id: string;
  page_path: string;
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
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const modules = [
    'dashboard',
    'cadastros', // Módulo principal de cadastros (controla visibilidade do menu)
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


  const pagesByModule: { [key: string]: string[] } = {
    'dashboard': [
      '/*'
    ],
    'portal_colaborador': [
      '/portal-colaborador*',
      '/portal-colaborador/registro-ponto*',
      '/portal-colaborador/correcao-ponto*',
      '/portal-colaborador/assinatura-ponto*',
      '/portal-colaborador/historico-marcacoes*',
      '/portal-colaborador/banco-horas*',
      '/portal-colaborador/ferias*',
      '/portal-colaborador/holerites*',
      '/portal-colaborador/reembolsos*',
      '/portal-colaborador/atestados*',
      '/portal-colaborador/exames*',
      '/portal-colaborador/comprovantes*',
      '/portal-colaborador/registro-abastecimento*',
      '/portal-colaborador/treinamentos*'
    ],
    'portal_gestor': [
      '/portal-gestor*',
      '/portal-gestor/dashboard*',
      '/portal-gestor/aprovacoes*',
      '/portal-gestor/aprovacoes/rh*',
      '/portal-gestor/aprovacoes/ferias*',
      '/portal-gestor/aprovacoes/compensacoes*',
      '/portal-gestor/aprovacoes/reembolsos*',
      '/portal-gestor/aprovacoes/atestados*',
      '/portal-gestor/aprovacoes/equipamentos*',
      '/portal-gestor/aprovacoes/correcoes-ponto*',
      '/portal-gestor/aprovacoes/horas-extras*',
      '/portal-gestor/aprovacoes/assinaturas-ponto*',
      '/portal-gestor/acompanhamento/ponto*',
      '/portal-gestor/acompanhamento/exames*',
      '/portal-gestor/acompanhamento/banco-horas*'
    ],
    'cadastros': [
      '/cadastros*',
      '/cadastros/empresas*',
      '/cadastros/usuarios*',
      '/cadastros/perfis*',
      '/cadastros/vinculos-usuario-empresa*',
      '/cadastros/projetos*',
      '/cadastros/parceiros*',
      '/cadastros/servicos*',
      '/cadastros/centros-custo*',
      '/cadastros/departamentos*'
    ],
    'financeiro': [
      '/financeiro*',
      '/financeiro/contas-pagar*',
      '/financeiro/contas-receber*',
      '/financeiro/lotes-pagamento*',
      '/financeiro/tesouraria*',
      '/financeiro/conciliacao-bancaria*',
      '/financeiro/parametrizacao-tributaria*',
      '/financeiro/obrigacoes-fiscais*',
      '/financeiro/fiscal*',
      '/financeiro/contabilidade*',
      '/financeiro/classes-financeiras*',
      '/financeiro/sefaz*',
      '/financeiro/bancaria*',
      '/financeiro/governanca*'
    ],
    'compras': [
      '/compras*',
      '/compras/requisicoes*',
      '/compras/cotacoes*',
      '/compras/pedidos*',
      '/compras/fornecedores*',
      '/compras/contratos*',
      '/compras/historico*'
    ],
    'almoxarifado': [
      '/almoxarifado*',
      '/almoxarifado/dashboard*',
      '/almoxarifado/estoque*',
      '/almoxarifado/materiais*',
      '/almoxarifado/almoxarifados*',
      '/almoxarifado/localizacoes*',
      '/almoxarifado/entradas*',
      '/almoxarifado/saidas*',
      '/almoxarifado/inventario*',
      '/almoxarifado/historico*',
      '/almoxarifado/relatorios*'
    ],
    'frota': [
      '/frota*',
      '/frota/dashboard*',
      '/frota/veiculos*',
      '/frota/condutores*',
      '/frota/vistorias*',
      '/frota/manutencoes*',
      '/frota/ocorrencias*',
      '/frota/solicitacoes*',
      '/frota/alertas*'
    ],
    'logistica': [
      '/logistica*',
      '/logistica/dashboard*',
      '/logistica/calendario*',
      '/logistica/viagens*',
      '/logistica/custos*'
    ],
    'rh': [
      '/rh*',
      '/rh/employees*',
      '/rh/employee-user-links*',
      '/rh/employee-benefits*',
      '/rh/positions*',
      '/rh/units*',
      '/rh/organograma*',
      '/rh/dependents*',
      '/rh/unions*',
      '/rh/work-shifts*',
      '/rh/time-records*',
      '/rh/correcao-ponto-config*',
      '/rh/assinatura-ponto-config*',
      '/rh/ponto-eletronico-config*',
      '/rh/location-zones*',
      '/rh/bank-hours*',
      '/rh/holidays*',
      '/rh/compensation-requests*',
      '/rh/benefits*',
      '/rh/medical-agreements*',
      '/rh/medical-services*',
      '/rh/employee-deductions*',
      '/rh/periodic-exams*',
      '/rh/medical-certificates*',
      '/rh/awards-productivity*',
      '/rh/rubricas*',
      '/rh/inss-brackets*',
      '/rh/irrf-brackets*',
      '/rh/fgts-config*',
      '/rh/financial-integration-config*',
      '/rh/absence-types*',
      '/rh/delay-reasons*',
      '/rh/cid-codes*',
      '/rh/allowance-types*',
      '/rh/deficiency-types*',
      '/rh/payroll*',
      '/rh/payroll-individual*',
      '/rh/equipment-rental-payments*',
      '/rh/equipment-rental-approvals*',
      '/rh/configuracao-flash*',
      '/rh/vacations*',
      '/rh/disciplinary-actions*',
      '/rh/recruitment*',
      '/rh/training*',
      '/rh/treinamentos*',
      '/rh/esocial*',
      '/rh/esocial-integration*',
      '/rh/analytics*'
    ],
    'combustivel': [
      '/combustivel*',
      '/combustivel/dashboard*',
      '/combustivel/parametros*',
      '/combustivel/orcamento*',
      '/combustivel/solicitacoes*',
      '/combustivel/consumo/veiculo*',
      '/combustivel/consumo/colaborador*',
      '/combustivel/relatorios*'
    ],
    'metalurgica': [
      '/metalurgica*',
      '/metalurgica/dashboard*',
      '/metalurgica/ordens-producao*',
      '/metalurgica/ordens-servico*',
      '/metalurgica/lotes*',
      '/metalurgica/qualidade*',
      '/metalurgica/galvanizacao*',
      '/metalurgica/produtos*',
      '/metalurgica/maquinas*',
      '/metalurgica/pcp*',
      '/metalurgica/nao-conformidades*',
      '/metalurgica/relatorios*'
    ],
    'comercial': [
      '/comercial*'
    ],
    'implantacao': [
      '/implantacao*'
    ],
    'configuracoes': [
      '/configuracoes*',
      '/configuracoes/aprovacoes*'
    ]
  };

  const getPageDisplayName = (pagePath: string) => {
    // Remove wildcard e formata
    const cleanPath = pagePath.replace('*', '');
    const parts = cleanPath.split('/').filter(p => p);
    if (parts.length === 0) return pagePath;
    
    // Última parte do caminho
    const lastPart = parts[parts.length - 1];
    // Converter kebab-case para título
    return lastPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedProfile) {
      loadModulePermissions();
      loadPagePermissions();
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


  const loadPagePermissions = async () => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('get_page_permissions_by_profile', { p_profile_id: selectedProfile });

      if (error) throw error;
      setPagePermissions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar permissões de páginas: ' + error.message);
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


  const getModulePermissionValue = (moduleName: string, action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete') => {
    const permission = modulePermissions.find(p => p.module_name === moduleName);
    return permission ? permission[action] : false;
  };


  const updatePagePermission = async (
    pagePath: string,
    action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .rpc('update_page_permission_production', {
          p_profile_id: selectedProfile,
          p_page_path: pagePath,
          p_action: action,
          p_value: value
        });

      if (error) throw error;

      // Atualizar estado local
      if (data && data.length > 0) {
        const updatedPermission = data[0];
        setPagePermissions(prev => {
          const existing = prev.find(p => p.page_path === pagePath);
          if (existing) {
            return prev.map(p => 
              p.page_path === pagePath 
                ? { ...p, ...updatedPermission }
                : p
            );
          } else {
            return [...prev, updatedPermission];
          }
        });
      }

      toast.success('Permissão de página atualizada com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar permissão de página:', error);
      toast.error('Erro ao atualizar permissão de página: ' + error.message);
    }
  };

  const getPagePermissionValue = (pagePath: string, action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete') => {
    const permission = pagePermissions.find(p => p.page_path === pagePath);
    return permission ? permission[action] : false;
  };

  // Função para obter nome de exibição dos módulos em português
  const getModuleDisplayName = (moduleName: string) => {
    const moduleNames: { [key: string]: string } = {
      'dashboard': 'Painel Principal',
      'cadastros': 'Cadastros',
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
                  <TabsTrigger value="pages">Páginas</TabsTrigger>
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

                <TabsContent value="pages" className="space-y-6">
                  {Object.entries(pagesByModule).map(([module, modulePages]) => (
                    <Card key={module}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {getModuleDisplayName(module)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {modulePages.map(pagePath => (
                            <Card key={pagePath} className="border-l-4 border-l-primary/20">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h3 className="font-medium">
                                      {getPageDisplayName(pagePath)}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                      {pagePath}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${pagePath}-read`}
                                      checked={getPagePermissionValue(pagePath, 'can_read')}
                                      onCheckedChange={(checked) => 
                                        updatePagePermission(pagePath, 'can_read', checked)
                                      }
                                    />
                                    <Label htmlFor={`${pagePath}-read`} className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      Visualizar
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${pagePath}-create`}
                                      checked={getPagePermissionValue(pagePath, 'can_create')}
                                      onCheckedChange={(checked) => 
                                        updatePagePermission(pagePath, 'can_create', checked)
                                      }
                                    />
                                    <Label htmlFor={`${pagePath}-create`} className="flex items-center gap-1">
                                      <Plus className="h-3 w-3" />
                                      Criar
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${pagePath}-edit`}
                                      checked={getPagePermissionValue(pagePath, 'can_edit')}
                                      onCheckedChange={(checked) => 
                                        updatePagePermission(pagePath, 'can_edit', checked)
                                      }
                                    />
                                    <Label htmlFor={`${pagePath}-edit`} className="flex items-center gap-1">
                                      <Edit className="h-3 w-3" />
                                      Editar
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${pagePath}-delete`}
                                      checked={getPagePermissionValue(pagePath, 'can_delete')}
                                      onCheckedChange={(checked) => 
                                        updatePagePermission(pagePath, 'can_delete', checked)
                                      }
                                    />
                                    <Label htmlFor={`${pagePath}-delete`} className="flex items-center gap-1">
                                      <Trash className="h-3 w-3" />
                                      Excluir
                                    </Label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

