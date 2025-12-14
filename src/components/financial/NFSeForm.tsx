// =====================================================
// COMPONENTE: FORMULÁRIO DE NFS-e
// =====================================================
// Data: 2025-12-06
// Descrição: Formulário completo para criar/editar NFS-e com integração a contas a receber
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
import { FileText, Save, X, AlertCircle, Calculator, User, Settings, Plus, Trash2 } from 'lucide-react';
import { NFSe, NFSeFormData, NFSeItem } from '@/integrations/supabase/financial-types';
import { usePartners } from '@/hooks/usePartners';
import { useCompany } from '@/lib/company-context';
import { ConfiguracaoFiscalService } from '@/services/financial/configuracaoFiscalService';
import { ConfiguracaoFiscal } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { useTaxCalculation } from '@/hooks/tributario/useTaxCalculation';

// Schema de validação
const nfseSchema = z.object({
  numero_nfse: z.string().optional(),
  data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
  data_competencia: z.string().min(1, 'Data de competência é obrigatória'),
  valor_servico: z.number().min(0.01, 'Valor do serviço deve ser maior que zero'),
  valor_deducoes: z.number().min(0, 'Valor das deduções deve ser maior ou igual a zero').optional(),
  valor_pis: z.number().min(0, 'Valor PIS deve ser maior ou igual a zero').optional(),
  valor_cofins: z.number().min(0, 'Valor COFINS deve ser maior ou igual a zero').optional(),
  valor_inss: z.number().min(0, 'Valor INSS deve ser maior ou igual a zero').optional(),
  valor_ir: z.number().min(0, 'Valor IR deve ser maior ou igual a zero').optional(),
  valor_csll: z.number().min(0, 'Valor CSLL deve ser maior ou igual a zero').optional(),
  valor_iss: z.number().min(0, 'Valor ISS deve ser maior ou igual a zero').optional(),
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
  regime_tributacao: z.enum(['simples_nacional', 'simples_nacional_issqn_municipal', 'regime_normal']).optional(),
  // Campos de ISSQN
  aliquota_iss: z.number().min(0).max(1).optional(),
  base_calculo_iss: z.number().min(0).optional(),
  municipio_incidencia_iss: z.string().optional(),
  codigo_municipio_iss: z.string().optional(),
  retencao_iss_na_fonte: z.boolean().optional(),
  responsavel_recolhimento_iss: z.enum(['prestador', 'tomador', 'intermediario']).optional(),
  valor_iss_retencao: z.number().min(0).optional(),
  exigibilidade_iss: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9']).optional(),
  // Campos de intermediário
  intermediario_id: z.string().optional(),
  intermediario_nome: z.string().optional(),
  intermediario_cnpj: z.string().optional(),
  intermediario_inscricao_municipal: z.string().optional(),
  intermediario_endereco: z.string().optional(),
  intermediario_cidade: z.string().optional(),
  intermediario_uf: z.string().optional(),
  intermediario_cep: z.string().optional(),
  intermediario_email: z.string().email('Email inválido').optional().or(z.literal('')),
  intermediario_telefone: z.string().optional(),
  // Campos de retenção de impostos federais
  retencao_impostos_federais: z.boolean().optional(),
  valor_ir_retencao: z.number().min(0).optional(),
  valor_pis_retencao: z.number().min(0).optional(),
  valor_cofins_retencao: z.number().min(0).optional(),
  valor_csll_retencao: z.number().min(0).optional(),
  valor_inss_retencao: z.number().min(0).optional(),
});

type NFSeFormValues = z.infer<typeof nfseSchema>;

