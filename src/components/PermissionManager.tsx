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

  const entities = [
    // Entidades básicas
    'usuarios',
    'empresas',
    'perfis',
    'projetos',
    'materiais_equipamentos',
    'parceiros',
    'services',
    'centros_custo',
    
    // Entidades RH
    'employees', // Tabela: rh.employees (usado nas páginas)
    'registros_ponto', // Usado em LocationZonesPage - pode ser diferente de time_records
    'time_records', // Tabela: rh.time_records (usado nas páginas de histórico)
    'vacations', // Tabela: rh.vacations (usado nas páginas)
    'reimbursement_requests', // Tabela: rh.reimbursement_requests
    'periodic_exams', // Tabela: rh.periodic_exams (usado nas páginas)
    'disciplinary_actions', // Tabela: rh.disciplinary_actions (usado nas páginas)
    'trainings', // Tabela: rh.trainings
    'positions', // Tabela: rh.positions (usado nas páginas)
    'work_shifts', // Tabela: rh.work_shifts (usado nas páginas)
    'holidays', // Tabela: rh.holidays (usado nas páginas)
    'rubricas', // Tabela: rh.rubricas (usado nas páginas)
    'units', // Tabela: rh.units (usado nas páginas)
    'dependents', // Tabela: rh.dependents (usado nas páginas)
    'employment_contracts', // Tabela: rh.employment_contracts (usado nas páginas)
    'medical_agreements', // Tabela: rh.medical_agreements
    'benefits', // Tabela: rh.benefits
    'payroll_config', // Tabela: rh.payroll_config (usado nas páginas)
    'payroll', // Usado nas páginas
    'income_statements', // Tabela: rh.income_statements (usado em ComprovantesPage)
    'esocial', // Usado nas páginas
    
    // Entidades RH - Parâmetros e Configurações
    'inss_brackets', // Tabela: rh.inss_brackets
    'irrf_brackets', // Tabela: rh.irrf_brackets
    'fgts_config', // Tabela: rh.fgts_config
    'delay_reasons', // Tabela: rh.delay_reasons
    'absence_types', // Tabela: rh.absence_types
    'cid_codes', // Tabela: rh.cid_codes
    'allowance_types', // Tabela: rh.allowance_types
    'deficiency_types', // Tabela: rh.deficiency_types
    
    // Entidades RH - Benefícios e Convênios
    'awards_productivity', // Tabela: rh.awards_productivity
    'medical_plans', // Tabela: rh.medical_plans
    'employee_medical_plans', // Tabela: rh.employee_medical_plans
    'unions', // Tabela: rh.unions
    'employee_union_memberships', // Tabela: rh.employee_union_memberships
    
    // Entidades RH - Processamento
    'payroll_calculation', // Tabela: rh.payroll_calculations
    'event_consolidation', // Tabela: rh.event_consolidations
    
    // Entidades Financeiras
    'contas_pagar', // Tabela: financeiro.contas_pagar
    'contas_receber', // Tabela: financeiro.contas_receber
    'borderos', // Tabela: financeiro.borderos
    'remessas_bancarias', // Tabela: financeiro.remessas_bancarias
    'retornos_bancarios', // Tabela: financeiro.retornos_bancarios
    'contas_bancarias', // Tabela: financeiro.contas_bancarias
    'conciliacoes_bancarias', // Tabela: financeiro.conciliacoes_bancarias
    'fluxo_caixa', // Tabela: financeiro.fluxo_caixa
    'nfe', // Tabela: financeiro.nfe
    'nfse', // Tabela: financeiro.nfse
    'plano_contas', // Tabela: financeiro.plano_contas
    'lancamentos_contabeis', // Tabela: financeiro.lancamentos_contabeis
    'configuracoes_aprovacao', // Tabela: public.configuracoes_aprovacao_unificada (sistema unificado)
    'aprovacoes', // Tabela: public.aprovacoes_unificada (sistema unificado)
    'accounts_payable', // Tabela: financeiro.accounts_payable (se diferente de contas_pagar)
    'configuracao_fiscal', // Tabela: financeiro.configuracao_fiscal
    'configuracao_bancaria', // Tabela: financeiro.configuracao_bancaria
    
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
    'localizacoes_fisicas',
    'warehouse_transfers',
    'material_exit_requests',
    'inventory_dashboard',
    'inventory_management',
    'warehouse_reports',
    
    // Entidades do Processo de Compras
    'solicitacoes_compra',
    'cotacoes',
    'pedidos_compra',
    'aprovacoes_compra',
    'fornecedores',
    'contratos_compra',
    'historico_compras',
    'avaliacao_fornecedores',
    'fornecedores_dados',
    
    // Entidades Frota
    'vehicles', // Tabela: frota.vehicles
    'vehicle_documents', // Tabela: frota.vehicle_documents
    'drivers', // Tabela: frota.drivers
    'vehicle_assignments', // Tabela: frota.vehicle_assignments
    'vehicle_inspections', // Tabela: frota.vehicle_inspections
    'inspection_items', // Tabela: frota.inspection_items
    'vehicle_maintenances', // Tabela: frota.vehicle_maintenances
    'vehicle_occurrences', // Tabela: frota.vehicle_occurrences
    'vehicle_requests', // Tabela: frota.vehicle_requests
    'vehicle_images', // Tabela: frota.vehicle_images
    
    // Entidades específicas dos Portais (criadas manualmente)
    'approval_center', // Usado em CentralAprovacoes.tsx
    'approval_configs', // Usado em CentralAprovacoesExpandida.tsx
    'approvals', // Usado em CentralAprovacoesExpandida.tsx
    'exam_management', // Usado em AcompanhamentoExames.tsx
    'manager_dashboard', // Usado em GestorDashboard.tsx
    'portal_colaborador', // Usado em TestPortal.tsx
    'time_tracking_management', // Usado em AcompanhamentoPonto.tsx
    'vacation_approvals' // Usado em AprovacaoFerias.tsx
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
      // RH
      'employees': 'Funcionários (rh.employees)',
      'registros_ponto': 'Registros de Ponto - Localização',
      'time_records': 'Registros de Ponto - Histórico (rh.time_records)',
      'vacations': 'Férias (rh.vacations)',
      'reimbursement_requests': 'Solicitações de Reembolso (rh.reimbursement_requests)',
      'periodic_exams': 'Exames Periódicos (rh.periodic_exams)',
      'disciplinary_actions': 'Ações Disciplinares (rh.disciplinary_actions)',
      'trainings': 'Treinamentos (rh.trainings)',
      'positions': 'Cargos (rh.positions)',
      'work_shifts': 'Escalas de Trabalho (rh.work_shifts)',
      'holidays': 'Feriados (rh.holidays)',
      'rubricas': 'Rubricas (rh.rubricas)',
      'units': 'Unidades/Departamentos (rh.units)',
      'dependents': 'Dependentes (rh.dependents)',
      'employment_contracts': 'Contratos de Trabalho (rh.employment_contracts)',
      'medical_agreements': 'Convênios Médicos (rh.medical_agreements)',
      'benefits': 'Benefícios (rh.benefits)',
      'payroll_config': 'Configurações de Folha (rh.payroll_config)',
      'payroll': 'Folha de Pagamento',
      'income_statements': 'Comprovantes de Rendimentos (rh.income_statements)',
      'esocial': 'eSocial',
      // RH - Parâmetros e Configurações
      'inss_brackets': 'Faixas INSS (rh.inss_brackets)',
      'irrf_brackets': 'Faixas IRRF (rh.irrf_brackets)',
      'fgts_config': 'Configurações FGTS (rh.fgts_config)',
      'delay_reasons': 'Motivos de Atraso (rh.delay_reasons)',
      'absence_types': 'Tipos de Afastamento (rh.absence_types)',
      'cid_codes': 'Códigos CID (rh.cid_codes)',
      'allowance_types': 'Tipos de Adicionais (rh.allowance_types)',
      'deficiency_types': 'Tipos de Deficiência (rh.deficiency_types)',
      // RH - Benefícios e Convênios
      'awards_productivity': 'Premiações e Produtividade (rh.awards_productivity)',
      'medical_plans': 'Planos Médicos (rh.medical_plans)',
      'employee_medical_plans': 'Adesões de Planos Médicos (rh.employee_medical_plans)',
      'unions': 'Sindicatos (rh.unions)',
      'employee_union_memberships': 'Vínculos Sindicais (rh.employee_union_memberships)',
      // RH - Processamento
      'payroll_calculation': 'Cálculo de Folha (rh.payroll_calculations)',
      'event_consolidation': 'Consolidação de Eventos (rh.event_consolidations)',
      // Financeiro
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
      'accounts_payable': 'Contas a Pagar - Alternativa (financeiro.accounts_payable)',
      'configuracao_fiscal': 'Configuração Fiscal',
      'configuracao_bancaria': 'Configuração Bancária',
      // Almoxarifado
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
      'localizacoes_fisicas': 'Localizações Físicas',
      'warehouse_transfers': 'Transferências de Almoxarifado',
      'material_exit_requests': 'Solicitações de Saída',
      'inventory_dashboard': 'Dashboard de Estoque',
      'inventory_management': 'Gestão de Inventário',
      'warehouse_reports': 'Relatórios de Almoxarifado',
      // Compras
      'solicitacoes_compra': 'Solicitações de Compra',
      'cotacoes': 'Cotações',
      'pedidos_compra': 'Pedidos de Compra',
      'aprovacoes_compra': 'Aprovações de Compra',
      'fornecedores': 'Fornecedores',
      'contratos_compra': 'Contratos de Compra',
      'historico_compras': 'Histórico de Compras',
      'avaliacao_fornecedores': 'Avaliação de Fornecedores',
      'fornecedores_dados': 'Dados de Fornecedores',
      // Frota
      'vehicles': 'Veículos (frota.vehicles)',
      'vehicle_documents': 'Documentos de Veículos (frota.vehicle_documents)',
      'drivers': 'Condutores (frota.drivers)',
      'vehicle_assignments': 'Atribuições de Veículos (frota.vehicle_assignments)',
      'vehicle_inspections': 'Vistorias (frota.vehicle_inspections)',
      'inspection_items': 'Itens de Vistoria (frota.inspection_items)',
      'vehicle_maintenances': 'Manutenções (frota.vehicle_maintenances)',
      'vehicle_occurrences': 'Ocorrências (frota.vehicle_occurrences)',
      'vehicle_requests': 'Solicitações de Veículos (frota.vehicle_requests)',
      'vehicle_images': 'Imagens de Veículos (frota.vehicle_images)',
      // Entidades específicas dos Portais
      'approval_center': 'Central de Aprovações (Portal Gestor)',
      'approval_configs': 'Configurações de Aprovação (Portal Gestor)',
      'approvals': 'Aprovações (Portal Gestor)',
      'exam_management': 'Gestão de Exames (Portal Gestor)',
      'manager_dashboard': 'Dashboard do Gestor (Portal Gestor)',
      'portal_colaborador': 'Portal do Colaborador',
      'time_tracking_management': 'Gestão de Registro de Ponto (Portal Gestor)',
      'vacation_approvals': 'Aprovações de Férias (Portal Gestor)'
    };
    return entityNames[entityName] || entityName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

