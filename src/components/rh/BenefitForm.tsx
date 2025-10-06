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
import { Benefit, BenefitCreateData, BenefitUpdateData } from '@/integrations/supabase/rh-types';
import { useBenefitTypes, useBenefitCalculationTypes, useBenefitCategories } from '@/hooks/rh/useBenefits';

const formSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório.' }),
  tipo: z.enum(['vale_alimentacao', 'vale_refeicao', 'vale_transporte', 'plano_saude', 'plano_odonto', 'seguro_vida', 'auxilio_creche', 'auxilio_educacao', 'gympass', 'outros'], {
    required_error: 'Tipo é obrigatório.'
  }),
  descricao: z.string().optional(),
  valor_mensal: z.coerce.number().min(0).optional(),
  valor_percentual: z.coerce.number().min(0).max(100).optional(),
  tipo_calculo: z.enum(['valor_fixo', 'percentual_salario', 'tabela_faixas'], {
    required_error: 'Tipo de cálculo é obrigatório.'
  }),
  desconto_ir: z.boolean().default(false),
  desconto_inss: z.boolean().default(false),
  desconto_fgts: z.boolean().default(false),
  limite_mensal: z.coerce.number().min(0).optional(),
  data_inicio_vigencia: z.date().optional(),
  data_fim_vigencia: z.date().optional(),
  ativo: z.boolean().default(true),
  obrigatorio: z.boolean().default(false),
  categoria: z.enum(['geral', 'executivo', 'operacional', 'terceirizado']).default('geral'),
  regras_aplicacao: z.string().optional(),
  observacoes: z.string().optional(),
});

interface BenefitFormProps {
  initialData?: Benefit;
  onSubmit: (data: BenefitCreateData | BenefitUpdateData) => void;
  isLoading: boolean;
}

const BenefitForm: React.FC<BenefitFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const benefitTypes = useBenefitTypes();
  const benefitCalculationTypes = useBenefitCalculationTypes();
  const benefitCategories = useBenefitCategories();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      tipo: initialData?.tipo || 'vale_alimentacao',
      descricao: initialData?.descricao || '',
      valor_mensal: initialData?.valor_mensal || 0,
      valor_percentual: initialData?.valor_percentual || 0,
      tipo_calculo: initialData?.tipo_calculo || 'valor_fixo',
      desconto_ir: initialData?.desconto_ir || false,
      desconto_inss: initialData?.desconto_inss || false,
      desconto_fgts: initialData?.desconto_fgts || false,
      limite_mensal: initialData?.limite_mensal || 0,
      data_inicio_vigencia: initialData?.data_inicio_vigencia ? new Date(initialData.data_inicio_vigencia) : undefined,
      data_fim_vigencia: initialData?.data_fim_vigencia ? new Date(initialData.data_fim_vigencia) : undefined,
      ativo: initialData?.ativo ?? true,
      obrigatorio: initialData?.obrigatorio || false,
      categoria: initialData?.categoria || 'geral',
      regras_aplicacao: initialData?.regras_aplicacao || '',
      observacoes: initialData?.observacoes || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        tipo: initialData.tipo,
        descricao: initialData.descricao || '',
        valor_mensal: initialData.valor_mensal || 0,
        valor_percentual: initialData.valor_percentual || 0,
        tipo_calculo: initialData.tipo_calculo,
        desconto_ir: initialData.desconto_ir,
        desconto_inss: initialData.desconto_inss,
        desconto_fgts: initialData.desconto_fgts,
        limite_mensal: initialData.limite_mensal || 0,
        data_inicio_vigencia: initialData.data_inicio_vigencia ? new Date(initialData.data_inicio_vigencia) : undefined,
        data_fim_vigencia: initialData.data_fim_vigencia ? new Date(initialData.data_fim_vigencia) : undefined,
        ativo: initialData.ativo,
        obrigatorio: initialData.obrigatorio,
        categoria: initialData.categoria,
        regras_aplicacao: initialData.regras_aplicacao || '',
        observacoes: initialData.observacoes || '',
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSubmit = {
      ...values,
      data_inicio_vigencia: values.data_inicio_vigencia ? format(values.data_inicio_vigencia, 'yyyy-MM-dd') : undefined,
      data_fim_vigencia: values.data_fim_vigencia ? format(values.data_fim_vigencia, 'yyyy-MM-dd') : undefined,
      valor_mensal: values.valor_mensal && values.valor_mensal > 0 ? parseFloat(values.valor_mensal.toFixed(2)) : undefined,
      valor_percentual: values.valor_percentual && values.valor_percentual > 0 ? parseFloat(values.valor_percentual.toFixed(2)) : undefined,
      limite_mensal: values.limite_mensal && values.limite_mensal > 0 ? parseFloat(values.limite_mensal.toFixed(2)) : undefined,
    };

    if (initialData) {
      onSubmit({ ...dataToSubmit, id: initialData.id, company_id: initialData.company_id });
    } else {
      onSubmit(dataToSubmit);
    }
  };

  const watchTipoCalculo = form.watch('tipo_calculo');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <FormField
            control={form.control}
            name="nome"
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
            name="tipo"
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
                    {benefitTypes.map((type) => (
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

          {/* Categoria */}
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {benefitCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {benefitCalculationTypes.map((type) => (
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

          {/* Valor Mensal (se tipo_calculo for valor_fixo) */}
          {watchTipoCalculo === 'valor_fixo' && (
            <FormField
              control={form.control}
              name="valor_mensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Mensal (R$)</FormLabel>
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

          {/* Valor Percentual (se tipo_calculo for percentual_salario) */}
          {watchTipoCalculo === 'percentual_salario' && (
            <FormField
              control={form.control}
              name="valor_percentual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual do Salário (%)</FormLabel>
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

          {/* Limite Mensal */}
          <FormField
            control={form.control}
            name="limite_mensal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite Mensal (R$)</FormLabel>
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
                  Limite máximo que pode ser descontado por mês
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Início da Vigência */}
          <FormField
            control={form.control}
            name="data_inicio_vigencia"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início da Vigência</FormLabel>
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
                      disabled={isLoading}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Fim da Vigência */}
          <FormField
            control={form.control}
            name="data_fim_vigencia"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Fim da Vigência</FormLabel>
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
                      disabled={isLoading}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="desconto_ir"
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
                  <FormLabel>Desconta IR</FormLabel>
                  <FormDescription>
                    Se o benefício deve ser descontado do Imposto de Renda
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desconto_inss"
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
                  <FormLabel>Desconta INSS</FormLabel>
                  <FormDescription>
                    Se o benefício deve ser descontado do INSS
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desconto_fgts"
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
                  <FormLabel>Desconta FGTS</FormLabel>
                  <FormDescription>
                    Se o benefício deve ser descontado do FGTS
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="obrigatorio"
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
                  <FormLabel>Obrigatório</FormLabel>
                  <FormDescription>
                    Se o benefício é obrigatório para todos os funcionários
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ativo"
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
        </div>

        {/* Descrição */}
        <FormField
          control={form.control}
          name="descricao"
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

        {/* Regras de Aplicação */}
        <FormField
          control={form.control}
          name="regras_aplicacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regras de Aplicação</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} placeholder="Descreva as regras para aplicação do benefício..." />
              </FormControl>
              <FormDescription>
                Ex: Funcionários com mais de 6 meses de empresa, apenas para funcionários CLT, etc.
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
          {isLoading ? 'Salvando...' : (initialData ? 'Atualizar Benefício' : 'Criar Benefício')}
        </Button>
      </form>
    </Form>
  );
};

export default BenefitForm;