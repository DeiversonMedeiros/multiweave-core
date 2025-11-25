// =====================================================
// FORMULÁRIO DE VEÍCULOS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCreateVehicle, useUpdateVehicle } from '@/hooks/frota/useFrotaData';
import { VehicleType, VehicleStatus } from '@/types/frota';

const vehicleSchema = z.object({
  tipo: z.enum(['proprio', 'locado', 'agregado'], {
    required_error: 'Selecione o tipo de veículo',
  }),
  placa: z.string()
    .min(7, 'Placa deve ter pelo menos 7 caracteres')
    .max(8, 'Placa deve ter no máximo 8 caracteres')
    .regex(/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/, 'Formato de placa inválido'),
  renavam: z.string()
    .length(11, 'RENAVAM deve ter exatamente 11 dígitos')
    .regex(/^[0-9]{11}$/, 'RENAVAM deve conter apenas números')
    .optional()
    .or(z.literal('')),
  chassi: z.string()
    .length(17, 'Chassi deve ter exatamente 17 caracteres')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Formato de chassi inválido')
    .optional()
    .or(z.literal('')),
  marca: z.string().min(2, 'Marca deve ter pelo menos 2 caracteres').optional(),
  modelo: z.string().min(2, 'Modelo deve ter pelo menos 2 caracteres').optional(),
  ano: z.number()
    .min(1900, 'Ano deve ser maior que 1900')
    .max(new Date().getFullYear() + 1, 'Ano não pode ser maior que o próximo ano')
    .optional(),
  cor: z.string().optional(),
  quilometragem: z.number()
    .min(0, 'Quilometragem não pode ser negativa')
    .optional(),
  situacao: z.enum(['ativo', 'inativo', 'manutencao']).optional(),
  proprietario_id: z.string().optional(),
  locadora: z.string().optional(),
  colaborador_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: any; // Para edição
  onSuccess?: () => void;
}

export default function VehicleForm({ isOpen, onClose, vehicle, onSuccess }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      tipo: vehicle?.tipo || 'proprio',
      placa: vehicle?.placa || '',
      renavam: vehicle?.renavam || '',
      chassi: vehicle?.chassi || '',
      marca: vehicle?.marca || '',
      modelo: vehicle?.modelo || '',
      ano: vehicle?.ano || undefined,
      cor: vehicle?.cor || '',
      quilometragem: vehicle?.quilometragem || 0,
      situacao: vehicle?.situacao || 'ativo',
      proprietario_id: vehicle?.proprietario_id || '',
      locadora: vehicle?.locadora || '',
      colaborador_id: vehicle?.colaborador_id || '',
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      setIsSubmitting(true);
      
      if (vehicle) {
        // Editar veículo existente
        await updateVehicle.mutateAsync({
          id: vehicle.id,
          data: {
            ...data,
            renavam: data.renavam || null,
            chassi: data.chassi || null,
            proprietario_id: data.proprietario_id || null,
            colaborador_id: data.colaborador_id || null,
          }
        });
      } else {
        // Criar novo veículo
        await createVehicle.mutateAsync({
          ...data,
          renavam: data.renavam || null,
          chassi: data.chassi || null,
          proprietario_id: data.proprietario_id || null,
          colaborador_id: data.colaborador_id || null,
        });
      }
      
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
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
            {vehicle ? 'Editar Veículo' : 'Novo Veículo'}
          </DialogTitle>
          <DialogDescription>
            {vehicle 
              ? 'Atualize as informações do veículo' 
              : 'Preencha as informações do novo veículo'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Veículo */}
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Veículo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="proprio">Próprio</SelectItem>
                        <SelectItem value="locado">Locado</SelectItem>
                        <SelectItem value="agregado">Agregado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Placa */}
              <FormField
                control={form.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ABC-1234 ou ABC1D23" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>
                      Formato: ABC-1234 ou ABC1D23
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RENAVAM */}
              <FormField
                control={form.control}
                name="renavam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RENAVAM</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        maxLength={11}
                      />
                    </FormControl>
                    <FormDescription>
                      11 dígitos numéricos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Chassi */}
              <FormField
                control={form.control}
                name="chassi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassi</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="1HGBH41JXMN109186" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={17}
                      />
                    </FormControl>
                    <FormDescription>
                      17 caracteres alfanuméricos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Marca */}
              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Modelo */}
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Corolla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ano */}
              <FormField
                control={form.control}
                name="ano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="2023"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cor */}
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input placeholder="Branco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quilometragem */}
              <FormField
                control={form.control}
                name="quilometragem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem Atual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Em quilômetros
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Situação */}
              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="manutencao">Em Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Locadora (apenas para veículos locados) */}
              {form.watch('tipo') === 'locado' && (
                <FormField
                  control={form.control}
                  name="locadora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locadora</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da locadora" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#049940] hover:bg-[#038830]">
                {isSubmitting ? 'Salvando...' : (vehicle ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
