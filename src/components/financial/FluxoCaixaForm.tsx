// =====================================================
// COMPONENTE: FORMULÁRIO DE FLUXO DE CAIXA
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar projeções de fluxo de caixa
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
import { TrendingUp, TrendingDown, Save, X, AlertCircle, Calendar } from 'lucide-react';
import { FluxoCaixa, FluxoCaixaFormData } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useTesouraria } from '@/hooks/financial/useTesouraria';

// Schema de validação
const fluxoCaixaSchema = z.object({
  data_projecao: z.string().min(1, 'Data de projeção é obrigatória'),
  tipo_movimento: z.enum(['entrada', 'saida']),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  conta_bancaria_id: z.string().optional(),
  centro_custo_id: z.string().optional(),
  projeto_id: z.string().optional(),
  status: z.enum(['previsto', 'confirmado', 'realizado']).optional(),
  observacoes: z.string().optional(),
});

type FluxoCaixaFormValues = z.infer<typeof fluxoCaixaSchema>;

interface FluxoCaixaFormProps {
  fluxo?: FluxoCaixa | null;
  onSave: (data: FluxoCaixaFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function FluxoCaixaForm({ fluxo, onSave, onCancel, loading = false }: FluxoCaixaFormProps) {
  const { data: costCentersData, isLoading: loadingCostCenters } = useCostCenters();
  const { contasBancarias } = useTesouraria();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FluxoCaixaFormValues>({
    resolver: zodResolver(fluxoCaixaSchema),
    defaultValues: {
      data_projecao: new Date().toISOString().split('T')[0],
      tipo_movimento: 'entrada',
      categoria: '',
      descricao: '',
      valor: 0,
      conta_bancaria_id: '',
      centro_custo_id: '',
      projeto_id: '',
      status: 'previsto',
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (fluxo) {
      form.reset({
        data_projecao: fluxo.data_projecao,
        tipo_movimento: fluxo.tipo_movimento,
        categoria: fluxo.categoria,
        descricao: fluxo.descricao,
        valor: fluxo.valor,
        conta_bancaria_id: fluxo.conta_bancaria_id || '',
        centro_custo_id: fluxo.centro_custo_id || '',
        projeto_id: fluxo.projeto_id || '',
        status: fluxo.status,
        observacoes: fluxo.observacoes || '',
      });
    }
  }, [fluxo, form]);

  const onSubmit = async (data: FluxoCaixaFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Clean up special values before saving
      const cleanedData = {
        ...data,
        centro_custo_id: data.centro_custo_id === 'none' || data.centro_custo_id === 'loading' ? '' : data.centro_custo_id,
        conta_bancaria_id: data.conta_bancaria_id === 'none' || data.conta_bancaria_id === 'loading' ? '' : data.conta_bancaria_id,
      };
      
      await onSave(cleanedData);
    } catch (error) {
      console.error('Erro ao salvar fluxo de caixa:', error);
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
            {form.watch('tipo_movimento') === 'entrada' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {fluxo ? 'Editar Fluxo de Caixa' : 'Nova Projeção de Fluxo de Caixa'}
          </CardTitle>
          <CardDescription>
            {fluxo ? 'Edite os dados da projeção' : 'Preencha os dados para criar uma nova projeção de fluxo de caixa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_projecao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Projeção *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_movimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimento *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entrada">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Entrada
                            </div>
                          </SelectItem>
                          <SelectItem value="saida">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Saída
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vendas">Vendas</SelectItem>
                          <SelectItem value="recebimentos">Recebimentos</SelectItem>
                          <SelectItem value="investimentos">Investimentos</SelectItem>
                          <SelectItem value="financiamentos">Financiamentos</SelectItem>
                          <SelectItem value="compras">Compras</SelectItem>
                          <SelectItem value="fornecedores">Fornecedores</SelectItem>
                          <SelectItem value="salarios">Salários</SelectItem>
                          <SelectItem value="impostos">Impostos</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
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
                        Valor da projeção
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conta_bancaria_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Bancária</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma conta específica</SelectItem>
                          {contasBancarias.map((conta) => (
                            <SelectItem key={conta.id} value={conta.id}>
                              {conta.banco_nome} - {conta.agencia}/{conta.conta}
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
                  name="centro_custo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o centro de custo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum centro de custo</SelectItem>
                          {loadingCostCenters ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            (costCentersData?.data || []).map((centro) => (
                              <SelectItem key={centro.id} value={centro.id}>
                                {centro.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="previsto">Previsto</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="realizado">Realizado</SelectItem>
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
                      <FormControl>
                        <Input placeholder="ID do projeto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada da projeção"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="Observações adicionais"
                        className="min-h-[80px]"
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
                      {fluxo ? 'Atualizar' : 'Criar'}
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
