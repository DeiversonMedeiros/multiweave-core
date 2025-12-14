// =====================================================
// COMPONENTE: FORMULÁRIO DE NF-e
// =====================================================
// Data: 2025-12-06
// Descrição: Formulário completo para criar/editar NF-e com integração a contas a receber
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Save, X, AlertCircle, Calculator, FileText, User, Settings, Plus, Trash2, Truck, CreditCard } from 'lucide-react';
import { NFe, NFeFormData, NFeItem, NFePagamento } from '@/integrations/supabase/financial-types';
import { usePartners } from '@/hooks/usePartners';
import { useCompany } from '@/lib/company-context';
import { ConfiguracaoFiscalService } from '@/services/financial/configuracaoFiscalService';
import { ConfiguracaoFiscal } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { useTaxCalculation } from '@/hooks/tributario/useTaxCalculation';
import { toast } from 'sonner';

// Schema de validação
const nfeSchema = z.object({
  numero_nfe: z.string().optional(),
  serie: z.string().optional(),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_saida: z.string().optional(),
  valor_total: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  valor_icms: z.number().min(0, 'Valor ICMS deve ser maior ou igual a zero').optional(),
  valor_ipi: z.number().min(0, 'Valor IPI deve ser maior ou igual a zero').optional(),
  valor_pis: z.number().min(0, 'Valor PIS deve ser maior ou igual a zero').optional(),
  valor_cofins: z.number().min(0, 'Valor COFINS deve ser maior ou igual a zero').optional(),
  observacoes: z.string().optional(),
  // Novos campos
  cliente_id: z.string().optional(),
  cliente_nome: z.string().optional(),
  cliente_cnpj: z.string().optional(),
  cliente_email: z.string().email('Email inválido').optional().or(z.literal('')),
  cliente_telefone: z.string().optional(),
  cliente_endereco: z.string().optional(),
  cliente_cidade: z.string().optional(),
  cliente_uf: z.string().optional(),
  cliente_cep: z.string().optional(),
  criar_conta_receber: z.boolean().optional(),
  condicao_recebimento: z.number().refine((val) => !val || [30, 45, 60, 90].includes(val), {
    message: 'Condição de recebimento deve ser 30, 45, 60 ou 90 dias',
  }).optional(),
  configuracao_fiscal_id: z.string().optional(),
  gerar_numero_automaticamente: z.boolean().optional(),
  // Campos de regime tributário
  regime_tributacao: z.enum(['simples_nacional', 'simples_nacional_icms_municipal', 'regime_normal']).optional(),
  // Campos de tipo e finalidade da operação
  tipo_operacao: z.enum(['entrada', 'saida']).optional(),
  finalidade: z.enum(['normal', 'complementar', 'ajuste', 'devolucao', 'remessa']).optional(),
  natureza_operacao: z.string().optional(),
  // Campos de pagamento
  forma_pagamento: z.string().optional(),
  valor_entrada: z.number().min(0).optional(),
  quantidade_parcelas: z.number().min(1).optional(),
  // Campos de transporte
  modalidade_frete: z.enum(['por_conta_emitente', 'por_conta_destinatario', 'por_conta_terceiros', 'sem_frete']).optional(),
  transportador_id: z.string().optional(),
  transportador_nome: z.string().optional(),
  transportador_cnpj: z.string().optional(),
  transportador_ie: z.string().optional(),
  transportador_endereco: z.string().optional(),
  transportador_cidade: z.string().optional(),
  transportador_uf: z.string().optional(),
  veiculo_placa: z.string().optional(),
  veiculo_uf: z.string().optional(),
  veiculo_rntc: z.string().optional(),
  quantidade_volumes: z.number().min(0).optional(),
  especie_volumes: z.string().optional(),
  marca_volumes: z.string().optional(),
  numeracao_volumes: z.string().optional(),
  peso_bruto: z.number().min(0).optional(),
  peso_liquido: z.number().min(0).optional(),
  // Campos detalhados de ICMS
  modalidade_icms: z.string().optional(),
  cst_icms: z.string().optional(),
  base_calculo_icms: z.number().min(0).optional(),
  aliquota_icms: z.number().min(0).max(100).optional(),
  valor_icms_st: z.number().min(0).optional(),
  base_calculo_icms_st: z.number().min(0).optional(),
  aliquota_icms_st: z.number().min(0).max(100).optional(),
  percentual_reducao_base_icms: z.number().min(0).max(100).optional(),
  percentual_mva_icms_st: z.number().min(0).optional(),
  // Campos detalhados de IPI
  enquadramento_ipi: z.string().optional(),
  cst_ipi: z.string().optional(),
  base_calculo_ipi: z.number().min(0).optional(),
  aliquota_ipi: z.number().min(0).max(100).optional(),
  valor_ipi_tributado: z.number().min(0).optional(),
  valor_ipi_isento: z.number().min(0).optional(),
  valor_ipi_outros: z.number().min(0).optional(),
  // Campos de informações complementares
  informacoes_fisco: z.string().optional(),
  informacoes_complementares: z.string().optional(),
});

