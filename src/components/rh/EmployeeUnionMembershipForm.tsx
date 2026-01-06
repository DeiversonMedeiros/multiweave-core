// =====================================================
// FORMULÁRIO PARA FILIAÇÕES SINDICAIS
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeUnionMembership, EmployeeUnionMembershipCreateData, EmployeeUnionMembershipUpdateData, Union } from '@/integrations/supabase/rh-types';
import { useMembershipStatuses, useUnions } from '@/hooks/rh/useUnions';
import { useEmployees } from '@/hooks/rh/useEmployees';

const formSchema = z.object({
  employee_id: z.string().uuid({ message: 'Funcionário é obrigatório.' }),
  union_id: z.string().uuid({ message: 'Sindicato é obrigatório.' }),
  data_filiacao: z.string().min(1, 'Data de filiação é obrigatória.'),
  data_desfiliacao: z.string().optional(),
  status: z.enum(['ativo', 'suspenso', 'desfiliado', 'transferido'], {
    required_error: 'Status é obrigatório.',
  }).default('ativo'),
  numero_carteira: z.string().max(50, 'Número da carteira deve ter no máximo 50 caracteres.').optional(),
  categoria_filiacao: z.string().max(100, 'Categoria de filiação deve ter no máximo 100 caracteres.').optional(),
  valor_mensalidade: z.number().min(0, 'Valor da mensalidade deve ser maior ou igual a 0.').optional(),
  desconto_folha: z.boolean().default(false),
  motivo_desfiliacao: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeUnionMembershipFormProps {
  initialData?: EmployeeUnionMembership;
  onSubmit: (data: EmployeeUnionMembershipCreateData | EmployeeUnionMembershipUpdateData) => void;
  isLoading?: boolean;
}

const EmployeeUnionMembershipForm: React.FC<EmployeeUnionMembershipFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const membershipStatuses = useMembershipStatuses();
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data || [];
  const { data: unions } = useUnions({ ativo: true });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: initialData?.employee_id || '',
      union_id: initialData?.union_id || '',
      data_filiacao: initialData?.data_filiacao?.split('T')[0] || '',
      data_desfiliacao: initialData?.data_desfiliacao?.split('T')[0] || '',
      status: initialData?.status || 'ativo',
      numero_carteira: initialData?.numero_carteira || '',
      categoria_filiacao: initialData?.categoria_filiacao || '',
      valor_mensalidade: initialData?.valor_mensalidade || 0,
      desconto_folha: initialData?.desconto_folha || false,
      motivo_desfiliacao: initialData?.motivo_desfiliacao || '',
      observacoes: initialData?.observacoes || '',
    },
  });

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      data_desfiliacao: data.data_desfiliacao || undefined,
      numero_carteira: data.numero_carteira || undefined,
      categoria_filiacao: data.categoria_filiacao || undefined,
      valor_mensalidade: data.valor_mensalidade || undefined,
      motivo_desfiliacao: data.motivo_desfiliacao || undefined,
      observacoes: data.observacoes || undefined,
      ...(initialData && { id: initialData.id }),
    };
    onSubmit(submitData as EmployeeUnionMembershipCreateData | EmployeeUnionMembershipUpdateData);
  };

  const watchedStatus = watch('status');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informações da Filiação */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Filiação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Funcionário *</Label>
              <Select
                value={watch('employee_id')}
                onValueChange={(value) => setValue('employee_id', value)}
              >
                <SelectTrigger className={errors.employee_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees && employees.length > 0 ? employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome} ({employee.matricula})
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-employees" disabled>
                      Nenhum funcionário encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="union_id">Sindicato *</Label>
              <Select
                value={watch('union_id')}
                onValueChange={(value) => setValue('union_id', value)}
              >
                <SelectTrigger className={errors.union_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o sindicato" />
                </SelectTrigger>
                <SelectContent>
                  {unions && unions.length > 0 ? unions.map((union) => (
                    <SelectItem key={union.id} value={union.id}>
                      {union.nome} {union.sigla && `(${union.sigla})`}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-unions" disabled>
                      Nenhum sindicato encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.union_id && (
                <p className="text-sm text-red-500">{errors.union_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_filiacao">Data de Filiação *</Label>
              <Input
                id="data_filiacao"
                type="date"
                {...register('data_filiacao')}
                className={errors.data_filiacao ? 'border-red-500' : ''}
              />
              {errors.data_filiacao && (
                <p className="text-sm text-red-500">{errors.data_filiacao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_desfiliacao">Data de Desfiliação</Label>
              <Input
                id="data_desfiliacao"
                type="date"
                {...register('data_desfiliacao')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {membershipStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_carteira">Número da Carteira</Label>
              <Input
                id="numero_carteira"
                {...register('numero_carteira')}
                className={errors.numero_carteira ? 'border-red-500' : ''}
                placeholder="Número da carteira sindical"
              />
              {errors.numero_carteira && (
                <p className="text-sm text-red-500">{errors.numero_carteira.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria_filiacao">Categoria de Filiação</Label>
            <Input
              id="categoria_filiacao"
              {...register('categoria_filiacao')}
              className={errors.categoria_filiacao ? 'border-red-500' : ''}
              placeholder="Ex: Metalúrgico, Bancário"
            />
            {errors.categoria_filiacao && (
              <p className="text-sm text-red-500">{errors.categoria_filiacao.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Financeiras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_mensalidade">Valor da Mensalidade (R$)</Label>
              <Input
                id="valor_mensalidade"
                type="number"
                step="0.01"
                {...register('valor_mensalidade', { valueAsNumber: true })}
                min="0"
                className={errors.valor_mensalidade ? 'border-red-500' : ''}
                placeholder="0,00"
              />
              {errors.valor_mensalidade && (
                <p className="text-sm text-red-500">{errors.valor_mensalidade.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desconto_folha">Desconto na Folha</Label>
              <Select
                value={watch('desconto_folha') ? 'sim' : 'nao'}
                onValueChange={(value) => setValue('desconto_folha', value === 'sim')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Desconto na folha?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivo de Desfiliação (se status for desfiliado ou transferido) */}
      {(watchedStatus === 'desfiliado' || watchedStatus === 'transferido') && (
        <Card>
          <CardHeader>
            <CardTitle>Motivo da Desfiliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="motivo_desfiliacao">Motivo da Desfiliação</Label>
              <Textarea
                id="motivo_desfiliacao"
                {...register('motivo_desfiliacao')}
                placeholder="Descreva o motivo da desfiliação ou transferência..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
              placeholder="Informações adicionais sobre a filiação..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

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
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'} Filiação
        </Button>
      </div>
    </form>
  );
};

export default EmployeeUnionMembershipForm;
