import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

export interface Training {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  tipo_treinamento: 'obrigatorio' | 'opcional' | 'compliance' | 'desenvolvimento';
  categoria?: string;
  carga_horaria: number;
  data_inicio: string;
  data_fim: string;
  data_limite_inscricao?: string;
  vagas_totais?: number;
  vagas_disponiveis?: number;
  local?: string;
  modalidade: 'presencial' | 'online' | 'hibrido';
  instrutor?: string;
  instrutor_email?: string;
  instrutor_telefone?: string;
  custo_por_participante?: number;
  requisitos?: string;
  objetivos?: string;
  conteudo_programatico?: string;
  metodologia?: string;
  recursos_necessarios?: string;
  status: 'planejado' | 'inscricoes_abertas' | 'em_andamento' | 'concluido' | 'cancelado';
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  anexos?: string[];
  is_active: boolean;
  permite_avaliacao_reacao?: boolean;
  permite_avaliacao_aplicacao?: boolean;
  tempo_limite_dias?: number;
  permite_pausar?: boolean;
  exige_prova_final?: boolean;
  nota_minima_certificado?: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingEnrollment {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  data_inscricao: string;
  status: 'inscrito' | 'confirmado' | 'presente' | 'ausente' | 'cancelado';
  justificativa_cancelamento?: string;
  observacoes?: string;
  inscrito_por?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingAttendance {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  data_treinamento: string;
  hora_entrada?: string;
  hora_saida?: string;
  presenca: 'presente' | 'ausente' | 'atrasado' | 'saida_antecipada';
  percentual_presenca: number;
  observacoes?: string;
  registrado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingCertificate {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  numero_certificado: string;
  data_emissao: string;
  data_validade?: string;
  status: 'valido' | 'vencido' | 'cancelado';
  nota_final?: number;
  percentual_presenca_final?: number;
  aprovado: boolean;
  observacoes?: string;
  template_certificado?: string;
  arquivo_certificado?: string;
  emitido_por?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingStats {
  total_treinamentos: number;
  treinamentos_concluidos: number;
  total_inscricoes: number;
  total_participantes: number;
  total_certificados: number;
  taxa_aprovacao: number;
  treinamentos_por_categoria?: Record<string, number>;
  treinamentos_por_tipo?: Record<string, number>;
}

export const useTraining = () => {
  const { selectedCompany } = useCompany();
  
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [stats, setStats] = useState<TrainingStats>({
    total_treinamentos: 0,
    treinamentos_concluidos: 0,
    total_inscricoes: 0,
    total_participantes: 0,
    total_certificados: 0,
    taxa_aprovacao: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch trainings
  const fetchTrainings = async (filters?: {
    tipo_treinamento?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }) => {
    if (!selectedCompany?.id) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await EntityService.list<Training>({
        schema: 'rh',
        table: 'trainings',
        companyId: selectedCompany.id,
        skipCompanyFilter: true,
        filters: {
          is_active: true,
          ...filters
        },
        orderBy: 'data_inicio',
        orderDirection: 'DESC'
      });

      setTrainings(result.data);
    } catch (err) {
      console.error('Erro ao carregar treinamentos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar treinamentos');
    } finally {
      setLoading(false);
    }
  };

  // Fetch enrollments
  const fetchEnrollments = async (filters?: {
    training_id?: string;
    employee_id?: string;
    status?: string;
  }) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await EntityService.list<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: selectedCompany.id,
        skipCompanyFilter: true,
        filters: {
          is_active: true,
          ...filters
        },
        orderBy: 'data_inscricao',
        orderDirection: 'DESC'
      });

      setEnrollments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar inscrições');
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance
  const fetchAttendance = async (filters?: {
    training_id?: string;
    employee_id?: string;
    data_treinamento?: string;
  }) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await EntityService.list<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId: selectedCompany.id,
        filters: {
          ...filters
        },
        orderBy: 'data_treinamento',
        orderDirection: 'DESC'
      });

      setAttendance(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar presença');
    } finally {
      setLoading(false);
    }
  };