interface NFSeFormProps {
  nfse?: NFSe | null;
  onSave: (data: NFSeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NFSeForm({ nfse, onSave, onCancel, loading = false }: NFSeFormProps) {
  const { selectedCompany } = useCompany();
  const { data: partnersData, isLoading: loadingPartners } = usePartners();
  const { calcularTributosNFSe, loading: calculatingTaxes } = useTaxCalculation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingNumero, setLoadingNumero] = useState(false);
  const [configuracoesFiscais, setConfiguracoesFiscais] = useState<ConfiguracaoFiscal[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [itens, setItens] = useState<NFSeItem[]>([]);
  const [activeTab, setActiveTab] = useState('dados-basicos');

  const form = useForm<NFSeFormValues>({
    resolver: zodResolver(nfseSchema),
    defaultValues: {
      numero_nfse: '',
      data_emissao: new Date().toISOString().split('T')[0],
      data_competencia: new Date().toISOString().split('T')[0],
      valor_servico: 0,
      valor_deducoes: 0,
      valor_pis: 0,
      valor_cofins: 0,
      valor_inss: 0,
      valor_ir: 0,
      valor_csll: 0,
      valor_iss: 0,
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
      // Campos de ISSQN
      aliquota_iss: 0,
      base_calculo_iss: 0,
      municipio_incidencia_iss: '',
      codigo_municipio_iss: '',
      retencao_iss_na_fonte: false,
      responsavel_recolhimento_iss: undefined,
      valor_iss_retencao: 0,
      exigibilidade_iss: undefined,
      // Campos de intermediário
      intermediario_id: '',
      intermediario_nome: '',
      intermediario_cnpj: '',
      intermediario_inscricao_municipal: '',
      intermediario_endereco: '',
      intermediario_cidade: '',
      intermediario_uf: '',
      intermediario_cep: '',
      intermediario_email: '',
      intermediario_telefone: '',
      // Campos de retenção de impostos federais
      retencao_impostos_federais: false,
      valor_ir_retencao: 0,
      valor_pis_retencao: 0,
      valor_cofins_retencao: 0,
      valor_csll_retencao: 0,
      valor_inss_retencao: 0,
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
        setConfiguracoesFiscais(configs.filter(c => c.tipo_documento === 'nfse'));
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
      
      if (gerarAutomatico && configId && selectedCompany?.id && !nfse) {
        try {
          setLoadingNumero(true);
          const { data, error } = await (supabase as any).rpc('financeiro.generate_nfse_number', {
            p_company_id: selectedCompany.id,
            p_configuracao_fiscal_id: configId
          });

          if (error) throw error;
          if (data) {
            form.setValue('numero_nfse', data.numero);
          }
        } catch (error) {
          console.error('Erro ao gerar número da NFS-e:', error);
        } finally {
          setLoadingNumero(false);
        }
      }
    };

    generateNumber();
  }, [form.watch('gerar_numero_automaticamente'), form.watch('configuracao_fiscal_id'), selectedCompany?.id, nfse, form]);

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
      
      // Mudar para a aba de cliente para mostrar os dados preenchidos
      setActiveTab('cliente');
    }
  };

  // Calcular base de cálculo do ISSQN automaticamente
  useEffect(() => {
    const valorServico = form.watch('valor_servico') || 0;
    const valorDeducoes = form.watch('valor_deducoes') || 0;
    const baseCalculo = valorServico - valorDeducoes;
    form.setValue('base_calculo_iss', baseCalculo);
  }, [form.watch('valor_servico'), form.watch('valor_deducoes'), form]);

