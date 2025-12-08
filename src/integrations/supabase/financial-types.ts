// =====================================================
// TIPOS DO MÓDULO FINANCEIRO
// =====================================================
// Data: 2025-01-15
// Descrição: Tipos TypeScript para o módulo financeiro
// Autor: Sistema MultiWeave Core

export interface ContaPagar {
  id: string;
  company_id: string;
  numero_titulo: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  descricao: string;
  valor_original: number;
  valor_atual: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
  categoria?: string;
  status: 'pendente' | 'aprovado' | 'pago' | 'vencido' | 'cancelado';
  forma_pagamento?: string;
  conta_bancaria_id?: string;
  observacoes?: string;
  anexos?: string[];
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  valor_pago: number;
  data_aprovacao?: string;
  aprovado_por?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Campos de parcelamento
  is_parcelada?: boolean;
  numero_parcelas?: number;
  intervalo_parcelas?: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  conta_pagar_principal_id?: string;
  // Campos de status de aprovação agregado
  approval_status?: 'pendente' | 'em_aprovacao' | 'aprovado' | 'rejeitado' | 'sem_aprovacao';
  total_aprovacoes?: number;
  aprovacoes_pendentes?: number;
  aprovacoes_aprovadas?: number;
  aprovacoes_rejeitadas?: number;
  nivel_atual_aprovacao?: number;
  proximo_aprovador_id?: string;
  // Campos de alerta de vencimento
  dias_ate_vencimento?: number;
  tipo_alerta?: 'vencida' | 'vencendo_hoje' | 'vencendo_em_3_dias' | 'vencendo_em_7_dias' | 'sem_alerta';
  esta_vencida?: boolean;
  esta_proxima_vencer?: boolean;
}