  // Fetch certificates
  const fetchCertificates = async (filters?: {
    training_id?: string;
    employee_id?: string;
    status?: string;
  }) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await EntityService.list<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId: selectedCompany.id,
        skipCompanyFilter: true,
        filters: {
          ...filters
        },
        orderBy: 'data_emissao',
        orderDirection: 'DESC'
      });

      setCertificates(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async (filters?: {
    data_inicio?: string;
    data_fim?: string;
  }) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Calcular estatísticas manualmente usando os dados existentes
      const trainingsResult = await EntityService.list<Training>({
        schema: 'rh',
        table: 'trainings',
        companyId: selectedCompany.id,
        skipCompanyFilter: true,
        filters: { is_active: true }
      });

      const enrollmentsResult = await EntityService.list<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: selectedCompany.id,
        skipCompanyFilter: true,
        filters: { is_active: true }
      });

      const attendanceResult = await EntityService.list<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId: selectedCompany.id,
        skipCompanyFilter: true
      });

      const certificatesResult = await EntityService.list<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId: selectedCompany.id,
        skipCompanyFilter: true
      });

      const trainings = trainingsResult.data;
      const enrollments = enrollmentsResult.data;
      const attendance = attendanceResult.data;
      const certificates = certificatesResult.data;

      const totalTrainings = trainings.length;
      const completedTrainings = trainings.filter(t => 
        t.data_fim && new Date(t.data_fim) < new Date()
      ).length;
      const totalEnrollments = enrollments.length;
      const totalParticipants = new Set(enrollments.map(e => e.employee_id)).size;
      const totalCertificates = certificates.length;
      const approvedEnrollments = enrollments.filter(e => e.status === 'confirmado').length;
      const taxaAprovacao = totalEnrollments > 0 ? 
        Math.round((approvedEnrollments / totalEnrollments) * 100) : 0;

      setStats({
        total_treinamentos: totalTrainings,
        treinamentos_concluidos: completedTrainings,
        total_inscricoes: totalEnrollments,
        total_participantes: totalParticipants,
        total_certificados: totalCertificates,
        taxa_aprovacao: taxaAprovacao
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  // Create training
  const createTraining = async (trainingData: Omit<Training, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await EntityService.create<Training>({
        schema: 'rh',
        table: 'trainings',
        companyId: selectedCompany.id,
        data: {
          ...trainingData,
          company_id: selectedCompany.id
        }
      });

      setTrainings(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar treinamento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update training
  const updateTraining = async (id: string, updates: Partial<Training>) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await EntityService.update<Training>({
        schema: 'rh',
        table: 'trainings',
        companyId: selectedCompany.id,
        id,
        data: updates
      });

      setTrainings(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar treinamento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete training
  const deleteTraining = async (id: string) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      await EntityService.update({
        schema: 'rh',
        table: 'trainings',
        companyId: selectedCompany.id,
        id,
        data: { is_active: false }
      });

      setTrainings(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir treinamento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enroll employee
  const enrollEmployee = async (trainingId: string, employeeId: string, observacoes?: string) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await EntityService.create<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: selectedCompany.id,
        data: {
          training_id: trainingId,
          employee_id: employeeId,
          data_inscricao: new Date().toISOString().split('T')[0],
          status: 'inscrito',
          observacoes: observacoes,
          is_active: true
        }
      });

      // Refresh enrollments
      await fetchEnrollments();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inscrever funcionário');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cancel enrollment
  const cancelEnrollment = async (enrollmentId: string, justificativa?: string) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      await EntityService.update({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: selectedCompany.id,
        id: enrollmentId,
        data: {
          status: 'cancelado',
          justificativa_cancelamento: justificativa
        }
      });

      // Refresh enrollments
      await fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar inscrição');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register attendance
  const registerAttendance = async (
    trainingId: string,
    employeeId: string,
    dataTreinamento: string,
    presenca: 'presente' | 'ausente' | 'atrasado' | 'saida_antecipada',
    horaEntrada?: string,
    horaSaida?: string,
    observacoes?: string
  ) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await EntityService.create<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId: selectedCompany.id,
        data: {
          training_id: trainingId,
          employee_id: employeeId,
          data_treinamento: dataTreinamento,
          presenca,
          hora_entrada: horaEntrada,
          hora_saida: horaSaida,
          percentual_presenca: presenca === 'presente' ? 100 : 0,
          observacoes
        }
      });

      // Refresh attendance
      await fetchAttendance();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar presença');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate certificate
  const generateCertificate = async (
    trainingId: string,
    employeeId: string,
    notaFinal?: number,
    observacoes?: string
  ) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await EntityService.create<TrainingCertificate>({
        schema: 'rh',
        table: 'training_certificates',
        companyId: selectedCompany.id,
        data: {
          training_id: trainingId,
          employee_id: employeeId,
          numero_certificado: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data_emissao: new Date().toISOString().split('T')[0],
          data_validade: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 anos
          status: 'valido',
          nota_final: notaFinal,
          percentual_presenca_final: 100,
          aprovado: true,
          observacoes
        }
      });

      // Refresh certificates
      await fetchCertificates();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar certificado');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (selectedCompany?.id) {
      fetchTrainings();
      fetchEnrollments();
      fetchAttendance();
      fetchCertificates();
      fetchStats();
    }
  }, [selectedCompany?.id]);

  return {
    // Data
    trainings,
    enrollments,
    attendance,
    certificates,
    stats,
    
    // State
    loading,
    error,
    
    // Actions
    // fetchTrainings, // Removed to prevent manual calls - only useEffect manages this
    fetchEnrollments,
    fetchAttendance,
    fetchCertificates,
    fetchStats,
    createTraining,
    updateTraining,
    deleteTraining,
    enrollEmployee,
    cancelEnrollment,
    registerAttendance,
    generateCertificate
  };
};
