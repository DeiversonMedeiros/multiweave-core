import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Shield, User, Building, Eye, Plus, Edit, Trash } from 'lucide-react';

interface UserPermissionsProps {
  className?: string;
  showDetails?: boolean;
}

export const UserPermissions: React.FC<UserPermissionsProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { isAdmin, canReadModule, canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { permissions, loading } = useAuthorization();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

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

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isAdmin ? (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        ) : (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            Usuário
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permissões do Usuário
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
              <User className="h-3 w-3 mr-1" />
              Usuário Padrão
            </Badge>
          )}
        </div>

        {/* Permissões por Módulo */}
        <Collapsible
          open={expandedSections.has('modules')}
          onOpenChange={() => toggleSection('modules')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Permissões por Módulo</span>
              </div>
              {expandedSections.has('modules') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2">
              {permissions.map(permission => (
                <div key={permission.module_name} className="border rounded-lg p-3">
                  <div className="font-medium text-sm mb-2 capitalize">
                    {permission.module_name.replace('_', ' ')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(permission.can_read)}
                    >
                      {getPermissionIcon('read')}
                      <span className="ml-1">Visualizar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(permission.can_create)}
                    >
                      {getPermissionIcon('create')}
                      <span className="ml-1">Criar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(permission.can_edit)}
                    >
                      {getPermissionIcon('edit')}
                      <span className="ml-1">Editar</span>
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getPermissionColor(permission.can_delete)}
                    >
                      {getPermissionIcon('delete')}
                      <span className="ml-1">Excluir</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Resumo de Permissões */}
        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Total de Módulos:</span>
              <span className="font-medium">{permissions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Módulos com Acesso:</span>
              <span className="font-medium">
                {permissions.filter(p => p.can_read || p.can_create || p.can_edit || p.can_delete).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Permissões de Leitura:</span>
              <span className="font-medium">
                {permissions.filter(p => p.can_read).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Permissões de Criação:</span>
              <span className="font-medium">
                {permissions.filter(p => p.can_create).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Permissões de Edição:</span>
              <span className="font-medium">
                {permissions.filter(p => p.can_edit).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Permissões de Exclusão:</span>
              <span className="font-medium">
                {permissions.filter(p => p.can_delete).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente compacto para exibir no header
export const UserPermissionsCompact: React.FC = () => {
  const { isAdmin } = usePermissions();

  return (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          <User className="h-3 w-3 mr-1" />
          User
        </Badge>
      )}
    </div>
  );
};

