// =====================================================
// HOOKS PERSONALIZADOS PARA SISTEMA DE RECRUTAMENTO
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecruitmentService } from '@/services/rh/recruitmentService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import {
  JobRequest,
  JobRequestCreateData,
  JobRequestUpdateData,
  JobRequestFilters,
  Candidate,
  CandidateCreateData,
  CandidateUpdateData,
  CandidateFilters,
  JobOpening,
  JobOpeningCreateData,
  JobOpeningUpdateData,
  JobOpeningFilters,
  SelectionProcess,
  SelectionProcessCreateData,
  SelectionProcessUpdateData,
  SelectionProcessFilters,
  SelectionStage,
  SelectionStageCreateData,
  SelectionStageUpdateData,
  TalentPool,
  TalentPoolCreateData,
  TalentPoolUpdateData,
  TalentPoolFilters,
  CandidateDocument,
  CandidateDocumentCreateData,
  CandidateDocumentFilters,
  RecruitmentStats,
  CandidateByJobOpening,
  SelectionProcessStage,
  BaseFilters
} from '@/integrations/supabase/recruitment-types';

// =====================================================
// HOOKS PARA SOLICITAÇÕES DE VAGAS
// =====================================================

export const useJobRequests = (filters: JobRequestFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['job-requests', companyId, filters],
    queryFn: () => RecruitmentService.jobRequests.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useJobRequest = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['job-request', id, companyId],
    queryFn: () => RecruitmentService.jobRequests.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateJobRequest = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobRequestCreateData) =>
      RecruitmentService.jobRequests.create(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requests', companyId] });
    }
  });
};

export const useUpdateJobRequest = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobRequestUpdateData }) =>
      RecruitmentService.jobRequests.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['job-request', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['job-requests', companyId] });
    }
  });
};

export const useDeleteJobRequest = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.jobRequests.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requests', companyId] });
    }
  });
};

export const useApproveJobRequest = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      RecruitmentService.jobRequests.approve(id, companyId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requests', companyId] });
    }
  });
};

export const useRejectJobRequest = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      RecruitmentService.jobRequests.reject(id, companyId, user?.id || '', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requests', companyId] });
    }
  });
};

// =====================================================
// HOOKS PARA CANDIDATOS
// =====================================================

export const useCandidates = (filters: CandidateFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['candidates', companyId, filters],
    queryFn: () => RecruitmentService.candidates.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useCandidate = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['candidate', id, companyId],
    queryFn: () => RecruitmentService.candidates.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateCandidate = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CandidateCreateData) =>
      RecruitmentService.candidates.create(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', companyId] });
    }
  });
};

export const useUpdateCandidate = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CandidateUpdateData }) =>
      RecruitmentService.candidates.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['candidates', companyId] });
    }
  });
};

export const useDeleteCandidate = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.candidates.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', companyId] });
    }
  });
};

// =====================================================
// HOOKS PARA VAGAS ABERTAS
// =====================================================

export const useJobOpenings = (filters: JobOpeningFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['job-openings', companyId, filters],
    queryFn: () => RecruitmentService.jobOpenings.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useJobOpening = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['job-opening', id, companyId],
    queryFn: () => RecruitmentService.jobOpenings.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateJobOpening = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobOpeningCreateData) =>
      RecruitmentService.jobOpenings.create(data, companyId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings', companyId] });
    }
  });
};

export const useUpdateJobOpening = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobOpeningUpdateData }) =>
      RecruitmentService.jobOpenings.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['job-opening', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['job-openings', companyId] });
    }
  });
};

export const useDeleteJobOpening = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.jobOpenings.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings', companyId] });
    }
  });
};

// =====================================================
// HOOKS PARA PROCESSOS SELETIVOS
// =====================================================

export const useSelectionProcesses = (filters: SelectionProcessFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['selection-processes', companyId, filters],
    queryFn: () => RecruitmentService.selectionProcesses.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useSelectionProcess = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['selection-process', id, companyId],
    queryFn: () => RecruitmentService.selectionProcesses.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateSelectionProcess = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SelectionProcessCreateData) =>
      RecruitmentService.selectionProcesses.create(data, companyId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-processes', companyId] });
    }
  });
};

