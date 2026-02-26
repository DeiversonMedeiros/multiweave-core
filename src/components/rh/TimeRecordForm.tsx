import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRecord } from '@/integrations/supabase/rh-types';

/** Formata valor TIME (HH:MM ou HH:MM:SS) para HH:MM no input type="time" */
function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return '';
  if (time.length === 5) return time;
  if (time.length >= 8) return time.substring(0, 5);
  return time;
}

/** Converte data (YYYY-MM-DD) + hora (HH:MM) para valor datetime-local (YYYY-MM-DDTHH:MM) */
function toDateTimeLocalValue(date: string, time: string): string {
  if (!date) return '';
  const t = formatTimeForInput(time) || '00:00';
  return `${date}T${t}`;
}

/** Garante data no formato YYYY-MM-DD para input type="date" */
function formatDateForInput(date: string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? date : (date as unknown as string);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }
  return '';
}

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const timeRecordFormSchema = z.object({
  data_registro: z.string().min(1, 'Data é obrigatória'),
  entrada: z.string().optional(),
  saida: z.string().optional(),
  entrada_almoco: z.string().optional(),
  saida_almoco: z.string().optional(),
  entrada_extra1: z.string().optional(),
  saida_extra1: z.string().optional(),
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

export interface TimeRecordFormRef {
  submit: () => void;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const TimeRecordForm = forwardRef<TimeRecordFormRef, TimeRecordFormProps>(function TimeRecordForm(
  { timeRecord, onSubmit, mode },
  ref
) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeRecordFormData>({
    resolver: zodResolver(timeRecordFormSchema),
    defaultValues: {
      data_registro: formatDateForInput(timeRecord?.data_registro) || new Date().toISOString().split('T')[0],
      entrada: formatTimeForInput(timeRecord?.entrada) || '',
      saida: formatTimeForInput(timeRecord?.saida) || '',
      entrada_almoco: formatTimeForInput(timeRecord?.entrada_almoco) || '',
      saida_almoco: formatTimeForInput(timeRecord?.saida_almoco) || '',
      entrada_extra1: formatTimeForInput(timeRecord?.entrada_extra1) || '',
      saida_extra1: formatTimeForInput(timeRecord?.saida_extra1) || '',
      horas_trabalhadas: timeRecord?.horas_trabalhadas ?? 0,
      horas_extras: timeRecord?.horas_extras ?? 0,
      status: (timeRecord?.status as 'pendente' | 'aprovado' | 'rejeitado') || 'pendente',
      observacoes: timeRecord?.observacoes || '',
    },
  });

  // Ao abrir em modo edição/visualização, preencher com o registro selecionado (data e hora editáveis)
  useEffect(() => {
    if (timeRecord && (mode === 'edit' || mode === 'view')) {
      const baseDate = formatDateForInput(timeRecord.data_registro) || new Date().toISOString().split('T')[0];
      const toDt = (t: string | null | undefined) => toDateTimeLocalValue(baseDate, t || '');
      reset({
        data_registro: baseDate,
        entrada: timeRecord.entrada ? toDt(timeRecord.entrada) : '',
        saida: timeRecord.saida ? toDt(timeRecord.saida) : '',
        entrada_almoco: timeRecord.entrada_almoco ? toDt(timeRecord.entrada_almoco) : '',
        saida_almoco: timeRecord.saida_almoco ? toDt(timeRecord.saida_almoco) : '',
        entrada_extra1: timeRecord.entrada_extra1 ? toDt(timeRecord.entrada_extra1) : '',
        saida_extra1: timeRecord.saida_extra1 ? toDt(timeRecord.saida_extra1) : '',
        horas_trabalhadas: timeRecord.horas_trabalhadas ?? 0,
        horas_extras: timeRecord.horas_extras ?? 0,
        status: (timeRecord.status as 'pendente' | 'aprovado' | 'rejeitado') || 'pendente',
        observacoes: timeRecord.observacoes || '',
      });
    }
  }, [timeRecord?.id, mode, reset, timeRecord]);

  const handleFormSubmit = (data: TimeRecordFormData) => {
    onSubmit(data);
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(handleFormSubmit)();
    },
  }), [handleSubmit]);

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

      {/* Horários de Trabalho - em edição: data e hora (datetime-local); em criação: só hora */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="entrada" className="text-sm font-medium">
            Entrada
          </label>
          {mode === 'edit' ? (
            <Controller
              name="entrada"
              control={control}
              render={({ field }) => (
                <Input
                  id="entrada"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || toDateTimeLocalValue(watch('data_registro'), '08:00')}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                  className={errors.entrada ? 'border-red-500' : ''}
                />
              )}
            />
          ) : (
            <Input
              id="entrada"
              type="time"
              disabled={mode === 'view'}
              {...register('entrada')}
            />
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="saida" className="text-sm font-medium">
            Saída
          </label>
          {mode === 'edit' ? (
            <Controller
              name="saida"
              control={control}
              render={({ field }) => (
                <Input
                  id="saida"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || toDateTimeLocalValue(watch('data_registro'), '18:00')}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                  className={errors.saida ? 'border-red-500' : ''}
                />
              )}
            />
          ) : (
            <Input id="saida" type="time" disabled={mode === 'view'} {...register('saida')} />
          )}
        </div>
      </div>

      {/* Horários de Almoço */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="entrada_almoco" className="text-sm font-medium">
            Entrada Almoço
          </label>
          {mode === 'edit' ? (
            <Controller
              name="entrada_almoco"
              control={control}
              render={({ field }) => (
                <Input
                  id="entrada_almoco"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                />
              )}
            />
          ) : (
            <Input
              id="entrada_almoco"
              type="time"
              disabled={mode === 'view'}
              {...register('entrada_almoco')}
            />
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="saida_almoco" className="text-sm font-medium">
            Saída Almoço
          </label>
          {mode === 'edit' ? (
            <Controller
              name="saida_almoco"
              control={control}
              render={({ field }) => (
                <Input
                  id="saida_almoco"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                />
              )}
            />
          ) : (
            <Input
              id="saida_almoco"
              type="time"
              disabled={mode === 'view'}
              {...register('saida_almoco')}
            />
          )}
        </div>
      </div>

      {/* Horários de Horas Extras */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="entrada_extra1" className="text-sm font-medium text-purple-600">
            Entrada Extra
          </label>
          {mode === 'edit' ? (
            <Controller
              name="entrada_extra1"
              control={control}
              render={({ field }) => (
                <Input
                  id="entrada_extra1"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                />
              )}
            />
          ) : (
            <Input
              id="entrada_extra1"
              type="time"
              disabled={mode === 'view'}
              {...register('entrada_extra1')}
            />
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="saida_extra1" className="text-sm font-medium text-purple-600">
            Saída Extra
          </label>
          {mode === 'edit' ? (
            <Controller
              name="saida_extra1"
              control={control}
              render={({ field }) => (
                <Input
                  id="saida_extra1"
                  type="datetime-local"
                  disabled={mode === 'view'}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  step={60}
                />
              )}
            />
          ) : (
            <Input
              id="saida_extra1"
              type="time"
              disabled={mode === 'view'}
              {...register('saida_extra1')}
            />
          )}
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
});
