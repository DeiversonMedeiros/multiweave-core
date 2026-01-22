import React from 'react';
import TrainingManagement from './TrainingManagement';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function TrainingPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  return (
    <RequirePage pagePath="/rh/treinamentos*" action="read">
      <TrainingManagement />
    </RequirePage>
  );
}

