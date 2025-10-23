// =====================================================
// FORMULÁRIO DE PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AwardProductivity, AwardProductivityCreateData, AwardProductivityUpdateData, Employee } from '@/integrations/supabase/rh-types';
import { useAwardTypes, useCalculationTypes } from '@/hooks/rh/useAwardsProductivity';

const formSchema = z.object({
  employee_id: z.string().uuid({ message: 'ID do funcionário inválido.' }),
  tipo: z.enum(['premiacao', 'produtividade', 'bonus', 'comissao', 'meta', 'outros'], {
    required_error: 'Tipo é obrigatório.'
  }),
  nome: z.string().min(1, { message: 'Nome é obrigatório.' }),
  descricao: z.string().optional(),
  mes_referencia: z.date({ required_error: 'Mês de referência é obrigatório.' }),
  valor: z.coerce.number().min(0.01, { message: 'Valor deve ser maior que zero.' }),
  percentual: z.coerce.number().min(0).max(100).optional(),
  tipo_calculo: z.enum(['valor_fixo', 'percentual_meta', 'tabela_faixas', 'comissao_venda'], {
    required_error: 'Tipo de cálculo é obrigatório.'
  }),
  meta_atingida: z.coerce.number().min(0).optional(),
  meta_estabelecida: z.coerce.number().min(0).optional(),
  criterios: z.string().optional(),
  observacoes: z.string().optional(),
});

interface AwardProductivityFormProps {
  initialData?: AwardProductivity;
  employees: Employee[];
  onSubmit: (data: AwardProductivityCreateData | AwardProductivityUpdateData) => void;
  isLoading: boolean;
}

const AwardProductivityForm: React.FC<AwardProductivityFormProps> = ({ initialData, employees, onSubmit, isLoading }) => {
  const awardTypes = useAwardTypes();
  const calculationTypes = useCalculationTypes();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: initialData?.employee_id || '',
      tipo: initialData?.tipo || 'premiacao',
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      mes_referencia: initialData?.mes_referencia ? new Date(initialData.mes_referencia) : new Date(),
      valor: initialData?.valor || 0,
      percentual: initialData?.percentual || 0,
      tipo_calculo: initialData?.tipo_calculo || 'valor_fixo',
      meta_atingida: initialData?.meta_atingida || 0,
      meta_estabelecida: initialData?.meta_estabelecida || 0,
      criterios: initialData?.criterios || '',
      observacoes: initialData?.observacoes || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        employee_id: initialData.employee_id,
        tipo: initialData.tipo,
        nome: initialData.nome,
        descricao: initialData.descricao || '',
        mes_referencia: new Date(initialData.mes_referencia),
        valor: initialData.valor,
        percentual: initialData.percentual || 0,
        tipo_calculo: initialData.tipo_calculo,
        meta_atingida: initialData.meta_atingida || 0,
        meta_estabelecida: initialData.meta_estabelecida || 0,
        criterios: initialData.criterios || '',
        observacoes: initialData.observacoes || '',
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSubmit = {
      ...values,
      mes_referencia: format(values.mes_referencia, 'yyyy-MM-dd'),
      valor: parseFloat(values.valor.toFixed(2)),
      percentual: values.percentual && values.percentual > 0 ? parseFloat(values.percentual.toFixed(2)) : undefined,
      meta_atingida: values.meta_atingida && values.meta_atingida > 0 ? parseFloat(values.meta_atingida.toFixed(2)) : undefined,
      meta_estabelecida: values.meta_estabelecida && values.meta_estabelecida > 0 ? parseFloat(values.meta_estabelecida.toFixed(2)) : undefined,
    };

    if (initialData) {
      onSubmit({ ...dataToSubmit, id: initialData.id, company_id: initialData.company_id });
    } else {
      onSubmit(dataToSubmit);
    }
  };

  const watchTipoCalculo = form.watch('tipo_calculo');
  const watchMetaAtingida = form.watch('meta_atingida');
  const watchMetaEstabelecida = form.watch('meta_estabelecida');

  // Calcular percentual de atingimento automaticamente
  useEffect(() => {
    if (watchMetaAtingida && watchMetaEstabelecida && watchMetaEstabelecida > 0) {
      const percentual = (watchMetaAtingida / watchMetaEstabelecida) * 100;
      form.setValue('percentual', parseFloat(percentual.toFixed(2)));
    }
  }, [watchMetaAtingida, watchMetaEstabelecida, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Funcionário */}
          <FormField
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Funcionário *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees && employees.length > 0 ? employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.nome} - {employee.matricula || 'Sem matrícula'}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-employees" disabled>
                        Nenhum funcionário encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo */}
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Premiação *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {awardTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nome */}
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Premiação *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} placeholder="Ex: Meta de Vendas Janeiro" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mês de Referência */}
          <FormField
            control={form.control}
            name="mes_referencia"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Mês de Referência *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecione o mês</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={isLoading}
                      initialFocus
                      locale={ptBR}
                      showMonthYearPicker
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de Cálculo */}
          <FormField
            control={form.control}
            name="tipo_calculo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Cálculo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de cálculo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {calculationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor */}
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={isLoading}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Meta Estabelecida */}
          <FormField
            control={form.control}
            name="meta_estabelecida"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Estabelecida (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={isLoading}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormDescription>
                  Meta que deve ser atingida para a premiação
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Meta Atingida */}
          <FormField
            control={form.control}
            name="meta_atingida"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Atingida (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={isLoading}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormDescription>
                  Meta que foi efetivamente atingida
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Percentual (calculado automaticamente) */}
          <FormField
            control={form.control}
            name="percentual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percentual de Atingimento (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={true}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormDescription>
                  Calculado automaticamente baseado na meta atingida vs estabelecida
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrição */}
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} placeholder="Descreva a premiação..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Critérios */}
        <FormField
          control={form.control}
          name="criterios"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Critérios</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} placeholder="Descreva os critérios para concessão da premiação..." />
              </FormControl>
              <FormDescription>
                Ex: Meta de R$ 80.000 em vendas, pontualidade 100%, etc.
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
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} placeholder="Observações adicionais..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : (initialData ? 'Atualizar Premiação' : 'Criar Premiação')}
        </Button>
      </form>
    </Form>
  );
};

export default AwardProductivityForm;
