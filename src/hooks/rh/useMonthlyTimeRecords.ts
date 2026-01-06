import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

export interface TimeRecord {
  id: string;
  employee_id: string;
  data_registro: string;
  entrada?: string;
  saida?: string;
  entrada_almoco?: string;
  saida_almoco?: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  horas_trabalhadas?: number;
  horas_extras?: number;
  horas_extras_50?: number;
  horas_extras_100?: number;
  horas_negativas?: number;
  horas_noturnas?: number;
  horas_faltas?: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'corrigido';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTimeRecords {
  recordsByDate: Record<string, TimeRecord>;
  totalDays: number;
  workedDays: number;
  totalHours: number;
  extraHours: number;
  missingHours: number;
}

export function useMonthlyTimeRecords(year: number, month: number) {
  const { selectedCompany } = useCompany();
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  return useQuery({
    queryKey: ['monthly-time-records', user?.id, year, month, selectedCompany?.id],
    queryFn: async (): Promise<MonthlyTimeRecords> => {
      if (!user?.id || !selectedCompany?.id) {
        throw new Error('Usuário não autenticado ou empresa não selecionada');
      }

      try {
        // Buscar funcionário pelo user_id
        const employeeResult = await EntityService.list({
          schema: 'rh',
          table: 'employees',
          companyId: selectedCompany.id,
          filters: { user_id: user.id },
          pageSize: 1
        });

        const employee = employeeResult.data?.[0];
        if (!employee) {
          throw new Error('Funcionário não encontrado');
        }

        // Calcular primeiro e último dia do mês
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

         // Debug logs
         console.log('🔍 [useMonthlyTimeRecords] Buscando registros com params:', {
           employee_id: employee.id,
           data_registro_gte: firstDay.toISOString().split('T')[0],
           data_registro_lte: lastDay.toISOString().split('T')[0],
           company_id: selectedCompany.id
         });

         // Buscar registros do mês usando RPC function
         const { data: records, error: recordsError } = await supabase.rpc('get_entity_data', {
             schema_name: 'rh',
             table_name: 'time_records',
             company_id_param: selectedCompany.id,
             filters: {
               employee_id: employee.id,
               data_registro_gte: firstDay.toISOString().split('T')[0],
               data_registro_lte: lastDay.toISOString().split('T')[0]
             },
             order_by: 'data_registro',
             order_direction: 'ASC',
             limit_param: 1000,
             offset_param: 0
           }) as { data: any[] | null; error: any };

         // Debug logs
         console.log('📊 [useMonthlyTimeRecords] Resultado da função:', {
           records,
           error: recordsError,
           recordsLength: records?.length || 0
         });

         if (recordsError) {
           console.error('❌ [useMonthlyTimeRecords] Erro ao buscar registros:', recordsError);
           throw new Error(`Erro ao buscar registros: ${recordsError.message}`);
         }

         const recordsData = Array.isArray(records) ? records.map((item: any) => item.data) : [];
         console.log('🔄 [useMonthlyTimeRecords] RecordsData processado:', {
           totalRecords: recordsData.length,
           sampleRecord: recordsData[0] || 'Nenhum registro'
         });

        // Processar registros por data
        const recordsByDate: Record<string, TimeRecord> = {};
        let totalHours = 0;
        let extraHours = 0;
        let missingHours = 0;
        let workedDays = 0;

        recordsData.forEach(record => {
          console.log('📅 [useMonthlyTimeRecords] Processando registro:', {
            data_registro: record.data_registro,
            entrada: record.entrada,
            saida: record.saida,
            status: record.status
          });
          
          recordsByDate[record.data_registro] = record;
          
          if (record.horas_trabalhadas) {
            totalHours += record.horas_trabalhadas;
          }
          if (record.horas_extras) {
            extraHours += record.horas_extras;
          }
          if (record.horas_faltas) {
            missingHours += record.horas_faltas;
          }
          if (record.entrada && record.saida) {
            workedDays++;
          }
        });

        console.log('✅ [useMonthlyTimeRecords] Registros organizados por data:', {
          totalDays: recordsByDate,
          keys: Object.keys(recordsByDate),
          totalHours,
          workedDays
        });

        // Calcular total de dias no mês
        const totalDays = lastDay.getDate();

        return {
          recordsByDate,
          totalDays,
          workedDays,
          totalHours: Math.round(totalHours * 100) / 100,
          extraHours: Math.round(extraHours * 100) / 100,
          missingHours: Math.round(missingHours * 100) / 100
        };
      } catch (error) {
        console.error('Erro ao buscar registros mensais:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false
  });
}

// Hook para buscar registros de um funcionário específico (para gestores)
export function useEmployeeMonthlyTimeRecords(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['employee-monthly-time-records', employeeId, year, month],
    queryFn: async (): Promise<MonthlyTimeRecords> => {
      // Calcular primeiro e último dia do mês
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

       // Buscar registros do mês usando RPC function
       const { data: records, error: recordsError } = await supabase
         .rpc('get_entity_data', {
           schema_name: 'rh',
           table_name: 'time_records',
           company_id_param: null, // Será filtrado pelo employee_id
           filters: {
             employee_id: employeeId,
             data_registro_gte: firstDay.toISOString().split('T')[0],
             data_registro_lte: lastDay.toISOString().split('T')[0]
           },
           order_by: 'data_registro',
           order_direction: 'ASC',
           limit_param: 1000,
           offset_param: 0
         });

       if (recordsError) {
         throw new Error(`Erro ao buscar registros: ${recordsError.message}`);
       }

      // Processar registros por data
      const recordsByDate: Record<string, TimeRecord> = {};
      let totalHours = 0;
      let extraHours = 0;
      let missingHours = 0;
      let workedDays = 0;

       const recordsData = records?.map((item: any) => item.data) || [];

       recordsData.forEach(record => {
        recordsByDate[record.data_registro] = record;
        
        if (record.horas_trabalhadas) {
          totalHours += record.horas_trabalhadas;
        }
        if (record.horas_extras) {
          extraHours += record.horas_extras;
        }
        if (record.horas_faltas) {
          missingHours += record.horas_faltas;
        }
        if (record.entrada && record.saida) {
          workedDays++;
        }
      });

      // Calcular total de dias no mês
      const totalDays = lastDay.getDate();

      return {
        recordsByDate,
        totalDays,
        workedDays,
        totalHours: Math.round(totalHours * 100) / 100,
        extraHours: Math.round(extraHours * 100) / 100,
        missingHours: Math.round(missingHours * 100) / 100
      };
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false
  });
}
