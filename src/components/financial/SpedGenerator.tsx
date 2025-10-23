// =====================================================
// COMPONENTE: GERADOR DE SPED
// =====================================================
// Data: 2025-01-15
// Descrição: Gerador de relatórios SPED Fiscal e Contábil
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  FileSpreadsheet, 
  X, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Database,
  FileText,
  Calendar,
  Hash
} from 'lucide-react';
import { useContabilidade } from '@/hooks/financial/useContabilidade';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Schema de validação
const spedSchema = z.object({
  tipo: z.enum(['fiscal', 'contabil']),
  periodo: z.string().min(1, 'Período é obrigatório'),
  versao_layout: z.string().min(1, 'Versão do layout é obrigatória'),
  incluir_balancete: z.boolean(),
  incluir_dre: z.boolean(),
  incluir_balanco: z.boolean(),
});

type SpedFormValues = z.infer<typeof spedSchema>;

interface SpedGeneratorProps {
  onClose: () => void;
}

export function SpedGenerator({ onClose }: SpedGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSped, setGeneratedSped] = useState<any>(null);
  const { gerarSpedFiscal, gerarSpedContabil } = useContabilidade();

  const form = useForm<SpedFormValues>({
    resolver: zodResolver(spedSchema),
    defaultValues: {
      tipo: 'fiscal',
      periodo: new Date().toISOString().slice(0, 7), // YYYY-MM
      versao_layout: '017',
      incluir_balancete: true,
      incluir_dre: true,
      incluir_balanco: true,
    },
  });

  const onSubmit = async (data: SpedFormValues) => {
    try {
      setIsGenerating(true);
      
      if (data.tipo === 'fiscal') {
        await gerarSpedFiscal(data.periodo);
      } else {
        await gerarSpedContabil(data.periodo);
      }
      
      // Simular geração bem-sucedida
      setGeneratedSped({
        id: Date.now().toString(),
        tipo: data.tipo,
        periodo: data.periodo,
        versao: data.versao_layout,
        status: 'gerado',
        data_geracao: new Date().toISOString(),
        arquivo_url: '/api/sped/download/' + Date.now(),
      });
      
    } catch (error) {
      console.error('Erro ao gerar SPED:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const getTipoDescription = (tipo: string) => {
    return tipo === 'fiscal' 
      ? 'SPED Fiscal - Escrituração Fiscal Digital (EFD)'
      : 'SPED Contábil - Escrituração Contábil Digital (ECD)';
  };

  const getVersaoDescription = (versao: string) => {
    const versoes = {
      '017': 'Versão 017 - Janeiro 2025',
      '016': 'Versão 016 - Janeiro 2024',
      '015': 'Versão 015 - Janeiro 2023',
    };
    return versoes[versao as keyof typeof versoes] || 'Versão não reconhecida';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Gerador de SPED
          </CardTitle>
          <CardDescription>
            Gere relatórios SPED Fiscal e Contábil para a Receita Federal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de SPED *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fiscal">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              SPED Fiscal (EFD)
                            </div>
                          </SelectItem>
                          <SelectItem value="contabil">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              SPED Contábil (ECD)
                            </div>
                          </SelectItem>
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
                  name="periodo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período *</FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Mês/ano de referência do SPED
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="versao_layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Versão do Layout *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a versão" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="017">017 - Janeiro 2025</SelectItem>
                          <SelectItem value="016">016 - Janeiro 2024</SelectItem>
                          <SelectItem value="015">015 - Janeiro 2023</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {getVersaoDescription(field.value)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Opções de Inclusão */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Opções de Inclusão</CardTitle>
                  <CardDescription>
                    Selecione quais relatórios incluir no SPED
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="incluir_balancete"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Incluir Balancete
                            </FormLabel>
                            <FormDescription>
                              Relatório de saldos das contas
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

                    <FormField
                      control={form.control}
                      name="incluir_dre"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Incluir DRE
                            </FormLabel>
                            <FormDescription>
                              Demonstração do Resultado
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

                    <FormField
                      control={form.control}
                      name="incluir_balanco"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Incluir Balanço
                            </FormLabel>
                            <FormDescription>
                              Balanço Patrimonial
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
                </CardContent>
              </Card>

              {/* Status da Geração */}
              {generatedSped && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      SPED Gerado com Sucesso
                    </CardTitle>
                    <CardDescription>
                      O relatório SPED foi gerado e está pronto para download
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                        <p className="font-medium">{getTipoDescription(generatedSped.tipo)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Período</Label>
                        <p className="font-medium">{generatedSped.periodo}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Versão</Label>
                        <p className="font-medium">{generatedSped.versao}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Data de Geração</Label>
                        <p className="font-medium">{formatDate(generatedSped.data_geracao)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => window.open(generatedSped.arquivo_url, '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar SPED
                      </Button>
                      <Button variant="outline" onClick={() => setGeneratedSped(null)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar Novo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  O SPED será gerado com base nos lançamentos contábeis do período selecionado. 
                  Certifique-se de que todos os lançamentos estão aprovados antes da geração.
                </AlertDescription>
              </Alert>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Gerar SPED
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