export interface ContaPagarParcela {
  id: string;
  conta_pagar_id: string;
  company_id: string;
  numero_parcela: number;
  valor_parcela: number;
  valor_original: number;
  valor_atual: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  valor_pago: number;
  status: 'pendente' | 'aprovado' | 'pago' | 'vencido' | 'cancelado';
  numero_titulo?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContaReceber {
  id: string;
  company_id: string;
  numero_titulo: string;
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  descricao: string;
  valor_original: number;
  valor_atual: number;
  data_emissao: string;
  data_vencimento: string;
  data_recebimento?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
  categoria?: string;
  status: 'pendente' | 'confirmado' | 'recebido' | 'vencido' | 'cancelado';
  forma_recebimento?: string;
  conta_bancaria_id?: string;
  observacoes?: string;
  anexos?: string[];
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  valor_recebido: number;
  data_confirmacao?: string;
  confirmado_por?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Novos campos
  condicao_recebimento?: number; // 30, 45, 60 ou 90 dias
  valor_pis?: number;
  valor_cofins?: number;
  valor_csll?: number;
  valor_ir?: number;
  valor_inss?: number;
  valor_iss?: number;
}

export interface Borderos {
  id: string;
  company_id: string;
  numero_borderos: string;
  data_geracao: string;
  data_vencimento: string;
  valor_total: number;
  quantidade_titulos: number;
  status: 'gerado' | 'enviado' | 'processado' | 'retornado';
  banco_codigo?: string;
  arquivo_remessa?: string;
  arquivo_retorno?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContaBancaria {
  id: string;
  company_id: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  tipo_conta: 'corrente' | 'poupanca' | 'investimento';
  moeda: string;
  saldo_atual: number;
  saldo_disponivel: number;
  limite_credito: number;
  data_saldo?: string;
  is_active: boolean;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FluxoCaixa {
  id: string;
  company_id: string;
  data_projecao: string;
  tipo_movimento: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  conta_bancaria_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  status: 'previsto' | 'confirmado' | 'realizado';
  data_confirmacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NFe {
  id: string;
  company_id: string;
  chave_acesso: string;
  numero_nfe: string;
  serie: string;
  data_emissao: string;
  data_saida?: string;
  valor_total: number;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  status_sefaz: 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada' | 'inutilizada';
  xml_nfe?: string;
  danfe_url?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Novos campos
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_cidade?: string;
  cliente_uf?: string;
  cliente_cep?: string;
  conta_receber_id?: string;
  criar_conta_receber?: boolean;
  condicao_recebimento?: number;
  configuracao_fiscal_id?: string;
  numero_protocolo?: string;
  data_autorizacao?: string;
  numero_gerado_automaticamente?: boolean;
  // Campos de regime tributário
  regime_tributacao?: 'simples_nacional' | 'simples_nacional_icms_municipal' | 'regime_normal';
  // Campos de tipo e finalidade da operação
  tipo_operacao?: 'entrada' | 'saida';
  finalidade?: 'normal' | 'complementar' | 'ajuste' | 'devolucao' | 'remessa';
  natureza_operacao?: string;
  // Campos de pagamento
  forma_pagamento?: string;
  valor_entrada?: number;
  quantidade_parcelas?: number;
  // Campos de transporte
  modalidade_frete?: 'por_conta_emitente' | 'por_conta_destinatario' | 'por_conta_terceiros' | 'sem_frete';
  transportador_id?: string;
  transportador_nome?: string;
  transportador_cnpj?: string;
  transportador_ie?: string;
  transportador_endereco?: string;
  transportador_cidade?: string;
  transportador_uf?: string;
  veiculo_placa?: string;
  veiculo_uf?: string;
  veiculo_rntc?: string;
  quantidade_volumes?: number;
  especie_volumes?: string;
  marca_volumes?: string;
  numeracao_volumes?: string;
  peso_bruto?: number;
  peso_liquido?: number;
  // Campos detalhados de ICMS
  modalidade_icms?: string;
  cst_icms?: string;
  base_calculo_icms?: number;
  aliquota_icms?: number;
  valor_icms_st?: number;
  base_calculo_icms_st?: number;
  aliquota_icms_st?: number;
  percentual_reducao_base_icms?: number;
  percentual_mva_icms_st?: number;
  // Campos detalhados de IPI
  enquadramento_ipi?: string;
  cst_ipi?: string;
  base_calculo_ipi?: number;
  aliquota_ipi?: number;
  valor_ipi_tributado?: number;
  valor_ipi_isento?: number;
  valor_ipi_outros?: number;
  // Campos de informações complementares
  informacoes_fisco?: string;
  informacoes_complementares?: string;
}

export interface NFePagamento {
  id?: string;
  nfe_id?: string;
  company_id?: string;
  numero_parcela: number;
  forma_pagamento?: string;
  valor_parcela: number;
  data_vencimento?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanoContas {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  tipo_conta: 'ativo' | 'passivo' | 'patrimonio' | 'receita' | 'despesa';
  nivel: number;
  conta_pai_id?: string;
  is_active: boolean;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LancamentoContabil {
  id: string;
  company_id: string;
  data_lancamento: string;
  conta_debito_id: string;
  conta_credito_id: string;
  valor: number;
  historico: string;
  documento?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  tipo_lancamento: 'manual' | 'automatico' | 'importado';
  origem_id?: string;
  origem_tipo?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracaoAprovacao {
  id: string;
  company_id: string;
  tipo_aprovacao: string;
  valor_limite: number;
  centro_custo_id?: string;
  departamento?: string;
  classe_financeira?: string;
  usuario_id?: string;
  nivel_aprovacao: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Aprovacao {
  id: string;
  company_id: string;
  entidade_tipo: string;
  entidade_id: string;
  nivel_aprovacao: number;
  aprovador_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data_aprovacao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS
// =====================================================

export interface ContaPagarFormData {
  numero_titulo?: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  descricao: string;
  valor_original: number;
  valor_desconto?: number;
  valor_juros?: number;
  valor_multa?: number;
  data_emissao: string;
  data_vencimento: string;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
  categoria?: string;
  forma_pagamento?: string;
  conta_bancaria_id?: string;
  observacoes?: string;
  anexos?: string[];
  // Campos de parcelamento
  is_parcelada?: boolean;
  numero_parcelas?: number;
  intervalo_parcelas?: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  data_primeira_parcela?: string;
  parcelas?: ContaPagarParcelaFormData[];
}

export interface ContaPagarParcelaFormData {
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  observacoes?: string;
}

export interface ContaReceberFormData {
  numero_titulo?: string;
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  descricao: string;
  valor_original: number;
  data_emissao: string;
  data_vencimento: string;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
  categoria?: string;
  forma_recebimento?: string;
  conta_bancaria_id?: string;
  observacoes?: string;
  anexos?: string[];
  // Novos campos
  condicao_recebimento?: number; // 30, 45, 60 ou 90 dias
  valor_pis?: number;
  valor_cofins?: number;
  valor_csll?: number;
  valor_ir?: number;
  valor_inss?: number;
  valor_iss?: number;
}

export interface FluxoCaixaFormData {
  data_projecao: string;
  tipo_movimento: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  conta_bancaria_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  status?: 'previsto' | 'confirmado' | 'realizado';
  observacoes?: string;
}

// =====================================================
// TIPOS PARA FILTROS
// =====================================================

export interface ContaPagarFilters {
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  numero_titulo?: string;
  status?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_emissao_inicio?: string;
  data_emissao_fim?: string;
  data_pagamento_inicio?: string;
  data_pagamento_fim?: string;
  valor_minimo?: number;
  valor_maximo?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
  categoria?: string;
  forma_pagamento?: string;
  conta_bancaria_id?: string;
  is_parcelada?: boolean;
  // Filtros de vencimento
  apenas_vencidas?: boolean;
  apenas_proximas_vencer?: boolean;
  dias_alerta?: number;
}

export interface ContaReceberFilters {
  cliente_nome?: string;
  status?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  valor_minimo?: number;
  valor_maximo?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  departamento?: string;
  classe_financeira?: string;
}

// =====================================================
// TIPOS PARA RELATÓRIOS
// =====================================================

export interface AgingReport {
  fornecedor_nome: string;
  total_pendente: number;
  vencido_1_30: number;
  vencido_31_60: number;
  vencido_61_90: number;
  vencido_mais_90: number;
  a_vencer_1_30: number;
  a_vencer_31_60: number;
  a_vencer_mais_60: number;
}

export interface KPIs {
  dso: number;
  dpo: number;
  total_pagar: number;
  total_receber: number;
  saldo_caixa: number;
  fluxo_previsto_30_dias: number;
}

// =====================================================
// TIPOS PARA APROVAÇÃO
// =====================================================

export interface AprovacaoData {
  entidade_tipo: string;
  entidade_id: string;
  aprovador_id: string;
  status: 'aprovado' | 'rejeitado';
  observacoes?: string;
}

export interface AprovacaoStatus {
  total_aprovacoes: number;
  aprovadas: number;
  pendentes: number;
  rejeitadas: number;
  nivel_atual: number;
  nivel_necessario: number;
}

// =====================================================
// TIPOS PARA TESOURARIA
// =====================================================

export interface ConciliacaoBancaria {
  id: string;
  company_id: string;
  conta_bancaria_id: string;
  data_inicio: string;
  data_fim: string;
  saldo_inicial: number;
  saldo_final: number;
  total_entradas: number;
  total_saidas: number;
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  arquivo_extrato?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimentoBancario {
  id: string;
  company_id: string;
  conta_bancaria_id: string;
  data_movimento: string;
  data_conciliacao?: string;
  descricao: string;
  valor: number;
  tipo_movimento: 'entrada' | 'saida';
  categoria: string;
  documento?: string;
  conciliado: boolean;
  conciliacao_id?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjecaoFluxoCaixa {
  data: string;
  entradas_previstas: number;
  saidas_previstas: number;
  saldo_projetado: number;
  entradas_confirmadas: number;
  saidas_confirmadas: number;
  saldo_confirmado: number;
  diferenca: number;
}

export interface RelatorioTesouraria {
  periodo_inicio: string;
  periodo_fim: string;
  saldo_inicial: number;
  saldo_final: number;
  total_entradas: number;
  total_saidas: number;
  fluxo_liquido: number;
  contas_nao_conciliadas: number;
  valor_nao_conciliado: number;
  projecao_30_dias: number;
  projecao_60_dias: number;
  projecao_90_dias: number;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS DE TESOURARIA
// =====================================================

export interface ContaBancariaFormData {
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  tipo_conta: 'corrente' | 'poupanca' | 'investimento';
  moeda: string;
  limite_credito?: number;
  observacoes?: string;
}

export interface FluxoCaixaFormData {
  data_projecao: string;
  tipo_movimento: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  conta_bancaria_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  status?: 'previsto' | 'confirmado' | 'realizado';
  observacoes?: string;
}

export interface ConciliacaoFormData {
  conta_bancaria_id: string;
  data_inicio: string;
  data_fim: string;
  saldo_inicial: number;
  arquivo_extrato?: File;
  observacoes?: string;
}

// =====================================================
// TIPOS PARA FILTROS DE TESOURARIA
// =====================================================

export interface TesourariaFilters {
  conta_bancaria_id?: string;
  data_inicio?: string;
  data_fim?: string;
  tipo_movimento?: 'entrada' | 'saida';
  categoria?: string;
  status?: string;
  conciliado?: boolean;
}

// =====================================================
// TIPOS PARA RELATÓRIOS DE TESOURARIA
// =====================================================

export interface FluxoCaixaReport {
  data: string;
  entradas: number;
  saidas: number;
  saldo_dia: number;
  saldo_acumulado: number;
  movimentos: number;
}

export interface ConciliacaoReport {
  conta_nome: string;
  periodo: string;
  saldo_inicial: number;
  saldo_final: number;
  total_entradas: number;
  total_saidas: number;
  movimentos_conciliados: number;
  movimentos_nao_conciliados: number;
  valor_nao_conciliado: number;
  status: string;
}

// =====================================================
// TIPOS PARA MÓDULO FISCAL
// =====================================================

export interface NFSe {
  id: string;
  company_id: string;
  numero_nfse: string;
  codigo_verificacao?: string;
  data_emissao: string;
  data_competencia: string;
  valor_servico: number;
  valor_deducoes: number;
  valor_pis: number;
  valor_cofins: number;
  valor_inss: number;
  valor_ir: number;
  valor_csll: number;
  valor_iss: number;
  valor_liquido: number;
  status_sefaz: 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada' | 'inutilizada';
  xml_nfse?: string;
  danfse_url?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Novos campos
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_cidade?: string;
  cliente_uf?: string;
  cliente_cep?: string;
  conta_receber_id?: string;
  criar_conta_receber?: boolean;
  condicao_recebimento?: number;
  configuracao_fiscal_id?: string;
  numero_protocolo?: string;
  data_autorizacao?: string;
  numero_gerado_automaticamente?: boolean;
  // Campos de regime tributário
  regime_tributacao?: 'simples_nacional' | 'simples_nacional_issqn_municipal' | 'regime_normal';
  // Campos de ISSQN
  aliquota_iss?: number;
  base_calculo_iss?: number;
  municipio_incidencia_iss?: string;
  codigo_municipio_iss?: string;
  retencao_iss_na_fonte?: boolean;
  responsavel_recolhimento_iss?: 'prestador' | 'tomador' | 'intermediario';
  valor_iss_retencao?: number;
  exigibilidade_iss?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  // Campos de intermediário
  intermediario_id?: string;
  intermediario_nome?: string;
  intermediario_cnpj?: string;
  intermediario_inscricao_municipal?: string;
  intermediario_endereco?: string;
  intermediario_cidade?: string;
  intermediario_uf?: string;
  intermediario_cep?: string;
  intermediario_email?: string;
  intermediario_telefone?: string;
  // Campos de retenção de impostos federais
  retencao_impostos_federais?: boolean;
  valor_ir_retencao?: number;
  valor_pis_retencao?: number;
  valor_cofins_retencao?: number;
  valor_csll_retencao?: number;
  valor_inss_retencao?: number;
}

export interface SefazStatus {
  id: string;
  company_id: string;
  uf: string;
  servico: string;
  status: 'online' | 'offline' | 'indisponivel' | 'contingencia';
  ultima_verificacao: string;
  tempo_resposta?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface EventoFiscal {
  id: string;
  company_id: string;
  tipo_evento: 'emissao' | 'cancelamento' | 'inutilizacao' | 'correcao' | 'manifestacao';
  documento_tipo: 'nfe' | 'nfse';
  documento_id: string;
  chave_acesso?: string;
  numero_protocolo?: string;
  data_evento: string;
  status: 'pendente' | 'processado' | 'erro';
  xml_evento?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracaoFiscal {
  id: string;
  company_id: string;
  nome_configuracao: string;
  uf: string;
  tipo_documento: 'nfe' | 'nfse' | 'mdfe' | 'cte';
  ambiente: 'producao' | 'homologacao';
  certificado_digital?: string;
  senha_certificado?: string;
  data_validade_certificado?: string;
  webservice_url: string;
  versao_layout: string;
  serie_numeracao: number;
  numero_inicial: number;
  numero_final?: number;
  configuracao_uf?: Record<string, any>;
  certificado_valido: boolean;
  conectividade_ok: boolean;
  ultima_validacao?: string;
  erro_validacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracaoBancaria {
  id: string;
  company_id: string;
  nome_configuracao: string;
  banco_codigo: string;
  banco_nome: string;
  ambiente: 'producao' | 'sandbox' | 'homologacao';
  client_id?: string;
  client_secret?: string;
  api_key?: string;
  access_token?: string;
  refresh_token?: string;
  base_url: string;
  auth_url?: string;
  api_version: string;
  grant_type: string;
  scope?: string;
  token_expires_at?: string;
  configuracao_banco?: Record<string, any>;
  credenciais_validas: boolean;
  conectividade_ok: boolean;
  ultima_validacao?: string;
  erro_validacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LogValidacaoIntegracao {
  id: string;
  company_id: string;
  tipo_integracao: 'sefaz' | 'bancaria';
  configuracao_id: string;
  status: 'sucesso' | 'erro' | 'aviso';
  mensagem?: string;
  detalhes?: Record<string, any>;
  tempo_resposta_ms?: number;
  created_by?: string;
  created_at: string;
}

export interface ManifestacaoDestinatario {
  id: string;
  company_id: string;
  chave_acesso: string;
  cnpj_destinatario: string;
  tipo_manifestacao: 'ciencia' | 'confirmacao' | 'desconhecimento' | 'operacao_nao_realizada';
  justificativa?: string;
  data_manifestacao: string;
  status: 'pendente' | 'processado' | 'erro';
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS FISCAIS
// =====================================================

export interface NFeItem {
  id?: string;
  nfe_id?: string;
  company_id?: string;
  numero_item: number;
  codigo_produto?: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
  valor_icms?: number;
  valor_ipi?: number;
  valor_pis?: number;
  valor_cofins?: number;
  informacoes_adicionais?: string;
}

export interface NFSeItem {
  id?: string;
  nfse_id?: string;
  company_id?: string;
  numero_item: number;
  codigo_servico?: string;
  descricao: string;
  codigo_tributacao?: string;
  unidade?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto?: number;
  valor_deducoes?: number;
  valor_iss?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
  informacoes_adicionais?: string;
}

export interface NFeFormData {
  numero_nfe?: string;
  serie?: string;
  data_emissao: string;
  data_saida?: string;
  valor_total: number;
  valor_icms?: number;
  valor_ipi?: number;
  valor_pis?: number;
  valor_cofins?: number;
  observacoes?: string;
  // Novos campos
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_cidade?: string;
  cliente_uf?: string;
  cliente_cep?: string;
  criar_conta_receber?: boolean;
  condicao_recebimento?: number;
  configuracao_fiscal_id?: string;
  gerar_numero_automaticamente?: boolean;
  itens?: NFeItem[];
  // Campos de regime tributário
  regime_tributacao?: 'simples_nacional' | 'simples_nacional_icms_municipal' | 'regime_normal';
  // Campos de tipo e finalidade da operação
  tipo_operacao?: 'entrada' | 'saida';
  finalidade?: 'normal' | 'complementar' | 'ajuste' | 'devolucao' | 'remessa';
  natureza_operacao?: string;
  // Campos de pagamento
  forma_pagamento?: string;
  valor_entrada?: number;
  quantidade_parcelas?: number;
  pagamentos?: NFePagamento[];
  // Campos de transporte
  modalidade_frete?: 'por_conta_emitente' | 'por_conta_destinatario' | 'por_conta_terceiros' | 'sem_frete';
  transportador_id?: string;
  transportador_nome?: string;
  transportador_cnpj?: string;
  transportador_ie?: string;
  transportador_endereco?: string;
  transportador_cidade?: string;
  transportador_uf?: string;
  veiculo_placa?: string;
  veiculo_uf?: string;
  veiculo_rntc?: string;
  quantidade_volumes?: number;
  especie_volumes?: string;
  marca_volumes?: string;
  numeracao_volumes?: string;
  peso_bruto?: number;
  peso_liquido?: number;
  // Campos detalhados de ICMS
  modalidade_icms?: string;
  cst_icms?: string;
  base_calculo_icms?: number;
  aliquota_icms?: number;
  valor_icms_st?: number;
  base_calculo_icms_st?: number;
  aliquota_icms_st?: number;
  percentual_reducao_base_icms?: number;
  percentual_mva_icms_st?: number;
  // Campos detalhados de IPI
  enquadramento_ipi?: string;
  cst_ipi?: string;
  base_calculo_ipi?: number;
  aliquota_ipi?: number;
  valor_ipi_tributado?: number;
  valor_ipi_isento?: number;
  valor_ipi_outros?: number;
  // Campos de informações complementares
  informacoes_fisco?: string;
  informacoes_complementares?: string;
}

export interface NFSeFormData {
  numero_nfse?: string;
  data_emissao: string;
  data_competencia: string;
  valor_servico: number;
  valor_deducoes?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
  valor_iss?: number;
  valor_liquido?: number;
  observacoes?: string;
  // Novos campos
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_cidade?: string;
  cliente_uf?: string;
  cliente_cep?: string;
  criar_conta_receber?: boolean;
  condicao_recebimento?: number;
  configuracao_fiscal_id?: string;
  gerar_numero_automaticamente?: boolean;
  itens?: NFSeItem[];
  // Campos de regime tributário
  regime_tributacao?: 'simples_nacional' | 'simples_nacional_issqn_municipal' | 'regime_normal';
  // Campos de ISSQN
  aliquota_iss?: number;
  base_calculo_iss?: number;
  municipio_incidencia_iss?: string;
  codigo_municipio_iss?: string;
  retencao_iss_na_fonte?: boolean;
  responsavel_recolhimento_iss?: 'prestador' | 'tomador' | 'intermediario';
  valor_iss_retencao?: number;
  exigibilidade_iss?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  // Campos de intermediário
  intermediario_id?: string;
  intermediario_nome?: string;
  intermediario_cnpj?: string;
  intermediario_inscricao_municipal?: string;
  intermediario_endereco?: string;
  intermediario_cidade?: string;
  intermediario_uf?: string;
  intermediario_cep?: string;
  intermediario_email?: string;
  intermediario_telefone?: string;
  // Campos de retenção de impostos federais
  retencao_impostos_federais?: boolean;
  valor_ir_retencao?: number;
  valor_pis_retencao?: number;
  valor_cofins_retencao?: number;
  valor_csll_retencao?: number;
  valor_inss_retencao?: number;
}

export interface ConfiguracaoFiscalFormData {
  tipo_documento: 'nfe' | 'nfse';
  uf: string;
  ambiente: 'producao' | 'homologacao';
  certificado_digital?: File;
  senha_certificado?: string;
  webservice_url: string;
  versao_layout: string;
  serie: number;
  numero_inicial: number;
  numero_final?: number;
  observacoes?: string;
}

// =====================================================
// TIPOS PARA FILTROS FISCAIS
// =====================================================

export interface FiscalFilters {
  tipo_documento?: 'nfe' | 'nfse';
  status_sefaz?: string;
  data_emissao_inicio?: string;
  data_emissao_fim?: string;
  valor_minimo?: number;
  valor_maximo?: number;
  uf?: string;
  ambiente?: 'producao' | 'homologacao';
}

// =====================================================
// TIPOS PARA RELATÓRIOS FISCAIS
// =====================================================

export interface RelatorioFiscal {
  periodo_inicio: string;
  periodo_fim: string;
  total_nfes: number;
  total_nfses: number;
  valor_total_nfes: number;
  valor_total_nfses: number;
  valor_total_impostos: number;
  nfes_autorizadas: number;
  nfes_canceladas: number;
  nfes_rejeitadas: number;
  nfses_autorizadas: number;
  nfses_canceladas: number;
  nfses_rejeitadas: number;
}

export interface SefazMonitorReport {
  uf: string;
  servicos: {
    servico: string;
    status: string;
    ultima_verificacao: string;
    tempo_resposta?: number;
  }[];
  disponibilidade_geral: number;
  tempo_medio_resposta: number;
}

// =====================================================
// TIPOS PARA MÓDULO CONTABILIDADE
// =====================================================

export interface PlanoContas {
  id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  tipo_conta: 'ativo' | 'passivo' | 'patrimonio' | 'receita' | 'despesa' | 'custos';
  nivel: number;
  conta_pai_id?: string;
  aceita_lancamento: boolean;
  saldo_inicial: number;
  saldo_atual: number;
  natureza?: 'devedora' | 'credora';
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA CLASSES FINANCEIRAS GERENCIAIS
// =====================================================

export interface ClasseFinanceira {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  classe_pai_id?: string;
  nivel: number;
  ordem: number;
  is_active: boolean;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClasseFinanceiraConta {
  id: string;
  company_id: string;
  classe_financeira_id: string;
  conta_contabil_id: string;
  is_default: boolean;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClasseFinanceiraFormData {
  codigo: string;
  nome: string;
  descricao?: string;
  classe_pai_id?: string;
  ordem?: number;
  observacoes?: string;
}

export interface ClasseFinanceiraContaFormData {
  classe_financeira_id: string;
  conta_contabil_id: string;
  is_default?: boolean;
  observacoes?: string;
}

export interface LancamentoContabil {
  id: string;
  company_id: string;
  data_lancamento: string;
  data_competencia: string;
  numero_documento: string;
  historico: string;
  valor_total: number;
  tipo_lancamento: 'manual' | 'automatico' | 'importado';
  origem: 'contas_pagar' | 'contas_receber' | 'tesouraria' | 'fiscal' | 'manual';
  origem_id?: string;
  status: 'rascunho' | 'aprovado' | 'estornado';
  observacoes?: string;
  created_by?: string;
  aprovado_by?: string;
  aprovado_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemLancamento {
  id: string;
  lancamento_id: string;
  conta_id: string;
  centro_custo_id?: string;
  debito: number;
  credito: number;
  historico: string;
  created_at: string;
  updated_at: string;
}

export interface CentroCusto {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'producao' | 'administrativo' | 'comercial' | 'financeiro';
  ativo: boolean;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateioContabil {
  id: string;
  company_id: string;
  conta_id: string;
  centro_custo_id: string;
  percentual: number;
  valor: number;
  periodo_inicio: string;
  periodo_fim: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpedFiscal {
  id: string;
  company_id: string;
  periodo: string;
  versao_layout: string;
  status: 'gerando' | 'gerado' | 'validado' | 'erro';
  arquivo_url?: string;
  data_geracao: string;
  data_validacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpedContabil {
  id: string;
  company_id: string;
  periodo: string;
  versao_layout: string;
  status: 'gerando' | 'gerado' | 'validado' | 'erro';
  arquivo_url?: string;
  data_geracao: string;
  data_validacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Balancete {
  id: string;
  company_id: string;
  periodo: string;
  conta_id: string;
  saldo_anterior: number;
  debito_periodo: number;
  credito_periodo: number;
  saldo_atual: number;
  natureza: 'devedora' | 'credora';
  created_at: string;
  updated_at: string;
}

export interface DRE {
  id: string;
  company_id: string;
  periodo: string;
  conta_id: string;
  descricao: string;
  valor_periodo: number;
  valor_acumulado: number;
  nivel: number;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface BalancoPatrimonial {
  id: string;
  company_id: string;
  periodo: string;
  conta_id: string;
  descricao: string;
  valor_atual: number;
  valor_anterior: number;
  variacao: number;
  percentual_variacao: number;
  nivel: number;
  ordem: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA FORMULÁRIOS CONTÁBEIS
// =====================================================

export interface PlanoContasFormData {
  codigo: string;
  nome: string;
  tipo: 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'despesa' | 'custos';
  nivel: number;
  conta_pai_id?: string;
  aceita_lancamento: boolean;
  saldo_inicial: number;
  natureza: 'devedora' | 'credora';
  observacoes?: string;
}

export interface LancamentoFormData {
  data_lancamento: string;
  data_competencia: string;
  numero_documento: string;
  historico: string;
  valor_total: number;
  tipo_lancamento: 'manual' | 'automatico' | 'importado';
  origem: 'contas_pagar' | 'contas_receber' | 'tesouraria' | 'fiscal' | 'manual';
  origem_id?: string;
  observacoes?: string;
  itens: {
    conta_id: string;
    centro_custo_id?: string;
    debito: number;
    credito: number;
    historico: string;
  }[];
}

export interface CentroCustoFormData {
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'producao' | 'administrativo' | 'comercial' | 'financeiro';
  ativo: boolean;
}

export interface RateioFormData {
  conta_id: string;
  centro_custo_id: string;
  percentual: number;
  valor: number;
  periodo_inicio: string;
  periodo_fim: string;
  observacoes?: string;
}

// =====================================================
// TIPOS PARA FILTROS CONTÁBEIS
// =====================================================

export interface ContabilidadeFilters {
  periodo_inicio?: string;
  periodo_fim?: string;
  conta_id?: string;
  centro_custo_id?: string;
  tipo_lancamento?: string;
  status?: string;
  origem?: string;
}

// =====================================================
// TIPOS PARA RELATÓRIOS CONTÁBEIS
// =====================================================

export interface RelatorioContabil {
  periodo_inicio: string;
  periodo_fim: string;
  total_lancamentos: number;
  total_debitos: number;
  total_creditos: number;
  saldo_periodo: number;
  lancamentos_aprovados: number;
  lancamentos_pendentes: number;
  lancamentos_estornados: number;
}

export interface SpedReport {
  periodo: string;
  tipo: 'fiscal' | 'contabil';
  status: string;
  data_geracao: string;
  data_validacao?: string;
  arquivo_url?: string;
  observacoes?: string;
}

