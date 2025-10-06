// =====================================================
// FORMULÁRIO PARA ADESÕES DE FUNCIONÁRIOS AOS PLANOS MÉDICOS
// =====================================================

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeMedicalPlan, EmployeeMedicalPlanCreateData, EmployeeMedicalPlanUpdateData, MedicalPlan } from '@/integrations/supabase/rh-types';
import { usePlanStatuses, useMedicalPlans } from '@/hooks/rh/useMedicalAgreements';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { formatCurrency } from '@/services/rh/medicalAgreementsService';

const formSchema = z.object({
  employee_id: z.string().uuid({ message: 'Funcionário é obrigatório.' }),
  plan_id: z.string().uuid({ message: 'Plano é obrigatório.' }),
  data_inicio: z.string().min(1, 'Data de início é obrigatória.'),
  data_fim: z.string().optional(),
  status: z.enum(['ativo', 'suspenso', 'cancelado', 'transferido'], {
    required_error: 'Status é obrigatório.',
  }).default('ativo'),
  valor_mensal: z.number().min(0, 'Valor mensal deve ser maior ou igual a 0.'),
  desconto_aplicado: z.number().min(0, 'Desconto deve ser maior ou igual a 0.').max(100, 'Desconto não pode ser maior que 100%.').default(0),
  motivo_suspensao: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeMedicalPlanFormProps {
  initialData?: EmployeeMedicalPlan;
  onSubmit: (data: EmployeeMedicalPlanCreateData | EmployeeMedicalPlanUpdateData) => void;
  isLoading?: boolean;
}

const EmployeeMedicalPlanForm: React.FC<EmployeeMedicalPlanFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const planStatuses = usePlanStatuses();
  const { data: employees } = useEmployees();
  const { data: plans } = useMedicalPlans({ ativo: true });
  const [selectedPlan, setSelectedPlan] = useState<MedicalPlan | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: initialData?.employee_id || '',
      plan_id: initialData?.plan_id || '',
      data_inicio: initialData?.data_inicio?.split('T')[0] || '',
      data_fim: initialData?.data_fim?.split('T')[0] || '',
      status: initialData?.status || 'ativo',
      valor_mensal: initialData?.valor_mensal || 0,
      desconto_aplicado: initialData?.desconto_aplicado || 0,
      motivo_suspensao: initialData?.motivo_suspensao || '',
      observacoes: initialData?.observacoes || '',
    },
  });

  const watchedPlanId = watch('plan_id');
  const watchedDescontoAplicado = watch('desconto_aplicado');

  // Atualizar plano selecionado quando o ID muda
  useEffect(() => {
    if (watchedPlanId && plans) {
      const plan = plans.find(p => p.id === watchedPlanId);
      setSelectedPlan(plan || null);
      
      // Atualizar valor mensal baseado no plano selecionado
      if (plan) {
        const valorBase = plan.valor_titular;
        const desconto = watchedDescontoAplicado || 0;
        const valorFinal = valorBase * (1 - desconto / 100);
        setValue('valor_mensal', valorFinal);
      }
    }
  }, [watchedPlanId, plans, watchedDescontoAplicado, setValue]);

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      data_fim: data.data_fim || undefined,
      motivo_suspensao: data.motivo_suspensao || undefined,
      observacoes: data.observacoes || undefined,
      ...(initialData && { id: initialData.id }),
    };
    onSubmit(submitData as EmployeeMedicalPlanCreateData | EmployeeMedicalPlanUpdateData);
  };

  const getEmployeeName = (employeeId: string) => {
    if (!employees || employees.length === 0) {
      return 'Carregando...';
    }
    return employees.find(emp => emp.id === employeeId)?.nome || 'Funcionário Desconhecido';
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Adesão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Funcionário *</Label>
              <Select
                value={watch('employee_id')}
                onValueChange={(value) => setValue('employee_id', value)}
              >
                <SelectTrigger className={errors.employee_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees && employees.length > 0 ? employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome} ({employee.matricula})
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-employees" disabled>
                      Nenhum funcionário encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_id">Plano *</Label>
              <Select
                value={watch('plan_id')}
                onValueChange={(value) => setValue('plan_id', value)}
              >
                <SelectTrigger className={errors.plan_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans && plans.length > 0 ? plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nome} - {plan.agreement?.nome} ({formatCurrency(plan.valor_titular)})
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-plans" disabled>
                      Nenhum plano encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.plan_id && (
                <p className="text-sm text-red-500">{errors.plan_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                {...register('data_inicio')}
                className={errors.data_inicio ? 'border-red-500' : ''}
              />
              {errors.data_inicio && (
                <p className="text-sm text-red-500">{errors.data_inicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Fim</Label>
              <Input
                id="data_fim"
                type="date"
                {...register('data_fim')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {planStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Plano Selecionado */}
      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Convênio</label>
                <p className="text-sm">{selectedPlan.agreement?.nome}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <p className="text-sm">{selectedPlan.categoria}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Base</label>
                <p className="text-sm font-medium">{formatCurrency(selectedPlan.valor_titular)}</p>
              </div>
            </div>
            {selectedPlan.descricao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{selectedPlan.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Valores e Descontos */}
      <Card>
        <CardHeader>
          <CardTitle>Valores e Descontos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desconto_aplicado">Desconto Aplicado (%)</Label>
              <Input
                id="desconto_aplicado"
                type="number"
                {...register('desconto_aplicado', { valueAsNumber: true })}
                min="0"
                max="100"
                className={errors.desconto_aplicado ? 'border-red-500' : ''}
              />
              {errors.desconto_aplicado && (
                <p className="text-sm text-red-500">{errors.desconto_aplicado.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_mensal">Valor Mensal Final (R$) *</Label>
              <Input
                id="valor_mensal"
                type="number"
                step="0.01"
                {...register('valor_mensal', { valueAsNumber: true })}
                min="0"
                className={errors.valor_mensal ? 'border-red-500' : ''}
              />
              {errors.valor_mensal && (
                <p className="text-sm text-red-500">{errors.valor_mensal.message}</p>
              )}
            </div>
          </div>

          {selectedPlan && watchedDescontoAplicado > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Valor com desconto:</strong> {formatCurrency(selectedPlan.valor_titular * (1 - watchedDescontoAplicado / 100))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivo de Suspensão (se status for suspenso) */}
      {watch('status') === 'suspenso' && (
        <Card>
          <CardHeader>
            <CardTitle>Motivo da Suspensão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="motivo_suspensao">Motivo da Suspensão</Label>
              <Textarea
                id="motivo_suspensao"
                {...register('motivo_suspensao')}
                placeholder="Descreva o motivo da suspensão..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Informações adicionais sobre a adesão..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'} Adesão
        </Button>
      </div>
    </form>
  );
};

export default EmployeeMedicalPlanForm;
