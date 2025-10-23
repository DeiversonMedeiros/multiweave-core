import React from 'react';
import { useMenu } from '@/hooks/useMenu';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Edit, Trash, Shield, Users, Building } from 'lucide-react';

export const MenuDemo: React.FC = () => {
  const { menuItems, isAdmin } = useMenu();
  const { canReadModule, canCreateModule, canEditModule, canDeleteModule } = usePermissions();

  const getPermissionIcon = (action: string) => {
    switch (action) {
      case 'read': return <Eye className="h-3 w-3" />;
      case 'create': return <Plus className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'delete': return <Trash className="h-3 w-3" />;
      default: return null;
    }
  };

  const getPermissionColor = (hasPermission: boolean) => {
    return hasPermission ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Demonstração do Menu Dinâmico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status do Usuário */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                <Shield className="h-3 w-3 mr-1" />
                Super Admin - Acesso Total
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                Usuário Padrão
              </Badge>
            )}
          </div>

          {/* Itens do Menu */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Itens de Menu Disponíveis</h3>
            <div className="grid gap-2">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Disponível
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Permissões por Módulo */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Permissões por Módulo</h3>
            <div className="grid gap-3">
              {['dashboard', 'users', 'companies', 'projects', 'materials_equipment', 'partners', 'cost_centers'].map(module => (
                <div key={module} className="border rounded-lg p-4">
                  <div className="font-medium text-sm mb-2 capitalize">
                    {module.replace('_', ' ')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(canReadModule(module))}
                    >
                      {getPermissionIcon('read')}
                      <span className="ml-1">Visualizar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(canCreateModule(module))}
                    >
                      {getPermissionIcon('create')}
                      <span className="ml-1">Criar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(canEditModule(module))}
                    >
                      {getPermissionIcon('edit')}
                      <span className="ml-1">Editar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(canDeleteModule(module))}
                    >
                      {getPermissionIcon('delete')}
                      <span className="ml-1">Excluir</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {menuItems.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Módulos Disponíveis
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {['dashboard', 'users', 'companies', 'projects', 'materials_equipment', 'partners', 'cost_centers']
                  .filter(module => canReadModule(module)).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Com Acesso de Leitura
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {['dashboard', 'users', 'companies', 'projects', 'materials_equipment', 'partners', 'cost_centers']
                  .filter(module => canCreateModule(module)).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Com Acesso de Criação
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {isAdmin ? 'Sim' : 'Não'}
              </div>
              <div className="text-sm text-muted-foreground">
                Super Admin
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
