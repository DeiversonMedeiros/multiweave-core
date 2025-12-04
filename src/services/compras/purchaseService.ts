import { supabase } from '@/integrations/supabase/client';
import { EntityFilters, EntityListResult, EntityService } from '@/services/generic/entityService';

export type RequisitionWorkflowState =
  | 'criada'
  | 'pendente_aprovacao'
  | 'aprovada'
  | 'reprovada'
  | 'encaminhada'
  | 'em_cotacao'
  | 'finalizada'
  | 'cancelada';

export type QuoteWorkflowState = 'aberta' | 'completa' | 'em_aprovacao' | 'aprovada' | 'reprovada';
export type PurchaseOrderWorkflowState = 'aberto' | 'aprovado' | 'reprovado' | 'entregue' | 'finalizado';
export type NFEntryStatus = 'pendente' | 'divergente' | 'confirmada';
export type NFComparisonStatus = 'nao_processada' | 'divergente' | 'conferida';

export interface PurchaseRequisition {
  id: string;
  company_id: string;
  numero_requisicao: string;
  status: string;
  workflow_state: RequisitionWorkflowState;
  tipo_requisicao: 'reposicao' | 'compra_direta' | 'emergencial';
  destino_almoxarifado_id?: string | null;
  local_entrega?: string | null;
  is_emergencial: boolean;
  centro_custo_id?: string | null;
  projeto_id?: string | null;
  solicitante_id: string;
  prioridade: string;
  valor_total_estimado?: number | null;
  created_at: string;
}

export interface PurchaseRequisitionItemInput {
  material_id: string;
  quantidade: number;
  unidade_medida?: string;
  valor_unitario_estimado?: number;
  observacoes?: string;
  almoxarifado_id?: string;
}

export interface PurchaseRequisitionInput {
  data_necessidade: string;
  prioridade: string;
  centro_custo_id: string;
  projeto_id?: string | null;
  tipo_requisicao: 'reposicao' | 'compra_direta' | 'emergencial';
  destino_almoxarifado_id?: string | null;
  local_entrega?: string | null;
  justificativa?: string;
  observacoes?: string;
  itens: PurchaseRequisitionItemInput[];
}

export interface QuoteCycleInput {
  requisicao_id: string;
  fornecedores: {
    fornecedor_id: string;
    prazo_entrega?: number;
    condicoes_comerciais?: string;
  }[];
  prazo_resposta?: string;
  observacoes?: string;
}

export interface QuoteSupplierResponseInput {
  cotacao_fornecedor_id: string;
  preco_total: number;
  prazo_entrega: number;
  condicoes_comerciais?: string;
  workflow_state: QuoteWorkflowState;
}

export interface PurchaseOrderInput {
  cotacao_id: string;
  fornecedor_id: string;
  data_entrega_prevista: string;
  condicoes_especiais?: string;
  observacoes?: string;
}

export interface NFEntryInput {
  pedido_id: string;
  fornecedor_id: string;
  numero_nota: string;
  serie?: string;
  chave_acesso?: string;
  data_emissao?: string;
  data_recebimento?: string;
  valor_total?: number;
  xml_payload?: string;
  observacoes?: string;
  itens: {
    pedido_item_id?: string;
    material_id?: string;
    descricao?: string;
    quantidade: number;
    unidade_medida?: string;
    valor_unitario?: number;
    valor_total?: number;
    ncm?: string;
    cfop?: string;
    cst?: string;
  }[];
}

const requisitionTransitions: Record<RequisitionWorkflowState, RequisitionWorkflowState[]> = {
  criada: ['pendente_aprovacao', 'cancelada'],
  pendente_aprovacao: ['aprovada', 'reprovada'],
  aprovada: ['encaminhada', 'cancelada'],
  reprovada: [],
  encaminhada: ['em_cotacao', 'cancelada'],
  em_cotacao: ['finalizada'],
  finalizada: [],
  cancelada: [],
};

const quoteTransitions: Record<QuoteWorkflowState, QuoteWorkflowState[]> = {
  aberta: ['completa', 'reprovada'],
  completa: ['em_aprovacao', 'reprovada'],
  em_aprovacao: ['aprovada', 'reprovada'],
  aprovada: [],
  reprovada: [],
};

const poTransitions: Record<PurchaseOrderWorkflowState, PurchaseOrderWorkflowState[]> = {
  aberto: ['aprovado', 'reprovado'],
  aprovado: ['entregue'],
  reprovado: [],
  entregue: ['finalizado'],
  finalizado: [],
};

function enforceTransition<T extends string>(
  current: T,
  next: T,
  mapping: Record<string, string[]>,
  entity: string,
) {
  const allowed = mapping[current] || [];
  if (!allowed.includes(next)) {
    throw new Error(`Transição inválida para ${entity}: ${current} → ${next}`);
  }
}

async function callSchemaFunction<T = any>(
  schemaName: string,
  functionName: string,
  params: Record<string, any> = {},
): Promise<T | null> {
  const { data, error } = await (supabase as any).rpc('call_schema_rpc', {
    schema_name: schemaName,
    function_name: functionName,
    params,
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || `Erro ao chamar ${schemaName}.${functionName}`);
  }

  return (data?.result ?? data) as T | null;
}

