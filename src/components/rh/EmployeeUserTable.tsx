import React from 'react';
import { DataTable } from '../DataTable';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { MoreHorizontal, UserPlus, UserMinus, Eye } from 'lucide-react';
import { EmployeeUser } from '../../hooks/rh/useEmployeeUser';

interface EmployeeUserTableProps {
  employees: EmployeeUser[];
  loading: boolean;
  onLinkEmployee: (employeeId: string) => void;
  onUnlinkEmployee: (employeeId: string) => void;
  onViewDetails: (employee: EmployeeUser) => void;
}

export const EmployeeUserTable: React.FC<EmployeeUserTableProps> = ({
  employees,
  loading,
  onLinkEmployee,
  onUnlinkEmployee,
  onViewDetails
}) => {
  const columns = [
    {
      header: 'Nome',
      accessor: (employee: EmployeeUser) => (
        <div className="font-medium">{employee.nome}</div>
      ),
    },
    {
      header: 'Matrícula',
      accessor: (employee: EmployeeUser) => (
        <div className="text-sm text-muted-foreground">
          {employee.matricula || 'N/A'}
        </div>
      ),
    },
    {
      header: 'CPF',
      accessor: (employee: EmployeeUser) => (
        <div className="text-sm">{employee.cpf}</div>
      ),
    },
    {
      header: 'Email',
      accessor: (employee: EmployeeUser) => (
        <div className="text-sm">{employee.email || 'N/A'}</div>
      ),
    },
    {
      header: 'Status do Vínculo',
      accessor: (employee: EmployeeUser) => {
        const isLinked = employee.status_vinculo === 'Vinculado';
        return (
          <Badge variant={isLinked ? 'default' : 'secondary'}>
            {employee.status_vinculo}
          </Badge>
        );
      },
    },
    {
      header: 'Usuário Vinculado',
      accessor: (employee: EmployeeUser) => {
        if (employee.user_name) {
          return (
            <div className="text-sm">
              <div className="font-medium">{employee.user_name}</div>
              <div className="text-muted-foreground">{employee.user_email}</div>
            </div>
          );
        }
        return <div className="text-sm text-muted-foreground">Não vinculado</div>;
      },
    },
    {
      header: 'Status',
      accessor: (employee: EmployeeUser) => {
        const status = employee.status;
        const statusConfig = {
          ativo: { label: 'Ativo', variant: 'default' as const },
          inativo: { label: 'Inativo', variant: 'secondary' as const },
          afastado: { label: 'Afastado', variant: 'destructive' as const },
          demitido: { label: 'Demitido', variant: 'outline' as const },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || 
          { label: status, variant: 'secondary' as const };
        
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      header: 'Ações',
      accessor: (employee: EmployeeUser) => {
        const isLinked = employee.status_vinculo === 'Vinculado';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(employee)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              {isLinked ? (
                <DropdownMenuItem 
                  onClick={() => onUnlinkEmployee(employee.id)}
                  className="text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Desvincular Usuário
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onLinkEmployee(employee.id)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Vincular Usuário
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando funcionários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Funcionários e Vínculos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os vínculos entre funcionários e usuários do sistema
          </p>
        </div>
      </div>

      <DataTable
        data={employees}
        columns={columns}
        searchPlaceholder="Buscar funcionários..."
      />
    </div>
  );
};