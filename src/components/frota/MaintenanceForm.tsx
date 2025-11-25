// =====================================================
// FORMULÁRIO DE MANUTENÇÕES
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateMaintenance, useUpdateMaintenance } from '@/hooks/frota/useFrotaData';
import { MaintenanceType, MaintenanceStatus } from '@/types/frota';

const maintenanceSchema = z.object({
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  tipo: z.enum(['preventiva', 'corretiva'], {
    required_error: 'Selecione o tipo de manutenção',
  }),
  descricao: z.string()
    .min(5, 'Descrição deve ter pelo menos 5 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  observacoes: z.string().optional(),
  oficina: z.string().optional(),
  data_agendada: z.string().optional(),
  km_proxima: z.number().min(0, 'KM próxima não pode ser negativo').optional(),
  quilometragem_atual: z.number().min(0, 'Quilometragem atual não pode ser negativa').optional(),
  valor: z.number().min(0, 'Valor não pode ser negativo').optional(),
  status: z.enum(['pendente', 'em_execucao', 'finalizada']).optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance?: any; // Para edição
  onSuccess?: () => void;
}

export default function MaintenanceForm({ isOpen, onClose, maintenance, onSuccess }: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenance();

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicle_id: maintenance?.vehicle_id || '',
      tipo: maintenance?.tipo || 'preventiva',
      descricao: maintenance?.descricao || '',
      observacoes: maintenance?.observacoes || '',
      oficina: maintenance?.oficina || '',
      data_agendada: maintenance?.data_agendada || '',
      km_proxima: maintenance?.km_proxima || undefined,
      quilometragem_atual: maintenance?.quilometragem_atual || undefined,
      valor: maintenance?.valor || undefined,
      status: maintenance?.status || 'pendente',
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      setIsSubmitting(true);
      
      if (maintenance) {
        // Editar manutenção existente
        await updateMaintenance.mutateAsync({
          id: maintenance.id,
          data: {
            ...data,
            data_agendada: data.data_agendada || null,
            km_proxima: data.km_proxima || null,
            quilometragem_atual: data.quilometragem_atual || null,
            valor: data.valor || null,
          }
        });
      } else {
        // Criar nova manutenção
        await createMaintenance.mutateAsync({
          ...data,
          data_agendada: data.data_agendada || null,
          km_proxima: data.km_proxima || null,
          quilometragem_atual: data.quilometragem_atual || null,
          valor: data.valor || null,
        });
      }
      
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar manutenção:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
          </DialogTitle>
          <DialogDescription>
            {maintenance 
              ? 'Atualize as informações da manutenção' 
              : 'Preencha as informações da nova manutenção'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Veículo */}
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Aqui você pode carregar a lista de veículos */}
                        <SelectItem value="1">ABC-1234 - Toyota Corolla</SelectItem>
                        <SelectItem value="2">DEF-5678 - Honda Civic</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <FormLabel>Tipo de Manutenção *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="preventiva">Preventiva</SelectItem>
                        <SelectItem value="corretiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva a manutenção a ser realizada..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Oficina */}
              <FormField
                control={form.control}
                name="oficina"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oficina</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da oficina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_execucao">Em Execução</SelectItem>
                        <SelectItem value="finalizada">Finalizada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data Agendada */}
              <FormField
                control={form.control}
                name="data_agendada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Agendada</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Data prevista para realização
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* KM Próxima */}
              <FormField
                control={form.control}
                name="km_proxima"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Próxima</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Quilometragem para próxima manutenção
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quilometragem Atual */}
              <FormField
                control={form.control}
                name="quilometragem_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem Atual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valor */}
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor em reais (R$)
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
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#049940] hover:bg-[#038830]">
                {isSubmitting ? 'Salvando...' : (maintenance ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
