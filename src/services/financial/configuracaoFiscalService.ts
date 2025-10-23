// =====================================================
// SERVIÇO: CONFIGURAÇÃO FISCAL
// =====================================================
// Data: 2025-01-20
// Descrição: Serviço para gerenciar configurações de integração fiscal (SEFAZ)
// Autor: Sistema MultiWeave Core

import { EntityService } from '@/services/generic/entityService';
import { ConfiguracaoFiscal, LogValidacaoIntegracao } from '@/integrations/supabase/financial-types';

export interface ConfiguracaoFiscalFormData {
  nome_configuracao: string;
  uf: string;
  tipo_documento: 'nfe' | 'nfse' | 'mdfe' | 'cte';
  ambiente: 'producao' | 'homologacao';
  certificado_digital?: File | string;
  senha_certificado?: string;
  data_validade_certificado?: Date;
  webservice_url: string;
  versao_layout: string;
  serie_numeracao: number;
  numero_inicial: number;
  numero_final?: number;
  observacoes?: string;
  is_active: boolean;
}

export class ConfiguracaoFiscalService {
  private static instance: ConfiguracaoFiscalService;

  private constructor() {}

  public static getInstance(): ConfiguracaoFiscalService {
    if (!ConfiguracaoFiscalService.instance) {
      ConfiguracaoFiscalService.instance = new ConfiguracaoFiscalService();
    }
    return ConfiguracaoFiscalService.instance;
  }

