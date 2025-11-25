import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Info
} from 'lucide-react';
import { 
  validateFractionedVacation, 
  vacationRules,
  calculateDaysBetween,
  type FractionedVacationData,
  type VacationPeriod
} from '@/lib/vacationValidation';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';

// Schema de validação
const vacationPeriodSchema = z.object({
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'), // Calculada automaticamente, mas necessária para validação
  diasFerias: z.number().min(1, 'Mínimo 1 dia').max(30, 'Máximo 30 dias'),
  diasAbono: z.number().min(0, 'Mínimo 0 dias').max(10, 'Máximo 10 dias'),
  observacoes: z.string().optional(),
}).refine((data) => {
  // Validar que a soma de dias de férias e dias de abono não exceda 30
  return (data.diasFerias + data.diasAbono) <= 30;
}, {
  message: 'A soma de dias de férias e dias de abono não pode exceder 30 dias',
  path: ['diasAbono'],
});

const fractionedVacationSchema = z.object({
  ano: z.number().min(2000, 'Ano inválido').max(2100, 'Ano inválido'),
  periodos: z.array(vacationPeriodSchema).min(1, 'Pelo menos um período é obrigatório').max(3, 'Máximo 3 períodos'),
  observacoes: z.string().optional(),
});

type FractionedVacationFormData = z.infer<typeof fractionedVacationSchema>;

