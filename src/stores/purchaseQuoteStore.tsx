// =====================================================
// STORE CENTRALIZADO - COTAÇÃO DE COMPRA
// =====================================================
// Arquitetura Decision-Centered UI
// Item + Fornecedor = Contexto da mesma decisão
// Arquivo: purchaseQuoteStore.tsx (não .ts)

import React from 'react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS
// =====================================================

export type QuoteType = 'NORMAL' | 'EMERGENCY';

export type SupplierStatus = 'ACTIVE' | 'BLOCKED' | 'UNDER_REVIEW';
export type SupplierType = 'LOCAL' | 'NACIONAL' | 'INTERNACIONAL';

export type QuoteValueField = 'price' | 'discount' | 'leadTime' | 'commercialTerms';

export interface QuoteContextState {
  id: string;
  numero_cotacao: string;
  type: QuoteType;
  requests: { id: string; numero_requisicao: string }[];
  costCenter: { id: string; codigo: string; nome: string } | null;
  project: { id: string; codigo: string; nome: string } | null;
  buyer: { id: string; nome: string; email: string };
  generalNotes: string;
  prazo_resposta?: string;
  status: string;
  workflow_state?: string;
}

export interface PurchaseItemState {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  originLabel: string;
  material_id?: string;
  material_nome?: string;
  material_imagem_url?: string;
}

export interface SupplierState {
  id: string;
  name: string;
  cnpj: string;
  type: SupplierType;
  status: SupplierStatus;
  selected: boolean;
  partner_id?: string;
  valor_frete?: number;
  valor_imposto?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
}

export interface QuoteValueState {
  price: number | null;
  discount: number | null; // 0-100 (%)
  leadTime: number | null; // dias
  commercialTerms: string | null;
  finalValue: number | null; // calculado
}

export interface QuoteMatrixState {
  // itemId -> supplierId -> valores
  [itemId: string]: {
    [supplierId: string]: QuoteValueState;
  } & {
    winnerSupplierId?: string | null; // vencedor por item
    justificationIfNotLowest?: string | null;
  };
}

export interface PurchaseQuoteState {
  context: QuoteContextState | null;
  items: PurchaseItemState[];
  suppliers: SupplierState[];
  quoteMatrix: QuoteMatrixState;
  globalWinnerSupplierId: string | null;
  validationErrors: string[];
  loading: boolean;
  saving: boolean;
}

// =====================================================
// CONTEXT
// =====================================================

interface PurchaseQuoteContextType extends PurchaseQuoteState {
  loadQuoteData: (quoteId: string, companyId: string) => Promise<void>;
  updateGeneralNotes: (notes: string) => void;
  toggleSupplierSelection: (supplierId: string, nextSelected: boolean) => void;
  setQuoteValue: (
    itemId: string,
    supplierId: string,
    field: QuoteValueField,
    value: any
  ) => void;
  setItemWinner: (itemId: string, supplierId: string | null, justification?: string) => void;
  setGlobalWinner: (supplierId: string | null, justification?: string) => void;
  validateBeforeSubmit: () => string[];
  submitQuote: (companyId: string) => Promise<void>;
  reset: () => void;
}

const PurchaseQuoteContext = createContext<PurchaseQuoteContextType | undefined>(undefined);

const initialState: PurchaseQuoteState = {
  context: null,
  items: [],
  suppliers: [],
  quoteMatrix: {},
  globalWinnerSupplierId: null,
  validationErrors: [],
  loading: false,
  saving: false,
};

