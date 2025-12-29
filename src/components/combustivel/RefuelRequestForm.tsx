import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useFuelTypes } from '@/hooks/combustivel/useCombustivel';
import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import type { RefuelRequest, RefuelRequestFormData } from '@/types/combustivel';

const refuelRequestSchema = z.object({
  condutor_id: z.string().min(1, 'Condutor é obrigatório'),
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  tipo_combustivel_id: z.string().optional(),
  rota: z.string().optional(),
  km_estimado: z.number().min(0).optional().nullable(),
  km_veiculo: z.number().min(0, 'KM do veículo é obrigatório'),
  valor_solicitado: z.number().min(0.01, 'Valor deve ser maior que zero'),
  litros_estimados: z.number().min(0).optional().nullable(),
  regiao: z.string().optional(),
  centro_custo_id: z.string().min(1, 'Centro de custo é obrigatório'),
  projeto_id: z.string().optional().nullable(),
  finalidade: z.enum(['logistica', 'os', 'manutencao', 'implantacao', 'outros']),
  os_number: z.string().optional(),
  observacoes: z.string().optional(),
});

type RefuelRequestFormData = z.infer<typeof refuelRequestSchema>;

interface RefuelRequestFormProps {
  request?: RefuelRequest | null;
  onSubmit: (data: RefuelRequestFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RefuelRequestForm({ request, onSubmit, onCancel, isLoading }: RefuelRequestFormProps) {
  const { selectedCompany } = useCompany();
  const { data: vehicles } = useVehicles({ situacao: 'ativo' });
  const { data: costCenters } = useCostCenters();
  const { data: projects } = useProjects();
  const { data: fuelTypes } = useFuelTypes({ ativo: true });
  
  // Hook para buscar profiles (condutores)
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

  const form = useForm<RefuelRequestFormData>({
    resolver: zodResolver(refuelRequestSchema),
    defaultValues: {
      condutor_id: request?.condutor_id || '',
      veiculo_id: request?.veiculo_id || '',
      tipo_combustivel_id: request?.tipo_combustivel_id || undefined,
      rota: request?.rota || '',
      km_estimado: request?.km_estimado || undefined,
      km_veiculo: request?.km_veiculo || 0,
      valor_solicitado: request?.valor_solicitado || 0,
      litros_estimados: request?.litros_estimados || undefined,
      regiao: request?.regiao || '',
      centro_custo_id: request?.centro_custo_id || '',
      projeto_id: request?.projeto_id || undefined,
      finalidade: request?.finalidade || 'logistica',
      os_number: request?.os_number || '',
      observacoes: request?.observacoes || '',
    },
  });

  const centroCustoId = form.watch('centro_custo_id');
  const veiculoId = form.watch('veiculo_id');

  // Buscar KM atual do veículo quando selecionado
  useEffect(() => {
    if (veiculoId && vehicles) {
      const vehicle = vehicles.find((v: any) => v.id === veiculoId);
      if (vehicle && vehicle.quilometragem) {
        form.setValue('km_veiculo', vehicle.quilometragem);
      }
    }
  }, [veiculoId, vehicles, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="condutor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condutor *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o condutor" />
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

          <FormField
            control={form.control}
            name="veiculo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="km_veiculo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM do Veículo *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
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
            name="km_estimado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM Estimado</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
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
            name="valor_solicitado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Solicitado (R$) *</FormLabel>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_combustivel_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Combustível</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                  value={field.value || '__none__'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Não especificado</SelectItem>
                    {fuelTypes?.data?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.nome}
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
            name="litros_estimados"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litros Estimados</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="centro_custo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Custo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                <FormLabel>Projeto</FormLabel>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="finalidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finalidade *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a finalidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="logistica">Logística</SelectItem>
                    <SelectItem value="os">Ordem de Serviço</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="implantacao">Implantação</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="os_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da OS</FormLabel>
                <FormControl>
                  <Input placeholder="Número da ordem de serviço" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rota</FormLabel>
                <FormControl>
                  <Input placeholder="Descrição da rota" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regiao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Região</FormLabel>
                <FormControl>
                  <Input placeholder="Região do abastecimento" {...field} />
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
                <Textarea placeholder="Informações adicionais" {...field} />
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
            {isLoading ? 'Salvando...' : request ? 'Atualizar' : 'Criar Solicitação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

