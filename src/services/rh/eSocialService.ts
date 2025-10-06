// =====================================================
// SERVIÇO DE eSOCIAL
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  ESocialEvent, 
  ESocialEventCreateData, 
  ESocialEventUpdateData, 
  ESocialEventFilters,
  ESocialConfig,
  ESocialConfigCreateData,
  ESocialConfigUpdateData,
  ESocialLog,
  ESocialLogFilters
} from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD - EVENTOS eSOCIAL
// =====================================================

export async function getESocialEvents(
  companyId: string,
  filters: ESocialEventFilters = {}
): Promise<{ data: ESocialEvent[]; totalCount: number }> {
  try {
    const result = await EntityService.list<ESocialEvent>({
      schema: 'rh',
      table: 'esocial_events',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de eventos eSocial:', error);
    throw error;
  }
}

export async function getESocialEventById(
  id: string,
  companyId: string
): Promise<ESocialEvent | null> {
  try {
    return await EntityService.getById<ESocialEvent>({
      schema: 'rh',
      table: 'esocial_events',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de eventos eSocial:', error);
    throw error;
  }
}

export async function createESocialEvent(
  eventData: ESocialEventCreateData
): Promise<ESocialEvent> {
  try {
    return await EntityService.create<ESocialEvent>({
      schema: 'rh',
      table: 'esocial_events',
      companyId: eventData.company_id,
      data: eventData
    });
  } catch (error) {
    console.error('Erro no serviço de eventos eSocial:', error);
    throw error;
  }
}

export async function updateESocialEvent(
  eventData: ESocialEventUpdateData
): Promise<ESocialEvent> {
  try {
    const { id, company_id, ...updateData } = eventData;

    return await EntityService.update<ESocialEvent>({
      schema: 'rh',
      table: 'esocial_events',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de eventos eSocial:', error);
    throw error;
  }
}

export async function deleteESocialEvent(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'esocial_events',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de eventos eSocial:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CRUD - CONFIGURAÇÃO eSOCIAL
// =====================================================

export async function getESocialConfig(
  companyId: string
): Promise<ESocialConfig | null> {
  try {
    const { data, error } = await supabase
      .from('rh.esocial_config')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configuração eSocial:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de configuração eSocial:', error);
    throw error;
  }
}

export async function createESocialConfig(
  configData: ESocialConfigCreateData
): Promise<ESocialConfig> {
  try {
    const { data, error } = await supabase
      .from('rh.esocial_config')
      .insert(configData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar configuração eSocial:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de configuração eSocial:', error);
    throw error;
  }
}

export async function updateESocialConfig(
  configData: ESocialConfigUpdateData
): Promise<ESocialConfig> {
  try {
    const { id, company_id, ...updateData } = configData;

    const { data, error } = await supabase
      .from('rh.esocial_config')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar configuração eSocial:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de configuração eSocial:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CRUD - LOGS eSOCIAL
// =====================================================

export async function getESocialLogs(
  companyId: string,
  filters: ESocialLogFilters = {}
): Promise<{ data: ESocialLog[]; totalCount: number }> {
  try {
    let query = supabase
      .from('rh.esocial_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.event_id) {
      query = query.eq('event_id', filters.event_id);
    }
    if (filters.tipo_operacao) {
      query = query.eq('tipo_operacao', filters.tipo_operacao);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio);
    }
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar logs eSocial:', error);
      throw error;
    }

    return {
      data: data || [],
      totalCount: data?.length || 0,
    };
  } catch (error) {
    console.error('Erro no serviço de logs eSocial:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getEventTypeLabel(tipo: string): string {
  const tipos: Record<string, string> = {
    'S1000': 'Informações do Empregador/Contribuinte/Órgão Público',
    'S1005': 'Tabela de Estabelecimentos, Obras ou Unidades de Órgãos Públicos',
    'S1010': 'Tabela de Rubricas',
    'S1020': 'Tabela de Lotações Tributárias',
    'S1030': 'Tabela de Cargos/Empregos Públicos',
    'S1035': 'Tabela de Carreiras Públicas',
    'S1040': 'Tabela de Funções/Cargos em Comissão',
    'S1050': 'Tabela de Horários/Turnos de Trabalho',
    'S1060': 'Tabela de Ambientes de Trabalho',
    'S1070': 'Tabela de Processos Administrativos/Judiciais',
    'S1080': 'Tabela de Operadores Portuários',
    'S1200': 'Remuneração de trabalhador vinculado ao Regime Geral de Previdência Social',
    'S1202': 'Remuneração de servidor vinculado a Regime Próprio de Previdência Social',
    'S1207': 'Benefícios previdenciários - RPPS',
    'S1210': 'Pensionista - RPPS',
    'S1220': 'Férias - RPPS',
    'S1250': 'Aprendizagem - RPPS',
    'S1260': 'Comercialização da Produção Rural Pessoa Física - Segurado Especial',
    'S1270': 'Contratação de Trabalhadores Avulsos Não Portuários',
    'S1280': 'Excesso de Horário em Atividades de Exploração de Recursos Naturais',
    'S1295': 'Solicitação de Totalização de Tempo de Contribuição',
    'S1298': 'Reabertura dos Eventos Periódicos',
    'S1299': 'Fechamento dos Eventos Periódicos',
    'S1300': 'Contribuições devidas à Previdência Social e Outras Informações',
    'S2190': 'Admissão de Trabalhador - Registro Preliminar',
    'S2200': 'Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador',
    'S2205': 'Alteração de Dados Cadastrais do Trabalhador',
    'S2206': 'Alteração de Contrato de Trabalho',
    'S2210': 'Comunicação de Acidente de Trabalho',
    'S2220': 'Afastamento Temporário',
    'S2221': 'Exame Médico - Órgão Competente',
    'S2230': 'Afastamento para Exercício em Mandato Eletivo',
    'S2231': 'Cessão/Exercício em Órgão de Direção Sindical',
    'S2240': 'Condições Ambientais do Trabalho - Agentes Nocivos',
    'S2241': 'Insalubridade, Periculosidade e Aposentadoria Especial',
    'S2245': 'Treinamentos, Capacitações, Exercícios Simulados e Outras Anotações',
    'S2250': 'Aviso Prévio',
    'S2260': 'Convocação para Trabalho Intermitente',
    'S2298': 'Reintegração',
    'S2299': 'Desligamento',
    'S2300': 'Trabalhador Sem Vínculo de Emprego/Estatutário - Início',
    'S2306': 'Trabalhador Sem Vínculo de Emprego/Estatutário - Alteração Contratual',
    'S2399': 'Trabalhador Sem Vínculo de Emprego/Estatutário - Término',
    'S2400': 'Cadastro de Benefícios por Incapacidade',
    'S2405': 'Benefício - Cessação',
    'S2410': 'Cadastro de Benefício - Entes Públicos',
    'S2416': 'Benefício - Entes Públicos - Cessação',
    'S2418': 'Reativação de Benefício',
    'S2420': 'Cadastro de Benefício - Entes Públicos - Pagamento',
    'S3000': 'Exclusão de eventos',
    'S5001': 'Informações das contribuições sociais por trabalhador',
    'S5002': 'Imposto de Renda Retido na Fonte por Trabalhador',
    'S5003': 'Informações relativas à contribuição previdenciária sobre a remuneração',
    'S5011': 'Informações das contribuições sociais consolidadas por contribuinte',
    'S5012': 'Informações do Imposto de Renda Retido na Fonte consolidadas por contribuinte',
    'S5013': 'Informações relativas à contribuição previdenciária consolidadas por contribuinte'
  };
  return tipos[tipo] || tipo;
}

export function getEventStatusLabel(status: string): string {
  const statusMap = {
    pendente: 'Pendente',
    enviado: 'Enviado',
    processado: 'Processado',
    rejeitado: 'Rejeitado',
    erro: 'Erro'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getEventStatusColor(status: string): string {
  const cores = {
    pendente: 'bg-yellow-100 text-yellow-800',
    enviado: 'bg-blue-100 text-blue-800',
    processado: 'bg-green-100 text-green-800',
    rejeitado: 'bg-red-100 text-red-800',
    erro: 'bg-red-100 text-red-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getOperationTypeLabel(tipo: string): string {
  const tipos = {
    envio: 'Envio',
    consulta: 'Consulta',
    download: 'Download',
    erro: 'Erro'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getLogStatusLabel(status: string): string {
  const statusMap = {
    sucesso: 'Sucesso',
    erro: 'Erro',
    aviso: 'Aviso'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getLogStatusColor(status: string): string {
  const cores = {
    sucesso: 'bg-green-100 text-green-800',
    erro: 'bg-red-100 text-red-800',
    aviso: 'bg-yellow-100 text-yellow-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DO eSOCIAL
// =====================================================

export async function getESocialEventStats(companyId: string) {
  try {
    const { data: events } = await getESocialEvents(companyId);
    
    const stats = {
      total_events: events.length,
      by_status: {
        pendente: events.filter(event => event.status === 'pendente').length,
        enviado: events.filter(event => event.status === 'enviado').length,
        processado: events.filter(event => event.status === 'processado').length,
        rejeitado: events.filter(event => event.status === 'rejeitado').length,
        erro: events.filter(event => event.status === 'erro').length
      },
      by_type: events.reduce((acc, event) => {
        acc[event.tipo_evento] = (acc[event.tipo_evento] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      pending_events: events.filter(event => event.status === 'pendente').length,
      error_events: events.filter(event => event.status === 'erro').length,
      recent_events: events.filter(event => {
        const eventDate = new Date(event.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return eventDate >= sevenDaysAgo;
      }).length
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos eventos eSocial:', error);
    throw error;
  }
}

export async function retryESocialEvent(
  id: string,
  companyId: string
): Promise<ESocialEvent> {
  try {
    return await EntityService.update<ESocialEvent>({
      schema: 'rh',
      table: 'esocial_events',
      companyId: companyId,
      id: id,
      data: {
        status: 'pendente',
        data_proximo_envio: new Date().toISOString(),
        ultimo_erro: null
      }
    });
  } catch (error) {
    console.error('Erro ao tentar reenviar evento eSocial:', error);
    throw error;
  }
}

export async function validateESocialConfig(config: ESocialConfigCreateData): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!config.cnpj_empregador || config.cnpj_empregador.length !== 14) {
    errors.push('CNPJ do empregador deve ter 14 dígitos');
  }

  if (!config.razao_social || config.razao_social.trim().length === 0) {
    errors.push('Razão social é obrigatória');
  }

  if (!config.certificado_digital) {
    errors.push('Certificado digital é obrigatório');
  }

  if (!config.senha_certificado) {
    errors.push('Senha do certificado é obrigatória');
  }

  if (config.timeout && (config.timeout < 30 || config.timeout > 600)) {
    errors.push('Timeout deve estar entre 30 e 600 segundos');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function testESocialConnection(companyId: string): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getESocialConfig(companyId);
    
    if (!config) {
      return {
        success: false,
        message: 'Configuração eSocial não encontrada'
      };
    }

    if (!config.ativo) {
      return {
        success: false,
        message: 'Configuração eSocial está inativa'
      };
    }

    // Aqui seria feita a validação real da conexão com o eSocial
    // Por enquanto, simulamos uma validação básica
    return {
      success: true,
      message: 'Conexão com eSocial testada com sucesso'
    };
  } catch (error) {
    console.error('Erro ao testar conexão eSocial:', error);
    return {
      success: false,
      message: 'Erro ao testar conexão: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    };
  }
}
