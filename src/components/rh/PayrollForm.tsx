import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Payroll } from '@/integrations/supabase/rh-types';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const payrollFormSchema = z.object({
  mes_referencia: z.number().min(1, 'Mês deve ser entre 1 e 12').max(12, 'Mês deve ser entre 1 e 12'),
  ano_referencia: z.number().min(2020, 'Ano deve ser maior que 2020').max(2030, 'Ano deve ser menor que 2030'),
  salario_base: z.number().min(0, 'Salário base deve ser positivo').optional(),
  horas_trabalhadas: z.number().min(0, 'Horas trabalhadas deve ser positivo').optional(),
  horas_extras: z.number().min(0, 'Horas extras deve ser positivo').optional(),
  valor_horas_extras: z.number().min(0, 'Valor horas extras deve ser positivo').optional(),
  total_vencimentos: z.number().min(0, 'Total de vencimentos deve ser positivo').optional(),
  total_descontos: z.number().min(0, 'Total de descontos deve ser positivo').optional(),
  salario_liquido: z.number().min(0, 'Salário líquido deve ser positivo').optional(),
  status: z.enum(['pendente', 'processado', 'pago', 'cancelado']).default('pendente'),
  data_pagamento: z.string().optional(),
});

type PayrollFormData = z.infer<typeof payrollFormSchema>;

// =====================================================
// INTERFACE DE PROPS
// =====================================================

interface PayrollFormProps {
  payroll?: Payroll | null;
  onSubmit: (data: PayrollFormData) => void;
  mode: 'create' | 'edit' | 'view';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function PayrollForm({ payroll, onSubmit, mode }: PayrollFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PayrollFormData>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      mes_referencia: payroll?.mes_referencia || new Date().getMonth() + 1,
      ano_referencia: payroll?.ano_referencia || new Date().getFullYear(),
      salario_base: payroll?.salario_base || 0,
      horas_trabalhadas: payroll?.horas_trabalhadas || 0,
      horas_extras: payroll?.horas_extras || 0,
      valor_horas_extras: payroll?.valor_horas_extras || 0,
      total_vencimentos: payroll?.total_vencimentos || 0,
      total_descontos: payroll?.total_descontos || 0,
      salario_liquido: payroll?.salario_liquido || 0,
      status: payroll?.status || 'pendente',
      data_pagamento: payroll?.data_pagamento || '',
    },
  });

  const handleFormSubmit = (data: PayrollFormData) => {
    onSubmit(data);
  };

  return (
    <form id="form-modal-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Mês e Ano de Referência */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="mes_referencia" className="text-sm font-medium">
            Mês de Referência *
          </label>
          <Input
            id="mes_referencia"
            type="number"
            min="1"
            max="12"
            placeholder="1"
            disabled={mode === 'view'}
            {...register('mes_referencia', { valueAsNumber: true })}
            className={errors.mes_referencia ? 'border-red-500' : ''}
          />
          {errors.mes_referencia && (
            <p className="text-sm text-red-500">{errors.mes_referencia.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="ano_referencia" className="text-sm font-medium">
            Ano de Referência *
          </label>
          <Input
            id="ano_referencia"
            type="number"
            min="2020"
            max="2030"
            placeholder="2024"
            disabled={mode === 'view'}
            {...register('ano_referencia', { valueAsNumber: true })}
            className={errors.ano_referencia ? 'border-red-500' : ''}
          />
          {errors.ano_referencia && (
            <p className="text-sm text-red-500">{errors.ano_referencia.message}</p>
          )}
        </div>
      </div>

      {/* Salário Base e Horas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="salario_base" className="text-sm font-medium">
            Salário Base (R$)
          </label>
          <Input
            id="salario_base"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('salario_base', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="horas_trabalhadas" className="text-sm font-medium">
            Horas Trabalhadas
          </label>
          <Input
            id="horas_trabalhadas"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('horas_trabalhadas', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Horas Extras e Valor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="horas_extras" className="text-sm font-medium">
            Horas Extras
          </label>
          <Input
            id="horas_extras"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('horas_extras', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="valor_horas_extras" className="text-sm font-medium">
            Valor Horas Extras (R$)
          </label>
          <Input
            id="valor_horas_extras"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('valor_horas_extras', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="total_vencimentos" className="text-sm font-medium">
            Total Vencimentos (R$)
          </label>
          <Input
            id="total_vencimentos"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('total_vencimentos', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="total_descontos" className="text-sm font-medium">
            Total Descontos (R$)
          </label>
          <Input
            id="total_descontos"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={mode === 'view'}
            {...register('total_descontos', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Salário Líquido */}
      <div className="space-y-2">
        <label htmlFor="salario_liquido" className="text-sm font-medium">
          Salário Líquido (R$)
        </label>
        <Input
          id="salario_liquido"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          disabled={mode === 'view'}
          {...register('salario_liquido', { valueAsNumber: true })}
        />
      </div>

      {/* Status e Data de Pagamento */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value as 'pendente' | 'processado' | 'pago' | 'cancelado')}
            disabled={mode === 'view'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processado">Processado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="data_pagamento" className="text-sm font-medium">
            Data de Pagamento
          </label>
          <Input
            id="data_pagamento"
            type="date"
            disabled={mode === 'view'}
            {...register('data_pagamento')}
          />
        </div>
      </div>
    </form>
  );
}
