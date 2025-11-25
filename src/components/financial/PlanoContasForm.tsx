// =====================================================
// COMPONENTE: FORMULÁRIO DE PLANO DE CONTAS
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar plano de contas
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BookOpen, Save, X, AlertCircle, Calculator, Hash } from 'lucide-react';
import { PlanoContas, PlanoContasFormData } from '@/integrations/supabase/financial-types';

// Schema de validação
const planoContasSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tipo_conta: z.enum(['ativo', 'passivo', 'patrimonio', 'receita', 'despesa', 'custos']),
  nivel: z.number().min(1, 'Nível deve ser maior que zero'),
  conta_pai_id: z.string().optional(),
  aceita_lancamento: z.boolean(),
  saldo_inicial: z.number().min(0, 'Saldo inicial deve ser maior ou igual a zero'),
  natureza: z.enum(['devedora', 'credora']),
  observacoes: z.string().optional(),
});

type PlanoContasFormValues = z.infer<typeof planoContasSchema>;

interface PlanoContasFormProps {
  conta?: PlanoContas | null;
  onSave: (data: PlanoContasFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PlanoContasForm({ conta, onSave, onCancel, loading = false }: PlanoContasFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlanoContasFormValues>({
    resolver: zodResolver(planoContasSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
      tipo_conta: 'ativo',
      nivel: 1,
      conta_pai_id: '',
      aceita_lancamento: true,
      saldo_inicial: 0,
      natureza: 'devedora',
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (conta) {
      form.reset({
        codigo: conta.codigo,
        descricao: conta.descricao,
        tipo_conta: conta.tipo_conta,
        nivel: conta.nivel,
        conta_pai_id: conta.conta_pai_id || '',
        aceita_lancamento: conta.aceita_lancamento,
        saldo_inicial: conta.saldo_inicial,
        natureza: conta.natureza || 'devedora',
        observacoes: conta.observacoes || '',
      });
    }
  }, [conta, form]);

  const onSubmit = async (data: PlanoContasFormValues) => {
    try {
      setIsSubmitting(true);
      // Converter para o formato esperado pela interface PlanoContasFormData
      // A interface ainda usa 'nome' mas mapeamos de 'descricao' para compatibilidade
      // O EntityService enviará os dados diretamente ao banco, então precisamos mapear corretamente
      const formData: PlanoContasFormData = {
        codigo: data.codigo,
        nome: data.descricao, // Mapear descricao para nome (interface ainda usa nome)
        tipo: data.tipo_conta === 'patrimonio' ? 'patrimonio_liquido' : data.tipo_conta as any,
        nivel: data.nivel,
        conta_pai_id: data.conta_pai_id || undefined,
        aceita_lancamento: data.aceita_lancamento,
        saldo_inicial: data.saldo_inicial,
        natureza: data.natureza,
        observacoes: data.observacoes,
      };
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar plano de contas:', error);
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

  const getTipoDescription = (tipo: string) => {
    const descriptions = {
      ativo: 'Bens e direitos da empresa',
      passivo: 'Obrigações e dívidas da empresa',
      patrimonio_liquido: 'Capital próprio da empresa',
      receita: 'Entradas de recursos da empresa',
      despesa: 'Saídas de recursos da empresa',
      custos: 'Custos de produção e serviços',
    };
    return descriptions[tipo as keyof typeof descriptions] || '';
  };

  const getNaturezaDescription = (natureza: string) => {
    return natureza === 'devedora' 
      ? 'Aumenta com débitos e diminui com créditos'
      : 'Aumenta com créditos e diminui com débitos';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {conta ? 'Editar Conta' : 'Nova Conta no Plano de Contas'}
          </CardTitle>
          <CardDescription>
            {conta ? 'Edite os dados da conta' : 'Preencha os dados para criar uma nova conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Conta *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1.1.01" {...field} />
                      </FormControl>
                      <FormDescription>
                        Código único da conta no plano
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Conta *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Caixa" {...field} />
                      </FormControl>
                      <FormDescription>
                        Descrição da conta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_conta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo da Conta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="passivo">Passivo</SelectItem>
                          <SelectItem value="patrimonio">Patrimônio Líquido</SelectItem>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                          <SelectItem value="custos">Custos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {getTipoDescription(field.value)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nivel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível da Conta *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Nível hierárquico da conta (1-10)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conta_pai_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Pai</FormLabel>
                      <FormControl>
                        <Input placeholder="ID da conta pai (opcional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Conta superior na hierarquia (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="natureza"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Natureza da Conta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a natureza" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="devedora">Devedora</SelectItem>
                          <SelectItem value="credora">Credora</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {getNaturezaDescription(field.value)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="saldo_inicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo Inicial</FormLabel>
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
                        Saldo inicial da conta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aceita_lancamento"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Aceita Lançamentos
                        </FormLabel>
                        <FormDescription>
                          Permite lançamentos diretos nesta conta
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                        placeholder="Observações adicionais sobre a conta"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O código da conta deve ser único e seguir a hierarquia do plano de contas. 
                  Contas de nível superior não podem aceitar lançamentos diretos.
                </AlertDescription>
              </Alert>

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
