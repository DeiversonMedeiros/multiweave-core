// =====================================================
// SERVIÇO PRINCIPAL DE RECRUTAMENTO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
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
// SERVIÇO DE SOLICITAÇÕES DE VAGAS
// =====================================================

export class JobRequestsService {
  static async list(companyId: string, filters: JobRequestFilters & BaseFilters = {}) {
    return EntityService.list<JobRequest>({
      schema: 'rh',
      table: 'job_requests',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<JobRequest>({
      schema: 'rh',
      table: 'job_requests',
      id,
      companyId
    });
  }

  static async create(data: JobRequestCreateData, companyId: string) {
    return EntityService.create<JobRequest>({
      schema: 'rh',
      table: 'job_requests',
      data,
      companyId
    });
  }

  static async update(id: string, data: JobRequestUpdateData, companyId: string) {
    return EntityService.update<JobRequest>({
      schema: 'rh',
      table: 'job_requests',
      id,
      data,
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'job_requests',
      id,
      companyId
    });
  }

  static async approve(id: string, companyId: string, approvedBy: string) {
    return this.update(id, {
      status: 'aprovado',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    }, companyId);
  }

  static async reject(id: string, companyId: string, approvedBy: string, reason: string) {
    return this.update(id, {
      status: 'reprovado',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason
    }, companyId);
  }
}

// =====================================================
// SERVIÇO DE CANDIDATOS
// =====================================================

export class CandidatesService {
  static async list(companyId: string, filters: CandidateFilters & BaseFilters = {}) {
    return EntityService.list<Candidate>({
      schema: 'rh',
      table: 'candidates',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<Candidate>({
      schema: 'rh',
      table: 'candidates',
      id,
      companyId
    });
  }

  static async create(data: CandidateCreateData, companyId: string) {
    return EntityService.create<Candidate>({
      schema: 'rh',
      table: 'candidates',
      data,
      companyId
    });
  }

  static async update(id: string, data: CandidateUpdateData, companyId: string) {
    return EntityService.update<Candidate>({
      schema: 'rh',
      table: 'candidates',
      id,
      data,
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'candidates',
      id,
      companyId
    });
  }

  static async getByEmail(email: string, companyId: string) {
    const { data, error } = await supabase
      .from('rh.candidates')
      .select('*')
      .eq('company_id', companyId)
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  }

  static async getByCpf(cpf: string, companyId: string) {
    const { data, error } = await supabase
      .from('rh.candidates')
      .select('*')
      .eq('company_id', companyId)
      .eq('cpf', cpf)
      .single();

    if (error) throw error;
    return data;
  }
}

// =====================================================
// SERVIÇO DE VAGAS ABERTAS
// =====================================================

export class JobOpeningsService {
  static async list(companyId: string, filters: JobOpeningFilters & BaseFilters = {}) {
    return EntityService.list<JobOpening>({
      schema: 'rh',
      table: 'job_openings',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<JobOpening>({
      schema: 'rh',
      table: 'job_openings',
      id,
      companyId
    });
  }

  static async create(data: JobOpeningCreateData, companyId: string, createdBy: string) {
    return EntityService.create<JobOpening>({
      schema: 'rh',
      table: 'job_openings',
      data: {
        ...data,
        created_by: createdBy,
        published_at: new Date().toISOString()
      },
      companyId
    });
  }

  static async update(id: string, data: JobOpeningUpdateData, companyId: string) {
    return EntityService.update<JobOpening>({
      schema: 'rh',
      table: 'job_openings',
      id,
      data,
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'job_openings',
      id,
      companyId
    });
  }

  static async publish(id: string, companyId: string) {
    return this.update(id, {
      status: 'aberta',
      published_at: new Date().toISOString()
    }, companyId);
  }

  static async pause(id: string, companyId: string) {
    return this.update(id, {
      status: 'pausada'
    }, companyId);
  }

  static async close(id: string, companyId: string) {
    return this.update(id, {
      status: 'fechada',
      closed_at: new Date().toISOString()
    }, companyId);
  }

  static async fill(id: string, companyId: string) {
    return this.update(id, {
      status: 'preenchida',
      closed_at: new Date().toISOString()
    }, companyId);
  }
}

// =====================================================
// SERVIÇO DE PROCESSOS SELETIVOS
// =====================================================

export class SelectionProcessesService {
  static async list(companyId: string, filters: SelectionProcessFilters & BaseFilters = {}) {
    return EntityService.list<SelectionProcess>({
      schema: 'rh',
      table: 'selection_processes',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<SelectionProcess>({
      schema: 'rh',
      table: 'selection_processes',
      id,
      companyId
    });
  }

  static async create(data: SelectionProcessCreateData, companyId: string, createdBy: string) {
    return EntityService.create<SelectionProcess>({
      schema: 'rh',
      table: 'selection_processes',
      data: {
        ...data,
        created_by: createdBy
      },
      companyId
    });
  }

  static async update(id: string, data: SelectionProcessUpdateData, companyId: string) {
    return EntityService.update<SelectionProcess>({
      schema: 'rh',
      table: 'selection_processes',
      id,
      data,
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'selection_processes',
      id,
      companyId
    });
  }

  static async getCandidatesByJobOpening(jobOpeningId: string, companyId: string) {
    const { data, error } = await supabase
      .rpc('get_candidates_by_job_opening', {
        p_job_opening_id: jobOpeningId
      });

    if (error) throw error;
    return data as CandidateByJobOpening[];
  }

  static async getStages(selectionProcessId: string, companyId: string) {
    const { data, error } = await supabase
      .rpc('get_selection_process_stages', {
        p_selection_process_id: selectionProcessId
      });

    if (error) throw error;
    return data as SelectionProcessStage[];
  }
}

// =====================================================
// SERVIÇO DE ETAPAS DO PROCESSO SELETIVO
// =====================================================

export class SelectionStagesService {
  static async list(companyId: string, selectionProcessId?: string) {
    let query = supabase
      .from('rh.selection_stages')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (selectionProcessId) {
      query = query.eq('selection_process_id', selectionProcessId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SelectionStage[];
  }

  static async getById(id: string, companyId: string) {
    const { data, error } = await supabase
      .from('rh.selection_stages')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data as SelectionStage;
  }

  static async create(data: SelectionStageCreateData, companyId: string) {
    const { data: result, error } = await supabase
      .from('rh.selection_stages')
      .insert({
        ...data,
        company_id: companyId
      })
      .select()
      .single();

    if (error) throw error;
    return result as SelectionStage;
  }

  static async update(id: string, data: SelectionStageUpdateData, companyId: string) {
    const { data: result, error } = await supabase
      .from('rh.selection_stages')
      .update(data)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return result as SelectionStage;
  }

  static async delete(id: string, companyId: string) {
    const { error } = await supabase
      .from('rh.selection_stages')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  }

  static async complete(id: string, companyId: string, score?: number, notes?: string) {
    return this.update(id, {
      status: 'aprovado',
      completed_at: new Date().toISOString(),
      score,
      notes
    }, companyId);
  }

  static async reject(id: string, companyId: string, notes?: string) {
    return this.update(id, {
      status: 'reprovado',
      completed_at: new Date().toISOString(),
      notes
    }, companyId);
  }
}

// =====================================================
// SERVIÇO DE BANCO DE TALENTOS
// =====================================================

export class TalentPoolService {
  static async list(companyId: string, filters: TalentPoolFilters & BaseFilters = {}) {
    return EntityService.list<TalentPool>({
      schema: 'rh',
      table: 'talent_pool',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<TalentPool>({
      schema: 'rh',
      table: 'talent_pool',
      id,
      companyId
    });
  }

  static async create(data: TalentPoolCreateData, companyId: string) {
    return EntityService.create<TalentPool>({
      schema: 'rh',
      table: 'talent_pool',
      data,
      companyId
    });
  }

  static async update(id: string, data: TalentPoolUpdateData, companyId: string) {
    return EntityService.update<TalentPool>({
      schema: 'rh',
      table: 'talent_pool',
      id,
      data,
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'talent_pool',
      id,
      companyId
    });
  }

  static async getByCandidate(candidateId: string, companyId: string) {
    const { data, error } = await supabase
      .from('rh.talent_pool')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data as TalentPool;
  }
}

// =====================================================
// SERVIÇO DE DOCUMENTOS DOS CANDIDATOS
// =====================================================

export class CandidateDocumentsService {
  static async list(companyId: string, filters: CandidateDocumentFilters & BaseFilters = {}) {
    return EntityService.list<CandidateDocument>({
      schema: 'rh',
      table: 'candidate_documents',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getById(id: string, companyId: string) {
    return EntityService.getById<CandidateDocument>({
      schema: 'rh',
      table: 'candidate_documents',
      id,
      companyId
    });
  }

  static async create(data: CandidateDocumentCreateData, companyId: string, uploadedBy: string) {
    return EntityService.create<CandidateDocument>({
      schema: 'rh',
      table: 'candidate_documents',
      data: {
        ...data,
        uploaded_by: uploadedBy
      },
      companyId
    });
  }

  static async delete(id: string, companyId: string) {
    return EntityService.delete({
      schema: 'rh',
      table: 'candidate_documents',
      id,
      companyId
    });
  }

  static async getByCandidate(candidateId: string, companyId: string) {
    const { data, error } = await supabase
      .from('rh.candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CandidateDocument[];
  }
}

// =====================================================
// SERVIÇO DE ESTATÍSTICAS
// =====================================================

export class RecruitmentStatsService {
  static async getStats(companyId: string) {
    const { data, error } = await supabase
      .rpc('get_recruitment_stats', {
        p_company_id: companyId
      });

    if (error) throw error;
    return data as RecruitmentStats;
  }
}

// =====================================================
// SERVIÇO PRINCIPAL DE RECRUTAMENTO
// =====================================================

export class RecruitmentService {
  static jobRequests = JobRequestsService;
  static candidates = CandidatesService;
  static jobOpenings = JobOpeningsService;
  static selectionProcesses = SelectionProcessesService;
  static selectionStages = SelectionStagesService;
  static talentPool = TalentPoolService;
  static candidateDocuments = CandidateDocumentsService;
  static stats = RecruitmentStatsService;
}
