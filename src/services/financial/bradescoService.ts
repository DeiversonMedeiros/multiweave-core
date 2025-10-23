// =====================================================
// SERVIÇO: INTEGRAÇÃO BRADESCO
// =====================================================
// Data: 2025-01-15
// Descrição: Serviço de integração com APIs bancárias do Bradesco
// Autor: Sistema MultiWeave Core

import { ContaBancaria, MovimentoBancario, ConciliacaoBancaria } from '@/integrations/supabase/financial-types';

// Configurações do Bradesco
const BRADESCO_CONFIG = {
  baseUrl: process.env.REACT_APP_BRADESCO_API_URL || 'https://api.bradesco.com.br',
  sandboxUrl: process.env.REACT_APP_BRADESCO_SANDBOX_URL || 'https://sandbox.api.bradesco.com.br',
  version: 'v1',
  timeout: 30000,
};

// Tipos para requisições Bradesco
interface BradescoRequest {
  conta: ContaBancaria;
  ambiente: 'producao' | 'sandbox';
  token: string;
}

interface ExtratoRequest extends BradescoRequest {
  data_inicio: string;
  data_fim: string;
  tipo_extrato?: 'completo' | 'resumido';
}

interface SaldoRequest extends BradescoRequest {
  data_consulta?: string;
}

interface TransferenciaRequest extends BradescoRequest {
  conta_destino: string;
  agencia_destino: string;
  valor: number;
  descricao: string;
  data_agendamento?: string;
}

interface CNABRequest extends BradescoRequest {
  tipo_arquivo: 'remessa' | 'retorno';
  data_processamento: string;
  sequencial: number;
}

// Respostas do Bradesco
interface BradescoResponse {
  success: boolean;
  data?: any;
  error?: string;
  codigo_retorno?: string;
  mensagem?: string;
}

interface ExtratoResponse extends BradescoResponse {
  movimentos: MovimentoBancario[];
  saldo_inicial: number;
  saldo_final: number;
  total_entradas: number;
  total_saidas: number;
}

interface SaldoResponse extends BradescoResponse {
  saldo_atual: number;
  saldo_disponivel: number;
  saldo_bloqueado: number;
  data_consulta: string;
}

