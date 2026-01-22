import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function TestPortal() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  return (
    <RequirePage pagePath="/portal-colaborador*" action="read">
      <div className="p-6">
      <h1 className="text-3xl font-bold text-green-600">
        ✅ Portal do Colaborador está funcionando!
      </h1>
      <p className="text-gray-600 mt-4">
        Se você está vendo esta página, o Portal do Colaborador está configurado corretamente.
      </p>
    </div>
    </RequirePage>
  );
}
