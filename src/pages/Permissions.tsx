import React from 'react';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionManager } from '@/components/PermissionManager';
import { UserPermissions } from '@/components/UserPermissions';

export default function Permissions() {
  return (
    <RequireModule moduleName="configuracoes" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Permissões</h1>
          <p className="text-muted-foreground mt-1">
            Configure as permissões de usuários e perfis do sistema
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gerenciador de Permissões */}
          <div>
            <PermissionManager />
          </div>

          {/* Permissões do Usuário Atual */}
          <div>
            <UserPermissions showDetails={true} />
          </div>
        </div>
      </div>
    </RequireModule>
  );
}

