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

// Schema de validação
const vacationPeriodSchema = z.object({
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'),
  diasFerias: z.number().min(1, 'Mínimo 1 dia').max(30, 'Máximo 30 dias'),
  diasAbono: z.number().min(0, 'Mínimo 0 dias').max(10, 'Máximo 10 dias'),
  observacoes: z.string().optional(),
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

        const result = validateFractionedVacation(formData);
        setValidationResult(result);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  // Calcular dias automaticamente quando as datas mudam
  const handleDateChange = (index: number, field: 'dataInicio' | 'dataFim', value: string) => {
    setValue(`periodos.${index}.${field}`, value);
    
    const periodo = watchedPeriods[index];
    if (periodo && periodo.dataInicio && periodo.dataFim) {
      const dias = calculateDaysBetween(periodo.dataInicio, periodo.dataFim);
      setValue(`periodos.${index}.diasFerias`, dias);
    }
  };

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
                        onChange={(e) => handleDateChange(index, 'dataInicio', e.target.value)}
                      />
                      {errors.periodos?.[index]?.dataInicio && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.dataInicio?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.dataFim`}>Data de Fim</Label>
                      <Input
                        type="date"
                        {...register(`periodos.${index}.dataFim`)}
                        onChange={(e) => handleDateChange(index, 'dataFim', e.target.value)}
                      />
                      {errors.periodos?.[index]?.dataFim && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.dataFim?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.diasFerias`}>Dias de Férias</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        {...register(`periodos.${index}.diasFerias`, { valueAsNumber: true })}
                      />
                      {errors.periodos?.[index]?.diasFerias && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.diasFerias?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`periodos.${index}.diasAbono`}>Dias de Abono</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        {...register(`periodos.${index}.diasAbono`, { valueAsNumber: true })}
                      />
                      {errors.periodos?.[index]?.diasAbono && (
                        <p className="text-sm text-red-600">
                          {errors.periodos[index]?.diasAbono?.message}
                        </p>
                      )}
                    </div>

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
