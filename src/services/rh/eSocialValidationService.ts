import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE VALIDAÇÃO DE DADOS eSOCIAL
// =====================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface EmployeeData {
  id: string;
  name: string;
  cpf: string;
  pis: string;
  admissionDate: string;
  position: string;
  department: string;
  salary: number;
  workShift: string;
  contractType: string;
}

export interface CompanyData {
  id: string;
  cnpj: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
}

export class ESocialValidationService {
  // =====================================================
  // VALIDAÇÃO DE EVENTOS eSOCIAL
  // =====================================================

  async validateEvent(event: ESocialEvent, employeeData?: EmployeeData, companyData?: CompanyData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validações gerais
    this.validateGeneralFields(event, errors, warnings);

    // Validações específicas por tipo de evento
    switch (event.tipo_evento) {
      case 'S-1000':
        this.validateS1000(event, companyData, errors, warnings);
        break;
      case 'S-1200':
        this.validateS1200(event, employeeData, errors, warnings);
        break;
      case 'S-2200':
        this.validateS2200(event, employeeData, errors, warnings);
        break;
      case 'S-2299':
        this.validateS2299(event, employeeData, errors, warnings);
        break;
      case 'S-5001':
        this.validateS5001(event, employeeData, errors, warnings);
        break;
      default:
        this.validateGenericEvent(event, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // =====================================================
  // VALIDAÇÕES GERAIS
  // =====================================================

  private validateGeneralFields(event: ESocialEvent, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validação do tipo de evento
    if (!event.tipo_evento) {
      errors.push({
        field: 'tipo_evento',
        message: 'Tipo de evento é obrigatório',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    } else if (!this.isValidEventType(event.tipo_evento)) {
      errors.push({
        field: 'tipo_evento',
        message: 'Tipo de evento inválido',
        code: 'INVALID_EVENT_TYPE',
        severity: 'error'
      });
    }

    // Validação do código do evento
    if (!event.codigo_evento) {
      errors.push({
        field: 'codigo_evento',
        message: 'Código do evento é obrigatório',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    // Validação da descrição
    if (!event.descricao) {
      errors.push({
        field: 'descricao',
        message: 'Descrição é obrigatória',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    } else if (event.descricao.length > 255) {
      warnings.push({
        field: 'descricao',
        message: 'Descrição muito longa (máximo 255 caracteres)',
        code: 'FIELD_TOO_LONG'
      });
    }

    // Validação do status
    if (!event.status) {
      errors.push({
        field: 'status',
        message: 'Status é obrigatório',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    } else if (!this.isValidStatus(event.status)) {
      errors.push({
        field: 'status',
        message: 'Status inválido',
        code: 'INVALID_STATUS',
        severity: 'error'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO S-1000 - INFORMAÇÕES DO EMPREGADOR
  // =====================================================

  private validateS1000(event: ESocialEvent, companyData?: CompanyData, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!companyData) {
      errors.push({
        field: 'company_data',
        message: 'Dados da empresa são obrigatórios para S-1000',
        code: 'REQUIRED_COMPANY_DATA',
        severity: 'error'
      });
      return;
    }

    // Validação do CNPJ
    if (!companyData.cnpj) {
      errors.push({
        field: 'cnpj',
        message: 'CNPJ é obrigatório para S-1000',
        code: 'REQUIRED_CNPJ',
        severity: 'error'
      });
    } else if (!this.isValidCNPJ(companyData.cnpj)) {
      errors.push({
        field: 'cnpj',
        message: 'CNPJ inválido',
        code: 'INVALID_CNPJ',
        severity: 'error'
      });
    }

    // Validação da razão social
    if (!companyData.name) {
      errors.push({
        field: 'company_name',
        message: 'Razão social é obrigatória para S-1000',
        code: 'REQUIRED_COMPANY_NAME',
        severity: 'error'
      });
    }

    // Validação do endereço
    if (!companyData.address) {
      warnings.push({
        field: 'address',
        message: 'Endereço da empresa não informado',
        code: 'MISSING_ADDRESS'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO S-1200 - REMUNERAÇÃO RGPS
  // =====================================================

  private validateS1200(event: ESocialEvent, employeeData?: EmployeeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!employeeData) {
      errors.push({
        field: 'employee_data',
        message: 'Dados do funcionário são obrigatórios para S-1200',
        code: 'REQUIRED_EMPLOYEE_DATA',
        severity: 'error'
      });
      return;
    }

    // Validação do CPF
    if (!employeeData.cpf) {
      errors.push({
        field: 'cpf',
        message: 'CPF é obrigatório para S-1200',
        code: 'REQUIRED_CPF',
        severity: 'error'
      });
    } else if (!this.isValidCPF(employeeData.cpf)) {
      errors.push({
        field: 'cpf',
        message: 'CPF inválido',
        code: 'INVALID_CPF',
        severity: 'error'
      });
    }

    // Validação do PIS
    if (!employeeData.pis) {
      errors.push({
        field: 'pis',
        message: 'PIS é obrigatório para S-1200',
        code: 'REQUIRED_PIS',
        severity: 'error'
      });
    } else if (!this.isValidPIS(employeeData.pis)) {
      errors.push({
        field: 'pis',
        message: 'PIS inválido',
        code: 'INVALID_PIS',
        severity: 'error'
      });
    }

    // Validação do salário
    if (!employeeData.salary || employeeData.salary <= 0) {
      errors.push({
        field: 'salary',
        message: 'Salário deve ser maior que zero para S-1200',
        code: 'INVALID_SALARY',
        severity: 'error'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO S-2200 - CADASTRAMENTO INICIAL
  // =====================================================

  private validateS2200(event: ESocialEvent, employeeData?: EmployeeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!employeeData) {
      errors.push({
        field: 'employee_data',
        message: 'Dados do funcionário são obrigatórios para S-2200',
        code: 'REQUIRED_EMPLOYEE_DATA',
        severity: 'error'
      });
      return;
    }

    // Validação do CPF
    if (!employeeData.cpf) {
      errors.push({
        field: 'cpf',
        message: 'CPF é obrigatório para S-2200',
        code: 'REQUIRED_CPF',
        severity: 'error'
      });
    } else if (!this.isValidCPF(employeeData.cpf)) {
      errors.push({
        field: 'cpf',
        message: 'CPF inválido',
        code: 'INVALID_CPF',
        severity: 'error'
      });
    }

    // Validação do PIS
    if (!employeeData.pis) {
      errors.push({
        field: 'pis',
        message: 'PIS é obrigatório para S-2200',
        code: 'REQUIRED_PIS',
        severity: 'error'
      });
    } else if (!this.isValidPIS(employeeData.pis)) {
      errors.push({
        field: 'pis',
        message: 'PIS inválido',
        code: 'INVALID_PIS',
        severity: 'error'
      });
    }

    // Validação do nome
    if (!employeeData.name) {
      errors.push({
        field: 'name',
        message: 'Nome do funcionário é obrigatório para S-2200',
        code: 'REQUIRED_NAME',
        severity: 'error'
      });
    }

    // Validação da data de admissão
    if (!employeeData.admissionDate) {
      errors.push({
        field: 'admission_date',
        message: 'Data de admissão é obrigatória para S-2200',
        code: 'REQUIRED_ADMISSION_DATE',
        severity: 'error'
      });
    } else if (!this.isValidDate(employeeData.admissionDate)) {
      errors.push({
        field: 'admission_date',
        message: 'Data de admissão inválida',
        code: 'INVALID_ADMISSION_DATE',
        severity: 'error'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO S-2299 - DESLIGAMENTO
  // =====================================================

  private validateS2299(event: ESocialEvent, employeeData?: EmployeeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!employeeData) {
      errors.push({
        field: 'employee_data',
        message: 'Dados do funcionário são obrigatórios para S-2299',
        code: 'REQUIRED_EMPLOYEE_DATA',
        severity: 'error'
      });
      return;
    }

    // Validação do CPF
    if (!employeeData.cpf) {
      errors.push({
        field: 'cpf',
        message: 'CPF é obrigatório para S-2299',
        code: 'REQUIRED_CPF',
        severity: 'error'
      });
    } else if (!this.isValidCPF(employeeData.cpf)) {
      errors.push({
        field: 'cpf',
        message: 'CPF inválido',
        code: 'INVALID_CPF',
        severity: 'error'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO S-5001 - CONTRIBUIÇÕES SOCIAIS
  // =====================================================

  private validateS5001(event: ESocialEvent, employeeData?: EmployeeData, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!employeeData) {
      errors.push({
        field: 'employee_data',
        message: 'Dados do funcionário são obrigatórios para S-5001',
        code: 'REQUIRED_EMPLOYEE_DATA',
        severity: 'error'
      });
      return;
    }

    // Validação do CPF
    if (!employeeData.cpf) {
      errors.push({
        field: 'cpf',
        message: 'CPF é obrigatório para S-5001',
        code: 'REQUIRED_CPF',
        severity: 'error'
      });
    } else if (!this.isValidCPF(employeeData.cpf)) {
      errors.push({
        field: 'cpf',
        message: 'CPF inválido',
        code: 'INVALID_CPF',
        severity: 'error'
      });
    }
  }

  // =====================================================
  // VALIDAÇÃO GENÉRICA
  // =====================================================

  private validateGenericEvent(event: ESocialEvent, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validações básicas para qualquer tipo de evento
    if (!event.employee_id) {
      warnings.push({
        field: 'employee_id',
        message: 'ID do funcionário não informado',
        code: 'MISSING_EMPLOYEE_ID'
      });
    }
  }

  // =====================================================
  // VALIDAÇÕES DE FORMATO
  // =====================================================

  private isValidEventType(eventType: string): boolean {
    const validTypes = [
      'S-1000', 'S-1005', 'S-1010', 'S-1020', 'S-1030',
      'S-1200', 'S-1202', 'S-1207', 'S-1210', 'S-1250',
      'S-1260', 'S-1270', 'S-1280', 'S-1295', 'S-1298',
      'S-1299', 'S-1300', 'S-2190', 'S-2200', 'S-2205',
      'S-2206', 'S-2210', 'S-2220', 'S-2230', 'S-2240',
      'S-2241', 'S-2250', 'S-2260', 'S-2298', 'S-2299',
      'S-2300', 'S-2306', 'S-2399', 'S-2400', 'S-3000',
      'S-3500', 'S-5001', 'S-5002', 'S-5003', 'S-5011',
      'S-5012', 'S-5013'
    ];
    return validTypes.includes(eventType);
  }

  private isValidStatus(status: string): boolean {
    const validStatuses = ['pending', 'sending', 'sent', 'accepted', 'rejected', 'error'];
    return validStatuses.includes(status);
  }

  private isValidCNPJ(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    // Validação do algoritmo de CNPJ
    let sum = 0;
    let weight = 5;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (parseInt(cleanCNPJ[12]) !== digit1) return false;
    
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cleanCNPJ[13]) === digit2;
  }

  private isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    // Validação do algoritmo de CPF
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (parseInt(cleanCPF[9]) !== digit1) return false;
    
    sum = 0;
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cleanCPF[10]) === digit2;
  }

  private isValidPIS(pis: string): boolean {
    // Remove caracteres não numéricos
    const cleanPIS = pis.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanPIS.length !== 11) return false;
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleanPIS)) return false;
    
    // Validação do algoritmo de PIS
    const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanPIS[i]) * weights[i];
    }
    
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cleanPIS[10]) === digit;
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // =====================================================
  // VALIDAÇÃO DE LOTE
  // =====================================================

  async validateBatch(events: ESocialEvent[], employeeDataMap?: Map<string, EmployeeData>, companyData?: CompanyData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (events.length === 0) {
      errors.push({
        field: 'batch',
        message: 'Lote não pode estar vazio',
        code: 'EMPTY_BATCH',
        severity: 'error'
      });
    }

    // Validação de duplicatas
    const eventIds = new Set();
    for (const event of events) {
      if (eventIds.has(event.id)) {
        errors.push({
          field: 'event_id',
          message: `Evento duplicado: ${event.id}`,
          code: 'DUPLICATE_EVENT',
          severity: 'error'
        });
      }
      eventIds.add(event.id);
    }

    // Validação individual de cada evento
    for (const event of events) {
      const employeeData = employeeDataMap?.get(event.employee_id || '');
      const result = await this.validateEvent(event, employeeData, companyData);
      
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // =====================================================
  // VALIDAÇÃO DE CONFORMIDADE
  // =====================================================

  async validateCompliance(event: ESocialEvent, employeeData?: EmployeeData, companyData?: CompanyData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validação de conformidade com regras do eSocial
    if (event.tipo_evento === 'S-1200' && employeeData) {
      // Verificar se o salário está dentro dos limites legais
      if (employeeData.salary < 1320) { // Salário mínimo 2024
        warnings.push({
          field: 'salary',
          message: 'Salário abaixo do salário mínimo',
          code: 'SALARY_BELOW_MINIMUM'
        });
      }
    }

    // Validação de datas
    if (event.data_envio) {
      const sendDate = new Date(event.data_envio);
      const now = new Date();
      
      if (sendDate > now) {
        errors.push({
          field: 'data_envio',
          message: 'Data de envio não pode ser futura',
          code: 'FUTURE_SEND_DATE',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let validationServiceInstance: ESocialValidationService | null = null;

export function getESocialValidationService(): ESocialValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ESocialValidationService();
  }
  return validationServiceInstance;
}
