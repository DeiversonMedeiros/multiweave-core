import React, { useState } from 'react';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function TestModal() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    console.log('Abrindo modal...');
    setIsOpen(true);
  };

  const handleClose = () => {
    console.log('Fechando modal...');
    setIsOpen(false);
  };

  return (
    <RequirePage pagePath="/rh/TestModal*" action="read">
      <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Modal</h1>
      
      <button
        onClick={handleOpen}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Abrir Modal
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Modal de Teste
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Este é um modal de teste. Se você está vendo isso, o modal está funcionando!
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
    </RequirePage>
  );
}
