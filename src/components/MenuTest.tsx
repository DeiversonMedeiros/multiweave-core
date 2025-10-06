import React from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';

export const MenuTest: React.FC = () => {
  const { menuItems } = useMenu();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Debug do Menu</h2>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Estado do Sistema:</h3>
        <p>Usuário: {user?.email || 'Não logado'}</p>
        <p>Empresa selecionada: {selectedCompany?.nome_fantasia || 'Nenhuma'}</p>
        <p>Itens do menu: {menuItems.length}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Itens do Menu ({menuItems.length}):</h3>
        {menuItems.map(item => (
          <div key={item.id} className="p-2 border rounded">
            <p><strong>{item.title}</strong> - {item.url}</p>
            <p>Permissão necessária: {item.requiresPermission?.name} - {item.requiresPermission?.action}</p>
            <p>Tem permissão: Sim (temporariamente)</p>
            {item.children && (
              <div className="ml-4">
                <p>Filhos: {item.children.length}</p>
                {item.children.map(child => (
                  <div key={child.id} className="p-1 border-l-2 border-gray-300 ml-2">
                    <p><strong>{child.title}</strong> - {child.url}</p>
                    <p>Permissão necessária: {child.requiresPermission?.name} - {child.requiresPermission?.action}</p>
                    <p>Tem permissão: Sim (temporariamente)</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Informações do Sistema:</h3>
        <div className="p-2 border rounded">
          <p><strong>Sistema de permissões temporariamente desabilitado</strong></p>
          <p>Isso foi feito para evitar loops infinitos durante o desenvolvimento</p>
          <p>O menu está mostrando todos os itens para usuários autenticados</p>
        </div>
      </div>
    </div>
  );
};