  /**
   * Busca todas as configurações fiscais da empresa
   */
  async getConfiguracoes(companyId: string): Promise<ConfiguracaoFiscal[]> {
    try {
      const result = await EntityService.list<ConfiguracaoFiscal>({
        schema: 'financeiro',
        table: 'configuracao_fiscal',
        companyId,
        filters: { is_active: true },
        orderBy: 'uf',
        orderDirection: 'ASC'
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar configurações fiscais:', error);
      throw error;
    }
  }

  /**
   * Busca uma configuração específica
   */
  async getConfiguracao(id: string, companyId: string): Promise<ConfiguracaoFiscal | null> {
    try {
      const result = await EntityService.getById<ConfiguracaoFiscal>(
        'financeiro',
        'configuracao_fiscal',
        id,
        companyId
      );

      return result;
    } catch (error) {
      console.error('Erro ao buscar configuração fiscal:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova configuração fiscal
   */
  async createConfiguracao(
    companyId: string,
    configData: ConfiguracaoFiscalFormData,
    userId?: string
  ): Promise<ConfiguracaoFiscal> {
    try {
      // Converter certificado para base64 se fornecido
      let certificadoBase64: string | undefined;
      if (configData.certificado_digital) {
        certificadoBase64 = await this.convertFileToBase64(configData.certificado_digital);
      }

      const configuracaoData = {
        company_id: companyId,
        nome_configuracao: configData.nome_configuracao,
        uf: configData.uf,
        tipo_documento: configData.tipo_documento,
        ambiente: configData.ambiente,
        certificado_digital: certificadoBase64,
        senha_certificado: configData.senha_certificado,
        data_validade_certificado: configData.data_validade_certificado?.toISOString(),
        webservice_url: configData.webservice_url,
        versao_layout: configData.versao_layout,
        serie_numeracao: configData.serie_numeracao,
        numero_inicial: configData.numero_inicial,
        numero_final: configData.numero_final,
        observacoes: configData.observacoes,
        is_active: configData.is_active,
        created_by: userId
      };

      const result = await EntityService.create<ConfiguracaoFiscal>({
        schema: 'financeiro',
        table: 'configuracao_fiscal',
        companyId,
        data: configuracaoData
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar configuração fiscal:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma configuração fiscal existente
   */
  async updateConfiguracao(
    id: string,
    companyId: string,
    configData: Partial<ConfiguracaoFiscalFormData>,
    userId?: string
  ): Promise<ConfiguracaoFiscal> {
    try {
      const updateData: any = {
        ...configData,
        updated_at: new Date().toISOString()
      };

      // Converter certificado se fornecido
      if (configData.certificado_digital) {
        updateData.certificado_digital = await this.convertFileToBase64(configData.certificado_digital);
      }

      // Converter data se fornecida
      if (configData.data_validade_certificado) {
        updateData.data_validade_certificado = configData.data_validade_certificado.toISOString();
      }

      const result = await EntityService.update<ConfiguracaoFiscal>({
        schema: 'financeiro',
        table: 'configuracao_fiscal',
        companyId,
        id,
        data: updateData
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar configuração fiscal:', error);
      throw error;
    }
  }

  /**
   * Deleta uma configuração fiscal
   */
  async deleteConfiguracao(id: string, companyId: string): Promise<void> {
    try {
      await EntityService.delete({
        schema: 'financeiro',
        table: 'configuracao_fiscal',
        companyId,
        id
      });
    } catch (error) {
      console.error('Erro ao deletar configuração fiscal:', error);
      throw error;
    }
  }

  /**
   * Valida certificado digital (simulação)
   */
  async validarCertificado(certificado: string, senha: string): Promise<{ valido: boolean; mensagem: string }> {
    // Lógica real de validação de certificado digital (ex: chamar API externa, verificar validade, etc.)
    // Por enquanto, uma simulação simples
    if (certificado && senha === 'senha123') {
      return { valido: true, mensagem: 'Certificado válido e senha correta.' };
    }
    return { valido: false, mensagem: 'Certificado inválido ou senha incorreta.' };
  }

  /**
   * Testa conectividade com webservice SEFAZ (simulação)
   */
  async testarConectividadeSefaz(webserviceUrl: string): Promise<{ conectado: boolean; tempoRespostaMs: number; mensagem: string }> {
    const startTime = Date.now();
    try {
      // Simular uma requisição HTTP para o webservice
      const response = await fetch(webserviceUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); // Timeout de 5 segundos
      const endTime = Date.now();
      const tempoRespostaMs = endTime - startTime;

      if (response.ok) {
        return { conectado: true, tempoRespostaMs, mensagem: 'Conectividade com SEFAZ OK.' };
      } else {
        return { conectado: false, tempoRespostaMs, mensagem: `Erro de conectividade: ${response.status} ${response.statusText}` };
      }
    } catch (error: any) {
      const endTime = Date.now();
      const tempoRespostaMs = endTime - startTime;
      return { conectado: false, tempoRespostaMs, mensagem: `Erro de rede ou timeout: ${error.message}` };
    }
  }

  /**
   * Busca logs de validação
   */
  async getLogsValidacao(companyId: string, tipoIntegracao: 'sefaz' | 'bancaria' = 'sefaz'): Promise<LogValidacaoIntegracao[]> {
    try {
      const result = await EntityService.list<LogValidacaoIntegracao>({
        schema: 'financeiro',
        table: 'log_validacao_integracao',
        companyId,
        filters: { tipo_integracao: tipoIntegracao },
        orderBy: 'created_at',
        orderDirection: 'DESC',
        pageSize: 20
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar logs de validação:', error);
      throw error;
    }
  }

  /**
   * Cria log de validação
   */
  async createLogValidacao(log: Omit<LogValidacaoIntegracao, 'id' | 'created_at'>): Promise<LogValidacaoIntegracao> {
    try {
      const result = await EntityService.create<LogValidacaoIntegracao>({
        schema: 'financeiro',
        table: 'log_validacao_integracao',
        companyId: log.company_id,
        data: log
      });

      return result;
    } catch (error) {
      console.error('Erro ao registrar log de validação:', error);
      throw error;
    }
  }

  /**
   * Converte arquivo para base64
   */
  private async convertFileToBase64(file: File | string): Promise<string> {
    if (typeof file === 'string') {
      return file; // Já é base64
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:application/octet-stream;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}