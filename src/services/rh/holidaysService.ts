// =====================================================
// SERVIÇO DE FERIADOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { Holiday, HolidayCreateData, HolidayUpdateData, HolidayFilters } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getHolidays(
  companyId: string,
  filters: HolidayFilters = {}
): Promise<{ data: Holiday[]; totalCount: number }> {
  try {
    const result = await EntityService.list<Holiday>({
      schema: 'rh',
      table: 'holidays',
      companyId,
      filters,
      orderBy: 'data',
      orderDirection: 'ASC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function getHolidayById(
  id: string,
  companyId: string
): Promise<Holiday | null> {
  try {
    return await EntityService.getById<Holiday>({
      schema: 'rh',
      table: 'holidays',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function createHoliday(
  holidayData: HolidayCreateData
): Promise<Holiday> {
  try {
    return await EntityService.create<Holiday>({
      schema: 'rh',
      table: 'holidays',
      companyId: holidayData.company_id,
      data: holidayData
    });
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function updateHoliday(
  holidayData: HolidayUpdateData
): Promise<Holiday> {
  try {
    const { id, company_id, ...updateData } = holidayData;

    return await EntityService.update<Holiday>({
      schema: 'rh',
      table: 'holidays',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function deleteHoliday(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'holidays',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getHolidayTypeLabel(tipo: string): string {
  const tipos = {
    nacional: 'Nacional',
    estadual: 'Estadual',
    municipal: 'Municipal',
    pontos_facultativos: 'Pontos Facultativos',
    outros: 'Outros'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getHolidayTypeColor(tipo: string): string {
  const cores = {
    nacional: 'bg-red-100 text-red-800',
    estadual: 'bg-blue-100 text-blue-800',
    municipal: 'bg-green-100 text-green-800',
    pontos_facultativos: 'bg-yellow-100 text-yellow-800',
    outros: 'bg-gray-100 text-gray-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateWithWeekday(date: string): string {
  const dateObj = new Date(date);
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString('pt-BR');
  return `${weekday}, ${dateStr}`;
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DOS FERIADOS
// =====================================================

export async function getHolidaysByYear(
  companyId: string,
  year: number
): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase.rpc('get_holidays_by_year', {
      company_id_param: companyId,
      year_param: year
    });

    if (error) {
      console.error('Erro ao buscar feriados por ano:', error);
      throw new Error(`Erro ao buscar feriados por ano: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function getHolidaysByMonth(
  companyId: string,
  year: number,
  month: number
): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase.rpc('get_holidays_by_month', {
      company_id_param: companyId,
      year_param: year,
      month_param: month
    });

    if (error) {
      console.error('Erro ao buscar feriados por mês:', error);
      throw new Error(`Erro ao buscar feriados por mês: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function isHoliday(
  companyId: string,
  date: string
): Promise<{ isHoliday: boolean; holiday?: Holiday }> {
  try {
    const { data, error } = await supabase.rpc('is_holiday', {
      company_id_param: companyId,
      date_param: date
    });

    if (error) {
      console.error('Erro ao verificar se é feriado:', error);
      throw new Error(`Erro ao verificar se é feriado: ${error.message}`);
    }

    return data || { isHoliday: false };
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function getWorkingDaysInMonth(
  companyId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_working_days_in_month', {
      company_id_param: companyId,
      year_param: year,
      month_param: month
    });

    if (error) {
      console.error('Erro ao calcular dias úteis:', error);
      throw new Error(`Erro ao calcular dias úteis: ${error.message}`);
    }

    return data || 0;
  } catch (error) {
    console.error('Erro no serviço de feriados:', error);
    throw error;
  }
}

export async function importNationalHolidays(
  companyId: string,
  year: number
): Promise<Holiday[]> {
  try {
    // Feriados nacionais fixos do Brasil
    const nationalHolidays = [
      { nome: 'Confraternização Universal', data: `${year}-01-01`, tipo: 'nacional' },
      { nome: 'Tiradentes', data: `${year}-04-21`, tipo: 'nacional' },
      { nome: 'Dia do Trabalhador', data: `${year}-05-01`, tipo: 'nacional' },
      { nome: 'Independência do Brasil', data: `${year}-09-07`, tipo: 'nacional' },
      { nome: 'Nossa Senhora Aparecida', data: `${year}-10-12`, tipo: 'nacional' },
      { nome: 'Finados', data: `${year}-11-02`, tipo: 'nacional' },
      { nome: 'Proclamação da República', data: `${year}-11-15`, tipo: 'nacional' },
      { nome: 'Natal', data: `${year}-12-25`, tipo: 'nacional' }
    ];

    // Calcular Páscoa e feriados móveis
    const easter = calculateEaster(year);
    const carnival = new Date(easter);
    carnival.setDate(easter.getDate() - 47);
    
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);

    nationalHolidays.push(
      { nome: 'Carnaval', data: formatDateForDB(carnival), tipo: 'nacional' },
      { nome: 'Sexta-feira Santa', data: formatDateForDB(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)), tipo: 'nacional' },
      { nome: 'Corpus Christi', data: formatDateForDB(corpusChristi), tipo: 'nacional' }
    );

    // Inserir feriados
    const createdHolidays: Holiday[] = [];
    for (const holiday of nationalHolidays) {
      try {
        const created = await createHoliday({
          company_id: companyId,
          ...holiday,
          descricao: 'Feriado nacional brasileiro'
        });
        createdHolidays.push(created);
      } catch (error) {
        // Ignorar erros de duplicação
        console.warn(`Feriado ${holiday.nome} já existe para o ano ${year}`);
      }
    }

    return createdHolidays;
  } catch (error) {
    console.error('Erro ao importar feriados nacionais:', error);
    throw error;
  }
}

// Função auxiliar para calcular a Páscoa
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}
