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
import { CalendarIcon, Building, DollarSign, FileText, Save, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ContaPagar, ContaPagarFormData, ContaPagarParcelaFormData } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useUnits } from '@/hooks/rh/useUnits';
import { usePartners } from '@/hooks/usePartners';
import { usePlanoContas } from '@/hooks/financial/usePlanoContas';
import { useActiveClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

// Schema de validação
const contaPagarSchema = z.object({
  numero_titulo: z.string().optional(),
  fornecedor_id: z.string().optional(),
  fornecedor_nome: z.string().min(1, 'Nome do fornecedor é obrigatório'),
  fornecedor_cnpj: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor_original: z.number().min(0.01, 'Valor deve ser maior que zero'),
  valor_desconto: z.number().min(0).optional(),
  valor_juros: z.number().min(0).optional(),
  valor_multa: z.number().min(0).optional(),
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
  // Campos de parcelamento
  is_parcelada: z.boolean().optional(),
  numero_parcelas: z.number().min(1).max(360).optional(),
  intervalo_parcelas: z.enum(['diario', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
  data_primeira_parcela: z.string().optional(),
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
  const { data: projectsData, isLoading: loadingProjects } = useProjects();
  const { data: unitsData, isLoading: loadingUnits } = useUnits();
  const { data: partnersData, isLoading: loadingPartners } = usePartners();
  const { data: planoContasData, isLoading: loadingPlanoContas } = usePlanoContas();
  const { data: classesFinanceirasData, isLoading: loadingClassesFinanceiras } = useActiveClassesFinanceiras();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTitulo, setLoadingTitulo] = useState(false);
  const [parcelas, setParcelas] = useState<ContaPagarParcelaFormData[]>([]);

  const form = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarSchema),
    defaultValues: {
      numero_titulo: '',
      fornecedor_id: '',
      fornecedor_nome: '',
      fornecedor_cnpj: '',
      descricao: '',
      valor_original: 0,
      valor_desconto: 0,
      valor_juros: 0,
      valor_multa: 0,
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
      is_parcelada: false,
      numero_parcelas: 1,
      intervalo_parcelas: 'mensal',
      data_primeira_parcela: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  // Gerar número do título automaticamente quando criar nova conta
  useEffect(() => {
    const generateTituloNumber = async () => {
      if (conta || !selectedCompany?.id) return;
      
      try {
        setLoadingTitulo(true);
        const { data, error } = await (supabase as any).rpc('generate_titulo_number', {
          p_company_id: selectedCompany.id,
          p_tipo: 'PAGAR'
        });

        if (error) throw error;
        if (data) {
          form.setValue('numero_titulo', data);
        }
      } catch (error) {
        console.error('Erro ao gerar número do título:', error);
      } finally {
        setLoadingTitulo(false);
      }
    };

    generateTituloNumber();
  }, [conta, selectedCompany?.id, form]);

  // Preencher CNPJ quando selecionar fornecedor
  const handleFornecedorChange = (fornecedorId: string) => {
    const fornecedor = (partnersData?.data || []).find((p: any) => p.id === fornecedorId);
    if (fornecedor) {
      form.setValue('fornecedor_id', fornecedor.id);
      form.setValue('fornecedor_nome', fornecedor.nome_fantasia || fornecedor.razao_social);
      form.setValue('fornecedor_cnpj', fornecedor.cnpj || '');
    }
  };

  // Função para gerar parcelas
  const gerarParcelas = () => {
    const isParcelada = form.watch('is_parcelada');
    const numeroParcelas = form.watch('numero_parcelas') || 1;
    const intervalo = form.watch('intervalo_parcelas') || 'mensal';
    const dataPrimeiraParcela = form.watch('data_primeira_parcela') || form.watch('data_vencimento');
    const valorOriginal = form.watch('valor_original') || 0;
    const valorDesconto = form.watch('valor_desconto') || 0;
    const valorTotal = valorOriginal - valorDesconto;
    const valorParcela = valorTotal / numeroParcelas;

    if (!isParcelada || numeroParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const novasParcelas: ContaPagarParcelaFormData[] = [];
    const dataInicio = new Date(dataPrimeiraParcela);

    for (let i = 1; i <= numeroParcelas; i++) {
      let dataVencimento: Date;
      
      // Calcular data de vencimento baseado no intervalo usando date-fns
      switch (intervalo) {
        case 'diario':
          dataVencimento = addDays(dataInicio, i - 1);
          break;
        case 'semanal':
          dataVencimento = addWeeks(dataInicio, i - 1);
          break;
        case 'quinzenal':
          dataVencimento = addDays(dataInicio, (i - 1) * 15);
          break;
        case 'mensal':
          dataVencimento = addMonths(dataInicio, i - 1);
          break;
        case 'bimestral':
          dataVencimento = addMonths(dataInicio, (i - 1) * 2);
          break;
        case 'trimestral':
          dataVencimento = addMonths(dataInicio, (i - 1) * 3);
          break;
        case 'semestral':
          dataVencimento = addMonths(dataInicio, (i - 1) * 6);
          break;
        case 'anual':
          dataVencimento = addYears(dataInicio, i - 1);
          break;
        default:
          dataVencimento = addMonths(dataInicio, i - 1);
      }

      // Ajustar valor da última parcela para compensar diferenças de arredondamento
      const valorFinalParcela = i === numeroParcelas 
        ? valorTotal - (valorParcela * (numeroParcelas - 1))
        : valorParcela;

      novasParcelas.push({
        numero_parcela: i,
        valor_parcela: Number(valorFinalParcela.toFixed(2)),
        data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
        observacoes: `Parcela ${i} de ${numeroParcelas}`
      });
    }

    setParcelas(novasParcelas);
  };

  // Observar mudanças nos campos de parcelamento
  useEffect(() => {
    gerarParcelas();
  }, [
    form.watch('is_parcelada'),
    form.watch('numero_parcelas'),
    form.watch('intervalo_parcelas'),
    form.watch('data_primeira_parcela'),
    form.watch('valor_original'),
    form.watch('valor_desconto')
  ]);

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
        valor_desconto: conta.valor_desconto || 0,
        valor_juros: conta.valor_juros || 0,
        valor_multa: conta.valor_multa || 0,
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
      const cleanedData: ContaPagarFormData = {
        descricao: data.descricao,
        valor_original: data.valor_original,
        data_emissao: data.data_emissao,
        data_vencimento: data.data_vencimento,
        fornecedor_nome: data.fornecedor_nome,
        ...data,
        centro_custo_id: data.centro_custo_id === 'none' || data.centro_custo_id === 'loading' ? '' : data.centro_custo_id,
        conta_bancaria_id: data.conta_bancaria_id === 'none' || data.conta_bancaria_id === 'loading' ? '' : data.conta_bancaria_id,
        is_parcelada: data.is_parcelada || false,
        numero_parcelas: data.numero_parcelas || 1,
        intervalo_parcelas: data.intervalo_parcelas || 'mensal',
        data_primeira_parcela: data.data_primeira_parcela || data.data_vencimento,
        parcelas: parcelas.length > 0 ? parcelas : undefined,
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
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
                            <Input 
                              placeholder={loadingTitulo ? "Gerando..." : "Gerado automaticamente"} 
                              {...field} 
                              readOnly
                              disabled={loadingTitulo}
                            />
                          </FormControl>
                          <FormDescription>
                            Número gerado automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fornecedor_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Fornecedor *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleFornecedorChange(value);
                            }} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o fornecedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingPartners ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : (
                                (partnersData?.data || [])
                                  .filter((p: any) => {
                                    if (!p.tipo || !Array.isArray(p.tipo)) return true;
                                    return p.tipo.includes('fornecedor');
                                  })
                                  .map((partner: any) => (
                                    <SelectItem key={partner.id} value={partner.id}>
                                      {partner.nome_fantasia || partner.razao_social}
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
                      name="fornecedor_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ do Fornecedor</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} readOnly />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente ao selecionar o fornecedor
                          </FormDescription>
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
                      name="valor_desconto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto</FormLabel>
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
                            Valor do desconto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_juros"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Juros</FormLabel>
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
                            Valor dos juros
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_multa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Multa</FormLabel>
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
                            Valor da multa
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

                {/* Parcelamento */}
                <TabsContent value="parcelamento" className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ao parcelar, o sistema criará automaticamente múltiplas contas a pagar com valores e datas de vencimento distribuídas conforme configurado.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="is_parcelada"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={(checked) => field.onChange(!!checked)}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Parcelar esta conta</FormLabel>
                            <FormDescription>
                              Marque para dividir o pagamento em parcelas
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch('is_parcelada') && (
                      <>
                        <FormField
                          control={form.control}
                          name="numero_parcelas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Parcelas *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="360"
                                  placeholder="Ex: 12"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>
                                Quantidade de parcelas (máximo 360)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intervalo_parcelas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Intervalo entre Parcelas *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || 'mensal'}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o intervalo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="diario">Diário</SelectItem>
                                  <SelectItem value="semanal">Semanal</SelectItem>
                                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                  <SelectItem value="mensal">Mensal</SelectItem>
                                  <SelectItem value="bimestral">Bimestral</SelectItem>
                                  <SelectItem value="trimestral">Trimestral</SelectItem>
                                  <SelectItem value="semestral">Semestral</SelectItem>
                                  <SelectItem value="anual">Anual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="data_primeira_parcela"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data da Primeira Parcela *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                Data de vencimento da primeira parcela
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  {form.watch('is_parcelada') && parcelas.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Resumo das Parcelas</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Parcela</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Data de Vencimento</TableHead>
                              <TableHead>Observações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parcelas.map((parcela) => (
                              <TableRow key={parcela.numero_parcela}>
                                <TableCell className="font-medium">
                                  {parcela.numero_parcela}ª
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(parcela.valor_parcela)}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {parcela.observacoes}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(parcelas.reduce((sum, p) => sum + p.valor_parcela, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                          <span>Valor Original:</span>
                          <span>{formatCurrency(form.watch('valor_original') || 0)}</span>
                        </div>
                        {form.watch('valor_desconto') && form.watch('valor_desconto') > 0 && (
                          <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                            <span>Desconto:</span>
                            <span>- {formatCurrency(form.watch('valor_desconto') || 0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingUnits ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : (
                                (unitsData || []).map((unit) => (
                                  <SelectItem key={unit.id} value={unit.nome}>
                                    {unit.nome}
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
                      name="classe_financeira"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Classe Financeira</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a classe financeira" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingClassesFinanceiras ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : (
                                (classesFinanceirasData?.data || []).map((classe) => (
                                  <SelectItem key={classe.id} value={classe.id}>
                                    {classe.codigo} - {classe.nome}
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
                      name="projeto_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o projeto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingProjects ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : (
                                (projectsData?.data || []).map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.codigo} - {project.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
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

