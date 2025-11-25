import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { Building2, Users, Settings, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';

interface User {
  id: string;
  nome: string;
  email: string;
}

interface CostCenter {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
}

interface UserCostCenterPermission {
  id: string;
  user_id: string;
  company_id: string;
  cost_center_id: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  user?: User;
  cost_center?: CostCenter;
}

interface EntityOwnershipConfig {
  id: string;
  entity_name: string;
  schema_name: string;
  table_name: string;
  enforce_ownership: boolean;
  enforce_cost_center: boolean;
  ownership_field: string;
  cost_center_field: string | null;
  description: string | null;
}

export const GranularPermissionsManager: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<'users' | 'entities'>('users');
  
  // Estados para gerenciamento de usuários e centros de custo
  const [users, setUsers] = useState<User[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserCostCenterPermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para diálogo de permissões
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>([]);
  const [permissionFlags, setPermissionFlags] = useState({
    can_read: true,
    can_create: true,
    can_edit: true,
    can_delete: false
  });
  
  // Estados para configurações de entidades
  const [entityConfigs, setEntityConfigs] = useState<EntityOwnershipConfig[]>([]);
  const [isEntityConfigDialogOpen, setIsEntityConfigDialogOpen] = useState(false);
  const [editingEntityConfig, setEditingEntityConfig] = useState<EntityOwnershipConfig | null>(null);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadData();
    }
  }, [selectedCompany?.id]);

  const loadData = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadCostCenters(),
        loadUserPermissions(),
        loadEntityConfigs()
      ]);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      // Buscar usuários da empresa através de user_companies
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('user_id, users(id, nome, email)')
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true);

      if (ucError) throw ucError;

      const usersList = (userCompanies || [])
        .map((uc: any) => ({
          id: uc.user_id,
          nome: uc.users?.nome || '',
          email: uc.users?.email || ''
        }))
        .filter((u: User) => u.nome); // Filtrar usuários sem nome

      setUsers(usersList);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      throw error;
    }
  };

  const loadCostCenters = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, nome, codigo, ativo')
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar centros de custo:', error);
      throw error;
    }
  };

  const loadUserPermissions = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_cost_center_permissions')
        .select(`
          *,
          users:user_id(id, nome, email),
          cost_centers:cost_center_id(id, nome, codigo)
        `)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const permissions = (data || []).map((perm: any) => ({
        ...perm,
        user: Array.isArray(perm.users) ? perm.users[0] : perm.users,
        cost_center: Array.isArray(perm.cost_centers) ? perm.cost_centers[0] : perm.cost_centers
      }));

      setUserPermissions(permissions);
    } catch (error: any) {
      console.error('Erro ao carregar permissões:', error);
      throw error;
    }
  };

  const loadEntityConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('entity_ownership_config')
        .select('*')
        .order('entity_name');

      if (error) throw error;
      setEntityConfigs(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações de entidades:', error);
      throw error;
    }
  };

  const handleOpenPermissionDialog = (userId?: string) => {
    if (userId) {
      setSelectedUserId(userId);
      // Carregar permissões existentes do usuário
      const userPerms = userPermissions.filter(p => p.user_id === userId);
      setSelectedCostCenterIds(userPerms.map(p => p.cost_center_id));
      if (userPerms.length > 0) {
        setPermissionFlags({
          can_read: userPerms[0].can_read,
          can_create: userPerms[0].can_create,
          can_edit: userPerms[0].can_edit,
          can_delete: userPerms[0].can_delete
        });
      }
    } else {
      setSelectedUserId('');
      setSelectedCostCenterIds([]);
      setPermissionFlags({
        can_read: true,
        can_create: true,
        can_edit: true,
        can_delete: false
      });
    }
    setIsPermissionDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedCompany?.id || !selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }

    if (selectedCostCenterIds.length === 0) {
      toast.error('Selecione pelo menos um centro de custo');
      return;
    }

    try {
      // Obter usuário atual para created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Remover permissões antigas do usuário
      const { error: deleteError } = await supabase
        .from('user_cost_center_permissions')
        .delete()
        .eq('user_id', selectedUserId)
        .eq('company_id', selectedCompany.id);

      if (deleteError) throw deleteError;

      // Criar novas permissões
      const newPermissions = selectedCostCenterIds.map(costCenterId => ({
        user_id: selectedUserId,
        company_id: selectedCompany.id,
        cost_center_id: costCenterId,
        can_read: permissionFlags.can_read,
        can_create: permissionFlags.can_create,
        can_edit: permissionFlags.can_edit,
        can_delete: permissionFlags.can_delete,
        created_by: user.id
      }));

      const { error: insertError } = await supabase
        .from('user_cost_center_permissions')
        .insert(newPermissions);

      if (insertError) throw insertError;

      toast.success('Permissões salvas com sucesso!');
      setIsPermissionDialogOpen(false);
      loadUserPermissions();
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões: ' + error.message);
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta permissão?')) return;

    try {
      const { error } = await supabase
        .from('user_cost_center_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Permissão removida com sucesso!');
      loadUserPermissions();
    } catch (error: any) {
      console.error('Erro ao remover permissão:', error);
      toast.error('Erro ao remover permissão: ' + error.message);
    }
  };

  const handleEditEntityConfig = (config: EntityOwnershipConfig) => {
    setEditingEntityConfig(config);
    setIsEntityConfigDialogOpen(true);
  };

  const handleSaveEntityConfig = async () => {
    if (!editingEntityConfig) return;

    try {
      const { error } = await supabase
        .from('entity_ownership_config')
        .update({
          enforce_ownership: editingEntityConfig.enforce_ownership,
          enforce_cost_center: editingEntityConfig.enforce_cost_center,
          ownership_field: editingEntityConfig.ownership_field,
          cost_center_field: editingEntityConfig.cost_center_field || null,
          description: editingEntityConfig.description || null
        })
        .eq('id', editingEntityConfig.id);

      if (error) throw error;

      toast.success('Configuração atualizada com sucesso!');
      setIsEntityConfigDialogOpen(false);
      setEditingEntityConfig(null);
      loadEntityConfigs();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração: ' + error.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground">
            Apenas administradores podem gerenciar permissões granulares.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedCompany?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Selecione uma Empresa</h3>
          <p className="text-muted-foreground">
            Selecione uma empresa para gerenciar permissões granulares.
          </p>
        </div>
      </div>
    );
  }

  const userPermissionColumns = [
    {
      header: 'Usuário',
      accessor: (item: UserCostCenterPermission) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.user?.nome || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{item.user?.email || ''}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Centro de Custo',
      accessor: (item: UserCostCenterPermission) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.cost_center?.nome || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{item.cost_center?.codigo || ''}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Permissões',
      accessor: (item: UserCostCenterPermission) => (
        <div className="flex gap-2">
          {item.can_read && <Badge variant="outline">Ler</Badge>}
          {item.can_create && <Badge variant="outline">Criar</Badge>}
          {item.can_edit && <Badge variant="outline">Editar</Badge>}
          {item.can_delete && <Badge variant="destructive">Deletar</Badge>}
        </div>
      ),
    },
    {
      header: 'Ações',
      accessor: (item: UserCostCenterPermission) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeletePermission(item.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const entityConfigColumns = [
    {
      header: 'Entidade',
      accessor: (item: EntityOwnershipConfig) => (
        <div className="font-medium">{item.entity_name}</div>
      ),
    },
    {
      header: 'Schema.Tabela',
      accessor: (item: EntityOwnershipConfig) => (
        <div className="text-sm text-muted-foreground">
          {item.schema_name}.{item.table_name}
        </div>
      ),
    },
    {
      header: 'Restrições',
      accessor: (item: EntityOwnershipConfig) => (
        <div className="flex gap-2">
          {item.enforce_ownership && (
            <Badge variant="outline">Ownership</Badge>
          )}
          {item.enforce_cost_center && (
            <Badge variant="outline">Centro de Custo</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Campos',
      accessor: (item: EntityOwnershipConfig) => (
        <div className="text-sm text-muted-foreground">
          {item.ownership_field}
          {item.cost_center_field && ` / ${item.cost_center_field}`}
        </div>
      ),
    },
    {
      header: 'Ações',
      accessor: (item: EntityOwnershipConfig) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditEntityConfig(item)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Permissões Granulares</h2>
        <p className="text-muted-foreground">
          Configure permissões por usuário e centro de custo, e gerencie restrições de ownership
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-4 w-4 mr-2" />
          Permissões por Usuário
        </Button>
        <Button
          variant={activeTab === 'entities' ? 'default' : 'outline'}
          onClick={() => setActiveTab('entities')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações de Entidades
        </Button>
      </div>

      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Permissões de Centros de Custo por Usuário
                </CardTitle>
                <CardDescription>
                  Atribua centros de custo permitidos para cada usuário
                </CardDescription>
              </div>
              <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenPermissionDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Atribuir Permissões
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Atribuir Permissões de Centro de Custo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Usuário</Label>
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.nome} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Centros de Custo Permitidos</Label>
                      <div className="space-y-2 mt-2 max-h-60 overflow-y-auto border rounded-md p-4">
                        {costCenters.map(cc => (
                          <div key={cc.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cc-${cc.id}`}
                              checked={selectedCostCenterIds.includes(cc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCostCenterIds([...selectedCostCenterIds, cc.id]);
                                } else {
                                  setSelectedCostCenterIds(selectedCostCenterIds.filter(id => id !== cc.id));
                                }
                              }}
                              className="rounded"
                            />
                            <label htmlFor={`cc-${cc.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium">{cc.nome}</div>
                              <div className="text-sm text-muted-foreground">{cc.codigo}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <Label>Permissões</Label>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_read" className="cursor-pointer">Ler</Label>
                        <Switch
                          id="can_read"
                          checked={permissionFlags.can_read}
                          onCheckedChange={(checked) =>
                            setPermissionFlags({ ...permissionFlags, can_read: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_create" className="cursor-pointer">Criar</Label>
                        <Switch
                          id="can_create"
                          checked={permissionFlags.can_create}
                          onCheckedChange={(checked) =>
                            setPermissionFlags({ ...permissionFlags, can_create: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_edit" className="cursor-pointer">Editar</Label>
                        <Switch
                          id="can_edit"
                          checked={permissionFlags.can_edit}
                          onCheckedChange={(checked) =>
                            setPermissionFlags({ ...permissionFlags, can_edit: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_delete" className="cursor-pointer">Deletar</Label>
                        <Switch
                          id="can_delete"
                          checked={permissionFlags.can_delete}
                          onCheckedChange={(checked) =>
                            setPermissionFlags({ ...permissionFlags, can_delete: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePermissions}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={userPermissionColumns}
              data={userPermissions}
              searchPlaceholder="Buscar por usuário ou centro de custo..."
              loading={loading}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'entities' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Restrições por Entidade
            </CardTitle>
            <CardDescription>
              Configure quais entidades devem respeitar ownership e centro de custo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={entityConfigColumns}
              data={entityConfigs}
              searchPlaceholder="Buscar por entidade..."
              loading={loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar configuração de entidade */}
      <Dialog open={isEntityConfigDialogOpen} onOpenChange={setIsEntityConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuração de Entidade</DialogTitle>
          </DialogHeader>
          {editingEntityConfig && (
            <div className="space-y-4">
              <div>
                <Label>Entidade: {editingEntityConfig.entity_name}</Label>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enforce_ownership">Forçar Ownership</Label>
                <Switch
                  id="enforce_ownership"
                  checked={editingEntityConfig.enforce_ownership}
                  onCheckedChange={(checked) =>
                    setEditingEntityConfig({ ...editingEntityConfig, enforce_ownership: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enforce_cost_center">Forçar Centro de Custo</Label>
                <Switch
                  id="enforce_cost_center"
                  checked={editingEntityConfig.enforce_cost_center}
                  onCheckedChange={(checked) =>
                    setEditingEntityConfig({ ...editingEntityConfig, enforce_cost_center: checked })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEntityConfigDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEntityConfig}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

