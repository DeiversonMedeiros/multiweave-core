// =====================================================
// SERVIÇO: CONFIGURAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-01-20
// Descrição: Serviço para gerenciar configurações de integração bancária (Bradesco, etc.)
// Autor: Sistema MultiWeave Core

import { EntityService } from '@/services/generic/entityService';
import { ConfiguracaoBancaria, LogValidacaoIntegracao } from '@/integrations/supabase/financial-types';

export interface ConfiguracaoBancariaFormData {
  nome_configuracao: string;
  banco_codigo: string;
  banco_nome: string;
  ambiente: 'producao' | 'sandbox' | 'homologacao';
  client_id?: string;
  client_secret?: string;
  api_key?: string;
  base_url: string;
  auth_url?: string;
  api_version: string;
  grant_type: string;
  scope?: string;
  observacoes?: string;
  is_active: boolean;
}

export class ConfiguracaoBancariaService {
  private static instance: ConfiguracaoBancariaService;

  private constructor() {}

  public static getInstance(): ConfiguracaoBancariaService {
    if (!ConfiguracaoBancariaService.instance) {
      ConfiguracaoBancariaService.instance = new ConfiguracaoBancariaService();
    }
    return ConfiguracaoBancariaService.instance;
  }

  /**
   * Busca todas as configurações bancárias da empresa
   */
  async getConfiguracoes(companyId: string): Promise<ConfiguracaoBancaria[]> {
    try {
      const result = await EntityService.list<ConfiguracaoBancaria>({
        schema: 'financeiro',
        table: 'configuracao_bancaria',
        companyId,
        filters: { is_active: true },
        orderBy: 'banco_nome',
        orderDirection: 'ASC'
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar configurações bancárias:', error);
      throw error;
    }
  }

  /**
   * Busca uma configuração específica
   */
  async getConfiguracao(id: string, companyId: string): Promise<ConfiguracaoBancaria | null> {
    try {
      const result = await EntityService.getById<ConfiguracaoBancaria>(
        'financeiro',
        'configuracao_bancaria',
        id,
        companyId
      );

      return result;
    } catch (error) {
      console.error('Erro ao buscar configuração bancária:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova configuração bancária
   */
  async createConfiguracao(
    companyId: string,
    configData: ConfiguracaoBancariaFormData,
    userId?: string
  ): Promise<ConfiguracaoBancaria> {
    try {
      const configuracaoData = {
        company_id: companyId,
        nome_configuracao: configData.nome_configuracao,
        banco_codigo: configData.banco_codigo,
        banco_nome: configData.banco_nome,
        ambiente: configData.ambiente,
        client_id: configData.client_id,
        client_secret: configData.client_secret,
        api_key: configData.api_key,
        base_url: configData.base_url,
        auth_url: configData.auth_url,
        api_version: configData.api_version,
        grant_type: configData.grant_type,
        scope: configData.scope,
        observacoes: configData.observacoes,
        is_active: configData.is_active,
        created_by: userId
      };

      const result = await EntityService.create<ConfiguracaoBancaria>({
        schema: 'financeiro',
        table: 'configuracao_bancaria',
        companyId,
        data: configuracaoData
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar configuração bancária:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma configuração bancária existente
   */
  async updateConfiguracao(
    id: string,
    companyId: string,
    configData: Partial<ConfiguracaoBancariaFormData>,
    userId?: string
  ): Promise<ConfiguracaoBancaria> {
    try {
      const updateData: any = {
        ...configData,
        updated_at: new Date().toISOString()
      };

      const result = await EntityService.update<ConfiguracaoBancaria>({
        schema: 'financeiro',
        table: 'configuracao_bancaria',
        companyId,
        id,
        data: updateData
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar configuração bancária:', error);
      throw error;
    }
  }

  /**
   * Deleta uma configuração bancária
   */
  async deleteConfiguracao(id: string, companyId: string): Promise<void> {
    try {
      await EntityService.delete({
        schema: 'financeiro',
        table: 'configuracao_bancaria',
        companyId,
        id
      });
    } catch (error) {
      console.error('Erro ao deletar configuração bancária:', error);
      throw error;
    }
  }

  /**
   * Valida credenciais bancárias (simulação)
   */
  async validarCredenciais(baseUrl: string, clientId: string, clientSecret: string): Promise<{ valido: boolean; mensagem: string; accessToken?: string }> {
    // Lógica real de validação de credenciais (ex: chamar API de autenticação do banco)
    try {
      // TODO: Implementar chamada real à API do banco para validar credenciais
      // Por enquanto, validação básica de formato
      if (!clientId || !clientSecret) {
        return { valido: false, mensagem: 'Credenciais não podem estar vazias.' };
      }
      
      // Nota: Em produção, fazer chamada real à API do banco
      // const response = await fetch(`${baseUrl}/auth`, { ... });
      // return { valido: response.ok, mensagem: ..., accessToken: ... };
      
      return { valido: false, mensagem: 'Validação de credenciais não implementada. Configure a integração com o banco.' };
    } catch (error) {
      console.error('Erro ao validar credenciais:', error);
      return { valido: false, mensagem: 'Erro ao validar credenciais.' };
    }
  }

  /**
   * Testa conectividade com API bancária (simulação)
   */
  async testarConectividadeBancaria(baseUrl: string): Promise<{ conectado: boolean; tempoRespostaMs: number; mensagem: string }> {
    const startTime = Date.now();
    try {
      // Simular uma requisição HTTP para a API bancária
      const response = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); // Timeout de 5 segundos
      const endTime = Date.now();
      const tempoRespostaMs = endTime - startTime;

      if (response.ok) {
        return { conectado: true, tempoRespostaMs, mensagem: 'Conectividade com API bancária OK.' };
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
  async getLogsValidacao(companyId: string, tipoIntegracao: 'sefaz' | 'bancaria' = 'bancaria'): Promise<LogValidacaoIntegracao[]> {
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
}