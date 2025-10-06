import React from 'react';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Shield, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const TenantIsolationDemo: React.FC = () => {
  const { 
    currentCompany, 
    userCompanies, 
    isMultiTenant, 
    isAdmin,
    loading 
  } = useMultiTenancy();

  // Consultas multi-tenant para demonstrar isolamento
  const { data: users, loading: usersLoading } = useTenantQuery({
    table: 'users',
    select: 'id, nome, email, company_id',
    orderBy: { column: 'nome', ascending: true }
  });

  const { data: companies, loading: companiesLoading } = useTenantQuery({
    table: 'companies',
    select: 'id, nome_fantasia, cnpj',
    orderBy: { column: 'nome_fantasia', ascending: true }
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status do Isolamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status do Isolamento Multi-tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userCompanies.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Empresas Acessíveis
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {isMultiTenant ? 'Sim' : 'Não'}
              </div>
              <div className="text-sm text-muted-foreground">
                Multi-tenant
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {isAdmin ? 'Admin' : 'User'}
              </div>
              <div className="text-sm text-muted-foreground">
                Tipo de Usuário
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                <Shield className="h-3 w-3 mr-1" />
                Super Admin - Acesso Total
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                Usuário Padrão - Acesso Restrito
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empresa Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresa Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentCompany ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">{currentCompany.nome_fantasia}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentCompany.razao_social}
              </p>
              <p className="text-xs text-muted-foreground">
                CNPJ: {currentCompany.cnpj}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Nenhuma empresa selecionada</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados Isolados - Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários (Isolados por Empresa)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users.length > 0 ? (
                users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{user.nome}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({user.email})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {user.company_id ? 'Com Empresa' : 'Sem Empresa'}
                      </Badge>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          ID: {user.company_id?.slice(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados Isolados - Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresas (Visíveis para o Usuário)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companiesLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {companies.length > 0 ? (
                companies.map(company => (
                  <div key={company.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{company.nome_fantasia}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        CNPJ: {company.cnpj}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentCompany?.id === company.id && (
                        <Badge variant="default" className="text-xs">
                          Atual
                        </Badge>
                      )}
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          ID: {company.id.slice(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma empresa encontrada
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicação do Isolamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Como Funciona o Isolamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>
              <strong>Super Admin:</strong> Pode ver e gerenciar dados de todas as empresas.
            </p>
            <p>
              <strong>Usuário Padrão:</strong> Vê apenas dados da empresa selecionada.
            </p>
            <p>
              <strong>Isolamento Automático:</strong> Todas as consultas são filtradas automaticamente por empresa.
            </p>
            <p>
              <strong>Troca de Empresa:</strong> Ao trocar de empresa, todos os dados são recarregados automaticamente.
            </p>
          </div>
          
          {isAdmin && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center gap-2 text-yellow-800">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Modo Admin</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Como super admin, você pode ver dados de todas as empresas. 
                Em produção, isso seria restrito apenas a administradores do sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

