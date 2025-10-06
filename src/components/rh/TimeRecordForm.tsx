import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRecord } from '@/integrations/supabase/rh-types';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const timeRecordFormSchema = z.object({
  data_registro: z.string().min(1, 'Data é obrigatória'),
  entrada: z.string().optional(),
  saida: z.string().optional(),
  entrada_almoco: z.string().optional(),
  saida_almoco: z.string().optional(),
  horas_trabalhadas: z.number().optional(),
  horas_extras: z.number().optional(),
  status: z.enum(['pendente', 'aprovado', 'rejeitado']).default('pendente'),
  observacoes: z.string().optional(),
});

type TimeRecordFormData = z.infer<typeof timeRecordFormSchema>;

// =====================================================
// INTERFACE DE PROPS
// =====================================================

interface TimeRecordFormProps {
  timeRecord?: TimeRecord | null;
  onSubmit: (data: TimeRecordFormData) => void;
  mode: 'create' | 'edit' | 'view';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function TimeRecordForm({ timeRecord, onSubmit, mode }: TimeRecordFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TimeRecordFormData>({
    resolver: zodResolver(timeRecordFormSchema),
    defaultValues: {
      data_registro: timeRecord?.data_registro || new Date().toISOString().split('T')[0],
      entrada: timeRecord?.entrada || '',
      saida: timeRecord?.saida || '',
      entrada_almoco: timeRecord?.entrada_almoco || '',
      saida_almoco: timeRecord?.saida_almoco || '',
      horas_trabalhadas: timeRecord?.horas_trabalhadas || 0,
      horas_extras: timeRecord?.horas_extras || 0,
      status: timeRecord?.status || 'pendente',
      observacoes: timeRecord?.observacoes || '',
    },
  });

  const handleFormSubmit = (data: TimeRecordFormData) => {
    onSubmit(data);
  };

  return (
    <form id="form-modal-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Data do Registro */}
      <div className="space-y-2">
        <label htmlFor="data_registro" className="text-sm font-medium">
          Data do Registro *
        </label>
        <Input
          id="data_registro"
          type="date"
          disabled={mode === 'view'}
          {...register('data_registro')}
          className={errors.data_registro ? 'border-red-500' : ''}
        />
        {errors.data_registro && (
          <p className="text-sm text-red-500">{errors.data_registro.message}</p>
        )}
      </div>

      {/* Horários de Trabalho */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="entrada" className="text-sm font-medium">
            Entrada
          </label>
          <Input
            id="entrada"
            type="time"
            disabled={mode === 'view'}
            {...register('entrada')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="saida" className="text-sm font-medium">
            Saída
          </label>
          <Input
            id="saida"
            type="time"
            disabled={mode === 'view'}
            {...register('saida')}
          />
        </div>
      </div>

      {/* Horários de Almoço */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="entrada_almoco" className="text-sm font-medium">
            Entrada Almoço
          </label>
          <Input
            id="entrada_almoco"
            type="time"
            disabled={mode === 'view'}
            {...register('entrada_almoco')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="saida_almoco" className="text-sm font-medium">
            Saída Almoço
          </label>
          <Input
            id="saida_almoco"
            type="time"
            disabled={mode === 'view'}
            {...register('saida_almoco')}
          />
        </div>
      </div>

      {/* Horas Trabalhadas e Extras */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="horas_trabalhadas" className="text-sm font-medium">
            Horas Trabalhadas
          </label>
          <Input
            id="horas_trabalhadas"
            type="number"
            step="0.25"
            min="0"
            max="24"
            disabled={mode === 'view'}
            {...register('horas_trabalhadas', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="horas_extras" className="text-sm font-medium">
            Horas Extras
          </label>
          <Input
            id="horas_extras"
            type="number"
            step="0.25"
            min="0"
            disabled={mode === 'view'}
            {...register('horas_extras', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <Select
          value={watch('status')}
          onValueChange={(value) => setValue('status', value as 'pendente' | 'aprovado' | 'rejeitado')}
          disabled={mode === 'view'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <label htmlFor="observacoes" className="text-sm font-medium">
          Observações
        </label>
        <Textarea
          id="observacoes"
          placeholder="Observações sobre o registro..."
          disabled={mode === 'view'}
          rows={3}
          {...register('observacoes')}
        />
      </div>
    </form>
  );
}
