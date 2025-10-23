import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

export interface Employee {
  id: string;
  user_id: string;
  company_id: string;
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  telefone?: string;
  data_admissao: string;
  cargo_id?: string;
  unidade_id?: string;
  salario?: number;
  status: 'ativo' | 'inativo' | 'afastado' | 'demitido';
  created_at: string;
  updated_at: string;
}

export function useEmployeeByUserId(userId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['employee-by-user-id', userId, selectedCompany?.id],
    queryFn: async (): Promise<Employee | null> => {
      if (!userId || !selectedCompany?.id) {
        return null;
      }

      try {
        const result = await EntityService.list({
          schema: 'rh',
          table: 'employees',
          companyId: selectedCompany.id,
          filters: { user_id: userId },
          pageSize: 1
        });

        return result.data?.[0] || null;
      } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
        return null;
      }
    },
    enabled: !!userId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });
}
