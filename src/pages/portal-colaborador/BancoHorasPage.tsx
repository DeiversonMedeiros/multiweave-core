import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { useBankHours } from '@/hooks/useBankHoursMain';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Clock, 
  Plus, 
  Minus, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface BankHoursRecord {
  id: string;
  employee_id: string;
  transaction_type: 'credit' | 'debit';
  hours_amount: number;
  transaction_date: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function BancoHorasPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [compensationDate, setCompensationDate] = useState('');
  const [compensationHours, setCompensationHours] = useState('');
  const [compensationReason, setCompensationReason] = useState('');

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Hook do sistema novo de banco de horas
  const { getEmployeeBalance, getEmployeeTransactions } = useBankHours(selectedCompany?.id || '');

  // Buscar saldo do banco de horas
  const { data: bankHoursBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['bank-hours-balance', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return { current_balance: 0, has_bank_hours: false };
      return await getEmployeeBalance(employee.id);
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Buscar transações do banco de horas
  const { data: bankHoursTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['bank-hours-transactions', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      return await getEmployeeTransactions(employee.id);
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  const balance = bankHoursBalance?.current_balance || 0;
  const hasBankHours = bankHoursBalance?.has_bank_hours || false;
  const isLoading = balanceLoading || transactionsLoading;

  // Mutação para solicitar compensação
  const compensationMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }
      
      if (!hasBankHours) {
        throw new Error('Você não possui banco de horas configurado');
      }
      
      const data = await EntityService.create({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: selectedCompany.id,
        data: {
          employee_id: employee.id,
          data_compensacao: compensationDate,
          horas_solicitadas: parseFloat(compensationHours),
          motivo: compensationReason,
          status: 'pendente'
        }
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-hours-balance', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['bank-hours-transactions', employee?.id] });
      setIsDialogOpen(false);
      setCompensationDate('');
      setCompensationHours('');
      setCompensationReason('');
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de compensação foi enviada para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  const handleCompensationSubmit = () => {
    if (!hasBankHours) {
      toast({
        title: "Banco de horas não configurado",
        description: "Você não possui banco de horas configurado. Entre em contato com o RH.",
        variant: "destructive",
      });
      return;
    }

    if (!compensationDate || !compensationHours || !compensationReason) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para enviar a solicitação.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(compensationHours) > balance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não possui saldo suficiente para esta compensação.",
        variant: "destructive",
      });
      return;
    }

    compensationMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasBankHours) {
    return (
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Banco de Horas</h1>
            <p className="text-gray-600">
              Consulte seu saldo e solicite compensações
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
              Banco de Horas Não Configurado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Você não possui banco de horas configurado. Entre em contato com o departamento de RH 
              para configurar seu banco de horas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banco de Horas</h1>
          <p className="text-gray-600">
            Consulte seu saldo e solicite compensações
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={balance <= 0}>
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Compensação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Solicitar Compensação</DialogTitle>
              <DialogDescription>
                Solicite a compensação de suas horas extras. Saldo disponível: {balance.toFixed(1)}h
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Data da Compensação</Label>
                <Input
                  id="date"
                  type="date"
                  value={compensationDate}
                  onChange={(e) => setCompensationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hours">Horas a Compensar</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={balance}
                  value={compensationHours}
                  onChange={(e) => setCompensationHours(e.target.value)}
                  placeholder="Ex: 2.5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea
                  id="reason"
                  value={compensationReason}
                  onChange={(e) => setCompensationReason(e.target.value)}
                  placeholder="Descreva o motivo da compensação..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCompensationSubmit}
                disabled={compensationMutation.isPending}
              >
                {compensationMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saldo atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Saldo Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-4xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.toFixed(1)}h
            </div>
            <p className="text-gray-600 mt-2">
              {balance >= 0 ? 'Horas disponíveis para compensação' : 'Saldo negativo'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Todas as suas movimentações no banco de horas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankHoursTransactions && bankHoursTransactions.length > 0 ? (
            <div className="space-y-4">
              {bankHoursTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.transaction_type === 'credit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.transaction_type === 'credit' ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.transaction_type === 'credit' ? 'Crédito' : 'Débito'} de {transaction.hours_amount}h
                      </p>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(transaction.status)}
                    <Badge variant="outline">
                      {getStatusLabel(transaction.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma movimentação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona o Banco de Horas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Créditos</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Horas extras trabalhadas</li>
                <li>• Compensações aprovadas</li>
                <li>• Ajustes administrativos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Débitos</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Compensações utilizadas</li>
                <li>• Faltas não justificadas</li>
                <li>• Ajustes administrativos</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Importante</h4>
            <p className="text-sm text-blue-800">
              As compensações precisam ser solicitadas com antecedência e estão sujeitas à aprovação do seu gestor.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    );
}
