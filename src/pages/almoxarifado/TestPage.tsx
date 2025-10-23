import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSimpleTest } from '@/hooks/almoxarifado/useSimpleTest';
import { useCompany } from '@/lib/company-context';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const TestPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { data, loading, error, refetch } = useSimpleTest();

  return (
    <RequireEntity entityName="warehouse_test" action="read">
      <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Conexão Almoxarifado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Empresa Selecionada:</strong> {selectedCompany?.nome || 'Nenhuma'}
            </div>
            <div>
              <strong>ID da Empresa:</strong> {selectedCompany?.id || 'Nenhuma'}
            </div>
            <div>
              <strong>Status:</strong> {loading ? 'Carregando...' : error ? 'Erro' : 'Sucesso'}
            </div>
            {error && (
              <div className="text-red-500">
                <strong>Erro:</strong> {error}
              </div>
            )}
            {data && (
              <div>
                <strong>Dados:</strong> {JSON.stringify(data, null, 2)}
              </div>
            )}
            <button 
              onClick={refetch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Testar Novamente
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default TestPage;
