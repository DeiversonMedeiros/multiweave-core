// =====================================================
// COMPONENTE: FORMULÁRIO DE NFS-e
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar/editar NFS-e
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileText, Save, X, AlertCircle, Calculator } from 'lucide-react';
import { NFSe, NFSeFormData } from '@/integrations/supabase/financial-types';

// Schema de validação
const nfseSchema = z.object({
  numero_nfse: z.string().min(1, 'Número da NFS-e é obrigatório'),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_competencia: z.string().min(1, 'Data de competência é obrigatória'),
  valor_servico: z.number().min(0.01, 'Valor do serviço deve ser maior que zero'),
  valor_deducoes: z.number().min(0, 'Valor das deduções deve ser maior ou igual a zero').optional(),
  observacoes: z.string().optional(),
});

type NFSeFormValues = z.infer<typeof nfseSchema>;

interface NFSeFormProps {
  nfse?: NFSe | null;
  onSave: (data: NFSeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NFSeForm({ nfse, onSave, onCancel, loading = false }: NFSeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NFSeFormValues>({
    resolver: zodResolver(nfseSchema),
    defaultValues: {
      numero_nfse: '',
      data_emissao: new Date().toISOString().split('T')[0],
      data_competencia: new Date().toISOString().split('T')[0],
      valor_servico: 0,
      valor_deducoes: 0,
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (nfse) {
      form.reset({
        numero_nfse: nfse.numero_nfse,
        data_emissao: nfse.data_emissao,
        data_competencia: nfse.data_competencia,
        valor_servico: nfse.valor_servico,
        valor_deducoes: nfse.valor_deducoes,
        observacoes: nfse.observacoes || '',
      });
    }
  }, [nfse, form]);

  const onSubmit = async (data: NFSeFormValues) => {
    try {
      setIsSubmitting(true);
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar NFS-e:', error);
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

  // Calcular valores
  const valorServico = form.watch('valor_servico') || 0;
  const valorDeducoes = form.watch('valor_deducoes') || 0;
  const baseCalculo = valorServico - valorDeducoes;
  
  // Simulação de cálculos de impostos (valores fixos para exemplo)
  const aliquotaPIS = 0.0165; // 1,65%
  const aliquotaCOFINS = 0.076; // 7,6%
  const aliquotaINSS = 0.11; // 11%
  const aliquotaIR = 0.015; // 1,5%
  const aliquotaCSLL = 0.01; // 1%
  const aliquotaISS = 0.05; // 5%

  const valorPIS = baseCalculo * aliquotaPIS;
  const valorCOFINS = baseCalculo * aliquotaCOFINS;
  const valorINSS = baseCalculo * aliquotaINSS;
  const valorIR = baseCalculo * aliquotaIR;
  const valorCSLL = baseCalculo * aliquotaCSLL;
  const valorISS = baseCalculo * aliquotaISS;
  
  const totalImpostos = valorPIS + valorCOFINS + valorINSS + valorIR + valorCSLL + valorISS;
  const valorLiquido = baseCalculo - totalImpostos;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {nfse ? 'Editar NFS-e' : 'Nova Nota Fiscal de Serviços Eletrônica (NFS-e)'}
          </CardTitle>
          <CardDescription>
            {nfse ? 'Edite os dados da NFS-e' : 'Preencha os dados para criar uma nova NFS-e'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero_nfse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da NFS-e *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 000001234" {...field} />
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
                  name="data_competencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Competência *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Mês/ano de competência do serviço
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor do Serviço *</FormLabel>
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
                        Valor bruto do serviço prestado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_deducoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor das Deduções</FormLabel>
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
                        Deduções permitidas (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cálculos de Impostos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Cálculo de Impostos
                  </CardTitle>
                  <CardDescription>
                    Cálculo automático dos impostos sobre serviços
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Valor do Serviço</Label>
                      <p className="text-lg font-semibold">{formatCurrency(valorServico)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Valor das Deduções</Label>
                      <p className="text-lg font-semibold text-red-600">-{formatCurrency(valorDeducoes)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Base de Cálculo</Label>
                      <p className="text-xl font-bold">{formatCurrency(baseCalculo)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">PIS (1,65%)</span>
                        <span className="font-medium">{formatCurrency(valorPIS)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">COFINS (7,6%)</span>
                        <span className="font-medium">{formatCurrency(valorCOFINS)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">INSS (11%)</span>
                        <span className="font-medium">{formatCurrency(valorINSS)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">IR (1,5%)</span>
                        <span className="font-medium">{formatCurrency(valorIR)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">CSLL (1%)</span>
                        <span className="font-medium">{formatCurrency(valorCSLL)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">ISS (5%)</span>
                        <span className="font-medium">{formatCurrency(valorISS)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total de Impostos</span>
                      <span className="text-xl font-bold text-red-600">{formatCurrency(totalImpostos)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Valor Líquido</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(valorLiquido)}</span>
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
                        placeholder="Observações adicionais sobre a NFS-e"
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
                  Os cálculos de impostos são estimativas baseadas nas alíquotas padrão. 
                  Consulte um contador para valores exatos conforme a legislação local.
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
                      {nfse ? 'Atualizar' : 'Criar'}
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
