import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmployeeBenefitAssignment, Employee, BenefitConfiguration } from '@/integrations/supabase/rh-types';

const formSchema = z.object({
  employee_id: z.string().min(1, { message: 'Funcionário é obrigatório.' }),
  benefit_config_id: z.string().min(1, { message: 'Benefício é obrigatório.' }),
  start_date: z.date({ required_error: 'Data de início é obrigatória.' }),
  end_date: z.date().optional(),
  custom_value: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

interface EmployeeBenefitAssignmentFormProps {
  assignment?: EmployeeBenefitAssignment | null;
  employees: Employee[];
  benefits: BenefitConfiguration[];
  onSubmit: (data: Partial<EmployeeBenefitAssignment>) => void;
  mode: 'create' | 'edit' | 'view';
}

export const EmployeeBenefitAssignmentForm: React.FC<EmployeeBenefitAssignmentFormProps> = ({ 
  assignment, 
  employees, 
  benefits, 
  onSubmit, 
  mode 
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: assignment?.employee_id || '',
      benefit_config_id: assignment?.benefit_config_id || '',
      start_date: assignment?.start_date ? new Date(assignment.start_date) : undefined,
      end_date: assignment?.end_date ? new Date(assignment.end_date) : undefined,
      custom_value: assignment?.custom_value || 0,
      is_active: assignment?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (assignment) {
      form.reset({
        employee_id: assignment.employee_id,
        benefit_config_id: assignment.benefit_config_id,
        start_date: assignment.start_date ? new Date(assignment.start_date) : undefined,
        end_date: assignment.end_date ? new Date(assignment.end_date) : undefined,
        custom_value: assignment.custom_value || 0,
        is_active: assignment.is_active,
      });
    }
  }, [assignment, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSubmit = {
      ...values,
      start_date: format(values.start_date, 'yyyy-MM-dd'),
      end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : undefined,
      custom_value: values.custom_value && values.custom_value > 0 ? parseFloat(values.custom_value.toFixed(2)) : undefined,
    };

    if (assignment) {
      onSubmit({ ...dataToSubmit, id: assignment.id, company_id: assignment.company_id });
    } else {
      onSubmit(dataToSubmit);
    }
  };

  const isReadOnly = mode === 'view';

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
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ''} 
                  disabled={isReadOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.length > 0 ? (
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome} - {employee.matricula || 'Sem matrícula'}
                        </SelectItem>
                      ))
                    ) : (
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

          {/* Benefício */}
          <FormField
            control={form.control}
            name="benefit_config_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefício *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o benefício" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {benefits.map((benefit) => (
                      <SelectItem key={benefit.id} value={benefit.id}>
                        {benefit.name} - {benefit.benefit_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Início */}
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isReadOnly}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
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
                      disabled={isReadOnly}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Fim */}
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Fim</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isReadOnly}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
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
                      disabled={isReadOnly}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Deixe em branco para benefício sem data de fim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor Personalizado */}
          <FormField
            control={form.control}
            name="custom_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Personalizado (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={isReadOnly}
                    placeholder="0,00"
                  />
                </FormControl>
                <FormDescription>
                  Valor personalizado para este funcionário (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status Ativo */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ativo</FormLabel>
                  <FormDescription>
                    Se o vínculo está ativo e deve ser considerado nos cálculos
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isReadOnly && (
          <Button type="submit" className="w-full">
            {assignment ? 'Atualizar Vínculo' : 'Criar Vínculo'}
          </Button>
        )}
      </form>
    </Form>
  );
};

export default EmployeeBenefitAssignmentForm;
