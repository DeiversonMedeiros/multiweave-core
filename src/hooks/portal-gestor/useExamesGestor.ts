import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { usePeriodicExams } from '@/hooks/rh/usePeriodicExams';
import { useRHData } from '@/hooks/generic/useEntityData';

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
 */
export function useExamesGestor() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  // Buscar exames usando o hook existente
  const { data: examsData, isLoading, error } = usePeriodicExams(companyId, {});
  
  // Buscar funcionários para mapear nomes e matrículas
  const { data: employeesData } = useRHData<any>('employees', companyId);

  // Formatar dados
  const formattedExamesData: ExameData[] = [];

  if (examsData && employeesData) {
    const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
    const employeeMap = new Map(employees.map((emp: any) => [emp.id, emp]));

    examsData.forEach((exam: any) => {
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
    isLoading: isLoading || (employeesData === undefined),
    error
  };
}

