import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { EmployeeUserTable } from './EmployeeUserTable';
import { EmployeeUserForm } from './EmployeeUserForm';
import { useEmployeeUser } from '../../hooks/rh/useEmployeeUser';

export const EmployeeUserManagement: React.FC = () => {
  const {
    employees,
    availableUsers,
    loading,
    error,
    fetchEmployees,
    linkEmployeeToUser,
    unlinkEmployeeFromUser,
    clearError
  } = useEmployeeUser();

  console.log('EmployeeUserManagement: Componente renderizado', {
    employees: employees.length,
    availableUsers: availableUsers.length,
    loading,
    error
  });

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'linked' | 'unlinked'>('all');

  // Filtrar funcionários
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.cpf.includes(searchTerm) ||
                         employee.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'linked' && employee.status_vinculo === 'Vinculado') ||
                         (statusFilter === 'unlinked' && employee.status_vinculo === 'Não Vinculado');

    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const totalEmployees = employees.length;
  const linkedEmployees = employees.filter(emp => emp.status_vinculo === 'Vinculado').length;
  const unlinkedEmployees = totalEmployees - linkedEmployees;

  const handleLinkEmployee = (employeeId: string) => {
    console.log('EmployeeUserManagement: handleLinkEmployee chamado para:', employeeId);
    const employee = employees.find(emp => emp.id === employeeId);
    console.log('EmployeeUserManagement: Funcionário encontrado:', employee);
    if (employee) {
      setSelectedEmployee(employee);
      setIsFormOpen(true);
      console.log('EmployeeUserManagement: Modal aberto para vincular');
    }
  };

  const handleUnlinkEmployee = (employeeId: string) => {
    console.log('EmployeeUserManagement: handleUnlinkEmployee chamado para:', employeeId);
    const employee = employees.find(emp => emp.id === employeeId);
    console.log('EmployeeUserManagement: Funcionário encontrado:', employee);
    if (employee) {
      setSelectedEmployee(employee);
      setIsFormOpen(true);
      console.log('EmployeeUserManagement: Modal aberto para desvincular');
    }
  };

  const handleViewDetails = (employee: EmployeeUser) => {
    // Implementar visualização de detalhes se necessário
    console.log('Ver detalhes do funcionário:', employee);
  };

  const handleFormSubmit = async (employeeId: string, userId?: string) => {
    if (selectedEmployee?.status_vinculo === 'Vinculado') {
      return await unlinkEmployeeFromUser(employeeId);
    } else if (userId) {
      return await linkEmployeeToUser(employeeId, userId);
    }
    return { success: false, error: 'Dados inválidos' };
  };

  const handleRefresh = () => {
    clearError();
    fetchEmployees();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vínculos Funcionário-Usuário</h1>
          <p className="text-muted-foreground">
            Gerencie os vínculos entre funcionários e usuários do sistema
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{linkedEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {totalEmployees > 0 ? Math.round((linkedEmployees / totalEmployees) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Vinculados</CardTitle>
            <UserMinus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unlinkedEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {totalEmployees > 0 ? Math.round((unlinkedEmployees / totalEmployees) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, matrícula, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'linked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('linked')}
              >
                Vinculados
              </Button>
              <Button
                variant={statusFilter === 'unlinked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('unlinked')}
              >
                Não Vinculados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabela */}
      <EmployeeUserTable
        employees={filteredEmployees}
        loading={loading}
        onLinkEmployee={handleLinkEmployee}
        onUnlinkEmployee={handleUnlinkEmployee}
        onViewDetails={handleViewDetails}
      />

      {/* Formulário Modal */}
      <EmployeeUserForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        availableUsers={availableUsers}
        onLinkEmployee={linkEmployeeToUser}
        onUnlinkEmployee={unlinkEmployeeFromUser}
      />
    </div>
  );
};
