import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock3, 
  User, 
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  Loader2,
  Info
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ManagedEmployeeBankHours {
  employee_id: string;
  employee_nome: string;
  employee_matricula: string;
  employee_cpf: string;
  employee_email: string;
  position_nome: string;
  unit_nome: string;
  current_balance: number;
  accumulated_hours: number;
  compensated_hours: number;
  expired_hours: number;
  last_calculation_date: string | null;
  has_bank_hours: boolean;
  bank_hours_config_id: string | null;
}

interface BankHoursTransaction {
  id: string;
  transaction_type: string;
  transaction_date: string;
  hours_amount: number;
  description: string;
}

const AcompanhamentoBancoHoras: React.FC = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<ManagedEmployeeBankHours | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Buscar funcionários sob gestão com banco de horas
  const { data: employeesData, isLoading, refetch } = useQuery({
    queryKey: ['managed-employees-bank-hours', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) {
        console.log('[AcompanhamentoBancoHoras] ⚠️ Sem user_id ou company_id');
        return [];
      }

      console.log('[AcompanhamentoBancoHoras] 🔍 Buscando funcionários:', {
        user_id: user.id,
        company_id: selectedCompany.id
      });

      const { data, error } = await supabase.rpc('get_managed_employees_bank_hours', {
        p_user_id: user.id,
        p_company_id: selectedCompany.id,
      });

      if (error) {
        console.error('[AcompanhamentoBancoHoras] ❌ Erro na RPC:', error);
        throw error;
      }

      console.log('[AcompanhamentoBancoHoras] ✅ Dados recebidos:', {
        total: data?.length || 0,
        employees: data?.map((e: any) => ({
          id: e.employee_id,
          nome: e.employee_nome,
          balance: e.current_balance,
          has_bank_hours: e.has_bank_hours,
          config_id: e.bank_hours_config_id
        }))
      });

      return (data || []) as ManagedEmployeeBankHours[];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Buscar transações de um funcionário específico
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['bank-hours-transactions', selectedEmployee?.employee_id, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedEmployee?.employee_id || !selectedCompany?.id) {
        return [];
      }

      try {
        const result = await EntityService.list({
          schema: 'rh',
          table: 'bank_hours_transactions',
          companyId: selectedCompany.id,
          filters: { employee_id: selectedEmployee.employee_id },
          orderBy: 'transaction_date',
          orderDirection: 'DESC',
          pageSize: 20
        });

        return (result.data || []) as BankHoursTransaction[];
      } catch (error) {
        console.error('Erro ao buscar transações de banco de horas:', error);
        throw error;
      }
    },
    enabled: !!selectedEmployee?.employee_id && !!selectedCompany?.id,
  });

  const employees = employeesData || [];

  // Filtrar funcionários
  const filteredEmployees = employees.filter(emp =>
    emp.employee_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estatísticas
  const stats = {
    total: filteredEmployees.length,
    withBankHours: filteredEmployees.filter(e => e.has_bank_hours).length,
    positiveBalance: filteredEmployees.filter(e => e.current_balance > 0).length,
    negativeBalance: filteredEmployees.filter(e => e.current_balance < 0).length,
    totalBalance: filteredEmployees.reduce((sum, e) => sum + e.current_balance, 0),
  };

  // Função para recalcular banco de horas
  const handleRecalculate = async (employeeId: string) => {
    if (!selectedCompany?.id) return;

    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.rpc('recalculate_employee_bank_hours', {
        p_employee_id: employeeId,
        p_company_id: selectedCompany.id,
        p_period_start: null, // Usa padrão de 30 dias
        p_period_end: null, // Usa hoje
      });

      if (error) throw error;

      toast({
        title: 'Recálculo realizado',
        description: 'O banco de horas foi recalculado com sucesso.',
      });

      // Atualizar dados
      refetch();
      if (selectedEmployee?.employee_id === employeeId) {
        // Atualizar transações também
        window.location.reload();
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao recalcular',
        description: error.message || 'Não foi possível recalcular o banco de horas.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) return 'bg-green-100 text-green-800';
    if (balance < 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatHours = (hours: number) => {
    const sign = hours >= 0 ? '+' : '';
    return `${sign}${hours.toFixed(2)}h`;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      accumulation: 'Acumulação',
      compensation: 'Compensação',
      adjustment: 'Ajuste',
      expiration: 'Expiração',
      manual: 'Manual',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      accumulation: 'bg-blue-100 text-blue-800',
      compensation: 'bg-green-100 text-green-800',
      adjustment: 'bg-yellow-100 text-yellow-800',
      expiration: 'bg-red-100 text-red-800',
      manual: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando banco de horas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Acompanhamento de Banco de Horas
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Visualize o banco de horas dos funcionários sob sua gestão
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Banco de Horas</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withBankHours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Positivo</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.positiveBalance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Negativo</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.negativeBalance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(stats.totalBalance)}`}>
              {formatHours(stats.totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionários</CardTitle>
          <CardDescription>
            Lista de funcionários sob sua gestão e seus respectivos saldos de banco de horas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, matrícula ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário sob sua gestão.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <Card key={employee.employee_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{employee.employee_nome}</h3>
                          {!employee.has_bank_hours && (
                            <Badge variant="outline" className="text-xs">
                              Sem banco de horas
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          {employee.employee_matricula && (
                            <div>
                              <span className="font-medium">Matrícula:</span> {employee.employee_matricula}
                            </div>
                          )}
                          {employee.position_nome && (
                            <div>
                              <span className="font-medium">Cargo:</span> {employee.position_nome}
                            </div>
                          )}
                          {employee.unit_nome && (
                            <div>
                              <span className="font-medium">Unidade:</span> {employee.unit_nome}
                            </div>
                          )}
                          {employee.last_calculation_date && (
                            <div>
                              <span className="font-medium">Último cálculo:</span>{' '}
                              {format(new Date(employee.last_calculation_date), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          )}
                        </div>

                        {employee.has_bank_hours && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Saldo Atual</div>
                              <div className={`text-lg font-bold ${getBalanceColor(employee.current_balance)}`}>
                                {formatHours(employee.current_balance)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Acumulado</div>
                              <div className="text-lg font-semibold text-blue-600">
                                {formatHours(employee.accumulated_hours)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Compensado</div>
                              <div className="text-lg font-semibold text-green-600">
                                {formatHours(employee.compensated_hours)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Expirado</div>
                              <div className="text-lg font-semibold text-red-600">
                                {formatHours(employee.expired_hours)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {employee.has_bank_hours && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedEmployee(employee)}
                                >
                                  <Info className="h-4 w-4 mr-2" />
                                  Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Banco de Horas</DialogTitle>
                                  <DialogDescription>
                                    {employee.employee_nome} - {employee.employee_matricula || 'Sem matrícula'}
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 mt-4">
                                  {/* Resumo */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <div className="text-xs text-gray-500 mb-1">Saldo Atual</div>
                                      <div className={`text-xl font-bold ${getBalanceColor(employee.current_balance)}`}>
                                        {formatHours(employee.current_balance)}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                      <div className="text-xs text-gray-500 mb-1">Acumulado</div>
                                      <div className="text-xl font-bold text-blue-600">
                                        {formatHours(employee.accumulated_hours)}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                      <div className="text-xs text-gray-500 mb-1">Compensado</div>
                                      <div className="text-xl font-bold text-green-600">
                                        {formatHours(employee.compensated_hours)}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-red-50 rounded-lg">
                                      <div className="text-xs text-gray-500 mb-1">Expirado</div>
                                      <div className="text-xl font-bold text-red-600">
                                        {formatHours(employee.expired_hours)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Transações */}
                                  <div>
                                    <h4 className="font-semibold mb-3">Últimas Transações</h4>
                                    {transactionsLoading ? (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                      </div>
                                    ) : transactionsData && transactionsData.length > 0 ? (
                                      <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Data</TableHead>
                                              <TableHead>Tipo</TableHead>
                                              <TableHead>Horas</TableHead>
                                              <TableHead>Descrição</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {transactionsData.map((transaction) => (
                                              <TableRow key={transaction.id}>
                                                <TableCell>
                                                  {format(new Date(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                                                    {getTransactionTypeLabel(transaction.transaction_type)}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className={getBalanceColor(transaction.hours_amount)}>
                                                  {formatHours(transaction.hours_amount)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                  {transaction.description}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-gray-500">
                                        Nenhuma transação encontrada
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRecalculate(employee.employee_id)}
                              disabled={isRecalculating}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                              Recalcular
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcompanhamentoBancoHoras;

