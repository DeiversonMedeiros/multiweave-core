// =====================================================
// TIPOS TYPESCRIPT PARA MÓDULO METALÚRGICA
// =====================================================

export type TipoProduto = 'produto_final' | 'semiacabado' | 'materia_prima' | 'insumo';
export type StatusOP = 'rascunho' | 'planejada' | 'aprovada' | 'materiais_reservados' | 'em_producao' | 'pausada' | 'concluida' | 'cancelada';
export type StatusOS = 'rascunho' | 'planejada' | 'aprovada' | 'materiais_reservados' | 'em_producao' | 'pausada' | 'concluida' | 'cancelada';
export type StatusLote = 'em_producao' | 'aguardando_inspecao' | 'aprovado' | 'reprovado' | 'retrabalho' | 'sucata' | 'concluido';
export type StatusGalvanizacao = 'pendente' | 'enviado' | 'em_processo' | 'concluido' | 'retornado' | 'entregue_direto' | 'cancelado';
export type StatusInspecao = 'pendente' | 'em_andamento' | 'aprovada' | 'reprovada' | 'retrabalho';
export type TipoParada = 'quebra_maquina' | 'falta_material' | 'setup' | 'manutencao_preventiva' | 'qualidade' | 'organizacional' | 'outros';
export type TipoNaoConformidade = 'materia_prima' | 'semiacabado' | 'produto_final' | 'galvanizado';
export type StatusNaoConformidade = 'identificada' | 'em_analise' | 'em_quarentena' | 'retrabalho' | 'sucata' | 'concessao_cliente' | 'resolvida';
export type StatusSolicitacaoMaterial = 'pendente' | 'parcialmente_atendida' | 'atendida' | 'cancelada';

// =====================================================
// PRODUTOS
// =====================================================

export interface Produto {
  id: string;
  company_id: string;
  material_equipamento_id?: string | null;
  codigo: string;
  descricao: string;
  tipo: TipoProduto;
  unidade_medida: string;
  peso_unitario_kg?: number | null;
  tempo_producao_minutos?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstruturaProduto {
  id: string;
  produto_pai_id: string;
  produto_filho_id: string;
  quantidade_necessaria: number;
  unidade_medida: string;
  perda_percentual: number;
  sequencia?: number | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// MÁQUINAS E PARADAS
// =====================================================

export interface Maquina {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null;
  capacidade_producao_hora?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipoParada {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  tipo: TipoParada;
  descricao?: string | null;
  afeta_oee: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParadaProducao {
  id: string;
  company_id: string;
  maquina_id: string;
  tipo_parada_id: string;
  op_id?: string | null;
  os_id?: string | null;
  data_hora_inicio: string;
  data_hora_termino?: string | null;
  duracao_minutos?: number | null;
  descricao?: string | null;
  responsavel_id?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ORDENS DE PRODUÇÃO E SERVIÇO
// =====================================================

export interface OrdemProducao {
  id: string;
  company_id: string;
  numero_op: string;
  produto_id: string;
  quantidade_solicitada: number;
  quantidade_produzida: number;
  peso_total_kg?: number | null;
  status: StatusOP;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  centro_custo_id?: string | null;
  projeto_id?: string | null;
  cliente_id?: string | null;
  data_prevista_inicio?: string | null;
  data_prevista_termino?: string | null;
  data_inicio_producao?: string | null;
  data_termino_producao?: string | null;
  responsavel_producao_id?: string | null;
  observacoes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrdemServico {
  id: string;
  company_id: string;
  numero_os: string;
  produto_id: string;
  quantidade_solicitada: number;
  quantidade_produzida: number;
  peso_total_kg?: number | null;
  status: StatusOS;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  centro_custo_id?: string | null;
  projeto_id?: string | null;
  op_vinculada_id?: string | null;
  data_prevista_inicio?: string | null;
  data_prevista_termino?: string | null;
  data_inicio_producao?: string | null;
  data_termino_producao?: string | null;
  responsavel_producao_id?: string | null;
  observacoes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SOLICITAÇÕES DE MATERIAIS
// =====================================================

export interface SolicitacaoMaterial {
  id: string;
  op_id?: string | null;
  os_id?: string | null;
  company_id: string;
  material_id: string;
  almoxarifado_id: string;
  quantidade_necessaria: number;
  quantidade_reservada: number;
  quantidade_liberada: number;
  status: StatusSolicitacaoMaterial;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// LOTES
// =====================================================

export interface Lote {
  id: string;
  company_id: string;
  numero_lote: string;
  op_id?: string | null;
  os_id?: string | null;
  produto_id: string;
  quantidade_produzida: number;
  peso_total_kg?: number | null;
  status: StatusLote;
  data_producao: string;
  data_inicio_producao?: string | null;
  data_termino_producao?: string | null;
  maquina_id?: string | null;
  responsavel_producao_id?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// GALVANIZAÇÃO
// =====================================================

export interface Galvanizacao {
  id: string;
  company_id: string;
  numero_galvanizacao: string;
  fornecedor_id: string;
  status: StatusGalvanizacao;
  entrega_direta_cliente: boolean;
  cliente_id?: string | null;
  data_envio?: string | null;
  data_prevista_retorno?: string | null;
  data_retorno?: string | null;
  data_entrega_cliente?: string | null;
  peso_total_kg?: number | null;
  observacoes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GalvanizacaoItem {
  id: string;
  galvanizacao_id: string;
  lote_id: string;
  quantidade: number;
  peso_kg?: number | null;
  observacoes?: string | null;
}

// =====================================================
// INSPEÇÕES E CERTIFICADOS
// =====================================================

export interface Inspecao {
  id: string;
  company_id: string;
  lote_id: string;
  tipo: 'inspecao_inicial' | 'inspecao_final' | 'inspecao_galvanizado';
  status: StatusInspecao;
  data_inspecao?: string | null;
  inspetor_id?: string | null;
  quantidade_inspecionada?: number | null;
  quantidade_aprovada: number;
  quantidade_reprovada: number;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificadoQualidade {
  id: string;
  company_id: string;
  numero_certificado: string;
  lote_id: string;
  inspecao_id: string;
  produto_id: string;
  quantidade_certificada: number;
  peso_total_kg?: number | null;
  data_emissao: string;
  data_validade?: string | null;
  emitido_por: string;
  observacoes?: string | null;
  arquivo_url?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// NÃO CONFORMIDADES
// =====================================================

export interface NaoConformidade {
  id: string;
  company_id: string;
  numero_nc: string;
  tipo: TipoNaoConformidade;
  status: StatusNaoConformidade;
  lote_id?: string | null;
  material_id?: string | null;
  descricao_problema: string;
  quantidade_afetada?: number | null;
  area_quarentena?: string | null;
  acao_corretiva?: string | null;
  responsavel_id?: string | null;
  data_identificacao: string;
  data_resolucao?: string | null;
  observacoes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// PCP - PLANEJAMENTO
// =====================================================

export interface PlanejamentoProducao {
  id: string;
  company_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: 'rascunho' | 'aprovado' | 'em_execucao' | 'concluido' | 'cancelado';
  observacoes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanejamentoItem {
  id: string;
  planejamento_id: string;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_realizada: number;
  data_prevista?: string | null;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  centro_custo_id?: string | null;
  projeto_id?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// INPUTS PARA CRIAÇÃO/EDIÇÃO
// =====================================================

export interface ProdutoInput {
  codigo: string;
  descricao: string;
  tipo: TipoProduto;
  unidade_medida: string;
  peso_unitario_kg?: number;
  tempo_producao_minutos?: number;
  material_equipamento_id?: string;
  ativo?: boolean;
  observacoes?: string;
}

export interface EstruturaProdutoInput {
  produto_pai_id: string;
  produto_filho_id: string;
  quantidade_necessaria: number;
  unidade_medida: string;
  perda_percentual?: number;
  sequencia?: number;
  observacoes?: string;
}

export interface OrdemProducaoInput {
  produto_id: string;
  quantidade_solicitada: number;
  peso_total_kg?: number;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
  centro_custo_id?: string;
  projeto_id?: string;
  cliente_id?: string;
  data_prevista_inicio?: string;
  data_prevista_termino?: string;
  observacoes?: string;
}

export interface OrdemServicoInput {
  produto_id: string;
  quantidade_solicitada: number;
  peso_total_kg?: number;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
  centro_custo_id?: string;
  projeto_id?: string;
  op_vinculada_id?: string;
  data_prevista_inicio?: string;
  data_prevista_termino?: string;
  observacoes?: string;
}

export interface LoteInput {
  produto_id: string;
  quantidade_produzida: number;
  peso_total_kg?: number;
  data_producao: string;
  maquina_id?: string;
  op_id?: string;
  os_id?: string;
  observacoes?: string;
}

export interface InspecaoInput {
  lote_id: string;
  tipo: 'inspecao_inicial' | 'inspecao_final' | 'inspecao_galvanizado';
  data_inspecao?: string;
  quantidade_inspecionada: number;
  quantidade_aprovada: number;
  quantidade_reprovada: number;
  observacoes?: string;
}

export interface GalvanizacaoInput {
  fornecedor_id: string;
  entrega_direta_cliente?: boolean;
  cliente_id?: string;
  data_envio?: string;
  data_prevista_retorno?: string;
  peso_total_kg?: number;
  observacoes?: string;
  itens: {
    lote_id: string;
    quantidade: number;
    peso_kg?: number;
  }[];
}

export interface PlanejamentoProducaoInput {
  periodo_inicio: string;
  periodo_fim: string;
  observacoes?: string;
  itens: {
    produto_id: string;
    quantidade_planejada: number;
    data_prevista?: string;
    prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
    centro_custo_id?: string;
    projeto_id?: string;
  }[];
}

// =====================================================
// INDICADORES
// =====================================================

export interface OEE {
  disponibilidade: number;
  performance: number;
  qualidade: number;
  oee: number;
}

export interface IndicadoresMaquina {
  maquina_id: string;
  maquina_nome: string;
  oee?: OEE;
  mtbf?: number; // em horas
  mttr?: number; // em horas
}