export const purchaseService = {
  async listRequisitions(
    companyId: string,
    filters?: EntityFilters,
  ): Promise<EntityListResult<PurchaseRequisition>> {
    return EntityService.list<PurchaseRequisition>({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });
  },

  async listQuotes(companyId: string, filters?: EntityFilters) {
    return EntityService.list({
      schema: 'compras',
      table: 'cotacoes',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });
  },

  async listPurchaseOrders(companyId: string, filters?: EntityFilters) {
    return EntityService.list({
      schema: 'compras',
      table: 'pedidos_compra',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });
  },

  async listNFEntries(companyId: string, filters?: EntityFilters) {
    return EntityService.list({
      schema: 'compras',
      table: 'nf_entradas',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });
  },

  async createRequisition(params: {
    companyId: string;
    userId: string;
    payload: PurchaseRequisitionInput;
  }) {
    const { companyId, userId, payload } = params;

    const numeroData = await callSchemaFunction<{ result: string }>('compras', 'gerar_numero_requisicao', {
      p_company_id: companyId,
    });

    const numero_requisicao =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result) ||
      `REQ-${new Date().getTime()}`;

    const requisicao = await EntityService.create({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId,
      data: {
        numero_requisicao,
        solicitante_id: userId,
        centro_custo_id: payload.centro_custo_id,
        projeto_id: payload.projeto_id,
        tipo_requisicao: payload.tipo_requisicao,
        destino_almoxarifado_id: payload.destino_almoxarifado_id,
        local_entrega: payload.local_entrega,
        is_emergencial: payload.tipo_requisicao === 'emergencial',
        justificativa: payload.justificativa,
        observacoes: payload.observacoes,
        data_necessidade: payload.data_necessidade,
        prioridade: payload.prioridade,
        workflow_state: payload.tipo_requisicao === 'emergencial' ? 'pendente_aprovacao' : 'criada',
      },
    });

    await Promise.all(
      payload.itens.map((item) =>
        EntityService.create({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          data: {
            requisicao_id: (requisicao as any)?.id,
            material_id: item.material_id,
            quantidade: item.quantidade,
            unidade_medida: item.unidade_medida || 'UN',
            valor_unitario_estimado: item.valor_unitario_estimado,
            observacoes: item.observacoes,
            almoxarifado_id: item.almoxarifado_id,
          },
        }),
      ),
    );

    return requisicao;
  },

  async transitionRequisition(params: {
    companyId: string;
    requisicaoId: string;
    from: RequisitionWorkflowState;
    to: RequisitionWorkflowState;
    actorId: string;
    payload?: Record<string, any>;
  }) {
    enforceTransition(params.from, params.to, requisitionTransitions, 'Requisição');

    const updated = await EntityService.update({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId: params.companyId,
      id: params.requisicaoId,
      data: {
        workflow_state: params.to,
        status:
          params.to === 'pendente_aprovacao'
            ? 'pendente_aprovacao'
            : params.to === 'aprovada'
              ? 'aprovada'
              : params.to === 'reprovada'
                ? 'cancelada'
                : undefined,
      },
    });

    await EntityService.create({
      schema: 'compras',
      table: 'workflow_logs',
      companyId: params.companyId,
      data: {
        entity_type: 'requisicao_compra',
        entity_id: params.requisicaoId,
        from_state: params.from,
        to_state: params.to,
        actor_id: params.actorId,
        payload: params.payload || {},
      },
    });

    return updated;
  },

  async startQuoteCycle(params: {
    companyId: string;
    userId: string;
    input: QuoteCycleInput;
  }) {
    const numeroData = await callSchemaFunction<{ result: string }>('compras', 'gerar_numero_requisicao', {
      p_company_id: params.companyId,
    });

    const numero_cotacao =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result)?.replace('REQ', 'COT') ||
      `COT-${Date.now()}`;

    const ciclo = await EntityService.create({
      schema: 'compras',
      table: 'cotacao_ciclos',
      companyId: params.companyId,
      data: {
        requisicao_id: params.input.requisicao_id,
        numero_cotacao,
        prazo_resposta: params.input.prazo_resposta,
        observacoes: params.input.observacoes,
      },
    });

    await Promise.all(
      params.input.fornecedores.map((fornecedor) =>
        EntityService.create({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: params.companyId,
          data: {
            cotacao_id: (ciclo as any)?.id,
            fornecedor_id: fornecedor.fornecedor_id,
            prazo_entrega: fornecedor.prazo_entrega,
            condicoes_comerciais: fornecedor.condicoes_comerciais,
          },
        }),
      ),
    );

    await purchaseService.transitionRequisition({
      companyId: params.companyId,
      requisicaoId: params.input.requisicao_id,
      from: 'encaminhada',
      to: 'em_cotacao',
      actorId: params.userId,
      payload: { cotacao_ciclo_id: (ciclo as any)?.id },
    });

    return ciclo;
  },

  async upsertQuoteSupplierResponse(params: {
    companyId: string;
    data: QuoteSupplierResponseInput;
  }) {
    const fornecedor = await EntityService.update({
      schema: 'compras',
      table: 'cotacao_fornecedores',
      companyId: params.companyId,
      id: params.data.cotacao_fornecedor_id,
      data: {
        preco_total: params.data.preco_total,
        prazo_entrega: params.data.prazo_entrega,
        condicoes_comerciais: params.data.condicoes_comerciais,
        status: params.data.workflow_state === 'completa' ? 'completa' : params.data.workflow_state,
        workflow_state: params.data.workflow_state,
      },
    });

    return fornecedor;
  },

  async transitionQuote(params: {
    companyId: string;
    cotacaoId: string;
    from: QuoteWorkflowState;
    to: QuoteWorkflowState;
    actorId: string;
    payload?: Record<string, any>;
  }) {
    enforceTransition(params.from, params.to, quoteTransitions, 'Cotação');

    const updated = await EntityService.update({
      schema: 'compras',
      table: 'cotacoes',
      companyId: params.companyId,
      id: params.cotacaoId,
      data: {
        workflow_state: params.to,
        status: params.to,
      },
    });

    await EntityService.create({
      schema: 'compras',
      table: 'workflow_logs',
      companyId: params.companyId,
      data: {
        entity_type: 'cotacao',
        entity_id: params.cotacaoId,
        from_state: params.from,
        to_state: params.to,
        actor_id: params.actorId,
        payload: params.payload || {},
      },
    });

    return updated;
  },

  async createPurchaseOrder(params: {
    companyId: string;
    userId: string;
    input: PurchaseOrderInput;
  }) {
    const numeroData = await callSchemaFunction<{ result: string }>('compras', 'gerar_numero_pedido', {
      p_company_id: params.companyId,
    });

    const numero_pedido =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result) || `PED-${Date.now()}`;

    const pedido = await EntityService.create({
      schema: 'compras',
      table: 'pedidos_compra',
      companyId: params.companyId,
      data: {
        numero_pedido,
        cotacao_id: params.input.cotacao_id,
        fornecedor_id: params.input.fornecedor_id,
        data_entrega_prevista: params.input.data_entrega_prevista,
        condicoes_especiais: params.input.condicoes_especiais,
        observacoes: params.input.observacoes,
        workflow_state: 'aberto',
      },
    });

    return pedido;
  },

  async transitionPurchaseOrder(params: {
    companyId: string;
    pedidoId: string;
    from: PurchaseOrderWorkflowState;
    to: PurchaseOrderWorkflowState;
    actorId: string;
    payload?: Record<string, any>;
  }) {
    enforceTransition(params.from, params.to, poTransitions, 'Pedido');

    const updated = await EntityService.update({
      schema: 'compras',
      table: 'pedidos_compra',
      companyId: params.companyId,
      id: params.pedidoId,
      data: {
        workflow_state: params.to,
        status: params.to === 'aberto' ? 'rascunho' : params.to,
      },
    });

    await EntityService.create({
      schema: 'compras',
      table: 'workflow_logs',
      companyId: params.companyId,
      data: {
        entity_type: 'pedido_compra',
        entity_id: params.pedidoId,
        from_state: params.from,
        to_state: params.to,
        actor_id: params.actorId,
        payload: params.payload || {},
      },
    });

    return updated;
  },

  async recordNFEntry(params: {
    companyId: string;
    userId: string;
    input: NFEntryInput;
  }) {
    const nf = await EntityService.create({
      schema: 'compras',
      table: 'nf_entradas',
      companyId: params.companyId,
      data: {
        pedido_id: params.input.pedido_id,
        fornecedor_id: params.input.fornecedor_id,
        numero_nota: params.input.numero_nota,
        serie: params.input.serie,
        chave_acesso: params.input.chave_acesso,
        data_emissao: params.input.data_emissao,
        data_recebimento: params.input.data_recebimento,
        valor_total: params.input.valor_total,
        xml_payload: params.input.xml_payload,
        observacoes: params.input.observacoes,
        status: 'pendente',
        created_by: params.userId,
      },
    });

    await Promise.all(
      params.input.itens.map((item) =>
        EntityService.create({
          schema: 'compras',
          table: 'nf_entrada_itens',
          companyId: params.companyId,
          data: {
            nf_entrada_id: (nf as any)?.id,
            pedido_item_id: item.pedido_item_id,
            material_id: item.material_id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade_medida: item.unidade_medida,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            ncm: item.ncm,
            cfop: item.cfop,
            cst: item.cst,
          },
        }),
      ),
    );

    return nf;
  },

  async compareNFWithPurchaseOrder(params: {
    companyId: string;
    nfEntradaId: string;
    priceTolerance?: number;
    qtyTolerance?: number;
  }) {
    const data = await callSchemaFunction(
      'compras',
      'compare_nf_pedido',
      {
        p_nf_entrada_id: params.nfEntradaId,
        p_price_tolerance: params.priceTolerance ?? 0.02,
        p_qty_tolerance: params.qtyTolerance ?? 0,
      },
    );

    return data;
  },

  async listFollowUp(companyId: string) {
    return EntityService.list({
      schema: 'compras',
      table: 'follow_up_view',
      companyId,
      skipCompanyFilter: true,
    });
  },
};