export const useUpdateSelectionProcess = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SelectionProcessUpdateData }) =>
      RecruitmentService.selectionProcesses.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['selection-process', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['selection-processes', companyId] });
    }
  });
};

export const useDeleteSelectionProcess = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.selectionProcesses.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-processes', companyId] });
    }
  });
};

export const useCandidatesByJobOpening = (jobOpeningId: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['candidates-by-job-opening', jobOpeningId, companyId],
    queryFn: () => RecruitmentService.selectionProcesses.getCandidatesByJobOpening(jobOpeningId, companyId),
    enabled: !!jobOpeningId && !!companyId
  });
};

export const useSelectionProcessStages = (selectionProcessId: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['selection-process-stages', selectionProcessId, companyId],
    queryFn: () => RecruitmentService.selectionProcesses.getStages(selectionProcessId, companyId),
    enabled: !!selectionProcessId && !!companyId
  });
};

// =====================================================
// HOOKS PARA ETAPAS DO PROCESSO SELETIVO
// =====================================================

export const useSelectionStages = (selectionProcessId?: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['selection-stages', companyId, selectionProcessId],
    queryFn: () => RecruitmentService.selectionStages.list(companyId, selectionProcessId),
    enabled: !!companyId
  });
};

export const useSelectionStage = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['selection-stage', id, companyId],
    queryFn: () => RecruitmentService.selectionStages.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateSelectionStage = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SelectionStageCreateData) =>
      RecruitmentService.selectionStages.create(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-stages', companyId] });
    }
  });
};

export const useUpdateSelectionStage = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SelectionStageUpdateData }) =>
      RecruitmentService.selectionStages.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['selection-stage', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['selection-stages', companyId] });
    }
  });
};

export const useDeleteSelectionStage = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.selectionStages.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selection-stages', companyId] });
    }
  });
};

// =====================================================
// HOOKS PARA BANCO DE TALENTOS
// =====================================================

export const useTalentPool = (filters: TalentPoolFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['talent-pool', companyId, filters],
    queryFn: () => RecruitmentService.talentPool.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useTalentPoolItem = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['talent-pool-item', id, companyId],
    queryFn: () => RecruitmentService.talentPool.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateTalentPoolItem = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TalentPoolCreateData) =>
      RecruitmentService.talentPool.create(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool', companyId] });
    }
  });
};

export const useUpdateTalentPoolItem = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TalentPoolUpdateData }) =>
      RecruitmentService.talentPool.update(id, data, companyId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-item', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool', companyId] });
    }
  });
};

export const useDeleteTalentPoolItem = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.talentPool.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool', companyId] });
    }
  });
};

// =====================================================
// HOOKS PARA DOCUMENTOS DOS CANDIDATOS
// =====================================================

export const useCandidateDocuments = (filters: CandidateDocumentFilters & BaseFilters = {}) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['candidate-documents', companyId, filters],
    queryFn: () => RecruitmentService.candidateDocuments.list(companyId, filters),
    enabled: !!companyId
  });
};

export const useCandidateDocument = (id: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['candidate-document', id, companyId],
    queryFn: () => RecruitmentService.candidateDocuments.getById(id, companyId),
    enabled: !!id && !!companyId
  });
};

export const useCreateCandidateDocument = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CandidateDocumentCreateData) =>
      RecruitmentService.candidateDocuments.create(data, companyId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-documents', companyId] });
    }
  });
};

export const useDeleteCandidateDocument = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RecruitmentService.candidateDocuments.delete(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-documents', companyId] });
    }
  });
};

export const useDocumentsByCandidate = (candidateId: string) => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['documents-by-candidate', candidateId, companyId],
    queryFn: () => RecruitmentService.candidateDocuments.getByCandidate(candidateId, companyId),
    enabled: !!candidateId && !!companyId
  });
};

// =====================================================
// HOOKS PARA ESTATÍSTICAS
// =====================================================

export const useRecruitmentStats = () => {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['recruitment-stats', companyId],
    queryFn: () => RecruitmentService.stats.getStats(companyId),
    enabled: !!companyId
  });
};
