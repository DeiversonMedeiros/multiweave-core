import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkShift, getShiftTypes, getWeekDays, getScaleTypes, DaySchedule, HorariosPorDia } from '@/integrations/supabase/rh-types';

interface WorkShiftFormProps {
  workShift?: WorkShift | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export const WorkShiftForm = forwardRef<HTMLFormElement, WorkShiftFormProps & { onSubmit?: () => void }>(({ workShift, mode, onSave, isLoading = false, onSubmit }, ref) => {
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    hora_inicio: '',
    hora_fim: '',
    intervalo_inicio: '',
    intervalo_fim: '',
    horas_diarias: 8.0,
    dias_semana: [1, 2, 3, 4, 5],
    tipo_turno: 'normal' as 'normal' | 'noturno' | 'rotativo',
    tipo_escala: 'fixa' as 'fixa' | 'flexivel_6x1' | 'flexivel_5x2' | 'flexivel_4x3' | 'escala_12x36' | 'escala_24x48' | 'personalizada',
    dias_trabalho: 5,
    dias_folga: 2,
    ciclo_dias: 7,
    regras_clt: {},
    template_escala: false,
    tolerancia_entrada: 0,
    tolerancia_saida: 0,
    status: 'ativo' as 'ativo' | 'inativo',
  });

  const [useHorariosPorDia, setUseHorariosPorDia] = useState(false);
  const [horariosPorDia, setHorariosPorDia] = useState<HorariosPorDia>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Expor função de submit via ref
  useImperativeHandle(ref, () => ({
    submit: () => {
      console.log('🔍 [DEBUG] WorkShiftForm - submit chamado via ref');
      handleSubmit();
    }
  }));

