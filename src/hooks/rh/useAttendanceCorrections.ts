import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttendanceCorrectionsService, AttendanceCorrectionCreateData, AttendanceCorrectionUpdateData, AttendanceCorrectionFilters } from '@/services/rh/attendanceCorrectionsService';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';

// Hook para listar correções de ponto
export function useAttendanceCorrections(filters: AttendanceCorrectionFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['attendance-corrections', selectedCompany?.id, filters],
    queryFn: () => AttendanceCorrectionsService.list(filters),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para buscar correção por ID
export function useAttendanceCorrection(id: string) {
  return useQuery({
    queryKey: ['attendance-correction', id],
    queryFn: () => AttendanceCorrectionsService.getById(id),
    enabled: !!id,
  });
}

// Hook para buscar correções pendentes
export function usePendingAttendanceCorrections(companyId: string) {
  return useQuery({
    queryKey: ['pending-attendance-corrections', companyId],
    queryFn: () => AttendanceCorrectionsService.getPending(companyId),
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
}

// Hook para buscar correções de um funcionário
export function useEmployeeAttendanceCorrections(employeeId: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['employee-attendance-corrections', employeeId, year, month],
    queryFn: () => AttendanceCorrectionsService.getByEmployee(employeeId, year, month),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para buscar estatísticas de correções
export function useAttendanceCorrectionsStats(companyId: string, filters?: {
  data_inicio?: string;
  data_fim?: string;
  employee_id?: string;
}) {
  return useQuery({
    queryKey: ['attendance-corrections-stats', companyId, filters],
    queryFn: () => AttendanceCorrectionsService.getStats(companyId, filters),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para criar correção
export function useCreateAttendanceCorrection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: AttendanceCorrectionCreateData) => 
      AttendanceCorrectionsService.create(data),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
    },
  });
}

// Hook para atualizar correção
export function useUpdateAttendanceCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AttendanceCorrectionUpdateData }) =>
      AttendanceCorrectionsService.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-correction', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
    },
  });
}

// Hook para aprovar correção
export function useApproveAttendanceCorrection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) =>
      AttendanceCorrectionsService.approve(id, user?.id || '', observacoes),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
    },
  });
}

// Hook para rejeitar correção
export function useRejectAttendanceCorrection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes: string }) =>
      AttendanceCorrectionsService.reject(id, user?.id || '', observacoes),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections-stats'] });
    },
  });
}

// Hook para deletar correção
export function useDeleteAttendanceCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AttendanceCorrectionsService.delete(id),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections-stats'] });
    },
  });
}
