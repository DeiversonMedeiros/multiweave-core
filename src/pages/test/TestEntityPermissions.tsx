import React, { useState, useEffect } from 'react';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TestEntityPermissions() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    isAdmin,
    canReadEntity,
    canCreateEntity,
    canEditEntity,
    canDeleteEntity,
    hasEntityPermission
  } = usePermissions();

  const testEntities = [
    'users',
    'companies', 
    'profiles',
    'projects',
    'materials_equipment',
    'partners',
    'cost_centers',
    'employees',
    'time_records',
    'vacations'
  ];

  const runTests = async () => {
    setIsLoading(true);
    const results: any[] = [];

    for (const entity of testEntities) {
      const result = {
        entity,
        isAdmin,
        canRead: canReadEntity(entity),
        canCreate: canCreateEntity(entity),
        canEdit: canEditEntity(entity),
        canDelete: canDeleteEntity(entity),
        hasPermissionRead: hasEntityPermission(entity, 'read'),
        hasPermissionCreate: hasEntityPermission(entity, 'create'),
        hasPermissionEdit: hasEntityPermission(entity, 'edit'),
        hasPermissionDelete: hasEntityPermission(entity, 'delete'),
        timestamp: new Date().toISOString()
      };
      
      results.push(result);
    }

    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-500">✅</Badge>
    ) : (
      <Badge variant="destructive">❌</Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Teste de Permissões por Entidade
          </CardTitle>
          <CardDescription>
            Página de teste para validar o funcionamento das permissões por entidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={runTests} disabled={isLoading}>
                {isLoading ? 'Testando...' : 'Executar Testes'}
              </Button>
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? 'Super Admin' : 'Usuário Normal'}
              </Badge>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Resultados dos Testes:</h3>
                <div className="grid gap-4">
                  {testResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{result.entity}</h4>
                        <div className="flex gap-2">
                          {getStatusIcon(result.isAdmin)}
                          <span className="text-sm text-gray-500">
                            {result.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.canRead)}
                          <span>Read: {getStatusBadge(result.canRead)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.canCreate)}
                          <span>Create: {getStatusBadge(result.canCreate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.canEdit)}
                          <span>Edit: {getStatusBadge(result.canEdit)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.canDelete)}
                          <span>Delete: {getStatusBadge(result.canDelete)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Teste de RequireEntity */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de RequireEntity</CardTitle>
          <CardDescription>
            Testando o componente RequireEntity com diferentes entidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RequireEntity entityName="users" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequireEntity para 'users' - READ funcionando!</p>
              </Card>
            </RequireEntity>

            <RequireEntity entityName="companies" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequireEntity para 'companies' - READ funcionando!</p>
              </Card>
            </RequireEntity>

            <RequireEntity entityName="profiles" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequireEntity para 'profiles' - READ funcionando!</p>
              </Card>
            </RequireEntity>
          </div>
        </CardContent>
      </Card>

      {/* Teste de PermissionGuard */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de PermissionGuard</CardTitle>
          <CardDescription>
            Testando o componente PermissionGuard com entidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PermissionGuard entity="users" action="read">
              <Button variant="outline">Botão protegido - Users Read</Button>
            </PermissionGuard>

            <PermissionGuard entity="users" action="create">
              <Button variant="default">Botão protegido - Users Create</Button>
            </PermissionGuard>

            <PermissionGuard entity="companies" action="edit">
              <Button variant="secondary">Botão protegido - Companies Edit</Button>
            </PermissionGuard>

            <PermissionGuard entity="profiles" action="delete">
              <Button variant="destructive">Botão protegido - Profiles Delete</Button>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
