import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// LOG DE VERSÃO - Se você ver este log, o código novo está carregado
console.log('🆕🆕🆕 [useGestorPortal] CÓDIGO NOVO CARREGADO - Versão com call_schema_rpc', new Date().toISOString());

export interface DashboardStats {
  total_funcionarios: number;
  solicitacoes_pendentes: number;
  ferias_pendentes: number;
  compensacoes_pendentes: number;
  atestados_pendentes: number;
  reembolsos_pendentes: number;
  equipamentos_pendentes: number;
  correcoes_pendentes: number;
}

export interface RecentActivity {
  id: string;
  tipo: string;
  funcionario_nome: string;
  data_solicitacao: string;
  status: string;
  descricao: string;
}

export interface FeriasItem {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dias_solicitados: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'em_andamento' | 'concluido';
  observacoes?: string;
  anexos?: string[];
  solicitado_por: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  saldo_ferias_disponivel: number;
  conflitos?: string[];
  ano_aquisitivo?: number;
  periodo_aquisitivo_inicio?: string;
  periodo_aquisitivo_fim?: string;
}

export interface CompensationRequest {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  tipo_compensacao: string;
  data_solicitacao: string;
  data_compensacao: string;
  quantidade_horas: number; // Corrigido: era horas_solicitadas
  motivo: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'compensado';
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  created_at: string;
  saldo_horas_disponivel: number;
}

export interface MedicalCertificate {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  tipo_atestado: string;
  observacoes?: string;
  anexo_url?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
}

export interface ReimbursementRequest {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  tipo_despesa: string;
  valor: number;
  data_despesa: string;
  descricao: string;
  anexo_url?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago';
  solicitado_por: string;
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
}

export interface EquipmentRental {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  equipamento: string;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'entregue' | 'devolvido';
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
}

export interface AttendanceCorrection {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  data_correcao: string;
  entrada_original: string;
  saida_original: string;
  entrada_corrigida: string;
  saida_corrigida: string;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
}