export function PurchaseQuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PurchaseQuoteState>(initialState);

  const loadQuoteData = useCallback(async (quoteId: string, companyId: string) => {
    setState((prev) => ({ ...prev, loading: true, validationErrors: [] }));
    try {
      // Carregar cotação - usar cotacao_ciclos que é a tabela principal
      let quote = null;
      try {
        quote = await EntityService.getById({
          schema: 'compras',
          table: 'cotacao_ciclos',
          id: quoteId,
          companyId,
        });
      } catch (error) {
        // Se não encontrar em cotacao_ciclos, tentar em cotacoes (legado)
        console.warn('Cotação não encontrada em cotacao_ciclos, tentando cotacoes:', error);
        try {
          quote = await EntityService.getById({
            schema: 'compras',
            table: 'cotacoes',
            id: quoteId,
            companyId,
          });
        } catch (e) {
          console.error('Cotação não encontrada em nenhuma tabela:', e);
          throw new Error('Cotação não encontrada');
        }
      }

      if (!quote) {
        throw new Error('Cotação não encontrada');
      }

      // Carregar requisição vinculada (principal)
      let requisicaoData = null;
      let requisicaoItens: any[] = [];
      let materiaisMap = new Map<string, { nome: string; imagem_url: string | null }>();

      if (quote.requisicao_id) {
        requisicaoData = await EntityService.getById({
          schema: 'compras',
          table: 'requisicoes_compra',
          id: quote.requisicao_id,
          companyId,
        });

        const itensResult = await EntityService.list({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId,
          filters: { requisicao_id: quote.requisicao_id },
          page: 1,
          pageSize: 1000,
          skipCompanyFilter: true,
        });
        requisicaoItens = itensResult.data || [];
      }

      // Carregar materiais iniciais
      const materialIds = [...new Set(requisicaoItens.map((item: any) => item.material_id).filter(Boolean))];
      if (materialIds.length > 0) {
        const materiaisResult = await EntityService.list({
          schema: 'almoxarifado',
          table: 'materiais_equipamentos',
          companyId,
          filters: {},
          page: 1,
          pageSize: 1000,
        });

        if (materiaisResult.data) {
          materiaisResult.data.forEach((material: any) => {
            materiaisMap.set(String(material.id), {
              nome: material.nome || material.descricao || 'Material sem nome',
              imagem_url: material.imagem_url || null,
            });
          });
        }
      }

      // Carregar fornecedores da cotação
      // cotacao_fornecedores.cotacao_id referencia cotacao_ciclos.id
      const fornecedoresCotacaoResult = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId,
        filters: { cotacao_id: quote.id },
        page: 1,
        pageSize: 100,
        skipCompanyFilter: true,
      });
      const fornecedoresCotacao = fornecedoresCotacaoResult.data || [];

      // Carregar todos os partners ativos do tipo 'fornecedor'
      const partnersResult = await EntityService.list({
        schema: 'public',
        table: 'partners',
        companyId,
        filters: { ativo: true },
        page: 1,
        pageSize: 1000,
      });
      const allPartners = partnersResult.data || [];
      
      // Filtrar apenas partners do tipo 'fornecedor'
      const fornecedorPartners = allPartners.filter((p: any) => 
        Array.isArray(p.tipo) && p.tipo.includes('fornecedor')
      );
      
      const partnersMap = new Map(fornecedorPartners.map((p: any) => [p.id, p]));

      // Carregar fornecedores_dados para obter dados adicionais (se existirem)
      const fornecedoresResult = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId,
        filters: {},
        page: 1,
        pageSize: 1000,
      });
      const fornecedoresDados = fornecedoresResult.data || [];
      
      // Criar mapa: partner_id -> fornecedores_dados
      const fornecedoresDadosMap = new Map(
        fornecedoresDados.map((fd: any) => [fd.partner_id, fd])
      );

      // Criar mapa de fornecedores da cotação para buscar frete/imposto
      const fornecedoresCotacaoMap = new Map<string, any>();
      fornecedoresCotacao.forEach((fc: any) => {
        fornecedoresCotacaoMap.set(fc.fornecedor_id, fc);
        console.log('📦 [loadQuoteData] Fornecedor cotação carregado:', {
          fornecedor_id: fc.fornecedor_id,
          valor_frete: fc.valor_frete,
          valor_imposto: fc.valor_imposto,
          desconto_percentual: fc.desconto_percentual,
          desconto_valor: fc.desconto_valor,
        });
      });

      // Mapear fornecedores a partir dos partners
      // Usar fornecedores_dados.id se existir, senão usar partner.id como fallback
      const suppliers: SupplierState[] = fornecedorPartners.map((partner: any) => {
        const fornecedorDados = fornecedoresDadosMap.get(partner.id);
        
        // Se existe fornecedores_dados, usar o id dele, senão usar partner.id
        const supplierId = fornecedorDados?.id || partner.id;
        
        // Verificar se está selecionado na cotação
        // cotacao_fornecedores referencia fornecedores_dados.id, então precisamos verificar ambos
        const isSelected = fornecedoresCotacao.some((fc: any) => {
          // Se temos fornecedores_dados, verificar pelo id dele
          if (fornecedorDados) {
            return fc.fornecedor_id === fornecedorDados.id;
          }
          // Se não temos fornecedores_dados, não pode estar selecionado (pois cotacao_fornecedores requer fornecedores_dados.id)
          return false;
        });
        
        const cotacaoFornecedor = fornecedoresCotacaoMap.get(supplierId);
        
        // Determinar status: se tem fornecedores_dados, usar status dele, senão considerar ativo
        let status: SupplierStatus = 'ACTIVE';
        if (fornecedorDados) {
          status = (fornecedorDados.status === 'bloqueado' ? 'BLOCKED' : 
                   fornecedorDados.status === 'inativo' ? 'BLOCKED' : 'ACTIVE') as SupplierStatus;
        }
        
        // Log para debug
        if (isSelected && cotacaoFornecedor) {
          console.log('📦 [loadQuoteData] Fornecedor cotação:', {
            supplier_id: supplierId,
            partner_id: partner.id,
            cotacao_fornecedor: cotacaoFornecedor,
            valor_frete: cotacaoFornecedor.valor_frete,
            valor_imposto: cotacaoFornecedor.valor_imposto,
          });
        }
        
        return {
          id: supplierId,
          name: partner.nome_fantasia || partner.razao_social || 'Fornecedor',
          cnpj: partner.cnpj || '',
          type: 'NACIONAL' as SupplierType, // Default, pode ser melhorado com dados de endereço
          status,
          selected: isSelected,
          partner_id: partner.id,
          valor_frete: cotacaoFornecedor?.valor_frete ? Number(cotacaoFornecedor.valor_frete) : 0,
          valor_imposto: cotacaoFornecedor?.valor_imposto ? Number(cotacaoFornecedor.valor_imposto) : 0,
          desconto_percentual: cotacaoFornecedor?.desconto_percentual ? Number(cotacaoFornecedor.desconto_percentual) : 0,
          desconto_valor: cotacaoFornecedor?.desconto_valor ? Number(cotacaoFornecedor.desconto_valor) : 0,
        };
      });
      
      console.log('📦 [loadQuoteData] Suppliers mapeados:', suppliers.map(s => ({
        id: s.id,
        name: s.name,
        selected: s.selected,
        valor_frete: s.valor_frete,
        valor_imposto: s.valor_imposto,
      })));

      // Carregar itens cotados (cotacao_item_fornecedor)
      const quoteMatrix: QuoteMatrixState = {};
      const cotacaoFornecedoresIds = fornecedoresCotacao.map((fc: any) => fc.id);
      
      if (cotacaoFornecedoresIds.length > 0) {
        try {
          // Buscar todos os itens cotados para os fornecedores desta cotação
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

          console.log('📦 [loadQuoteData] Itens cotados encontrados:', cotacaoItens.length);
          console.log('📦 [loadQuoteData] IDs de requisicao_item_id únicos:', [...new Set(cotacaoItens.map((item: any) => item.requisicao_item_id))]);

          // Criar mapa: cotacao_fornecedor_id -> fornecedor_id
          const cotacaoFornecedorToFornecedorMap = new Map<string, string>();
          fornecedoresCotacao.forEach((fc: any) => {
            cotacaoFornecedorToFornecedorMap.set(fc.id, fc.fornecedor_id);
          });

          // Popular quoteMatrix com os valores cotados
          cotacaoItens.forEach((cotacaoItem: any) => {
            const fornecedorId = cotacaoFornecedorToFornecedorMap.get(cotacaoItem.cotacao_fornecedor_id);
            if (!fornecedorId || !cotacaoItem.requisicao_item_id) return;

            const requisicaoItemId = cotacaoItem.requisicao_item_id;
            
            // Inicializar matriz se necessário
            if (!quoteMatrix[requisicaoItemId]) {
              quoteMatrix[requisicaoItemId] = {};
            }

            // Popular valores do item cotado
            quoteMatrix[requisicaoItemId][fornecedorId] = {
              price: cotacaoItem.valor_unitario || null,
              discount: cotacaoItem.desconto_percentual || null,
              leadTime: cotacaoItem.prazo_entrega_dias || null,
              commercialTerms: cotacaoItem.condicao_pagamento || null,
              finalValue: cotacaoItem.valor_total_calculado || null,
              quantity: cotacaoItem.quantidade_ofertada || null,
            };
          });

          // Garantir que todos os itens cotados estejam na lista de itens
          // Se um item foi cotado mas não está em requisicaoItens, adicionar
          const requisicaoItemIds = new Set(requisicaoItens.map((item: any) => item.id));
          const itensCotadosIds = new Set(cotacaoItens.map((item: any) => item.requisicao_item_id).filter(Boolean));
          
          console.log('📦 [loadQuoteData] Itens da requisição principal:', requisicaoItens.length);
          console.log('📦 [loadQuoteData] IDs de itens cotados:', Array.from(itensCotadosIds));
          console.log('📦 [loadQuoteData] IDs de itens da requisição:', Array.from(requisicaoItemIds));
          
          // Buscar itens que foram cotados mas não estão na lista de requisicaoItens
          const itensFaltantes = Array.from(itensCotadosIds).filter(id => !requisicaoItemIds.has(id));
          
          console.log('📦 [loadQuoteData] Itens faltantes a buscar:', itensFaltantes.length, itensFaltantes);
          
          if (itensFaltantes.length > 0) {
            // Buscar itens faltantes individualmente ou em lote
            const itensFaltantesData: any[] = [];
            for (const itemId of itensFaltantes) {
              try {
                const item = await EntityService.getById({
                  schema: 'compras',
                  table: 'requisicao_itens',
                  id: itemId,
                  companyId,
                });
                if (item) {
                  itensFaltantesData.push(item);
                }
              } catch (e) {
                console.warn(`Erro ao buscar item ${itemId}:`, e);
              }
            }
            
            requisicaoItens = [...requisicaoItens, ...itensFaltantesData];
            
            console.log('📦 [loadQuoteData] Itens após adicionar faltantes:', requisicaoItens.length);
            
            // Carregar materiais dos itens faltantes
            const materialIdsFaltantes = [...new Set(itensFaltantesData.map((item: any) => item.material_id).filter(Boolean))];
            if (materialIdsFaltantes.length > 0) {
              const materiaisFaltantesResult = await EntityService.list({
                schema: 'almoxarifado',
                table: 'materiais_equipamentos',
                companyId,
                filters: {},
                page: 1,
                pageSize: 1000,
              });

              if (materiaisFaltantesResult.data) {
                materiaisFaltantesResult.data.forEach((material: any) => {
                  const materialIdStr = String(material.id);
                  if (materialIdsFaltantes.includes(material.id) || materialIdsFaltantes.some(id => String(id) === materialIdStr)) {
                    materiaisMap.set(materialIdStr, {
                      nome: material.nome || material.descricao || 'Material sem nome',
                      imagem_url: material.imagem_url || null,
                    });
                  }
                });
              }
            }
          }
        } catch (error) {
          console.warn('Erro ao carregar itens cotados:', error);
        }
      }

      // Carregar centro de custo e projeto
      let costCenter = null;
      let project = null;
      if (requisicaoData?.centro_custo_id) {
        try {
          costCenter = await EntityService.getById({
            schema: 'public',
            table: 'cost_centers',
            id: requisicaoData.centro_custo_id,
            companyId,
          });
        } catch (e) {
          console.warn('Erro ao carregar centro de custo:', e);
        }
      }
      if (requisicaoData?.projeto_id) {
        try {
          project = await EntityService.getById({
            schema: 'public',
            table: 'projects',
            id: requisicaoData.projeto_id,
            companyId,
          });
        } catch (e) {
          console.warn('Erro ao carregar projeto:', e);
        }
      }

      // Carregar comprador (criador da cotação)
      // cotacao_ciclos não tem created_by, então usar valor padrão
      // Se necessário, pode buscar o criador através da requisição ou de outra forma
      let buyer = { id: '', nome: 'Usuário', email: '' };
      // Tentar buscar o criador através da requisição se disponível
      if (requisicaoData?.created_by) {
        try {
          const user = await EntityService.getById({
            schema: 'public',
            table: 'users',
            id: requisicaoData.created_by,
            companyId,
          });
          buyer = {
            id: user.id,
            nome: user.nome || user.name || 'Usuário',
            email: user.email || '',
          };
        } catch (e) {
          console.warn('Erro ao carregar comprador:', e);
        }
      }

      // Buscar números de requisição para todos os itens (caso alguns venham de requisições diferentes)
      const requisicaoIds = [...new Set(requisicaoItens.map((item: any) => item.requisicao_id).filter(Boolean))];
      const requisicoesMap = new Map<string, string>(); // requisicao_id -> numero_requisicao
      
      if (requisicaoData) {
        requisicoesMap.set(requisicaoData.id, requisicaoData.numero_requisicao || 'Requisição');
      }
      
      // Buscar outras requisições se houver
      for (const reqId of requisicaoIds) {
        if (!requisicoesMap.has(reqId)) {
          try {
            const reqItem = await EntityService.getById({
              schema: 'compras',
              table: 'requisicoes_compra',
              id: reqId,
              companyId,
            });
            if (reqItem) {
              requisicoesMap.set(reqId, reqItem.numero_requisicao || 'Requisição');
            }
          } catch (e) {
            console.warn(`Erro ao buscar requisição ${reqId}:`, e);
            requisicoesMap.set(reqId, 'Requisição');
          }
        }
      }

      // Mapear itens - DEPOIS de adicionar os itens faltantes
      const items: PurchaseItemState[] = requisicaoItens.map((item: any) => {
        const materialIdStr = item.material_id ? String(item.material_id) : null;
        const material = materialIdStr ? materiaisMap.get(materialIdStr) : null;
        const numeroRequisicao = item.requisicao_id ? requisicoesMap.get(item.requisicao_id) || 'Requisição' : (requisicaoData?.numero_requisicao || 'Requisição');
        
        return {
          id: item.id,
          code: item.material_id ? String(item.material_id) : `ITEM-${item.id.slice(0, 8)}`,
          description: material?.nome || item.material_nome || 'Material não identificado',
          unit: item.unidade_medida || 'UN',
          quantity: Number(item.quantidade) || 0,
          originLabel: numeroRequisicao,
          material_id: item.material_id,
          material_nome: material?.nome || item.material_nome,
          material_imagem_url: material?.imagem_url || null,
        };
      });

      console.log('📦 [loadQuoteData] Total de itens mapeados:', items.length);
      console.log('📦 [loadQuoteData] Itens:', items.map(i => ({ id: i.id, desc: i.description })));

      const context: QuoteContextState = {
        id: quote.id,
        numero_cotacao: quote.numero_cotacao || '',
        // cotacao_ciclos não tem campo 'tipo' ou 'is_emergencial', usar status para determinar
        type: (quote.status === 'emergencial' ? 'EMERGENCY' : 'NORMAL') as QuoteType,
        requests: requisicaoData ? [{ id: requisicaoData.id, numero_requisicao: requisicaoData.numero_requisicao || '' }] : [],
        costCenter: costCenter ? { id: costCenter.id, codigo: costCenter.codigo, nome: costCenter.nome } : null,
        project: project ? { id: project.id, codigo: project.codigo, nome: project.nome } : null,
        buyer,
        generalNotes: quote.observacoes || '',
        prazo_resposta: quote.prazo_resposta,
        status: quote.status || '',
        workflow_state: quote.workflow_state || quote.status,
      };

      setState({
        context,
        items,
        suppliers,
        quoteMatrix,
        loading: false,
        validationErrors: [],
      });
    } catch (error) {
      console.error('Erro ao carregar dados da cotação:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        validationErrors: ['Erro ao carregar dados da cotação'],
      }));
      throw error;
    }
  }, []);

  const updateGeneralNotes = useCallback((generalNotes: string) => {
    setState((prev) => ({
      ...prev,
      context: prev.context ? { ...prev.context, generalNotes } : null,
    }));
  }, []);

  const toggleSupplierSelection = useCallback((supplierId: string, nextSelected: boolean) => {
    setState((prev) => {
      const suppliers = prev.suppliers.map((s) =>
        s.id === supplierId ? { ...s, selected: nextSelected } : s
      );

      const quoteMatrix = { ...prev.quoteMatrix };
      if (!nextSelected) {
        // Limpa valores para este fornecedor em todos os itens
        for (const itemId of Object.keys(quoteMatrix)) {
          if (quoteMatrix[itemId][supplierId]) {
            delete quoteMatrix[itemId][supplierId];
          }
        }
      } else {
        // Garante estrutura para itens existentes
        prev.items.forEach((item) => {
          quoteMatrix[item.id] = quoteMatrix[item.id] || {};
          quoteMatrix[item.id][supplierId] =
            quoteMatrix[item.id][supplierId] || {
              price: null,
              discount: null,
              leadTime: null,
              commercialTerms: null,
              finalValue: null,
            };
        });
      }

      // Validações emergenciais
      const selectedCount = suppliers.filter((s) => s.selected).length;
      const errors: string[] = [];
      if (prev.context?.type === 'EMERGENCY') {
        if (selectedCount < 1) {
          errors.push('Cotação emergencial requer pelo menos 1 fornecedor');
        }
        if (selectedCount > 6) {
          errors.push('Cotação emergencial permite no máximo 6 fornecedores');
        }
      } else {
        if (selectedCount < 2) {
          errors.push('Cotação normal requer pelo menos 2 fornecedores');
        }
        if (selectedCount > 6) {
          errors.push('Cotação normal permite no máximo 6 fornecedores');
        }
      }

      return { ...prev, suppliers, quoteMatrix, validationErrors: errors };
    });
  }, []);

  const setQuoteValue = useCallback(
    (itemId: string, supplierId: string, field: QuoteValueField, value: any) => {
      setState((prev) => {
        const quoteMatrix = { ...prev.quoteMatrix };
        const itemRow = (quoteMatrix[itemId] = quoteMatrix[itemId] || {});
        const cell = (itemRow[supplierId] =
          itemRow[supplierId] || {
            price: null,
            discount: null,
            leadTime: null,
            commercialTerms: null,
            finalValue: null,
          });

        (cell as any)[field] = value;

        // Recalcular valor final
        const item = prev.items.find((i) => i.id === itemId);
        const quantity = item?.quantity ?? 0;
        const price = cell.price ?? 0;
        const discount = (cell.discount ?? 0) / 100; // converter % para decimal
        const gross = quantity * price;
        const net = gross * (1 - discount);
        cell.finalValue = isNaN(net) ? null : net;

        return { ...prev, quoteMatrix };
      });
    },
    []
  );

  const setItemWinner = useCallback(
    (itemId: string, supplierId: string | null, justification?: string) => {
      setState((prev) => {
        const quoteMatrix = { ...prev.quoteMatrix };
        quoteMatrix[itemId] = {
          ...(quoteMatrix[itemId] || {}),
          winnerSupplierId: supplierId,
          justificationIfNotLowest: justification || null,
        };
        return { ...prev, quoteMatrix };
      });
    },
    []
  );

  const setGlobalWinner = useCallback((supplierId: string | null, justification?: string) => {
    setState((prev) => ({ ...prev, globalWinnerSupplierId: supplierId }));
  }, []);

  const validateBeforeSubmit = useCallback((): string[] => {
    let errors: string[] = [];
    
    setState((prev) => {
      errors = [];

      // Validar seleção de fornecedores
      const selectedSuppliers = prev.suppliers.filter((s) => s.selected);
      if (selectedSuppliers.length === 0) {
        errors.push('Selecione pelo menos um fornecedor');
      }

      // Validar valores preenchidos
      prev.items.forEach((item) => {
        const row = prev.quoteMatrix[item.id] || {};
        selectedSuppliers.forEach((sup) => {
          const cell = row[sup.id];
          if (!cell) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem valores preenchidos`);
            return;
          }
          if (cell.price == null || cell.price <= 0) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem preço válido`);
          }
          if (cell.leadTime == null || cell.leadTime <= 0) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem prazo informado`);
          }
        });
      });

      // Validar justificativas quando vencedor não é o menor preço
      prev.items.forEach((item) => {
        const row = prev.quoteMatrix[item.id] || {};
        const winnerId = row.winnerSupplierId;
        if (!winnerId) {
          errors.push(`Item ${item.code}: nenhum vencedor selecionado`);
          return;
        }

        // Calcular menor valor
        let lowestValue: number | null = null;
        let lowestSupplierId: string | null = null;
        selectedSuppliers.forEach((sup) => {
          const cell = row[sup.id];
          if (cell?.finalValue != null) {
            if (lowestValue === null || cell.finalValue < lowestValue) {
              lowestValue = cell.finalValue;
              lowestSupplierId = sup.id;
            }
          }
        });

        if (lowestSupplierId && winnerId !== lowestSupplierId && !row.justificationIfNotLowest) {
          errors.push(
            `Item ${item.code}: justificativa obrigatória quando vencedor não é o menor preço`
          );
        }
      });

      return { ...prev, validationErrors: errors };
    });

    return errors;
  }, []);

  const submitQuote = useCallback(async (companyId: string) => {
    // Validar antes de submeter
    let currentContext: QuoteContextState | null = null;
    let validationErrors: string[] = [];
    
    setState((prev) => {
      currentContext = prev.context;
      const errors: string[] = [];

      // Validar seleção de fornecedores
      const selectedSuppliers = prev.suppliers.filter((s) => s.selected);
      if (selectedSuppliers.length === 0) {
        errors.push('Selecione pelo menos um fornecedor');
      }

      // Validar valores preenchidos
      prev.items.forEach((item) => {
        const row = prev.quoteMatrix[item.id] || {};
        selectedSuppliers.forEach((sup) => {
          const cell = row[sup.id];
          if (!cell) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem valores preenchidos`);
            return;
          }
          if (cell.price == null || cell.price <= 0) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem preço válido`);
          }
          if (cell.leadTime == null || cell.leadTime <= 0) {
            errors.push(`Item ${item.code}: fornecedor ${sup.name} sem prazo informado`);
          }
        });
      });

      // Validar justificativas quando vencedor não é o menor preço
      prev.items.forEach((item) => {
        const row = prev.quoteMatrix[item.id] || {};
        const winnerId = row.winnerSupplierId;
        if (!winnerId) {
          errors.push(`Item ${item.code}: nenhum vencedor selecionado`);
          return;
        }

        // Calcular menor valor
        let lowestValue: number | null = null;
        let lowestSupplierId: string | null = null;
        selectedSuppliers.forEach((sup) => {
          const cell = row[sup.id];
          if (cell?.finalValue != null) {
            if (lowestValue === null || cell.finalValue < lowestValue) {
              lowestValue = cell.finalValue;
              lowestSupplierId = sup.id;
            }
          }
        });

        if (lowestSupplierId && winnerId !== lowestSupplierId && !row.justificationIfNotLowest) {
          errors.push(
            `Item ${item.code}: justificativa obrigatória quando vencedor não é o menor preço`
          );
        }
      });

      validationErrors = errors;
      return { ...prev, validationErrors: errors };
    });

    if (validationErrors.length > 0) {
      throw new Error('Validação falhou: ' + validationErrors.join('; '));
    }

    if (!currentContext) {
      throw new Error('Contexto não carregado');
    }

    setState((prev) => ({ ...prev, saving: true }));

    try {
      // TODO: Implementar salvamento completo via API
      // Por enquanto, apenas atualizar observações
      await EntityService.update({
        schema: 'compras',
        table: 'cotacoes',
        id: currentContext.id,
        companyId,
        data: {
          observacoes: currentContext.generalNotes,
        },
      });

      setState((prev) => ({ ...prev, saving: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, saving: false }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const value: PurchaseQuoteContextType = {
    ...state,
    loadQuoteData,
    updateGeneralNotes,
    toggleSupplierSelection,
    setQuoteValue,
    setItemWinner,
    setGlobalWinner,
    validateBeforeSubmit,
    submitQuote,
    reset,
  };

  return <PurchaseQuoteContext.Provider value={value}>{children}</PurchaseQuoteContext.Provider>;
}

export function usePurchaseQuoteStore() {
  const context = useContext(PurchaseQuoteContext);
  if (!context) {
    throw new Error('usePurchaseQuoteStore must be used within PurchaseQuoteProvider');
  }
  return context;
}

