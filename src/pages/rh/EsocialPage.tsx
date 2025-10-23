import React from 'react';
import ESocialManagement from '../ESocialManagement';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function EsocialPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  return (
    <RequireEntity entityName="esocial" action="read">
      <ESocialManagement />
    </RequireEntity>
  );
}
