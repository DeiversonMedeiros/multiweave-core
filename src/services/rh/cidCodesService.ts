import { EntityService } from '@/services/generic/entityService';
import { CidCode } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE CÓDIGOS CID
// =====================================================

export const CidCodesService = {
  /**
   * Lista todos os códigos CID de uma empresa
   */
  list: async (companyId: string) => {
    console.log('🔍 [cidCodesService.list] Iniciando busca:', { companyId });
    
    try {
      const result = await EntityService.list<CidCode>({
        schema: 'rh',
        table: 'cid_codes',
        companyId: companyId,
        filters: {},
        orderBy: 'codigo',
        orderDirection: 'ASC'
      });
      
      console.log('✅ [cidCodesService.list] Resultado:', {
        hasData: !!result.data,
        dataLength: result.data?.length || 0,
        totalCount: result.totalCount
      });
      
      if (result.data && result.data.length > 0) {
        console.log('📊 [cidCodesService.list] Primeiros códigos:', result.data.slice(0, 3));
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ [cidCodesService.list] Erro:', error);
      throw error;
    }
  },

  /**
   * Busca um código CID por ID
   */
  getById: async (id: string, companyId: string): Promise<CidCode | null> => {
    try {
      const result = await EntityService.list<CidCode>({
        schema: 'rh',
        table: 'cid_codes',
        companyId: companyId,
        filters: { id },
        orderBy: 'codigo',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar código CID:', error);
      throw error;
    }
  },

  /**
   * Cria um novo código CID
   */
  create: async (data: Partial<CidCode>, companyId: string): Promise<CidCode> => {
    try {
      return await EntityService.create<CidCode>({
        schema: 'rh',
        table: 'cid_codes',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar código CID:', error);
      throw error;
    }
  },

  /**
   * Atualiza um código CID
   */
  update: async (id: string, data: Partial<CidCode>, companyId: string): Promise<CidCode> => {
    try {
      return await EntityService.update<CidCode>({
        schema: 'rh',
        table: 'cid_codes',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar código CID:', error);
      throw error;
    }
  },

  /**
   * Remove um código CID
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'cid_codes',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover código CID:', error);
      throw error;
    }
  }
};