class BradescoService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = BRADESCO_CONFIG.baseUrl;
    this.timeout = BRADESCO_CONFIG.timeout;
  }

  // Configurar ambiente
  setAmbiente(ambiente: 'producao' | 'sandbox') {
    this.baseUrl = ambiente === 'producao' 
      ? BRADESCO_CONFIG.baseUrl 
      : BRADESCO_CONFIG.sandboxUrl;
  }

  // Obter extrato bancário
  async obterExtrato(request: ExtratoRequest): Promise<ExtratoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/extrato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.token}`,
          'X-Agencia': request.conta.agencia,
          'X-Conta': request.conta.numero_conta,
          'X-Digito': request.conta.digito_conta,
        },
        body: JSON.stringify({
          data_inicio: request.data_inicio,
          data_fim: request.data_fim,
          tipo_extrato: request.tipo_extrato || 'completo',
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao obter extrato: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        movimentos: this.processarMovimentos(data.movimentos),
        saldo_inicial: data.saldo_inicial || 0,
        saldo_final: data.saldo_final || 0,
        total_entradas: data.total_entradas || 0,
        total_saidas: data.total_saidas || 0,
      };
    } catch (error) {
      console.error('Erro ao obter extrato Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        movimentos: [],
        saldo_inicial: 0,
        saldo_final: 0,
        total_entradas: 0,
        total_saidas: 0,
      };
    }
  }

  // Obter saldo da conta
  async obterSaldo(request: SaldoRequest): Promise<SaldoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/saldo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.token}`,
          'X-Agencia': request.conta.agencia,
          'X-Conta': request.conta.numero_conta,
          'X-Digito': request.conta.digito_conta,
        },
        body: JSON.stringify({
          data_consulta: request.data_consulta || new Date().toISOString().split('T')[0],
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao obter saldo: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        saldo_atual: data.saldo_atual || 0,
        saldo_disponivel: data.saldo_disponivel || 0,
        saldo_bloqueado: data.saldo_bloqueado || 0,
        data_consulta: data.data_consulta || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao obter saldo Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        saldo_atual: 0,
        saldo_disponivel: 0,
        saldo_bloqueado: 0,
        data_consulta: new Date().toISOString(),
      };
    }
  }

  // Realizar transferência
  async realizarTransferencia(request: TransferenciaRequest): Promise<BradescoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/transferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.token}`,
          'X-Agencia': request.conta.agencia,
          'X-Conta': request.conta.numero_conta,
          'X-Digito': request.conta.digito_conta,
        },
        body: JSON.stringify({
          conta_destino: request.conta_destino,
          agencia_destino: request.agencia_destino,
          valor: request.valor,
          descricao: request.descricao,
          data_agendamento: request.data_agendamento || new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao realizar transferência: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        codigo_retorno: data.codigo_retorno,
        mensagem: data.mensagem,
      };
    } catch (error) {
      console.error('Erro ao realizar transferência Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Gerar arquivo CNAB
  async gerarCNAB(request: CNABRequest): Promise<BradescoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/cnab`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.token}`,
          'X-Agencia': request.conta.agencia,
          'X-Conta': request.conta.numero_conta,
          'X-Digito': request.conta.digito_conta,
        },
        body: JSON.stringify({
          tipo_arquivo: request.tipo_arquivo,
          data_processamento: request.data_processamento,
          sequencial: request.sequencial,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao gerar CNAB: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        codigo_retorno: data.codigo_retorno,
        mensagem: data.mensagem,
      };
    } catch (error) {
      console.error('Erro ao gerar CNAB Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Processar arquivo CNAB de retorno
  async processarCNABRetorno(arquivo: File, conta: ContaBancaria): Promise<BradescoResponse> {
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('agencia', conta.agencia);
      formData.append('conta', conta.numero_conta);
      formData.append('digito', conta.digito_conta);

      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/cnab/processar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${conta.token_bradesco || ''}`,
        },
        body: formData,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao processar CNAB: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        codigo_retorno: data.codigo_retorno,
        mensagem: data.mensagem,
      };
    } catch (error) {
      console.error('Erro ao processar CNAB Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Conciliar movimentos bancários
  async conciliarMovimentos(
    movimentos_bancarios: MovimentoBancario[],
    movimentos_sistema: MovimentoBancario[]
  ): Promise<ConciliacaoBancaria[]> {
    try {
      const conciliacoes: ConciliacaoBancaria[] = [];
      
      for (const movimento_bancario of movimentos_bancarios) {
        const movimento_sistema = movimentos_sistema.find(
          m => Math.abs(m.valor - movimento_bancario.valor) < 0.01 &&
               m.data_movimento === movimento_bancario.data_movimento
        );

        if (movimento_sistema) {
          conciliacoes.push({
            id: Date.now().toString() + Math.random(),
            company_id: movimento_bancario.company_id,
            conta_bancaria_id: movimento_bancario.conta_bancaria_id,
            movimento_bancario_id: movimento_bancario.id,
            movimento_sistema_id: movimento_sistema.id,
            data_conciliacao: new Date().toISOString(),
            valor: movimento_bancario.valor,
            status: 'conciliado',
            observacoes: 'Conciliado automaticamente',
            created_by: 'sistema',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      return conciliacoes;
    } catch (error) {
      console.error('Erro ao conciliar movimentos Bradesco:', error);
      return [];
    }
  }

  // Processar movimentos do extrato
  private processarMovimentos(movimentos: any[]): MovimentoBancario[] {
    return movimentos.map((mov, index) => ({
      id: `bradesco_${Date.now()}_${index}`,
      company_id: '',
      conta_bancaria_id: '',
      data_movimento: mov.data_movimento || new Date().toISOString(),
      data_liquidacao: mov.data_liquidacao || new Date().toISOString(),
      descricao: mov.descricao || '',
      valor: mov.valor || 0,
      tipo_movimento: mov.tipo_movimento || 'outros',
      categoria: mov.categoria || 'outros',
      documento: mov.documento || '',
      historico: mov.historico || '',
      saldo_anterior: mov.saldo_anterior || 0,
      saldo_posterior: mov.saldo_posterior || 0,
      conciliado: false,
      observacoes: mov.observacoes || '',
      created_by: 'bradesco_api',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  // Validar token de acesso
  async validarToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao validar token Bradesco:', error);
      return false;
    }
  }

  // Obter informações da conta
  async obterInfoConta(conta: ContaBancaria, token: string): Promise<BradescoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${BRADESCO_CONFIG.version}/conta/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Agencia': conta.agencia,
          'X-Conta': conta.numero_conta,
          'X-Digito': conta.digito_conta,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || `Erro ao obter info da conta: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Erro ao obter info da conta Bradesco:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}

export const bradescoService = new BradescoService();
export default bradescoService;