  // Preencher formulário quando editar
  useEffect(() => {
    if (nfse) {
      form.reset({
        numero_nfse: nfse.numero_nfse,
        data_emissao: nfse.data_emissao,
        data_competencia: nfse.data_competencia,
        valor_servico: nfse.valor_servico,
        valor_deducoes: nfse.valor_deducoes || 0,
        valor_pis: nfse.valor_pis || 0,
        valor_cofins: nfse.valor_cofins || 0,
        valor_inss: nfse.valor_inss || 0,
        valor_ir: nfse.valor_ir || 0,
        valor_csll: nfse.valor_csll || 0,
        valor_iss: nfse.valor_iss || 0,
        observacoes: nfse.observacoes || '',
        cliente_id: nfse.cliente_id || '',
        cliente_nome: nfse.cliente_nome || '',
        cliente_cnpj: nfse.cliente_cnpj || '',
        cliente_email: nfse.cliente_email || '',
        cliente_telefone: nfse.cliente_telefone || '',
        cliente_endereco: nfse.cliente_endereco || '',
        cliente_cidade: nfse.cliente_cidade || '',
        cliente_uf: nfse.cliente_uf || '',
        cliente_cep: nfse.cliente_cep || '',
        criar_conta_receber: nfse.criar_conta_receber || false,
        condicao_recebimento: nfse.condicao_recebimento,
        configuracao_fiscal_id: nfse.configuracao_fiscal_id || '',
        gerar_numero_automaticamente: nfse.numero_gerado_automaticamente || false,
        // Campos de regime tributário
        regime_tributacao: nfse.regime_tributacao,
        // Campos de ISSQN
        aliquota_iss: nfse.aliquota_iss || 0,
        base_calculo_iss: nfse.base_calculo_iss || (nfse.valor_servico - (nfse.valor_deducoes || 0)),
        municipio_incidencia_iss: nfse.municipio_incidencia_iss || '',
        codigo_municipio_iss: nfse.codigo_municipio_iss || '',
        retencao_iss_na_fonte: nfse.retencao_iss_na_fonte || false,
        responsavel_recolhimento_iss: nfse.responsavel_recolhimento_iss,
        valor_iss_retencao: nfse.valor_iss_retencao || 0,
        exigibilidade_iss: nfse.exigibilidade_iss,
        // Campos de intermediário
        intermediario_id: nfse.intermediario_id || '',
        intermediario_nome: nfse.intermediario_nome || '',
        intermediario_cnpj: nfse.intermediario_cnpj || '',
        intermediario_inscricao_municipal: nfse.intermediario_inscricao_municipal || '',
        intermediario_endereco: nfse.intermediario_endereco || '',
        intermediario_cidade: nfse.intermediario_cidade || '',
        intermediario_uf: nfse.intermediario_uf || '',
        intermediario_cep: nfse.intermediario_cep || '',
        intermediario_email: nfse.intermediario_email || '',
        intermediario_telefone: nfse.intermediario_telefone || '',
        // Campos de retenção de impostos federais
        retencao_impostos_federais: nfse.retencao_impostos_federais || false,
        valor_ir_retencao: nfse.valor_ir_retencao || 0,
        valor_pis_retencao: nfse.valor_pis_retencao || 0,
        valor_cofins_retencao: nfse.valor_cofins_retencao || 0,
        valor_csll_retencao: nfse.valor_csll_retencao || 0,
        valor_inss_retencao: nfse.valor_inss_retencao || 0,
      });
    }
  }, [nfse, form]);

