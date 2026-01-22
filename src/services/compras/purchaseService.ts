import { supabase, comprasSupabase } from '@/integrations/supabase/client';
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
  id?: string; // ID opcional para identificar itens existentes na atualização
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
  service_id?: string | null;
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
    valor_frete?: number; // ✅ Campo de frete por fornecedor
    valor_imposto?: number; // ✅ Campo de imposto por fornecedor
  }[];
  prazo_resposta?: string;
  observacoes?: string;
  requisicao_item_ids?: string[]; // IDs específicos dos itens no modo explodido
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
  aprovada: ['encaminhada', 'em_cotacao', 'cancelada'], // Permitir transição direta de aprovada para em_cotacao
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
    p_schema_name: schemaName,
    p_function_name: functionName,
    p_params: params,
  });

  if (error) {
    console.error(`Erro ao chamar ${schemaName}.${functionName}:`, error);
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
    console.log('🔍 [purchaseService.listRequisitions] Buscando requisições com filters:', filters);
    const result = await EntityService.list<PurchaseRequisition>({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });
    console.log('✅ [purchaseService.listRequisitions] Resultado:', {
      total: result.total,
      count: result.data?.length || 0,
      statuses: result.data?.reduce((acc: any, req: any) => {
        const status = req.workflow_state || req.status || 'sem_status';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    });
    return result;
  },

  async listQuotes(companyId: string, filters?: EntityFilters) {
    // Buscar de cotacao_ciclos ao invés de cotacoes
    // cotacao_ciclos é criado automaticamente quando uma requisição é aprovada
    // cotacoes são as cotações individuais de fornecedores dentro de um ciclo
    // Usar a view cotacoes_with_requisicao que já inclui numero_requisicao via JOIN
    
    try {
      // Tentar usar a view primeiro (mais eficiente)
      const viewResult = await EntityService.list({
        schema: 'compras',
        table: 'cotacoes_with_requisicao',
        companyId,
        filters,
        page: 1,
        pageSize: 100,
      });

      if (viewResult.data && viewResult.data.length > 0) {
        console.log('✅ [listQuotes] Usando view cotacoes_with_requisicao');
        return viewResult;
      }
    } catch (error) {
      console.warn('⚠️ [listQuotes] View não disponível, usando busca manual:', error);
    }

    // Fallback: buscar de cotacao_ciclos e fazer JOIN manualmente
    const cotacoesResult = await EntityService.list({
      schema: 'compras',
      table: 'cotacao_ciclos',
      companyId,
      filters,
      page: 1,
      pageSize: 100,
    });

    if (!cotacoesResult.data || cotacoesResult.data.length === 0) {
      return cotacoesResult;
    }

    // Buscar os números das requisições usando query direta do Supabase
    const requisicaoIds = [...new Set(cotacoesResult.data.map((c: any) => c.requisicao_id).filter(Boolean))];

    if (requisicaoIds.length === 0) {
      return cotacoesResult;
    }

    // Buscar requisições em lote usando EntityService
    // Mapa para armazenar dados completos das requisições (numero, prioridade, tipo)
    const requisicoesMap = new Map<string, { numero_requisicao: string; prioridade: string; tipo_requisicao: string }>();
    try {
      console.log('🔍 [listQuotes] Buscando requisições. IDs necessários:', requisicaoIds);

      // Buscar todas as requisições da empresa e filtrar pelos IDs necessários
      const requisicoesResult = await EntityService.list({
        schema: 'compras',
        table: 'requisicoes_compra',
        companyId,
        filters: {},
        page: 1,
        pageSize: 1000,
      });

      console.log('🔍 [listQuotes] Requisições encontradas:', requisicoesResult.data?.length || 0);

      if (requisicoesResult.data) {
        // Normalizar IDs para string para garantir comparação correta
        const requisicaoIdsStr = requisicaoIds.map(id => String(id));

        requisicoesResult.data.forEach((req: any) => {
          const reqIdStr = String(req.id);
          if (req.id && requisicaoIdsStr.includes(reqIdStr)) {
            requisicoesMap.set(reqIdStr, {
              numero_requisicao: req.numero_requisicao || '',
              prioridade: req.prioridade || 'normal',
              tipo_requisicao: req.tipo_requisicao || 'reposicao',
              created_by: req.created_by || null,
            });
          }
        });
      }

      console.log(`✅ [listQuotes] Total mapeado: ${requisicoesMap.size} de ${requisicaoIds.length} necessários`);
    } catch (error) {
      console.error('❌ [listQuotes] Erro ao buscar números das requisições:', error);
    }

    // Adicionar dados das requisições aos dados das cotações
    const transformedData = cotacoesResult.data.map((cotacao: any) => {
      const reqIdStr = cotacao.requisicao_id ? String(cotacao.requisicao_id) : null;
      const reqData = reqIdStr ? requisicoesMap.get(reqIdStr) : null;

      return {
        ...cotacao,
        numero_requisicao: reqData?.numero_requisicao || null,
        prioridade: reqData?.prioridade || 'normal',
        tipo_requisicao: reqData?.tipo_requisicao || 'reposicao',
        requisicao_created_by: reqData?.created_by || null,
      };
    });

    console.log('✅ [listQuotes] Dados finais:', transformedData.map((c: any) => ({
      id: c.id,
      numero_cotacao: c.numero_cotacao,
      requisicao_id: c.requisicao_id,
      numero_requisicao: c.numero_requisicao
    })));

    return {
      ...cotacoesResult,
      data: transformedData,
    };
  },

  async deleteQuote(params: { companyId: string; quoteId: string }) {
    const { companyId, quoteId } = params;

    // Buscar a cotação para verificar se é rascunho
    let quote = null;
    try {
      quote = await EntityService.getById({
        schema: 'compras',
        table: 'cotacao_ciclos',
        id: quoteId,
        companyId,
      });
    } catch (error) {
      console.error('Erro ao buscar cotação para exclusão:', error);
      // Continuar mesmo se não encontrar, pode ser que já tenha sido deletada
    }

    const isRascunho = quote && (quote.workflow_state === 'rascunho' || quote.status === 'rascunho');

    // Se for rascunho, reverter status dos itens antes de deletar
    if (isRascunho) {
      try {
        // Buscar fornecedores da cotação
        const fornecedoresCotacaoResult = await EntityService.list({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId,
          filters: { cotacao_id: quoteId },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });
        const fornecedoresCotacao = fornecedoresCotacaoResult.data || [];
        const cotacaoFornecedoresIds = fornecedoresCotacao.map((fc: any) => fc.id);

        if (cotacaoFornecedoresIds.length > 0) {
          // Buscar todos os itens cotados (cotacao_item_fornecedor)
          const cotacaoItensResult = await EntityService.list({
            schema: 'compras',
            table: 'cotacao_item_fornecedor',
            companyId,
            filters: {},
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });

          const cotacaoItens = (cotacaoItensResult.data || []).filter((item: any) =>
            cotacaoFornecedoresIds.includes(item.cotacao_fornecedor_id)
          );

          // Obter requisicao_item_ids únicos
          const requisicaoItemIds = [...new Set(cotacaoItens.map((item: any) => item.requisicao_item_id).filter(Boolean))];

          // Reverter status dos itens de 'cotado' para 'pendente'
          await Promise.all(
            requisicaoItemIds.map(async (itemId) => {
              try {
                await EntityService.update({
                  schema: 'compras',
                  table: 'requisicao_itens',
                  companyId,
                  id: itemId,
                  data: { status: 'pendente' },
                });
              } catch (error) {
                console.error(`Erro ao reverter status do item ${itemId}:`, error);
                // Continuar mesmo se algum falhar
              }
            })
          );

          // Verificar e reverter workflow_state das requisições se necessário
          const requisicaoIds = new Set<string>();
          for (const itemId of requisicaoItemIds) {
            try {
              const item = await EntityService.getById({
                schema: 'compras',
                table: 'requisicao_itens',
                id: itemId,
                companyId,
              });
              if (item && (item as any).requisicao_id) {
                requisicaoIds.add((item as any).requisicao_id);
              }
            } catch (error) {
              console.error(`Erro ao buscar item ${itemId}:`, error);
            }
          }

          // Para cada requisição, verificar se todos os itens voltaram a pendente
          for (const reqId of Array.from(requisicaoIds)) {
            try {
              const itensRequisicao = await EntityService.list({
                schema: 'compras',
                table: 'requisicao_itens',
                companyId,
                filters: { requisicao_id: reqId },
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true,
              });

              const todosItensPendentes = (itensRequisicao.data || []).every(
                (item: any) => item.status === 'pendente' || !item.status
              );

              // Se todos os itens voltaram a pendente, reverter workflow_state da requisição
              if (todosItensPendentes) {
                const requisicao = await EntityService.getById({
                  schema: 'compras',
                  table: 'requisicoes_compra',
                  id: reqId,
                  companyId,
                });

                const currentState = (requisicao as any)?.workflow_state;
                
                // Reverter workflow_state se estava em 'em_cotacao'
                if (currentState === 'em_cotacao') {
                  // Buscar o estado anterior nos workflow_logs
                  try {
                    const logsResult = await EntityService.list({
                      schema: 'compras',
                      table: 'workflow_logs',
                      companyId,
                      filters: {
                        entity_type: 'requisicao_compra',
                        entity_id: reqId,
                        to_state: 'em_cotacao',
                      },
                      page: 1,
                      pageSize: 1,
                      skipCompanyFilter: true,
                    });

                    const log = logsResult.data && logsResult.data.length > 0 ? logsResult.data[0] : null;
                    const previousState = (log as any)?.from_state || 'aprovada';

                    // Reverter para o estado anterior (geralmente 'aprovada')
                    await EntityService.update({
                      schema: 'compras',
                      table: 'requisicoes_compra',
                      companyId,
                      id: reqId,
                      data: {
                        workflow_state: previousState,
                      },
                    });

                    // Registrar no log de workflow
                    await EntityService.create({
                      schema: 'compras',
                      table: 'workflow_logs',
                      companyId,
                      data: {
                        entity_type: 'requisicao_compra',
                        entity_id: reqId,
                        from_state: 'em_cotacao',
                        to_state: previousState,
                        actor_id: null, // Sistema
                        payload: { motivo: 'cotacao_rascunho_excluida', cotacao_ciclo_id: quoteId },
                      },
                    });
                  } catch (error) {
                    console.error(`Erro ao buscar logs ou reverter estado da requisição ${reqId}:`, error);
                    // Tentar reverter para 'aprovada' como fallback
                    try {
                      await EntityService.update({
                        schema: 'compras',
                        table: 'requisicoes_compra',
                        companyId,
                        id: reqId,
                        data: {
                          workflow_state: 'aprovada',
                        },
                      });
                    } catch (updateError) {
                      console.error(`Erro ao reverter estado da requisição ${reqId}:`, updateError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Erro ao verificar requisição ${reqId}:`, error);
              // Continuar mesmo se falhar
            }
          }
        }
      } catch (error) {
        console.error('Erro ao reverter status dos itens:', error);
        // Continuar com a exclusão mesmo se a reversão falhar
      }
    }

    // Deletar a cotação (isso vai deletar em cascata cotacao_fornecedores e cotacao_item_fornecedor)
    return EntityService.delete({
      schema: 'compras',
      table: 'cotacao_ciclos',
      companyId,
      id: quoteId,
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

    // Validar campos obrigatórios conforme constraint
    if (payload.tipo_requisicao === 'reposicao' && !payload.destino_almoxarifado_id) {
      throw new Error('Almoxarifado de destino é obrigatório para requisições de reposição');
    }
    if (payload.tipo_requisicao === 'compra_direta' && !payload.local_entrega) {
      throw new Error('Local de entrega é obrigatório para compras diretas');
    }

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
        status: 'rascunho', // Definir status como 'rascunho' para evitar validação da constraint
        workflow_state: 'pendente_aprovacao', // Sempre inicia aguardando aprovação após criação
      },
    });

    // Agrupar itens duplicados (mesmo material_id) antes de criar
    // A constraint UNIQUE(requisicao_id, material_id) impede duplicatas
    const itensAgrupados = new Map<string, {
      material_id: string;
      quantidade: number;
      unidade_medida: string;
      valor_unitario_estimado: number;
      observacoes: string[];
      almoxarifado_id?: string;
    }>();

    payload.itens.forEach((item) => {
      const key = item.material_id;
      if (itensAgrupados.has(key)) {
        const existente = itensAgrupados.get(key)!;
        existente.quantidade += item.quantidade;
        if (item.observacoes) {
          existente.observacoes.push(item.observacoes);
        }
        // Usar o maior valor unitário se houver diferença
        if (item.valor_unitario_estimado > existente.valor_unitario_estimado) {
          existente.valor_unitario_estimado = item.valor_unitario_estimado;
        }
      } else {
        itensAgrupados.set(key, {
          material_id: item.material_id,
          quantidade: item.quantidade,
          unidade_medida: item.unidade_medida || 'UN',
          valor_unitario_estimado: item.valor_unitario_estimado || 0,
          observacoes: item.observacoes ? [item.observacoes] : [],
          almoxarifado_id: item.almoxarifado_id,
        });
      }
    });

    // Criar itens sequencialmente para evitar problemas de concorrência
    // e garantir que a constraint seja respeitada
    const requisicaoId = (requisicao as any)?.id;
    for (const itemAgrupado of itensAgrupados.values()) {
      await EntityService.create({
        schema: 'compras',
        table: 'requisicao_itens',
        companyId,
        data: {
          requisicao_id: requisicaoId,
          material_id: itemAgrupado.material_id,
          quantidade: itemAgrupado.quantidade,
          unidade_medida: itemAgrupado.unidade_medida,
          valor_unitario_estimado: itemAgrupado.valor_unitario_estimado,
          observacoes: itemAgrupado.observacoes.length > 0 
            ? itemAgrupado.observacoes.join('; ') 
            : undefined,
          almoxarifado_id: itemAgrupado.almoxarifado_id,
        },
      });
    }

    return requisicao;
  },

  async updateRequisition(params: {
    companyId: string;
    requisicaoId: string;
    payload: PurchaseRequisitionInput;
  }) {
    const { companyId, requisicaoId, payload } = params;

    // Validar campos obrigatórios conforme constraint
    if (payload.tipo_requisicao === 'reposicao' && !payload.destino_almoxarifado_id) {
      throw new Error('Almoxarifado de destino é obrigatório para requisições de reposição');
    }
    if (payload.tipo_requisicao === 'compra_direta' && !payload.local_entrega) {
      throw new Error('Local de entrega é obrigatório para compras diretas');
    }

    // Atualizar a requisição
    const requisicao = await EntityService.update({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId,
      id: requisicaoId,
      data: {
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
      },
    });

    // Buscar itens existentes
    // Nota: requisicao_itens não tem company_id, então usamos skipCompanyFilter
    // A segurança é garantida pelo filtro requisicao_id que referencia uma requisição com company_id
    const existingItems = await EntityService.list({
      schema: 'compras',
      table: 'requisicao_itens',
      companyId,
      filters: { requisicao_id: requisicaoId },
      page: 1,
      pageSize: 1000,
      skipCompanyFilter: true, // Tabela não tem company_id diretamente
    });

    const existingItemIds = new Set((existingItems.data || []).map((item: any) => item.id));
    // Mapa de material_id para item existente (para verificar duplicatas)
    const existingItemsByMaterialId = new Map<string, any>();
    (existingItems.data || []).forEach((item: any) => {
      existingItemsByMaterialId.set(item.material_id, item);
    });
    
    const newItemIds = new Set(payload.itens.map((item: any) => item.id).filter(Boolean));

    // Deletar itens removidos
    const itemsToDelete = (existingItems.data || []).filter(
      (item: any) => !newItemIds.has(item.id)
    );
    await Promise.all(
      itemsToDelete.map((item: any) =>
        EntityService.delete({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          id: item.id,
          skipCompanyFilter: true, // Tabela não tem company_id diretamente
        })
      )
    );

    // Separar itens existentes (para atualizar) e novos (para criar)
    const itemsToUpdate: Array<{ id: string; data: any }> = [];
    const newItemsMap = new Map<string, {
      material_id: string;
      quantidade: number;
      unidade_medida: string;
      valor_unitario_estimado: number;
      observacoes: string[];
      almoxarifado_id?: string;
    }>();

    payload.itens.forEach((item) => {
      const itemData = {
        material_id: item.material_id,
        quantidade: item.quantidade,
        unidade_medida: item.unidade_medida || 'UN',
        valor_unitario_estimado: item.valor_unitario_estimado,
        observacoes: item.observacoes,
        almoxarifado_id: item.almoxarifado_id,
      };

      if (item.id && existingItemIds.has(item.id)) {
        // Item existente com ID conhecido - atualizar
        itemsToUpdate.push({ id: item.id, data: itemData });
      } else if (existingItemsByMaterialId.has(item.material_id)) {
        // Item sem ID mas já existe na requisição (mesmo material_id) - atualizar o existente
        const existingItem = existingItemsByMaterialId.get(item.material_id);
        itemsToUpdate.push({ id: existingItem.id, data: itemData });
      } else {
        // Novo item - agrupar por material_id para evitar duplicatas
        const key = item.material_id;
        if (newItemsMap.has(key)) {
          const existente = newItemsMap.get(key)!;
          existente.quantidade += item.quantidade;
          if (item.observacoes) {
            existente.observacoes.push(item.observacoes);
          }
          if (item.valor_unitario_estimado > existente.valor_unitario_estimado) {
            existente.valor_unitario_estimado = item.valor_unitario_estimado;
          }
        } else {
          newItemsMap.set(key, {
            material_id: item.material_id,
            quantidade: item.quantidade,
            unidade_medida: item.unidade_medida || 'UN',
            valor_unitario_estimado: item.valor_unitario_estimado || 0,
            observacoes: item.observacoes ? [item.observacoes] : [],
            almoxarifado_id: item.almoxarifado_id,
          });
        }
      }
    });

    // Atualizar itens existentes em paralelo
    await Promise.all(
      itemsToUpdate.map(({ id, data }) =>
        EntityService.update({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          id,
          data,
          skipCompanyFilter: true, // Tabela não tem company_id diretamente
        })
      )
    );

    // Criar novos itens sequencialmente para evitar problemas de concorrência
    // Verificar se já existe item com mesmo material_id antes de criar
    for (const itemAgrupado of newItemsMap.values()) {
      // Verificar se já existe item com este material_id na requisição
      const existingItemWithMaterial = existingItemsByMaterialId.get(itemAgrupado.material_id);
      
      if (existingItemWithMaterial) {
        // Se já existe, atualizar ao invés de criar
        await EntityService.update({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          id: existingItemWithMaterial.id,
          data: {
            quantidade: itemAgrupado.quantidade,
            unidade_medida: itemAgrupado.unidade_medida,
            valor_unitario_estimado: itemAgrupado.valor_unitario_estimado,
            observacoes: itemAgrupado.observacoes.length > 0 
              ? itemAgrupado.observacoes.join('; ') 
              : undefined,
            almoxarifado_id: itemAgrupado.almoxarifado_id,
          },
          skipCompanyFilter: true, // Tabela não tem company_id diretamente
        });
      } else {
        // Criar novo item apenas se não existir
        await EntityService.create({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          data: {
            requisicao_id: requisicaoId,
            material_id: itemAgrupado.material_id,
            quantidade: itemAgrupado.quantidade,
            unidade_medida: itemAgrupado.unidade_medida,
            valor_unitario_estimado: itemAgrupado.valor_unitario_estimado,
            observacoes: itemAgrupado.observacoes.length > 0 
              ? itemAgrupado.observacoes.join('; ') 
              : undefined,
            almoxarifado_id: itemAgrupado.almoxarifado_id,
          },
          skipCompanyFilter: true, // Tabela não tem company_id diretamente
        });
      }
    }

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
    // ✅ VERIFICAÇÃO DE CONCORRÊNCIA: Verificar se já existe cotação ativa
    // No modo explodido, verifica itens específicos; no modo normal, verifica a requisição inteira
    try {
      // Se estiver no modo explodido (requisicao_item_ids fornecido), verificar itens específicos
      if (params.input.requisicao_item_ids && params.input.requisicao_item_ids.length > 0) {
        // Buscar cotações ativas para a requisição
        const cotacoesExistentes = await EntityService.list({
          schema: 'compras',
          table: 'cotacao_ciclos',
          companyId: params.companyId,
          filters: {
            requisicao_id: params.input.requisicao_id,
          },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });

        if (cotacoesExistentes.data && cotacoesExistentes.data.length > 0) {
          // Filtrar apenas cotações ativas
          const cotacoesAtivas = cotacoesExistentes.data.filter((c: any) => {
            const state = c.workflow_state || c.status;
            return state === 'rascunho' || state === 'em_aprovacao' || state === 'aberta' || state === 'em_cotacao';
          });

          if (cotacoesAtivas.length > 0) {
            // Buscar os IDs dos fornecedores das cotações ativas
            const cotacoesAtivasIds = cotacoesAtivas.map((c: any) => c.id);
            
            // Buscar cotacao_fornecedores dessas cotações
            const cotacaoFornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'cotacao_fornecedores',
              companyId: params.companyId,
              filters: {},
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true,
            });

            const cotacaoFornecedoresIds = (cotacaoFornecedoresResult.data || [])
              .filter((cf: any) => cotacoesAtivasIds.includes(cf.cotacao_id))
              .map((cf: any) => cf.id);

            if (cotacaoFornecedoresIds.length > 0) {
              // Buscar itens cotados (cotacao_item_fornecedor) que correspondem aos itens selecionados
              const cotacaoItensResult = await EntityService.list({
                schema: 'compras',
                table: 'cotacao_item_fornecedor',
                companyId: params.companyId,
                filters: {},
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true,
              });

              const itensJaCotados = (cotacaoItensResult.data || []).filter((item: any) => {
                return cotacaoFornecedoresIds.includes(item.cotacao_fornecedor_id) &&
                       params.input.requisicao_item_ids!.includes(item.requisicao_item_id);
              });

              if (itensJaCotados.length > 0) {
                // Encontrar quais itens específicos já foram cotados
                const itensCotadosIds = [...new Set(itensJaCotados.map((item: any) => item.requisicao_item_id))];
                const numeroCotacao = cotacoesAtivas[0].numero_cotacao || cotacoesAtivas[0].id.substring(0, 8);
                
                throw new Error(
                  `Os seguintes itens já possuem cotação em andamento (${numeroCotacao}): ` +
                  `${itensCotadosIds.slice(0, 3).map((id: string) => id.substring(0, 8)).join(', ')}` +
                  `${itensCotadosIds.length > 3 ? ` e mais ${itensCotadosIds.length - 3}` : ''}. ` +
                  `Por favor, verifique as "Cotações Realizadas" antes de criar uma nova cotação.`
                );
              }
            }
          }
        }
      } else {
        // ✅ OPÇÃO 3: Modo normal - permitir múltiplas cotações para a mesma requisição
        // A validação agora é feita apenas para verificar se TODOS os itens já foram cotados
        // Se houver itens não cotados, permitir criar nova cotação
        const cotacoesExistentes = await EntityService.list({
          schema: 'compras',
          table: 'cotacao_ciclos',
          companyId: params.companyId,
          filters: {
            requisicao_id: params.input.requisicao_id,
          },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });

        if (cotacoesExistentes.data && cotacoesExistentes.data.length > 0) {
          // Verificar se há cotação ativa (rascunho, em aprovação ou aberta)
          const cotacoesAtivas = cotacoesExistentes.data.filter((c: any) => {
            const state = c.workflow_state || c.status;
            return state === 'rascunho' || state === 'em_aprovacao' || state === 'aberta' || state === 'em_cotacao';
          });

          // ✅ OPÇÃO 3: Verificar se TODOS os itens da requisição já foram cotados
          if (cotacoesAtivas.length > 0) {
            // Buscar todos os itens da requisição
            const itensRequisicao = await EntityService.list({
              schema: 'compras',
              table: 'requisicao_itens',
              companyId: params.companyId,
              filters: {
                requisicao_id: params.input.requisicao_id,
              },
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true,
            });

            // Buscar itens já cotados em cotações ativas
            const cotacoesAtivasIds = cotacoesAtivas.map((c: any) => c.id);
            const cotacaoFornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'cotacao_fornecedores',
              companyId: params.companyId,
              filters: {},
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true,
            });

            const cotacaoFornecedoresIds = (cotacaoFornecedoresResult.data || [])
              .filter((cf: any) => cotacoesAtivasIds.includes(cf.cotacao_id))
              .map((cf: any) => cf.id);

            if (cotacaoFornecedoresIds.length > 0) {
              const cotacaoItensResult = await EntityService.list({
                schema: 'compras',
                table: 'cotacao_item_fornecedor',
                companyId: params.companyId,
                filters: {},
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true,
              });

              const itensCotadosIds = new Set(
                (cotacaoItensResult.data || [])
                  .filter((item: any) => cotacaoFornecedoresIds.includes(item.cotacao_fornecedor_id))
                  .map((item: any) => item.requisicao_item_id)
              );

              // Verificar se todos os itens foram cotados
              const todosItensCotados = (itensRequisicao.data || []).every((item: any) => 
                itensCotadosIds.has(item.id) || item.status === 'cotado'
              );

              if (todosItensCotados) {
                const numeroCotacao = cotacoesAtivas[0].numero_cotacao || cotacoesAtivas[0].id.substring(0, 8);
                throw new Error(
                  `Todos os itens desta requisição já possuem cotação em andamento (${numeroCotacao}). ` +
                  `Por favor, verifique as "Cotações Realizadas" antes de criar uma nova cotação.`
                );
              }
              // Se nem todos os itens foram cotados, permitir criar nova cotação
            }
          }
        }
      }
    } catch (error: any) {
      // Se já é nosso erro customizado, relançar
      if (error.message?.includes('já possui cotação') || error.message?.includes('Já existe uma cotação')) {
        throw error;
      }
      // Se for outro erro, logar mas continuar (pode ser problema de conexão)
      console.warn('Erro ao verificar cotações existentes, continuando:', error);
    }

    // Validar e formatar dados antes de criar
    // Converter string vazia para null para campos opcionais
    const prazoResposta = params.input.prazo_resposta && params.input.prazo_resposta.trim() !== ''
      ? (typeof params.input.prazo_resposta === 'string' 
          ? params.input.prazo_resposta.trim() 
          : new Date(params.input.prazo_resposta).toISOString().split('T')[0])
      : null;
    
    const observacoes = params.input.observacoes && params.input.observacoes.trim() !== ''
      ? params.input.observacoes.trim()
      : null;

    // Tentar criar ciclo de cotação com retry em caso de duplicação
    let ciclo;
    let tentativas = 0;
    const maxTentativas = 3;
    
    while (tentativas < maxTentativas) {
      try {
        // Usar função específica para gerar número de cotação
        // Isso garante que o número seja único e sequencial baseado em cotacao_ciclos
        const numeroData = await callSchemaFunction<{ result: string }>('compras', 'gerar_numero_cotacao', {
          p_company_id: params.companyId,
        });

        const numero_cotacao =
          (typeof numeroData === 'string' ? numeroData : numeroData?.result) ||
          `COT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        ciclo = await EntityService.create({
          schema: 'compras',
          table: 'cotacao_ciclos',
          companyId: params.companyId,
          data: {
            requisicao_id: params.input.requisicao_id,
            numero_cotacao,
            prazo_resposta: prazoResposta,
            observacoes: observacoes,
            // Criar com status 'aberta' inicialmente. A mudança para 'em_aprovacao'
            // deve ser feita via workflow quando o comprador finalizar e enviar.
            status: 'aberta',
            workflow_state: 'aberta',
          },
        });
        
        // Se chegou aqui, a criação foi bem-sucedida
        break;
      } catch (error: any) {
        tentativas++;
        
        // Verificar se é erro de constraint única (cotação ativa já existe)
        const isConstraintError = 
          error?.message?.includes('duplicate key') ||
          error?.message?.includes('unique constraint') ||
          error?.message?.includes('idx_cotacao_ciclos_requisicao_ativa') ||
          error?.code === '23505' ||
          error?.code === 'P0001';
        
        // ✅ OPÇÃO 3: Sempre criar novo ciclo quando itens específicos são fornecidos
        // A constraint única foi removida, então não precisamos mais tratar esse erro
        // Se for outro erro de duplicação (ex: numero_cotacao), tentar novamente
        if (isConstraintError && !error?.message?.includes('idx_cotacao_ciclos_requisicao_ativa')) {
          // Se for outro erro de duplicação e ainda temos tentativas, tentar novamente
          if (tentativas < maxTentativas) {
            // Aguardar um pouco antes de tentar novamente (evitar race condition)
            await new Promise(resolve => setTimeout(resolve, 100 * tentativas));
            continue;
          }
        }
        
        // Se não for erro de duplicação ou esgotamos as tentativas, lançar o erro
        throw error;
      }
    }
    
    if (!ciclo) {
      throw new Error('Não foi possível criar o ciclo de cotação após múltiplas tentativas');
    }

    // Buscar fornecedores existentes do ciclo (se estiver usando ciclo existente)
    const fornecedoresExistentesResult = await EntityService.list({
      schema: 'compras',
      table: 'cotacao_fornecedores',
      companyId: params.companyId,
      filters: {
        cotacao_id: (ciclo as any)?.id,
      },
      page: 1,
      pageSize: 1000,
      skipCompanyFilter: true,
    });

    const fornecedoresExistentes = (fornecedoresExistentesResult.data || []) as any[];
    const fornecedoresExistentesIds = new Set(fornecedoresExistentes.map((f: any) => f.fornecedor_id));

    // Criar apenas fornecedores que ainda não existem
    const fornecedoresParaCriar = params.input.fornecedores.filter(
      (f) => !fornecedoresExistentesIds.has(f.fornecedor_id)
    );

    const fornecedoresNovos = await Promise.all(
      fornecedoresParaCriar.map((fornecedor) => {
        const dadosFornecedor = {
          cotacao_id: (ciclo as any)?.id,
          fornecedor_id: fornecedor.fornecedor_id,
          prazo_entrega: fornecedor.prazo_entrega || 0,
          condicoes_comerciais: fornecedor.condicoes_comerciais || '',
          // ✅ IMPORTANTE: Salvar valor_frete, valor_imposto, desconto_percentual e desconto_valor para que sejam preservados no fluxo
          valor_frete: fornecedor.valor_frete != null ? Number(fornecedor.valor_frete) : 0,
          valor_imposto: fornecedor.valor_imposto != null ? Number(fornecedor.valor_imposto) : 0,
          desconto_percentual: fornecedor.desconto_percentual != null ? Number(fornecedor.desconto_percentual) : 0,
          desconto_valor: fornecedor.desconto_valor != null ? Number(fornecedor.desconto_valor) : 0,
          // ✅ NOVOS CAMPOS: Condições de pagamento
          forma_pagamento: fornecedor.forma_pagamento || null,
          is_parcelada: fornecedor.is_parcelada || false,
          numero_parcelas: fornecedor.is_parcelada ? (fornecedor.numero_parcelas || 1) : 1,
          intervalo_parcelas: fornecedor.is_parcelada ? (fornecedor.intervalo_parcelas || '30') : '30',
        };
        
        console.log(`[purchaseService.startQuoteCycle] Criando fornecedor ${fornecedor.fornecedor_id} com dados:`, {
          fornecedor_recebido: {
            valor_frete: fornecedor.valor_frete,
            valor_imposto: fornecedor.valor_imposto,
            desconto_percentual: fornecedor.desconto_percentual,
            desconto_valor: fornecedor.desconto_valor
          },
          dados_para_criar: dadosFornecedor
        });
        
        return EntityService.create({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: params.companyId,
          data: dadosFornecedor,
        });
      }),
    );

    // ✅ CORREÇÃO: Atualizar fornecedores existentes com os novos valores de frete/desconto
    // Isso garante que quando uma cotação é editada, os valores sejam atualizados corretamente
    const fornecedoresParaAtualizar = params.input.fornecedores.filter(
      (f) => fornecedoresExistentesIds.has(f.fornecedor_id)
    );

    const fornecedoresAtualizados = await Promise.allSettled(
      fornecedoresParaAtualizar.map(async (fornecedor) => {
        const fornecedorExistente = fornecedoresExistentes.find(
          (fe: any) => fe.fornecedor_id === fornecedor.fornecedor_id
        );
        
        if (!fornecedorExistente) {
          console.warn(`[purchaseService.startQuoteCycle] Fornecedor ${fornecedor.fornecedor_id} não encontrado para atualização`);
          return null;
        }

        const dadosAtualizacao = {
          prazo_entrega: fornecedor.prazo_entrega != null ? Number(fornecedor.prazo_entrega) : fornecedorExistente.prazo_entrega || 0,
          condicoes_comerciais: fornecedor.condicoes_comerciais || fornecedorExistente.condicoes_comerciais || '',
          // ✅ IMPORTANTE: Atualizar valor_frete, valor_imposto, desconto_percentual e desconto_valor
          // Usar os valores do fornecedor recebido, não os valores existentes
          valor_frete: fornecedor.valor_frete != null ? Number(fornecedor.valor_frete) : (fornecedorExistente.valor_frete || 0),
          valor_imposto: fornecedor.valor_imposto != null ? Number(fornecedor.valor_imposto) : (fornecedorExistente.valor_imposto || 0),
          desconto_percentual: fornecedor.desconto_percentual != null ? Number(fornecedor.desconto_percentual) : (fornecedorExistente.desconto_percentual || 0),
          desconto_valor: fornecedor.desconto_valor != null ? Number(fornecedor.desconto_valor) : (fornecedorExistente.desconto_valor || 0),
          // ✅ NOVOS CAMPOS: Condições de pagamento
          forma_pagamento: fornecedor.forma_pagamento !== undefined ? fornecedor.forma_pagamento : (fornecedorExistente.forma_pagamento || null),
          is_parcelada: fornecedor.is_parcelada !== undefined ? fornecedor.is_parcelada : (fornecedorExistente.is_parcelada || false),
          numero_parcelas: fornecedor.is_parcelada !== undefined 
            ? (fornecedor.is_parcelada ? (fornecedor.numero_parcelas || 1) : 1)
            : (fornecedorExistente.numero_parcelas || 1),
          intervalo_parcelas: fornecedor.is_parcelada !== undefined
            ? (fornecedor.is_parcelada ? (fornecedor.intervalo_parcelas || '30') : '30')
            : (fornecedorExistente.intervalo_parcelas || '30'),
        };

        console.log(`[purchaseService.startQuoteCycle] Atualizando fornecedor existente ${fornecedorExistente.id} (${fornecedor.fornecedor_id}) com dados:`, {
          fornecedor_recebido: {
            valor_frete: fornecedor.valor_frete,
            valor_imposto: fornecedor.valor_imposto,
            desconto_percentual: fornecedor.desconto_percentual,
            desconto_valor: fornecedor.desconto_valor
          },
          fornecedor_existente: {
            valor_frete: fornecedorExistente.valor_frete,
            valor_imposto: fornecedorExistente.valor_imposto,
            desconto_percentual: fornecedorExistente.desconto_percentual,
            desconto_valor: fornecedorExistente.desconto_valor
          },
          dados_atualizacao: dadosAtualizacao
        });

        await EntityService.update({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: params.companyId,
          id: fornecedorExistente.id,
          data: dadosAtualizacao,
        });

        return { ...fornecedorExistente, ...dadosAtualizacao };
      }),
    );

    // Filtrar apenas os updates bem-sucedidos
    const fornecedoresAtualizadosSucesso = fornecedoresAtualizados
      .filter((result) => result.status === 'fulfilled' && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    // Log de erros se houver
    fornecedoresAtualizados.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[purchaseService.startQuoteCycle] Erro ao atualizar fornecedor ${fornecedoresParaAtualizar[index]?.fornecedor_id}:`, result.reason);
      }
    });

    // Combinar fornecedores existentes atualizados com os novos criados
    // Substituir os fornecedores existentes pelos atualizados
    const fornecedoresExistentesAtualizados = fornecedoresExistentes.map((fe: any) => {
      const atualizado = fornecedoresAtualizadosSucesso.find((fa: any) => fa.id === fe.id);
      return atualizado || fe;
    });

    const fornecedoresCriados = [
      ...fornecedoresExistentesAtualizados,
      ...fornecedoresNovos,
    ];

    // Buscar o estado atual da requisição para fazer a transição correta
    const requisicao = await EntityService.getById({
      schema: 'compras',
      table: 'requisicoes_compra',
      companyId: params.companyId,
      id: params.input.requisicao_id,
    });

    const currentState = (requisicao as any)?.workflow_state as RequisitionWorkflowState;
    
    // Se já está em 'em_cotacao', não precisa atualizar
    if (currentState !== 'em_cotacao') {
      // Determinar o estado de origem baseado no estado atual
      let fromState: RequisitionWorkflowState;
      
      if (currentState === 'aprovada') {
        fromState = 'aprovada';
      } else if (currentState === 'encaminhada') {
        fromState = 'encaminhada';
      } else {
        // Se o estado não é nem 'aprovada' nem 'encaminhada', 
        // atualizar diretamente sem usar a função de transição
        fromState = currentState;
      }

      try {
        // Tentar fazer a transição usando a função de transição
        await purchaseService.transitionRequisition({
          companyId: params.companyId,
          requisicaoId: params.input.requisicao_id,
          from: fromState,
          to: 'em_cotacao',
          actorId: params.userId,
          payload: { cotacao_ciclo_id: (ciclo as any)?.id },
        });
      } catch (error: any) {
        // Se a transição falhar (por exemplo, transição não permitida),
        // atualizar diretamente o workflow_state
        if (error?.message?.includes('Transição inválida')) {
          await EntityService.update({
            schema: 'compras',
            table: 'requisicoes_compra',
            companyId: params.companyId,
            id: params.input.requisicao_id,
            data: {
              workflow_state: 'em_cotacao',
            },
          });

          // Registrar no log de workflow
          await EntityService.create({
            schema: 'compras',
            table: 'workflow_logs',
            companyId: params.companyId,
            data: {
              entity_type: 'requisicao_compra',
              entity_id: params.input.requisicao_id,
              from_state: currentState,
              to_state: 'em_cotacao',
              actor_id: params.userId,
              payload: { cotacao_ciclo_id: (ciclo as any)?.id },
            },
          });
        } else {
          // Se for outro tipo de erro, relançar
          throw error;
        }
      }
    }

    return {
      ciclo,
      fornecedores: fornecedoresCriados,
    };
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


