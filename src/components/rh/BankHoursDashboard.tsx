import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  User,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useBankHoursBalance, useBankHoursTransactions, useBankHoursCalculations } from '../../hooks/useBankHours';
import { BankHoursAdjustmentForm, TRANSACTION_TYPES } from '../../integrations/supabase/bank-hours-types';

interface BankHoursDashboardProps {
  companyId: string;
}

export function BankHoursDashboard({ companyId }: BankHoursDashboardProps) {
  const { balances, loading: balancesLoading, getEmployeeBalance } = useBankHoursBalance(companyId);
  const { transactions, loading: transactionsLoading, adjustBalance } = useBankHoursTransactions(companyId);
  const { calculations, loading: calculationsLoading, runCalculation } = useBankHoursCalculations(companyId);
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [adjustmentForm, setAdjustmentForm] = useState<BankHoursAdjustmentForm>({
    employee_id: '',
    hours_amount: 0,
    description: '',
    transaction_date: today
  });

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustBalance(adjustmentForm);
      setShowAdjustmentForm(false);
      setAdjustmentForm({
        employee_id: '',
        hours_amount: 0,
        description: '',
        transaction_date: today
      });
    } catch (err) {
      console.error('Erro ao ajustar saldo:', err);
    }
  };

  const handleRunCalculation = async () => {
    try {
      await runCalculation();
    } catch (err) {
      console.error('Erro ao executar cálculo:', err);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'accumulation':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'compensation':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'expiration':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'accumulation':
        return 'Acumulação';
      case 'compensation':
        return 'Compensação';
      case 'expiration':
        return 'Expiração';
      case 'adjustment':
        return 'Ajuste';
      case 'transfer':
        return 'Transferência';
      default:
        return type;
    }
  };

  const formatHours = (hours: number) => {
    return `${hours >= 0 ? '+' : ''}${hours.toFixed(2)}h`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (selectedEmployee && selectedEmployee !== 'all' && transaction.employee_id !== selectedEmployee) return false;
    if (dateFilter.startDate && transaction.transaction_date < dateFilter.startDate) return false;
    if (dateFilter.endDate && transaction.transaction_date > dateFilter.endDate) return false;
    if (transactionTypeFilter && transactionTypeFilter !== 'all' && transaction.transaction_type !== transactionTypeFilter) return false;
    return true;
  });

  const totalBalance = balances.reduce((sum, balance) => sum + balance.current_balance, 0);
  const totalAccumulated = balances.reduce((sum, balance) => sum + balance.accumulated_hours, 0);
  const totalCompensated = balances.reduce((sum, balance) => sum + balance.compensated_hours, 0);
  const totalExpired = balances.reduce((sum, balance) => sum + balance.expired_hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard do Banco de Horas</h2>
          <p className="text-muted-foreground">
            Acompanhe saldos, transações e execute cálculos do banco de horas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRunCalculation} disabled={calculationsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${calculationsLoading ? 'animate-spin' : ''}`} />
            Executar Cálculo
          </Button>
          <Button onClick={() => setShowAdjustmentForm(true)}>
            Ajustar Saldo
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
                <p className={`text-2xl font-bold ${getBalanceColor(totalBalance)}`}>
                  {formatHours(totalBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acumulado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatHours(totalAccumulated)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compensado</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatHours(totalCompensated)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expirado</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatHours(totalExpired)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="balances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balances">Saldos</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="calculations">Cálculos</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saldos por Colaborador</CardTitle>
              <CardDescription>
                Saldo atual do banco de horas de cada colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {balances.map((balance) => (
                    <div key={balance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">
                            {balance.employee?.nome || 'Colaborador não encontrado'}
                          </h3>
                          {balance.employee?.matricula && (
                            <p className="text-sm text-muted-foreground">
                              Matrícula: {balance.employee.matricula}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getBalanceColor(balance.current_balance)}`}>
                          {formatHours(balance.current_balance)}
                        </p>
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <span>Acumulado: {formatHours(balance.accumulated_hours)}</span>
                          <span>Compensado: {formatHours(balance.compensated_hours)}</span>
                          <span>Expirado: {formatHours(balance.expired_hours)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transações</CardTitle>
              <CardDescription>
                Histórico de movimentações do banco de horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="employee-filter">Colaborador:</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {balances.map(balance => (
                        <SelectItem key={balance.employee_id} value={balance.employee_id}>
                          {balance.employee?.nome || 'Colaborador não encontrado'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="type-filter">Tipo:</Label>
                  <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={value}>
                          {getTransactionLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="start-date">De:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-40"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="end-date">Até:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-40"
                  />
                </div>
              </div>

              {transactionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getTransactionIcon(transaction.transaction_type)}
                        <div>
                          <h3 className="font-semibold">
                            {transaction.employee?.nome || 'Colaborador não encontrado'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description || 'Sem descrição'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${getBalanceColor(transaction.hours_amount)}`}>
                          {formatHours(transaction.hours_amount)}
                        </p>
                        <Badge variant="outline">
                          {getTransactionLabel(transaction.transaction_type)}
                        </Badge>
                        {transaction.is_automatic && (
                          <Badge variant="secondary" className="ml-2">
                            Automático
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Cálculos</CardTitle>
              <CardDescription>
                Registro dos cálculos executados do banco de horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculationsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {calculations.map((calculation) => (
                    <div key={calculation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">
                            Cálculo de {new Date(calculation.calculation_date).toLocaleDateString('pt-BR')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Período: {new Date(calculation.period_start).toLocaleDateString('pt-BR')} - {new Date(calculation.period_end).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Colaboradores processados: {calculation.employees_processed}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          {calculation.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {calculation.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                          {calculation.status === 'running' && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
                          <Badge variant={
                            calculation.status === 'completed' ? 'default' :
                            calculation.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {calculation.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Acumulado: {formatHours(calculation.hours_accumulated)}</p>
                          <p>Compensado: {formatHours(calculation.hours_compensated)}</p>
                          <p>Expirado: {formatHours(calculation.hours_expired)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Ajuste de Saldo */}
      {showAdjustmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Ajustar Saldo</CardTitle>
              <CardDescription>
                Ajuste manual do saldo do banco de horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjust-employee">Colaborador</Label>
                  <Select
                    value={adjustmentForm.employee_id}
                    onValueChange={(value) => setAdjustmentForm(prev => ({ ...prev, employee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {balances.map(balance => (
                        <SelectItem key={balance.employee_id} value={balance.employee_id}>
                          {balance.employee?.nome || 'Colaborador não encontrado'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-hours">Quantidade de Horas</Label>
                  <Input
                    id="adjust-hours"
                    type="number"
                    step="0.5"
                    value={adjustmentForm.hours_amount}
                    onChange={(e) => setAdjustmentForm(prev => ({ 
                      ...prev, 
                      hours_amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Ex: +2.5 ou -1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-description">Descrição</Label>
                  <Input
                    id="adjust-description"
                    value={adjustmentForm.description}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Motivo do ajuste"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-date">Data da Transação</Label>
                  <Input
                    id="adjust-date"
                    type="date"
                    value={adjustmentForm.transaction_date}
                    max={today}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAdjustmentForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Ajustar Saldo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
