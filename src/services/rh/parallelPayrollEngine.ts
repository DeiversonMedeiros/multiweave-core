import { supabase } from '@/integrations/supabase/client';
import { Employee, PayrollConfig, PayrollEvent, Rubrica, InssBracket, IrrfBracket, FgtsConfig } from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface CalculationOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  enableProgressTracking: boolean;
}

export interface CalculationResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  events: PayrollEvent[];
  totalEarnings: number;
  totalDiscounts: number;
  netSalary: number;
  processingTime: number;
  errors: string[];
}

export interface BatchResult {
  batchId: string;
  totalEmployees: number;
  processedEmployees: number;
  successfulEmployees: number;
  failedEmployees: number;
  totalProcessingTime: number;
  results: CalculationResult[];
  errors: string[];
}

export interface ProgressUpdate {
  batchId: string;
  currentEmployee: number;
  totalEmployees: number;
  currentEmployeeName: string;
  currentStep: string;
  progress: number;
  estimatedTimeRemaining: number;
  errors: string[];
}

// =====================================================
// MOTOR DE CÁLCULO PARALELO
// =====================================================

export class ParallelPayrollEngine {
  private static instance: ParallelPayrollEngine;
  private activeBatches: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, (update: ProgressUpdate) => void> = new Map();

  private constructor() {}

  static getInstance(): ParallelPayrollEngine {
    if (!ParallelPayrollEngine.instance) {
      ParallelPayrollEngine.instance = new ParallelPayrollEngine();
    }
    return ParallelPayrollEngine.instance;
  }

  /**
   * Calcula folha de pagamento para múltiplos funcionários em paralelo
   */
  async calculatePayrollBatch(
    employees: Employee[],
    config: PayrollConfig,
    rubricas: Rubrica[],
    inssBrackets: InssBracket[],
    irrfBrackets: IrrfBracket[],
    fgtsConfig: FgtsConfig | null,
    period: { month: number; year: number },
    options: CalculationOptions = {
      batchSize: 50,
      maxConcurrency: 4,
      retryAttempts: 3,
      retryDelay: 1000,
      enableProgressTracking: true
    }
  ): Promise<BatchResult> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    
    this.activeBatches.set(batchId, abortController);

