import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import type { FuelBudget } from '@/types/combustivel';

const budgetSchema = z.object({
  centro_custo_id: z.string().optional().nullable(),
  projeto_id: z.string().optional().nullable(),
  condutor_id: z.string().optional().nullable(),
  valor_orcado: z.number().min(0.01, 'Valor deve ser maior que zero'),
  litros_orcados: z.number().min(0).optional().nullable(),
  observacoes: z.string().optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  budget?: FuelBudget | null;
  mes: number;
  ano: number;
  onSubmit: (data: BudgetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BudgetForm({ budget, mes, ano, onSubmit, onCancel, isLoading }: BudgetFormProps) {
  const { selectedCompany } = useCompany();
  const { data: costCenters } = useCostCenters();
  const { data: projects } = useProjects();
  
  // Hook para buscar profiles
  const { data: profiles } = useQuery({
    queryKey: ['profiles', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return { data: [], totalCount: 0 };
      return EntityService.list({
        schema: 'public',
        table: 'profiles',
        companyId: selectedCompany.id,
        page: 1,
        pageSize: 1000
      });
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      centro_custo_id: budget?.centro_custo_id || undefined,
      projeto_id: budget?.projeto_id || undefined,
      condutor_id: budget?.condutor_id || undefined,
      valor_orcado: budget?.valor_orcado || 0,
      litros_orcados: budget?.litros_orcados || undefined,
      observacoes: budget?.observacoes || '',
    },
  });

  const centroCustoId = form.watch('centro_custo_id');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Período: {new Date(2000, mes - 1).toLocaleString('pt-BR', { month: 'long' })}/{ano}
          </p>
        </div>

        <FormField
          control={form.control}
          name="centro_custo_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Centro de Custo (Opcional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o centro de custo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (Geral)</SelectItem>
                  {costCenters?.data?.map((cc: any) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.nome}
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
          name="projeto_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Projeto (Opcional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                value={field.value || '__none__'}
                disabled={!centroCustoId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {projects?.data
                    ?.filter((p: any) => !centroCustoId || p.cost_center_id === centroCustoId)
                    ?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nome}
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
          name="condutor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Colaborador (Opcional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (Geral)</SelectItem>
                  {profiles?.data?.map((profile: any) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_orcado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Orçado (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="litros_orcados"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litros Orçados (Opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Informações adicionais sobre o orçamento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : budget ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

