import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { MedicalCertificate, Employee, MedicalCertificateAttachment } from '@/integrations/supabase/rh-types';
import { supabase } from '@/integrations/supabase/client';

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
      
      // Buscar atestados
      const result = await EntityService.list<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      // Buscar dados dos colaboradores
      const employeeIds = [...new Set(result.data.map(cert => cert.employee_id))];
      const certificateIds = result.data.map(cert => cert.id);
      const approverIds = [...new Set(result.data.map(cert => cert.aprovado_por).filter(Boolean))];
      
      // Buscar employees
      let employeesMap = new Map<string, Employee>();
      if (employeeIds.length > 0) {
        const employeesResult = await EntityService.list<Employee>({
          schema: 'rh',
          table: 'employees',
          companyId: companyId,
          filters: {},
          orderBy: 'nome',
          orderDirection: 'ASC'
        });
        
        employeesMap = new Map(
          employeesResult.data.map(emp => [emp.id, emp])
        );
      }
      
      // Buscar dados dos aprovadores (usuários)
      let approversMap = new Map<string, { nome: string; email?: string }>();
      if (approverIds.length > 0) {
        try {
          // Buscar usuários usando a função RPC get_users_by_company
          const { data: usersData, error: usersError } = await supabase
            .rpc('get_users_by_company', { p_company_id: companyId });
          
          if (!usersError && usersData) {
            // Filtrar apenas os aprovadores dos certificados
            usersData
              .filter((user: { id: string }) => approverIds.includes(user.id))
              .forEach((user: { id: string; nome: string; email?: string }) => {
                approversMap.set(user.id, { 
                  nome: user.nome || user.email || 'Usuário', 
                  email: user.email 
                });
              });
          } else {
            console.warn('[useMedicalCertificatesSimple] Erro ao buscar aprovadores via RPC:', usersError);
          }
        } catch (error) {
          console.warn('[useMedicalCertificatesSimple] Erro ao buscar aprovadores:', error);
          // Continuar sem aprovadores se houver erro
        }
      }
      
      // Buscar anexos usando EntityService
      let attachmentsMap = new Map<string, MedicalCertificateAttachment[]>();
      if (certificateIds.length > 0) {
        try {
          // Buscar todos os anexos da empresa e filtrar por certificate_id
          const attachmentsResult = await EntityService.list<MedicalCertificateAttachment>({
            schema: 'rh',
            table: 'medical_certificate_attachments',
            companyId: companyId,
            filters: {},
            orderBy: 'created_at',
            orderDirection: 'ASC'
          });
          
          if (attachmentsResult.data && attachmentsResult.data.length > 0) {
            // Filtrar apenas os anexos dos certificados retornados
            const filteredAttachments = attachmentsResult.data.filter(attachment => 
              certificateIds.includes(attachment.certificate_id)
            );
            
            console.log('[useMedicalCertificatesSimple] Anexos encontrados:', {
              total: filteredAttachments.length,
              certificateIds: certificateIds.length,
              attachments: filteredAttachments
            });
            
            // Agrupar anexos por certificate_id
            filteredAttachments.forEach((attachment) => {
              const existing = attachmentsMap.get(attachment.certificate_id) || [];
              attachmentsMap.set(attachment.certificate_id, [...existing, attachment]);
            });
          }
        } catch (error) {
          console.warn('[useMedicalCertificatesSimple] Erro ao buscar anexos de atestados:', error);
          // Continuar sem anexos se houver erro
        }
      }
      
      // Combinar dados dos atestados com os dados dos colaboradores, anexos e aprovadores
      return result.data.map(cert => ({
        ...cert,
        employee: employeesMap.get(cert.employee_id),
        attachments: attachmentsMap.get(cert.id) || [],
        aprovador: cert.aprovado_por ? approversMap.get(cert.aprovado_por) : undefined
      }));
    },
    enabled: !!companyId,
  });

  // Query para buscar atestados por funcionário
  const useMedicalCertificatesByEmployee = (employeeId: string) => {
    return useQuery({
      queryKey: ['medical-certificates', 'employee', employeeId],
      queryFn: async (): Promise<MedicalCertificate[]> => {
        if (!companyId || !employeeId) return [];
        
        // Buscar atestados
        const result = await EntityService.list<MedicalCertificate>({
          schema: 'rh',
          table: 'medical_certificates',
          companyId: companyId,
          filters: { employee_id: employeeId },
          orderBy: 'created_at',
          orderDirection: 'DESC'
        });
        
        // Buscar dados do colaborador
        const employeeResult = await EntityService.list<Employee>({
          schema: 'rh',
          table: 'employees',
          companyId: companyId,
          filters: { id: employeeId },
          orderBy: 'nome',
          orderDirection: 'ASC'
        });
        
        const employee = employeeResult.data[0];
        const certificateIds = result.data.map(cert => cert.id);
        const approverIds = [...new Set(result.data.map(cert => cert.aprovado_por).filter(Boolean))];
        
        // Buscar dados dos aprovadores (usuários)
        let approversMap = new Map<string, { nome: string; email?: string }>();
        if (approverIds.length > 0) {
          try {
            // Buscar usuários usando a função RPC get_users_by_company
            const { data: usersData, error: usersError } = await supabase
              .rpc('get_users_by_company', { p_company_id: companyId });
            
            if (!usersError && usersData) {
              // Filtrar apenas os aprovadores dos certificados
              usersData
                .filter((user: { id: string }) => approverIds.includes(user.id))
                .forEach((user: { id: string; nome: string; email?: string }) => {
                  approversMap.set(user.id, { 
                    nome: user.nome || user.email || 'Usuário', 
                    email: user.email 
                  });
                });
            } else {
              console.warn('[useMedicalCertificatesSimple] Erro ao buscar aprovadores via RPC (por employee):', usersError);
            }
          } catch (error) {
            console.warn('[useMedicalCertificatesSimple] Erro ao buscar aprovadores (por employee):', error);
            // Continuar sem aprovadores se houver erro
          }
        }
        
        // Buscar anexos usando EntityService
        let attachmentsMap = new Map<string, MedicalCertificateAttachment[]>();
        if (certificateIds.length > 0) {
          try {
            // Buscar todos os anexos da empresa e filtrar por certificate_id
            const attachmentsResult = await EntityService.list<MedicalCertificateAttachment>({
              schema: 'rh',
              table: 'medical_certificate_attachments',
              companyId: companyId,
              filters: {},
              orderBy: 'created_at',
              orderDirection: 'ASC'
            });
            
            if (attachmentsResult.data && attachmentsResult.data.length > 0) {
              // Filtrar apenas os anexos dos certificados retornados
              const filteredAttachments = attachmentsResult.data.filter(attachment => 
                certificateIds.includes(attachment.certificate_id)
              );
              
              console.log('[useMedicalCertificatesSimple] Anexos encontrados (por employee):', {
                total: filteredAttachments.length,
                certificateIds: certificateIds.length,
                attachments: filteredAttachments
              });
              
              // Agrupar anexos por certificate_id
              filteredAttachments.forEach((attachment) => {
                const existing = attachmentsMap.get(attachment.certificate_id) || [];
                attachmentsMap.set(attachment.certificate_id, [...existing, attachment]);
              });
            }
          } catch (error) {
            console.warn('[useMedicalCertificatesSimple] Erro ao buscar anexos de atestados:', error);
            // Continuar sem anexos se houver erro
          }
        }
        
        // Combinar dados dos atestados com os dados do colaborador, anexos e aprovadores
        return result.data.map(cert => ({
          ...cert,
          employee: employee,
          attachments: attachmentsMap.get(cert.id) || [],
          aprovador: cert.aprovado_por ? approversMap.get(cert.aprovado_por) : undefined
        }));
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
