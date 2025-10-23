// =====================================================
// TIPOS TYPESCRIPT PARA SISTEMA DE RECRUTAMENTO
// =====================================================

// =====================================================
// 1. SOLICITAÇÕES DE VAGAS (JOB REQUESTS)
// =====================================================

export interface JobRequest {
  id: string;
  company_id: string;
  position_name: string;
  department_name?: string;
  job_description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  urgency_level: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'solicitado' | 'em_analise' | 'aprovado' | 'reprovado';
  requested_by: string;
  requested_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  expected_start_date?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface JobRequestCreateData {
  position_name: string;
  department_name?: string;
  job_description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  urgency_level?: 'baixa' | 'media' | 'alta' | 'critica';
  expected_start_date?: string;
}

export interface JobRequestUpdateData {
  position_name?: string;
  department_name?: string;
  job_description?: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  urgency_level?: 'baixa' | 'media' | 'alta' | 'critica';
  status?: 'solicitado' | 'em_analise' | 'aprovado' | 'reprovado';
  expected_start_date?: string;
  rejection_reason?: string;
}

export interface JobRequestFilters {
  status?: string;
  urgency_level?: string;
  department_name?: string;
  requested_by?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// =====================================================
// 2. CANDIDATOS
// =====================================================

export interface Candidate {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  source: 'site' | 'linkedin' | 'indicacao' | 'agencia' | 'outro';
  status: 'ativo' | 'inativo' | 'contratado' | 'descartado';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateCreateData {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  source?: 'site' | 'linkedin' | 'indicacao' | 'agencia' | 'outro';
  notes?: string;
}

export interface CandidateUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  source?: 'site' | 'linkedin' | 'indicacao' | 'agencia' | 'outro';
  status?: 'ativo' | 'inativo' | 'contratado' | 'descartado';
  notes?: string;
}

export interface CandidateFilters {
  status?: string;
  source?: string;
  city?: string;
  state?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// =====================================================
// 3. VAGAS ABERTAS (JOB OPENINGS)
// =====================================================

export interface JobOpening {
  id: string;
  company_id: string;
  job_request_id?: string;
  position_name: string;
  department_name?: string;
  job_description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  status: 'aberta' | 'pausada' | 'fechada' | 'preenchida';
  created_by: string;
  created_by_name?: string;
  published_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobOpeningCreateData {
  job_request_id?: string;
  position_name: string;
  department_name?: string;
  job_description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
}

export interface JobOpeningUpdateData {
  position_name?: string;
  department_name?: string;
  job_description?: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  status?: 'aberta' | 'pausada' | 'fechada' | 'preenchida';
}

export interface JobOpeningFilters {
  status?: string;
  department_name?: string;
  created_by?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// =====================================================
// 4. PROCESSOS SELETIVOS
// =====================================================

export interface SelectionProcess {
  id: string;
  company_id: string;
  job_opening_id: string;
  job_opening_name?: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  current_stage: string;
  status: 'ativo' | 'pausado' | 'finalizado' | 'cancelado';
  started_at: string;
  completed_at?: string;
  created_by: string;
  created_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SelectionProcessCreateData {
  job_opening_id: string;
  candidate_id: string;
  current_stage: string;
  notes?: string;
}

export interface SelectionProcessUpdateData {
  current_stage?: string;
  status?: 'ativo' | 'pausado' | 'finalizado' | 'cancelado';
  notes?: string;
}

export interface SelectionProcessFilters {
  job_opening_id?: string;
  candidate_id?: string;
  status?: string;
  current_stage?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// =====================================================
// 5. ETAPAS DO PROCESSO SELETIVO
// =====================================================

export interface SelectionStage {
  id: string;
  company_id: string;
  selection_process_id: string;
  stage_name: string;
  stage_type: 'triagem' | 'entrevista_telefonica' | 'entrevista_presencial' | 'teste_tecnico' | 'entrevista_final' | 'aprovacao';
  status: 'pendente' | 'em_andamento' | 'aprovado' | 'reprovado' | 'desistiu';
  scheduled_at?: string;
  completed_at?: string;
  interviewer_id?: string;
  interviewer_name?: string;
  score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SelectionStageCreateData {
  selection_process_id: string;
  stage_name: string;
  stage_type: 'triagem' | 'entrevista_telefonica' | 'entrevista_presencial' | 'teste_tecnico' | 'entrevista_final' | 'aprovacao';
  scheduled_at?: string;
  interviewer_id?: string;
  notes?: string;
}

export interface SelectionStageUpdateData {
  stage_name?: string;
  status?: 'pendente' | 'em_andamento' | 'aprovado' | 'reprovado' | 'desistiu';
  scheduled_at?: string;
  completed_at?: string;
  interviewer_id?: string;
  score?: number;
  notes?: string;
}

// =====================================================
// 6. BANCO DE TALENTOS
// =====================================================

export interface TalentPool {
  id: string;
  company_id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  category: string;
  skills?: string[];
  experience_level?: 'junior' | 'pleno' | 'senior' | 'especialista';
  availability: 'disponivel' | 'interessado' | 'indisponivel';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TalentPoolCreateData {
  candidate_id: string;
  category: string;
  skills?: string[];
  experience_level?: 'junior' | 'pleno' | 'senior' | 'especialista';
  availability?: 'disponivel' | 'interessado' | 'indisponivel';
  notes?: string;
}

export interface TalentPoolUpdateData {
  category?: string;
  skills?: string[];
  experience_level?: 'junior' | 'pleno' | 'senior' | 'especialista';
  availability?: 'disponivel' | 'interessado' | 'indisponivel';
  notes?: string;
}

export interface TalentPoolFilters {
  category?: string;
  experience_level?: string;
  availability?: string;
  skills?: string[];
  search?: string;
}

// =====================================================
// 7. DOCUMENTOS DOS CANDIDATOS
// =====================================================

export interface CandidateDocument {
  id: string;
  company_id: string;
  candidate_id: string;
  document_type: 'curriculo' | 'carteira_identidade' | 'cpf' | 'comprovante_residencia' | 'certificado' | 'outro';
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface CandidateDocumentCreateData {
  candidate_id: string;
  document_type: 'curriculo' | 'carteira_identidade' | 'cpf' | 'comprovante_residencia' | 'certificado' | 'outro';
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
}

export interface CandidateDocumentFilters {
  candidate_id?: string;
  document_type?: string;
  uploaded_by?: string;
}

// =====================================================
// 8. ESTATÍSTICAS E RELATÓRIOS
// =====================================================

export interface RecruitmentStats {
  total_job_requests: number;
  pending_job_requests: number;
  approved_job_requests: number;
  total_candidates: number;
  active_candidates: number;
  hired_candidates: number;
  total_job_openings: number;
  open_job_openings: number;
  active_selection_processes: number;
  talent_pool_size: number;
}

export interface CandidateByJobOpening {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_source: string;
  process_status: string;
  current_stage: string;
  applied_at: string;
}

export interface SelectionProcessStage {
  stage_id: string;
  stage_name: string;
  stage_type: string;
  status: string;
  scheduled_at?: string;
  completed_at?: string;
  interviewer_name?: string;
  score?: number;
  notes?: string;
}

// =====================================================
// 9. TIPOS DE VALIDAÇÃO
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ValidationError[];
}

// =====================================================
// 10. FILTROS GENÉRICOS
// =====================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface BaseFilters extends PaginationParams, SortParams {
  search?: string;
  start_date?: string;
  end_date?: string;
}
