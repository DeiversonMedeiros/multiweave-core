// =====================================================
// COMPONENTE: FORMULÁRIO DE LANÇAMENTO CONTÁBIL
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar lançamentos contábeis
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { FileText, Save, X, AlertCircle, Plus, Trash2, Calculator, Hash } from 'lucide-react';
import { LancamentoContabil, LancamentoFormData, PlanoContas, CentroCusto } from '@/integrations/supabase/financial-types';

// Schema de validação
const lancamentoSchema = z.object({
  data_lancamento: z.string().min(1, 'Data de lançamento é obrigatória'),
  data_competencia: z.string().min(1, 'Data de competência é obrigatória'),
  numero_documento: z.string().min(1, 'Número do documento é obrigatório'),
  historico: z.string().min(1, 'Histórico é obrigatório'),
  valor_total: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  tipo_lancamento: z.enum(['manual', 'automatico', 'importado']),
  origem: z.enum(['contas_pagar', 'contas_receber', 'tesouraria', 'fiscal', 'manual']),
  origem_id: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(z.object({
    conta_id: z.string().min(1, 'Conta é obrigatória'),
    centro_custo_id: z.string().optional(),
    debito: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
    credito: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
    historico: z.string().min(1, 'Histórico é obrigatório'),
  })).min(2, 'Mínimo de 2 itens é necessário'),
});

type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

interface LancamentoFormProps {
  lancamento?: LancamentoContabil | null;
  onSave: (data: LancamentoFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function LancamentoForm({ lancamento, onSave, onCancel, loading = false }: LancamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      data_lancamento: new Date().toISOString().split('T')[0],
      data_competencia: new Date().toISOString().split('T')[0],
      numero_documento: '',
      historico: '',
      valor_total: 0,
      tipo_lancamento: 'manual',
      origem: 'manual',
      origem_id: '',
      observacoes: '',
      itens: [
        { conta_id: '', centro_custo_id: '', debito: 0, credito: 0, historico: '' },
        { conta_id: '', centro_custo_id: '', debito: 0, credito: 0, historico: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  });

  // Carregar dados auxiliares
  useEffect(() => {
    // Simular carregamento de dados
    setPlanoContas([
      { id: '1', codigo: '1.1.01', nome: 'Caixa', tipo: 'ativo', nivel: 3, aceita_lancamento: true, saldo_inicial: 0, saldo_atual: 0, natureza: 'devedora', is_active: true, created_at: '', updated_at: '', company_id: '' },
      { id: '2', codigo: '1.1.02', nome: 'Banco Conta Corrente', tipo: 'ativo', nivel: 3, aceita_lancamento: true, saldo_inicial: 0, saldo_atual: 0, natureza: 'devedora', is_active: true, created_at: '', updated_at: '', company_id: '' },
      { id: '3', codigo: '3.1.01', nome: 'Receita de Vendas', tipo: 'receita', nivel: 3, aceita_lancamento: true, saldo_inicial: 0, saldo_atual: 0, natureza: 'credora', is_active: true, created_at: '', updated_at: '', company_id: '' },
      { id: '4', codigo: '4.1.01', nome: 'Despesas Administrativas', tipo: 'despesa', nivel: 3, aceita_lancamento: true, saldo_inicial: 0, saldo_atual: 0, natureza: 'devedora', is_active: true, created_at: '', updated_at: '', company_id: '' },
    ]);

    setCentrosCusto([
      { id: '1', codigo: 'CC001', nome: 'Administrativo', tipo: 'administrativo', ativo: true, is_active: true, created_at: '', updated_at: '', company_id: '' },
      { id: '2', codigo: 'CC002', nome: 'Comercial', tipo: 'comercial', ativo: true, is_active: true, created_at: '', updated_at: '', company_id: '' },
      { id: '3', codigo: 'CC003', nome: 'Produção', tipo: 'producao', ativo: true, is_active: true, created_at: '', updated_at: '', company_id: '' },
    ]);
  }, []);

  // Preencher formulário quando editar
  useEffect(() => {
    if (lancamento) {
      form.reset({
        data_lancamento: lancamento.data_lancamento,
        data_competencia: lancamento.data_competencia,
        numero_documento: lancamento.numero_documento,
        historico: lancamento.historico,
        valor_total: lancamento.valor_total,
        tipo_lancamento: lancamento.tipo_lancamento,
        origem: lancamento.origem,
        origem_id: lancamento.origem_id || '',
        observacoes: lancamento.observacoes || '',
        itens: [
          { conta_id: '', centro_custo_id: '', debito: 0, credito: 0, historico: '' },
          { conta_id: '', centro_custo_id: '', debito: 0, credito: 0, historico: '' },
        ],
      });
    }
  }, [lancamento, form]);

  const onSubmit = async (data: LancamentoFormValues) => {
    try {
      setIsSubmitting(true);
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
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

  // Calcular totais
  const totalDebitos = form.watch('itens')?.reduce((sum, item) => sum + (item.debito || 0), 0) || 0;
  const totalCreditos = form.watch('itens')?.reduce((sum, item) => sum + (item.credito || 0), 0) || 0;
  const diferenca = totalDebitos - totalCreditos;

  const addItem = () => {
    append({ conta_id: '', centro_custo_id: '', debito: 0, credito: 0, historico: '' });
  };

  const removeItem = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {lancamento ? 'Editar Lançamento' : 'Novo Lançamento Contábil'}
          </CardTitle>
          <CardDescription>
            {lancamento ? 'Edite os dados do lançamento' : 'Preencha os dados para criar um novo lançamento'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_lancamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Lançamento *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_competencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Competência *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero_documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Documento *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_lancamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Lançamento *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatico">Automático</SelectItem>
                          <SelectItem value="importado">Importado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a origem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="contas_pagar">Contas a Pagar</SelectItem>
                          <SelectItem value="contas_receber">Contas a Receber</SelectItem>
                          <SelectItem value="tesouraria">Tesouraria</SelectItem>
                          <SelectItem value="fiscal">Fiscal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="historico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Histórico *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do lançamento contábil"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Itens do Lançamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens do Lançamento</CardTitle>
                  <CardDescription>
                    Débitos e créditos do lançamento contábil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.conta_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conta *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a conta" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {planoContas.map((conta) => (
                                  <SelectItem key={conta.id} value={conta.id}>
                                    {conta.codigo} - {conta.descricao}
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
                        name={`itens.${index}.centro_custo_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Custo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o centro" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {centrosCusto.map((centro) => (
                                  <SelectItem key={centro.id} value={centro.id}>
                                    {centro.codigo} - {centro.nome}
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
                        name={`itens.${index}.debito`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Débito</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`itens.${index}.credito`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crédito</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`itens.${index}.historico`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Histórico *</FormLabel>
                            <FormControl>
                              <Input placeholder="Histórico do item" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </CardContent>
              </Card>

              {/* Totais */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Label className="text-sm font-medium text-muted-foreground">Total Débitos</Label>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(totalDebitos)}
                      </p>
                    </div>
                    <div className="text-center">
                      <Label className="text-sm font-medium text-muted-foreground">Total Créditos</Label>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(totalCreditos)}
                      </p>
                    </div>
                    <div className="text-center">
                      <Label className="text-sm font-medium text-muted-foreground">Diferença</Label>
                      <p className={`text-lg font-semibold ${diferenca === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(diferenca))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais sobre o lançamento"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {diferenca !== 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    O lançamento não está balanceado. A diferença entre débitos e créditos deve ser zero.
                  </AlertDescription>
                </Alert>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || loading || diferenca !== 0}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {lancamento ? 'Atualizar' : 'Criar'}
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
