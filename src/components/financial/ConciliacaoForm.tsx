// =====================================================
// COMPONENTE: FORMULÁRIO DE CONCILIAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-01-15
// Descrição: Formulário para criar conciliações bancárias
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
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
import { Receipt, Save, X, AlertCircle, Upload, FileText } from 'lucide-react';
import { ConciliacaoFormData } from '@/integrations/supabase/financial-types';
import { useTesouraria } from '@/hooks/financial/useTesouraria';

// Schema de validação
const conciliacaoSchema = z.object({
  conta_bancaria_id: z.string().min(1, 'Conta bancária é obrigatória'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  saldo_inicial: z.number().min(0, 'Saldo inicial deve ser maior ou igual a zero'),
  arquivo_extrato: z.any().optional(),
  observacoes: z.string().optional(),
});

type ConciliacaoFormValues = z.infer<typeof conciliacaoSchema>;

interface ConciliacaoFormProps {
  onSave: (data: ConciliacaoFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConciliacaoForm({ onSave, onCancel, loading = false }: ConciliacaoFormProps) {
  const { contasBancarias } = useTesouraria();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ConciliacaoFormValues>({
    resolver: zodResolver(conciliacaoSchema),
    defaultValues: {
      conta_bancaria_id: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
      saldo_inicial: 0,
      observacoes: '',
    },
  });

  const onSubmit = async (data: ConciliacaoFormValues) => {
    try {
      setIsSubmitting(true);
      const formData = {
        ...data,
        arquivo_extrato: selectedFile,
      };
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao criar conciliação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue('arquivo_extrato', file);
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
            <Receipt className="h-5 w-5" />
            Nova Conciliação Bancária
          </CardTitle>
          <CardDescription>
            Configure e processe uma nova conciliação bancária
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="conta_bancaria_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Bancária *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                  name="saldo_inicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo Inicial *</FormLabel>
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
                        Saldo da conta no início do período
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="arquivo_extrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arquivo de Extrato</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".txt,.csv,.ofx"
                          onChange={handleFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                        />
                        {selectedFile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            {selectedFile.name}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Arquivo de extrato bancário (TXT, CSV ou OFX)
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
                        placeholder="Observações sobre a conciliação"
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
                  A conciliação será processada automaticamente após a criação. 
                  O sistema irá comparar os movimentos do extrato com as transações registradas.
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
                      Processando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Conciliação
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
