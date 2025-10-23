import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { toast } from '@/components/ui/use-toast';

interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  data_inscricao: string;
  status: 'inscrito' | 'aprovado' | 'rejeitado' | 'cancelado';
  observacoes?: string;
  justificativa_cancelamento?: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  training?: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim?: string;
    local?: string;
    vagas_totais: number;
    vagas_disponiveis: number;
  };
  employee?: {
    id: string;
    nome: string;
    email: string;
    cargo?: string;
    departamento?: string;
  };
}

interface EnrollmentPayload {
  training_id: string;
  employee_id: string;
  observacoes?: string;
}

interface EnrollmentUpdatePayload {
  status?: 'inscrito' | 'aprovado' | 'rejeitado' | 'cancelado';
  observacoes?: string;
  justificativa_cancelamento?: string;
}

export function useEnrollment(companyId: string) {
  const queryClient = useQueryClient();

  // Fetch all enrollments for a company
  const { data: enrollments, isLoading, error } = useQuery<TrainingEnrollment[], Error>({
    queryKey: ['enrollments', companyId],
    queryFn: async () => {
      const result = await EntityService.list<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId
      });
      return result.data;
    },
    enabled: !!companyId,
  });

  // Fetch enrollments for a specific training
  const { data: trainingEnrollments, isLoading: isLoadingTraining } = useQuery<TrainingEnrollment[], Error>({
    queryKey: ['enrollments', 'training'],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Create a new enrollment
  const createEnrollmentMutation = useMutation<TrainingEnrollment, Error, EnrollmentPayload>({
    mutationFn: async (newEnrollment) => {
      const data = await EntityService.create<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId,
        data: {
          ...newEnrollment,
          data_inscricao: new Date().toISOString().split('T')[0],
          status: 'inscrito'
        }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Inscrição realizada com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao realizar inscrição: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update an existing enrollment
  const updateEnrollmentMutation = useMutation<TrainingEnrollment, Error, { id: string; updates: EnrollmentUpdatePayload }>({
    mutationFn: async ({ id, updates }) => {
      const data = await EntityService.update<TrainingEnrollment>({
        schema: 'rh',
        table: 'training_enrollments',
        companyId,
        id,
        data: updates
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Inscrição atualizada com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar inscrição: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete an enrollment
  const deleteEnrollmentMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await EntityService.delete({
        schema: 'rh',
        table: 'training_enrollments',
        companyId,
        id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', companyId] });
      toast({
        title: 'Sucesso!',
        description: 'Inscrição excluída com sucesso.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir inscrição: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Approve enrollment
  const approveEnrollment = (id: string) => {
    updateEnrollmentMutation.mutate({ id, updates: { status: 'aprovado' } });
  };

  // Reject enrollment
  const rejectEnrollment = (id: string, reason: string) => {
    updateEnrollmentMutation.mutate({ 
      id, 
      updates: { 
        status: 'rejeitado', 
        justificativa_cancelamento: reason 
      } 
    });
  };

  // Cancel enrollment
  const cancelEnrollment = (id: string, reason: string) => {
    updateEnrollmentMutation.mutate({ 
      id, 
      updates: { 
        status: 'cancelado', 
        justificativa_cancelamento: reason 
      } 
    });
  };

  return {
    enrollments,
    trainingEnrollments,
    isLoading,
    isLoadingTraining,
    error,
    createEnrollment: createEnrollmentMutation.mutate,
    updateEnrollment: updateEnrollmentMutation.mutate,
    deleteEnrollment: deleteEnrollmentMutation.mutate,
    approveEnrollment,
    rejectEnrollment,
    cancelEnrollment,
  };
}

// Hook para buscar funcionários disponíveis para inscrição
export function useAvailableEmployees(companyId: string, trainingId?: string) {
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['employees', companyId, 'available', trainingId],
    queryFn: async () => {
      // Buscar funcionários da empresa
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId
      });

      const allEmployees = employeesResult.data;

      // Se trainingId for fornecido, filtrar funcionários já inscritos
      if (trainingId) {
        const enrolledResult = await EntityService.list({
          schema: 'rh',
          table: 'training_enrollments',
          companyId,
          filters: { 
            training_id: trainingId,
            status: ['inscrito', 'aprovado']
          }
        });

        const enrolledIds = enrolledResult.data.map(e => e.employee_id);
        return allEmployees.filter(emp => !enrolledIds.includes(emp.id));
      }

      return allEmployees;
    },
    enabled: !!companyId,
  });

  return { employees, isLoading, error };
}