    try {
      const startTime = Date.now();
      const results: CalculationResult[] = [];
      const errors: string[] = [];
      let processedEmployees = 0;
      let successfulEmployees = 0;
      let failedEmployees = 0;

      // Dividir funcionários em lotes
      const batches = this.chunkArray(employees, options.batchSize);
      
      // Processar lotes em paralelo com limite de concorrência
      const semaphore = new Semaphore(options.maxConcurrency);
      
      const batchPromises = batches.map(async (batch, batchIndex) => {
        await semaphore.acquire();
        
        try {
          const batchResults = await this.processBatch(
            batch,
            config,
            rubricas,
            inssBrackets,
            irrfBrackets,
            fgtsConfig,
            period,
            options,
            batchId,
            batchIndex,
            employees.length
          );
          
          results.push(...batchResults.results);
          errors.push(...batchResults.errors);
          
          processedEmployees += batch.length;
          successfulEmployees += batchResults.results.filter(r => r.success).length;
          failedEmployees += batchResults.results.filter(r => !r.success).length;
          
          // Atualizar progresso
          if (options.enableProgressTracking) {
            this.updateProgress(batchId, {
              batchId,
              currentEmployee: processedEmployees,
              totalEmployees: employees.length,
              currentEmployeeName: batch[batch.length - 1]?.nome || '',
              currentStep: 'Processando funcionários',
              progress: Math.round((processedEmployees / employees.length) * 100),
              estimatedTimeRemaining: this.calculateEstimatedTime(
                processedEmployees,
                employees.length,
                startTime
              ),
              errors: errors.slice(-10) // Últimos 10 erros
            });
          }
          
        } finally {
          semaphore.release();
        }
      });

      await Promise.all(batchPromises);

      const totalProcessingTime = Date.now() - startTime;

      // Limpar batch ativo
      this.activeBatches.delete(batchId);
      this.progressCallbacks.delete(batchId);

      return {
        batchId,
        totalEmployees: employees.length,
        processedEmployees,
        successfulEmployees,
        failedEmployees,
        totalProcessingTime,
        results,
        errors
      };

    } catch (error) {
      // Limpar batch ativo em caso de erro
      this.activeBatches.delete(batchId);
      this.progressCallbacks.delete(batchId);
      
      throw error;
    }
  }

  /**
   * Processa um lote de funcionários
   */
  private async processBatch(
    employees: Employee[],
    config: PayrollConfig,
    rubricas: Rubrica[],
    inssBrackets: InssBracket[],
    irrfBrackets: IrrfBracket[],
    fgtsConfig: FgtsConfig | null,
    period: { month: number; year: number },
    options: CalculationOptions,
    batchId: string,
    batchIndex: number,
    totalEmployees: number
  ): Promise<{ results: CalculationResult[]; errors: string[] }> {
    const results: CalculationResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      try {
        // Verificar se o batch foi cancelado
        if (this.activeBatches.get(batchId)?.signal.aborted) {
          throw new Error('Batch cancelado');
        }

        const result = await this.calculateEmployeePayroll(
          employee,
          config,
          rubricas,
          inssBrackets,
          irrfBrackets,
          fgtsConfig,
          period,
          options
        );

        results.push(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`Funcionário ${employee.nome}: ${errorMessage}`);
        
        results.push({
          employeeId: employee.id,
          employeeName: employee.nome,
          success: false,
          events: [],
          totalEarnings: 0,
          totalDiscounts: 0,
          netSalary: 0,
          processingTime: 0,
          errors: [errorMessage]
        });
      }
    }

    return { results, errors };
  }

  /**
   * Calcula folha de pagamento para um funcionário
   */
  private async calculateEmployeePayroll(
    employee: Employee,
    config: PayrollConfig,
    rubricas: Rubrica[],
    inssBrackets: InssBracket[],
    irrfBrackets: IrrfBracket[],
    fgtsConfig: FgtsConfig | null,
    period: { month: number; year: number },
    options: CalculationOptions
  ): Promise<CalculationResult> {
    const startTime = Date.now();
    const events: PayrollEvent[] = [];
    const errors: string[] = [];

    try {
      // 1. Salário Base
      const baseSalary = employee.salario_base || 0;
      events.push({
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payroll_id: `payroll_${employee.id}_${period.year}_${period.month}`,
        employee_id: employee.id,
        company_id: employee.company_id,
        rubrica_id: 'salario_base',
        codigo_rubrica: 'SAL_BASE',
        descricao_rubrica: 'Salário Base',
        tipo_rubrica: 'provento',
        quantidade: 1,
        valor_unitario: baseSalary,
        valor_total: baseSalary,
        percentual: 0,
        mes_referencia: period.month,
        ano_referencia: period.year,
        calculado_automaticamente: true,
        origem_evento: 'sistema',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Calcular rubricas ativas
      for (const rubrica of rubricas) {
        if (rubrica.ativo && (rubrica.tipo === 'provento' || rubrica.tipo === 'desconto')) {
          const value = this.calculateRubricaValue(rubrica, employee, config);
          
          if (value !== 0) {
            events.push({
              id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              payroll_id: `payroll_${employee.id}_${period.year}_${period.month}`,
              employee_id: employee.id,
              company_id: employee.company_id,
              rubrica_id: rubrica.id,
              codigo_rubrica: rubrica.codigo,
              descricao_rubrica: rubrica.nome,
              tipo_rubrica: rubrica.tipo,
              quantidade: 1,
              valor_unitario: value,
              valor_total: value,
              percentual: rubrica.percentual || 0,
              mes_referencia: period.month,
              ano_referencia: period.year,
              calculado_automaticamente: true,
              origem_evento: 'sistema',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      // 3. Calcular impostos
      const totalEarnings = events
        .filter(e => e.tipo_rubrica === 'provento')
        .reduce((sum, e) => sum + e.valor_total, 0);

      // INSS
      if (config.aplicar_inss) {
        const inssValue = this.calculateINSS(totalEarnings, inssBrackets);
        if (inssValue > 0) {
          events.push({
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payroll_id: `payroll_${employee.id}_${period.year}_${period.month}`,
            employee_id: employee.id,
            company_id: employee.company_id,
            rubrica_id: 'inss',
            codigo_rubrica: 'INSS',
            descricao_rubrica: 'INSS',
            tipo_rubrica: 'desconto',
            quantidade: 1,
            valor_unitario: inssValue,
            valor_total: inssValue,
            percentual: 0,
            mes_referencia: period.month,
            ano_referencia: period.year,
            calculado_automaticamente: true,
            origem_evento: 'sistema',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // IRRF
      if (config.aplicar_irrf) {
        const irrfValue = this.calculateIRRF(totalEarnings, irrfBrackets);
        if (irrfValue > 0) {
          events.push({
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payroll_id: `payroll_${employee.id}_${period.year}_${period.month}`,
            employee_id: employee.id,
            company_id: employee.company_id,
            rubrica_id: 'irrf',
            codigo_rubrica: 'IRRF',
            descricao_rubrica: 'IRRF',
            tipo_rubrica: 'desconto',
            quantidade: 1,
            valor_unitario: irrfValue,
            valor_total: irrfValue,
            percentual: 0,
            mes_referencia: period.month,
            ano_referencia: period.year,
            calculado_automaticamente: true,
            origem_evento: 'sistema',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // FGTS
      if (config.aplicar_fgts && fgtsConfig) {
        const fgtsValue = this.calculateFGTS(totalEarnings, fgtsConfig);
        if (fgtsValue > 0) {
          events.push({
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payroll_id: `payroll_${employee.id}_${period.year}_${period.month}`,
            employee_id: employee.id,
            company_id: employee.company_id,
            rubrica_id: 'fgts',
            codigo_rubrica: 'FGTS',
            descricao_rubrica: 'FGTS',
            tipo_rubrica: 'desconto',
            quantidade: 1,
            valor_unitario: fgtsValue,
            valor_total: fgtsValue,
            percentual: 0,
            mes_referencia: period.month,
            ano_referencia: period.year,
            calculado_automaticamente: true,
            origem_evento: 'sistema',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Calcular totais
      const totalDiscounts = events
        .filter(e => e.tipo_rubrica === 'desconto')
        .reduce((sum, e) => sum + e.valor_total, 0);

      const netSalary = totalEarnings - totalDiscounts;

      return {
        employeeId: employee.id,
        employeeName: employee.nome,
        success: true,
        events,
        totalEarnings,
        totalDiscounts,
        netSalary,
        processingTime: Date.now() - startTime,
        errors
      };

    } catch (error) {
      return {
        employeeId: employee.id,
        employeeName: employee.nome,
        success: false,
        events,
        totalEarnings: 0,
        totalDiscounts: 0,
        netSalary: 0,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Calcula valor de uma rubrica
   */
  private calculateRubricaValue(
    rubrica: Rubrica,
    employee: Employee,
    config: PayrollConfig
  ): number {
    let value = 0;

    if (rubrica.tipo === 'provento') {
      if (rubrica.valor_fixo) {
        value = rubrica.valor_fixo;
      } else if (rubrica.percentual && rubrica.percentual > 0) {
        value = (employee.salario_base || 0) * rubrica.percentual;
      }
    } else if (rubrica.tipo === 'desconto') {
      if (rubrica.valor_fixo) {
        value = rubrica.valor_fixo;
      } else if (rubrica.percentual && rubrica.percentual > 0) {
        value = (employee.salario_base || 0) * rubrica.percentual;
      }
    }

    return Math.round(value * 100) / 100; // Arredondar para 2 casas decimais
  }

  /**
   * Calcula INSS
   */
  private calculateINSS(salary: number, brackets: InssBracket[]): number {
    let inss = 0;
    
    for (const bracket of brackets) {
      if (salary > bracket.valor_minimo) {
        const taxableAmount = Math.min(salary - bracket.valor_minimo, bracket.valor_maximo - bracket.valor_minimo);
        inss += taxableAmount * bracket.aliquota;
      }
    }
    
    return Math.round(inss * 100) / 100;
  }

  /**
   * Calcula IRRF
   */
  private calculateIRRF(salary: number, brackets: IrrfBracket[]): number {
    for (const bracket of brackets) {
      if (salary >= bracket.valor_minimo && salary <= bracket.valor_maximo) {
        return Math.round((salary * bracket.aliquota - bracket.deducao) * 100) / 100;
      }
    }
    
    return 0;
  }

  /**
   * Calcula FGTS
   */
  private calculateFGTS(salary: number, config: FgtsConfig): number {
    return Math.round(salary * config.aliquota * 100) / 100;
  }

  /**
   * Cancela um batch em execução
   */
  cancelBatch(batchId: string): boolean {
    const controller = this.activeBatches.get(batchId);
    if (controller) {
      controller.abort();
      this.activeBatches.delete(batchId);
      this.progressCallbacks.delete(batchId);
      return true;
    }
    return false;
  }

  /**
   * Registra callback de progresso
   */
  onProgress(batchId: string, callback: (update: ProgressUpdate) => void): void {
    this.progressCallbacks.set(batchId, callback);
  }

  /**
   * Atualiza progresso
   */
  private updateProgress(batchId: string, update: ProgressUpdate): void {
    const callback = this.progressCallbacks.get(batchId);
    if (callback) {
      callback(update);
    }
  }

  /**
   * Calcula tempo estimado restante
   */
  private calculateEstimatedTime(
    processed: number,
    total: number,
    startTime: number
  ): number {
    if (processed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const rate = processed / elapsed;
    const remaining = total - processed;
    
    return Math.round(remaining / rate);
  }

  /**
   * Divide array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// =====================================================
// SEMÁFORO PARA CONTROLE DE CONCORRÊNCIA
// =====================================================

class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    } else {
      this.permits++;
    }
  }
}
