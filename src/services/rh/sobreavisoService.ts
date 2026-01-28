import { EntityService } from '@/services/generic/entityService';
import { SobreavisoEscala } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE ESCALAS DE SOBREAVISO
// =====================================================
// Regime de espera remunerado: 1/3 da hora normal (Súmula 428 TST).
// Escala máxima 24h. Reflexos: férias, 13º, folha, DSR, FGTS.
// =====================================================

export const SobreavisoService = {
  /**
   * Lista escalas de sobreaviso da empresa
   */
  list: async (companyId: string): Promise<SobreavisoEscala[]> => {
    const result = await EntityService.list<SobreavisoEscala>({
      schema: 'rh',
      table: 'sobreaviso_escalas',
      companyId,
      filters: {},
      orderBy: 'data_escala',
      orderDirection: 'DESC',
    });
    return result.data;
  },

  /**
   * Busca escala por ID
   */
  getById: async (id: string, companyId: string): Promise<SobreavisoEscala | null> => {
    const result = await EntityService.list<SobreavisoEscala>({
      schema: 'rh',
      table: 'sobreaviso_escalas',
      companyId,
      filters: { id },
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
    return result.data[0] ?? null;
  },

  /**
   * Cria nova escala de sobreaviso
   */
  create: async (
    data: Partial<SobreavisoEscala>,
    companyId: string
  ): Promise<SobreavisoEscala> => {
    return EntityService.create<SobreavisoEscala>({
      schema: 'rh',
      table: 'sobreaviso_escalas',
      companyId,
      data,
    });
  },

  /**
   * Atualiza escala de sobreaviso
   */
  update: async (
    id: string,
    data: Partial<SobreavisoEscala>,
    companyId: string
  ): Promise<SobreavisoEscala> => {
    return EntityService.update<SobreavisoEscala>({
      schema: 'rh',
      table: 'sobreaviso_escalas',
      companyId,
      id,
      data,
    });
  },

  /**
   * Remove escala de sobreaviso
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    await EntityService.delete({
      schema: 'rh',
      table: 'sobreaviso_escalas',
      companyId,
      id,
    });
  },

  /**
   * Calcula valor pago (1/3 da hora normal × duração)
   */
  calcularValorPago(duracaoHoras: number, valorHoraNormal: number): number {
    return Math.round((duracaoHoras * valorHoraNormal) / 3 * 100) / 100;
  },
};
