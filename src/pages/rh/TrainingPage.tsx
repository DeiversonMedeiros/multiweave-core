import React from 'react';
import TrainingManagement from './TrainingManagement';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function TrainingPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  return (
    <RequireEntity entityName="training" action="read">
      <TrainingManagement />
    </RequireEntity>
  );
}