type NFeFormValues = z.infer<typeof nfeSchema>;

interface NFeFormProps {
  nfe?: NFe | null;
  onSave: (data: NFeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NFeForm({ nfe, onSave, onCancel, loading = false }: NFeFormProps) {
  const { selectedCompany } = useCompany();
  const { data: partnersData, isLoading: loadingPartners } = usePartners();
  const { calcularTributosNFe, loading: calculatingTaxes } = useTaxCalculation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingNumero, setLoadingNumero] = useState(false);
  const [configuracoesFiscais, setConfiguracoesFiscais] = useState<ConfiguracaoFiscal[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [itens, setItens] = useState<NFeItem[]>([]);
  const [pagamentos, setPagamentos] = useState<NFePagamento[]>([]);
  const [activeTab, setActiveTab] = useState('dados-basicos');

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
      cliente_id: '',
      cliente_nome: '',
      cliente_cnpj: '',
      cliente_email: '',
      cliente_telefone: '',
      cliente_endereco: '',
      cliente_cidade: '',
      cliente_uf: '',
      cliente_cep: '',
      criar_conta_receber: false,
      condicao_recebimento: undefined,
      configuracao_fiscal_id: '',
      gerar_numero_automaticamente: true,
      // Campos de regime tributário
      regime_tributacao: undefined,
      // Campos de tipo e finalidade da operação
      tipo_operacao: 'saida',
      finalidade: 'normal',
      natureza_operacao: '',
      // Campos de pagamento
      forma_pagamento: '',
      valor_entrada: 0,
      quantidade_parcelas: 1,
      // Campos de transporte
      modalidade_frete: undefined,
      transportador_id: '',
      transportador_nome: '',
      transportador_cnpj: '',
      transportador_ie: '',
      transportador_endereco: '',
      transportador_cidade: '',
      transportador_uf: '',
      veiculo_placa: '',
      veiculo_uf: '',
      veiculo_rntc: '',
      quantidade_volumes: 0,
      especie_volumes: '',
      marca_volumes: '',
      numeracao_volumes: '',
      peso_bruto: 0,
      peso_liquido: 0,
      // Campos detalhados de ICMS
      modalidade_icms: '',
      cst_icms: '',
      base_calculo_icms: 0,
      aliquota_icms: 0,
      valor_icms_st: 0,
      base_calculo_icms_st: 0,
      aliquota_icms_st: 0,
      percentual_reducao_base_icms: 0,
      percentual_mva_icms_st: 0,
      // Campos detalhados de IPI
      enquadramento_ipi: '',
      cst_ipi: '',
      base_calculo_ipi: 0,
      aliquota_ipi: 0,
      valor_ipi_tributado: 0,
      valor_ipi_isento: 0,
      valor_ipi_outros: 0,
      // Campos de informações complementares
      informacoes_fisco: '',
      informacoes_complementares: '',
    },
  });

  // Carregar configurações fiscais
  useEffect(() => {
    const loadConfigs = async () => {
      if (!selectedCompany?.id) return;
      setLoadingConfigs(true);
      try {
        const service = ConfiguracaoFiscalService.getInstance();
        const configs = await service.getConfiguracoes(selectedCompany.id);
        setConfiguracoesFiscais(configs.filter(c => c.tipo_documento === 'nfe'));
      } catch (error) {
        console.error('Erro ao carregar configurações fiscais:', error);
      } finally {
        setLoadingConfigs(false);
      }
    };
    loadConfigs();
  }, [selectedCompany?.id]);

  // Gerar número automaticamente quando habilitado
  useEffect(() => {
    const generateNumber = async () => {
      const gerarAutomatico = form.watch('gerar_numero_automaticamente');
      const configId = form.watch('configuracao_fiscal_id');
      
      if (gerarAutomatico && configId && selectedCompany?.id && !nfe) {
        try {
          setLoadingNumero(true);
          const { data, error } = await (supabase as any).rpc('financeiro.generate_nfe_number', {
            p_company_id: selectedCompany.id,
            p_configuracao_fiscal_id: configId
          });

          if (error) throw error;
          if (data) {
            form.setValue('numero_nfe', data.numero);
            form.setValue('serie', data.serie);
          }
        } catch (error) {
          console.error('Erro ao gerar número da NF-e:', error);
        } finally {
          setLoadingNumero(false);
        }
      }
    };

    generateNumber();
  }, [form.watch('gerar_numero_automaticamente'), form.watch('configuracao_fiscal_id'), selectedCompany?.id, nfe, form]);

  // Preencher dados do cliente quando selecionado
  const handleClienteChange = (clienteId: string) => {
    const cliente = (partnersData?.data || []).find((p: any) => p.id === clienteId);
    if (cliente) {
      form.setValue('cliente_id', cliente.id);
      form.setValue('cliente_nome', cliente.nome_fantasia || cliente.razao_social);
      form.setValue('cliente_cnpj', cliente.cnpj || '');
      form.setValue('cliente_email', cliente.contato?.email || '');
      form.setValue('cliente_telefone', cliente.contato?.telefone || cliente.contato?.celular || '');
      
      if (cliente.endereco) {
        form.setValue('cliente_endereco', 
          `${cliente.endereco.logradouro || ''}, ${cliente.endereco.numero || ''} ${cliente.endereco.complemento || ''}`.trim());
        form.setValue('cliente_cidade', cliente.endereco.cidade || '');
        form.setValue('cliente_uf', cliente.endereco.estado || '');
        form.setValue('cliente_cep', cliente.endereco.cep || '');
      }
    }
  };

  // Preencher formulário quando editar
  useEffect(() => {
    if (nfe) {
      form.reset({
        numero_nfe: nfe.numero_nfe,
        serie: nfe.serie,
        data_emissao: nfe.data_emissao,
        data_saida: nfe.data_saida || '',
        valor_total: nfe.valor_total,
        valor_icms: nfe.valor_icms || 0,
        valor_ipi: nfe.valor_ipi || 0,
        valor_pis: nfe.valor_pis || 0,
        valor_cofins: nfe.valor_cofins || 0,
        observacoes: nfe.observacoes || '',
        cliente_id: nfe.cliente_id || '',
        cliente_nome: nfe.cliente_nome || '',
        cliente_cnpj: nfe.cliente_cnpj || '',
        cliente_email: nfe.cliente_email || '',
        cliente_telefone: nfe.cliente_telefone || '',
        cliente_endereco: nfe.cliente_endereco || '',
        cliente_cidade: nfe.cliente_cidade || '',
        cliente_uf: nfe.cliente_uf || '',
        cliente_cep: nfe.cliente_cep || '',
        criar_conta_receber: nfe.criar_conta_receber || false,
        condicao_recebimento: nfe.condicao_recebimento,
        configuracao_fiscal_id: nfe.configuracao_fiscal_id || '',
        gerar_numero_automaticamente: nfe.numero_gerado_automaticamente || false,
        // Campos de regime tributário
        regime_tributacao: nfe.regime_tributacao,
        // Campos de tipo e finalidade da operação
        tipo_operacao: nfe.tipo_operacao || 'saida',
        finalidade: nfe.finalidade || 'normal',
        natureza_operacao: nfe.natureza_operacao || '',
        // Campos de pagamento
        forma_pagamento: nfe.forma_pagamento || '',
        valor_entrada: nfe.valor_entrada || 0,
        quantidade_parcelas: nfe.quantidade_parcelas || 1,
        // Campos de transporte
        modalidade_frete: nfe.modalidade_frete,
        transportador_id: nfe.transportador_id || '',
        transportador_nome: nfe.transportador_nome || '',
        transportador_cnpj: nfe.transportador_cnpj || '',
        transportador_ie: nfe.transportador_ie || '',
        transportador_endereco: nfe.transportador_endereco || '',
        transportador_cidade: nfe.transportador_cidade || '',
        transportador_uf: nfe.transportador_uf || '',
        veiculo_placa: nfe.veiculo_placa || '',
        veiculo_uf: nfe.veiculo_uf || '',
        veiculo_rntc: nfe.veiculo_rntc || '',
        quantidade_volumes: nfe.quantidade_volumes || 0,
        especie_volumes: nfe.especie_volumes || '',
        marca_volumes: nfe.marca_volumes || '',
        numeracao_volumes: nfe.numeracao_volumes || '',
        peso_bruto: nfe.peso_bruto || 0,
        peso_liquido: nfe.peso_liquido || 0,
        // Campos detalhados de ICMS
        modalidade_icms: nfe.modalidade_icms || '',
        cst_icms: nfe.cst_icms || '',
        base_calculo_icms: nfe.base_calculo_icms || 0,
        aliquota_icms: nfe.aliquota_icms || 0,
        valor_icms_st: nfe.valor_icms_st || 0,
        base_calculo_icms_st: nfe.base_calculo_icms_st || 0,
        aliquota_icms_st: nfe.aliquota_icms_st || 0,
        percentual_reducao_base_icms: nfe.percentual_reducao_base_icms || 0,
        percentual_mva_icms_st: nfe.percentual_mva_icms_st || 0,
        // Campos detalhados de IPI
        enquadramento_ipi: nfe.enquadramento_ipi || '',
        cst_ipi: nfe.cst_ipi || '',
        base_calculo_ipi: nfe.base_calculo_ipi || 0,
        aliquota_ipi: nfe.aliquota_ipi || 0,
        valor_ipi_tributado: nfe.valor_ipi_tributado || 0,
        valor_ipi_isento: nfe.valor_ipi_isento || 0,
        valor_ipi_outros: nfe.valor_ipi_outros || 0,
        // Campos de informações complementares
        informacoes_fisco: nfe.informacoes_fisco || '',
        informacoes_complementares: nfe.informacoes_complementares || '',
      });
    }
  }, [nfe, form]);

  // Adicionar item
  const addItem = () => {
    const newItem: NFeItem = {
      numero_item: itens.length + 1,
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      unidade: 'UN',
    };
    setItens([...itens, newItem]);
  };

  // Remover item
  const removeItem = (index: number) => {
    const newItens = itens.filter((_, i) => i !== index);
    // Renumerar itens
    newItens.forEach((item, i) => {
      item.numero_item = i + 1;
    });
    setItens(newItens);
    updateValorTotal();
  };

  // Atualizar item
  const updateItem = (index: number, field: keyof NFeItem, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    
    // Recalcular valor total do item
    if (field === 'quantidade' || field === 'valor_unitario') {
      const item = newItens[index];
      item.valor_total = (item.quantidade || 1) * (item.valor_unitario || 0) - (item.valor_desconto || 0);
    }
    
    setItens(newItens);
    updateValorTotal();
  };

  // Atualizar valor total da nota
  const updateValorTotal = () => {
    const total = itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
    form.setValue('valor_total', total);
  };

  const onSubmit = async (data: NFeFormValues) => {
    try {
      setIsSubmitting(true);
      
      const formData: NFeFormData = {
        ...data,
        itens: itens.length > 0 ? itens : undefined,
        pagamentos: pagamentos.length > 0 ? pagamentos : undefined,
      };
      
      await onSave(formData);
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
  const gerarAutomatico = form.watch('gerar_numero_automaticamente');
  const criarContaReceber = form.watch('criar_conta_receber');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {nfe ? 'Editar NF-e' : 'Nova Nota Fiscal Eletrônica (NF-e)'}
          </CardTitle>
          <CardDescription>
            {nfe ? 'Edite os dados da NF-e' : 'Preencha os dados para criar e emitir uma nova NF-e'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="cliente">Cliente</TabsTrigger>
                  <TabsTrigger value="itens">Itens</TabsTrigger>
                  <TabsTrigger value="tributacao">Tributação</TabsTrigger>
                  <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
                  <TabsTrigger value="transporte">Transporte</TabsTrigger>
                  <TabsTrigger value="integracao">Integração</TabsTrigger>
                </TabsList>

                {/* Dados Básicos */}
                <TabsContent value="dados-basicos" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="configuracao_fiscal_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Configuração Fiscal *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                            disabled={loadingConfigs}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingConfigs ? "Carregando..." : "Selecione a configuração"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingConfigs ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : configuracoesFiscais.length === 0 ? (
                                <SelectItem value="none" disabled>Nenhuma configuração disponível</SelectItem>
                              ) : (
                                configuracoesFiscais.map((config) => (
                                  <SelectItem key={config.id} value={config.id}>
                                    {config.nome_configuracao} - {config.uf} ({config.ambiente})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Selecione a configuração fiscal para esta nota
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gerar_numero_automaticamente"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Gerar número automaticamente</FormLabel>
                            <FormDescription>
                              O número e série serão gerados automaticamente pela configuração fiscal
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numero_nfe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da NF-e {gerarAutomatico ? '' : '*'}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={loadingNumero ? "Gerando..." : "Ex: 000001234"} 
                              {...field} 
                              readOnly={gerarAutomatico}
                              disabled={loadingNumero || gerarAutomatico}
                            />
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
                          <FormLabel>Série {gerarAutomatico ? '' : '*'}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={loadingNumero ? "Gerando..." : "Ex: 1"} 
                              {...field} 
                              readOnly={gerarAutomatico}
                              disabled={loadingNumero || gerarAutomatico}
                            />
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
                              readOnly={itens.length > 0}
                            />
                          </FormControl>
                          <FormDescription>
                            {itens.length > 0 ? 'Calculado automaticamente pelos itens' : 'Valor total da nota fiscal'}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </TabsContent>

                {/* Cliente */}
                <TabsContent value="cliente" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cliente_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente/Destinatário</FormLabel>
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
                      name="cliente_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome/Razão Social</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do cliente" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_endereco"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número, complemento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cliente_cidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cliente_uf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input placeholder="UF" maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Itens */}
                <TabsContent value="itens" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Itens da Nota Fiscal</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {itens.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {itens.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-1">
                              <Label>Item</Label>
                              <Input value={item.numero_item} readOnly className="text-center" />
                            </div>
                            <div className="col-span-4">
                              <Label>Descrição *</Label>
                              <Input
                                value={item.descricao}
                                onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                                placeholder="Descrição do produto"
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>NCM</Label>
                              <Input
                                value={item.ncm || ''}
                                onChange={(e) => updateItem(index, 'ncm', e.target.value)}
                                placeholder="NCM"
                                maxLength={10}
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>CFOP</Label>
                              <Input
                                value={item.cfop || ''}
                                onChange={(e) => updateItem(index, 'cfop', e.target.value)}
                                placeholder="CFOP"
                                maxLength={5}
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>Unidade</Label>
                              <Input
                                value={item.unidade || 'UN'}
                                onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                                placeholder="UN"
                                maxLength={10}
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                step="0.0001"
                                value={item.quantidade}
                                onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>Valor Unit.</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.valor_unitario}
                                onChange={(e) => updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-1">
                              <Label>Valor Total</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.valor_total}
                                readOnly
                                className="font-semibold"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Aba: Tributação */}
                <TabsContent value="tributacao" className="space-y-4">
                  {/* Botão de Cálculo Automático */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Cálculo Automático de Tributos
                          </CardTitle>
                          <CardDescription>
                            Use o motor tributário para calcular automaticamente os impostos
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            const valorTotal = form.getValues('valor_total');
                            const uf = form.getValues('cliente_uf');
                            const dataEmissao = form.getValues('data_emissao');
                            const tipoOperacao = form.getValues('tipo_operacao') === 'saida' ? 'venda' as const : 'compra' as const;
                            
                            // Obter valores dos itens ou do formulário
                            const primeiroItem = itens.length > 0 ? itens[0] : null;
                            const ncm = primeiroItem?.ncm;
                            const cfop = primeiroItem?.cfop;
                            const cst = form.getValues('cst_icms') || primeiroItem?.cst_icms;

                            if (!valorTotal || valorTotal <= 0) {
                              toast.error('Informe o valor total primeiro');
                              return;
                            }

                            if (!uf) {
                              toast.error('Informe a UF do cliente primeiro');
                              return;
                            }

                            const result = await calcularTributosNFe({
                              valorMercadoria: valorTotal,
                              uf,
                              ncm,
                              dataOperacao: dataEmissao,
                              cst,
                              cfop,
                              tipoOperacao,
                            });

                            if (result) {
                              // Preencher valores calculados
                              if (result.icms) {
                                form.setValue('valor_icms', result.icms.valorICMS);
                                form.setValue('aliquota_icms', result.icms.aliquota * 100);
                                form.setValue('base_calculo_icms', result.icms.baseCalculo);
                                if (result.icms.valorICMSST) {
                                  form.setValue('valor_icms_st', result.icms.valorICMSST);
                                  form.setValue('base_calculo_icms_st', result.icms.baseCalculoST || 0);
                                }
                              }
                              if (result.ipi) {
                                form.setValue('valor_ipi', result.ipi.valorIPI);
                                form.setValue('aliquota_ipi', result.ipi.aliquota * 100);
                                form.setValue('base_calculo_ipi', result.ipi.baseCalculo);
                              }
                              if (result.pis) {
                                form.setValue('valor_pis', result.pis.valorPIS);
                              }
                              if (result.cofins) {
                                form.setValue('valor_cofins', result.cofins.valorCOFINS);
                              }
                              
                              toast.success('Tributos calculados automaticamente!');
                            }
                          }}
                          disabled={calculatingTaxes}
                        >
                          {calculatingTaxes ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Calculando...
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calcular Tributos Automaticamente
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Regime de Tributação e Tipo de Operação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Regime de Tributação e Operação
                      </CardTitle>
                      <CardDescription>
                        Informações sobre regime tributário e tipo de operação
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="regime_tributacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Regime de Tributação</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o regime" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="simples_nacional">
                                    Simples Nacional (Tributos Federais e Estaduais pelo Simples)
                                  </SelectItem>
                                  <SelectItem value="simples_nacional_icms_municipal">
                                    Simples Nacional (Federais pelo Simples, ICMS conforme Estadual)
                                  </SelectItem>
                                  <SelectItem value="regime_normal">
                                    Regime Normal (Conforme Legislações Federal e Estadual)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tipo_operacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Operação *</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="entrada">Entrada</SelectItem>
                                  <SelectItem value="saida">Saída</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="finalidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Finalidade *</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a finalidade" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="complementar">Complementar</SelectItem>
                                  <SelectItem value="ajuste">Ajuste</SelectItem>
                                  <SelectItem value="devolucao">Devolução</SelectItem>
                                  <SelectItem value="remessa">Remessa</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="natureza_operacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Natureza da Operação *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Venda de produção do estabelecimento" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Descrição da natureza da operação
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ICMS Detalhado */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        ICMS - Imposto sobre Circulação de Mercadorias e Serviços
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="modalidade_icms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modalidade de ICMS</FormLabel>
                              <FormControl>
                                <Input placeholder="Modalidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cst_icms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CST ICMS</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 00, 10, 20" maxLength={3} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="base_calculo_icms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base de Cálculo do ICMS</FormLabel>
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
                          name="aliquota_icms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alíquota do ICMS (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
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
                          name="percentual_reducao_base_icms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>% Redução da Base de Cálculo</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-4">ICMS Substituição Tributária (ST)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="base_calculo_icms_st"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Base de Cálculo do ICMS ST</FormLabel>
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
                            name="aliquota_icms_st"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Alíquota do ICMS ST (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
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
                            name="percentual_mva_icms_st"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>% MVA (Margem de Valor Agregado)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
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
                            name="valor_icms_st"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do ICMS ST</FormLabel>
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
                    </CardContent>
                  </Card>

                  {/* IPI Detalhado */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        IPI - Imposto sobre Produtos Industrializados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="enquadramento_ipi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de Enquadramento IPI</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 999" maxLength={3} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cst_ipi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CST IPI</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 00, 01, 02" maxLength={2} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="base_calculo_ipi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base de Cálculo do IPI</FormLabel>
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
                          name="aliquota_ipi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alíquota do IPI (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
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
                          name="valor_ipi_tributado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor IPI Tributado</FormLabel>
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
                          name="valor_ipi_isento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor IPI Isento</FormLabel>
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
                          name="valor_ipi_outros"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor IPI Outros</FormLabel>
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
                    </CardContent>
                  </Card>

                  {/* Informações Complementares */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Informações Complementares
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="informacoes_fisco"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Informações de Interesse do Fisco</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Informações adicionais de interesse do fisco"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="informacoes_complementares"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Informações Complementares</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Informações complementares de interesse do contribuinte"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba: Pagamento */}
                <TabsContent value="pagamento" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Forma de Pagamento
                      </CardTitle>
                      <CardDescription>
                        Configure a forma de pagamento e parcelas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="forma_pagamento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forma de Pagamento</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: À vista, A prazo, Cartão de crédito" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="valor_entrada"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor de Entrada</FormLabel>
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
                          name="quantidade_parcelas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade de Parcelas</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>
                                Número de parcelas do pagamento
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          As parcelas de pagamento podem ser configuradas após salvar a nota fiscal.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba: Transporte */}
                <TabsContent value="transporte" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Dados de Transporte
                      </CardTitle>
                      <CardDescription>
                        Preencha apenas se houver transporte de mercadorias
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="modalidade_frete"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modalidade do Frete</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a modalidade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="por_conta_emitente">Por conta do emitente</SelectItem>
                                <SelectItem value="por_conta_destinatario">Por conta do destinatário</SelectItem>
                                <SelectItem value="por_conta_terceiros">Por conta de terceiros</SelectItem>
                                <SelectItem value="sem_frete">Sem frete</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="transportador_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transportador</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const transportador = (partnersData?.data || []).find((p: any) => p.id === value);
                                  if (transportador) {
                                    form.setValue('transportador_nome', transportador.nome_fantasia || transportador.razao_social);
                                    form.setValue('transportador_cnpj', transportador.cnpj || '');
                                    if (transportador.endereco) {
                                      form.setValue('transportador_endereco', 
                                        `${transportador.endereco.logradouro || ''}, ${transportador.endereco.numero || ''}`.trim());
                                      form.setValue('transportador_cidade', transportador.endereco.cidade || '');
                                      form.setValue('transportador_uf', transportador.endereco.estado || '');
                                    }
                                  }
                                }} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o transportador" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(partnersData?.data || [])
                                    .filter((p: any) => {
                                      if (!p.tipo || !Array.isArray(p.tipo)) return true;
                                      return p.tipo.includes('transportador');
                                    })
                                    .map((partner: any) => (
                                      <SelectItem key={partner.id} value={partner.id}>
                                        {partner.nome_fantasia || partner.razao_social}
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
                          name="transportador_nome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome/Razão Social</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do transportador" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transportador_cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CNPJ/CPF</FormLabel>
                              <FormControl>
                                <Input placeholder="00.000.000/0000-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transportador_ie"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inscrição Estadual</FormLabel>
                              <FormControl>
                                <Input placeholder="IE" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transportador_endereco"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua, número" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transportador_cidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input placeholder="Cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transportador_uf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>UF</FormLabel>
                              <FormControl>
                                <Input placeholder="UF" maxLength={2} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-4">Dados do Veículo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="veiculo_placa"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Placa do Veículo</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABC1234" maxLength={8} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="veiculo_uf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>UF do Veículo</FormLabel>
                                <FormControl>
                                  <Input placeholder="UF" maxLength={2} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="veiculo_rntc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>RNTC (Registro Nacional de Transportador de Carga)</FormLabel>
                                <FormControl>
                                  <Input placeholder="RNTC" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-4">Volumes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="quantidade_volumes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantidade de Volumes</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="especie_volumes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Espécie</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Caixas, Pallets" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="marca_volumes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Marca</FormLabel>
                                <FormControl>
                                  <Input placeholder="Marca dos volumes" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="numeracao_volumes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Numeração</FormLabel>
                                <FormControl>
                                  <Input placeholder="Numeração dos volumes" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="peso_bruto"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Peso Bruto (kg)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.000"
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
                            name="peso_liquido"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Peso Líquido (kg)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.000"
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
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Integração */}
                <TabsContent value="integracao" className="space-y-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="criar_conta_receber"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Criar Conta a Receber Automaticamente</FormLabel>
                            <FormDescription>
                              Quando a nota for autorizada, uma conta a receber será criada automaticamente
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {criarContaReceber && (
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
                    )}

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {criarContaReceber 
                          ? `Uma conta a receber será criada automaticamente quando esta nota for autorizada, com vencimento em ${form.watch('condicao_recebimento') || 30} dias.`
                          : 'A conta a receber não será criada automaticamente. Você pode criar manualmente na página de Contas a Receber.'}
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

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
