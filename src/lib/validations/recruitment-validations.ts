// =====================================================
// VALIDAÇÕES ZOD PARA SISTEMA DE RECRUTAMENTO
// =====================================================

import { z } from 'zod';

// =====================================================
// VALIDAÇÕES PARA SOLICITAÇÕES DE VAGAS
// =====================================================

export const jobRequestCreateSchema = z.object({
  position_name: z.string()
    .min(1, 'Nome do cargo é obrigatório')
    .max(100, 'Nome do cargo deve ter no máximo 100 caracteres'),
  
  department_name: z.string()
    .max(100, 'Nome do departamento deve ter no máximo 100 caracteres')
    .optional(),
  
  job_description: z.string()
    .min(10, 'Descrição do cargo deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição do cargo deve ter no máximo 2000 caracteres'),
  
  requirements: z.string()
    .max(2000, 'Requisitos devem ter no máximo 2000 caracteres')
    .optional(),
  
  benefits: z.string()
    .max(2000, 'Benefícios devem ter no máximo 2000 caracteres')
    .optional(),
  
  salary_range: z.string()
    .max(100, 'Faixa salarial deve ter no máximo 100 caracteres')
    .optional(),
  
  urgency_level: z.enum(['baixa', 'media', 'alta', 'critica'])
    .default('media'),
  
  expected_start_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsedDate >= today;
    }, 'Data de início esperada deve ser hoje ou no futuro')
});

export const jobRequestUpdateSchema = jobRequestCreateSchema.partial().extend({
  status: z.enum(['solicitado', 'em_analise', 'aprovado', 'reprovado'])
    .optional(),
  
  rejection_reason: z.string()
    .max(500, 'Motivo da rejeição deve ter no máximo 500 caracteres')
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA CANDIDATOS
// =====================================================

export const candidateCreateSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z.string()
    .email('Email deve ter um formato válido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  
  phone: z.string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional(),
  
  cpf: z.string()
    .max(14, 'CPF deve ter no máximo 14 caracteres')
    .optional()
    .refine((cpf) => {
      if (!cpf) return true;
      // Remove caracteres não numéricos
      const cleanCpf = cpf.replace(/\D/g, '');
      // Verifica se tem 11 dígitos
      if (cleanCpf.length !== 11) return false;
      // Verifica se não são todos os dígitos iguais
      if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
      // Validação básica do CPF
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
      }
      let remainder = 11 - (sum % 11);
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
      
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
      }
      remainder = 11 - (sum % 11);
      if (remainder === 10 || remainder === 11) remainder = 0;
      return remainder === parseInt(cleanCpf.charAt(10));
    }, 'CPF inválido'),
  
  birth_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 100);
      return parsedDate >= minDate && parsedDate <= today;
    }, 'Data de nascimento deve ser válida'),
  
  address: z.string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional(),
  
  city: z.string()
    .max(50, 'Cidade deve ter no máximo 50 caracteres')
    .optional(),
  
  state: z.string()
    .max(2, 'Estado deve ter no máximo 2 caracteres')
    .optional(),
  
  zip_code: z.string()
    .max(10, 'CEP deve ter no máximo 10 caracteres')
    .optional(),
  
  linkedin_url: z.string()
    .url('LinkedIn deve ter um formato de URL válido')
    .max(200, 'LinkedIn deve ter no máximo 200 caracteres')
    .optional()
    .refine((url) => {
      if (!url) return true;
      return url.includes('linkedin.com');
    }, 'URL deve ser do LinkedIn'),
  
  portfolio_url: z.string()
    .url('Portfolio deve ter um formato de URL válido')
    .max(200, 'Portfolio deve ter no máximo 200 caracteres')
    .optional(),
  
  source: z.enum(['site', 'linkedin', 'indicacao', 'agencia', 'outro'])
    .default('site'),
  
  notes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
});

