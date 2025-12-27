// =====================================================
// COMPONENTE: FORMULÁRIO DE CONTA A RECEBER
// =====================================================
// Data: 2025-01-20
// Descrição: Formulário para criar/editar contas a receber
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
import { FileText, Save, X, AlertCircle, File } from 'lucide-react';
import { format } from 'date-fns';
import { ContaReceber, ContaReceberFormData } from '@/integrations/supabase/financial-types';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useUnits } from '@/hooks/rh/useUnits';
import { usePartners } from '@/hooks/usePartners';
import { useActiveClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

// Schema de validação
const contaReceberSchema = z.object({
  numero_titulo: z.string().optional(),
  cliente_id: z.string().optional(),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório'),
  cliente_cnpj: z.string().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor_original: z.number().min(0.01, 'Valor deve ser maior que zero'),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  centro_custo_id: z.string().optional(),
  projeto_id: z.string().optional(),
  departamento: z.string().optional(),
  classe_financeira: z.string().optional(),
  categoria: z.string().optional(),
  forma_recebimento: z.string().optional(),
  conta_bancaria_id: z.string().optional(),
  observacoes: z.string().optional(),
  anexos: z.array(z.string()).optional(),
  numero_nota_fiscal: z.string().optional(),
  // Novos campos
  condicao_recebimento: z.number().refine((val) => !val || [30, 45, 60, 90].includes(val), {
    message: 'Condição de recebimento deve ser 30, 45, 60 ou 90 dias',
  }).optional(),
  valor_pis: z.number().min(0, 'Valor do PIS não pode ser negativo').optional(),
  valor_cofins: z.number().min(0, 'Valor do COFINS não pode ser negativo').optional(),
  valor_csll: z.number().min(0, 'Valor do CSLL não pode ser negativo').optional(),
  valor_ir: z.number().min(0, 'Valor do IR não pode ser negativo').optional(),
  valor_inss: z.number().min(0, 'Valor do INSS não pode ser negativo').optional(),
  valor_iss: z.number().min(0, 'Valor do ISS não pode ser negativo').optional(),
});

type ContaReceberFormValues = z.infer<typeof contaReceberSchema>;

interface ContaReceberFormProps {
  conta?: ContaReceber | null;
  onSave: (data: ContaReceberFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ContaReceberForm({ conta, onSave, onCancel, loading = false }: ContaReceberFormProps) {
  const { selectedCompany } = useCompany();
  const { data: costCentersData, isLoading: loadingCostCenters } = useCostCenters();
  const { data: projectsData, isLoading: loadingProjects } = useProjects();
  const { data: unitsData, isLoading: loadingUnits } = useUnits();
  const { data: partnersData, isLoading: loadingPartners } = usePartners();
  const { data: classesFinanceirasData, isLoading: loadingClassesFinanceiras } = useActiveClassesFinanceiras();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTitulo, setLoadingTitulo] = useState(false);
  const [uploadingNotaFiscal, setUploadingNotaFiscal] = useState(false);
  const [notaFiscalUrl, setNotaFiscalUrl] = useState<string | null>(null);

  const form = useForm<ContaReceberFormValues>({
    resolver: zodResolver(contaReceberSchema),
    defaultValues: {
      numero_titulo: '',
      cliente_id: '',
      cliente_nome: '',
      cliente_cnpj: '',
      descricao: '',
      valor_original: 0,
      data_emissao: format(new Date(), 'yyyy-MM-dd'),
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      centro_custo_id: '',
      projeto_id: '',
      departamento: '',
      classe_financeira: '',
      categoria: '',
      forma_recebimento: '',
      conta_bancaria_id: '',
      observacoes: '',
      anexos: [],
      numero_nota_fiscal: '',
      condicao_recebimento: undefined,
      valor_pis: 0,
      valor_cofins: 0,
      valor_csll: 0,
      valor_ir: 0,
      valor_inss: 0,
      valor_iss: 0,
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
          p_tipo: 'RECEBER'
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

  // Preencher CNPJ quando selecionar cliente
  const handleClienteChange = (clienteId: string) => {
    const cliente = (partnersData?.data || []).find((p: any) => p.id === clienteId);
    if (cliente) {
      form.setValue('cliente_id', cliente.id);
      form.setValue('cliente_nome', cliente.nome_fantasia || cliente.razao_social);
      form.setValue('cliente_cnpj', cliente.cnpj || '');
    }
  };

  // Preencher formulário quando editar
  useEffect(() => {
    if (conta) {
      form.reset({
        numero_titulo: conta.numero_titulo || '',
        cliente_id: conta.cliente_id || '',
        cliente_nome: conta.cliente_nome || '',
        cliente_cnpj: conta.cliente_cnpj || '',
        descricao: conta.descricao,
        valor_original: conta.valor_original,
        data_emissao: conta.data_emissao,
        data_vencimento: conta.data_vencimento,
        centro_custo_id: conta.centro_custo_id || '',
        projeto_id: conta.projeto_id || '',
        departamento: conta.departamento || '',
        classe_financeira: conta.classe_financeira || '',
        categoria: conta.categoria || '',
        forma_recebimento: conta.forma_recebimento || '',
        conta_bancaria_id: conta.conta_bancaria_id || '',
        observacoes: conta.observacoes || '',
        anexos: conta.anexos || [],
        numero_nota_fiscal: conta.numero_nota_fiscal || '',
        condicao_recebimento: conta.condicao_recebimento,
        valor_pis: conta.valor_pis || 0,
        valor_cofins: conta.valor_cofins || 0,
        valor_csll: conta.valor_csll || 0,
        valor_ir: conta.valor_ir || 0,
        valor_inss: conta.valor_inss || 0,
        valor_iss: conta.valor_iss || 0,
      });
      
      // Se houver anexos, definir o primeiro como nota fiscal para exibição
      if (conta.anexos && conta.anexos.length > 0) {
        setNotaFiscalUrl(conta.anexos[0]);
      }
    }
  }, [conta, form]);

  const onSubmit = async (data: ContaReceberFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Clean up special values before saving
      const cleanedData: ContaReceberFormData = {
        descricao: data.descricao,
        valor_original: data.valor_original,
        data_emissao: data.data_emissao,
        data_vencimento: data.data_vencimento,
        cliente_nome: data.cliente_nome,
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
            {conta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </CardTitle>
          <CardDescription>
            {conta ? 'Edite os dados da conta a receber' : 'Preencha os dados para criar uma nova conta a receber'}
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
                      name="cliente_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleClienteChange(value);
                            }} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingPartners ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : (
                                (partnersData?.data || [])
                                  .filter((p: any) => {
                                    if (!p.tipo || !Array.isArray(p.tipo)) return true;
                                    return p.tipo.includes('cliente');
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
                      name="cliente_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ do Cliente</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} readOnly />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente ao selecionar o cliente
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
                              <SelectItem value="vendas">Vendas</SelectItem>
                              <SelectItem value="servicos">Serviços</SelectItem>
                              <SelectItem value="aluguel">Aluguel</SelectItem>
                              <SelectItem value="juros">Juros</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numero_nota_fiscal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da Nota Fiscal</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: 123456" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Número da nota fiscal relacionada a esta conta
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Upload de Nota Fiscal */}
                  <div className="space-y-2">
                    <Label>Anexar Nota Fiscal</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedCompany?.id) return;

                          // Validar tamanho (10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            alert('Arquivo muito grande. Tamanho máximo: 10MB');
                            return;
                          }

                          setUploadingNotaFiscal(true);
                          try {
                            // Sanitizar nome do arquivo
                            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                            const timestamp = Date.now();
                            const fileName = `${timestamp}_${sanitizedName}`;
                            const filePath = `${selectedCompany.id}/notas-fiscais/${fileName}`;

                            // Upload do arquivo
                            const { data, error: uploadError } = await supabase.storage
                              .from('notas-fiscais')
                              .upload(filePath, file, {
                                cacheControl: '3600',
                                upsert: false
                              });

                            if (uploadError) {
                              throw uploadError;
                            }

                            // Obter URL do arquivo (signed URL para bucket privado)
                            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                              .from('notas-fiscais')
                              .createSignedUrl(filePath, 3600);
                            
                            let fileUrl = '';
                            if (signedUrlError || !signedUrlData) {
                              const { data: publicUrlData } = supabase.storage
                                .from('notas-fiscais')
                                .getPublicUrl(filePath);
                              fileUrl = publicUrlData.publicUrl;
                            } else {
                              fileUrl = signedUrlData.signedUrl;
                            }

                            setNotaFiscalUrl(fileUrl);
                            
                            // Adicionar ao array de anexos
                            const currentAnexos = form.getValues('anexos') || [];
                            form.setValue('anexos', [...currentAnexos, fileUrl]);
                          } catch (error: any) {
                            console.error('Erro no upload:', error);
                            alert('Erro ao enviar nota fiscal: ' + (error.message || 'Não foi possível enviar o arquivo.'));
                          } finally {
                            setUploadingNotaFiscal(false);
                            // Limpar input
                            e.target.value = '';
                          }
                        }}
                        disabled={uploadingNotaFiscal}
                        className="max-w-sm"
                      />
                      {uploadingNotaFiscal && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Enviando...
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: PDF, JPG, JPEG, PNG (máximo 10MB)
                    </p>
                    {notaFiscalUrl && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <File className="h-4 w-4" />
                        <span className="text-sm">Nota fiscal anexada</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNotaFiscalUrl(null);
                            const currentAnexos = form.getValues('anexos') || [];
                            form.setValue('anexos', currentAnexos.filter(url => url !== notaFiscalUrl));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição detalhada da conta a receber"
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
                            Valor original da conta a receber
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condicao_recebimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condição de Recebimento</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            defaultValue={field.value?.toString()}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a condição" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30">30 dias</SelectItem>
                              <SelectItem value="45">45 dias</SelectItem>
                              <SelectItem value="60">60 dias</SelectItem>
                              <SelectItem value="90">90 dias</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Prazo para recebimento em dias
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
                      name="forma_recebimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Recebimento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma de recebimento" />
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

                  {/* Seção de Impostos */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Impostos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="valor_pis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIS</FormLabel>
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
                            <FormLabel>COFINS</FormLabel>
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
                        name="valor_csll"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CSLL</FormLabel>
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
                        name="valor_ir"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IR</FormLabel>
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
                        name="valor_inss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>INSS</FormLabel>
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
                        name="valor_iss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ISS</FormLabel>
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
                          <Select 
                            onValueChange={(value) => {
                              const selectedUnit = (unitsData || []).find((u: any) => u.id === value);
                              field.onChange(selectedUnit?.nome || value);
                            }} 
                            defaultValue={field.value ? (unitsData || []).find((u: any) => u.nome === field.value)?.id : undefined}
                            value={field.value ? (unitsData || []).find((u: any) => u.nome === field.value)?.id : undefined}
                          >
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
                                  <SelectItem key={unit.id} value={unit.id}>
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