  // Adicionar item
  const addItem = () => {
    const newItem: NFSeItem = {
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
  const updateItem = (index: number, field: keyof NFSeItem, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    
    // Recalcular valor total do item
    if (field === 'quantidade' || field === 'valor_unitario') {
      const item = newItens[index];
      item.valor_total = (item.quantidade || 1) * (item.valor_unitario || 0) - (item.valor_desconto || 0) - (item.valor_deducoes || 0);
    }
    
    setItens(newItens);
    updateValorTotal();
  };

  // Atualizar valor total da nota
  const updateValorTotal = () => {
    const total = itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
    form.setValue('valor_servico', total);
  };

  const onSubmit = async (data: NFSeFormValues) => {
    try {
      setIsSubmitting(true);
      
      const formData: NFSeFormData = {
        ...data,
        itens: itens.length > 0 ? itens : undefined,
      };
      
      await onSave(formData);
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
  const valorPIS = form.watch('valor_pis') || 0;
  const valorCOFINS = form.watch('valor_cofins') || 0;
  const valorINSS = form.watch('valor_inss') || 0;
  const valorIR = form.watch('valor_ir') || 0;
  const valorCSLL = form.watch('valor_csll') || 0;
  const valorISS = form.watch('valor_iss') || 0;
  
  const baseCalculo = valorServico - valorDeducoes;
  const totalImpostos = valorPIS + valorCOFINS + valorINSS + valorIR + valorCSLL + valorISS;
  const valorLiquido = baseCalculo - totalImpostos;
  
  const gerarAutomatico = form.watch('gerar_numero_automaticamente');
  const criarContaReceber = form.watch('criar_conta_receber');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {nfse ? 'Editar NFS-e' : 'Nova Nota Fiscal de Serviços Eletrônica (NFS-e)'}
          </CardTitle>
          <CardDescription>
            {nfse ? 'Edite os dados da NFS-e' : 'Preencha os dados para criar e emitir uma nova NFS-e'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="cliente">Cliente</TabsTrigger>
                  <TabsTrigger value="itens">Itens</TabsTrigger>
                  <TabsTrigger value="tributacao">Tributação</TabsTrigger>
                  <TabsTrigger value="integracao">Integração</TabsTrigger>
                </TabsList>

                {/* Aba: Dados Básicos */}
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
                              {configuracoesFiscais.map((config) => (
                                <SelectItem key={config.id} value={config.id}>
                                  {config.descricao || `Configuração ${config.id}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Selecione a configuração fiscal para esta NFS-e
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
                              O número será gerado automaticamente baseado na configuração fiscal
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="numero_nfse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da NFS-e {gerarAutomatico ? '(Gerado automaticamente)' : '*'}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: 000001234" 
                              {...field} 
                              disabled={gerarAutomatico || loadingNumero}
                            />
                          </FormControl>
                          {loadingNumero && (
                            <FormDescription>Gerando número...</FormDescription>
                          )}
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
                  </div>

                  {/* Cálculos de Impostos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Cálculo de Impostos
                      </CardTitle>
                      <CardDescription>
                        Informe os valores dos impostos ou deixe em branco para cálculo automático
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Valor do Serviço</span>
                          <span className="text-lg font-semibold">{formatCurrency(valorServico)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Valor das Deduções</span>
                          <span className="text-lg font-semibold text-red-600">-{formatCurrency(valorDeducoes)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Base de Cálculo</span>
                          <span className="text-xl font-bold">{formatCurrency(baseCalculo)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium">Total de Impostos</span>
                          <span className="text-xl font-bold text-red-600">{formatCurrency(totalImpostos)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-lg font-medium">Valor Líquido</span>
                          <span className="text-2xl font-bold text-green-600">{formatCurrency(valorLiquido)}</span>
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
                </TabsContent>

                {/* Aba: Cliente */}
                <TabsContent value="cliente" className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecione um cliente cadastrado para preencher automaticamente os dados abaixo.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cliente_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente/Tomador *</FormLabel>
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
                          <FormDescription>
                            Os dados abaixo serão preenchidos automaticamente ao selecionar um cliente
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
                            <Input 
                              placeholder="Nome do cliente" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ/CPF</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00.000.000/0000-00" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
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
                            <Input 
                              type="email" 
                              placeholder="email@exemplo.com" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
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
                            <Input 
                              placeholder="(00) 0000-0000" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
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
                            <Input 
                              placeholder="00000-000" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_endereco"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Rua, número, complemento" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cliente_cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Cidade" 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
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
                            <Input 
                              placeholder="UF" 
                              maxLength={2} 
                              {...field} 
                              readOnly
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormDescription>
                            Preenchido automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Aba: Itens */}
                <TabsContent value="itens" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Itens do Serviço</h3>
                      <p className="text-sm text-muted-foreground">
                        Adicione os itens de serviço prestado
                      </p>
                    </div>
                    <Button type="button" onClick={addItem} variant="outline" size="sm">
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
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">Item {item.numero_item}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <Label>Descrição do Serviço *</Label>
                                <Input
                                  value={item.descricao}
                                  onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                                  placeholder="Descreva o serviço prestado"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Descreva detalhadamente o serviço prestado. Este campo é livre e será usado na nota fiscal.
                                </p>
                              </div>

                              <div>
                                <Label>Código do Serviço (NBS/Lista Municipal)</Label>
                                <Input
                                  value={item.codigo_servico || ''}
                                  onChange={(e) => updateItem(index, 'codigo_servico', e.target.value)}
                                  placeholder="Ex: 14.01"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Código da lista de serviços do município ou NBS (Nomenclatura Brasileira de Serviços). 
                                  Consulte a lista de serviços do seu município ou a NBS para encontrar o código correto.
                                </p>
                              </div>

                              <div>
                                <Label>Código de Tributação Municipal (CST)</Label>
                                <Input
                                  value={item.codigo_tributacao || ''}
                                  onChange={(e) => updateItem(index, 'codigo_tributacao', e.target.value)}
                                  placeholder="Ex: 1401"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Código de Situação Tributária (CST) do município. Define como o serviço será tributado. 
                                  Consulte a legislação municipal para o código correto.
                                </p>
                              </div>

                              <div>
                                <Label>Unidade</Label>
                                <Input
                                  value={item.unidade || 'UN'}
                                  onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                                  placeholder="UN"
                                />
                              </div>

                              <div>
                                <Label>Quantidade *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.quantidade}
                                  onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              <div>
                                <Label>Valor Unitário *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor_unitario}
                                  onChange={(e) => updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              <div>
                                <Label>Desconto</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor_desconto || 0}
                                  onChange={(e) => updateItem(index, 'valor_desconto', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              <div>
                                <Label>Deduções</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor_deducoes || 0}
                                  onChange={(e) => updateItem(index, 'valor_deducoes', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              <div>
                                <Label>Valor Total</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor_total}
                                  disabled
                                  className="font-semibold"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Label>Informações Adicionais</Label>
                                <Textarea
                                  value={item.informacoes_adicionais || ''}
                                  onChange={(e) => updateItem(index, 'informacoes_adicionais', e.target.value)}
                                  placeholder="Informações adicionais sobre o serviço"
                                  className="min-h-[60px]"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {itens.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total dos Itens</span>
                          <span className="text-xl font-bold">{formatCurrency(itens.reduce((sum, item) => sum + (item.valor_total || 0), 0))}</span>
                        </div>
                      </CardContent>
                    </Card>
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
                            const valorServico = form.getValues('valor_servico');
                            const codigoMunicipio = form.getValues('codigo_municipio_iss');
                            const dataEmissao = form.getValues('data_emissao');
                            const valorDeducoes = form.getValues('valor_deducoes') || 0;
                            const tipoDeducao = form.getValues('tipo_base_calculo_iss') === 'deducao_presumida' ? 'presumida' as const : 'real' as const;

                            if (!valorServico || valorServico <= 0) {
                              toast.error('Informe o valor do serviço primeiro');
                              return;
                            }

                            if (!codigoMunicipio) {
                              toast.error('Informe o código do município (IBGE) primeiro');
                              return;
                            }

                            const result = await calcularTributosNFSe({
                              valorServico,
                              municipioCodigoIBGE: codigoMunicipio,
                              dataOperacao: dataEmissao,
                              valorDeducoes: valorDeducoes > 0 ? valorDeducoes : undefined,
                              tipoDeducao: valorDeducoes > 0 ? tipoDeducao : undefined,
                            });

                            if (result) {
                              // Preencher valores calculados
                              if (result.iss) {
                                form.setValue('valor_iss', result.iss.valorISS);
                                form.setValue('aliquota_iss', result.iss.aliquota);
                                form.setValue('base_calculo_iss', result.iss.baseCalculo);
                              }
                              if (result.pis) {
                                form.setValue('valor_pis', result.pis.valorPIS);
                              }
                              if (result.cofins) {
                                form.setValue('valor_cofins', result.cofins.valorCOFINS);
                              }
                              if (result.inss) {
                                form.setValue('valor_inss', result.inss.valorINSS);
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

                  {/* Regime de Tributação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Regime de Apuração dos Tributos
                      </CardTitle>
                      <CardDescription>
                        Selecione o regime de apuração dos tributos aplicável
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="regime_tributacao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Regime de Tributação *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o regime de tributação" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="simples_nacional">
                                  Simples Nacional (Tributos Federais e Municipais pelo Simples)
                                </SelectItem>
                                <SelectItem value="simples_nacional_issqn_municipal">
                                  Simples Nacional (Federais pelo Simples, ISSQN conforme Municipal)
                                </SelectItem>
                                <SelectItem value="regime_normal">
                                  Regime Normal (Conforme Legislações Federal e Municipal)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              O regime de tributação determina como os tributos serão apurados e calculados
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* ISSQN Detalhado */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        ISSQN - Imposto Sobre Serviços
                      </CardTitle>
                      <CardDescription>
                        Informações detalhadas sobre o ISSQN
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="aliquota_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alíquota do ISSQN (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  placeholder="0.0500"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                Ex: 0.0500 = 5%
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="base_calculo_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base de Cálculo do ISSQN</FormLabel>
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
                                Valor do serviço - deduções
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="municipio_incidencia_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Município de Incidência do ISSQN</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do município" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="codigo_municipio_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código IBGE do Município</FormLabel>
                              <FormControl>
                                <Input placeholder="0000000" maxLength={7} {...field} />
                              </FormControl>
                              <FormDescription>
                                Código IBGE de 7 dígitos
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="exigibilidade_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de Exigibilidade do ISSQN</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o código" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">1 - Exigível</SelectItem>
                                  <SelectItem value="2">2 - Não incidência</SelectItem>
                                  <SelectItem value="3">3 - Isenção</SelectItem>
                                  <SelectItem value="4">4 - Exportação</SelectItem>
                                  <SelectItem value="5">5 - Imunidade</SelectItem>
                                  <SelectItem value="6">6 - Exigibilidade suspensa por decisão judicial</SelectItem>
                                  <SelectItem value="7">7 - Exigibilidade suspensa por processo administrativo</SelectItem>
                                  <SelectItem value="8">8 - Não exigível</SelectItem>
                                  <SelectItem value="9">9 - Retido na fonte</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="responsavel_recolhimento_iss"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsável pelo Recolhimento</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o responsável" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="prestador">Prestador</SelectItem>
                                  <SelectItem value="tomador">Tomador</SelectItem>
                                  <SelectItem value="intermediario">Intermediário</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="retencao_iss_na_fonte"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Retenção do ISSQN na Fonte</FormLabel>
                              <FormDescription>
                                Marque se há retenção do ISSQN na fonte
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch('retencao_iss_na_fonte') && (
                        <FormField
                          control={form.control}
                          name="valor_iss_retencao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor do ISSQN Retido na Fonte</FormLabel>
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
                      )}
                    </CardContent>
                  </Card>

                  {/* Intermediário */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Intermediário (Opcional)
                      </CardTitle>
                      <CardDescription>
                        Preencha apenas se houver intermediário na prestação do serviço
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="intermediario_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Intermediário</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const intermediario = (partnersData?.data || []).find((p: any) => p.id === value);
                                  if (intermediario) {
                                    form.setValue('intermediario_nome', intermediario.nome_fantasia || intermediario.razao_social);
                                    form.setValue('intermediario_cnpj', intermediario.cnpj || '');
                                    form.setValue('intermediario_email', intermediario.contato?.email || '');
                                    form.setValue('intermediario_telefone', intermediario.contato?.telefone || intermediario.contato?.celular || '');
                                    if (intermediario.endereco) {
                                      form.setValue('intermediario_endereco', 
                                        `${intermediario.endereco.logradouro || ''}, ${intermediario.endereco.numero || ''} ${intermediario.endereco.complemento || ''}`.trim());
                                      form.setValue('intermediario_cidade', intermediario.endereco.cidade || '');
                                      form.setValue('intermediario_uf', intermediario.endereco.estado || '');
                                      form.setValue('intermediario_cep', intermediario.endereco.cep || '');
                                    }
                                  }
                                }} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o intermediário" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(partnersData?.data || [])
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
                          name="intermediario_nome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome/Razão Social</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do intermediário" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intermediario_cnpj"
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
                          name="intermediario_inscricao_municipal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inscrição Municipal</FormLabel>
                              <FormControl>
                                <Input placeholder="Inscrição municipal" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intermediario_email"
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
                          name="intermediario_telefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 0000-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intermediario_cep"
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
                          name="intermediario_endereco"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua, número, complemento" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intermediario_cidade"
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
                          name="intermediario_uf"
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
                    </CardContent>
                  </Card>

                  {/* Retenção de Impostos Federais */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Retenção de Impostos Federais
                      </CardTitle>
                      <CardDescription>
                        Informe se há retenção de impostos federais na fonte
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="retencao_impostos_federais"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Há Retenção de Impostos Federais na Fonte</FormLabel>
                              <FormDescription>
                                Marque se há retenção de IR, PIS, COFINS, CSLL ou INSS na fonte
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch('retencao_impostos_federais') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="valor_ir_retencao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do IR Retido</FormLabel>
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
                            name="valor_pis_retencao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do PIS Retido</FormLabel>
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
                            name="valor_cofins_retencao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do COFINS Retido</FormLabel>
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
                            name="valor_csll_retencao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do CSLL Retido</FormLabel>
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
                            name="valor_inss_retencao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do INSS Retido</FormLabel>
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
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba: Integração */}
                <TabsContent value="integracao" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Integração com Contas a Receber
                      </CardTitle>
                      <CardDescription>
                        Configure a criação automática de conta a receber quando a NFS-e for autorizada
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                Quando a NFS-e for autorizada, uma conta a receber será criada automaticamente
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
                                onValueChange={(value) => field.onChange(parseInt(value))} 
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
                                Prazo para recebimento da conta a receber
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A conta a receber será criada automaticamente quando a NFS-e for autorizada pela SEFAZ.
                      Os valores dos impostos serão incluídos na conta a receber.
                    </AlertDescription>
                  </Alert>
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
