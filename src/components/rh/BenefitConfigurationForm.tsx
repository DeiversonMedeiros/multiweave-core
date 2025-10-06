import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  BenefitConfiguration, 
  BenefitConfigurationInsert, 
  BenefitConfigurationUpdate 
} from '@/integrations/supabase/rh-types';
import { 
  Gift, 
  DollarSign, 
  Percent, 
  Calendar, 
  Settings,
  AlertCircle
} from 'lucide-react';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const benefitConfigurationSchema = z.object({
  benefit_type: z.enum(['vr_va', 'transporte', 'equipment_rental', 'premiacao'], {
    required_error: 'Tipo de benefício é obrigatório'
  }),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  calculation_type: z.enum(['fixed_value', 'daily_value', 'percentage'], {
    required_error: 'Tipo de cálculo é obrigatório'
  }),
  base_value: z.number().min(0, 'Valor base deve ser positivo').optional(),
  percentage_value: z.number().min(0, 'Percentual deve ser positivo').max(100, 'Percentual não pode ser maior que 100%').optional(),
  min_value: z.number().min(0, 'Valor mínimo deve ser positivo').optional(),
  max_value: z.number().min(0, 'Valor máximo deve ser positivo').optional(),
  daily_calculation_base: z.number().min(1, 'Base de cálculo diário deve ser pelo menos 1').max(31, 'Base de cálculo diário não pode ser maior que 31').default(30),
  is_active: z.boolean().default(true),
});

type BenefitConfigurationFormData = z.infer<typeof benefitConfigurationSchema>;

// =====================================================
// INTERFACES
// =====================================================

interface BenefitConfigurationFormProps {
  configuration?: BenefitConfiguration | null;
  onSubmit: (data: BenefitConfigurationFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  mode: 'create' | 'edit' | 'view';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function BenefitConfigurationForm({ 
  configuration, 
  onSubmit, 
  onCancel, 
  loading = false, 
  mode 
}: BenefitConfigurationFormProps) {
  // Configuração do formulário
  const form = useForm<BenefitConfigurationFormData>({
    resolver: zodResolver(benefitConfigurationSchema),
    defaultValues: {
      benefit_type: configuration?.benefit_type || 'vr_va',
      name: configuration?.name || '',
      description: configuration?.description || '',
      calculation_type: configuration?.calculation_type || 'fixed_value',
      base_value: configuration?.base_value || undefined,
      percentage_value: configuration?.percentage_value || undefined,
      min_value: configuration?.min_value || undefined,
      max_value: configuration?.max_value || undefined,
      daily_calculation_base: configuration?.daily_calculation_base || 30,
      is_active: configuration?.is_active ?? true,
    },
  });

  const watchCalculationType = form.watch('calculation_type');
  const watchBenefitType = form.watch('benefit_type');

  // Handlers
  const handleSubmit = (data: BenefitConfigurationFormData) => {
    onSubmit(data);
  };

  const isReadOnly = mode === 'view';

  // Opções de tipos de benefício
  const benefitTypes = [
    { value: 'vr_va', label: 'Vale Refeição / Vale Alimentação', icon: '🍽️' },
    { value: 'transporte', label: 'Vale Transporte', icon: '🚌' },
    { value: 'equipment_rental', label: 'Aluguel de Equipamentos', icon: '💻' },
    { value: 'premiacao', label: 'Premiação / Bônus', icon: '🏆' },
  ];

  // Opções de tipos de cálculo
  const calculationTypes = [
    { value: 'fixed_value', label: 'Valor Fixo', description: 'Valor fixo mensal' },
    { value: 'daily_value', label: 'Valor Diário', description: 'Valor por dia trabalhado' },
    { value: 'percentage', label: 'Percentual', description: 'Percentual do salário' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Configuração de Benefício
            </CardTitle>
            <CardDescription>
              Configure os parâmetros do benefício
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="benefit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Benefício *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {benefitTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Benefício *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: VR Padrão"
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descrição do benefício"
                      disabled={isReadOnly}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calculation_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cálculo *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isReadOnly}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de cálculo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {calculationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configurações de Valor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configurações de Valor
            </CardTitle>
            <CardDescription>
              Defina como o valor do benefício será calculado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {watchCalculationType === 'fixed_value' && (
              <FormField
                control={form.control}
                name="base_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Fixo Mensal *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="pl-10"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Valor fixo que será pago mensalmente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchCalculationType === 'daily_value' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="base_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Diário *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            className="pl-10"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Valor por dia trabalhado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="daily_calculation_base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base de Cálculo Diário</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="1"
                          max="31"
                          placeholder="30"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        Número de dias para cálculo mensal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {watchCalculationType === 'percentage' && (
              <FormField
                control={form.control}
                name="percentage_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual do Salário *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0,00"
                          className="pl-10"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual do salário base do funcionário
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Limites de Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mínimo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="pl-10"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          disabled={isReadOnly}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Valor mínimo que será pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Máximo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="pl-10"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          disabled={isReadOnly}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Valor máximo que será pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Benefício Ativo
                    </FormLabel>
                    <FormDescription>
                      Selecione se este benefício está ativo e pode ser atribuído aos funcionários
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          {mode !== 'view' && (
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                mode === 'create' ? 'Criar Benefício' : 'Salvar Alterações'
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

export default BenefitConfigurationForm;
