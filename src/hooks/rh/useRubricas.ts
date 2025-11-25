import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { Rubrica } from '@/integrations/supabase/rh-types';
import { toast } from 'sonner';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface RubricaCreateData {
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'provento' | 'desconto' | 'base_calculo' | 'informacao';
  categoria?: string;
  natureza: 'normal' | 'eventual' | 'fixo' | 'variavel';
  calculo_automatico: boolean;
  formula_calculo?: string;
  valor_fixo?: number;
  percentual?: number;
  base_calculo: string;
  incidencia_ir: boolean;
  incidencia_inss: boolean;
  incidencia_fgts: boolean;
  incidencia_contribuicao_sindical: boolean;
  ordem_exibicao: number;
  obrigatorio: boolean;
  ativo: boolean;
}

export interface RubricaUpdateData extends Partial<RubricaCreateData> {
  id: string;
}

export interface RubricaFilters {
  tipo?: string;
  categoria?: string;
  ativo?: boolean;
  search?: string;
}

// =====================================================
// HOOKS PARA RUBRICAS
// =====================================================

/**
 * Hook para buscar rubricas
 */
export function useRubricas(companyId: string, filters: RubricaFilters = {}) {
  return useQuery({
    queryKey: ['rubricas', companyId, filters],
    queryFn: async () => {
      console.log('🔍 [useRubricas] Buscando rubricas:', { companyId, filters });
      
      if (!companyId) {
        console.warn('⚠️ [useRubricas] companyId não fornecido');
        return [];
      }

      try {
        const result = await EntityService.list({
          schema: 'rh',
          table: 'rubricas',
          companyId: companyId,
          filters: filters,
          orderBy: 'ordem_exibicao',
          orderDirection: 'asc'
        });

        console.log('✅ [useRubricas] Resultado recebido:', {
          hasData: !!result.data,
          dataLength: result.data?.length || 0,
          hasError: !!result.error,
          error: result.error,
          totalCount: result.totalCount
        });

        if (result.error) {
          console.error('❌ [useRubricas] Erro na resposta:', result.error);
          throw new Error(`Erro ao buscar rubricas: ${result.error.message}`);
        }

        if (result.data && result.data.length > 0) {
          console.log('📊 [useRubricas] Primeiras rubricas:', result.data.slice(0, 3).map(r => ({
            id: r.id,
            codigo: r.codigo,
            nome: r.nome,
            company_id: r.company_id
          })));
        } else {
          console.warn('⚠️ [useRubricas] Nenhuma rubrica encontrada para companyId:', companyId);
          console.warn('⚠️ [useRubricas] result completo:', {
            hasData: !!result.data,
            dataType: typeof result.data,
            isArray: Array.isArray(result.data),
            dataLength: result.data?.length,
            totalCount: result.totalCount,
            resultKeys: Object.keys(result)
          });
        }

        const rubricas = result.data as Rubrica[];
        console.log('🔄 [useRubricas] Retornando do hook:', {
          rubricasLength: rubricas.length,
          firstRubrica: rubricas[0] ? { id: rubricas[0].id, codigo: rubricas[0].codigo } : null
        });
        
        return rubricas;
      } catch (error) {
        console.error('❌ [useRubricas] Erro na busca:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar rubrica por ID
 */
export function useRubricaById(id: string, companyId: string) {
  return useQuery({
    queryKey: ['rubrica', id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const result = await EntityService.getById({
        schema: 'rh',
        table: 'rubricas',
        companyId: companyId,
        id: id
      });

      if (result.error) {
        throw new Error(`Erro ao buscar rubrica: ${result.error.message}`);
      }

      return result.data as Rubrica;
    },
    enabled: !!id && !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para criar rubrica
 */
export function useCreateRubrica() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RubricaCreateData) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const result = await EntityService.create({
        schema: 'rh',
        table: 'rubricas',
        companyId: selectedCompany.id,
        data: {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      if (result.error) {
        throw new Error(`Erro ao criar rubrica: ${result.error.message}`);
      }

      return result.data as Rubrica;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast.success('Rubrica criada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar rubrica:', error);
      toast.error('Erro ao criar rubrica');
    }
  });
}

/**
 * Hook para atualizar rubrica
 */
export function useUpdateRubrica() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: RubricaUpdateData) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const result = await EntityService.update({
        schema: 'rh',
        table: 'rubricas',
        companyId: selectedCompany.id,
        id: id,
        data: {
          ...data,
          updated_at: new Date().toISOString()
        }
      });

      if (result.error) {
        throw new Error(`Erro ao atualizar rubrica: ${result.error.message}`);
      }

      return result.data as Rubrica;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast.success('Rubrica atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar rubrica:', error);
      toast.error('Erro ao atualizar rubrica');
    }
  });
}

/**
 * Hook para deletar rubrica
 */
export function useDeleteRubrica() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const result = await EntityService.delete({
        schema: 'rh',
        table: 'rubricas',
        companyId: selectedCompany.id,
        id: id
      });

      if (result.error) {
        throw new Error(`Erro ao deletar rubrica: ${result.error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast.success('Rubrica excluída com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao deletar rubrica:', error);
      toast.error('Erro ao excluir rubrica');
    }
  });
}

/**
 * Hook para duplicar rubrica
 */
export function useDuplicateRubrica() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      // Buscar rubrica original
      const originalResult = await EntityService.getById({
        schema: 'rh',
        table: 'rubricas',
        companyId: selectedCompany.id,
        id: id
      });

      if (originalResult.error) {
        throw new Error(`Erro ao buscar rubrica: ${originalResult.error.message}`);
      }

      const original = originalResult.data as Rubrica;

      // Criar cópia
      const result = await EntityService.create({
        schema: 'rh',
        table: 'rubricas',
        companyId: selectedCompany.id,
        data: {
          ...original,
          id: undefined, // Deixar o banco gerar novo ID
          codigo: `${original.codigo}_COPY`,
          nome: `${original.nome} (Cópia)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      if (result.error) {
        throw new Error(`Erro ao duplicar rubrica: ${result.error.message}`);
      }

      return result.data as Rubrica;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast.success('Rubrica duplicada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao duplicar rubrica:', error);
      toast.error('Erro ao duplicar rubrica');
    }
  });
}

