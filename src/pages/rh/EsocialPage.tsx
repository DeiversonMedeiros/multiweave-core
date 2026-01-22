import React from 'react';
import ESocialManagement from '../ESocialManagement';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function EsocialPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  return (
    <RequirePage pagePath="/rh/esocial*" action="read">
      <ESocialManagement />
    </RequirePage>
  );
}
