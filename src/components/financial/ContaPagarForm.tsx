// =====================================================
// COMPONENTE: FORMULÁRIO DE CONTA A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar contas a pagar
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Building, DollarSign, FileText, Save, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ContaPagar, ContaPagarFormData } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useCompany } from '@/lib/company-context';

// Schema de validação
const contaPagarSchema = z.object({
  numero_titulo: z.string().optional(),
  fornecedor_id: z.string().optional(),
  fornecedor_nome: z.string().min(1, 'Nome do fornecedor é obrigatório'),
  fornecedor_cnpj: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor_original: z.number().min(0.01, 'Valor deve ser maior que zero'),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  centro_custo_id: z.string().optional(),
  projeto_id: z.string().optional(),
  departamento: z.string().optional(),
  classe_financeira: z.string().optional(),
  categoria: z.string().optional(),
  forma_pagamento: z.string().optional(),
  conta_bancaria_id: z.string().optional(),
  observacoes: z.string().optional(),
  anexos: z.array(z.string()).optional(),
});

type ContaPagarFormValues = z.infer<typeof contaPagarSchema>;

interface ContaPagarFormProps {
  conta?: ContaPagar | null;
  onSave: (data: ContaPagarFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ContaPagarForm({ conta, onSave, onCancel, loading = false }: ContaPagarFormProps) {
  const { selectedCompany } = useCompany();
  const { data: costCentersData, isLoading: loadingCostCenters } = useCostCenters();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarSchema),
    defaultValues: {
      numero_titulo: '',
      fornecedor_id: '',
      fornecedor_nome: '',
      fornecedor_cnpj: '',
      descricao: '',
      valor_original: 0,
      data_emissao: format(new Date(), 'yyyy-MM-dd'),
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      centro_custo_id: '',
      projeto_id: '',
      departamento: '',
      classe_financeira: '',
      categoria: '',
      forma_pagamento: '',
      conta_bancaria_id: '',
      observacoes: '',
      anexos: [],
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (conta) {
      form.reset({
        numero_titulo: conta.numero_titulo || '',
        fornecedor_id: conta.fornecedor_id || '',
        fornecedor_nome: conta.fornecedor_nome || '',
        fornecedor_cnpj: conta.fornecedor_cnpj || '',
        descricao: conta.descricao,
        valor_original: conta.valor_original,
        data_emissao: conta.data_emissao,
        data_vencimento: conta.data_vencimento,
        centro_custo_id: conta.centro_custo_id || '',
        projeto_id: conta.projeto_id || '',
        departamento: conta.departamento || '',
        classe_financeira: conta.classe_financeira || '',
        categoria: conta.categoria || '',
        forma_pagamento: conta.forma_pagamento || '',
        conta_bancaria_id: conta.conta_bancaria_id || '',
        observacoes: conta.observacoes || '',
        anexos: conta.anexos || [],
      });
    }
  }, [conta, form]);

  const onSubmit = async (data: ContaPagarFormValues) => {
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
      console.error('Erro ao salvar conta:', error);
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
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {conta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </CardTitle>
          <CardDescription>
            {conta ? 'Edite os dados da conta a pagar' : 'Preencha os dados para criar uma nova conta a pagar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="dados-basicos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="complementar">Complementar</TabsTrigger>
                </TabsList>

                {/* Dados Básicos */}
                <TabsContent value="dados-basicos" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="numero_titulo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Deixe em branco para gerar automaticamente" {...field} />
                          </FormControl>
                          <FormDescription>
                            Se não informado, será gerado automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fornecedor_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Fornecedor *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do fornecedor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fornecedor_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ do Fornecedor</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="servicos">Serviços</SelectItem>
                              <SelectItem value="materiais">Materiais</SelectItem>
                              <SelectItem value="equipamentos">Equipamentos</SelectItem>
                              <SelectItem value="manutencao">Manutenção</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
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
                            placeholder="Descrição detalhada da conta a pagar"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Financeiro */}
                <TabsContent value="financeiro" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor_original"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Original *</FormLabel>
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
                            Valor original da conta sem juros ou multa
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_emissao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Emissão *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_vencimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Vencimento *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="forma_pagamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma de pagamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="transferencia">Transferência</SelectItem>
                              <SelectItem value="boleto">Boleto</SelectItem>
                              <SelectItem value="cartao">Cartão</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Complementar */}
                <TabsContent value="complementar" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      name="departamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Departamento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="classe_financeira"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Classe Financeira</FormLabel>
                          <FormControl>
                            <Input placeholder="Classe financeira" {...field} />
                          </FormControl>
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
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações adicionais"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

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

