// =====================================================
// SERVIÇO DE CONFIGURAÇÃO DE INTEGRAÇÃO FLASH
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface FlashIntegrationConfig {
  id: string;
  company_id: string;
  nome_configuracao: string;
  ambiente: 'producao' | 'sandbox' | 'homologacao';
  api_key: string;
  flash_company_id?: string;
  base_url: string;
  api_version: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_email?: string;
  empresa_telefone?: string;
  configuracao_adicional?: Record<string, any>;
  credenciais_validas: boolean;
  conectividade_ok: boolean;
  ultima_validacao?: string;
  erro_validacao?: string;
  ultima_sincronizacao?: string;
  observacoes?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashIntegrationConfigFormData {
  nome_configuracao: string;
  ambiente: 'producao' | 'sandbox' | 'homologacao';
  api_key: string;
  flash_company_id?: string;
  base_url: string;
  api_version: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_email?: string;
  empresa_telefone?: string;
  configuracao_adicional?: Record<string, any>;
  observacoes?: string;
  is_active: boolean;
}

export class FlashIntegrationConfigService {
  private static instance: FlashIntegrationConfigService;

  static getInstance(): FlashIntegrationConfigService {
    if (!FlashIntegrationConfigService.instance) {
      FlashIntegrationConfigService.instance = new FlashIntegrationConfigService();
    }
    return FlashIntegrationConfigService.instance;
  }

  /**
   * Busca configurações Flash de uma empresa
   */
  async getConfiguracoes(companyId: string): Promise<FlashIntegrationConfig[]> {
    try {
      const result = await EntityService.list<FlashIntegrationConfig>({
        schema: 'rh',
        table: 'flash_integration_config',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar configurações Flash:', error);
      throw error;
    }
  }

  /**
   * Busca configuração ativa de uma empresa
   */
  async getConfiguracaoAtiva(companyId: string): Promise<FlashIntegrationConfig | null> {
    try {
      const result = await EntityService.list<FlashIntegrationConfig>({
        schema: 'rh',
        table: 'flash_integration_config',
        companyId: companyId,
        filters: { is_active: true }
      });

      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar configuração ativa Flash:', error);
      throw error;
    }
  }

  /**
   * Busca configuração por ID
   */
  async getConfiguracaoById(configId: string, companyId?: string): Promise<FlashIntegrationConfig | null> {
    try {
      if (!companyId) {
        // Se não tem companyId, buscar em todas as empresas (apenas para casos específicos)
        const result = await EntityService.list<FlashIntegrationConfig>({
          schema: 'rh',
          table: 'flash_integration_config',
          companyId: '', // Vazio para buscar todas
          filters: { id: configId }
        });
        return result.data.length > 0 ? result.data[0] : null;
      }

      const result = await EntityService.getById<FlashIntegrationConfig>(
        'rh',
        'flash_integration_config',
        configId,
        companyId
      );

      return result;
    } catch (error) {
      console.error('Erro ao buscar configuração Flash:', error);
      throw error;
    }
  }

  /**
   * Cria nova configuração
   */
  async createConfiguracao(
    companyId: string,
    formData: FlashIntegrationConfigFormData
  ): Promise<FlashIntegrationConfig> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const result = await EntityService.create<FlashIntegrationConfig>({
        schema: 'rh',
        table: 'flash_integration_config',
        companyId: companyId,
        data: {
          company_id: companyId,
          nome_configuracao: formData.nome_configuracao,
          ambiente: formData.ambiente,
          api_key: formData.api_key, // TODO: Implementar criptografia
          flash_company_id: formData.flash_company_id,
          base_url: formData.base_url,
          api_version: formData.api_version,
          empresa_nome: formData.empresa_nome,
          empresa_cnpj: formData.empresa_cnpj,
          empresa_email: formData.empresa_email,
          empresa_telefone: formData.empresa_telefone,
          configuracao_adicional: formData.configuracao_adicional || {},
          observacoes: formData.observacoes,
          is_active: formData.is_active,
          created_by: user.id,
        }
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar configuração Flash:', error);
      throw error;
    }
  }

  /**
   * Atualiza configuração existente
   */
  async updateConfiguracao(
    configId: string,
    companyId: string,
    formData: FlashIntegrationConfigFormData
  ): Promise<FlashIntegrationConfig> {
    try {
      const result = await EntityService.update<FlashIntegrationConfig>({
        schema: 'rh',
        table: 'flash_integration_config',
        companyId: companyId,
        id: configId,
        data: {
          nome_configuracao: formData.nome_configuracao,
          ambiente: formData.ambiente,
          api_key: formData.api_key, // TODO: Implementar criptografia
          flash_company_id: formData.flash_company_id,
          base_url: formData.base_url,
          api_version: formData.api_version,
          empresa_nome: formData.empresa_nome,
          empresa_cnpj: formData.empresa_cnpj,
          empresa_email: formData.empresa_email,
          empresa_telefone: formData.empresa_telefone,
          configuracao_adicional: formData.configuracao_adicional || {},
          observacoes: formData.observacoes,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        }
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar configuração Flash:', error);
      throw error;
    }
  }

  /**
   * Deleta configuração
   */
  async deleteConfiguracao(configId: string, companyId: string): Promise<void> {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'flash_integration_config',
        companyId: companyId,
        id: configId
      });
    } catch (error) {
      console.error('Erro ao deletar configuração Flash:', error);
      throw error;
    }
  }

  /**
   * Testa conexão com Flash API
   */
  async testConnection(configId: string, companyId?: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    let config: FlashIntegrationConfig | null = null;
    
    try {
      // Buscar configuração
      config = companyId 
        ? await this.getConfiguracaoById(configId, companyId)
        : await this.getConfiguracaoById(configId);
      if (!config) {
        throw new Error('Configuração não encontrada');
      }

      // Chamar função RPC para testar conexão
      const { data, error } = await supabase.rpc('test_flash_connection', {
        p_config_id: configId
      });

      if (error) {
        throw error;
      }

      // Tentar fazer uma chamada real à API Flash
      const { createFlashApi } = await import('./flashApiService');
      const flashApi = createFlashApi({
        apiKey: config.api_key,
        companyId: config.flash_company_id
      });

      // Tentar listar colaboradores como teste
      const testResult = await flashApi.listEmployees();

      // Atualizar status da configuração
      if (config.company_id) {
        await EntityService.update({
          schema: 'rh',
          table: 'flash_integration_config',
          companyId: config.company_id,
          id: configId,
          data: {
            credenciais_validas: testResult.success,
            conectividade_ok: testResult.success,
            ultima_validacao: new Date().toISOString(),
            erro_validacao: testResult.success ? null : testResult.error,
          }
        });
      }

      return {
        success: testResult.success,
        message: testResult.success 
          ? 'Conexão com Flash API realizada com sucesso!' 
          : `Erro na conexão: ${testResult.error}`,
        details: testResult.data
      };
    } catch (error) {
      console.error('Erro ao testar conexão Flash:', error);
      
      // Atualizar status de erro
      if (config?.company_id) {
        await EntityService.update({
          schema: 'rh',
          table: 'flash_integration_config',
          companyId: config.company_id,
          id: configId,
          data: {
            credenciais_validas: false,
            conectividade_ok: false,
            ultima_validacao: new Date().toISOString(),
            erro_validacao: error instanceof Error ? error.message : 'Erro desconhecido',
          }
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao testar conexão',
      };
    }
  }

  /**
   * Inicializa serviço Flash API com configuração da empresa
   */
  async initializeFlashApi(companyId: string): Promise<boolean> {
    try {
      const config = await this.getConfiguracaoAtiva(companyId);
      if (!config || !config.is_active || !config.credenciais_validas) {
        return false;
      }

      const { initFlashApi } = await import('./flashApiService');
      initFlashApi({
        apiKey: config.api_key,
        companyId: config.flash_company_id || companyId
      });

      return true;
    } catch (error) {
      console.error('Erro ao inicializar Flash API:', error);
      return false;
    }
  }
}

