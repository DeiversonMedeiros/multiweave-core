// =====================================================
// COMPONENTE: FORMULÁRIO DE CLASSE FINANCEIRA
// =====================================================
// Data: 2025-01-20
// Descrição: Formulário para criar/editar classe financeira
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
import { FolderTree, Save, X, AlertCircle } from 'lucide-react';
import { ClasseFinanceira, ClasseFinanceiraFormData } from '@/integrations/supabase/financial-types';

// Schema de validação
const classeFinanceiraSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  classe_pai_id: z.string().optional(),
  ordem: z.number().min(0, 'Ordem deve ser maior ou igual a zero').optional(),
  observacoes: z.string().optional(),
});

type ClasseFinanceiraFormValues = z.infer<typeof classeFinanceiraSchema>;

interface ClasseFinanceiraFormProps {
  classe?: ClasseFinanceira | null;
  classesPai?: ClasseFinanceira[];
  onSave: (data: ClasseFinanceiraFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ClasseFinanceiraForm({ 
  classe, 
  classesPai = [], 
  onSave, 
  onCancel, 
  loading = false 
}: ClasseFinanceiraFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClasseFinanceiraFormValues>({
    resolver: zodResolver(classeFinanceiraSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      descricao: '',
      classe_pai_id: '',
      ordem: 0,
      observacoes: '',
    },
  });

  // Preencher formulário quando editar
  useEffect(() => {
    if (classe) {
      form.reset({
        codigo: classe.codigo,
        nome: classe.nome,
        descricao: classe.descricao || '',
        classe_pai_id: classe.classe_pai_id || '',
        ordem: classe.ordem || 0,
        observacoes: classe.observacoes || '',
      });
    } else {
      form.reset({
        codigo: '',
        nome: '',
        descricao: '',
        classe_pai_id: '',
        ordem: 0,
        observacoes: '',
      });
    }
  }, [classe, form]);

  const onSubmit = async (data: ClasseFinanceiraFormValues) => {
    try {
      setIsSubmitting(true);
      const formData: ClasseFinanceiraFormData = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao,
        classe_pai_id: data.classe_pai_id || undefined,
        ordem: data.ordem,
        observacoes: data.observacoes,
      };
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar classe financeira:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <CardTitle>{classe ? 'Editar Classe Financeira' : 'Nova Classe Financeira'}</CardTitle>
        </div>
        <CardDescription>
          {classe 
            ? 'Atualize as informações da classe financeira'
            : 'Preencha os dados para criar uma nova classe financeira'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: 1.1.01" 
                      {...field} 
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Código único da classe financeira
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Pessoal / Folha de Pagamento" 
                      {...field} 
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Nome da classe financeira
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição detalhada da classe financeira (opcional)" 
                      {...field} 
                      disabled={loading || isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Descrição adicional da classe financeira
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {classesPai.length > 0 && (
              <FormField
                control={form.control}
                name="classe_pai_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe Pai</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // Converter "none" para string vazia
                        field.onChange(value === "none" ? "" : value);
                      }}
                      value={field.value || "none"}
                      disabled={loading || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a classe pai (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma (classe raiz)</SelectItem>
                        {classesPai
                          .filter(c => !classe || c.id !== classe.id) // Não permitir selecionar a própria classe como pai
                          .map((classePai) => (
                            <SelectItem key={classePai.id} value={classePai.id}>
                              {classePai.codigo} - {classePai.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecione a classe pai para criar uma hierarquia
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="ordem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="0" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Ordem de exibição da classe (opcional)
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
                      placeholder="Observações adicionais (opcional)" 
                      {...field} 
                      disabled={loading || isSubmitting}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    Observações sobre a classe financeira
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading || isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

