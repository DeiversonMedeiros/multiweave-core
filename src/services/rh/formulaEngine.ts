import { Rubrica } from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface CalculationContext {
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  hoursWorked: number;
  overtimeHours: number;
  dependents: number;
  deductions: number;
  period: {
    month: number;
    year: number;
  };
  employee: {
    id: string;
    name: string;
    position: string;
    department: string;
  };
  variables: Record<string, number>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
  dependencies: string[];
}

export interface FormulaResult {
  value: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  steps: string[];
}

// =====================================================
// MOTOR DE FÓRMULAS
// =====================================================

export class FormulaEngine {
  private static instance: FormulaEngine;
  private variables: Map<string, number> = new Map();
  private functions: Map<string, Function> = new Map();

  private constructor() {
    this.initializeBuiltInFunctions();
  }

  static getInstance(): FormulaEngine {
    if (!FormulaEngine.instance) {
      FormulaEngine.instance = new FormulaEngine();
    }
    return FormulaEngine.instance;
  }

  /**
   * Inicializa funções built-in
   */
  private initializeBuiltInFunctions(): void {
    // Funções matemáticas básicas
    this.functions.set('abs', Math.abs);
    this.functions.set('ceil', Math.ceil);
    this.functions.set('floor', Math.floor);
    this.functions.set('round', Math.round);
    this.functions.set('max', Math.max);
    this.functions.set('min', Math.min);
    this.functions.set('sqrt', Math.sqrt);
    this.functions.set('pow', Math.pow);

    // Funções de folha de pagamento
    this.functions.set('salario_base', (ctx: CalculationContext) => ctx.baseSalary);
    this.functions.set('salario_bruto', (ctx: CalculationContext) => ctx.grossSalary);
    this.functions.set('salario_liquido', (ctx: CalculationContext) => ctx.netSalary);
    this.functions.set('horas_trabalhadas', (ctx: CalculationContext) => ctx.hoursWorked);
    this.functions.set('horas_extras', (ctx: CalculationContext) => ctx.overtimeHours);
    this.functions.set('dependentes', (ctx: CalculationContext) => ctx.dependents);
    this.functions.set('descontos', (ctx: CalculationContext) => ctx.deductions);

    // Funções de cálculo de impostos
    this.functions.set('calcular_inss', (salario: number) => this.calculateINSS(salario));
    this.functions.set('calcular_irrf', (salario: number, dependentes: number = 0) => 
      this.calculateIRRF(salario, dependentes));
    this.functions.set('calcular_fgts', (salario: number) => this.calculateFGTS(salario));

    // Funções de data
    this.functions.set('dias_uteis_mes', (ctx: CalculationContext) => this.getWorkingDaysInMonth(ctx.period.month, ctx.period.year));
    this.functions.set('dias_trabalhados', (ctx: CalculationContext) => this.getWorkedDays(ctx));
  }

  /**
   * Avalia uma fórmula
   */
  evaluateFormula(formula: string, context: CalculationContext): FormulaResult {
    const result: FormulaResult = {
      value: 0,
      isValid: false,
      errors: [],
      warnings: [],
      steps: []
    };

    try {
      // Validar fórmula primeiro
      const validation = this.validateFormula(formula);
      if (!validation.isValid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        return result;
      }

      // Preparar contexto de execução
      this.prepareContext(context);

      // Processar fórmula
      const processedFormula = this.preprocessFormula(formula);
      result.steps.push(`Fórmula processada: ${processedFormula}`);

      // Avaliar expressão
      const value = this.evaluateExpression(processedFormula, context);
      
      result.value = Math.round(value * 100) / 100; // Arredondar para 2 casas decimais
      result.isValid = true;
      result.steps.push(`Resultado calculado: ${result.value}`);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
      result.steps.push(`Erro na execução: ${result.errors[result.errors.length - 1]}`);
    }

    return result;
  }

  /**
   * Valida uma fórmula
   */
  validateFormula(formula: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      variables: [],
      dependencies: []
    };

