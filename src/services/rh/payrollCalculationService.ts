import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { 
  Payroll, 
  PayrollEvent, 
  CalculationLog, 
  PayrollConfig,
  Employee,
  Rubrica,
  InssBracket,
  IrrfBracket,
  FgtsConfig
} from '@/integrations/supabase/rh-types';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface PayrollCalculationParams {
  companyId: string;
  mesReferencia: number;
  anoReferencia: number;
  funcionariosIds?: string[];
  tipoProcesso?: 'folha_mensal' | 'recalculo' | 'ajuste' | 'simulacao';
  usuarioId?: string;
  usuarioNome?: string;
}

export interface PayrollCalculationResult {
  processoId: string;
  status: 'sucesso' | 'erro';
  totalFuncionarios: number;
  funcionariosProcessados: number;
  eventosCalculados: number;
  errosEncontrados: number;
  tempoExecucao: number;
  logs: string[];
  erros: string[];
  resumo: any;
}

export interface EmployeeCalculationData {
  employee: Employee;
  payroll: Payroll;
  events: PayrollEvent[];
  config: PayrollConfig;
  rubricas: Rubrica[];
  defaultRubricas: Record<string, string>; // Mapa de código -> UUID
  inssBrackets: InssBracket[];
  irrfBrackets: IrrfBracket[];
  fgtsConfig: FgtsConfig | null;
  companyId: string;
  mesReferencia: number;
  anoReferencia: number;
}

// =====================================================
// FUNÇÕES DE CONFIGURAÇÃO
// =====================================================

export async function getPayrollConfig(
  companyId: string,
  mesReferencia: number,
  anoReferencia: number
): Promise<PayrollConfig | null> {
  try {
    // 1. Tentar buscar configuração específica do período
    let result = await EntityService.list<PayrollConfig>({
      schema: 'rh',
      table: 'payroll_config',
      companyId,
      filters: {
        ano_vigencia: anoReferencia,
        mes_vigencia: mesReferencia,
        ativo: true
      },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      pageSize: 1
    });

    if (result.data.length > 0) {
      console.log('✅ [getPayrollConfig] Configuração específica encontrada para', mesReferencia, '/', anoReferencia);
      return result.data[0];
    }

    // 2. Se não encontrar, buscar a configuração mais recente disponível
    console.log('⚠️ [getPayrollConfig] Configuração específica não encontrada, buscando mais recente...');
    result = await EntityService.list<PayrollConfig>({
      schema: 'rh',
      table: 'payroll_config',
      companyId,
      filters: {
        ativo: true
      },
      orderBy: 'ano_vigencia',
      orderDirection: 'DESC',
      pageSize: 1
    });

    if (result.data.length > 0) {
      console.log('✅ [getPayrollConfig] Usando configuração mais recente:', result.data[0].ano_vigencia, '/', result.data[0].mes_vigencia);
      return result.data[0];
    }

    // 3. Se ainda não encontrar, criar uma configuração padrão
    console.log('⚠️ [getPayrollConfig] Nenhuma configuração encontrada, criando configuração padrão...');
    const defaultConfig = await createPayrollConfig(companyId, {
      codigo: `CONFIG_${anoReferencia}_${mesReferencia}`,
      descricao: `Configuração padrão de folha ${mesReferencia}/${anoReferencia}`,
      ativo: true,
      ano_vigencia: anoReferencia,
      mes_vigencia: mesReferencia,
      dias_uteis_mes: 22,
      horas_dia_trabalho: 8.00,
      percentual_hora_extra: 0.5000,
      percentual_hora_noturna: 0.2000,
      percentual_dsr: 0.0455,
      aplicar_inss: true,
      aplicar_irrf: true,
      aplicar_fgts: true,
      aplicar_vale_transporte: true,
      percentual_vale_transporte: 0.0600,
      aplicar_adicional_noturno: true,
      percentual_adicional_noturno: 0.2000,
      aplicar_periculosidade: false,
      percentual_periculosidade: 0.3000,
      aplicar_insalubridade: false,
      grau_insalubridade: 'medio',
      aplicar_ferias_proporcionais: true,
      aplicar_terco_ferias: true,
      aplicar_13_salario: true,
      desconto_faltas: true,
      desconto_atrasos: true,
      tolerancia_atraso_minutos: 5,
      arredondar_centavos: true,
      tipo_arredondamento: 'matematico'
    });

    console.log('✅ [getPayrollConfig] Configuração padrão criada:', defaultConfig.id);
    return defaultConfig;
  } catch (error) {
    console.error('❌ [getPayrollConfig] Erro ao buscar/criar configuração de folha:', error);
    throw error;
  }
}

