import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

const timeRecordSchema = z.object({
  entrada: z.string().optional(),
  saida: z.string().optional(),
  entrada_almoco: z.string().optional(),
  saida_almoco: z.string().optional(),
  entrada_extra1: z.string().optional(),
  saida_extra1: z.string().optional(),
  justificativa: z.string().min(10, 'Justificativa deve ter pelo menos 10 caracteres'),
  motivo_id: z.string().min(1, 'Selecione um motivo'),
  observacoes: z.string().optional(),
});

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<TimeRecordFormData>({
    resolver: zodResolver(timeRecordSchema),
    defaultValues: {
      justificativa: '',
      motivo_id: '',
      observacoes: ''
    }
  });

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

        // Criar correção
        const result = await EntityService.create({
          schema: 'rh',
          table: 'attendance_corrections',
          companyId: selectedCompany.id,
          data: {
            employee_id: employeeId,
            company_id: selectedCompany.id,
            data_original: date,
            entrada_original: originalRecord?.entrada || null,
            saida_original: originalRecord?.saida || null,
            entrada_corrigida: data.entrada || null,
            saida_corrigida: data.saida || null,
            justificativa: data.justificativa,
            status: 'pendente',
            solicitado_por: (await supabase.auth.getUser()).data.user?.id,
            observacoes: data.observacoes || null
          }
        });

        return result;
      } catch (error) {
        console.error('Erro ao criar correção:', error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          {/* Horários de Trabalho */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Horários de Trabalho</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada">Entrada *</Label>
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
                <Label htmlFor="saida">Saída *</Label>
                <Input
                  id="saida"
                  type="time"
                  {...register('saida')}
                  className={errors.saida ? 'border-red-500' : ''}
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
              <Select onValueChange={(value) => setValue('motivo_id', value)}>
                <SelectTrigger className={errors.motivo_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {delayReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={isSubmitting || !isTimeSequenceValid()}
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
