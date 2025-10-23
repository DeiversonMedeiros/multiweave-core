import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { MedicalCertificate } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK SIMPLIFICADO PARA ATESTADOS MÉDICOS
// =====================================================

export const useMedicalCertificatesSimple = (companyId?: string) => {
  const queryClient = useQueryClient();

  // Query para listar atestados médicos
  const { data: medicalCertificates, isLoading, error, refetch } = useQuery({
    queryKey: ['medical-certificates', companyId],
    queryFn: async (): Promise<MedicalCertificate[]> => {
      if (!companyId) return [];
      
      const result = await EntityService.list<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!companyId,
  });

  // Query para buscar atestados por funcionário
  const useMedicalCertificatesByEmployee = (employeeId: string) => {
    return useQuery({
      queryKey: ['medical-certificates', 'employee', employeeId],
      queryFn: async (): Promise<MedicalCertificate[]> => {
        if (!companyId || !employeeId) return [];
        
        const result = await EntityService.list<MedicalCertificate>({
          schema: 'rh',
          table: 'medical_certificates',
          companyId: companyId,
          filters: { employee_id: employeeId },
          orderBy: 'created_at',
          orderDirection: 'DESC'
        });
        
        return result.data;
      },
      enabled: !!companyId && !!employeeId,
    });
  };

  // Mutation para criar atestado médico
  const createMedicalCertificate = useMutation({
    mutationFn: async (data: Omit<MedicalCertificate, 'id' | 'created_at' | 'updated_at'>) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const result = await EntityService.create<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        data: {
          ...data,
          dias_afastamento: calculateAbsenceDays(data.data_inicio, data.data_fim)
        }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] });
    },
  });

  // Função para calcular dias de afastamento
  const calculateAbsenceDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return {
    medicalCertificates,
    isLoading,
    error,
    refetch,
    useMedicalCertificatesByEmployee,
    createMedicalCertificate,
    calculateAbsenceDays,
  };
};
