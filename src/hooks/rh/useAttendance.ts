import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { toast } from '@/components/ui/use-toast';

interface TrainingAttendance {
  id: string;
  enrollment_id: string;
  data_presenca: string;
  presente: boolean;
  tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada?: string;
  hora_saida?: string;
  observacoes?: string;
  responsavel_registro?: string;
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
    };
    employee?: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
    };
  };
}

interface AttendancePayload {
  enrollment_id: string;
  data_presenca: string;
  presente: boolean;
  tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada?: string;
  hora_saida?: string;
  observacoes?: string;
  responsavel_registro?: string;
}

interface AttendanceUpdatePayload {
  presente?: boolean;
  tipo_presenca?: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada?: string;
  hora_saida?: string;
  observacoes?: string;
  responsavel_registro?: string;
}

export function useAttendance(companyId: string) {
  const queryClient = useQueryClient();

  // Fetch all attendance records for a company
  const { data: attendanceRecords, isLoading, error } = useQuery<TrainingAttendance[], Error>({
    queryKey: ['attendance', companyId],
    queryFn: async () => {
      const result = await EntityService.list<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId
      });
      return result.data;
    },
    enabled: !!companyId,
  });

  // Fetch attendance for a specific training
  const { data: trainingAttendance, isLoading: isLoadingTraining } = useQuery<TrainingAttendance[], Error>({
    queryKey: ['attendance', 'training'],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Fetch attendance for a specific date
  const { data: dateAttendance, isLoading: isLoadingDate } = useQuery<TrainingAttendance[], Error>({
    queryKey: ['attendance', 'date'],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Create a new attendance record
  const createAttendanceMutation = useMutation<TrainingAttendance, Error, AttendancePayload>({
    mutationFn: async (newAttendance) => {
      const data = await EntityService.create<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId,
        data: newAttendance
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Presença registrada com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao registrar presença: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update an existing attendance record
  const updateAttendanceMutation = useMutation<TrainingAttendance, Error, { id: string; updates: AttendanceUpdatePayload }>({
    mutationFn: async ({ id, updates }) => {
      const data = await EntityService.update<TrainingAttendance>({
        schema: 'rh',
        table: 'training_attendance',
        companyId,
        id,
        data: updates
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Presença atualizada com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar presença: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete an attendance record
  const deleteAttendanceMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await EntityService.delete({
        schema: 'rh',
        table: 'training_attendance',
        companyId,
        id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Registro de presença excluído com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir presença: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Bulk attendance update for a specific date and training
  const bulkUpdateAttendance = async (
    trainingId: string,
    date: string,
    attendanceData: Array<{
      enrollment_id: string;
      presente: boolean;
      tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
      hora_entrada?: string;
      hora_saida?: string;
      observacoes?: string;
    }>
  ) => {
    try {
      // Primeiro, deletar registros existentes para a data
      const existingRecords = await EntityService.list({
        schema: 'rh',
        table: 'training_attendance',
        companyId,
        filters: { data_presenca: date }
      });

      // Deletar registros existentes
      for (const record of existingRecords.data) {
        await EntityService.delete({
          schema: 'rh',
          table: 'training_attendance',
          companyId,
          id: record.id
        });
      }

      // Inserir novos registros
      for (const data of attendanceData) {
        await EntityService.create({
          schema: 'rh',
          table: 'training_attendance',
          companyId,
          data: {
            ...data,
            data_presenca: date,
            responsavel_registro: 'current_user' // TODO: pegar do contexto de usuário
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['attendance', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Presenças atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar presenças: ${error}`,
        variant: 'destructive',
      });
    }
  };

  return {
    attendanceRecords,
    trainingAttendance,
    dateAttendance,
    isLoading,
    isLoadingTraining,
    isLoadingDate,
    error,
    createAttendance: createAttendanceMutation.mutate,
    updateAttendance: updateAttendanceMutation.mutate,
    deleteAttendance: deleteAttendanceMutation.mutate,
    bulkUpdateAttendance,
  };
}

// Hook para buscar inscrições aprovadas de um treinamento
export function useApprovedEnrollments(trainingId: string) {
  const { data: enrollments, isLoading, error } = useQuery({
    queryKey: ['enrollments', 'approved', trainingId],
    queryFn: async () => {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'training_enrollments',
        companyId: '', // TODO: pegar companyId do contexto
        filters: {
          training_id: trainingId,
          status: ['aprovado', 'inscrito']
        }
      });
      return result.data;
    },
    enabled: !!trainingId,
  });

  return { enrollments, isLoading, error };
}