// Hook para gerenciar férias
export const useVacationRequests = (companyId: string) => {
  const queryClient = useQueryClient();
  const [ferias, setFerias] = useState<FeriasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFerias = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar férias usando EntityService
      const vacationsResult = await EntityService.list({
        schema: 'rh',
        table: 'vacations',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!vacationsResult.data || vacationsResult.data.length === 0) {
        setFerias([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(vacationsResult.data.map(v => v.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nas férias)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      // Buscar períodos aquisitivos para todas as férias
      const employeeIdsForEntitlements = new Set(vacationsResult.data.map(v => v.employee_id).filter(Boolean));
      const entitlementsResult = await EntityService.list({
        schema: 'rh',
        table: 'vacation_entitlements',
        companyId: companyId,
        filters: {}
      });

      // Criar mapa de períodos aquisitivos por employee_id e data_inicio
      const entitlementsMap = new Map<string, any>();
      entitlementsResult.data?.forEach((ent: any) => {
        if (employeeIdsForEntitlements.has(ent.employee_id)) {
          const key = `${ent.employee_id}_${ent.ano_aquisitivo}`;
          if (!entitlementsMap.has(key) || ent.ano_aquisitivo > entitlementsMap.get(key)?.ano_aquisitivo) {
            entitlementsMap.set(key, ent);
          }
        }
      });

      const formattedData = await Promise.all(vacationsResult.data.map(async (item) => {
        const employee = employeeMap.get(item.employee_id);
        
        // Buscar período aquisitivo relacionado às férias
        let periodoAquisitivo: any = null;
        if (item.data_inicio) {
          const employeeEntitlements = entitlementsResult.data?.filter((ent: any) => 
            ent.employee_id === item.employee_id
          ) || [];
          
          // Se a férias já foi aprovada, buscar o período que tem dias_gozados correspondentes
          // ou que foi atualizado próximo à data de aprovação
          if (item.status === 'aprovado' && item.aprovado_em) {
            // Buscar período que tem dias_gozados >= dias_solicitados (indicando que foi usado)
            const periodosComDiasGozados = employeeEntitlements.filter((ent: any) => 
              ent.dias_gozados > 0
            );
            
            if (periodosComDiasGozados.length > 0) {
              // Ordenar por updated_at mais recente (mais provável de ser o período usado)
              periodosComDiasGozados.sort((a: any, b: any) => {
                const dateA = new Date(a.updated_at || 0).getTime();
                const dateB = new Date(b.updated_at || 0).getTime();
                return dateB - dateA;
              });
              
              // Verificar se algum período tem dias_gozados que corresponde aos dias solicitados
              const periodoCorrespondente = periodosComDiasGozados.find((ent: any) => 
                ent.dias_gozados >= item.dias_solicitados
              );
              
              if (periodoCorrespondente) {
                periodoAquisitivo = periodoCorrespondente;
              } else {
                // Se não encontrou correspondência exata, usar o mais recente com dias gozados
                periodoAquisitivo = periodosComDiasGozados[0];
              }
            }
          }
          
          // Se ainda não encontrou, buscar período que contém a data de início
          if (!periodoAquisitivo) {
            const matchingEntitlements = employeeEntitlements.filter((ent: any) => 
              ent.data_inicio_periodo <= item.data_inicio &&
              ent.data_fim_periodo >= item.data_inicio
            );
            
            if (matchingEntitlements.length > 0) {
              periodoAquisitivo = matchingEntitlements[0];
            }
          }
          
          // Se ainda não encontrou, buscar o período mais recente do funcionário
          if (!periodoAquisitivo && employeeEntitlements.length > 0) {
            employeeEntitlements.sort((a: any, b: any) => b.ano_aquisitivo - a.ano_aquisitivo);
            periodoAquisitivo = employeeEntitlements[0];
          }
        }
        
        return {
          id: item.id,
          employee_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          tipo: item.tipo,
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          dias_solicitados: item.dias_solicitados,
          status: item.status,
          observacoes: item.observacoes,
          anexos: item.anexos,
          solicitado_por: item.solicitado_por,
          aprovado_por: item.aprovado_por,
          aprovado_em: item.aprovado_em,
          created_at: item.created_at,
          saldo_ferias_disponivel: 30, // Mock - calcular baseado no banco de horas
          conflitos: [], // Mock - implementar lógica de conflitos
          ano_aquisitivo: periodoAquisitivo?.ano_aquisitivo,
          periodo_aquisitivo_inicio: periodoAquisitivo?.data_inicio_periodo,
          periodo_aquisitivo_fim: periodoAquisitivo?.data_fim_periodo
        };
      }));

      setFerias(formattedData);
    } catch (err) {
      console.error('Erro ao buscar férias:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveVacation = async (vacationId: string, approvedBy: string, observacoes?: string) => {
    console.log('🚀🚀🚀 [approveVacation] FUNÇÃO CHAMADA - NOVO CÓDIGO', {
      vacationId,
      approvedBy,
      observacoes,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🔵 [approveVacation] Iniciando aprovação:', { vacationId, approvedBy, observacoes });
      
      console.log('📞 [approveVacation] Chamando call_schema_rpc...');
      console.log('📋 [approveVacation] Parâmetros que serão enviados:', {
        p_schema_name: 'rh',
        p_function_name: 'aprovar_ferias',
        p_params: {
          p_vacation_id: vacationId,
          p_aprovado_por: approvedBy
        }
      });
      
      // Verificar se a férias existe antes de chamar a função
      const vacationCheck = await EntityService.list({
        schema: 'rh',
        table: 'vacations',
        companyId: companyId,
        filters: { id: vacationId }
      });
      
      console.log('🔍 [approveVacation] Verificação de existência da férias:', {
        found: vacationCheck.data && vacationCheck.data.length > 0,
        vacationData: vacationCheck.data?.[0],
        vacationId
      });
      
      if (!vacationCheck.data || vacationCheck.data.length === 0) {
        throw new Error(`Férias com ID ${vacationId} não encontrada no banco de dados`);
      }
      
      // Usar call_schema_rpc para chamar função do schema rh
      // IMPORTANTE: A ordem dos parâmetros deve ser p_vacation_id, p_aprovado_por
      const rpcParams = {
        p_schema_name: 'rh',
        p_function_name: 'aprovar_ferias',
        p_params: {
          p_vacation_id: vacationId,
          p_aprovado_por: approvedBy
        }
      };
      
      console.log('📤 [approveVacation] Enviando para call_schema_rpc:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error } = await (supabase as any).rpc('call_schema_rpc', rpcParams);

      console.log('📥 [approveVacation] Resposta recebida:', { 
        data, 
        error, 
        hasError: !!error, 
        hasData: !!data,
        dataType: typeof data,
        dataIsObject: typeof data === 'object',
        dataKeys: data ? Object.keys(data) : null,
        dataError: data?.error,
        dataMessage: data?.message,
        dataResult: data?.result,
        dataSql: data?.sql,
        fullData: JSON.stringify(data, null, 2)
      });

      if (error) {
        console.error('❌ [approveVacation] Erro na RPC:', error);
        throw error;
      }

      // call_schema_rpc retorna { result: ... } ou { error: true, message: ... }
      if (data?.error) {
        const errorMessage = data.message || 'Erro ao aprovar férias';
        console.error('❌ [approveVacation] Erro retornado pela função:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ [approveVacation] Aprovação bem-sucedida:', data);

      // Invalidar todas as queries relacionadas a férias
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      
      // Recarregar a lista de férias
      console.log('🔄 [approveVacation] Recarregando lista de férias...');
      await fetchFerias();
      console.log('✅ [approveVacation] Lista recarregada');
    } catch (err) {
      console.error('❌ [approveVacation] Erro ao aprovar férias:', err);
      throw err;
    }
  };

  const rejectVacation = async (vacationId: string, rejectedBy: string, observacoes: string) => {
    try {
      if (!observacoes || observacoes.trim() === '') {
        throw new Error('Observações são obrigatórias para rejeitar uma solicitação.');
      }

      console.log('🔴 [rejectVacation] Iniciando rejeição:', { vacationId, rejectedBy, observacoes });

      // Usar call_schema_rpc para chamar função do schema rh
      const { data, error } = await (supabase as any).rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'rejeitar_ferias',
        p_params: {
          p_vacation_id: vacationId,
          p_aprovado_por: rejectedBy,
          p_motivo_rejeicao: observacoes.trim()
        }
      });

      if (error) {
        console.error('❌ [rejectVacation] Erro na RPC:', error);
        throw error;
      }

      // call_schema_rpc retorna { result: ... } ou { error: true, message: ... }
      if (data?.error) {
        const errorMessage = data.message || 'Erro ao rejeitar férias';
        console.error('❌ [rejectVacation] Erro retornado pela função:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ [rejectVacation] Rejeição bem-sucedida:', data);

      // Invalidar todas as queries relacionadas a férias
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      
      // Recarregar a lista de férias
      await fetchFerias();
    } catch (err) {
      console.error('❌ [rejectVacation] Erro ao rejeitar férias:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchFerias();
    }
  }, [companyId]);

  return { 
    ferias, 
    loading, 
    error, 
    refetch: fetchFerias,
    approveVacation,
    rejectVacation
  };
};

// Hook para gerenciar compensações
export const useCompensationRequests = (companyId: string) => {
  const [compensations, setCompensations] = useState<CompensationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompensations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar compensações usando EntityService
      const compensationsResult = await EntityService.list({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!compensationsResult.data || compensationsResult.data.length === 0) {
        setCompensations([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(compensationsResult.data.map(c => c.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nas compensações)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      const formattedData = compensationsResult.data.map(item => {
        const employee = employeeMap.get(item.employee_id);
        return {
          id: item.id,
          funcionario_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          tipo_compensacao: item.tipo_compensacao,
          data_solicitacao: item.data_solicitacao,
          data_compensacao: item.data_compensacao,
          quantidade_horas: item.quantidade_horas,
          motivo: item.motivo,
          status: item.status,
          aprovado_por: item.aprovado_por,
          data_aprovacao: item.data_aprovacao,
          observacoes: item.observacoes,
          created_at: item.created_at,
          saldo_horas_disponivel: 40 // Mock - calcular baseado no banco de horas
        };
      });

      setCompensations(formattedData);
    } catch (err) {
      console.error('Erro ao buscar compensações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveCompensation = async (compensationId: string, approvedBy: string, observacoes?: string) => {
    try {
      // TODO: Implementar aprovação via RPC function
      console.log('Aprovar compensação:', { compensationId, approvedBy, observacoes });
      await fetchCompensations();
    } catch (err) {
      console.error('Erro ao aprovar compensação:', err);
      throw err;
    }
  };

  const rejectCompensation = async (compensationId: string, rejectedBy: string, observacoes: string) => {
    try {
      // TODO: Implementar rejeição via RPC function
      console.log('Rejeitar compensação:', { compensationId, rejectedBy, observacoes });
      await fetchCompensations();
    } catch (err) {
      console.error('Erro ao rejeitar compensação:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCompensations();
    }
  }, [companyId]);

  return { 
    compensations, 
    loading, 
    error, 
    refetch: fetchCompensations,
    approveCompensation,
    rejectCompensation
  };
};

// Hook para gerenciar atestados médicos
export const useMedicalCertificates = (companyId: string) => {
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar atestados usando EntityService
      const certificatesResult = await EntityService.list({
        schema: 'rh',
        table: 'medical_certificates',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!certificatesResult.data || certificatesResult.data.length === 0) {
        setCertificates([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(certificatesResult.data.map(c => c.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nos atestados)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      const formattedData = certificatesResult.data.map(item => {
        const employee = employeeMap.get(item.employee_id);
        return {
          id: item.id,
          employee_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          dias_afastamento: item.dias_afastamento,
          tipo_atestado: item.tipo_atestado,
          observacoes: item.observacoes,
          anexo_url: item.anexo_url,
          status: item.status,
          aprovado_por: item.aprovado_por,
          aprovado_em: item.aprovado_em,
          created_at: item.created_at
        };
      });

      setCertificates(formattedData);
    } catch (err) {
      console.error('Erro ao buscar atestados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveCertificate = async (certificateId: string, approvedBy: string, observacoes?: string) => {
    try {
      // TODO: Implementar aprovação via RPC function
      console.log('Aprovar atestado:', { certificateId, approvedBy, observacoes });
      await fetchCertificates();
    } catch (err) {
      console.error('Erro ao aprovar atestado:', err);
      throw err;
    }
  };

  const rejectCertificate = async (certificateId: string, rejectedBy: string, observacoes: string) => {
    try {
      // TODO: Implementar rejeição via RPC function
      console.log('Rejeitar atestado:', { certificateId, rejectedBy, observacoes });
      await fetchCertificates();
    } catch (err) {
      console.error('Erro ao rejeitar atestado:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCertificates();
    }
  }, [companyId]);

  return { 
    certificates, 
    loading, 
    error, 
    refetch: fetchCertificates,
    approveCertificate,
    rejectCertificate
  };
};

// Hook para gerenciar reembolsos
export const useReimbursementRequests = (companyId: string) => {
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar reembolsos usando EntityService
      const reimbursementsResult = await EntityService.list({
        schema: 'rh',
        table: 'reimbursement_requests',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!reimbursementsResult.data || reimbursementsResult.data.length === 0) {
        setReimbursements([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(reimbursementsResult.data.map(r => r.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nos reembolsos)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      const formattedData = reimbursementsResult.data.map(item => {
        const employee = employeeMap.get(item.employee_id);
        return {
          id: item.id,
          employee_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          tipo_despesa: item.tipo_despesa,
          valor: item.valor_solicitado || item.valor || 0,
          valor_solicitado: item.valor_solicitado || item.valor || 0,
          data_despesa: item.data_despesa,
          descricao: item.descricao,
          anexo_url: item.comprovante_url || item.anexo_url,
          status: item.status,
          solicitado_por: item.solicitado_por,
          aprovado_por: item.aprovado_por,
          aprovado_em: item.aprovado_em,
          observacoes: item.observacoes,
          created_at: item.created_at
        };
      });

      setReimbursements(formattedData);
    } catch (err) {
      console.error('Erro ao buscar reembolsos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveReimbursement = async (reimbursementId: string, approvedBy: string, observacoes?: string) => {
    try {
      // TODO: Implementar aprovação via RPC function
      console.log('Aprovar reembolso:', { reimbursementId, approvedBy, observacoes });
      await fetchReimbursements();
    } catch (err) {
      console.error('Erro ao aprovar reembolso:', err);
      throw err;
    }
  };

  const rejectReimbursement = async (reimbursementId: string, rejectedBy: string, observacoes: string) => {
    try {
      // TODO: Implementar rejeição via RPC function
      console.log('Rejeitar reembolso:', { reimbursementId, rejectedBy, observacoes });
      await fetchReimbursements();
    } catch (err) {
      console.error('Erro ao rejeitar reembolso:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchReimbursements();
    }
  }, [companyId]);

  return { 
    reimbursements, 
    loading, 
    error, 
    refetch: fetchReimbursements,
    approveReimbursement,
    rejectReimbursement
  };
};

// Hook para gerenciar equipamentos
export const useEquipmentRentals = (companyId: string) => {
  const [equipments, setEquipments] = useState<EquipmentRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar equipamentos usando EntityService
      const equipmentsResult = await EntityService.list({
        schema: 'rh',
        table: 'equipment_rental_approvals',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!equipmentsResult.data || equipmentsResult.data.length === 0) {
        setEquipments([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(equipmentsResult.data.map(e => e.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nos equipamentos)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      const formattedData = equipmentsResult.data.map(item => {
        const employee = employeeMap.get(item.employee_id);
        return {
          id: item.id,
          employee_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          equipamento: item.equipamento,
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          motivo: item.motivo,
          status: item.status,
          aprovado_por: item.aprovado_por,
          aprovado_em: item.aprovado_em,
          observacoes: item.observacoes,
          created_at: item.created_at
        };
      });

      setEquipments(formattedData);
    } catch (err) {
      console.error('Erro ao buscar equipamentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveEquipment = async (equipmentId: string, approvedBy: string, observacoes?: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_equipment', {
        equipment_id: equipmentId,
        approved_by: approvedBy,
        observacoes: observacoes || null
      });

      if (error) {
        throw error;
      }

      await fetchEquipments();
      return data;
    } catch (err) {
      console.error('Erro ao aprovar equipamento:', err);
      throw err;
    }
  };

  const rejectEquipment = async (equipmentId: string, rejectedBy: string, observacoes: string) => {
    try {
      if (!observacoes || observacoes.trim() === '') {
        throw new Error('Observações são obrigatórias para rejeitar uma solicitação.');
      }

      const { data, error } = await supabase.rpc('reject_equipment', {
        equipment_id: equipmentId,
        rejected_by: rejectedBy,
        observacoes: observacoes
      });

      if (error) {
        throw error;
      }

      await fetchEquipments();
      return data;
    } catch (err) {
      console.error('Erro ao rejeitar equipamento:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchEquipments();
    }
  }, [companyId]);

  return { 
    equipments, 
    loading, 
    error, 
    refetch: fetchEquipments,
    approveEquipment,
    rejectEquipment
  };
};

// Hook para gerenciar correções de ponto
export const useAttendanceCorrections = (companyId: string) => {
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar correções usando EntityService
      const correctionsResult = await EntityService.list({
        schema: 'rh',
        table: 'attendance_corrections',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      if (!correctionsResult.data || correctionsResult.data.length === 0) {
        setCorrections([]);
        return;
      }

      // Buscar todos os funcionários da empresa (EntityService não suporta filtro 'in')
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId
      });
      
      // Filtrar apenas os funcionários necessários
      const employeeIds = new Set(correctionsResult.data.map(c => c.employee_id).filter(Boolean));

      // Mapear funcionários por ID (apenas os que estão nas correções)
      const employeeMap = new Map();
      employeesResult.data?.forEach(emp => {
        if (employeeIds.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        }
      });

      const formattedData = correctionsResult.data.map(item => {
        const employee = employeeMap.get(item.employee_id);
        return {
          id: item.id,
          employee_id: item.employee_id,
          funcionario_nome: employee?.nome || 'N/A',
          funcionario_matricula: employee?.matricula || 'N/A',
          data_correcao: item.data_correcao,
          entrada_original: item.entrada_original,
          saida_original: item.saida_original,
          entrada_corrigida: item.entrada_corrigida,
          saida_corrigida: item.saida_corrigida,
          motivo: item.motivo,
          status: item.status,
          aprovado_por: item.aprovado_por,
          aprovado_em: item.aprovado_em,
          observacoes: item.observacoes,
          created_at: item.created_at
        };
      });

      setCorrections(formattedData);
    } catch (err) {
      console.error('Erro ao buscar correções:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const approveAttendanceCorrection = async (correctionId: string, approvedBy: string, observacoes?: string) => {
    try {
      // TODO: Implementar aprovação via RPC function
      console.log('Aprovar correção:', { correctionId, approvedBy, observacoes });
      await fetchCorrections();
    } catch (err) {
      console.error('Erro ao aprovar correção:', err);
      throw err;
    }
  };

  const rejectAttendanceCorrection = async (correctionId: string, rejectedBy: string, observacoes: string) => {
    try {
      // TODO: Implementar rejeição via RPC function
      console.log('Rejeitar correção:', { correctionId, rejectedBy, observacoes });
      await fetchCorrections();
    } catch (err) {
      console.error('Erro ao rejeitar correção:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCorrections();
    }
  }, [companyId]);

  return { 
    corrections, 
    loading, 
    error, 
    refetch: fetchCorrections,
    approveAttendanceCorrection,
    rejectAttendanceCorrection
  };
};
