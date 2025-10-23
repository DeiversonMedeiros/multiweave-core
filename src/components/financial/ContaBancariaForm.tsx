// =====================================================
// COMPONENTE: FORMULÁRIO DE CONTA BANCÁRIA
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar contas bancárias
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building, DollarSign, Save, X, AlertCircle } from 'lucide-react';
import { ContaBancaria, ContaBancariaFormData } from '@/integrations/supabase/financial-types';

// Schema de validação
const contaBancariaSchema = z.object({
  banco_codigo: z.string().min(1, 'Código do banco é obrigatório'),
  banco_nome: z.string().min(1, 'Nome do banco é obrigatório'),
  agencia: z.string().min(1, 'Agência é obrigatória'),
  conta: z.string().min(1, 'Conta é obrigatória'),
  tipo_conta: z.enum(['corrente', 'poupanca', 'investimento']),
  moeda: z.string().min(1, 'Moeda é obrigatória'),
  limite_credito: z.number().min(0).optional(),
  observacoes: z.string().optional(),
});

type ContaBancariaFormValues = z.infer<typeof contaBancariaSchema>;

interface ContaBancariaFormProps {
  conta?: ContaBancaria | null;
  onSave: (data: ContaBancariaFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ContaBancariaForm({ conta, onSave, onCancel, loading = false }: ContaBancariaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContaBancariaFormValues>({
    resolver: zodResolver(contaBancariaSchema),
    defaultValues: {
      banco_codigo: '',
      banco_nome: '',
      agencia: '',
      conta: '',
      tipo_conta: 'corrente',
      moeda: 'BRL',
      limite_credito: 0,
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (conta) {
      form.reset({
        banco_codigo: conta.banco_codigo,
        banco_nome: conta.banco_nome,
        agencia: conta.agencia,
        conta: conta.conta,
        tipo_conta: conta.tipo_conta,
        moeda: conta.moeda,
        limite_credito: conta.limite_credito,
        observacoes: conta.observacoes || '',
      });
    }
  }, [conta, form]);

  const onSubmit = async (data: ContaBancariaFormValues) => {
    try {
      setIsSubmitting(true);
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {conta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
          </CardTitle>
          <CardDescription>
            {conta ? 'Edite os dados da conta bancária' : 'Preencha os dados para criar uma nova conta bancária'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="banco_codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Banco *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Código FEBRABAN do banco
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="banco_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Banco *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Banco do Brasil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agência *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12345-6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_conta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupanca">Conta Poupança</SelectItem>
                          <SelectItem value="investimento">Conta Investimento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moeda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moeda *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a moeda" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BRL">Real (BRL)</SelectItem>
                          <SelectItem value="USD">Dólar (USD)</SelectItem>
                          <SelectItem value="EUR">Euro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="limite_credito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Crédito</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Limite de crédito disponível na conta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais sobre a conta"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || loading}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {conta ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
