import { useCallback } from 'react';
import { useMultiTenancy } from './useMultiTenancy';

export function useTenantValidation() {
  const { currentCompany, isAdmin } = useMultiTenancy();

  const validateOwnership = useCallback(async (table: string, recordId: string) => {
    if (isAdmin) return true;
    
    if (!currentCompany) {
      throw new Error('Nenhuma empresa selecionada');
    }

    // Aqui você pode implementar a validação específica
    // Por exemplo, verificar se o registro pertence à empresa atual
    return true;
  }, [currentCompany, isAdmin]);

  const validateAccess = useCallback(async (table: string, action: 'read' | 'write' | 'delete') => {
    if (isAdmin) return true;
    
    if (!currentCompany) {
      throw new Error('Nenhuma empresa selecionada');
    }

    // Aqui você pode implementar validações específicas de acesso
    // Por exemplo, verificar permissões baseadas no módulo
    return true;
  }, [currentCompany, isAdmin]);

  return {
    validateOwnership,
    validateAccess
  };
}