export const candidateUpdateSchema = candidateCreateSchema.partial().extend({
  status: z.enum(['ativo', 'inativo', 'contratado', 'descartado'])
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA VAGAS ABERTAS
// =====================================================

export const jobOpeningCreateSchema = z.object({
  job_request_id: z.string()
    .uuid('ID da solicitação deve ser um UUID válido')
    .optional(),
  
  position_name: z.string()
    .min(1, 'Nome do cargo é obrigatório')
    .max(100, 'Nome do cargo deve ter no máximo 100 caracteres'),
  
  department_name: z.string()
    .max(100, 'Nome do departamento deve ter no máximo 100 caracteres')
    .optional(),
  
  job_description: z.string()
    .min(10, 'Descrição do cargo deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição do cargo deve ter no máximo 2000 caracteres'),
  
  requirements: z.string()
    .max(2000, 'Requisitos devem ter no máximo 2000 caracteres')
    .optional(),
  
  benefits: z.string()
    .max(2000, 'Benefícios devem ter no máximo 2000 caracteres')
    .optional(),
  
  salary_range: z.string()
    .max(100, 'Faixa salarial deve ter no máximo 100 caracteres')
    .optional()
});

export const jobOpeningUpdateSchema = jobOpeningCreateSchema.partial().extend({
  status: z.enum(['aberta', 'pausada', 'fechada', 'preenchida'])
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA PROCESSOS SELETIVOS
// =====================================================

export const selectionProcessCreateSchema = z.object({
  job_opening_id: z.string()
    .uuid('ID da vaga deve ser um UUID válido'),
  
  candidate_id: z.string()
    .uuid('ID do candidato deve ser um UUID válido'),
  
  current_stage: z.string()
    .min(1, 'Etapa atual é obrigatória')
    .max(100, 'Etapa atual deve ter no máximo 100 caracteres'),
  
  notes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
});

export const selectionProcessUpdateSchema = selectionProcessCreateSchema.partial().extend({
  status: z.enum(['ativo', 'pausado', 'finalizado', 'cancelado'])
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA ETAPAS DO PROCESSO SELETIVO
// =====================================================

export const selectionStageCreateSchema = z.object({
  selection_process_id: z.string()
    .uuid('ID do processo seletivo deve ser um UUID válido'),
  
  stage_name: z.string()
    .min(1, 'Nome da etapa é obrigatório')
    .max(100, 'Nome da etapa deve ter no máximo 100 caracteres'),
  
  stage_type: z.enum(['triagem', 'entrevista_telefonica', 'entrevista_presencial', 'teste_tecnico', 'entrevista_final', 'aprovacao']),
  
  scheduled_at: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      const today = new Date();
      return parsedDate >= today;
    }, 'Data agendada deve ser hoje ou no futuro'),
  
  interviewer_id: z.string()
    .uuid('ID do entrevistador deve ser um UUID válido')
    .optional(),
  
  notes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
});

export const selectionStageUpdateSchema = selectionStageCreateSchema.partial().extend({
  status: z.enum(['pendente', 'em_andamento', 'aprovado', 'reprovado', 'desistiu'])
    .optional(),
  
  score: z.number()
    .min(0, 'Pontuação deve ser maior ou igual a 0')
    .max(10, 'Pontuação deve ser menor ou igual a 10')
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA BANCO DE TALENTOS
// =====================================================

export const talentPoolCreateSchema = z.object({
  candidate_id: z.string()
    .uuid('ID do candidato deve ser um UUID válido'),
  
  category: z.string()
    .min(1, 'Categoria é obrigatória')
    .max(100, 'Categoria deve ter no máximo 100 caracteres'),
  
  skills: z.array(z.string())
    .max(20, 'Máximo de 20 habilidades')
    .optional(),
  
  experience_level: z.enum(['junior', 'pleno', 'senior', 'especialista'])
    .optional(),
  
  availability: z.enum(['disponivel', 'interessado', 'indisponivel'])
    .default('disponivel'),
  
  notes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
});

export const talentPoolUpdateSchema = talentPoolCreateSchema.partial();

// =====================================================
// VALIDAÇÕES PARA DOCUMENTOS DOS CANDIDATOS
// =====================================================

export const candidateDocumentCreateSchema = z.object({
  candidate_id: z.string()
    .uuid('ID do candidato deve ser um UUID válido'),
  
  document_type: z.enum(['curriculo', 'carteira_identidade', 'cpf', 'comprovante_residencia', 'certificado', 'outro']),
  
  file_name: z.string()
    .min(1, 'Nome do arquivo é obrigatório')
    .max(200, 'Nome do arquivo deve ter no máximo 200 caracteres'),
  
  file_path: z.string()
    .min(1, 'Caminho do arquivo é obrigatório')
    .max(500, 'Caminho do arquivo deve ter no máximo 500 caracteres'),
  
  file_size: z.number()
    .min(1, 'Tamanho do arquivo deve ser maior que 0')
    .max(10 * 1024 * 1024, 'Tamanho do arquivo deve ser menor que 10MB')
    .optional(),
  
  mime_type: z.string()
    .max(100, 'Tipo MIME deve ter no máximo 100 caracteres')
    .optional()
});

// =====================================================
// VALIDAÇÕES PARA FILTROS
// =====================================================

export const jobRequestFiltersSchema = z.object({
  status: z.string().optional(),
  urgency_level: z.string().optional(),
  department_name: z.string().optional(),
  requested_by: z.string().optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

export const candidateFiltersSchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

export const jobOpeningFiltersSchema = z.object({
  status: z.string().optional(),
  department_name: z.string().optional(),
  created_by: z.string().optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

export const selectionProcessFiltersSchema = z.object({
  job_opening_id: z.string().optional(),
  candidate_id: z.string().optional(),
  status: z.string().optional(),
  current_stage: z.string().optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

export const talentPoolFiltersSchema = z.object({
  category: z.string().optional(),
  experience_level: z.string().optional(),
  availability: z.string().optional(),
  skills: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

// =====================================================
// TIPOS INFERIDOS
// =====================================================

export type JobRequestCreateData = z.infer<typeof jobRequestCreateSchema>;
export type JobRequestUpdateData = z.infer<typeof jobRequestUpdateSchema>;
export type CandidateCreateData = z.infer<typeof candidateCreateSchema>;
export type CandidateUpdateData = z.infer<typeof candidateUpdateSchema>;
export type JobOpeningCreateData = z.infer<typeof jobOpeningCreateSchema>;
export type JobOpeningUpdateData = z.infer<typeof jobOpeningUpdateSchema>;
export type SelectionProcessCreateData = z.infer<typeof selectionProcessCreateSchema>;
export type SelectionProcessUpdateData = z.infer<typeof selectionProcessUpdateSchema>;
export type SelectionStageCreateData = z.infer<typeof selectionStageCreateSchema>;
export type SelectionStageUpdateData = z.infer<typeof selectionStageUpdateSchema>;
export type TalentPoolCreateData = z.infer<typeof talentPoolCreateSchema>;
export type TalentPoolUpdateData = z.infer<typeof talentPoolUpdateSchema>;
export type CandidateDocumentCreateData = z.infer<typeof candidateDocumentCreateSchema>;
export type JobRequestFilters = z.infer<typeof jobRequestFiltersSchema>;
export type CandidateFilters = z.infer<typeof candidateFiltersSchema>;
export type JobOpeningFilters = z.infer<typeof jobOpeningFiltersSchema>;
export type SelectionProcessFilters = z.infer<typeof selectionProcessFiltersSchema>;
export type TalentPoolFilters = z.infer<typeof talentPoolFiltersSchema>;
