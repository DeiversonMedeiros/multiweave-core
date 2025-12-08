// =====================================================
// FORMULÁRIO PARA PLANOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MedicalPlan, MedicalPlanCreateData, MedicalPlanUpdateData } from '@/integrations/supabase/rh-types';
import { usePlanCategories, useMedicalAgreements } from '@/hooks/rh/useMedicalAgreements';
import { MedicalPlanAgeRangesManager } from '@/components/rh/MedicalPlanAgeRangesManager';
import { useCompany } from '@/lib/company-context';

const formSchema = z.object({
  agreement_id: z.string().uuid({ message: 'Convênio é obrigatório.' }),
  nome: z.string().min(1, 'Nome é obrigatório.').max(255, 'Nome deve ter no máximo 255 caracteres.'),
  descricao: z.string().optional(),
  categoria: z.enum(['basico', 'intermediario', 'premium', 'executivo', 'familia', 'individual'], {
    required_error: 'Categoria é obrigatória.',
  }),
  cobertura: z.string().optional(),
  carencia_dias: z.number().min(0, 'Carência deve ser maior ou igual a 0.').default(0),
  faixa_etaria_min: z.number().min(0, 'Idade mínima deve ser maior ou igual a 0.').default(0),
  faixa_etaria_max: z.number().min(0, 'Idade máxima deve ser maior ou igual a 0.').default(99),
  limite_dependentes: z.number().min(0, 'Limite de dependentes deve ser maior ou igual a 0.').default(0),
  // Valores agora são definidos apenas por faixas etárias
  valor_titular: z.number().min(0, 'Valor do titular deve ser maior ou igual a 0.').default(0),
  valor_dependente: z.number().min(0, 'Valor do dependente deve ser maior ou igual a 0.').default(0),
  valor_familia: z.number().min(0, 'Valor família deve ser maior ou igual a 0.').optional(),
  desconto_funcionario: z.number().min(0, 'Desconto funcionário deve ser maior ou igual a 0.').max(100, 'Desconto não pode ser maior que 100%.').default(0),
  desconto_dependente: z.number().min(0, 'Desconto dependente deve ser maior ou igual a 0.').max(100, 'Desconto não pode ser maior que 100%.').default(0),
  ativo: z.boolean().default(true),
  data_inicio_vigencia: z.string().optional(),
  data_fim_vigencia: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MedicalPlanFormProps {
  initialData?: MedicalPlan;
  onSubmit: (data: MedicalPlanCreateData | MedicalPlanUpdateData) => void;
  isLoading?: boolean;
}

const MedicalPlanForm: React.FC<MedicalPlanFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const planCategories = usePlanCategories();
  const { data: agreements } = useMedicalAgreements({ ativo: true });
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agreement_id: initialData?.agreement_id || '',
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      categoria: initialData?.categoria || 'basico',
      cobertura: initialData?.cobertura || '',
      carencia_dias: initialData?.carencia_dias || 0,
      faixa_etaria_min: initialData?.faixa_etaria_min || 0,
      faixa_etaria_max: initialData?.faixa_etaria_max || 99,
      limite_dependentes: initialData?.limite_dependentes || 0,
      valor_titular: initialData?.valor_titular || 0,
      valor_dependente: initialData?.valor_dependente || 0,
      valor_familia: initialData?.valor_familia || 0,
      desconto_funcionario: initialData?.desconto_funcionario || 0,
      desconto_dependente: initialData?.desconto_dependente || 0,
      ativo: initialData?.ativo ?? true,
      data_inicio_vigencia: initialData?.data_inicio_vigencia?.split('T')[0] || '',
      data_fim_vigencia: initialData?.data_fim_vigencia?.split('T')[0] || '',
      observacoes: initialData?.observacoes || '',
    },
  });

  const watchedAtivo = watch('ativo');
  const watchedDescontoFuncionario = watch('desconto_funcionario');
  const watchedDescontoDependente = watch('desconto_dependente');

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      // Valores padrão serão usados apenas se não houver faixas etárias cadastradas
      valor_titular: 0,
      valor_dependente: 0,
      valor_familia: data.valor_familia || undefined,
      data_inicio_vigencia: data.data_inicio_vigencia || undefined,
      data_fim_vigencia: data.data_fim_vigencia || undefined,
      ...(initialData && { id: initialData.id }),
    };
    onSubmit(submitData as MedicalPlanCreateData | MedicalPlanUpdateData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agreement_id">Convênio *</Label>
              <Select
                value={watch('agreement_id')}
                onValueChange={(value) => setValue('agreement_id', value)}
              >
                <SelectTrigger className={errors.agreement_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o convênio" />
                </SelectTrigger>
                <SelectContent>
                  {agreements && agreements.length > 0 ? agreements.map((agreement) => (
                    <SelectItem key={agreement.id} value={agreement.id}>
                      {agreement.nome}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-agreements" disabled>
                      Nenhum convênio encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.agreement_id && (
                <p className="text-sm text-red-500">{errors.agreement_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Plano *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Ex: Básico, Plus, Master..."
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={watch('categoria')}
                onValueChange={(value) => setValue('categoria', value as any)}
              >
                <SelectTrigger className={errors.categoria ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {planCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-sm text-red-500">{errors.categoria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carencia_dias">Carência (dias)</Label>
              <Input
                id="carencia_dias"
                type="number"
                {...register('carencia_dias', { valueAsNumber: true })}
                min="0"
                className={errors.carencia_dias ? 'border-red-500' : ''}
              />
              {errors.carencia_dias && (
                <p className="text-sm text-red-500">{errors.carencia_dias.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register('descricao')}
              placeholder="Descrição detalhada do plano..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cobertura">Cobertura</Label>
            <Textarea
              id="cobertura"
              {...register('cobertura')}
              placeholder="Detalhes da cobertura oferecida..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={watchedAtivo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
            <Label htmlFor="ativo">Plano ativo</Label>
          </div>
        </CardContent>
      </Card>

      {/* Faixa Etária e Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Faixa Etária e Limites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faixa_etaria_min">Idade Mínima</Label>
              <Input
                id="faixa_etaria_min"
                type="number"
                {...register('faixa_etaria_min', { valueAsNumber: true })}
                min="0"
                className={errors.faixa_etaria_min ? 'border-red-500' : ''}
              />
              {errors.faixa_etaria_min && (
                <p className="text-sm text-red-500">{errors.faixa_etaria_min.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="faixa_etaria_max">Idade Máxima</Label>
              <Input
                id="faixa_etaria_max"
                type="number"
                {...register('faixa_etaria_max', { valueAsNumber: true })}
                min="0"
                className={errors.faixa_etaria_max ? 'border-red-500' : ''}
              />
              {errors.faixa_etaria_max && (
                <p className="text-sm text-red-500">{errors.faixa_etaria_max.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_dependentes">Limite de Dependentes</Label>
              <Input
                id="limite_dependentes"
                type="number"
                {...register('limite_dependentes', { valueAsNumber: true })}
                min="0"
                placeholder="0 = ilimitado"
                className={errors.limite_dependentes ? 'border-red-500' : ''}
              />
              {errors.limite_dependentes && (
                <p className="text-sm text-red-500">{errors.limite_dependentes.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nota sobre valores por faixa etária */}
      <Card>
        <CardHeader>
          <CardTitle>Valores do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Importante:</strong> Os valores deste plano devem ser definidos através das <strong>Faixas Etárias</strong> abaixo. 
              Após salvar o plano, você poderá adicionar faixas etárias com valores específicos para cada idade.
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Se não houver faixas etárias cadastradas, será usado um valor padrão de R$ 0,00. 
              Certifique-se de cadastrar pelo menos uma faixa etária após criar o plano.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Descontos */}
      <Card>
        <CardHeader>
          <CardTitle>Descontos Padrão do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Nota:</strong> Estes são descontos padrão aplicados automaticamente a todos os funcionários que aderirem a este plano. Descontos adicionais podem ser aplicados individualmente na adesão.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desconto_funcionario">Desconto Padrão Titular (%)</Label>
              <Input
                id="desconto_funcionario"
                type="number"
                {...register('desconto_funcionario', { valueAsNumber: true })}
                min="0"
                max="100"
                className={errors.desconto_funcionario ? 'border-red-500' : ''}
              />
              {errors.desconto_funcionario && (
                <p className="text-sm text-red-500">{errors.desconto_funcionario.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Desconto padrão aplicado ao valor do titular
              </p>
              {watchedDescontoFuncionario > 0 && (
                <p className="text-sm text-green-600">
                  Valor final titular: R$ {valorTitularComDesconto.toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desconto_dependente">Desconto Padrão Dependente (%)</Label>
              <Input
                id="desconto_dependente"
                type="number"
                {...register('desconto_dependente', { valueAsNumber: true })}
                min="0"
                max="100"
                className={errors.desconto_dependente ? 'border-red-500' : ''}
              />
              {errors.desconto_dependente && (
                <p className="text-sm text-red-500">{errors.desconto_dependente.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Desconto padrão aplicado ao valor dos dependentes
              </p>
              {watchedDescontoDependente > 0 && (
                <p className="text-sm text-green-600">
                  Valor final dependente: R$ {valorDependenteComDesconto.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vigência */}
      <Card>
        <CardHeader>
          <CardTitle>Vigência do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio_vigencia">Data de Início da Vigência</Label>
              <Input
                id="data_inicio_vigencia"
                type="date"
                {...register('data_inicio_vigencia')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim_vigencia">Data de Fim da Vigência</Label>
              <Input
                id="data_fim_vigencia"
                type="date"
                {...register('data_fim_vigencia')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Informações adicionais sobre o plano..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Faixas Etárias (apenas para planos existentes) */}
      {initialData?.id && companyId && (
        <MedicalPlanAgeRangesManager
          planId={initialData.id}
          companyId={companyId}
        />
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'} Plano
        </Button>
      </div>
    </form>
  );
};

export default MedicalPlanForm;