    try {
      // Verificar se a fórmula não está vazia
      if (!formula || formula.trim().length === 0) {
        result.errors.push('Fórmula não pode estar vazia');
        result.isValid = false;
        return result;
      }

      // Extrair variáveis da fórmula
      const variables = this.extractVariables(formula);
      result.variables = variables;

      // Verificar se todas as variáveis são válidas
      const validVariables = this.getValidVariables();
      const invalidVariables = variables.filter(v => !validVariables.includes(v));
      
      if (invalidVariables.length > 0) {
        result.errors.push(`Variáveis inválidas: ${invalidVariables.join(', ')}`);
        result.isValid = false;
      }

      // Verificar sintaxe básica
      if (!this.isValidSyntax(formula)) {
        result.errors.push('Sintaxe inválida na fórmula');
        result.isValid = false;
      }

      // Verificar parênteses balanceados
      if (!this.areParenthesesBalanced(formula)) {
        result.errors.push('Parênteses não balanceados');
        result.isValid = false;
      }

      // Verificar operadores válidos
      if (!this.hasValidOperators(formula)) {
        result.errors.push('Operadores inválidos na fórmula');
        result.isValid = false;
      }

      // Avisos
      if (variables.length === 0) {
        result.warnings.push('Fórmula não contém variáveis');
      }

      if (formula.includes('**') || formula.includes('^')) {
        result.warnings.push('Use pow() em vez de ** ou ^ para potência');
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erro na validação');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Extrai variáveis de uma fórmula
   */
  extractVariables(formula: string): string[] {
    const variables = new Set<string>();
    
    // Regex para encontrar variáveis (palavras que não são números ou operadores)
    const variableRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const matches = formula.match(variableRegex) || [];
    
    matches.forEach(match => {
      // Ignorar funções built-in
      if (!this.functions.has(match)) {
        variables.add(match);
      }
    });

    return Array.from(variables);
  }

  /**
   * Obtém lista de variáveis válidas
   */
  getValidVariables(): string[] {
    return [
      'baseSalary', 'grossSalary', 'netSalary',
      'hoursWorked', 'overtimeHours', 'dependents',
      'deductions', 'month', 'year'
    ];
  }

  /**
   * Verifica se a sintaxe é válida
   */
  private isValidSyntax(formula: string): boolean {
    try {
      // Substituir variáveis por números para teste de sintaxe
      const testFormula = formula
        .replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, '1')
        .replace(/\(/g, '(')
        .replace(/\)/g, ')');
      
      // Tentar avaliar a expressão
      new Function('return ' + testFormula);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se parênteses estão balanceados
   */
  private areParenthesesBalanced(formula: string): boolean {
    let count = 0;
    for (const char of formula) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Verifica se operadores são válidos
   */
  private hasValidOperators(formula: string): boolean {
    const validOperators = ['+', '-', '*', '/', '(', ')', '.', ' '];
    const validChars = /[a-zA-Z0-9+\-*/().\s]/g;
    
    const cleanFormula = formula.replace(validChars, '');
    return cleanFormula.length === 0;
  }

  /**
   * Preprocessa fórmula antes da avaliação
   */
  private preprocessFormula(formula: string): string {
    let processed = formula.trim();
    
    // Substituir operadores de potência
    processed = processed.replace(/\*\*/g, 'pow(');
    processed = processed.replace(/\^/g, 'pow(');
    
    // Adicionar parênteses de fechamento para pow
    const openParens = (processed.match(/pow\(/g) || []).length;
    const closeParens = (processed.match(/\)/g) || []).length;
    const missingParens = openParens - closeParens;
    
    for (let i = 0; i < missingParens; i++) {
      processed += ')';
    }
    
    return processed;
  }

  /**
   * Avalia expressão matemática
   */
  private evaluateExpression(expression: string, context: CalculationContext): number {
    // Substituir variáveis por valores
    let evaluated = expression;
    
    // Substituir variáveis do contexto
    evaluated = evaluated.replace(/\bsalario_base\b/g, context.baseSalary.toString());
    evaluated = evaluated.replace(/\bsalario_bruto\b/g, context.grossSalary.toString());
    evaluated = evaluated.replace(/\bsalario_liquido\b/g, context.netSalary.toString());
    evaluated = evaluated.replace(/\bhoras_trabalhadas\b/g, context.hoursWorked.toString());
    evaluated = evaluated.replace(/\bhoras_extras\b/g, context.overtimeHours.toString());
    evaluated = evaluated.replace(/\bdependentes\b/g, context.dependents.toString());
    evaluated = evaluated.replace(/\bdescontos\b/g, context.deductions.toString());
    
    // Substituir variáveis customizadas
    Object.entries(context.variables).forEach(([key, value]) => {
      evaluated = evaluated.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
    });

    // Avaliar funções
    evaluated = this.evaluateFunctions(evaluated, context);

    // Avaliar expressão matemática
    return this.evaluateMathExpression(evaluated);
  }

  /**
   * Avalia funções na expressão
   */
  private evaluateFunctions(expression: string, context: CalculationContext): string {
    let result = expression;
    
    // Regex para encontrar chamadas de função
    const functionRegex = /(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = functionRegex.exec(expression)) !== null) {
      const [fullMatch, functionName, args] = match;
      
      if (this.functions.has(functionName)) {
        const func = this.functions.get(functionName)!;
        const argValues = this.parseArguments(args, context);
        
        try {
          const functionResult = func(...argValues);
          result = result.replace(fullMatch, functionResult.toString());
        } catch (error) {
          throw new Error(`Erro na função ${functionName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }
    
    return result;
  }

  /**
   * Parseia argumentos de função
   */
  private parseArguments(args: string, context: CalculationContext): number[] {
    if (!args.trim()) return [];
    
    return args.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // Se é um número, retornar diretamente
      if (!isNaN(Number(trimmed))) {
        return Number(trimmed);
      }
      
      // Se é uma variável, buscar no contexto
      if (context.variables[trimmed] !== undefined) {
        return context.variables[trimmed];
      }
      
      // Se é uma variável built-in
      switch (trimmed) {
        case 'salario_base': return context.baseSalary;
        case 'salario_bruto': return context.grossSalary;
        case 'salario_liquido': return context.netSalary;
        case 'horas_trabalhadas': return context.hoursWorked;
        case 'horas_extras': return context.overtimeHours;
        case 'dependentes': return context.dependents;
        case 'descontos': return context.deductions;
        default: throw new Error(`Variável não encontrada: ${trimmed}`);
      }
    });
  }

  /**
   * Avalia expressão matemática simples
   */
  private evaluateMathExpression(expression: string): number {
    try {
      // Usar Function para avaliar expressão matemática de forma segura
      const func = new Function('return ' + expression);
      return func();
    } catch (error) {
      throw new Error(`Erro na avaliação matemática: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Prepara contexto de execução
   */
  private prepareContext(context: CalculationContext): void {
    this.variables.clear();
    
    // Adicionar variáveis do contexto
    this.variables.set('baseSalary', context.baseSalary);
    this.variables.set('grossSalary', context.grossSalary);
    this.variables.set('netSalary', context.netSalary);
    this.variables.set('hoursWorked', context.hoursWorked);
    this.variables.set('overtimeHours', context.overtimeHours);
    this.variables.set('dependents', context.dependents);
    this.variables.set('deductions', context.deductions);
    
    // Adicionar variáveis customizadas
    Object.entries(context.variables).forEach(([key, value]) => {
      this.variables.set(key, value);
    });
  }

  /**
   * Calcula INSS
   */
  private calculateINSS(salary: number): number {
    // Faixas de INSS 2024
    const brackets = [
      { min: 0, max: 1412, rate: 0.075 },
      { min: 1412.01, max: 2666.68, rate: 0.09 },
      { min: 2666.69, max: 4000.03, rate: 0.12 },
      { min: 4000.04, max: 7786.02, rate: 0.14 }
    ];

    let inss = 0;
    for (const bracket of brackets) {
      if (salary > bracket.min) {
        const taxableAmount = Math.min(salary - bracket.min, bracket.max - bracket.min);
        inss += taxableAmount * bracket.rate;
      }
    }

    return Math.round(inss * 100) / 100;
  }

  /**
   * Calcula IRRF
   */
  private calculateIRRF(salary: number, dependents: number = 0): number {
    // Faixas de IRRF 2024
    const brackets = [
      { min: 0, max: 22847.76, rate: 0, deduction: 0 },
      { min: 22847.77, max: 33919.80, rate: 0.075, deduction: 1713.58 },
      { min: 33919.81, max: 45012.60, rate: 0.15, deduction: 4257.57 },
      { min: 45012.61, max: 55976.16, rate: 0.225, deduction: 7633.51 },
      { min: 55976.17, max: Infinity, rate: 0.275, deduction: 10432.32 }
    ];

    const deductionPerDependent = 2275.08;
    const totalDeductions = dependents * deductionPerDependent;
    const taxableSalary = salary - totalDeductions;

    for (const bracket of brackets) {
      if (taxableSalary >= bracket.min && taxableSalary <= bracket.max) {
        return Math.round((taxableSalary * bracket.rate - bracket.deduction) * 100) / 100;
      }
    }

    return 0;
  }

  /**
   * Calcula FGTS
   */
  private calculateFGTS(salary: number): number {
    return Math.round(salary * 0.08 * 100) / 100;
  }

  /**
   * Obtém dias úteis no mês
   */
  private getWorkingDaysInMonth(month: number, year: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  }

  /**
   * Obtém dias trabalhados
   */
  private getWorkedDays(context: CalculationContext): number {
    // Implementação simplificada - pode ser expandida
    return this.getWorkingDaysInMonth(context.period.month, context.period.year);
  }

  /**
   * Adiciona função customizada
   */
  addFunction(name: string, func: Function): void {
    this.functions.set(name, func);
  }

  /**
   * Remove função customizada
   */
  removeFunction(name: string): void {
    this.functions.delete(name);
  }

  /**
   * Lista funções disponíveis
   */
  getAvailableFunctions(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Lista variáveis disponíveis
   */
  getAvailableVariables(): string[] {
    return this.getValidVariables();
  }
}
