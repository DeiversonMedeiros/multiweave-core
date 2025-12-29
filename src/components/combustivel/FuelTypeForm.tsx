import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { FuelTypeConfig } from '@/types/combustivel';

const fuelTypeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['gasolina', 'etanol', 'diesel', 'diesel_s10', 'gnv', 'outros']),
  consumo_medio_km_l: z.number().min(0).optional().nullable(),
  ativo: z.boolean().default(true),
});

type FuelTypeFormData = z.infer<typeof fuelTypeSchema>;

interface FuelTypeFormProps {
  fuelType?: FuelTypeConfig | null;
  onSubmit: (data: Partial<FuelTypeConfig>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function FuelTypeForm({ fuelType, onSubmit, onCancel, isLoading }: FuelTypeFormProps) {
  const form = useForm<FuelTypeFormData>({
    resolver: zodResolver(fuelTypeSchema),
    defaultValues: {
      nome: fuelType?.nome || '',
      tipo: fuelType?.tipo || 'gasolina',
      consumo_medio_km_l: fuelType?.consumo_medio_km_l || undefined,
      ativo: fuelType?.ativo ?? true,
    },
  });

  const handleSubmit = (data: FuelTypeFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Gasolina Comum" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="etanol">Etanol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="diesel_s10">Diesel S10</SelectItem>
                  <SelectItem value="gnv">GNV</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consumo_medio_km_l"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consumo Médio (km/L)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 12.5"
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
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Tipo de combustível disponível para uso
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
            {isLoading ? 'Salvando...' : fuelType ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

