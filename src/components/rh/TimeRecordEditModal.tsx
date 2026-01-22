import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { DelayReason } from '@/hooks/rh/useDelayReasons';

// Schema base - campos opcionais para criação de registro
const baseTimeRecordSchema = z.object({
  entrada: z.string().optional(),
  saida: z.string().optional(),
  entrada_almoco: z.string().optional(),
  saida_almoco: z.string().optional(),
  entrada_extra1: z.string().optional(),
  saida_extra1: z.string().optional(),
  justificativa: z.string().optional(),
  motivo_id: z.string().optional(),
  observacoes: z.string().optional(),
});

// Schema para correção - justificativa e motivo são obrigatórios
const correctionSchema = baseTimeRecordSchema.extend({
  justificativa: z.string().min(1, 'Justificativa detalhada é obrigatória'),
  motivo_id: z.string().min(1, 'Motivo do atraso/falta é obrigatório'),
});

// Schema para criação de registro - campos opcionais
const timeRecordSchema = baseTimeRecordSchema;

type TimeRecordFormData = z.infer<typeof timeRecordSchema>;

interface TimeRecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  isCreating: boolean;
  employeeId: string;
  delayReasons: DelayReason[];
  onSuccess?: () => void;
}

export function TimeRecordEditModal({
  isOpen,
  onClose,
  date,
  isCreating,
  employeeId,
  delayReasons,
  onSuccess
}: TimeRecordEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const bodyScrollLockRef = useRef<{ originalOverflow: string; originalPosition: string; originalTop: string } | null>(null);

  // Buscar registro existente
  const { data: existingRecord } = useQuery({
    queryKey: ['time-record', date, employeeId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;

      const result = await EntityService.list({
        schema: 'rh',
        table: 'time_records',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employeeId,
          data_registro: date
        },
        pageSize: 1
      });

      return result.data[0] || null;
    },
    enabled: !isCreating && !!selectedCompany?.id && !!employeeId && !!date
  });

  // Usar schema de correção se não estiver criando (ou seja, está corrigindo)
  const schema = useMemo(() => {
    return isCreating ? timeRecordSchema : correctionSchema;
  }, [isCreating]);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<TimeRecordFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      justificativa: '',
      motivo_id: '',
      observacoes: ''
    }
  });

  // Função para formatar hora de HH:MM:SS para HH:MM
  const formatTimeForInput = (time: string | null | undefined): string | undefined => {
    if (!time) return undefined;
    // Se já está no formato correto HH:MM, retornar
    if (time.length === 5) return time;
    // Se tem segundos (HH:MM:SS), remover
    if (time.length === 8) return time.substring(0, 5);
    return time;
  };

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (existingRecord && !isCreating) {
      console.log('📝 [TimeRecordEditModal] Preenchendo formulário com dados existentes:', existingRecord);
      
      if (existingRecord.entrada) {
        const entradaFormatted = formatTimeForInput(existingRecord.entrada);
        if (entradaFormatted) setValue('entrada', entradaFormatted);
      }
      if (existingRecord.saida) {
        const saidaFormatted = formatTimeForInput(existingRecord.saida);
        if (saidaFormatted) setValue('saida', saidaFormatted);
      }
      if (existingRecord.entrada_almoco) {
        const entradaAlmocoFormatted = formatTimeForInput(existingRecord.entrada_almoco);
        if (entradaAlmocoFormatted) setValue('entrada_almoco', entradaAlmocoFormatted);
      }
      if (existingRecord.saida_almoco) {
        const saidaAlmocoFormatted = formatTimeForInput(existingRecord.saida_almoco);
        if (saidaAlmocoFormatted) setValue('saida_almoco', saidaAlmocoFormatted);
      }
      if (existingRecord.entrada_extra1) {
        const entradaExtraFormatted = formatTimeForInput(existingRecord.entrada_extra1);
        if (entradaExtraFormatted) setValue('entrada_extra1', entradaExtraFormatted);
      }
      if (existingRecord.saida_extra1) {
        const saidaExtraFormatted = formatTimeForInput(existingRecord.saida_extra1);
        if (saidaExtraFormatted) setValue('saida_extra1', saidaExtraFormatted);
      }
      
      console.log('✅ [TimeRecordEditModal] Formulário preenchido');
    } else if (isCreating) {
      reset();
    }
  }, [existingRecord, isCreating, setValue, reset]);

  // Bloquear scroll do body quando o modal está aberto (especialmente importante para mobile)
  useEffect(() => {
    if (isOpen) {
      // Salvar valores originais
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      
      bodyScrollLockRef.current = {
        originalOverflow,
        originalPosition,
        originalTop
      };

      // Bloquear scroll
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Prevenir scroll em touch devices apenas fora do modal
      const preventScroll = (e: TouchEvent) => {
        const target = e.target as Element;
        // Permitir scroll dentro do modal e dentro do Select
        if (
          target.closest('[role="dialog"]') ||
          target.closest('[data-radix-select-content]') ||
          target.closest('[role="listbox"]') ||
          target.closest('textarea') ||
          target.closest('input')
        ) {
          return;
        }
        // Bloquear scroll apenas no body/overlay
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventScroll, { passive: false });

      return () => {
        // Restaurar valores originais
        if (bodyScrollLockRef.current) {
          document.body.style.overflow = bodyScrollLockRef.current.originalOverflow;
          document.body.style.position = bodyScrollLockRef.current.originalPosition;
          document.body.style.top = bodyScrollLockRef.current.originalTop;
          
          const scrollY = document.body.style.top ? parseInt(document.body.style.top || '0') * -1 : 0;
          if (scrollY) {
            window.scrollTo(0, scrollY);
          }
        }
        
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isOpen]);

  // Watch form values for real-time calculation
  const watchedValues = watch();

  // Calcular horas trabalhadas em tempo real
  useEffect(() => {
    const calculateHours = async () => {
      const { entrada, saida, entrada_almoco, saida_almoco } = watchedValues;
      
      if (!entrada || !saida) {
        setCalculatedHours(0);
        return;
      }

      setIsCalculating(true);
      
      try {
        const { data, error } = await supabase.rpc('calculate_work_hours', {
          p_entrada: entrada,
          p_saida: saida,
          p_entrada_almoco: entrada_almoco || null,
          p_saida_almoco: saida_almoco || null
        });

        if (error) {
          console.error('Erro ao calcular horas:', error);
          setCalculatedHours(0);
        } else {
          setCalculatedHours(data || 0);
        }
      } catch (error) {
        console.error('Erro ao calcular horas:', error);
        setCalculatedHours(0);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateHours();
  }, [watchedValues.entrada, watchedValues.saida, watchedValues.entrada_almoco, watchedValues.saida_almoco]);

  // Mutation para criar/atualizar registro
  const createTimeRecordMutation = useMutation({
    mutationFn: async (data: TimeRecordFormData) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const result = await EntityService.upsert({
        schema: 'rh',
        table: 'time_records',
        companyId: selectedCompany.id,
        data: {
          employee_id: employeeId,
          data_registro: date,
          entrada: data.entrada || null,
          saida: data.saida || null,
          entrada_almoco: data.entrada_almoco || null,
          saida_almoco: data.saida_almoco || null,
          entrada_extra1: data.entrada_extra1 || null,
          saida_extra1: data.saida_extra1 || null,
          horas_trabalhadas: calculatedHours,
          status: 'pendente',
          observacoes: data.observacoes || null,
          updated_at: new Date().toISOString()
        },
        conflictColumns: ['employee_id', 'data_registro']
      });

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Registro salvo!",
        description: `Registro de ponto para ${new Date(date).toLocaleDateString('pt-BR')} foi salvo com sucesso.`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
      queryClient.invalidateQueries({ queryKey: ['today-time-record'] });
      
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar registro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para criar correção de ponto
  const createCorrectionMutation = useMutation({
    mutationFn: async (data: TimeRecordFormData) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      try {
        // Buscar o ID do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.id) {
          throw new Error('Usuário não autenticado');
        }

        console.log('👤 [TimeRecordEditModal] Usuário autenticado:', user.id);

        // Buscar registro original
        const originalRecordResult = await EntityService.list({
          schema: 'rh',
          table: 'time_records',
          companyId: selectedCompany.id,
          filters: {
            employee_id: employeeId,
            data_registro: date
          },
          pageSize: 1
        });

        const originalRecord = originalRecordResult.data?.[0];

        // Preparar dados para a correção
        const correctionData = {
          employee_id: employeeId,
          company_id: selectedCompany.id,
          data_original: date,
          entrada_original: originalRecord?.entrada || null,
          saida_original: originalRecord?.saida || null,
          entrada_corrigida: data.entrada || null,
          saida_corrigida: data.saida || null,
          entrada_almoco_original: originalRecord?.entrada_almoco || null,
          saida_almoco_original: originalRecord?.saida_almoco || null,
          entrada_almoco_corrigida: data.entrada_almoco || null,
          saida_almoco_corrigida: data.saida_almoco || null,
          entrada_extra1_original: originalRecord?.entrada_extra1 || null,
          saida_extra1_original: originalRecord?.saida_extra1 || null,
          entrada_extra1_corrigida: data.entrada_extra1 || null,
          saida_extra1_corrigida: data.saida_extra1 || null,
          justificativa: data.justificativa || 'Correção solicitada',
          status: 'pendente',
          solicitado_por: user.id,
          observacoes: data.observacoes || null
        };

        console.log('📝 [TimeRecordEditModal] Dados da correção:', {
          user_id: user.id,
          employee_id: employeeId,
          solicitado_por: correctionData.solicitado_por,
          data_original: date,
          entrada_original: originalRecord?.entrada,
          saida_original: originalRecord?.saida,
          entrada_corrigida: correctionData.entrada_corrigida,
          saida_corrigida: correctionData.saida_corrigida,
          justificativa: correctionData.justificativa,
          status: correctionData.status
        });

        // Verificar campos vazios
        Object.entries(correctionData).forEach(([key, value]) => {
          if (value === null) {
            console.log(`⚠️ [TimeRecordEditModal] Campo ${key} é NULL`);
          } else if (value === undefined) {
            console.log(`⚠️ [TimeRecordEditModal] Campo ${key} é UNDEFINED`);
          } else if (typeof value === 'string' && value.trim() === '') {
            console.log(`⚠️ [TimeRecordEditModal] Campo ${key} é STRING VAZIA`);
          }
        });

        // Criar correção
        const result = await EntityService.create({
          schema: 'rh',
          table: 'attendance_corrections',
          companyId: selectedCompany.id,
          data: correctionData
        });

        console.log('✅ [TimeRecordEditModal] Correção criada com sucesso:', result);
        return result;
      } catch (error) {
        console.error('❌ [TimeRecordEditModal] Erro ao criar correção:', error);
        throw new Error(`Erro ao criar correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Correção solicitada!",
        description: `Solicitação de correção para ${new Date(date).toLocaleDateString('pt-BR')} foi enviada para aprovação.`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
      
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao solicitar correção",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: TimeRecordFormData) => {
    // Validação adicional para correções
    if (!isCreating) {
      if (!data.justificativa || data.justificativa.trim() === '') {
        toast({
          title: "Erro de validação",
          description: "Justificativa detalhada é obrigatória",
          variant: "destructive",
        });
        return;
      }
      if (!data.motivo_id || data.motivo_id.trim() === '') {
        toast({
          title: "Erro de validação",
          description: "Motivo do atraso/falta é obrigatório",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (isCreating) {
      await createTimeRecordMutation.mutateAsync(data);
    } else {
      await createCorrectionMutation.mutateAsync(data);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const validateTime = (time: string) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const isTimeValid = (time: string) => {
    if (!time) return true;
    return validateTime(time);
  };

  const isTimeSequenceValid = () => {
    const { entrada, saida, entrada_almoco, saida_almoco } = watchedValues;
    
    if (!entrada || !saida) return true;
    
    const entradaTime = new Date(`2000-01-01T${entrada}`);
    const saidaTime = new Date(`2000-01-01T${saida}`);
    
    if (entradaTime >= saidaTime) return false;
    
    if (entrada_almoco && saida_almoco) {
      const entradaAlmocoTime = new Date(`2000-01-01T${entrada_almoco}`);
      const saidaAlmocoTime = new Date(`2000-01-01T${saida_almoco}`);
      
      if (entradaAlmocoTime >= saidaAlmocoTime) return false;
      if (entradaAlmocoTime <= entradaTime || saidaAlmocoTime >= saidaTime) return false;
    }
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevenir fechamento acidental em mobile
          const target = e.target as HTMLElement;
          if (target.closest('[role="listbox"]') || target.closest('[data-radix-select-content]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevenir interação fora do modal quando o Select está aberto
          const target = e.target as HTMLElement;
          if (target.closest('[role="listbox"]') || target.closest('[data-radix-select-content]')) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Permitir fechar com ESC apenas se o Select não estiver aberto
          const selectOpen = document.querySelector('[data-radix-select-content][data-state="open"]');
          if (selectOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {isCreating ? 'Criar Registro de Ponto' : 'Solicitar Correção de Ponto'}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? `Criar novo registro para ${formatDate(date)}`
              : `Solicitar correção para ${formatDate(date)}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Mostrar registro atual se houver */}
          {!isCreating && existingRecord && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <p className="font-medium">Registro Atual:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Entrada:</span>{' '}
                      {existingRecord.entrada ? existingRecord.entrada : 'Não registrado'}
                    </div>
                    <div>
                      <span className="font-medium">Saída:</span>{' '}
                      {existingRecord.saida ? existingRecord.saida : 'Não registrado'}
                    </div>
                    {existingRecord.entrada_almoco && (
                      <div>
                        <span className="font-medium">Entrada Almoço:</span> {existingRecord.entrada_almoco}
                      </div>
                    )}
                    {existingRecord.saida_almoco && (
                      <div>
                        <span className="font-medium">Saída Almoço:</span> {existingRecord.saida_almoco}
                      </div>
                    )}
                    {existingRecord.entrada_extra1 && (
                      <div>
                        <span className="font-medium">Entrada Extra:</span> {existingRecord.entrada_extra1}
                      </div>
                    )}
                    {existingRecord.saida_extra1 && (
                      <div>
                        <span className="font-medium">Saída Extra:</span> {existingRecord.saida_extra1}
                      </div>
                    )}
                  </div>
                  {!existingRecord.saida && (
                    <p className="text-xs text-blue-600 mt-2">
                      ⚠️ Registro incompleto - Complete o horário de saída abaixo
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Horários de Trabalho */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {isCreating ? 'Horários de Trabalho' : 'Novos Horários (Correção)'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada">
                  Entrada {isCreating ? '*' : ''}
                </Label>
                <Input
                  id="entrada"
                  type="time"
                  {...register('entrada')}
                  className={errors.entrada ? 'border-red-500' : ''}
                />
                {errors.entrada && (
                  <p className="text-sm text-red-500">{errors.entrada.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida">
                  Saída {isCreating ? '*' : ''}
                </Label>
                <Input
                  id="saida"
                  type="time"
                  {...register('saida')}
                  className={errors.saida ? 'border-red-500' : ''}
                  placeholder={isCreating ? 'Obrigatório' : 'Opcional'}
                />
                {errors.saida && (
                  <p className="text-sm text-red-500">{errors.saida.message}</p>
                )}
              </div>
            </div>

            {/* Horário de Almoço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_almoco">Início do Almoço</Label>
                <Input
                  id="entrada_almoco"
                  type="time"
                  {...register('entrada_almoco')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida_almoco">Fim do Almoço</Label>
                <Input
                  id="saida_almoco"
                  type="time"
                  {...register('saida_almoco')}
                />
              </div>
            </div>

            {/* Horário Extra */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_extra1">Entrada Extra</Label>
                <Input
                  id="entrada_extra1"
                  type="time"
                  {...register('entrada_extra1')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida_extra1">Saída Extra</Label>
                <Input
                  id="saida_extra1"
                  type="time"
                  {...register('saida_extra1')}
                />
              </div>
            </div>

            {/* Cálculo de Horas */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="font-medium">Horas Trabalhadas:</span>
                {isCalculating ? (
                  <span className="text-gray-500">Calculando...</span>
                ) : (
                  <span className="font-bold text-blue-600">{calculatedHours}h</span>
                )}
              </div>
            </div>

            {/* Validação de sequência de horários */}
            {!isTimeSequenceValid() && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Verifique a sequência dos horários. A entrada deve ser anterior à saída.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Justificativa e Motivo */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Justificativa</h3>
            
            <div className="space-y-2">
              <Label htmlFor="motivo_id">Motivo do Atraso/Falta *</Label>
              <Controller
                name="motivo_id"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue('motivo_id', value, { shouldValidate: true, shouldDirty: true });
                    }}
                    value={field.value || ''}
                    onOpenChange={(open) => {
                      // Quando o Select fecha, garantir que o modal continue responsivo
                      if (!open) {
                        // Pequeno delay para garantir que o Select fechou completamente
                        // e o modal está pronto para receber interações
                        setTimeout(() => {
                          // Não forçar foco, apenas garantir que o modal está ativo
                          const dialog = document.querySelector('[role="dialog"]');
                          if (dialog) {
                            (dialog as HTMLElement).focus();
                          }
                        }, 50);
                      }
                    }}
                  >
                    <SelectTrigger 
                      className={errors.motivo_id ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="Selecione um motivo" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                    >
                      {delayReasons.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.motivo_id && (
                <p className="text-sm text-red-500">{errors.motivo_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa Detalhada *</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva detalhadamente o motivo do atraso ou falta..."
                {...register('justificativa')}
                className={errors.justificativa ? 'border-red-500' : ''}
                rows={4}
              />
              {errors.justificativa && (
                <p className="text-sm text-red-500">{errors.justificativa.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Adicionais</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais (opcional)..."
                {...register('observacoes')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isTimeSequenceValid() || Object.keys(errors).length > 0}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </div>
              ) : isCreating ? (
                'Criar Registro'
              ) : (
                'Solicitar Correção'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
