import React from 'react';
import { EmployeeUserManagement } from '../../components/rh/EmployeeUserManagement';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const EmployeeUserLinks: React.FC = () => {
  return (
    <RequireModule moduleName="rh" action="read">
      <div className="container mx-auto py-6">
      <EmployeeUserManagement />
    </div>
    </RequireModule>
  );
};

export default EmployeeUserLinks;
