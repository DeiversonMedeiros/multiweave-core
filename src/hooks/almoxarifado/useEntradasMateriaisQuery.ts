import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface EntradaMaterial {
  id: string;
  company_id: string;
  fornecedor_id?: string;
  nfe_id?: string;
  pedido_id?: string;
  numero_nota?: string;
  serie_nota_fiscal?: string;
  tipo_documento_fiscal?: string;
  chave_acesso?: string;
  data_entrada: string;
  valor_total?: number;
  status: 'pendente' | 'inspecao' | 'aprovado' | 'rejeitado';
  checklist_aprovado?: boolean;
  usuario_recebimento_id?: string;
  usuario_aprovacao_id?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  /** Preenchido pelo hook ao enriquecer os dados */
  fornecedor?: {
    id: string;
    nome: string;
    cnpj?: string;
  };
  /** Preenchido pelo hook ao enriquecer os dados */
  itens?: EntradaItem[];
  nfe?: {
    id: string;
    numero_nfe?: string;
    status_sefaz?: string;
    [key: string]: unknown;
  };
  /** Preenchido pelo hook ao enriquecer os dados (quando tem pedido_id) */
  numero_pedido?: string;
  /** Preenchido pelo hook ao enriquecer os dados (quando o pedido tem cotação) */
  numero_cotacao?: string;
}

export interface EntradaItem {
  id: string;
  entrada_id: string;
  material_equipamento_id: string;
  quantidade_recebida: number;
  quantidade_aprovada?: number;
  valor_unitario?: number;
  valor_total?: number;
  lote?: string;
  validade?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  almoxarifado_id?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  /** Quarentena: item fora do padrão até correção; não entra no estoque enquanto em quarentena */
  em_quarentena?: boolean;
  quarentena_motivo?: string;
  quarentena_em?: string;
  quarentena_retirada_em?: string;
  /** Quando preenchido, o item já foi lançado no estoque (read-only no modal) */
  entrada_estoque_em?: string;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar entradas de materiais com fornecedor e itens enriquecidos
 */
export function useEntradasMateriais(filters?: {
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
  almoxarifado_id?: string;
  centro_custo_id?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'entradas_materiais', selectedCompany?.id, filters],
    queryFn: async (): Promise<EntradaMaterial[]> => {
      if (!selectedCompany?.id) return [];

      const entityFilters: Record<string, unknown> = {};
      // "parcial" é status de exibição (calculado após enriquecimento), não é enviado ao backend
      if (filters?.status && filters.status !== 'parcial') {
        entityFilters.status = filters.status;
      }

      const result = await EntityService.list<EntradaMaterial>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        filters: Object.keys(entityFilters).length ? entityFilters : {},
        orderBy: 'data_entrada',
        orderDirection: 'DESC'
      });

      let entradas = result.data || [];

      if (filters?.data_inicio) {
        entradas = entradas.filter((e) => e.data_entrada >= filters.data_inicio!);
      }
      if (filters?.data_fim) {
        entradas = entradas.filter((e) => e.data_entrada <= filters.data_fim!);
      }
      // Busca por código da entrada, pedido e cotação é aplicada após enriquecimento