export async function createPayrollConfig(
  companyId: string,
  config: Omit<PayrollConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<PayrollConfig> {
  try {
    const result = await EntityService.create<PayrollConfig>({
      schema: 'rh',
      table: 'payroll_config',
      companyId,
      data: { ...config, company_id: companyId }
    });

    return result;
  } catch (error) {
    console.error('Erro ao criar configuração de folha:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE LOG DE CÁLCULO
// =====================================================

export async function createCalculationLog(
  companyId: string,
  log: Omit<CalculationLog, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  try {
    // Usar EntityService diretamente (RPC tem problema de tipo UUID vs TEXT)
    // A tabela espera UUID para processo_id, mas o RPC recebe TEXT
    const result = await EntityService.create<CalculationLog>({
      schema: 'rh',
      table: 'calculation_logs',
      companyId: companyId,
      data: {
        ...log,
        company_id: companyId,
        // Garantir que os campos JSONB sejam arrays vazios se não definidos
        logs_execucao: log.logs_execucao || [],
        erros_execucao: log.erros_execucao || [],
        resumo_calculos: log.resumo_calculos || {}
      }
    });

    return result.id;
  } catch (error) {
    console.error('Erro ao criar log de cálculo:', error);
    throw error;
  }
}

export async function updateCalculationLog(
  companyId: string,
  logId: string,
  updates: Partial<CalculationLog>
): Promise<boolean> {
  try {
    const { data: result, error } = await supabase.rpc('update_calculation_log', {
      log_id_param: logId,
      company_id_param: companyId,
      updates: updates
    });

    if (error) {
      console.error('Erro ao atualizar log de cálculo:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Erro ao atualizar log de cálculo:', error);
    throw error;
  }
}

export async function getCalculationLogs(
  companyId: string,
  filters: any = {}
): Promise<{ data: CalculationLog[]; totalCount: number }> {
  try {
    const result = await EntityService.list<CalculationLog>({
      schema: 'rh',
      table: 'calculation_logs',
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
    console.error('Erro ao buscar logs de cálculo:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE FOLHA DE PAGAMENTO
// =====================================================

export async function getPayrolls(
  companyId: string,
  filters: any = {}
): Promise<{ data: Payroll[]; totalCount: number }> {
  try {
    const result = await EntityService.list<Payroll>({
      schema: 'rh',
      table: 'payroll',
      companyId,
      filters,
      orderBy: 'ano_referencia',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro ao buscar folhas de pagamento:', error);
    throw error;
  }
}

export async function createPayroll(
  companyId: string,
  payroll: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>
): Promise<Payroll> {
  try {
    const result = await EntityService.create<Payroll>({
      schema: 'rh',
      table: 'payroll',
      companyId,
      data: { ...payroll, company_id: companyId }
    });

    return result;
  } catch (error) {
    console.error('Erro ao criar folha de pagamento:', error);
    throw error;
  }
}

export async function updatePayroll(
  companyId: string,
  payrollId: string,
  updates: Partial<Payroll>
): Promise<Payroll> {
  try {
    const result = await EntityService.update<Payroll>({
      schema: 'rh',
      table: 'payroll',
      companyId,
      id: payrollId,
      data: updates
    });

    return result;
  } catch (error) {
    console.error('Erro ao atualizar folha de pagamento:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE EVENTOS DE FOLHA
// =====================================================

export async function getPayrollEvents(
  companyId: string,
  payrollId?: string,
  employeeId?: string
): Promise<{ data: PayrollEvent[]; totalCount: number }> {
  try {
    const filters: any = {};
    if (payrollId) filters.payroll_id = payrollId;
    if (employeeId) filters.employee_id = employeeId;

    const result = await EntityService.list<PayrollEvent>({
      schema: 'rh',
      table: 'payroll_events',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'ASC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro ao buscar eventos de folha:', error);
    throw error;
  }
}

export async function createPayrollEvent(
  companyId: string,
  event: Omit<PayrollEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<PayrollEvent> {
  try {
    const result = await EntityService.create<PayrollEvent>({
      schema: 'rh',
      table: 'payroll_events',
      companyId,
      data: { ...event, company_id: companyId }
    });

    return result;
  } catch (error) {
    console.error('Erro ao criar evento de folha:', error);
    throw error;
  }
}

export async function deletePayrollEvents(
  companyId: string,
  payrollId: string
): Promise<void> {
  try {
    // Buscar todos os eventos da folha
    const eventsResult = await getPayrollEvents(companyId, payrollId);
    
    // Deletar cada evento
    for (const event of eventsResult.data) {
      await EntityService.delete({
        schema: 'rh',
        table: 'payroll_events',
        companyId,
        id: event.id
      });
    }
  } catch (error) {
    console.error('Erro ao deletar eventos de folha:', error);
    throw error;
  }
}

// =====================================================
// MOTOR DE CÁLCULO PRINCIPAL
// =====================================================

// Função auxiliar para gerar UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function calculatePayroll(
  params: PayrollCalculationParams
): Promise<PayrollCalculationResult> {
  console.log('🚀 [calculatePayroll] INICIANDO cálculo de folha', {
    companyId: params.companyId,
    mesReferencia: params.mesReferencia,
    anoReferencia: params.anoReferencia,
    tipoProcesso: params.tipoProcesso
  });
  
  const startTime = Date.now();
  // Gerar UUID válido para processo_id (a tabela espera UUID, não string)
  const processoId = generateUUID();
  console.log('📝 [calculatePayroll] Processo ID gerado:', processoId);
  
  let calculationLog: CalculationLog | null = null;
  let calculationLogId: string | null = null; // Declarar fora do try para usar no catch
  const logs: string[] = [];
  const erros: string[] = [];
  
  try {
    // 1. Criar log de cálculo (tentar criar, mas não falhar se não conseguir)
    try {
      calculationLogId = await createCalculationLog(params.companyId, {
        processo_id: processoId,
        tipo_processo: params.tipoProcesso || 'folha_mensal',
        descricao_processo: `Cálculo de folha ${params.mesReferencia}/${params.anoReferencia}`,
        mes_referencia: params.mesReferencia,
        ano_referencia: params.anoReferencia,
        status: 'iniciado',
        progresso: 0,
        total_funcionarios: 0,
        funcionarios_processados: 0,
        eventos_calculados: 0,
        erros_encontrados: 0,
        inicio_processamento: new Date().toISOString(),
        usuario_id: params.usuarioId,
        usuario_nome: params.usuarioNome,
        logs_execucao: [],
        erros_execucao: [],
        resumo_calculos: {}
      });
      console.log('✅ [calculatePayroll] Log de cálculo criado:', calculationLogId);
      logs.push('Log de cálculo criado com sucesso');
    } catch (logError: any) {
      // Se não conseguir criar o log, continuar sem ele
      // Não logar erro se for apenas um problema de RPC (já que usamos EntityService diretamente)
      if (logError?.code !== 'P0001' && !logError?.message?.includes('processo_id')) {
        console.warn('⚠️ [calculatePayroll] Não foi possível criar log de cálculo, continuando sem log:', logError);
      }
      logs.push('Aviso: Log de cálculo não foi criado, mas o processamento continuará');
    }

    console.log('📋 [calculatePayroll] Iniciando cálculo de folha', params.mesReferencia, '/', params.anoReferencia);
    logs.push(`Iniciando cálculo de folha ${params.mesReferencia}/${params.anoReferencia}`);

    // 2. Buscar configurações
    console.log('🔍 [calculatePayroll] Buscando configurações de folha...');
    const config = await getPayrollConfig(
      params.companyId, 
      params.mesReferencia, 
      params.anoReferencia
    );

    if (!config) {
      const errorMsg = 'Configuração de folha não encontrada para o período';
      console.error('❌ [calculatePayroll]', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ [calculatePayroll] Configurações de folha carregadas:', config.id);
    logs.push('Configurações de folha carregadas');

    // 3. Buscar funcionários
    console.log('👥 [calculatePayroll] Buscando funcionários ativos...');
    const funcionariosResult = await EntityService.list<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId: params.companyId,
      filters: {
        status: 'ativo',
        ...(params.funcionariosIds && { id: { in: params.funcionariosIds } })
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    const funcionarios = funcionariosResult.data;
    const totalFuncionarios = funcionarios.length;

    console.log(`✅ [calculatePayroll] ${totalFuncionarios} funcionários encontrados`);
    logs.push(`${totalFuncionarios} funcionários encontrados`);

    // Atualizar log com total de funcionários (se o log existir)
    if (calculationLogId) {
      try {
        await updateCalculationLog(params.companyId, calculationLogId, {
          total_funcionarios: totalFuncionarios,
          status: 'processando',
          progresso: 10
        });
      } catch (logError) {
        console.warn('Erro ao atualizar log de cálculo:', logError);
      }
    }

    // 4. Buscar dados necessários para cálculo
    const [rubricasResult, inssResult, irrfResult, fgtsResult] = await Promise.all([
      EntityService.list<Rubrica>({
        schema: 'rh',
        table: 'rubricas',
        companyId: params.companyId,
        filters: { ativo: true }
      }),
      EntityService.list<InssBracket>({
        schema: 'rh',
        table: 'inss_brackets',
        companyId: params.companyId,
        filters: { 
          ativo: true,
          ano_vigencia: params.anoReferencia,
          mes_vigencia: params.mesReferencia
        }
      }),
      EntityService.list<IrrfBracket>({
        schema: 'rh',
        table: 'irrf_brackets',
        companyId: params.companyId,
        filters: { 
          ativo: true,
          ano_vigencia: params.anoReferencia,
          mes_vigencia: params.mesReferencia
        }
      }),
      EntityService.list<FgtsConfig>({
        schema: 'rh',
        table: 'fgts_config',
        companyId: params.companyId,
        filters: { 
          ativo: true,
          ano_vigencia: params.anoReferencia,
          mes_vigencia: params.mesReferencia
        },
        pageSize: 1
      })
    ]);

    const rubricas = rubricasResult.data;
    const inssBrackets = inssResult.data;
    const irrfBrackets = irrfResult.data;
    const fgtsConfig = fgtsResult.data.length > 0 ? fgtsResult.data[0] : null;

    // Buscar ou criar rubricas padrão (SAL_BASE, INSS, IRRF, FGTS)
    console.log('🔍 [calculatePayroll] Buscando rubricas padrão...');
    const defaultRubricas = await getOrCreateDefaultRubricas(params.companyId);
    console.log(`✅ [calculatePayroll] Rubricas padrão carregadas:`, defaultRubricas);

    console.log(`✅ [calculatePayroll] Dados carregados: ${rubricas.length} rubricas, ${inssBrackets.length} faixas INSS, ${irrfBrackets.length} faixas IRRF`);
    logs.push(`Dados carregados: ${rubricas.length} rubricas, ${inssBrackets.length} faixas INSS, ${irrfBrackets.length} faixas IRRF`);

    // 5. Processar cada funcionário
    let funcionariosProcessados = 0;
    let eventosCalculados = 0;

    console.log(`🔄 [calculatePayroll] Iniciando processamento de ${totalFuncionarios} funcionários...`);
    
    for (const funcionario of funcionarios) {
      try {
        console.log(`👤 [calculatePayroll] Processando funcionário ${funcionariosProcessados + 1}/${totalFuncionarios}: ${funcionario.nome} (${funcionario.id})`);
        logs.push(`Processando funcionário: ${funcionario.nome}`);

        // Buscar ou criar folha de pagamento
        console.log(`  📄 [calculatePayroll] Buscando/criando folha de pagamento para ${funcionario.nome}...`);
        let payroll = await getOrCreatePayroll(params.companyId, funcionario.id, params.mesReferencia, params.anoReferencia);
        console.log(`  ✅ [calculatePayroll] Folha encontrada/criada: ${payroll.id}`);
        
        // Deletar eventos existentes
        console.log(`  🗑️ [calculatePayroll] Deletando eventos existentes...`);
        await deletePayrollEvents(params.companyId, payroll.id);
        console.log(`  ✅ [calculatePayroll] Eventos existentes deletados`);

        // Calcular eventos do funcionário
        console.log(`  🧮 [calculatePayroll] Calculando eventos para ${funcionario.nome}...`);
        const eventos = await calculateEmployeeEvents({
          employee: funcionario,
          payroll,
          config,
          rubricas,
          defaultRubricas,
          inssBrackets,
          irrfBrackets,
          fgtsConfig,
          companyId: params.companyId,
          mesReferencia: params.mesReferencia,
          anoReferencia: params.anoReferencia,
          events: [] // Será populado dentro da função
        });
        console.log(`  ✅ [calculatePayroll] ${eventos.length} eventos calculados para ${funcionario.nome}`);

        // Salvar eventos
        console.log(`  💾 [calculatePayroll] Salvando ${eventos.length} eventos...`);
        for (const evento of eventos) {
          await createPayrollEvent(params.companyId, evento);
          eventosCalculados++;
        }
        console.log(`  ✅ [calculatePayroll] ${eventos.length} eventos salvos para ${funcionario.nome}`);

        // Atualizar totais da folha
        const totais = calculatePayrollTotals(eventos);
        await updatePayroll(params.companyId, payroll.id, {
          ...totais,
          status: 'processado'
        });

        funcionariosProcessados++;
        console.log(`  ✅ [calculatePayroll] Funcionário ${funcionario.nome} processado com sucesso (${funcionariosProcessados}/${totalFuncionarios})`);

        // Atualizar progresso (se o log existir)
        if (calculationLogId) {
          try {
            const progresso = Math.round((funcionariosProcessados / totalFuncionarios) * 80) + 10;
            await updateCalculationLog(params.companyId, calculationLogId, {
              funcionarios_processados: funcionariosProcessados,
              eventos_calculados: eventosCalculados,
              progresso
            });
          } catch (logError) {
            console.warn('⚠️ [calculatePayroll] Erro ao atualizar log de cálculo:', logError);
          }
        }

      } catch (error: any) {
        console.error(`❌ [calculatePayroll] Erro ao processar funcionário ${funcionario.nome}:`, error);
        erros.push(`Erro ao processar funcionário ${funcionario.nome}: ${error?.message || error}`);
        logs.push(`ERRO: ${funcionario.nome} - ${error?.message || error}`);
      }
    }
    
    console.log(`✅ [calculatePayroll] Processamento concluído: ${funcionariosProcessados} funcionários processados, ${eventosCalculados} eventos criados`);

    // 6. Finalizar cálculo
    const endTime = Date.now();
    const tempoExecucao = Math.round((endTime - startTime) / 1000);

    // Atualizar log final (se o log existir)
    if (calculationLogId) {
      try {
        await updateCalculationLog(params.companyId, calculationLogId, {
          status: 'concluido',
          progresso: 100,
          fim_processamento: new Date().toISOString(),
          tempo_execucao_segundos: tempoExecucao,
          erros_encontrados: erros.length,
          logs_execucao: logs,
          erros_execucao: erros,
          resumo_calculos: {
            total_funcionarios: totalFuncionarios,
            funcionarios_processados: funcionariosProcessados,
            eventos_calculados: eventosCalculados,
            tempo_execucao_segundos: tempoExecucao
          }
        });
      } catch (logError) {
        console.warn('Erro ao atualizar log de cálculo final:', logError);
      }
    }

    console.log(`🎉 [calculatePayroll] Cálculo concluído em ${tempoExecucao} segundos`);
    console.log(`📊 [calculatePayroll] Resumo: ${funcionariosProcessados}/${totalFuncionarios} funcionários, ${eventosCalculados} eventos, ${erros.length} erros`);
    logs.push(`Cálculo concluído em ${tempoExecucao} segundos`);

    return {
      processoId,
      status: 'sucesso',
      totalFuncionarios,
      funcionariosProcessados,
      eventosCalculados,
      errosEncontrados: erros.length,
      tempoExecucao,
      logs,
      erros,
      resumo: {
        total_funcionarios: totalFuncionarios,
        funcionarios_processados: funcionariosProcessados,
        eventos_calculados: eventosCalculados,
        tempo_execucao_segundos: tempoExecucao
      }
    };

  } catch (error: any) {
    const endTime = Date.now();
    const tempoExecucao = Math.round((endTime - startTime) / 1000);
    
    console.error('❌ [calculatePayroll] ERRO GERAL no cálculo de folha:', error);
    console.error('❌ [calculatePayroll] Stack:', error?.stack);
    console.error('❌ [calculatePayroll] Logs até o erro:', logs);
    console.error('❌ [calculatePayroll] Erros até o erro:', erros);

    if (calculationLogId) {
      try {
        await updateCalculationLog(params.companyId, calculationLogId, {
          status: 'erro',
          fim_processamento: new Date().toISOString(),
          tempo_execucao_segundos: tempoExecucao,
          erros_encontrados: erros.length + 1,
          logs_execucao: logs,
          erros_execucao: [...erros, `ERRO GERAL: ${error?.message || error}`]
        });
      } catch (logError) {
        console.warn('⚠️ [calculatePayroll] Erro ao atualizar log de erro:', logError);
      }
    }

    return {
      processoId,
      status: 'erro',
      totalFuncionarios: 0,
      funcionariosProcessados: 0,
      eventosCalculados: 0,
      errosEncontrados: erros.length + 1,
      tempoExecucao,
      logs,
      erros: [...erros, `ERRO GERAL: ${error?.message || error}`],
      resumo: {}
    };
  }
}

// =====================================================
// FUNÇÕES AUXILIARES DE CÁLCULO
// =====================================================

/**
 * Busca ou cria rubricas padrão necessárias para o cálculo de folha
 * Retorna um mapa de código -> UUID
 */
async function getOrCreateDefaultRubricas(companyId: string): Promise<Record<string, string>> {
  const defaultRubricas: Record<string, string> = {};
  const rubricasPadrao = [
    { codigo: 'SAL_BASE', nome: 'Salário Base', descricao: 'Salário base do funcionário', tipo: 'provento' },
    { codigo: 'INSS', nome: 'INSS', descricao: 'Contribuição INSS', tipo: 'desconto' },
    { codigo: 'IRRF', nome: 'IRRF', descricao: 'Imposto de Renda Retido na Fonte', tipo: 'desconto' },
    { codigo: 'FGTS', nome: 'FGTS', descricao: 'FGTS', tipo: 'desconto' }
  ];

  for (const rubricaPadrao of rubricasPadrao) {
    try {
      // Buscar rubrica existente
      const existingResult = await EntityService.list<Rubrica>({
        schema: 'rh',
        table: 'rubricas',
        companyId,
        filters: { codigo: rubricaPadrao.codigo },
        pageSize: 1
      });

      if (existingResult.data.length > 0) {
        defaultRubricas[rubricaPadrao.codigo] = existingResult.data[0].id;
        console.log(`✅ [getOrCreateDefaultRubricas] Rubrica ${rubricaPadrao.codigo} encontrada: ${existingResult.data[0].id}`);
      } else {
        // Criar rubrica padrão
        const newRubrica = await EntityService.create<Rubrica>({
          schema: 'rh',
          table: 'rubricas',
          companyId,
          data: {
            codigo: rubricaPadrao.codigo,
            nome: rubricaPadrao.nome,
            descricao: rubricaPadrao.descricao,
            tipo: rubricaPadrao.tipo as any,
            ativo: true,
            calculo_automatico: true,
            percentual: 0
          }
        });
        defaultRubricas[rubricaPadrao.codigo] = newRubrica.id;
        console.log(`✅ [getOrCreateDefaultRubricas] Rubrica ${rubricaPadrao.codigo} criada: ${newRubrica.id}`);
      }
    } catch (error) {
      console.error(`❌ [getOrCreateDefaultRubricas] Erro ao buscar/criar rubrica ${rubricaPadrao.codigo}:`, error);
      throw error;
    }
  }

  return defaultRubricas;
}

async function getOrCreatePayroll(
  companyId: string,
  employeeId: string,
  mesReferencia: number,
  anoReferencia: number
): Promise<Payroll> {
  try {
    // Buscar folha existente
    const existingResult = await EntityService.list<Payroll>({
      schema: 'rh',
      table: 'payroll',
      companyId,
      filters: {
        employee_id: employeeId,
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia
      },
      pageSize: 1
    });

    if (existingResult.data.length > 0) {
      return existingResult.data[0];
    }

    // Buscar dados do funcionário
    const employee = await EntityService.getById<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      id: employeeId
    });

    if (!employee) {
      throw new Error('Funcionário não encontrado');
    }

    // Criar nova folha
    return await createPayroll(companyId, {
      employee_id: employeeId,
      mes_referencia: mesReferencia,
      ano_referencia: anoReferencia,
      salario_base: employee.salario_base || 0,
      horas_trabalhadas: 0,
      horas_extras: 0,
      valor_horas_extras: 0,
      total_vencimentos: 0,
      total_descontos: 0,
      salario_liquido: 0,
      status: 'pendente'
    });

  } catch (error) {
    console.error('Erro ao buscar/criar folha de pagamento:', error);
    throw error;
  }
}

async function calculateEmployeeEvents(data: EmployeeCalculationData): Promise<PayrollEvent[]> {
  const eventos: PayrollEvent[] = [];
  const { employee, payroll, config, rubricas, defaultRubricas, companyId } = data;

  // 1. Salário Base
  const salarioBaseRubricaId = defaultRubricas['SAL_BASE'];
  if (!salarioBaseRubricaId) {
    throw new Error('Rubrica SAL_BASE não encontrada');
  }
  
  eventos.push({
    payroll_id: payroll.id,
    employee_id: employee.id,
    rubrica_id: salarioBaseRubricaId,
    codigo_rubrica: 'SAL_BASE',
    descricao_rubrica: 'Salário Base',
    tipo_rubrica: 'provento',
    quantidade: 1,
    valor_unitario: employee.salario_base || 0,
    valor_total: employee.salario_base || 0,
    percentual: 0,
    mes_referencia: data.mesReferencia,
    ano_referencia: data.anoReferencia,
    calculado_automaticamente: true,
    origem_evento: 'sistema'
  });

  // 2. Calcular outras rubricas ativas
  for (const rubrica of rubricas) {
    if (rubrica.tipo === 'provento' || rubrica.tipo === 'desconto') {
      const valor = calculateRubricaValue(rubrica, employee, config);
      
      if (valor !== 0) {
        eventos.push({
          payroll_id: payroll.id,
          employee_id: employee.id,
          rubrica_id: rubrica.id,
          codigo_rubrica: rubrica.codigo,
          descricao_rubrica: rubrica.descricao,
          tipo_rubrica: rubrica.tipo,
          quantidade: rubrica.quantidade || 1,
          valor_unitario: valor,
          valor_total: valor * (rubrica.quantidade || 1),
          percentual: rubrica.percentual || 0,
          mes_referencia: data.mesReferencia,
          ano_referencia: data.anoReferencia,
          calculado_automaticamente: true,
          origem_evento: 'sistema'
        });
      }
    }
  }

  // 3. Calcular impostos
  if (config.aplicar_inss && data.inssBrackets.length > 0) {
    const inssRubricaId = defaultRubricas['INSS'];
    if (inssRubricaId) {
      const inssValue = calculateINSS(employee.salario_base || 0, data.inssBrackets);
      if (inssValue > 0) {
        eventos.push({
          payroll_id: payroll.id,
          employee_id: employee.id,
          rubrica_id: inssRubricaId,
          codigo_rubrica: 'INSS',
          descricao_rubrica: 'Contribuição INSS',
          tipo_rubrica: 'desconto',
          quantidade: 1,
          valor_unitario: inssValue,
          valor_total: inssValue,
          percentual: 0,
          mes_referencia: data.mesReferencia,
          ano_referencia: data.anoReferencia,
          calculado_automaticamente: true,
          origem_evento: 'sistema'
        });
      }
    } else {
      console.warn('⚠️ [calculateEmployeeEvents] Rubrica INSS não encontrada');
    }
  }

  if (config.aplicar_irrf && data.irrfBrackets.length > 0) {
    const irrfRubricaId = defaultRubricas['IRRF'];
    if (irrfRubricaId) {
      const irrfValue = calculateIRRF(employee.salario_base || 0, data.irrfBrackets);
      if (irrfValue > 0) {
        eventos.push({
          payroll_id: payroll.id,
          employee_id: employee.id,
          rubrica_id: irrfRubricaId,
          codigo_rubrica: 'IRRF',
          descricao_rubrica: 'Imposto de Renda',
          tipo_rubrica: 'desconto',
          quantidade: 1,
          valor_unitario: irrfValue,
          valor_total: irrfValue,
          percentual: 0,
          mes_referencia: data.mesReferencia,
          ano_referencia: data.anoReferencia,
          calculado_automaticamente: true,
          origem_evento: 'sistema'
        });
      }
    } else {
      console.warn('⚠️ [calculateEmployeeEvents] Rubrica IRRF não encontrada');
    }
  }

  if (config.aplicar_fgts) {
    // Buscar contrato ativo do funcionário para obter tipo_contrato
    let tipoContrato: string | null = null;
    try {
      const { getEmploymentContractsByEmployee } = await import('./employmentContractsService');
      const contratos = await getEmploymentContractsByEmployee(employee.id, companyId);
      const contratoAtivo = contratos.find(c => c.status === 'ativo');
      if (contratoAtivo) {
        tipoContrato = contratoAtivo.tipo_contrato;
      }
    } catch (error) {
      console.warn('Erro ao buscar contrato do funcionário para cálculo FGTS:', error);
    }

    // Buscar configuração FGTS específica por tipo de contrato ou usar a geral
    let fgtsConfig = data.fgtsConfig;
    if (tipoContrato && !fgtsConfig?.tipo_contrato) {
      try {
        const { getFgtsConfigByPeriod } = await import('./fgtsConfigService');
        const configEspecifica = await getFgtsConfigByPeriod(
          companyId,
          data.anoReferencia,
          data.mesReferencia,
          tipoContrato
        );
        if (configEspecifica) {
          fgtsConfig = configEspecifica;
        }
      } catch (error) {
        console.warn('Erro ao buscar configuração FGTS específica:', error);
      }
    }

    // Calcular FGTS usando a função atualizada que considera tipo de contrato
    const { calculateFgts } = await import('./fgtsConfigService');
    const fgtsResult = calculateFgts(employee.salario_base || 0, fgtsConfig, tipoContrato);
    
    const fgtsRubricaId = defaultRubricas['FGTS'];
    if (fgtsRubricaId && fgtsResult.fgts > 0) {
      eventos.push({
        payroll_id: payroll.id,
        employee_id: employee.id,
        rubrica_id: fgtsRubricaId,
        codigo_rubrica: 'FGTS',
        descricao_rubrica: `FGTS${tipoContrato === 'Menor Aprendiz' ? ' (Menor Aprendiz - 2%)' : ''}`,
        tipo_rubrica: 'desconto',
        quantidade: 1,
        valor_unitario: fgtsResult.fgts,
        valor_total: fgtsResult.fgts,
        percentual: fgtsResult.aliquot * 100, // Converter para percentual
        mes_referencia: data.mesReferencia,
        ano_referencia: data.anoReferencia,
        calculado_automaticamente: true,
        origem_evento: 'sistema'
      });
    } else if (!fgtsRubricaId) {
      console.warn('⚠️ [calculateEmployeeEvents] Rubrica FGTS não encontrada');
    }
  }

  // 4. Buscar e aplicar deduções pendentes (coparticipação, empréstimos, multas, etc.)
  try {
    const { DeductionsService } = await import('./deductionsService');
    const deducoes = await DeductionsService.getPendingForPayroll(
      companyId,
      employee.id,
      data.mesReferencia,
      data.anoReferencia
    );

    for (const deducao of deducoes) {
      const valorDeducao = deducao.valor_parcela || deducao.valor_total;
      if (valorDeducao > 0) {
        eventos.push({
          payroll_id: payroll.id,
          employee_id: employee.id,
          rubrica_id: deducao.id,
          codigo_rubrica: getDeductionCode(deducao.tipo_deducao),
          descricao_rubrica: deducao.categoria 
            ? `${deducao.categoria}: ${deducao.descricao}`
            : deducao.descricao,
          tipo_rubrica: 'desconto',
          quantidade: 1,
          valor_unitario: valorDeducao,
          valor_total: valorDeducao,
          percentual: 0,
          mes_referencia: data.mesReferencia,
          ano_referencia: data.anoReferencia,
          calculado_automaticamente: true,
          origem_evento: 'sistema',
          observacoes: deducao.numero_parcelas > 1 
            ? `Parcela ${deducao.parcela_atual}/${deducao.numero_parcelas}`
            : undefined
        });
      }
    }
  } catch (error) {
    console.error('Erro ao buscar deduções pendentes:', error);
    // Não falha o cálculo se houver erro ao buscar deduções
  }

  return eventos;
}

function getDeductionCode(tipo: string): string {
  const codes: Record<string, string> = {
    coparticipacao_medica: 'COP_MED',
    emprestimo: 'EMPREST',
    multa: 'MULTA',
    avaria_veiculo: 'AVARIA',
    danos_materiais: 'DANOS',
    adiantamento: 'ADIANT',
    desconto_combinado: 'DESC_COMB',
    outros: 'DESC_OUT'
  };
  return codes[tipo] || 'DESC_OUT';
}

function calculateRubricaValue(
  rubrica: Rubrica,
  employee: Employee,
  config: PayrollConfig
): number {
  let valor = 0;

  if (rubrica.tipo === 'provento') {
    if (rubrica.valor_fixo) {
      valor = rubrica.valor_fixo;
    } else if (rubrica.percentual && rubrica.percentual > 0) {
      valor = (employee.salario_base || 0) * rubrica.percentual;
    }
  } else if (rubrica.tipo === 'desconto') {
    if (rubrica.valor_fixo) {
      valor = rubrica.valor_fixo;
    } else if (rubrica.percentual && rubrica.percentual > 0) {
      valor = (employee.salario_base || 0) * rubrica.percentual;
    }
  }

  return valor;
}

function calculateINSS(salarioBase: number, inssBrackets: InssBracket[]): number {
  const bracket = inssBrackets.find(b => 
    salarioBase >= b.valor_minimo && salarioBase <= b.valor_maximo
  );

  if (!bracket) return 0;

  return salarioBase * bracket.aliquota;
}

function calculateIRRF(salarioBase: number, irrfBrackets: IrrfBracket[]): number {
  const bracket = irrfBrackets.find(b => 
    salarioBase >= b.valor_minimo && salarioBase <= b.valor_maximo
  );

  if (!bracket) return 0;

  return Math.max(0, (salarioBase * bracket.aliquota) - bracket.valor_deducao);
}

// Função mantida para compatibilidade, mas não deve ser usada diretamente
// Use calculateFgts de fgtsConfigService que considera tipo de contrato
function calculateFGTS(salarioBase: number, fgtsConfig: FgtsConfig | null, tipoContrato?: string | null): number {
  if (!fgtsConfig && tipoContrato === 'Menor Aprendiz') {
    return salarioBase * 0.02; // 2% para Menor Aprendiz
  }
  if (!fgtsConfig) {
    return salarioBase * 0.08; // 8% padrão
  }
  return salarioBase * fgtsConfig.aliquota_fgts;
}

function calculatePayrollTotals(eventos: PayrollEvent[]) {
  const totais = {
    total_vencimentos: 0,
    total_descontos: 0,
    salario_liquido: 0
  };

  for (const evento of eventos) {
    if (evento.tipo_rubrica === 'provento') {
      totais.total_vencimentos += evento.valor_total;
    } else if (evento.tipo_rubrica === 'desconto') {
      totais.total_descontos += evento.valor_total;
    }
  }

  totais.salario_liquido = totais.total_vencimentos - totais.total_descontos;

  return totais;
}

// =====================================================
// FUNÇÕES DE FORMATAÇÃO
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}
