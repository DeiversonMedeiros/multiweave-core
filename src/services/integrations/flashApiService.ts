// =====================================================
// SERVIÇO DE INTEGRAÇÃO COM FLASH API
// =====================================================
// Baseado na documentação oficial: https://docs.api.flashapp.services/Geral/Introducao
// Data: 2025-11-04

const FLASH_API_BASE_URL = process.env.VITE_FLASH_API_BASE_URL || 'https://api.flashapp.services';
const FLASH_API_VERSION = 'v2';

export interface FlashApiConfig {
  apiKey: string;
  companyId?: string;
}

export interface FlashEmployee {
  id?: string;
  externalId?: string;
  documentNumber: string;
  email: string;
  name: string;
  phone?: string;
  companyId?: string;
}

export interface FlashPayment {
  employeeId: string;
  amount: number;
  description: string;
  referenceId?: string;
}

export interface FlashInvoice {
  employeeId: string;
  amount: number;
  description: string;
  dueDate: string;
  referenceId?: string;
}

export interface FlashApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Classe para integração com Flash API
 * Documentação: https://docs.api.flashapp.services/Geral/Introducao
 */
export class FlashApiService {
  private apiKey: string;
  private companyId?: string;
  private baseUrl: string;

  constructor(config: FlashApiConfig) {
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.baseUrl = `${FLASH_API_BASE_URL}/${FLASH_API_VERSION}`;
  }

  /**
   * Cria headers padrão para requisições
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...(this.companyId && { 'X-Company-Id': this.companyId }),
    };
  }

  /**
   * Faz requisição HTTP para a API Flash
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<FlashApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Erro na requisição Flash API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Busca ou cria colaborador na Flash
   * Documentação: https://docs.api.flashapp.services/docs/Colaboradores/CriarColaborador
   */
  async getOrCreateEmployee(employee: FlashEmployee): Promise<FlashApiResponse<FlashEmployee>> {
    // Primeiro, tenta buscar pelo externalId ou documentNumber
    if (employee.externalId || employee.documentNumber) {
      const searchParams = new URLSearchParams();
      if (employee.externalId) {
        searchParams.append('externalIds', employee.externalId);
      }
      if (employee.documentNumber) {
        searchParams.append('documentNumbers', employee.documentNumber);
      }

      const searchResult = await this.request<{ employees: FlashEmployee[] }>(
        `/employees?${searchParams.toString()}`
      );

      if (searchResult.success && searchResult.data?.employees?.length > 0) {
        return {
          success: true,
          data: searchResult.data.employees[0],
        };
      }
    }

    // Se não encontrou, cria novo colaborador
    return this.createEmployee(employee);
  }

  /**
   * Cria colaborador na Flash
   * Documentação: https://docs.api.flashapp.services/docs/Colaboradores/CriarColaborador
   */
  async createEmployee(employee: FlashEmployee): Promise<FlashApiResponse<FlashEmployee>> {
    return this.request<FlashEmployee>('/employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: this.companyId || employee.companyId,
        documentNumber: employee.documentNumber,
        email: employee.email,
        name: employee.name,
        phone: employee.phone,
        externalId: employee.externalId,
      }),
    });
  }

  /**
   * Lista colaboradores
   * Documentação: https://docs.api.flashapp.services/docs/Colaboradores/ListarColaboradores
   */
  async listEmployees(filters?: {
    documentNumbers?: string[];
    externalIds?: string[];
    status?: string;
  }): Promise<FlashApiResponse<{ employees: FlashEmployee[] }>> {
    const params = new URLSearchParams();
    if (filters?.documentNumbers) {
      filters.documentNumbers.forEach(doc => params.append('documentNumbers', doc));
    }
    if (filters?.externalIds) {
      filters.externalIds.forEach(id => params.append('externalIds', id));
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }

    const queryString = params.toString();
    return this.request<{ employees: FlashEmployee[] }>(
      `/employees${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Faz depósito na conta Flash do colaborador
   * Nota: Endpoint específico pode variar na documentação oficial
   * Este é um exemplo baseado na estrutura comum de APIs de pagamento
   */
  async depositToEmployeeAccount(
    payment: FlashPayment
  ): Promise<FlashApiResponse<{ paymentId: string; accountNumber: string }>> {
    // TODO: Verificar endpoint exato na documentação oficial
    // Endpoint pode ser: /payments, /deposits, /transactions, etc.
    return this.request<{ paymentId: string; accountNumber: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: payment.employeeId,
        amount: payment.amount,
        description: payment.description,
        referenceId: payment.referenceId,
        type: 'deposit',
      }),
    });
  }

  /**
   * Gera boleto/invoice Flash para o colaborador
   * Nota: Endpoint específico pode variar na documentação oficial
   */
  async generateInvoice(
    invoice: FlashInvoice
  ): Promise<FlashApiResponse<{ invoiceId: string; invoiceUrl: string }>> {
    // TODO: Verificar endpoint exato na documentação oficial
    // Endpoint pode ser: /invoices, /bills, /payments/invoice, etc.
    return this.request<{ invoiceId: string; invoiceUrl: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: invoice.employeeId,
        amount: invoice.amount,
        description: invoice.description,
        dueDate: invoice.dueDate,
        referenceId: invoice.referenceId,
      }),
    });
  }

  /**
   * Busca informações da conta Flash do colaborador
   */
  async getEmployeeAccount(
    employeeId: string
  ): Promise<FlashApiResponse<{ accountNumber: string; balance?: number }>> {
    // TODO: Verificar endpoint exato na documentação oficial
    return this.request<{ accountNumber: string; balance?: number }>(
      `/employees/${employeeId}/account`
    );
  }
}

/**
 * Instância singleton do serviço Flash API
 * Deve ser configurada com a chave de API antes de usar
 */
let flashApiInstance: FlashApiService | null = null;

/**
 * Inicializa o serviço Flash API
 */
export function initFlashApi(config: FlashApiConfig): FlashApiService {
  flashApiInstance = new FlashApiService(config);
  return flashApiInstance;
}

/**
 * Obtém a instância do serviço Flash API
 */
export function getFlashApi(): FlashApiService | null {
  return flashApiInstance;
}

/**
 * Inicializa Flash API a partir da configuração do banco de dados
 */
export async function initFlashApiFromConfig(companyId: string): Promise<FlashApiService | null> {
  try {
    const { FlashIntegrationConfigService } = await import('./flashIntegrationConfigService');
    const configService = FlashIntegrationConfigService.getInstance();
    const config = await configService.getConfiguracaoAtiva(companyId);
    
    if (!config || !config.is_active || !config.credenciais_validas) {
      return null;
    }
    
    flashApiInstance = new FlashApiService({
      apiKey: config.api_key,
      companyId: config.flash_company_id || companyId
    });
    
    // Atualizar base URL se configurado
    if (config.base_url) {
      (flashApiInstance as any).baseUrl = `${config.base_url}/${config.api_version || 'v2'}`;
    }
    
    return flashApiInstance;
  } catch (error) {
    console.error('Erro ao inicializar Flash API a partir da configuração:', error);
    return null;
  }
}

/**
 * Helper para criar instância temporária do serviço
 */
export function createFlashApi(config: FlashApiConfig): FlashApiService {
  return new FlashApiService(config);
}