  useEffect(() => {
    if (workShift) {
      setFormData({
        nome: workShift.nome,
        codigo: workShift.codigo || '',
        descricao: workShift.descricao || '',
        hora_inicio: workShift.hora_inicio,
        hora_fim: workShift.hora_fim,
        intervalo_inicio: workShift.intervalo_inicio || '',
        intervalo_fim: workShift.intervalo_fim || '',
        horas_diarias: workShift.horas_diarias,
        dias_semana: workShift.dias_semana,
        tipo_turno: workShift.tipo_turno,
        tipo_escala: workShift.tipo_escala,
        dias_trabalho: workShift.dias_trabalho,
        dias_folga: workShift.dias_folga,
        ciclo_dias: workShift.ciclo_dias,
        regras_clt: workShift.regras_clt || {},
        template_escala: workShift.template_escala,
        tolerancia_entrada: workShift.tolerancia_entrada,
        tolerancia_saida: workShift.tolerancia_saida,
        status: workShift.status,
      });
      
      // Verificar se tem horários por dia configurados
      if (workShift.horarios_por_dia && Object.keys(workShift.horarios_por_dia).length > 0) {
        setUseHorariosPorDia(true);
        setHorariosPorDia(workShift.horarios_por_dia);
      } else {
        setUseHorariosPorDia(false);
        setHorariosPorDia({});
      }
    }
  }, [workShift]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDiasSemanaChange = (dia: number, checked: boolean) => {
    const newDias = checked 
      ? [...formData.dias_semana, dia]
      : formData.dias_semana.filter(d => d !== dia);
    
    handleInputChange('dias_semana', newDias);
    
    // Se usar horários por dia, remover horário do dia desmarcado
    if (useHorariosPorDia && !checked) {
      const newHorarios = { ...horariosPorDia };
      delete newHorarios[dia.toString()];
      setHorariosPorDia(newHorarios);
    }
  };

  // Função para calcular horas diárias baseado em horários
  const calculateHorasDiarias = (horaInicio: string, horaFim: string, intervaloInicio?: string, intervaloFim?: string): number => {
    if (!horaInicio || !horaFim) return 0;
    
    const startMinutes = timeToMinutes(horaInicio);
    const endMinutes = timeToMinutes(horaFim);
    let duration = calculateShiftDuration(horaInicio, horaFim);
    
    // Subtrair intervalo de almoço se existir
    if (intervaloInicio && intervaloFim) {
      const intervalDuration = calculateShiftDuration(intervaloInicio, intervaloFim);
      duration -= intervalDuration;
    }
    
    return Math.round((duration / 60) * 10) / 10; // Arredondar para 1 casa decimal
  };

  // Handler para atualizar horário de um dia específico
  const handleDayScheduleChange = (dia: number, field: keyof DaySchedule, value: string | number) => {
    const diaKey = dia.toString();
    const currentSchedule = horariosPorDia[diaKey] || {
      hora_inicio: formData.hora_inicio,
      hora_fim: formData.hora_fim,
      intervalo_inicio: formData.intervalo_inicio || '',
      intervalo_fim: formData.intervalo_fim || '',
      horas_diarias: formData.horas_diarias,
    };
    
    const updatedSchedule = { ...currentSchedule, [field]: value };
    
    // Recalcular horas_diarias se horários mudarem
    if (field === 'hora_inicio' || field === 'hora_fim' || field === 'intervalo_inicio' || field === 'intervalo_fim') {
      updatedSchedule.horas_diarias = calculateHorasDiarias(
        updatedSchedule.hora_inicio,
        updatedSchedule.hora_fim,
        updatedSchedule.intervalo_inicio,
        updatedSchedule.intervalo_fim
      );
    }
    
    setHorariosPorDia({
      ...horariosPorDia,
      [diaKey]: updatedSchedule,
    });
  };

  const handleTipoEscalaChange = (tipo: string) => {
    const scaleType = getScaleTypes().find(st => st.value === tipo);
    if (scaleType && tipo !== 'personalizada') {
      // Configuração automática baseada no tipo
      setFormData(prev => ({
        ...prev,
        tipo_escala: tipo as any,
        dias_trabalho: scaleType.config.dias_trabalho,
        dias_folga: scaleType.config.dias_folga,
        ciclo_dias: scaleType.config.ciclo_dias,
      }));
    } else {
      handleInputChange('tipo_escala', tipo);
    }
  };

  // Função auxiliar para converter hora HH:MM em minutos desde meia-noite
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Função auxiliar para calcular duração do turno considerando cruzamento de meia-noite
  const calculateShiftDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    
    // Se fim é menor que início, o turno cruza a meia-noite
    if (endMinutes <= startMinutes) {
      return (24 * 60) - startMinutes + endMinutes; // Duração cruzando meia-noite
    }
    return endMinutes - startMinutes; // Duração normal
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    // Validação diferente se usar horários por dia
    if (useHorariosPorDia) {
      // Validar cada dia selecionado
      formData.dias_semana.forEach((diaNum) => {
        const diaKey = diaNum.toString();
        const daySchedule = horariosPorDia[diaKey];
        
        if (!daySchedule) {
          newErrors[`horario_dia_${diaNum}`] = `Configure os horários para ${getWeekDays().find(d => d.value === diaNum)?.label}`;
          return;
        }
        
        if (!daySchedule.hora_inicio) {
          newErrors[`hora_inicio_${diaNum}`] = 'Hora de início é obrigatória';
        }
        
        if (!daySchedule.hora_fim) {
          newErrors[`hora_fim_${diaNum}`] = 'Hora de fim é obrigatória';
        }
        
        // Validar horários do dia
        if (daySchedule.hora_inicio && daySchedule.hora_fim) {
          const startMinutes = timeToMinutes(daySchedule.hora_inicio);
          const endMinutes = timeToMinutes(daySchedule.hora_fim);
          
          if (startMinutes === endMinutes) {
            newErrors[`hora_fim_${diaNum}`] = 'Hora de fim deve ser diferente da hora de início';
          } else {
            const duration = calculateShiftDuration(daySchedule.hora_inicio, daySchedule.hora_fim);
            
            if (duration <= 0) {
              newErrors[`hora_fim_${diaNum}`] = 'Duração do turno deve ser maior que zero';
            } else if (duration > 24 * 60) {
              newErrors[`hora_fim_${diaNum}`] = 'Duração do turno não pode exceder 24 horas';
            }
          }
        }
        
        // Validar intervalo do dia
        if (daySchedule.intervalo_inicio && daySchedule.intervalo_fim) {
          const intervalDuration = calculateShiftDuration(daySchedule.intervalo_inicio, daySchedule.intervalo_fim);
          
          if (intervalDuration <= 0) {
            newErrors[`intervalo_fim_${diaNum}`] = 'Duração do intervalo deve ser maior que zero';
          } else if (intervalDuration > 8 * 60) {
            newErrors[`intervalo_fim_${diaNum}`] = 'Duração do intervalo não pode exceder 8 horas';
          }
        }
      });
    } else {
      // Validação padrão (horários únicos)
      if (!formData.hora_inicio) {
        newErrors.hora_inicio = 'Hora de início é obrigatória';
      }

      if (!formData.hora_fim) {
        newErrors.hora_fim = 'Hora de fim é obrigatória';
      }

      // Validação de horários permitindo cruzamento de meia-noite
      if (formData.hora_inicio && formData.hora_fim) {
        const startMinutes = timeToMinutes(formData.hora_inicio);
        const endMinutes = timeToMinutes(formData.hora_fim);
        
        // Não permitir que sejam iguais (turno de 0 horas)
        if (startMinutes === endMinutes) {
          newErrors.hora_fim = 'Hora de fim deve ser diferente da hora de início';
        } else {
          // Calcular duração considerando possível cruzamento de meia-noite
          const duration = calculateShiftDuration(formData.hora_inicio, formData.hora_fim);
          
          // Validar que a duração seja razoável (máximo 24 horas, mínimo 1 minuto)
          if (duration <= 0) {
            newErrors.hora_fim = 'Duração do turno deve ser maior que zero';
          } else if (duration > 24 * 60) {
            newErrors.hora_fim = 'Duração do turno não pode exceder 24 horas';
          }
        }
      }

      // Validação de intervalo considerando cruzamento de meia-noite
      if (formData.intervalo_inicio && formData.intervalo_fim) {
        const intervalStartMinutes = timeToMinutes(formData.intervalo_inicio);
        const intervalEndMinutes = timeToMinutes(formData.intervalo_fim);
        
        // Não permitir que sejam iguais
        if (intervalStartMinutes === intervalEndMinutes) {
          newErrors.intervalo_fim = 'Fim do intervalo deve ser diferente do início';
        } else {
          // Calcular duração considerando possível cruzamento de meia-noite
          const intervalDuration = calculateShiftDuration(formData.intervalo_inicio, formData.intervalo_fim);
          
          // Validar que a duração seja razoável (máximo 8 horas de intervalo)
          if (intervalDuration <= 0) {
            newErrors.intervalo_fim = 'Duração do intervalo deve ser maior que zero';
          } else if (intervalDuration > 8 * 60) {
            newErrors.intervalo_fim = 'Duração do intervalo não pode exceder 8 horas';
          }
        }
      }
    }

    if (formData.dias_semana.length === 0) {
      newErrors.dias_semana = 'Selecione pelo menos um dia da semana';
    }

    // Validações CLT
    if (formData.dias_trabalho > 6) {
      newErrors.dias_trabalho = 'Máximo 6 dias consecutivos de trabalho (CLT)';
    }

    if (formData.dias_trabalho < 1) {
      newErrors.dias_trabalho = 'Mínimo 1 dia de trabalho';
    }

    if (formData.dias_folga < 1) {
      newErrors.dias_folga = 'Mínimo 1 dia de folga por semana (CLT)';
    }

    if (formData.ciclo_dias < (formData.dias_trabalho + formData.dias_folga)) {
      newErrors.ciclo_dias = 'Ciclo deve ser maior ou igual à soma de dias de trabalho e folga';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    // Só chama preventDefault se houver um evento (chamada via formulário)
    if (e) {
      e.preventDefault();
    }
    
    console.log('🔍 [DEBUG] WorkShiftForm - handleSubmit chamado');
    console.log('🔍 [DEBUG] WorkShiftForm - formData atual:', formData);
    console.log('🔍 [DEBUG] WorkShiftForm - validateForm():', validateForm());
    
    if (validateForm()) {
      console.log('🔍 [DEBUG] WorkShiftForm - Enviando dados para onSave:', formData);
      
      // Preparar dados finais
      const finalData = { ...formData };
      
      // Se usar horários por dia, incluir no payload
      if (useHorariosPorDia && Object.keys(horariosPorDia).length > 0) {
        finalData.horarios_por_dia = horariosPorDia;
      } else {
        finalData.horarios_por_dia = undefined;
      }
      
      onSave(finalData);
    } else {
      console.log('🔍 [DEBUG] WorkShiftForm - Validação falhou, não enviando dados');
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                disabled={isReadOnly}
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                disabled={isReadOnly}
                placeholder="Ex: TURNO_01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={isReadOnly}
              placeholder="Descrição do turno de trabalho"
            />
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader>
          <CardTitle>Horários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opção para usar horários diferentes por dia */}
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Checkbox
              id="use_horarios_por_dia"
              checked={useHorariosPorDia}
              onCheckedChange={(checked) => {
                const newValue = checked as boolean;
                setUseHorariosPorDia(newValue);
                
                if (newValue) {
                  // Inicializar horários por dia com valores padrão para cada dia selecionado
                  const initialHorarios: HorariosPorDia = {};
                  formData.dias_semana.forEach((diaNum) => {
                    initialHorarios[diaNum.toString()] = {
                      hora_inicio: formData.hora_inicio || '08:00',
                      hora_fim: formData.hora_fim || '18:00',
                      intervalo_inicio: formData.intervalo_inicio || '',
                      intervalo_fim: formData.intervalo_fim || '',
                      horas_diarias: calculateHorasDiarias(
                        formData.hora_inicio || '08:00',
                        formData.hora_fim || '18:00',
                        formData.intervalo_inicio,
                        formData.intervalo_fim
                      ),
                    };
                  });
                  setHorariosPorDia(initialHorarios);
                } else {
                  setHorariosPorDia({});
                }
              }}
              disabled={isReadOnly}
            />
            <Label htmlFor="use_horarios_por_dia" className="cursor-pointer">
              Configurar horários diferentes por dia da semana
            </Label>
          </div>

          {!useHorariosPorDia ? (
            /* Horários Padrão (todos os dias iguais) */
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora de Início *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => handleInputChange('hora_inicio', e.target.value)}
                    disabled={isReadOnly}
                    className={errors.hora_inicio ? 'border-red-500' : ''}
                  />
                  {errors.hora_inicio && <p className="text-sm text-red-500">{errors.hora_inicio}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hora_fim">Hora de Fim *</Label>
                  <Input
                    id="hora_fim"
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => handleInputChange('hora_fim', e.target.value)}
                    disabled={isReadOnly}
                    className={errors.hora_fim ? 'border-red-500' : ''}
                  />
                  {errors.hora_fim && <p className="text-sm text-red-500">{errors.hora_fim}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="intervalo_inicio">Início do Intervalo</Label>
                  <Input
                    id="intervalo_inicio"
                    type="time"
                    value={formData.intervalo_inicio}
                    onChange={(e) => handleInputChange('intervalo_inicio', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervalo_fim">Fim do Intervalo</Label>
                  <Input
                    id="intervalo_fim"
                    type="time"
                    value={formData.intervalo_fim}
                    onChange={(e) => handleInputChange('intervalo_fim', e.target.value)}
                    disabled={isReadOnly}
                    className={errors.intervalo_fim ? 'border-red-500' : ''}
                  />
                  {errors.intervalo_fim && <p className="text-sm text-red-500">{errors.intervalo_fim}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas_diarias">Horas Diárias</Label>
                <Input
                  id="horas_diarias"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.horas_diarias}
                  onChange={(e) => handleInputChange('horas_diarias', parseFloat(e.target.value))}
                  disabled={isReadOnly}
                />
              </div>
            </>
          ) : (
            /* Horários por Dia da Semana */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure os horários para cada dia da semana selecionado. Os horários serão aplicados apenas aos dias marcados.
              </p>
              {formData.dias_semana.map((diaNum) => {
                const diaKey = diaNum.toString();
                const diaInfo = getWeekDays().find(d => d.value === diaNum);
                const daySchedule = horariosPorDia[diaKey] || {
                  hora_inicio: formData.hora_inicio || '08:00',
                  hora_fim: formData.hora_fim || '18:00',
                  intervalo_inicio: formData.intervalo_inicio || '',
                  intervalo_fim: formData.intervalo_fim || '',
                  horas_diarias: formData.horas_diarias || 8.0,
                };
                
                return (
                  <Card key={diaNum} className="p-4">
                    <CardHeader className="p-0 pb-3">
                      <CardTitle className="text-base">{diaInfo?.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`hora_inicio_${diaNum}`}>Hora de Início *</Label>
                          <Input
                            id={`hora_inicio_${diaNum}`}
                            type="time"
                            value={daySchedule.hora_inicio}
                            onChange={(e) => handleDayScheduleChange(diaNum, 'hora_inicio', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`hora_fim_${diaNum}`}>Hora de Fim *</Label>
                          <Input
                            id={`hora_fim_${diaNum}`}
                            type="time"
                            value={daySchedule.hora_fim}
                            onChange={(e) => handleDayScheduleChange(diaNum, 'hora_fim', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`intervalo_inicio_${diaNum}`}>Início do Intervalo</Label>
                          <Input
                            id={`intervalo_inicio_${diaNum}`}
                            type="time"
                            value={daySchedule.intervalo_inicio || ''}
                            onChange={(e) => handleDayScheduleChange(diaNum, 'intervalo_inicio', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`intervalo_fim_${diaNum}`}>Fim do Intervalo</Label>
                          <Input
                            id={`intervalo_fim_${diaNum}`}
                            type="time"
                            value={daySchedule.intervalo_fim || ''}
                            onChange={(e) => handleDayScheduleChange(diaNum, 'intervalo_fim', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`horas_diarias_${diaNum}`}>Horas Diárias (calculado automaticamente)</Label>
                        <Input
                          id={`horas_diarias_${diaNum}`}
                          type="number"
                          step="0.1"
                          min="0"
                          max="24"
                          value={daySchedule.horas_diarias}
                          onChange={(e) => handleDayScheduleChange(diaNum, 'horas_diarias', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium">
                  Total Semanal: {Object.values(horariosPorDia).reduce((sum, day) => sum + (day.horas_diarias || 0), 0).toFixed(1)} horas
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dias da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Dias da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {getWeekDays().map((dia) => (
              <div key={dia.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`dia-${dia.value}`}
                  checked={formData.dias_semana.includes(dia.value)}
                  onCheckedChange={(checked) => handleDiasSemanaChange(dia.value, checked as boolean)}
                  disabled={isReadOnly}
                />
                <Label htmlFor={`dia-${dia.value}`}>{dia.label}</Label>
              </div>
            ))}
          </div>
          {errors.dias_semana && <p className="text-sm text-red-500 mt-2">{errors.dias_semana}</p>}
        </CardContent>
      </Card>

      {/* Configurações CLT */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações CLT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_escala">Tipo de Escala</Label>
              <Select
                value={formData.tipo_escala}
                onValueChange={handleTipoEscalaChange}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getScaleTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div>
                        <div className="font-medium">{tipo.label}</div>
                        <div className="text-sm text-muted-foreground">{tipo.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_escala">Template de Escala</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="template_escala"
                  checked={formData.template_escala}
                  onCheckedChange={(checked) => handleInputChange('template_escala', checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="template_escala">Usar como template</Label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dias_trabalho">Dias de Trabalho</Label>
              <Input
                id="dias_trabalho"
                type="number"
                min="1"
                max="6"
                value={formData.dias_trabalho}
                onChange={(e) => handleInputChange('dias_trabalho', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.dias_trabalho ? 'border-red-500' : ''}
              />
              {errors.dias_trabalho && <p className="text-sm text-red-500">{errors.dias_trabalho}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_folga">Dias de Folga</Label>
              <Input
                id="dias_folga"
                type="number"
                min="1"
                value={formData.dias_folga}
                onChange={(e) => handleInputChange('dias_folga', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.dias_folga ? 'border-red-500' : ''}
              />
              {errors.dias_folga && <p className="text-sm text-red-500">{errors.dias_folga}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciclo_dias">Ciclo Total (dias)</Label>
              <Input
                id="ciclo_dias"
                type="number"
                min="1"
                value={formData.ciclo_dias}
                onChange={(e) => handleInputChange('ciclo_dias', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.ciclo_dias ? 'border-red-500' : ''}
              />
              {errors.ciclo_dias && <p className="text-sm text-red-500">{errors.ciclo_dias}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tipo_turno">Tipo de Turno</Label>
              <Select
                value={formData.tipo_turno}
                onValueChange={(value) => handleInputChange('tipo_turno', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getShiftTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerancia_entrada">Tolerância Entrada (min)</Label>
              <Input
                id="tolerancia_entrada"
                type="number"
                min="0"
                value={formData.tolerancia_entrada}
                onChange={(e) => handleInputChange('tolerancia_entrada', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerancia_saida">Tolerância Saída (min)</Label>
              <Input
                id="tolerancia_saida"
                type="number"
                min="0"
                value={formData.tolerancia_saida}
                onChange={(e) => handleInputChange('tolerancia_saida', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Botões - Removidos pois o modal gerencia os botões */}
    </form>
  );
});

WorkShiftForm.displayName = 'WorkShiftForm';

