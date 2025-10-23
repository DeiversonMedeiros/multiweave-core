import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { toast } from '@/components/ui/use-toast';

interface TrainingCertificate {
  id: string;
  enrollment_id: string;
  data_emissao: string;
  url_certificado?: string;
  hash_verificacao: string;
  nota_final?: number;
  observacoes?: string;
  is_valid: boolean;
  data_validade?: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  enrollment?: {
    id: string;
    training_id: string;
    employee_id: string;
    status: string;
    training?: {
      id: string;
      nome: string;
      data_inicio: string;
      data_fim?: string;
      local?: string;
      carga_horaria: number;
      instrutor?: string;
    };
    employee?: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
      cpf?: string;
    };
  };
}

interface CertificatePayload {
  enrollment_id: string;
  nota_final?: number;
  observacoes?: string;
  data_validade?: string;
}

interface CertificateUpdatePayload {
  nota_final?: number;
  observacoes?: string;
  is_valid?: boolean;
  data_validade?: string;
  url_certificado?: string;
}

export function useCertificate(companyId: string) {
  const queryClient = useQueryClient();

  // Fetch all certificates for a company
  const { data: certificates, isLoading, error } = useQuery<TrainingCertificate[], Error>({
    queryKey: ['certificates', companyId],
    queryFn: async () => {
      const result = await EntityService.list<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId
      });
      return result.data;
    },
    enabled: !!companyId,
  });

  // Fetch certificates for a specific training
  const { data: trainingCertificates, isLoading: isLoadingTraining } = useQuery<TrainingCertificate[], Error>({
    queryKey: ['certificates', 'training'],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Create a new certificate
  const createCertificateMutation = useMutation<TrainingCertificate, Error, CertificatePayload>({
    mutationFn: async (newCertificate) => {
      // Gerar hash de verificação único
      const hashVerificacao = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const certificateData = {
        ...newCertificate,
        data_emissao: new Date().toISOString().split('T')[0],
        hash_verificacao: hashVerificacao,
        is_valid: true
      };

      const data = await EntityService.create<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        data: certificateData
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Certificado emitido com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao emitir certificado: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update an existing certificate
  const updateCertificateMutation = useMutation<TrainingCertificate, Error, { id: string; updates: CertificateUpdatePayload }>({
    mutationFn: async ({ id, updates }) => {
      const data = await EntityService.update<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        id,
        data: updates
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Certificado atualizado com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar certificado: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete a certificate
  const deleteCertificateMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await EntityService.delete({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Certificado excluído com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir certificado: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Generate certificate for enrollment
  const generateCertificate = async (enrollmentId: string, notaFinal?: number, observacoes?: string) => {
    try {
      // Verificar se já existe certificado para esta inscrição
      const existingResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        filters: { enrollment_id: enrollmentId }
      });
      const existingCertificate = existingResult.data[0];

      if (existingCertificate) {
        toast({
          title: 'Aviso',
          description: 'Já existe um certificado para esta inscrição.',
          variant: 'destructive',
        });
        return;
      }

      // Calcular data de validade (2 anos a partir de hoje)
      const dataValidade = new Date();
      dataValidade.setFullYear(dataValidade.getFullYear() + 2);

      const certificateData = {
        enrollment_id: enrollmentId,
        nota_final: notaFinal,
        observacoes: observacoes,
        data_validade: dataValidade.toISOString().split('T')[0]
      };

      createCertificateMutation.mutate(certificateData);
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
    }
  };

  // Validate certificate by hash
  const validateCertificate = async (hash: string) => {
    try {
      const result = await EntityService.list<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        filters: {
          hash_verificacao: hash,
          is_valid: true
        }
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao validar certificado:', error);
      return null;
    }
  };

  // Get certificate statistics
  const getCertificateStats = () => {
    if (!certificates) return null;

    const total = certificates.length;
    const valid = certificates.filter(c => c.is_valid).length;
    const expired = certificates.filter(c => 
      c.data_validade && new Date(c.data_validade) < new Date()
    ).length;
    const withGrade = certificates.filter(c => c.nota_final).length;

    return {
      total,
      valid,
      expired,
      withGrade,
      validPercentage: total > 0 ? Math.round((valid / total) * 100) : 0
    };
  };

  return {
    certificates,
    trainingCertificates,
    isLoading,
    isLoadingTraining,
    error,
    createCertificate: createCertificateMutation.mutate,
    updateCertificate: updateCertificateMutation.mutate,
    deleteCertificate: deleteCertificateMutation.mutate,
    generateCertificate,
    validateCertificate,
    getCertificateStats,
  };
}

// Hook para buscar inscrições elegíveis para certificado
export function useEligibleEnrollments(trainingId: string) {
  const { data: enrollments, isLoading, error } = useQuery({
    queryKey: ['enrollments', 'eligible', trainingId],
    queryFn: async () => {
      // Buscar inscrições aprovadas do treinamento
      const enrollmentsResult = await EntityService.list({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: '', // TODO: pegar companyId do contexto
        filters: {
          training_id: trainingId,
          status: ['aprovado']
        }
      });
      const approvedEnrollments = enrollmentsResult.data;

      // Buscar presenças para calcular percentual
      const attendanceResult = await EntityService.list({
        schema: 'rh',
        table: 'training_attendance',
        companyId: '', // TODO: pegar companyId do contexto
        filters: {
          enrollment_id: approvedEnrollments.map(e => e.id)
        }
      });
      const attendanceRecords = attendanceResult.data;

      // Calcular percentual de presença para cada inscrição
      const enrollmentsWithAttendance = approvedEnrollments?.map(enrollment => {
        const attendance = attendanceRecords?.filter(a => a.enrollment_id === enrollment.id) || [];
        const presentCount = attendance.filter(a => a.presente).length;
        const attendancePercentage = attendance.length > 0 ? 
          Math.round((presentCount / attendance.length) * 100) : 0;

        return {
          ...enrollment,
          attendance_percentage: attendancePercentage,
          is_eligible: attendancePercentage >= 80 // 80% de presença mínima
        };
      }) || [];

      return enrollmentsWithAttendance;
    },
    enabled: !!trainingId,
  });

  return { enrollments, isLoading, error };
}
