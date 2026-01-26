import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

export interface EntradaMaterial {
  id: string;
  company_id: string;
  nfe_id?: string;
  fornecedor_id?: string;
  numero_nota?: string;
  data_entrada: string;
  valor_total?: number;
  status: 'pendente' | 'inspecao' | 'aprovado' | 'rejeitado';
  checklist_aprovado: boolean;
  usuario_recebimento_id?: string;
  usuario_aprovacao_id?: string;
  observacoes?: string;
  created_at: string;
  fornecedor?: {
    id: string;
    nome: string;
    cnpj: string;
  };
  nfe?: {
    id: string;
    chave_acesso: string;
    numero_nfe: string;
    serie: string;
    data_emissao: string;
    valor_total: number;
    status_sefaz: string;
    xml_nfe?: string;
    danfe_url?: string;
  };
  itens?: EntradaItem[];
  usuario_recebimento?: {
    id: string;
    nome: string;
    email: string;
  };
  usuario_aprovacao?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface EntradaItem {
  id: string;
  entrada_id: string;
  material_equipamento_id: string;
  quantidade_recebida: number;
  quantidade_aprovada: number;
  valor_unitario?: number;
  valor_total?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  lote?: string;
  validade?: string;
  observacoes?: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo: string;
  };
  projeto?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface CreateEntradaData {
  nfe_id?: string;
  fornecedor_id?: string;
  numero_nota?: string;
  data_entrada: string;
  valor_total?: number;
  observacoes?: string;
  itens: Omit<EntradaItem, 'id' | 'entrada_id'>[];
}

export const useEntradasMateriais = () => {
  const [entradas, setEntradas] = useState<EntradaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchEntradas = async (filters?: {
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    fornecedor_id?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Construir filtros para EntityService
      const entityFilters: any = {};
      if (filters?.status) {
        entityFilters.status = filters.status;
      }
      if (filters?.fornecedor_id) {
        entityFilters.fornecedor_id = filters.fornecedor_id;
      }

      // Buscar entradas usando EntityService
      const result = await EntityService.list<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        filters: entityFilters,
        orderBy: 'data_entrada',
        orderDirection: 'DESC'
      });

      // Filtrar por data no frontend se necessário
      let entradasBase = result.data || [];
      
      if (filters?.data_inicio) {
        entradasBase = entradasBase.filter((e: any) => 
          e.data_entrada >= filters.data_inicio!
        );
      }
      
      if (filters?.data_fim) {
        entradasBase = entradasBase.filter((e: any) => 
          e.data_entrada <= filters.data_fim!
        );
      }

      // Buscar dados relacionados para cada entrada
      const entradasCompletas = await Promise.all(
        entradasBase.map(async (entrada) => {
          const entradaCompleta: EntradaMaterial = { ...entrada };

          // Buscar fornecedor
          if (entrada.fornecedor_id) {
            try {
              const fornecedor = await EntityService.getById<any>({
                schema: 'public',
                table: 'partners',
                id: entrada.fornecedor_id,
                companyId: selectedCompany.id
              });
              if (fornecedor) {
                entradaCompleta.fornecedor = {
                  id: fornecedor.id,
                  nome: fornecedor.nome_fantasia || fornecedor.razao_social || '',
                  cnpj: fornecedor.cnpj || ''
                };
              }
            } catch (err) {
              console.warn('Erro ao buscar fornecedor:', err);
            }
          }

          // Buscar itens da entrada
          try {
            const itensResult = await EntityService.list<any>({
              schema: 'almoxarifado',
              table: 'entrada_itens',
              companyId: selectedCompany.id,
              filters: { entrada_id: entrada.id },
              orderBy: 'created_at',
              orderDirection: 'ASC',
              skipCompanyFilter: true
            });

            const itens = await Promise.all(
              (itensResult.data || []).map(async (item: any) => {
                const itemCompleto: EntradaItem = { ...item };

                // Buscar material
                if (item.material_equipamento_id) {
                  try {
                    const material = await EntityService.getById<any>({
                      schema: 'almoxarifado',
                      table: 'materiais_equipamentos',
                      id: item.material_equipamento_id,
                      companyId: selectedCompany.id
                    });
                    if (material) {
                      itemCompleto.material = {
                        id: material.id,
                        codigo_interno: material.codigo_interno || '',
                        descricao: material.descricao || material.nome || '',
                        tipo: material.tipo || 'material',
                        unidade_medida: material.unidade_medida || 'UN'
                      };
                    }
                  } catch (err) {
                    console.warn('Erro ao buscar material:', err);
                  }
                }

                // Buscar centro de custo
                if (item.centro_custo_id) {
                  try {
                    const centroCusto = await EntityService.getById<any>({
                      schema: 'public',
                      table: 'cost_centers',
                      id: item.centro_custo_id,
                      companyId: selectedCompany.id
                    });
                    if (centroCusto) {
                      itemCompleto.centro_custo = {
                        id: centroCusto.id,
                        nome: centroCusto.nome || '',
                        codigo: centroCusto.codigo || ''
                      };
                    }
                  } catch (err) {
                    console.warn('Erro ao buscar centro de custo:', err);
                  }
                }

                // Buscar projeto
                if (item.projeto_id) {
                  try {
                    const projeto = await EntityService.getById<any>({
                      schema: 'public',
                      table: 'projects',
                      id: item.projeto_id,
                      companyId: selectedCompany.id
                    });
                    if (projeto) {
                      itemCompleto.projeto = {
                        id: projeto.id,
                        nome: projeto.nome || '',
                        codigo: projeto.codigo || ''
                      };
                    }
                  } catch (err) {
                    console.warn('Erro ao buscar projeto:', err);
                  }
                }

                return itemCompleto;
              })
            );

            entradaCompleta.itens = itens;
          } catch (err) {
            console.warn('Erro ao buscar itens:', err);
            entradaCompleta.itens = [];
          }

          // Buscar usuários (se necessário)
          if (entrada.usuario_recebimento_id) {
            try {
              const { data: usuario } = await supabase
                .from('users')
                .select('id, nome, email')
                .eq('id', entrada.usuario_recebimento_id)
                .single();
              if (usuario) {
                entradaCompleta.usuario_recebimento = usuario;
              }
            } catch (err) {
              console.warn('Erro ao buscar usuário recebimento:', err);
            }
          }

          if (entrada.usuario_aprovacao_id) {
            try {
              const { data: usuario } = await supabase
                .from('users')
                .select('id, nome, email')
                .eq('id', entrada.usuario_aprovacao_id)
                .single();
              if (usuario) {
                entradaCompleta.usuario_aprovacao = usuario;
              }
            } catch (err) {
              console.warn('Erro ao buscar usuário aprovação:', err);
            }
          }

          return entradaCompleta;
        })
      );

      setEntradas(entradasCompletas);
    } catch (err) {
      console.error('Erro ao buscar entradas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createEntrada = async (data: CreateEntradaData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Criar entrada principal usando EntityService
      const newEntrada = await EntityService.create<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        data: {
          ...data,
          company_id: selectedCompany.id,
          status: 'pendente',
          checklist_aprovado: false
        }
      });