interface FractionedVacationFormProps {
  onSubmit: (data: FractionedVacationFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  companyId: string;
  employeeId: string;
  availableYears?: Array<{
    ano: number;
    dias_disponiveis: number;
    dias_gozados: number;
    dias_restantes: number;
    status: string;
    data_fim_periodo?: string;
  }>;
}

export function FractionedVacationForm({
  onSubmit,
  onCancel,
  isLoading = false,
  companyId,
  employeeId,
  availableYears = []
}: FractionedVacationFormProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FractionedVacationFormData>({
    resolver: zodResolver(fractionedVacationSchema),
    defaultValues: {
      ano: new Date().getFullYear(),
      periodos: [
        {
          dataInicio: '',
          dataFim: '',
          diasFerias: 0,
          diasAbono: 0,
          observacoes: ''
        }
      ],
      observacoes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'periodos'
  });

  const watchedPeriods = watch('periodos');
  const watchedAno = watch('ano');
  
  // Calcular data mínima permitida baseada no ano selecionado
  const selectedYearData = availableYears.find(year => year.ano === watchedAno);
  const dataFimPeriodo = selectedYearData?.data_fim_periodo;
  const periodoStatus = selectedYearData?.status;
  
  // Só aplicar restrição de data mínima se o período ainda está em andamento (status = 'pendente')
  // Se o período já está completo (status = 'ativo' ou 'vencido'), pode solicitar a qualquer momento
  const minStartDate = (dataFimPeriodo && periodoStatus === 'pendente')
    ? new Date(new Date(dataFimPeriodo).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined;

  // Buscar férias já aprovadas para o período aquisitivo
  // Usar dias_gozados do período aquisitivo para determinar se há férias aprovadas
  // Se dias_gozados > 0, significa que há férias aprovadas
  const hasApprovedVacations = (selectedYearData?.dias_gozados || 0) > 0;
  
  // Buscar detalhes das férias aprovadas (para validação de 14 dias)
  const { data: approvedVacations } = useQuery({
    queryKey: ['approved-vacations-details', employeeId, watchedAno, companyId],
    queryFn: async () => {
      if (!employeeId || !watchedAno || !companyId || !hasApprovedVacations) return [];
      
      // Buscar férias aprovadas e seus períodos
      const vacationsResult = await EntityService.list({
        schema: 'rh',
        table: 'vacations',
        companyId,
        filters: {
          employee_id: employeeId,
          status: 'aprovado'
        },
        orderBy: 'data_inicio',
        orderDirection: 'ASC'
      });

      // Para cada férias aprovada, buscar seus períodos
      const vacationsWithPeriods = await Promise.all(
        vacationsResult.data.map(async (v: any) => {
          try {
            const periodsResult = await EntityService.list({
              schema: 'rh',
              table: 'vacation_periods',
              companyId,
              filters: {
                vacation_id: v.id
              }
            });
            return periodsResult.data.map((p: any) => ({
              diasFerias: p.dias_ferias || 0
            }));
          } catch (error) {
            console.error('Erro ao buscar períodos da férias:', error);
            // Se não conseguir buscar períodos, usar dias_solicitados da férias
            return [{
              diasFerias: v.dias_solicitados || 0
            }];
          }
        })
      );

      // Flatten array de períodos
      return vacationsWithPeriods.flat();
    },
    enabled: !!employeeId && !!watchedAno && !!companyId && hasApprovedVacations
  });

  // Calcular data de fim automaticamente quando data de início ou dias de férias mudarem
  useEffect(() => {
    if (!watchedPeriods || watchedPeriods.length === 0) return;

    watchedPeriods.forEach((periodo, index) => {
      if (periodo?.dataInicio && periodo?.diasFerias && periodo.diasFerias > 0) {
        try {
          const start = new Date(periodo.dataInicio);
          if (isNaN(start.getTime())) return;
          
          const end = new Date(start);
          // diasFerias - 1 porque o dia inicial conta como 1 dia
          end.setDate(end.getDate() + (periodo.diasFerias - 1));
          
          // Formatar a data no formato YYYY-MM-DD
          const formattedEndDate = end.toISOString().split('T')[0];
          const currentEndDate = periodo.dataFim || '';
          
          // Só atualizar se a data calculada for diferente da atual
          if (currentEndDate !== formattedEndDate) {
            setValue(`periodos.${index}.dataFim`, formattedEndDate, { shouldValidate: false, shouldDirty: false });
          }
        } catch (error) {
          console.error('Erro ao calcular data de fim:', error);
        }
      } else if (!periodo?.dataInicio || !periodo?.diasFerias || periodo.diasFerias === 0) {
        if (periodo?.dataFim) {
          setValue(`periodos.${index}.dataFim`, '', { shouldValidate: false, shouldDirty: false });
        }
      }
    });
  }, [watchedPeriods, setValue]);

  // Validar em tempo real
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.periodos && value.ano) {
        const formData: FractionedVacationData = {
          ano: value.ano || new Date().getFullYear(),
          periodos: value.periodos.map(p => ({
            dataInicio: p.dataInicio || '',
            dataFim: p.dataFim || '',
            diasFerias: p.diasFerias || 0,
            diasAbono: p.diasAbono || 0,
            observacoes: p.observacoes || ''
          })),
          observacoes: value.observacoes || ''
        };

        // Preparar dados de férias aprovadas para validação
        const approvedVacationsData = approvedVacations?.map((v: any) => ({
          diasFerias: v.dias_solicitados || 0
        })) || [];

        const formDataWithApproved: FractionedVacationData = {
          ...formData,
          approvedVacations: approvedVacationsData
        };

        const result = validateFractionedVacation(formDataWithApproved);
        
        // Adicionar validação de data mínima (após término do período aquisitivo)
        // Só aplicar se o período ainda está em andamento (status = 'pendente')
        if (dataFimPeriodo && periodoStatus === 'pendente' && formData.periodos.length > 0) {
          const fimPeriodo = new Date(dataFimPeriodo);
          const dataMinima = new Date(fimPeriodo);
          dataMinima.setDate(dataMinima.getDate() + 1); // +1 dia após o término do período
          
          formData.periodos.forEach((periodo, idx) => {
            if (periodo.dataInicio) {
              const inicioFerias = new Date(periodo.dataInicio);
              if (inicioFerias <= fimPeriodo) {
                result.isValid = false;
                result.errors.push(
                  `Período ${idx + 1}: A data de início das férias deve ser após o término do período aquisitivo. Período termina em ${fimPeriodo.toLocaleDateString('pt-BR')}, férias podem começar a partir de ${dataMinima.toLocaleDateString('pt-BR')}.`
                );
              }
            }
          });
        }
        
        setValidationResult(result);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, approvedVacations, dataFimPeriodo, periodoStatus]);

  const addPeriod = () => {
    if (fields.length < vacationRules.maxPeriods) {
      append({
        dataInicio: '',
        dataFim: '',
        diasFerias: 0,
        diasAbono: 0,
        observacoes: ''
      });
    }
  };

  const removePeriod = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const getAvailableDays = () => {
    const yearData = availableYears.find(y => y.ano === watchedAno);
    return yearData?.dias_restantes || 0;
  };

  const getTotalDays = () => {
    return watchedPeriods.reduce((total, periodo) => total + (periodo.diasFerias || 0), 0);
  };

  const getTotalAbono = () => {
    return watchedPeriods.reduce((total, periodo) => total + (periodo.diasAbono || 0), 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Férias Fracionadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Ano de Referência */}
            <div className="grid gap-2">
              <Label htmlFor="ano">Ano de Referência</Label>
              <select
                {...register('ano', { valueAsNumber: true })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {availableYears.map(year => (
                  <option key={year.ano} value={year.ano}>
                    {year.ano} - {year.dias_restantes} dias disponíveis
                  </option>
                ))}
              </select>
              {errors.ano && (
                <p className="text-sm text-red-600">{errors.ano.message}</p>
              )}
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getAvailableDays()}</div>
                <div className="text-sm text-gray-600">Dias Disponíveis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getTotalDays()}</div>
                <div className="text-sm text-gray-600">Dias Solicitados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{getTotalAbono()}</div>
                <div className="text-sm text-gray-600">Dias de Abono</div>
              </div>
            </div>

            {/* Períodos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Períodos de Férias</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPeriod}
                  disabled={fields.length >= vacationRules.maxPeriods}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Período
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Período {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePeriod(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.dataInicio`}>Data de Início</Label>
                      <Input
                        type="date"
                        {...register(`periodos.${index}.dataInicio`)}
                        min={minStartDate}
                        onChange={(e) => {
                          register(`periodos.${index}.dataInicio`).onChange(e);
                          // Calcular data de fim quando data de início mudar
                          const dataInicio = e.target.value;
                          const diasFerias = watch(`periodos.${index}.diasFerias`) || 0;
                          if (dataInicio && diasFerias > 0) {
                            const start = new Date(dataInicio);
                            const end = new Date(start);
                            end.setDate(end.getDate() + (diasFerias - 1));
                            const formattedEndDate = end.toISOString().split('T')[0];
                            setValue(`periodos.${index}.dataFim`, formattedEndDate, { shouldValidate: false });
                          }
                        }}
                      />
                      {dataFimPeriodo && periodoStatus === 'pendente' && (
                        <p className="text-xs text-gray-500">
                          Período aquisitivo termina em {new Date(dataFimPeriodo).toLocaleDateString('pt-BR')}. 
                          Férias podem começar a partir de {minStartDate ? new Date(minStartDate).toLocaleDateString('pt-BR') : ''}.
                        </p>
                      )}
                      {periodoStatus && periodoStatus !== 'pendente' && (
                        <p className="text-xs text-green-600">
                          Período aquisitivo completo. Você pode solicitar férias a qualquer momento.
                        </p>
                      )}
                      {errors.periodos?.[index]?.dataInicio && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.dataInicio?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.diasFerias`}>Dias de Férias</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        {...register(`periodos.${index}.diasFerias`, { 
                          valueAsNumber: true,
                          validate: (value) => {
                            if (value < 1) return 'Mínimo 1 dia';
                            if (value > 30) return 'Máximo 30 dias';
                            return true;
                          }
                        })}
                        onChange={(e) => {
                          let diasFerias = parseInt(e.target.value) || 0;
                          
                          // Limitar a 30 dias
                          if (diasFerias > 30) {
                            diasFerias = 30;
                            e.target.value = '30';
                          }
                          
                          register(`periodos.${index}.diasFerias`, { valueAsNumber: true }).onChange(e);
                          
                          // Ajustar dias de abono se a soma exceder 30
                          const diasAbonoAtual = watch(`periodos.${index}.diasAbono`) || 0;
                          const maxAbono = Math.max(0, 30 - diasFerias);
                          if (diasAbonoAtual > maxAbono) {
                            setValue(`periodos.${index}.diasAbono`, maxAbono, { shouldValidate: true });
                          }
                          
                          // Calcular data de fim quando dias de férias mudarem
                          const dataInicio = watch(`periodos.${index}.dataInicio`) || '';
                          if (dataInicio && diasFerias > 0) {
                            const start = new Date(dataInicio);
                            const end = new Date(start);
                            end.setDate(end.getDate() + (diasFerias - 1));
                            const formattedEndDate = end.toISOString().split('T')[0];
                            setValue(`periodos.${index}.diasFerias`, diasFerias, { shouldValidate: true });
                            setValue(`periodos.${index}.dataFim`, formattedEndDate, { shouldValidate: false });
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value > 30) {
                            setValue(`periodos.${index}.diasFerias`, 30, { shouldValidate: true });
                            const dataInicio = watch(`periodos.${index}.dataInicio`) || '';
                            if (dataInicio) {
                              const start = new Date(dataInicio);
                              const end = new Date(start);
                              end.setDate(end.getDate() + 29);
                              const formattedEndDate = end.toISOString().split('T')[0];
                              setValue(`periodos.${index}.dataFim`, formattedEndDate, { shouldValidate: false });
                            }
                          }
                        }}
                      />
                      {errors.periodos?.[index]?.diasFerias && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.diasFerias?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.dataFim`}>Data de Fim</Label>
                      <Input
                        type="date"
                        {...register(`periodos.${index}.dataFim`)}
                        readOnly
                        className="bg-gray-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500">
                        Calculada automaticamente
                      </p>
                      {errors.periodos?.[index]?.dataFim && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.dataFim?.message}
                        </p>
                      )}
                    </div>

                    {(() => {
                      const diasFerias = watch(`periodos.${index}.diasFerias`) || 0;
                      const maxAbono = Math.max(0, Math.min(10, 30 - diasFerias));
                      
                      return (
                        <div className="grid gap-2">
                          <Label htmlFor={`periodos.${index}.diasAbono`}>
                            Dias de Abono
                            {diasFerias > 0 && (
                              <span className="text-xs text-gray-500 font-normal ml-2">
                                (máx. {maxAbono} dias)
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max={maxAbono}
                            {...register(`periodos.${index}.diasAbono`, { 
                              valueAsNumber: true,
                              validate: (value) => {
                                const diasFeriasAtual = watch(`periodos.${index}.diasFerias`) || 0;
                                const maxAbonoAtual = Math.max(0, Math.min(10, 30 - diasFeriasAtual));
                                if (value < 0) return 'Mínimo 0 dias';
                                if (value > maxAbonoAtual) return `Máximo ${maxAbonoAtual} dias de abono (total com férias não pode exceder 30 dias)`;
                                if ((diasFeriasAtual + value) > 30) return 'A soma de dias de férias e dias de abono não pode exceder 30 dias';
                                return true;
                              }
                            })}
                            onChange={(e) => {
                              const diasAbono = parseInt(e.target.value) || 0;
                              const diasFeriasAtual = watch(`periodos.${index}.diasFerias`) || 0;
                              const maxAbonoAtual = Math.max(0, Math.min(10, 30 - diasFeriasAtual));
                              
                              let valorFinal = diasAbono;
                              
                              // Limitar ao máximo permitido
                              if (diasAbono > maxAbonoAtual) {
                                valorFinal = maxAbonoAtual;
                                e.target.value = maxAbonoAtual.toString();
                              }
                              
                              // Garantir que a soma não exceda 30
                              if ((diasFeriasAtual + valorFinal) > 30) {
                                valorFinal = Math.max(0, 30 - diasFeriasAtual);
                                e.target.value = valorFinal.toString();
                              }
                              
                              register(`periodos.${index}.diasAbono`, { valueAsNumber: true }).onChange(e);
                              setValue(`periodos.${index}.diasAbono`, valorFinal, { shouldValidate: true });
                            }}
                            onBlur={(e) => {
                              const diasAbono = parseInt(e.target.value) || 0;
                              const diasFeriasAtual = watch(`periodos.${index}.diasFerias`) || 0;
                              const maxAbonoAtual = Math.max(0, Math.min(10, 30 - diasFeriasAtual));
                              
                              if (diasAbono > maxAbonoAtual || (diasFeriasAtual + diasAbono) > 30) {
                                const valorFinal = Math.max(0, Math.min(maxAbonoAtual, 30 - diasFeriasAtual));
                                setValue(`periodos.${index}.diasAbono`, valorFinal, { shouldValidate: true });
                              }
                            }}
                          />
                          {errors.periodos?.[index]?.diasAbono && (
                            <p className="text-sm text-red-600">
                              {errors.periodos[index]?.diasAbono?.message}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="md:col-span-2 grid gap-2">
                      <Label htmlFor={`periodos.${index}.observacoes`}>Observações</Label>
                      <Textarea
                        {...register(`periodos.${index}.observacoes`)}
                        placeholder="Observações específicas do período (opcional)"
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Observações Gerais */}
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações Gerais</Label>
              <Textarea
                {...register('observacoes')}
                placeholder="Observações gerais sobre a solicitação de férias (opcional)"
                rows={3}
              />
            </div>

            {/* Validação */}
            {validationResult && (
              <div className="space-y-2">
                {validationResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.warnings.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.isValid && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Solicitação válida! Todos os requisitos foram atendidos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Regras */}
            <Card className="p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">Regras de Férias Fracionadas</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Máximo de {vacationRules.maxPeriods} períodos</li>
                <li>• Pelo menos um período deve ter {vacationRules.minOnePeriodDays} ou mais dias</li>
                <li>• Demais períodos devem ter no mínimo {vacationRules.minPeriodDays} dias</li>
                <li>• Total não pode exceder {vacationRules.maxTotalDays} dias</li>
                <li>• Máximo de {vacationRules.maxAbonoDays} dias de abono pecuniário</li>
              </ul>
            </Card>

            {/* Botões */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!validationResult?.isValid || isLoading}
              >
                {isLoading ? 'Enviando...' : 'Solicitar Férias'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
