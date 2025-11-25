// =====================================================
// FORMULÁRIO DE OCORRÊNCIAS
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

const incidentSchema = z.object({
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  driver_id: z.string().min(1, 'Selecione um condutor'),
  tipo: z.enum(['acidente', 'avaria', 'multa', 'roubo', 'furto', 'outros'], {
    required_error: 'Selecione o tipo de ocorrência',
  }),
  descricao: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
  local: z.string().min(2, 'Local deve ter pelo menos 2 caracteres'),
  data_ocorrencia: z.string().min(1, 'Data da ocorrência é obrigatória'),
  hora_ocorrencia: z.string().min(1, 'Hora da ocorrência é obrigatória'),
  valor_dano: z.number().min(0, 'Valor do dano não pode ser negativo').optional(),
  observacoes: z.string().optional(),
  status: z.enum(['aberta', 'em_analise', 'resolvida', 'arquivada']).optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

interface IncidentFormProps {
  isOpen: boolean;
  onClose: () => void;
  incident?: any; // Para edição
  onSuccess?: () => void;
}

export default function IncidentForm({ isOpen, onClose, incident, onSuccess }: IncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      vehicle_id: incident?.vehicle_id || '',
      driver_id: incident?.driver_id || '',
      tipo: incident?.tipo || 'acidente',
      descricao: incident?.descricao || '',
      local: incident?.local || '',
      data_ocorrencia: incident?.data_ocorrencia || '',
      hora_ocorrencia: incident?.hora_ocorrencia || '',
      valor_dano: incident?.valor_dano || undefined,
      observacoes: incident?.observacoes || '',
      status: incident?.status || 'aberta',
    },
  });

  const onSubmit = async (data: IncidentFormData) => {
    try {
      setIsSubmitting(true);
      
      // Aqui você implementaria a lógica para salvar a ocorrência
      console.log('Dados da ocorrência:', data);
      
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
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
            {incident ? 'Editar Ocorrência' : 'Nova Ocorrência'}
          </DialogTitle>
          <DialogDescription>
            {incident 
              ? 'Atualize as informações da ocorrência' 
              : 'Registre uma nova ocorrência'
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
                        <SelectItem value="1">ABC-1234 - Toyota Corolla</SelectItem>
                        <SelectItem value="2">DEF-5678 - Honda Civic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Condutor */}
              <FormField
                control={form.control}
                name="driver_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condutor *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o condutor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">João da Silva</SelectItem>
                        <SelectItem value="2">Maria Santos</SelectItem>
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
                    <FormLabel>Tipo de Ocorrência *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="acidente">Acidente</SelectItem>
                        <SelectItem value="avaria">Avaria</SelectItem>
                        <SelectItem value="multa">Multa</SelectItem>
                        <SelectItem value="roubo">Roubo</SelectItem>
                        <SelectItem value="furto">Furto</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="em_analise">Em Análise</SelectItem>
                        <SelectItem value="resolvida">Resolvida</SelectItem>
                        <SelectItem value="arquivada">Arquivada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data da Ocorrência */}
              <FormField
                control={form.control}
                name="data_ocorrencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Ocorrência *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hora da Ocorrência */}
              <FormField
                control={form.control}
                name="hora_ocorrencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora da Ocorrência *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Local */}
              <FormField
                control={form.control}
                name="local"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Local da Ocorrência *</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço ou local onde ocorreu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valor do Dano */}
              <FormField
                control={form.control}
                name="valor_dano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Dano</FormLabel>
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

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente o que aconteceu..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
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
                {isSubmitting ? 'Salvando...' : (incident ? 'Atualizar' : 'Registrar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
