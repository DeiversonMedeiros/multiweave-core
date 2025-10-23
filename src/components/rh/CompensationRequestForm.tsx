import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { compensationRequestValidationSchema, CompensationRequestFormData } from '@/lib/validations/compensation-validations';
import { useValidateCompensationRequest } from '@/hooks/rh/useCompensationRequests';
import { CompensationValidationService } from '@/services/rh/compensationValidationService';
import { useToast } from '@/hooks/use-toast';

interface CompensationRequestFormProps {
  onSubmit: (data: CompensationRequestFormData) => void;
  onCancel: () => void;
  initialData?: Partial<CompensationRequestFormData>;
  employeeId?: string;
  companyId?: string;
  isLoading?: boolean;
}

export function CompensationRequestForm({
  onSubmit,
  onCancel,
  initialData,
  employeeId,
  companyId,
  isLoading = false
}: CompensationRequestFormProps) {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string; warnings?: string[] } | null>(null);

  const form = useForm<CompensationRequestFormData>({
    resolver: zodResolver(compensationRequestValidationSchema),
    defaultValues: {
      employee_id: employeeId || '',
      tipo: 'banco_horas',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
      quantidade_horas: 0,
      descricao: '',
      status: 'pendente',
      company_id: companyId || '',
      ...initialData
    }
  });

  const watchedTipo = form.watch('tipo');
  const watchedHoras = form.watch('quantidade_horas');
  const watchedEmployeeId = form.watch('employee_id');

  // Buscar saldo do banco de horas quando necessário
  useEffect(() => {
    if (watchedTipo === 'banco_horas' && watchedEmployeeId && companyId) {
      CompensationValidationService.getEmployeeBalance(watchedEmployeeId, companyId)
        .then(result => {
          if (result.isValid && result.balance !== undefined) {
            setBalance(result.balance);
          }
        })
        .catch(error => {
          console.error('Erro ao buscar saldo:', error);
        });
    }
  }, [watchedTipo, watchedEmployeeId, companyId]);

  // Validação em tempo real
  useEffect(() => {
    if (watchedEmployeeId && watchedHoras > 0 && companyId) {
      setIsValidating(true);
      
      CompensationValidationService.validateCompensationRequest(
        watchedEmployeeId,
        companyId,
        watchedHoras,
        form.getValues('data_inicio'),
        watchedTipo
      ).then(result => {
        setValidationResult(result);
        setIsValidating(false);
      }).catch(() => {
        setIsValidating(false);
      });
    }
  }, [watchedEmployeeId, watchedHoras, watchedTipo, companyId]);

  const handleSubmit = async (data: CompensationRequestFormData) => {
    try {
      // Validação final
      if (companyId) {
        const validation = await CompensationValidationService.validateCompensationRequest(
          data.employee_id,
          companyId,
          data.quantidade_horas,
          data.data_inicio,
          data.tipo
        );

        if (!validation.isValid) {
          toast({
            title: "Erro de validação",
            description: validation.error,
            variant: "destructive"
          });
          return;
        }
      }

      onSubmit(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive"
      });
    }
  };

  const isInsufficientBalance = balance !== null && watchedHoras > balance;
  const isOverLimit = watchedHoras > 8;
  const isUnderMinimum = watchedHoras < 0.5;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Solicitação de Compensação
        </CardTitle>
        <CardDescription>
          Preencha os dados para solicitar compensação de horas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Tipo de Compensação */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Compensação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="banco_horas">Banco de Horas</SelectItem>
                      <SelectItem value="horas_extras">Horas Extras</SelectItem>
                      <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                      <SelectItem value="adicional_periculosidade">Adicional Periculosidade</SelectItem>
                      <SelectItem value="adicional_insalubridade">Adicional Insalubridade</SelectItem>
                      <SelectItem value="dsr">DSR</SelectItem>
                      <SelectItem value="feriado">Feriado</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data de Início */}
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Data de início da compensação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data de Fim */}
            <FormField
              control={form.control}
              name="data_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fim</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Data de fim da compensação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantidade de Horas */}
            <FormField
              control={form.control}
              name="quantidade_horas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade de Horas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Entre 0.5 e 8 horas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Saldo do Banco de Horas */}
            {watchedTipo === 'banco_horas' && balance !== null && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Saldo Disponível:</span>
                  <span className={cn(
                    "font-bold",
                    balance >= watchedHoras ? "text-green-600" : "text-red-600"
                  )}>
                    {balance}h
                  </span>
                </div>
                {isInsufficientBalance && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Saldo insuficiente. Disponível: {balance}h, Solicitado: {watchedHoras}h
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Validações em tempo real */}
            {isValidating && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Validando...
              </div>
            )}

            {validationResult && !isValidating && (
              <div className="space-y-2">
                {!validationResult.isValid && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{validationResult.error}</AlertDescription>
                  </Alert>
                )}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {validationResult.warnings.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
                {validationResult.isValid && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Solicitação válida
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Validações de limite */}
            {isOverLimit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Máximo de 8 horas por solicitação
                </AlertDescription>
              </Alert>
            )}

            {isUnderMinimum && watchedHoras > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Mínimo de 0.5 horas por solicitação
                </AlertDescription>
              </Alert>
            )}

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da solicitação de compensação..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mínimo de 20 caracteres, máximo de 500
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
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
                disabled={isLoading || !validationResult?.isValid || isInsufficientBalance || isOverLimit || isUnderMinimum}
              >
                {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