/**
 * Hook para reordenar rubricas
 */
export function useReorderRubricas() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricas: { id: string; ordem_exibicao: number }[]) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      // Atualizar ordem de todas as rubricas
      const updates = rubricas.map(rubrica => 
        EntityService.update({
          schema: 'rh',
          table: 'rubricas',
          companyId: selectedCompany.id,
          id: rubrica.id,
          data: { 
            ordem_exibicao: rubrica.ordem_exibicao,
            updated_at: new Date().toISOString()
          }
        })
      );

      const results = await Promise.all(updates);
      
      // Verificar se houve erro em alguma atualização
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Erro ao reordenar rubricas: ${errors[0].error?.message}`);
      }
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast.success('Ordem das rubricas atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao reordenar rubricas:', error);
      toast.error('Erro ao reordenar rubricas');
    }
  });
}

/**
 * Hook para buscar rubricas por tipo
 */
export function useRubricasByType(tipo: string, companyId: string) {
  return useQuery({
    queryKey: ['rubricas-by-type', tipo, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const result = await EntityService.list({
        schema: 'rh',
        table: 'rubricas',
        companyId: companyId,
        filters: { tipo: tipo, ativo: true },
        orderBy: 'ordem_exibicao',
        orderDirection: 'asc'
      });

      if (result.error) {
        throw new Error(`Erro ao buscar rubricas por tipo: ${result.error.message}`);
      }

      return result.data as Rubrica[];
    },
    enabled: !!companyId && !!tipo,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar rubricas ativas
 */
export function useActiveRubricas(companyId: string) {
  return useQuery({
    queryKey: ['active-rubricas', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const result = await EntityService.list({
        schema: 'rh',
        table: 'rubricas',
        companyId: companyId,
        filters: { ativo: true },
        orderBy: 'ordem_exibicao',
        orderDirection: 'asc'
      });

      if (result.error) {
        throw new Error(`Erro ao buscar rubricas ativas: ${result.error.message}`);
      }

      return result.data as Rubrica[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para estatísticas de rubricas
 */
export function useRubricasStats(companyId: string) {
  return useQuery({
    queryKey: ['rubricas-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const result = await EntityService.list({
        schema: 'rh',
        table: 'rubricas',
        companyId: companyId,
        select: 'tipo, ativo, categoria'
      });

      if (result.error) {
        throw new Error(`Erro ao buscar estatísticas: ${result.error.message}`);
      }

      const data = result.data as any[];

      const stats = {
        total: data?.length || 0,
        ativas: data?.filter(r => r.ativo).length || 0,
        inativas: data?.filter(r => !r.ativo).length || 0,
        proventos: data?.filter(r => r.tipo === 'provento').length || 0,
        descontos: data?.filter(r => r.tipo === 'desconto').length || 0,
        baseCalculo: data?.filter(r => r.tipo === 'base_calculo').length || 0,
        informacoes: data?.filter(r => r.tipo === 'informacao').length || 0,
        porCategoria: data?.reduce((acc, r) => {
          const cat = r.categoria || 'outros';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      };

      return stats;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}