      const enriquecidas = await Promise.all(
        entradas.map(async (entrada) => {
          const item: EntradaMaterial = { ...entrada };

          // Buscar itens via RPC (get_entity_data): schema almoxarifado não é exposto no REST em alguns projetos, RPC retorna todas as colunas incluindo almoxarifado_id
          let itens: EntradaItem[] = [];
          try {
            const itensResult = await EntityService.list<EntradaItem>({
              schema: 'almoxarifado',
              table: 'entrada_itens',
              companyId: selectedCompany.id,
              filters: { entrada_id: entrada.id },
              orderBy: 'created_at',
              orderDirection: 'ASC',
              skipCompanyFilter: true,
            });
            itens = (itensResult.data || []) as EntradaItem[];
            if (itens.length > 0) {
              console.log('[useEntradasMateriais] 📦 entrada_id=', entrada.id, 'almoxarifado_ids=', itens.map((i: any) => i?.almoxarifado_id));
            }
          } catch (e) {
            console.warn('[useEntradasMateriais] Erro ao buscar entrada_itens via RPC:', e);
          }

          // Pré-entradas: se não há itens em entrada_itens (ex.: pedido foi preenchido depois do trigger),
          // buscar itens do pedido (pedido_itens) para exibir quantidade e valor total
          const pedidoId = (entrada as any).pedido_id;
          if (itens.length === 0 && pedidoId) {
            try {
              const pedidoItensResult = await EntityService.list<{
                id: string;
                material_id: string;
                quantidade: number;
                valor_unitario?: number;
                valor_total?: number;
              }>({
                schema: 'compras',
                table: 'pedido_itens',
                companyId: selectedCompany.id,
                filters: { pedido_id: pedidoId },
                orderBy: 'id',
                orderDirection: 'ASC',
                skipCompanyFilter: true
              });
              const pedidoItens = pedidoItensResult.data || [];
              if (pedidoItens.length > 0) {
                itens = pedidoItens.map((pi) => ({
                  id: pi.id,
                  entrada_id: entrada.id,
                  material_equipamento_id: pi.material_id,
                  quantidade_recebida: Number(pi.quantidade) || 0,
                  quantidade_aprovada: 0,
                  valor_unitario: pi.valor_unitario,
                  valor_total: pi.valor_total
                })) as EntradaItem[];
                console.log('[useEntradasMateriais] ⚠️ Fallback pedido_itens (sem almoxarifado_id) entrada_id=', entrada.id, 'qtd_itens=', itens.length);
              }
            } catch {
              // ignora falha ao buscar pedido_itens
            }
          }
          item.itens = itens;

          // Valor total: do cabeçalho, ou soma dos itens (entrada_itens ou pedido_itens no fallback)
          const rawTotal = (entrada as any).valor_total ?? (entrada as any).valor_total_nfe;
          const headerTotal = typeof rawTotal === 'number' ? rawTotal : Number(rawTotal);
          const totalFromItens = itens.reduce((s, i) => s + (Number((i as any).valor_total) || 0), 0);
          item.valor_total =
            headerTotal > 0 && !Number.isNaN(headerTotal) ? headerTotal : totalFromItens;

          if (entrada.fornecedor_id) {
            try {
              const fornecedor = await EntityService.getById<any>({
                schema: 'public',
                table: 'partners',
                id: entrada.fornecedor_id,
                companyId: selectedCompany.id
              });
              if (fornecedor) {
                item.fornecedor = {
                  id: fornecedor.id,
                  nome: fornecedor.nome_fantasia || fornecedor.razao_social || '',
                  cnpj: fornecedor.cnpj || ''
                };
              }
            } catch {
              // ignora erro de fornecedor
            }
          }

          // Número do pedido e da cotação (para busca)
          if (pedidoId) {
            try {
              const pedido = await EntityService.getById<{ numero_pedido?: string; cotacao_ciclo_id?: string; cotacao_id?: string }>({
                schema: 'compras',
                table: 'pedidos_compra',
                id: pedidoId,
                companyId: selectedCompany.id
              });
              if (pedido?.numero_pedido) item.numero_pedido = pedido.numero_pedido;
              if (pedido?.cotacao_ciclo_id) {
                const ciclo = await EntityService.getById<{ numero_cotacao?: string }>({
                  schema: 'compras',
                  table: 'cotacao_ciclos',
                  id: pedido.cotacao_ciclo_id,
                  companyId: selectedCompany.id
                });
                if (ciclo?.numero_cotacao) item.numero_cotacao = ciclo.numero_cotacao;
              } else if (pedido?.cotacao_id) {
                const cotacao = await EntityService.getById<{ numero_cotacao?: string; cotacao_ciclo_id?: string }>({
                  schema: 'compras',
                  table: 'cotacoes',
                  id: pedido.cotacao_id,
                  companyId: selectedCompany.id
                });
                if (cotacao?.numero_cotacao) {
                  item.numero_cotacao = cotacao.numero_cotacao;
                } else if (cotacao?.cotacao_ciclo_id) {
                  const ciclo = await EntityService.getById<{ numero_cotacao?: string }>({
                    schema: 'compras',
                    table: 'cotacao_ciclos',
                    id: cotacao.cotacao_ciclo_id,
                    companyId: selectedCompany.id
                  });
                  if (ciclo?.numero_cotacao) item.numero_cotacao = ciclo.numero_cotacao;
                }
              }
            } catch {
              // ignora erro ao buscar pedido/cotação
            }
          }

          return item;
        })
      );

      // Busca por código da entrada, número da nota, pedido e cotação (após enriquecimento)
      let resultado = enriquecidas;
      const searchTerm = filters?.search?.trim().toLowerCase();
      if (searchTerm) {
        resultado = resultado.filter((e) => {
          const codigoEntrada = e.id ? `ent-${e.id.slice(0, 8)}` : '';
          return (
            (e.numero_nota && e.numero_nota.toLowerCase().includes(searchTerm)) ||
            (e.id && e.id.toLowerCase().includes(searchTerm)) ||
            (codigoEntrada && codigoEntrada.includes(searchTerm)) ||
            (e.numero_pedido && e.numero_pedido.toLowerCase().includes(searchTerm)) ||
            (e.numero_cotacao && e.numero_cotacao.toLowerCase().includes(searchTerm))
          );
        });
      }

      // Filtro por status de exibição (igual ao badge do card): pendente, inspecao, parcial, aprovado, rejeitado
      const getDisplayStatus = (e: EntradaMaterial): string => {
        const itens = e.itens || [];
        if (itens.length === 0) return e.status;
        const comEntrada = itens.filter((i: EntradaItem) => !!i.entrada_estoque_em).length;
        if (comEntrada > 0 && comEntrada < itens.length) return 'parcial';
        return e.status;
      };
      if (filters?.status && filters.status !== 'todos') {
        resultado = resultado.filter((e) => getDisplayStatus(e) === filters.status);
      }

      // Filtro por almoxarifado: entrada deve ter pelo menos um item com esse almoxarifado_id
      if (filters?.almoxarifado_id?.trim()) {
        const almoxId = filters.almoxarifado_id.trim();
        resultado = resultado.filter((e) =>
          (e.itens || []).some((i: EntradaItem) => i.almoxarifado_id === almoxId)
        );
      }

      // Filtro por centro de custo: entrada deve ter pelo menos um item com esse centro_custo_id
      if (filters?.centro_custo_id?.trim()) {
        const ccId = filters.centro_custo_id.trim();
        resultado = resultado.filter((e) =>
          (e.itens || []).some((i: EntradaItem) => i.centro_custo_id === ccId)
        );
      }

      return resultado;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar entrada de material
 */
export function useCreateEntradaMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<EntradaMaterial, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<EntradaMaterial>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        data: {
          ...data,
          company_id: selectedCompany.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}

/**
 * Hook para atualizar entrada de material
 */
export function useUpdateEntradaMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntradaMaterial> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      return await EntityService.update<EntradaMaterial>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        id,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}

/**
 * Hook para deletar entrada de material
 */
export function useDeleteEntradaMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      return await EntityService.delete({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}