      // Criar itens da entrada
      if (data.itens && data.itens.length > 0) {
        await Promise.all(
          data.itens.map(async (item) => {
            await EntityService.create<any>({
              schema: 'almoxarifado',
              table: 'entrada_itens',
              companyId: selectedCompany.id,
              data: {
                ...item,
                entrada_id: newEntrada.id,
                company_id: selectedCompany.id
              },
              skipCompanyFilter: true
            });
          })
        );
      }

      // Recarregar entradas para incluir a nova
      await fetchEntradas();
      
      // Buscar a entrada recém-criada com todos os dados
      const entradaCompleta = await EntityService.getById<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        id: newEntrada.id,
        companyId: selectedCompany.id
      });

      return entradaCompleta;
    } catch (err) {
      console.error('Erro ao criar entrada:', err);
      throw err;
    }
  };

  const updateEntrada = async (id: string, data: Partial<EntradaMaterial>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const updatedEntrada = await EntityService.update<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        id: id,
        data: data
      });

      // Recarregar entradas para obter dados atualizados
      await fetchEntradas();

      return updatedEntrada;
    } catch (err) {
      console.error('Erro ao atualizar entrada:', err);
      throw err;
    }
  };

  const aprovarEntrada = async (id: string, usuarioAprovacaoId: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Atualizar status da entrada usando EntityService
      await EntityService.update<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        id: id,
        data: {
          status: 'aprovado',
          checklist_aprovado: true,
          usuario_aprovacao_id: usuarioAprovacaoId
        }
      });

      // Buscar itens aprovados para atualizar estoque
      const itensResult = await EntityService.list<any>({
        schema: 'almoxarifado',
        table: 'entrada_itens',
        companyId: selectedCompany.id,
        filters: { 
          entrada_id: id,
          quantidade_aprovada: { gt: 0 }
        },
        skipCompanyFilter: true
      });

      const itens = itensResult.data || [];

      // Atualizar estoque para cada item aprovado
      for (const item of itens) {
        // Aqui seria necessário implementar a lógica de atualização do estoque
        // Por enquanto, apenas logamos
        console.log(`Atualizando estoque para material ${item.material_equipamento_id}: +${item.quantidade_aprovada}`);
      }

      // Atualizar estado local
      await fetchEntradas();
    } catch (err) {
      console.error('Erro ao aprovar entrada:', err);
      throw err;
    }
  };

  const rejeitarEntrada = async (id: string, motivo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      await EntityService.update<any>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        id: id,
        data: {
          status: 'rejeitado',
          observacoes: motivo
        }
      });

      // Atualizar estado local
      await fetchEntradas();
    } catch (err) {
      console.error('Erro ao rejeitar entrada:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEntradas();
  }, [selectedCompany?.id]);

  return {
    entradas,
    loading,
    error,
    refetch: fetchEntradas,
    createEntrada,
    updateEntrada,
    aprovarEntrada,
    rejeitarEntrada
  };
};

