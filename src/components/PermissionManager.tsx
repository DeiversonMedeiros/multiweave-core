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

export const PermissionManager: React.FC = () => {
  const { isAdmin } = usePermissions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const modules = [
    'dashboard',
    'users',
    'companies',
    'projects',
    'materials',
    'partners',
    'cost_centers',
    'financeiro',
    'compras',
    'almoxarifado',
    'frota',
    'logistica',
    'rh',
    'combustivel',
    'metalurgica',
    'comercial',
    'implantacao',
    'configuracoes'
  ];

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedProfile) {
      loadPermissions();
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

  const loadPermissions = async () => {
    if (!selectedProfile) return;

    try {
      const { data, error } = await supabase
        .from('module_permissions')
        .select('*')
        .eq('profile_id', selectedProfile);

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar permissões: ' + error.message);
    }
  };

  const updatePermission = async (
    moduleName: string,
    action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedProfile) return;

    try {
      const existingPermission = permissions.find(p => p.module_name === moduleName);

      if (existingPermission && existingPermission.id) {
        // Atualizar permissão existente
        const { error } = await supabase
          .from('module_permissions')
          .update({ [action]: value })
          .eq('id', existingPermission.id);

        if (error) throw error;

        // Atualizar estado local
        setPermissions(prev => 
          prev.map(p => 
            p.module_name === moduleName 
              ? { ...p, [action]: value }
              : p
          )
        );
      } else {
        // Criar nova permissão - usar upsert para evitar duplicatas
        const { data, error } = await supabase
          .from('module_permissions')
          .upsert({
            profile_id: selectedProfile,
            module_name: moduleName,
            can_read: action === 'can_read' ? value : false,
            can_create: action === 'can_create' ? value : false,
            can_edit: action === 'can_edit' ? value : false,
            can_delete: action === 'can_delete' ? value : false,
          }, {
            onConflict: 'profile_id,module_name'
          })
          .select()
          .single();

        if (error) throw error;

        // Atualizar estado local
        setPermissions(prev => {
          const existing = prev.find(p => p.module_name === moduleName);
          if (existing) {
            return prev.map(p => 
              p.module_name === moduleName 
                ? { ...p, [action]: value }
                : p
            );
          } else {
            return [...prev, data];
          }
        });
      }

      toast.success('Permissão atualizada com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error);
      toast.error('Erro ao atualizar permissão: ' + error.message);
    }
  };

  const getPermissionValue = (moduleName: string, action: 'can_read' | 'can_create' | 'can_edit' | 'can_delete') => {
    const permission = permissions.find(p => p.module_name === moduleName);
    return permission ? permission[action] : false;
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
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="modules">Módulos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="modules" className="space-y-4">
                  <div className="grid gap-4">
                    {modules.map(module => (
                      <Card key={module}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium capitalize">
                              {module.replace('_', ' ')}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-read`}
                                checked={getPermissionValue(module, 'can_read')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module, 'can_read', checked)
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
                                checked={getPermissionValue(module, 'can_create')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module, 'can_create', checked)
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
                                checked={getPermissionValue(module, 'can_edit')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module, 'can_edit', checked)
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
                                checked={getPermissionValue(module, 'can_delete')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module, 'can_delete', checked)
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
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

