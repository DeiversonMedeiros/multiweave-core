import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import type { RefuelLimit } from '@/types/combustivel';

const limitSchema = z.object({
  tipo_limite: z.enum(['veiculo', 'colaborador', 'centro_custo', 'projeto']),
  veiculo_id: z.string().optional().nullable(),
  colaborador_id: z.string().optional().nullable(),
  centro_custo_id: z.string().optional().nullable(),
  projeto_id: z.string().optional().nullable(),
  limite_mensal_litros: z.number().min(0).optional().nullable(),
  limite_mensal_valor: z.number().min(0).optional().nullable(),
  periodo_inicio: z.string().optional().nullable(),
  periodo_fim: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

type LimitFormData = z.infer<typeof limitSchema>;

interface RefuelLimitFormProps {
  limit?: RefuelLimit | null;
  onSubmit: (data: Partial<RefuelLimit>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RefuelLimitForm({ limit, onSubmit, onCancel, isLoading }: RefuelLimitFormProps) {
  const { selectedCompany } = useCompany();
  const { data: vehicles } = useVehicles({ situacao: 'ativo' });
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

  const form = useForm<LimitFormData>({
    resolver: zodResolver(limitSchema),
    defaultValues: {
      tipo_limite: limit?.tipo_limite || 'veiculo',
      veiculo_id: limit?.veiculo_id || undefined,
      colaborador_id: limit?.colaborador_id || undefined,
      centro_custo_id: limit?.centro_custo_id || undefined,
      projeto_id: limit?.projeto_id || undefined,
      limite_mensal_litros: limit?.limite_mensal_litros || undefined,
      limite_mensal_valor: limit?.limite_mensal_valor || undefined,
      periodo_inicio: limit?.periodo_inicio || undefined,
      periodo_fim: limit?.periodo_fim || undefined,
      ativo: limit?.ativo ?? true,
    },
  });

  const tipoLimite = form.watch('tipo_limite');

  useEffect(() => {
    // Limpar campos quando o tipo de limite muda
    form.resetField('veiculo_id');
    form.resetField('colaborador_id');
    form.resetField('centro_custo_id');
    form.resetField('projeto_id');
  }, [tipoLimite, form]);

  const handleSubmit = (data: LimitFormData) => {
    // Garantir que apenas o campo relevante ao tipo seja enviado
    const submitData: Partial<RefuelLimit> = {
      tipo_limite: data.tipo_limite,
      limite_mensal_litros: data.limite_mensal_litros || undefined,
      limite_mensal_valor: data.limite_mensal_valor || undefined,
      periodo_inicio: data.periodo_inicio || undefined,
      periodo_fim: data.periodo_fim || undefined,
      ativo: data.ativo,
    };

    if (data.tipo_limite === 'veiculo') {
      submitData.veiculo_id = data.veiculo_id || undefined;
    } else if (data.tipo_limite === 'colaborador') {
      submitData.colaborador_id = data.colaborador_id || undefined;
    } else if (data.tipo_limite === 'centro_custo') {
      submitData.centro_custo_id = data.centro_custo_id || undefined;
    } else if (data.tipo_limite === 'projeto') {
      submitData.projeto_id = data.projeto_id || undefined;
    }

    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tipo_limite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Limite</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="veiculo">Por Veículo</SelectItem>
                  <SelectItem value="colaborador">Por Colaborador</SelectItem>
                  <SelectItem value="centro_custo">Por Centro de Custo</SelectItem>
                  <SelectItem value="projeto">Por Projeto</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipoLimite === 'veiculo' && (
          <FormField
            control={form.control}
            name="veiculo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles?.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa} - {vehicle.modelo || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {tipoLimite === 'colaborador' && (
          <FormField
            control={form.control}
            name="colaborador_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colaborador</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        )}

        {tipoLimite === 'centro_custo' && (
          <FormField
            control={form.control}
            name="centro_custo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Custo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {costCenters?.data?.map((cc) => (
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
        )}

        {tipoLimite === 'projeto' && (
          <FormField
            control={form.control}
            name="projeto_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects?.data?.map((project) => (
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="limite_mensal_litros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite Mensal (Litros)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="limite_mensal_valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite Mensal (Valor)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 3000.00"
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="periodo_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período Início</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="periodo_fim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período Fim</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Limite ativo e sendo aplicado
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : limit ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

