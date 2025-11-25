// =====================================================
// FORMULÁRIO DE CONDUTORES
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateDriver, useUpdateDriver } from '@/hooks/frota/useFrotaData';

const driverSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cpf: z.string()
    .length(11, 'CPF deve ter exatamente 11 dígitos')
    .regex(/^[0-9]{11}$/, 'CPF deve conter apenas números')
    .optional()
    .or(z.literal('')),
  matricula: z.string().optional(),
  cnh_numero: z.string().optional(),
  cnh_categoria: z.string().optional(),
  cnh_validade: z.string().optional(),
  ader_validade: z.string().optional(),
  user_id: z.string().optional(),
});

type DriverFormData = z.infer<typeof driverSchema>;

interface DriverFormProps {
  isOpen: boolean;
  onClose: () => void;
  driver?: any; // Para edição
  onSuccess?: () => void;
}

export default function DriverForm({ isOpen, onClose, driver, onSuccess }: DriverFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      nome: driver?.nome || '',
      cpf: driver?.cpf || '',
      matricula: driver?.matricula || '',
      cnh_numero: driver?.cnh_numero || '',
      cnh_categoria: driver?.cnh_categoria || '',
      cnh_validade: driver?.cnh_validade || '',
      ader_validade: driver?.ader_validade || '',
      user_id: driver?.user_id || '',
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    try {
      setIsSubmitting(true);
      
      if (driver) {
        // Editar condutor existente
        await updateDriver.mutateAsync({
          id: driver.id,
          data: {
            ...data,
            cpf: data.cpf || null,
            cnh_validade: data.cnh_validade || null,
            ader_validade: data.ader_validade || null,
            user_id: data.user_id || null,
          }
        });
      } else {
        // Criar novo condutor
        await createDriver.mutateAsync({
          ...data,
          cpf: data.cpf || null,
          cnh_validade: data.cnh_validade || null,
          ader_validade: data.ader_validade || null,
          user_id: data.user_id || null,
        });
      }
      
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar condutor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const formatCPF = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatDate = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {driver ? 'Editar Condutor' : 'Novo Condutor'}
          </DialogTitle>
          <DialogDescription>
            {driver 
              ? 'Atualize as informações do condutor' 
              : 'Preencha as informações do novo condutor'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CPF */}
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
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

              {/* Matrícula */}
              <FormField
                control={form.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Número da CNH */}
              <FormField
                control={form.control}
                name="cnh_numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da CNH</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678901" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categoria da CNH */}
              <FormField
                control={form.control}
                name="cnh_categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria da CNH</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">A - Motocicleta</SelectItem>
                        <SelectItem value="B">B - Carro</SelectItem>
                        <SelectItem value="C">C - Caminhão</SelectItem>
                        <SelectItem value="D">D - Ônibus</SelectItem>
                        <SelectItem value="E">E - Carreta</SelectItem>
                        <SelectItem value="AB">AB - Moto e Carro</SelectItem>
                        <SelectItem value="AC">AC - Moto e Caminhão</SelectItem>
                        <SelectItem value="AD">AD - Moto e Ônibus</SelectItem>
                        <SelectItem value="AE">AE - Moto e Carreta</SelectItem>
                        <SelectItem value="BC">BC - Carro e Caminhão</SelectItem>
                        <SelectItem value="BD">BD - Carro e Ônibus</SelectItem>
                        <SelectItem value="BE">BE - Carro e Carreta</SelectItem>
                        <SelectItem value="CD">CD - Caminhão e Ônibus</SelectItem>
                        <SelectItem value="CE">CE - Caminhão e Carreta</SelectItem>
                        <SelectItem value="DE">DE - Ônibus e Carreta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Validade da CNH */}
              <FormField
                control={form.control}
                name="cnh_validade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade da CNH</FormLabel>
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

              {/* Validade da ADER */}
              <FormField
                control={form.control}
                name="ader_validade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade da ADER</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Autorização de Dirigir da Empresa
                    </FormDescription>
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
                {isSubmitting ? 'Salvando...' : (driver ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
