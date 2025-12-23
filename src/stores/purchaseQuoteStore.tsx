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
      // Carregar cotação
      const quote = await EntityService.getById({
        schema: 'compras',
        table: 'cotacoes',
        id: quoteId,
        companyId,
      });

      // Carregar requisição vinculada
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

        // Carregar materiais
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
      }

      // Carregar fornecedores da cotação
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

      // Carregar todos os fornecedores disponíveis
      const fornecedoresResult = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId,
        filters: { status: 'ativo' },
        page: 1,
        pageSize: 100,
      });
      const fornecedoresDisponiveis = fornecedoresResult.data || [];

      // Carregar partners para obter nomes
      const partnersResult = await EntityService.list({
        schema: 'public',
        table: 'partners',
        companyId,
        filters: {},
        page: 1,
        pageSize: 1000,
      });
      const partners = partnersResult.data || [];
      const partnersMap = new Map(partners.map((p: any) => [p.id, p]));

      // Mapear itens
      const items: PurchaseItemState[] = requisicaoItens.map((item: any) => {
        const materialIdStr = item.material_id ? String(item.material_id) : null;
        const material = materialIdStr ? materiaisMap.get(materialIdStr) : null;
        return {
          id: item.id,
          code: item.material_id ? String(item.material_id) : `ITEM-${item.id.slice(0, 8)}`,
          description: material?.nome || item.material_nome || 'Material não identificado',
          unit: item.unidade_medida || 'UN',
          quantity: Number(item.quantidade) || 0,
          originLabel: requisicaoData?.numero_requisicao || 'Requisição',
          material_id: item.material_id,
          material_nome: material?.nome || item.material_nome,
          material_imagem_url: material?.imagem_url || null,
        };
      });

      // Mapear fornecedores
      const suppliers: SupplierState[] = fornecedoresDisponiveis.map((fornecedor: any) => {
        const partner = partnersMap.get(fornecedor.partner_id);
        const isSelected = fornecedoresCotacao.some((fc: any) => fc.fornecedor_id === fornecedor.id);
        return {
          id: fornecedor.id,
          name: partner?.nome_fantasia || partner?.razao_social || fornecedor.partner_id || 'Fornecedor',
          cnpj: partner?.cnpj || fornecedor.cnpj || '',
          type: (fornecedor.tipo || 'NACIONAL') as SupplierType,
          status: (fornecedor.status === 'bloqueado' ? 'BLOCKED' : 'ACTIVE') as SupplierStatus,
          selected: isSelected,
          partner_id: fornecedor.partner_id,
        };
      });

      // Carregar valores existentes (se houver)
      const quoteMatrix: QuoteMatrixState = {};
      // TODO: Carregar valores de cotacao_valores se existir na estrutura

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
      let buyer = { id: quote.created_by || '', nome: 'Usuário', email: '' };
      if (quote.created_by) {
        try {
          const user = await EntityService.getById({
            schema: 'public',
            table: 'users',
            id: quote.created_by,
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

      const context: QuoteContextState = {
        id: quote.id,
        numero_cotacao: quote.numero_cotacao || '',
        type: (quote.tipo === 'emergencial' || quote.is_emergencial ? 'EMERGENCY' : 'NORMAL') as QuoteType,
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

