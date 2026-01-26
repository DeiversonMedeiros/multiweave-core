import React, { useState, useEffect } from 'react';
import { RequirePage } from '@/components/RequireAuth';
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
    canReadPage,
    canCreatePage,
    canEditPage,
    canDeletePage,
    hasPagePermission
  } = usePermissions();

  const testPages = [
    { name: 'users', path: '/cadastros/usuarios*' },
    { name: 'companies', path: '/cadastros/empresas*' },
    { name: 'profiles', path: '/cadastros/perfis*' },
    { name: 'projects', path: '/cadastros/projetos*' },
    { name: 'materials_equipment', path: '/almoxarifado/materiais*' },
    { name: 'partners', path: '/cadastros/parceiros*' },
    { name: 'cost_centers', path: '/cadastros/centros-custo*' },
    { name: 'employees', path: '/rh/employees*' },
    { name: 'time_records', path: '/rh/time-records*' },
    { name: 'vacations', path: '/rh/vacations*' }
  ];

  const runTests = async () => {
    setIsLoading(true);
    const results: any[] = [];

    for (const page of testPages) {
      const result = {
        entity: page.name,
        pagePath: page.path,
        isAdmin,
        canRead: canReadPage(page.path),
        canCreate: canCreatePage(page.path),
        canEdit: canEditPage(page.path),
        canDelete: canDeletePage(page.path),
        hasPermissionRead: hasPagePermission(page.path, 'read'),
        hasPermissionCreate: hasPagePermission(page.path, 'create'),
        hasPermissionEdit: hasPagePermission(page.path, 'edit'),
        hasPermissionDelete: hasPagePermission(page.path, 'delete'),
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
            Teste de Permissões por Página
          </CardTitle>
          <CardDescription>
            Página de teste para validar o funcionamento das permissões por página
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
                        <div>
                          <h4 className="font-medium">{result.entity}</h4>
                          <p className="text-xs text-gray-500 font-mono">{result.pagePath}</p>
                        </div>
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

      {/* Teste de RequirePage */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de RequirePage</CardTitle>
          <CardDescription>
            Testando o componente RequirePage com diferentes páginas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RequirePage pagePath="/cadastros/usuarios*" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequirePage para '/cadastros/usuarios*' - READ funcionando!</p>
              </Card>
            </RequirePage>

            <RequirePage pagePath="/cadastros/empresas*" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequirePage para '/cadastros/empresas*' - READ funcionando!</p>
              </Card>
            </RequirePage>

            <RequirePage pagePath="/cadastros/perfis*" action="read">
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-800">✅ RequirePage para '/cadastros/perfis*' - READ funcionando!</p>
              </Card>
            </RequirePage>
          </div>
        </CardContent>
      </Card>

      {/* Teste de PermissionGuard */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de PermissionGuard</CardTitle>
          <CardDescription>
            Testando o componente PermissionGuard com páginas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PermissionGuard page="/cadastros/usuarios*" action="read">
              <Button variant="outline">Botão protegido - Usuários Read</Button>
            </PermissionGuard>

            <PermissionGuard page="/cadastros/usuarios*" action="create">
              <Button variant="default">Botão protegido - Usuários Create</Button>
            </PermissionGuard>

            <PermissionGuard page="/cadastros/empresas*" action="edit">
              <Button variant="secondary">Botão protegido - Empresas Edit</Button>
            </PermissionGuard>

            <PermissionGuard page="/cadastros/perfis*" action="delete">
              <Button variant="destructive">Botão protegido - Perfis Delete</Button>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
