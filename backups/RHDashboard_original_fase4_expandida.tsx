import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { useEmployeeStats } from '@/hooks/rh/useEmployees';
import { useCompany } from '@/lib/company-context';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function RHDashboard() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { selectedCompany } = useCompany();
  const { data: stats, isLoading: statsLoading } = useEmployeeStats();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RequireModule moduleName="rh" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard RH</h1>
            <p className="text-gray-600 mt-1">
              Visão geral dos indicadores de recursos humanos
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionButton module="rh" action="read">
              <Button variant="outline" onClick={() => console.log('Exportar relatório')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </PermissionButton>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
              <p className="text-xs text-muted-foreground">
                +2.5% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeEmployees || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activePercentage || 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Férias Pendentes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingVacations || 0}</div>
              <p className="text-xs text-muted-foreground">
                Requerem aprovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos Vencidos</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.expiredDocuments || 0}</div>
              <p className="text-xs text-muted-foreground">
                Necessitam renovação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seções de Ação Rápida */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesse as principais funcionalidades do RH
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PermissionButton module="employees" action="create">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Funcionário
                </Button>
              </PermissionButton>
              
              <PermissionButton module="employees" action="read">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Funcionários
                </Button>
              </PermissionButton>
              
              <PermissionButton module="rh" action="read">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Relatórios RH
                </Button>
              </PermissionButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas e Notificações</CardTitle>
              <CardDescription>
                Itens que requerem sua atenção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.expiredDocuments > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {stats.expiredDocuments} documentos vencidos
                    </p>
                    <p className="text-xs text-red-700">
                      Verifique e renove os documentos
                    </p>
                  </div>
                </div>
              )}
              
              {stats?.pendingVacations > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {stats.pendingVacations} férias pendentes
                    </p>
                    <p className="text-xs text-yellow-700">
                      Aprove ou rejeite as solicitações
                    </p>
                  </div>
                </div>
              )}
              
              {(!stats?.expiredDocuments && !stats?.pendingVacations) && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Tudo em dia!
                    </p>
                    <p className="text-xs text-green-700">
                      Nenhum item requer atenção imediata
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireModule>
  );
}
