import React from 'react';
import { EmployeeUserManagement } from '../../components/rh/EmployeeUserManagement';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const EmployeeUserLinks: React.FC = () => {
  return (
    <RequirePage pagePath="/rh/employees*" action="read">
      <div className="container mx-auto py-6">
      <EmployeeUserManagement />
    </div>
    </RequirePage>
  );
};

export default EmployeeUserLinks;

