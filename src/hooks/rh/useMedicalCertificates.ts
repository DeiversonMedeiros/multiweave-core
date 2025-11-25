import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { MedicalCertificate, MedicalCertificateAttachment } from '@/integrations/supabase/rh-types';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// HOOK PARA ATESTADOS MÉDICOS
// =====================================================

const MEDICAL_CERTIFICATE_KEYS = {
  all: ['medical-certificates'] as const,
  lists: () => [...MEDICAL_CERTIFICATE_KEYS.all, 'list'] as const,
  list: (companyId: string) => [...MEDICAL_CERTIFICATE_KEYS.lists(), companyId] as const,
  details: () => [...MEDICAL_CERTIFICATE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...MEDICAL_CERTIFICATE_KEYS.details(), id] as const,
  byEmployee: (employeeId: string) => [...MEDICAL_CERTIFICATE_KEYS.all, 'employee', employeeId] as const,
  byStatus: (status: string) => [...MEDICAL_CERTIFICATE_KEYS.all, 'status', status] as const,
};

export const useMedicalCertificates = (companyId?: string) => {
  const queryClient = useQueryClient();

  // Query para listar atestados médicos
  const { data: medicalCertificates, isLoading, error, refetch } = useQuery({
    queryKey: MEDICAL_CERTIFICATE_KEYS.list(companyId || ''),
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
      queryKey: MEDICAL_CERTIFICATE_KEYS.byEmployee(employeeId),
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

  // Query para buscar atestados por status
  const useMedicalCertificatesByStatus = (status: string) => {
    return useQuery({
      queryKey: MEDICAL_CERTIFICATE_KEYS.byStatus(status),
      queryFn: async (): Promise<MedicalCertificate[]> => {
        if (!companyId) return [];
        
        const result = await EntityService.list<MedicalCertificate>({
          schema: 'rh',
          table: 'medical_certificates',
          companyId: companyId,
          filters: { status },
          orderBy: 'created_at',
          orderDirection: 'DESC'
        });
        
        return result.data;
      },
      enabled: !!companyId,
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
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Mutation para atualizar atestado médico
  const updateMedicalCertificate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MedicalCertificate> }) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const result = await EntityService.update<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        id: id,
        data: {
          ...data,
          ...(data.data_inicio && data.data_fim && {
            dias_afastamento: calculateAbsenceDays(data.data_inicio, data.data_fim)
          })
        }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Mutation para aprovar atestado médico
  const approveMedicalCertificate = useMutation({
    mutationFn: async ({ id, approvedBy, observacoes }: { 
      id: string; 
      approvedBy: string; 
      observacoes?: string; 
    }) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const result = await EntityService.update<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        id: id,
        data: {
          status: 'aprovado',
          aprovado_por: approvedBy,
          aprovado_em: new Date().toISOString(),
          data_aprovacao: new Date().toISOString(),
          observacoes: observacoes
        }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Mutation para rejeitar atestado médico
  const rejectMedicalCertificate = useMutation({
    mutationFn: async ({ id, rejectedBy, observacoes }: { 
      id: string; 
      rejectedBy: string; 
      observacoes?: string; 
    }) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const result = await EntityService.update<MedicalCertificate>({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        id: id,
        data: {
          status: 'rejeitado',
          aprovado_por: rejectedBy,
          aprovado_em: new Date().toISOString(),
          observacoes: observacoes
        }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Mutation para deletar atestado médico
  const deleteMedicalCertificate = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const result = await EntityService.delete({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        id: id
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Mutation para upload de anexo
  const uploadAttachment = useMutation({
    mutationFn: async ({ 
      certificateId, 
      file, 
      uploadedBy 
    }: { 
      certificateId: string; 
      file: File; 
      uploadedBy: string; 
    }) => {
      const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const uniqueName = `${Date.now()}_${sanitizedOriginalName}`;
      // Estrutura: {company_id}/{certificate_id}/{filename}
      const filePath = `${companyId}/${certificateId}/${uniqueName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-certificates')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      
      if (uploadError) throw uploadError;
      
      const result = await EntityService.create<MedicalCertificateAttachment>({
        schema: 'rh',
        table: 'medical_certificate_attachments',
        companyId: companyId!,
        data: {
          certificate_id: certificateId,
          file_name: file.name,
          file_url: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: uploadedBy
        }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_CERTIFICATE_KEYS.lists() });
    },
  });

  // Função para calcular dias de afastamento
  const calculateAbsenceDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Função para validar atestado médico
  const validateMedicalCertificate = (data: Partial<MedicalCertificate>) => {
    const errors: string[] = [];
    
    if (!data.employee_id) errors.push('Funcionário é obrigatório');
    if (!data.data_inicio) errors.push('Data de início é obrigatória');
    if (!data.data_fim) errors.push('Data de fim é obrigatória');
    if (!data.medico_nome) errors.push('Nome do médico é obrigatório');
    if (!data.crm_crmo) errors.push('CRM/CRMO é obrigatório');
    if (!data.tipo_atestado) errors.push('Tipo do atestado é obrigatório');
    
    if (data.data_inicio && data.data_fim) {
      const startDate = new Date(data.data_inicio);
      const endDate = new Date(data.data_fim);
      const today = new Date();
      
      if (startDate > today) {
        errors.push('Data de início não pode ser futura');
      }
      
      if (endDate < startDate) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
      
      const daysDiff = calculateAbsenceDays(data.data_inicio, data.data_fim);
      if (daysDiff > 365) {
        errors.push('Período de afastamento não pode exceder 365 dias');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
    // Data
    medicalCertificates,
    isLoading,
    error,
    refetch,
    
    // Queries específicas
    useMedicalCertificatesByEmployee,
    useMedicalCertificatesByStatus,
    
    // Mutations
    createMedicalCertificate,
    updateMedicalCertificate,
    deleteMedicalCertificate,
    approveMedicalCertificate,
    rejectMedicalCertificate,
    uploadAttachment,
    
    // Utilitários
    calculateAbsenceDays,
    validateMedicalCertificate,
  };
};
