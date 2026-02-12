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
  // Campos de data para horários corrigidos (quando diferente de data_original)
  entrada_date: z.string().optional(),
  saida_date: z.string().optional(),
  entrada_almoco_date: z.string().optional(),
  saida_almoco_date: z.string().optional(),
  entrada_extra1_date: z.string().optional(),
  saida_extra1_date: z.string().optional(),
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

  // Função para converter datetime-local para time e date separados
  const parseDateTimeLocal = (datetimeLocal: string | undefined): { time: string | null; date: string | null } => {
    if (!datetimeLocal) return { time: null, date: null };
    
    // Formato: YYYY-MM-DDTHH:MM
    const [datePart, timePart] = datetimeLocal.split('T');
    if (!datePart || !timePart) {
      // Se não tem T, pode ser apenas time (HH:MM)
      if (datetimeLocal.match(/^\d{2}:\d{2}$/)) {
        return { time: datetimeLocal, date: null };
      }
      return { time: null, date: null };
    }
    
    return { time: timePart, date: datePart };
  };

  // Função para criar valor datetime-local a partir de time e date
  const createDateTimeLocal = (time: string | null | undefined, date: string | null | undefined, baseDate: string): string | undefined => {
    if (!time) return undefined;
    
    // Se tem data específica e é diferente da base, usar ela
    const dateToUse = date && date !== baseDate ? date : baseDate;
    
    // Formato datetime-local: YYYY-MM-DDTHH:MM
    return `${dateToUse}T${time}`;
  };

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (existingRecord && !isCreating) {
      console.log('📝 [TimeRecordEditModal] Preenchendo formulário com dados existentes:', existingRecord);
      
      // Preencher com datetime-local (data+hora) quando disponível
      if (existingRecord.entrada) {
        const entradaFormatted = formatTimeForInput(existingRecord.entrada);
        const entradaDate = existingRecord.entrada_date || date;
        if (entradaFormatted) {
          const datetimeLocal = createDateTimeLocal(entradaFormatted, entradaDate, date);
          setValue('entrada', datetimeLocal || entradaFormatted);
          if (entradaDate && entradaDate !== date) {
            setValue('entrada_date', entradaDate);
          }
        }
      }
      if (existingRecord.saida) {
        const saidaFormatted = formatTimeForInput(existingRecord.saida);
        const saidaDate = existingRecord.saida_date || date;
        if (saidaFormatted) {
          const datetimeLocal = createDateTimeLocal(saidaFormatted, saidaDate, date);
          setValue('saida', datetimeLocal || saidaFormatted);
          if (saidaDate && saidaDate !== date) {
            setValue('saida_date', saidaDate);
          }
        }
      }
      if (existingRecord.entrada_almoco) {
        const entradaAlmocoFormatted = formatTimeForInput(existingRecord.entrada_almoco);
        const entradaAlmocoDate = existingRecord.entrada_almoco_date || date;
        if (entradaAlmocoFormatted) {
          const datetimeLocal = createDateTimeLocal(entradaAlmocoFormatted, entradaAlmocoDate, date);
          setValue('entrada_almoco', datetimeLocal || entradaAlmocoFormatted);
          if (entradaAlmocoDate && entradaAlmocoDate !== date) {
            setValue('entrada_almoco_date', entradaAlmocoDate);
          }
        }
      }
      if (existingRecord.saida_almoco) {
        const saidaAlmocoFormatted = formatTimeForInput(existingRecord.saida_almoco);
        const saidaAlmocoDate = existingRecord.saida_almoco_date || date;
        if (saidaAlmocoFormatted) {
          const datetimeLocal = createDateTimeLocal(saidaAlmocoFormatted, saidaAlmocoDate, date);
          setValue('saida_almoco', datetimeLocal || saidaAlmocoFormatted);
          if (saidaAlmocoDate && saidaAlmocoDate !== date) {
            setValue('saida_almoco_date', saidaAlmocoDate);
          }
        }
      }
      if (existingRecord.entrada_extra1) {
        const entradaExtraFormatted = formatTimeForInput(existingRecord.entrada_extra1);
        const entradaExtraDate = existingRecord.entrada_extra1_date || date;
        if (entradaExtraFormatted) {
          const datetimeLocal = createDateTimeLocal(entradaExtraFormatted, entradaExtraDate, date);
          setValue('entrada_extra1', datetimeLocal || entradaExtraFormatted);
          if (entradaExtraDate && entradaExtraDate !== date) {
            setValue('entrada_extra1_date', entradaExtraDate);
          }
        }
      }
      if (existingRecord.saida_extra1) {
        const saidaExtraFormatted = formatTimeForInput(existingRecord.saida_extra1);
        const saidaExtraDate = existingRecord.saida_extra1_date || date;
        if (saidaExtraFormatted) {
          const datetimeLocal = createDateTimeLocal(saidaExtraFormatted, saidaExtraDate, date);
          setValue('saida_extra1', datetimeLocal || saidaExtraFormatted);
          if (saidaExtraDate && saidaExtraDate !== date) {
            setValue('saida_extra1_date', saidaExtraDate);
          }
        }
      }
      
      console.log('✅ [TimeRecordEditModal] Formulário preenchido');
    } else if (isCreating) {
      reset();
    } else {
      // Quando não está criando e não há registro existente (correção nova)
      // Inicializar campos datetime-local com a data selecionada para evitar que smartphones usem a data atual
      // Isso é especialmente importante em dispositivos móveis onde o navegador pode usar a data atual como padrão
      reset({
        entrada: `${date}T08:00`,
        saida: `${date}T18:00`,
        entrada_almoco: '',
        saida_almoco: '',
        entrada_extra1: '',
        saida_extra1: '',
        justificativa: '',
        motivo_id: '',
        observacoes: ''
      });
    }
  }, [existingRecord, isCreating, setValue, reset, date]);

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
        // Extrair apenas o time (HH:MM) se for datetime-local
        const entradaTime = entrada.includes('T') ? entrada.split('T')[1] : entrada;
        const saidaTime = saida.includes('T') ? saida.split('T')[1] : saida;
        const entradaAlmocoTime = entrada_almoco && entrada_almoco.includes('T') 
          ? entrada_almoco.split('T')[1] 
          : entrada_almoco || null;
        const saidaAlmocoTime = saida_almoco && saida_almoco.includes('T') 
          ? saida_almoco.split('T')[1] 
          : saida_almoco || null;

        const { data, error } = await supabase.rpc('calculate_work_hours', {
          p_entrada: entradaTime,
          p_saida: saidaTime,
          p_entrada_almoco: entradaAlmocoTime,
          p_saida_almoco: saidaAlmocoTime
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
        description: `Registro de ponto para ${formatDateSimple(date)} foi salvo com sucesso.`,
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

        // Processar horários corrigidos (pode vir como datetime-local ou apenas time)
        const processTimeField = (datetimeOrTime: string | undefined): { time: string | null; date: string | null } => {
          if (!datetimeOrTime) return { time: null, date: null };
          
          // Se é datetime-local (YYYY-MM-DDTHH:MM)
          if (datetimeOrTime.includes('T')) {
            return parseDateTimeLocal(datetimeOrTime);
          }
          
          // Se é apenas time (HH:MM), usar data_original
          return { time: datetimeOrTime, date: null };
        };

        const entradaProcessed = processTimeField(data.entrada);
        const saidaProcessed = processTimeField(data.saida);
        const entradaAlmocoProcessed = processTimeField(data.entrada_almoco);
        const saidaAlmocoProcessed = processTimeField(data.saida_almoco);
        const entradaExtra1Processed = processTimeField(data.entrada_extra1);
        const saidaExtra1Processed = processTimeField(data.saida_extra1);

        // Preparar dados para a correção
        const correctionData = {
          employee_id: employeeId,
          company_id: selectedCompany.id,
          data_original: date,
          entrada_original: originalRecord?.entrada || null,
          saida_original: originalRecord?.saida || null,
          entrada_corrigida: entradaProcessed.time,
          entrada_corrigida_date: entradaProcessed.date && entradaProcessed.date !== date ? entradaProcessed.date : null,
          saida_corrigida: saidaProcessed.time,
          saida_corrigida_date: saidaProcessed.date && saidaProcessed.date !== date ? saidaProcessed.date : null,
          entrada_almoco_original: originalRecord?.entrada_almoco || null,
          saida_almoco_original: originalRecord?.saida_almoco || null,
          entrada_almoco_corrigida: entradaAlmocoProcessed.time,
          entrada_almoco_corrigida_date: entradaAlmocoProcessed.date && entradaAlmocoProcessed.date !== date ? entradaAlmocoProcessed.date : null,
          saida_almoco_corrigida: saidaAlmocoProcessed.time,
          saida_almoco_corrigida_date: saidaAlmocoProcessed.date && saidaAlmocoProcessed.date !== date ? saidaAlmocoProcessed.date : null,
          entrada_extra1_original: originalRecord?.entrada_extra1 || null,
          saida_extra1_original: originalRecord?.saida_extra1 || null,
          entrada_extra1_corrigida: entradaExtra1Processed.time,
          entrada_extra1_corrigida_date: entradaExtra1Processed.date && entradaExtra1Processed.date !== date ? entradaExtra1Processed.date : null,
          saida_extra1_corrigida: saidaExtra1Processed.time,
          saida_extra1_corrigida_date: saidaExtra1Processed.date && saidaExtra1Processed.date !== date ? saidaExtra1Processed.date : null,
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
        description: `Solicitação de correção para ${formatDateSimple(date)} foi enviada para aprovação.`,
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
      // Ordem cronológica: entrada → entrada_almoco → saida_almoco → saída → entrada_extra1 → saida_extra1
      const seqValidation = getTimeSequenceValidation();
      if (!seqValidation.valid) {
        toast({
          title: "Horários inválidos",
          description: seqValidation.message,
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

  // Função auxiliar para criar Date no timezone local a partir de string YYYY-MM-DD
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Função para formatar data completa (com dia da semana)
  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Função para formatar data simples (sem dia da semana)
  const formatDateSimple = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const validateTime = (time: string) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const isTimeValid = (time: string) => {
    if (!time) return true;
    return validateTime(time);
  };

  // Converte valor do form (datetime-local ou time) para Date usando data base quando não há data
  const toDateTime = (value: string | undefined, baseDate: string): Date | null => {
    if (!value || !value.trim()) return null;
    if (value.includes('T')) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    // Apenas time (HH:MM) — usar data base
    const [h, m] = value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const [y, mo, day] = baseDate.split('-').map(Number);
    return new Date(y, mo - 1, day, h, m, 0, 0);
  };

  // Ordem cronológica obrigatória: entrada → entrada_almoco → saida_almoco → saída → entrada_extra1 → saida_extra1
  const ORDERED_FIELDS = ['entrada', 'entrada_almoco', 'saida_almoco', 'saida', 'entrada_extra1', 'saida_extra1'] as const;

  const getTimeSequenceValidation = (): { valid: boolean; message?: string } => {
    const vals = watchedValues;
    const baseDate = date;

    const dates: (Date | null)[] = ORDERED_FIELDS.map((f) => toDateTime(vals[f], baseDate));

    // Qualquer campo preenchido não pode ser anterior a outro que venha antes na ordem
    for (let i = 0; i < ORDERED_FIELDS.length; i++) {
      for (let j = i + 1; j < ORDERED_FIELDS.length; j++) {
        const earlier = dates[i];
        const later = dates[j];
        if (earlier == null || later == null) continue;
        if (later.getTime() < earlier.getTime()) {
          const labels: Record<string, string> = {
            entrada: 'Entrada',
            entrada_almoco: 'Início do almoço',
            saida_almoco: 'Fim do almoço',
            saida: 'Saída',
            entrada_extra1: 'Entrada extra',
            saida_extra1: 'Saída extra'
          };
          const earlierName = labels[ORDERED_FIELDS[i]];
          const laterName = labels[ORDERED_FIELDS[j]];
          return {
            valid: false,
            message: `${laterName} não pode ser anterior a ${earlierName}. Respeite a ordem: Entrada → Início almoço → Fim almoço → Saída → Entrada extra → Saída extra.`
          };
        }
      }
    }
    return { valid: true };
  };

  const isTimeSequenceValid = (): boolean => getTimeSequenceValidation().valid;

  // Para correção: retorna o min (datetime-local) para cada campo, garantindo que não seja anterior ao anterior na ordem
  const getMinForCorrectionField = (fieldKey: (typeof ORDERED_FIELDS)[number]): string => {
    const idx = ORDERED_FIELDS.indexOf(fieldKey);
    if (idx <= 0) return `${date}T00:00`;
    const vals = watchedValues;
    const toDatetimeLocal = (v: string | undefined): string | null => {
      if (!v || !v.trim()) return null;
      if (v.includes('T')) return v;
      return `${date}T${v.length === 5 ? v : v.substring(0, 5)}`;
    };
    for (let i = idx - 1; i >= 0; i--) {
      const v = toDatetimeLocal(vals[ORDERED_FIELDS[i]]);
      if (v) return v;
    }
    return `${date}T00:00`;
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
                {isCreating ? (
                  <Input
                    id="entrada"
                    type="time"
                    {...register('entrada')}
                    className={errors.entrada ? 'border-red-500' : ''}
                  />
                ) : (
                  <Controller
                    name="entrada"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`entrada-${date}`}
                        id="entrada"
                        type="datetime-local"
                        value={field.value || `${date}T08:00`}
                        className={errors.entrada ? 'border-red-500' : ''}
                        step="60"
                        min={getMinForCorrectionField('entrada')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T08:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '08:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">
                    Selecione data e hora. Se a data for diferente de {formatDateSimple(date)}, especifique a data correta.
                  </p>
                )}
                {errors.entrada && (
                  <p className="text-sm text-red-500">{errors.entrada.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida">
                  Saída {isCreating ? '*' : ''}
                </Label>
                {isCreating ? (
                  <Input
                    id="saida"
                    type="time"
                    {...register('saida')}
                    className={errors.saida ? 'border-red-500' : ''}
                    placeholder="Obrigatório"
                  />
                ) : (
                  <Controller
                    name="saida"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`saida-${date}`}
                        id="saida"
                        type="datetime-local"
                        value={field.value || `${date}T18:00`}
                        className={errors.saida ? 'border-red-500' : ''}
                        step="60"
                        min={getMinForCorrectionField('saida')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T18:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '18:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">
                    Selecione data e hora. Se a data for diferente de {formatDateSimple(date)}, especifique a data correta.
                  </p>
                )}
                {errors.saida && (
                  <p className="text-sm text-red-500">{errors.saida.message}</p>
                )}
              </div>
            </div>

            {/* Horário de Almoço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_almoco">Início do Almoço</Label>
                {isCreating ? (
                  <Input
                    id="entrada_almoco"
                    type="time"
                    {...register('entrada_almoco')}
                  />
                ) : (
                  <Controller
                    name="entrada_almoco"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`entrada_almoco-${date}`}
                        id="entrada_almoco"
                        type="datetime-local"
                        value={field.value || ''}
                        step="60"
                        min={getMinForCorrectionField('entrada_almoco')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T12:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '12:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">Data e hora</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida_almoco">Fim do Almoço</Label>
                {isCreating ? (
                  <Input
                    id="saida_almoco"
                    type="time"
                    {...register('saida_almoco')}
                  />
                ) : (
                  <Controller
                    name="saida_almoco"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`saida_almoco-${date}`}
                        id="saida_almoco"
                        type="datetime-local"
                        value={field.value || ''}
                        step="60"
                        min={getMinForCorrectionField('saida_almoco')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T13:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '13:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">Data e hora</p>
                )}
              </div>
            </div>

            {/* Horário Extra */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_extra1">Entrada Extra</Label>
                {isCreating ? (
                  <Input
                    id="entrada_extra1"
                    type="time"
                    {...register('entrada_extra1')}
                  />
                ) : (
                  <Controller
                    name="entrada_extra1"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`entrada_extra1-${date}`}
                        id="entrada_extra1"
                        type="datetime-local"
                        value={field.value || ''}
                        step="60"
                        min={getMinForCorrectionField('entrada_extra1')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T18:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '18:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">Data e hora</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saida_extra1">Saída Extra</Label>
                {isCreating ? (
                  <Input
                    id="saida_extra1"
                    type="time"
                    {...register('saida_extra1')}
                  />
                ) : (
                  <Controller
                    name="saida_extra1"
                    control={control}
                    render={({ field }) => (
                      <Input
                        key={`saida_extra1-${date}`}
                        id="saida_extra1"
                        type="datetime-local"
                        value={field.value || ''}
                        step="60"
                        min={getMinForCorrectionField('saida_extra1')}
                        onFocus={(e) => {
                          // Garantir que sempre use a data selecionada, especialmente em smartphones
                          const currentValue = e.target.value;
                          if (!currentValue) {
                            // Se vazio, usar data selecionada com hora padrão
                            const defaultValue = `${date}T20:00`;
                            e.target.value = defaultValue;
                            field.onChange(defaultValue);
                          } else {
                            // Se já tem valor mas a data pode estar errada, garantir que use a data selecionada
                            const [currentDate] = currentValue.split('T');
                            if (currentDate !== date) {
                              const [time] = currentValue.split('T').slice(1);
                              const correctedValue = `${date}T${time || '20:00'}`;
                              e.target.value = correctedValue;
                              field.onChange(correctedValue);
                            }
                          }
                        }}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                )}
                {!isCreating && (
                  <p className="text-xs text-gray-500">Data e hora</p>
                )}
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

            {/* Validação de sequência de horários (correção: ordem cronológica obrigatória) */}
            {!isCreating && !getTimeSequenceValidation().valid && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {getTimeSequenceValidation().message}
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
                  <>
                    {/* Desktop: Radix Select */}
                    <div className="hidden [@media(pointer:fine)]:block">
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue('motivo_id', value, { shouldValidate: true, shouldDirty: true });
                        }}
                        value={field.value || ''}
                      >
                        <SelectTrigger
                          className={errors.motivo_id ? 'border-red-500' : ''}
                        >
                          <SelectValue placeholder="Selecione um motivo" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {delayReasons.map((reason) => (
                            <SelectItem key={reason.id} value={reason.id}>
                              {reason.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Mobile/touch: select nativo - evita travamento do modal em smartphones (Radix Select + Dialog) */}
                    <div className="block [@media(pointer:fine)]:hidden">
                      <select
                        id="motivo_id"
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          setValue('motivo_id', value, { shouldValidate: true, shouldDirty: true });
                        }}
                        onBlur={field.onBlur}
                        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.motivo_id ? 'border-red-500' : ''}`}
                      >
                        <option value="">Selecione um motivo</option>
                        {delayReasons.map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
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
