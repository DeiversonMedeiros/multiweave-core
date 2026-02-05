import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { EntityService } from '@/services/generic/entityService';
import { usePeriodicExams } from '@/hooks/rh/usePeriodicExams';
import { useRHData } from '@/hooks/generic/useEntityData';
import { supabase } from '@/integrations/supabase/client';

export interface ExameData {
  id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  tipo_exame: string;
  data_agendamento: string;
  data_vencimento: string;
  status: 'agendado' | 'realizado' | 'vencido' | 'pendente';
  observacoes?: string;
  dias_para_vencimento: number;
}

/**
 * Hook para buscar exames formatados para o portal do gestor
 * Filtra apenas exames dos funcionários gerenciados pelo gestor logado
 */
export function useExamesGestor() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const companyId = selectedCompany?.id || '';

  // Buscar funcionários gerenciados pelo gestor
  const { data: managedEmployeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['managed-employees-for-exams', user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) {
        return [];
      }

      // Buscar todos os funcionários ativos da empresa
      const { data: allEmployees, error } = await supabase
        .from('employees')
        .select('id, gestor_imediato_id, user_id')
        .eq('company_id', companyId)
        .eq('status', 'ativo');

      if (error) {
        console.error('Erro ao buscar funcionários:', error);
        return [];
      }

      if (!allEmployees) return [];

      // Criar mapa de employee_id -> user_id para verificação rápida
      const employeeUserIdMap = new Map(
        allEmployees.map((emp: any) => [emp.id, emp.user_id])
      );

      // Filtrar funcionários gerenciados
      return allEmployees
        .filter((emp: any) => {
          // Caso 1: gestor_imediato_id é o user_id diretamente
          if (emp.gestor_imediato_id === user.id) return true;
          
          // Caso 2: gestor_imediato_id é um employee_id que tem o user_id correspondente
          const gestorUserId = employeeUserIdMap.get(emp.gestor_imediato_id);
          return gestorUserId === user.id;
        })
        .map((emp: any) => emp.id);
    },
    enabled: !!user?.id && !!companyId,
  });

  // Buscar exames usando o hook existente
  const { data: examsData, isLoading: isLoadingExams, error } = usePeriodicExams(companyId, {});
  
  // Buscar funcionários para mapear nomes e matrículas
  const { data: employeesData } = useRHData<any>('employees', companyId);

  // Formatar dados e filtrar apenas exames dos funcionários gerenciados
  const formattedExamesData: ExameData[] = [];

  if (examsData && employeesData && managedEmployeesData) {
    const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
    const employeeMap = new Map(employees.map((emp: any) => [emp.id, emp]));
    const managedEmployeeIds = new Set(managedEmployeesData);

    // Filtrar apenas exames dos funcionários gerenciados
    const filteredExams = examsData.filter((exam: any) => 
      managedEmployeeIds.has(exam.employee_id)
    );

    filteredExams.forEach((exam: any) => {
      const employee = employeeMap.get(exam.employee_id);
      
      // Calcular dias para vencimento
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = new Date(exam.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diasParaVencimento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Mapear status
      let status: 'agendado' | 'realizado' | 'vencido' | 'pendente' = 'agendado';
      if (exam.status === 'realizado') {
        status = 'realizado';
      } else if (exam.status === 'vencido' || diasParaVencimento < 0) {
        status = 'vencido';
      } else if (exam.status === 'agendado') {
        status = 'agendado';
      } else {
        status = 'pendente';
      }

      // Mapear tipo de exame para formato legível
      const tipoExameMap: Record<string, string> = {
        'admissional': 'Exame Admissional',
        'periodico': 'Exame Periódico',
        'demissional': 'Exame Demissional',
        'retorno_trabalho': 'Exame de Retorno ao Trabalho',
        'mudanca_funcao': 'Exame de Mudança de Função',
        'ambiental': 'Exame Ambiental'
      };

      formattedExamesData.push({
        id: exam.id,
        funcionario_nome: employee?.nome || 'N/A',
        funcionario_matricula: employee?.matricula || 'N/A',
        tipo_exame: tipoExameMap[exam.tipo_exame] || exam.tipo_exame,
        data_agendamento: exam.data_agendamento,
        data_vencimento: exam.data_vencimento,
        status,
        observacoes: exam.observacoes,
        dias_para_vencimento: diasParaVencimento
      });
    });
  }

  return {
    data: formattedExamesData,
    isLoading: isLoadingExams || isLoadingEmployees || (employeesData === undefined),
    error
  };
}

