// =====================================================
// FORMULÁRIO DE BENEFÍCIOS
// =====================================================

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BenefitConfiguration, BenefitConfigurationInsert, BenefitConfigurationUpdate } from '@/integrations/supabase/rh-types';
import { useBenefitTypes, useBenefitCalculationTypes, useBenefitCategories } from '@/hooks/rh/useBenefits';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório.' }),
  benefit_type: z.enum(['vr_va', 'transporte', 'equipment_rental', 'premiacao', 'outros'], {
    required_error: 'Tipo é obrigatório.'
  }),
  description: z.string().optional(),
  base_value: z.coerce.number().min(0).optional(),
  percentage_value: z.coerce.number().min(0).max(100).optional(),
  calculation_type: z.enum(['fixed_value', 'daily_value', 'percentage', 'work_days'], {
    required_error: 'Tipo de cálculo é obrigatório.'
  }),
  min_value: z.coerce.number().min(0).optional(),
  max_value: z.coerce.number().min(0).optional(),
  daily_calculation_base: z.coerce.number().min(1).default(30),
  requires_approval: z.boolean().default(false),
  is_active: z.boolean().default(true),
  entra_no_calculo_folha: z.boolean().default(true),
});

interface BenefitFormProps {
  initialData?: BenefitConfiguration;
  onSubmit: (data: BenefitConfigurationInsert | BenefitConfigurationUpdate) => void;
  isLoading: boolean;
}

const BenefitForm: React.FC<BenefitFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const benefitTypes = useBenefitTypes();
  const benefitCalculationTypes = useBenefitCalculationTypes();
  const benefitCategories = useBenefitCategories();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      benefit_type: initialData?.benefit_type || 'vr_va',
      description: initialData?.description || '',
      base_value: initialData?.base_value || 0,
      percentage_value: initialData?.percentage_value || 0,
      calculation_type: initialData?.calculation_type || 'fixed_value',
      min_value: initialData?.min_value || 0,
      max_value: initialData?.max_value || 0,
      daily_calculation_base: initialData?.daily_calculation_base || 30,
      requires_approval: initialData?.requires_approval || false,
      is_active: initialData?.is_active ?? true,
      entra_no_calculo_folha: initialData?.entra_no_calculo_folha ?? true,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        benefit_type: initialData.benefit_type,
        description: initialData.description || '',
        base_value: initialData.base_value || 0,
        percentage_value: initialData.percentage_value || 0,
        calculation_type: initialData.calculation_type,
        min_value: initialData.min_value || 0,
        max_value: initialData.max_value || 0,
        daily_calculation_base: initialData.daily_calculation_base || 30,
        requires_approval: initialData.requires_approval,
        is_active: initialData.is_active,
        entra_no_calculo_folha: initialData.entra_no_calculo_folha,
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSubmit = {
      ...values,
      base_value: values.base_value && values.base_value > 0 ? parseFloat(values.base_value.toFixed(2)) : undefined,
      percentage_value: values.percentage_value && values.percentage_value > 0 ? parseFloat(values.percentage_value.toFixed(2)) : undefined,
      min_value: values.min_value && values.min_value > 0 ? parseFloat(values.min_value.toFixed(2)) : undefined,
      max_value: values.max_value && values.max_value > 0 ? parseFloat(values.max_value.toFixed(2)) : undefined,
    };

    if (initialData) {
      onSubmit({ ...dataToSubmit, id: initialData.id, company_id: initialData.company_id });
    } else {
      onSubmit(dataToSubmit);
    }
  };

  const watchCalculationType = form.watch('calculation_type');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Benefício *</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} placeholder="Ex: Vale Alimentação" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo */}
          <FormField
            control={form.control}
            name="benefit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Benefício *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="vr_va">Vale Refeição/Alimentação</SelectItem>
                    <SelectItem value="transporte">Vale Transporte</SelectItem>
                    <SelectItem value="equipment_rental">Aluguel de Equipamentos</SelectItem>
                    <SelectItem value="premiacao">Premiação</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de Cálculo */}
          <FormField
            control={form.control}
            name="calculation_type"
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
                    <SelectItem value="fixed_value">Valor Fixo</SelectItem>
                    <SelectItem value="daily_value">Valor Diário</SelectItem>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="work_days">Dias Trabalhados</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor Base (se calculation_type for fixed_value) */}
          {watchCalculationType === 'fixed_value' && (
            <FormField
              control={form.control}
              name="base_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Base (R$)</FormLabel>
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
          )}

          {/* Valor Percentual (se calculation_type for percentage) */}
          {watchCalculationType === 'percentage' && (
            <FormField
              control={form.control}
              name="percentage_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual (%)</FormLabel>
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
          )}

          {/* Valor Diário (se calculation_type for daily_value) */}
          {watchCalculationType === 'daily_value' && (
            <FormField
              control={form.control}
              name="base_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Diário (R$)</FormLabel>
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
          )}

          {/* Valor Mínimo */}
          <FormField
            control={form.control}
            name="min_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Mínimo (R$)</FormLabel>
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
                  Valor mínimo do benefício
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor Máximo */}
          <FormField
            control={form.control}
            name="max_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Máximo (R$)</FormLabel>
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
                  Valor máximo do benefício
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Base de Cálculo Diário */}
          <FormField
            control={form.control}
            name="daily_calculation_base"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base de Cálculo Diário</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="1" 
                    {...field} 
                    disabled={isLoading}
                    placeholder="30"
                  />
                </FormControl>
                <FormDescription>
                  Número de dias para cálculo mensal (padrão: 30)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="requires_approval"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Requer Aprovação</FormLabel>
                  <FormDescription>
                    Se o benefício requer aprovação antes de ser atribuído
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ativo</FormLabel>
                  <FormDescription>
                    Se o benefício está ativo e pode ser atribuído
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="entra_no_calculo_folha"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Entra no Cálculo da Folha de Pagamento</FormLabel>
                  <FormDescription>
                    Se o benefício deve ser incluído no cálculo da folha de pagamento
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} placeholder="Descreva o benefício..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : (initialData ? 'Atualizar Benefício' : 'Criar Benefício')}
        </Button>
      </form>
    </Form>
  );
};

export default BenefitForm;