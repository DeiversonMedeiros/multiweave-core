// =====================================================
// COMPONENTE: FORMULÁRIO DE NF-e
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar NF-e
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
import { Receipt, Save, X, AlertCircle, Calculator, FileText } from 'lucide-react';
import { NFe, NFeFormData } from '@/integrations/supabase/financial-types';

// Schema de validação
const nfeSchema = z.object({
  numero_nfe: z.string().min(1, 'Número da NF-e é obrigatório'),
  serie: z.string().min(1, 'Série é obrigatória'),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_saida: z.string().optional(),
  valor_total: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  valor_icms: z.number().min(0, 'Valor ICMS deve ser maior ou igual a zero'),
  valor_ipi: z.number().min(0, 'Valor IPI deve ser maior ou igual a zero'),
  valor_pis: z.number().min(0, 'Valor PIS deve ser maior ou igual a zero'),
  valor_cofins: z.number().min(0, 'Valor COFINS deve ser maior ou igual a zero'),
  observacoes: z.string().optional(),
});

type NFeFormValues = z.infer<typeof nfeSchema>;

interface NFeFormProps {
  nfe?: NFe | null;
  onSave: (data: NFeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NFeForm({ nfe, onSave, onCancel, loading = false }: NFeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NFeFormValues>({
    resolver: zodResolver(nfeSchema),
    defaultValues: {
      numero_nfe: '',
      serie: '',
      data_emissao: new Date().toISOString().split('T')[0],
      data_saida: '',
      valor_total: 0,
      valor_icms: 0,
      valor_ipi: 0,
      valor_pis: 0,
      valor_cofins: 0,
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (nfe) {
      form.reset({
        numero_nfe: nfe.numero_nfe,
        serie: nfe.serie,
        data_emissao: nfe.data_emissao,
        data_saida: nfe.data_saida || '',
        valor_total: nfe.valor_total,
        valor_icms: nfe.valor_icms,
        valor_ipi: nfe.valor_ipi,
        valor_pis: nfe.valor_pis,
        valor_cofins: nfe.valor_cofins,
        observacoes: nfe.observacoes || '',
      });
    }
  }, [nfe, form]);

  const onSubmit = async (data: NFeFormValues) => {
    try {
      setIsSubmitting(true);
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar NF-e:', error);
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

  // Calcular total de impostos
  const totalImpostos = form.watch(['valor_icms', 'valor_ipi', 'valor_pis', 'valor_cofins']).reduce((sum, val) => sum + (val || 0), 0);
  const valorTotal = form.watch('valor_total') || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {nfe ? 'Editar NF-e' : 'Nova Nota Fiscal Eletrônica (NF-e)'}
          </CardTitle>
          <CardDescription>
            {nfe ? 'Edite os dados da NF-e' : 'Preencha os dados para criar uma nova NF-e'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_nfe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da NF-e *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 000001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1" {...field} />
                      </FormControl>
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
                  name="data_saida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Saída</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Data de saída da mercadoria (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormDescription>
                        Valor total da nota fiscal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Total de Impostos</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-lg font-semibold">{formatCurrency(totalImpostos)}</p>
                    <p className="text-sm text-muted-foreground">
                      ICMS + IPI + PIS + COFINS
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valor_icms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor ICMS</FormLabel>
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
                  name="valor_ipi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor IPI</FormLabel>
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
                  name="valor_pis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor PIS</FormLabel>
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
                  name="valor_cofins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor COFINS</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais sobre a NF-e"
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
                  Após salvar, você poderá emitir a NF-e através do SEFAZ. 
                  Certifique-se de que todos os dados estão corretos antes da emissão.
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
                      {nfe ? 'Atualizar' : 'Criar'}
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
