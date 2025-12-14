// =====================================================
// SERVIÇO: MOTOR DE CÁLCULO TRIBUTÁRIO
// =====================================================
// Data: 2025-12-12
// Descrição: Motor centralizado para cálculo de tributos (ISS, ICMS, IPI, PIS/COFINS, INSS)
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import { EntityService } from '@/services/generic/entityService';
import {
  ISSConfig,
  ICMSConfig,
  IPIConfig,
  PISCOFINSConfig,
  INSSRATFAPConfig,
} from '@/integrations/supabase/financial-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface TaxCalculationParams {
  companyId: string;
  tipoOperacao: 'venda' | 'compra';
  tipoDocumento: 'nfse' | 'nfe' | 'misto';
  
  // Dados da operação
  valorServico?: number; // Para NFSe
  valorMercadoria?: number; // Para NFe
  valorTotal: number;
  
  // Localização
  municipioCodigoIBGE?: string; // Para ISS
  uf?: string; // Para ICMS
  dataOperacao: string; // Para buscar configurações vigentes
  
  // Classificações fiscais
  ncm?: string; // Para IPI
  cst?: string; // Para ICMS
  cfop?: string; // Para ICMS
  
  // Regime tributário
  regimePisCofins?: 'cumulativo' | 'nao_cumulativo';
  
  // Deduções (para ISS)
  valorDeducoes?: number;
  tipoDeducao?: 'presumida' | 'real';
  
  // Créditos (para regime não cumulativo)
  valorCreditoInsumos?: number;
  valorCreditoServicos?: number;
  valorCreditoEnergia?: number;
  valorCreditoCombustivel?: number;
}

export interface TaxCalculationResult {
  // ISS
  iss?: {
    baseCalculo: number;
    aliquota: number;
    valorISS: number;
    tipoBaseCalculo: 'base_cheia' | 'deducao_presumida' | 'deducao_real';
    percentualDeducao?: number;
  };
  
  // ICMS
  icms?: {
    baseCalculo: number;
    aliquota: number;
    valorICMS: number;
    aliquotaST?: number;
    valorICMSST?: number;
    baseCalculoST?: number;
    permiteCredito: boolean;
    percentualCredito?: number;
  };
  
  // IPI
  ipi?: {
    baseCalculo: number;
    aliquota: number;
    valorIPI: number;
    permiteCredito: boolean;
    percentualCredito?: number;
  };
  
  // PIS
  pis?: {
    baseCalculo: number;
    aliquota: number;
    valorPIS: number;
    regime: 'cumulativo' | 'nao_cumulativo';
    valorCredito?: number;
  };
  
  // COFINS
  cofins?: {
    baseCalculo: number;
    aliquota: number;
    valorCOFINS: number;
    regime: 'cumulativo' | 'nao_cumulativo';
    valorCredito?: number;
  };
  
  // INSS (quando aplicável)
  inss?: {
    baseCalculo: number;
    aliquota: number;
    valorINSS: number;
    aliquotaRAT?: number;
    fap?: number;
    aliquotaFinal?: number;
  };
  
  // Resumo
  totalTributos: number;
  valorLiquido: number;
}

// =====================================================
// CLASSE: TAX CALCULATION ENGINE
// =====================================================

export class TaxCalculationEngine {
  private static instance: TaxCalculationEngine;
  
  private constructor() {}
  
  static getInstance(): TaxCalculationEngine {
    if (!TaxCalculationEngine.instance) {
      TaxCalculationEngine.instance = new TaxCalculationEngine();
    }
    return TaxCalculationEngine.instance;
  }

  // =====================================================
  // MÉTODO PRINCIPAL: CALCULAR TRIBUTOS
  // =====================================================

  async calcularTributos(params: TaxCalculationParams): Promise<TaxCalculationResult> {
    const result: TaxCalculationResult = {
      totalTributos: 0,
      valorLiquido: params.valorTotal,
    };

    try {
      // Buscar configurações vigentes
      const configs = await this.buscarConfiguracoesVigentes(params);

      // Calcular ISS (se NFSe ou misto)
      if (params.tipoDocumento === 'nfse' || params.tipoDocumento === 'misto') {
        if (params.municipioCodigoIBGE && params.valorServico) {
          result.iss = await this.calcularISS(params, configs.iss);
          result.totalTributos += result.iss.valorISS;
          result.valorLiquido -= result.iss.valorISS;
        }
      }

      // Calcular ICMS (se NFe ou misto)
      if (params.tipoDocumento === 'nfe' || params.tipoDocumento === 'misto') {
        if (params.uf && params.valorMercadoria) {
          result.icms = await this.calcularICMS(params, configs.icms);
          result.totalTributos += result.icms.valorICMS;
          result.valorLiquido -= result.icms.valorICMS;
          
          if (result.icms.valorICMSST) {
            result.totalTributos += result.icms.valorICMSST;
            result.valorLiquido -= result.icms.valorICMSST;
          }
        }
      }

      // Calcular IPI (se NFe ou misto)
      if (params.tipoDocumento === 'nfe' || params.tipoDocumento === 'misto') {
        if (params.ncm && params.valorMercadoria) {
          result.ipi = await this.calcularIPI(params, configs.ipi);
          result.totalTributos += result.ipi.valorIPI;
          result.valorLiquido -= result.ipi.valorIPI;
        }
      }

      // Calcular PIS/COFINS
      if (configs.pisCofins) {
        result.pis = await this.calcularPIS(params, configs.pisCofins);
        result.cofins = await this.calcularCOFINS(params, configs.pisCofins);
        
        result.totalTributos += result.pis.valorPIS;
        result.valorLiquido -= result.pis.valorPIS;
        
        result.totalTributos += result.cofins.valorCOFINS;
        result.valorLiquido -= result.cofins.valorCOFINS;
        
        // Descontar créditos se regime não cumulativo
        if (result.pis.valorCredito) {
          result.totalTributos -= result.pis.valorCredito;
          result.valorLiquido += result.pis.valorCredito;
        }
        if (result.cofins.valorCredito) {
          result.totalTributos -= result.cofins.valorCredito;
          result.valorLiquido += result.cofins.valorCredito;
        }
      }

      // Calcular INSS (quando aplicável - serviços com mão de obra)
      if (params.tipoDocumento === 'nfse' && configs.inss) {
        result.inss = await this.calcularINSS(params, configs.inss);
        result.totalTributos += result.inss.valorINSS;
        result.valorLiquido -= result.inss.valorINSS;
      }

      return result;

    } catch (error) {
      console.error('Erro ao calcular tributos:', error);
      throw error;
    }
  }

  // =====================================================
  // BUSCAR CONFIGURAÇÕES VIGENTES
  // =====================================================

  private async buscarConfiguracoesVigentes(params: TaxCalculationParams): Promise<{
    iss?: ISSConfig;
    icms?: ICMSConfig;
    ipi?: IPIConfig;
    pisCofins?: PISCOFINSConfig;
    inss?: INSSRATFAPConfig;
  }> {
    const configs: any = {};

    // Buscar ISS
    if (params.municipioCodigoIBGE) {
      const issResult = await EntityService.list<ISSConfig>({
        schema: 'tributario',
        table: 'iss_config',
        companyId: params.companyId,
        filters: {
          codigo_municipio_ibge: params.municipioCodigoIBGE,
          is_active: true,
        },
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });

      // Filtrar por vigência localmente
      const dataOperacaoIss = new Date(params.dataOperacao);
      const issData = issResult.data?.find(config => {
        const inicioVigencia = new Date(config.data_inicio_vigencia);
        const fimVigencia = config.data_fim_vigencia ? new Date(config.data_fim_vigencia) : null;
        return inicioVigencia <= dataOperacaoIss && (!fimVigencia || fimVigencia >= dataOperacaoIss);
      });

      if (issData) configs.iss = issData;
    }

    // Buscar ICMS
    if (params.uf) {
      const tipoOperacao = params.tipoOperacao === 'venda' ? 'venda_interna' : 'compra_interna';
      const icmsResult = await EntityService.list<ICMSConfig>({
        schema: 'tributario',
        table: 'icms_config',
        companyId: params.companyId,
        filters: {
          uf: params.uf,
          tipo_operacao: tipoOperacao,
          is_active: true,
        },
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });

      // Filtrar por vigência localmente
      const dataOperacaoIcms = new Date(params.dataOperacao);
      const icmsData = icmsResult.data?.find(config => {
        const inicioVigencia = new Date(config.data_inicio_vigencia);
        const fimVigencia = config.data_fim_vigencia ? new Date(config.data_fim_vigencia) : null;
        return inicioVigencia <= dataOperacaoIcms && (!fimVigencia || fimVigencia >= dataOperacaoIcms);
      });

      if (icmsData) configs.icms = icmsData;
    }

    // Buscar IPI
    if (params.ncm) {
      const ipiResult = await EntityService.list<IPIConfig>({
        schema: 'tributario',
        table: 'ipi_config',
        companyId: params.companyId,
        filters: {
          ncm: params.ncm,
          is_active: true,
        },
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });

      // Filtrar por vigência localmente
      const dataOperacaoIpi = new Date(params.dataOperacao);
      const ipiData = ipiResult.data?.find(config => {
        const inicioVigencia = new Date(config.data_inicio_vigencia);
        const fimVigencia = config.data_fim_vigencia ? new Date(config.data_fim_vigencia) : null;
        return inicioVigencia <= dataOperacaoIpi && (!fimVigencia || fimVigencia >= dataOperacaoIpi);
      });

      if (ipiData) configs.ipi = ipiData;
    }

    // Buscar PIS/COFINS
    const regime = params.regimePisCofins || 'nao_cumulativo';
    const pisCofinsResult = await EntityService.list<PISCOFINSConfig>({
      schema: 'tributario',
      table: 'pis_cofins_config',
      companyId: params.companyId,
      filters: {
        regime_apuracao: regime,
        is_active: true,
      },
      orderBy: 'data_inicio_vigencia',
      orderDirection: 'DESC',
    });

    // Filtrar por vigência localmente
    const dataOperacaoPisCofins = new Date(params.dataOperacao);
    const pisCofinsData = pisCofinsResult.data?.find(config => {
      const inicioVigencia = new Date(config.data_inicio_vigencia);
      const fimVigencia = config.data_fim_vigencia ? new Date(config.data_fim_vigencia) : null;
      return inicioVigencia <= dataOperacaoPisCofins && (!fimVigencia || fimVigencia >= dataOperacaoPisCofins);
    });

    if (pisCofinsData) configs.pisCofins = pisCofinsData;

    // Buscar INSS/RAT/FAP
    const inssResult = await EntityService.list<INSSRATFAPConfig>({
      schema: 'tributario',
      table: 'inss_rat_fap_config',
      companyId: params.companyId,
      filters: {
        is_active: true,
      },
      orderBy: 'data_inicio_vigencia',
      orderDirection: 'DESC',
    });

    // Filtrar por vigência localmente
    const dataOperacaoInss = new Date(params.dataOperacao);
    const inssData = inssResult.data?.find(config => {
      const inicioVigencia = new Date(config.data_inicio_vigencia);
      const fimVigencia = config.data_fim_vigencia ? new Date(config.data_fim_vigencia) : null;
      return inicioVigencia <= dataOperacaoInss && (!fimVigencia || fimVigencia >= dataOperacaoInss);
    });

    if (inssData) configs.inss = inssData;

    return configs;
  }

  // =====================================================
  // CALCULAR ISS
  // =====================================================

  private async calcularISS(
    params: TaxCalculationParams,
    config?: ISSConfig
  ): Promise<TaxCalculationResult['iss']> {
    if (!config || !params.valorServico) {
      return undefined;
    }

    let baseCalculo = params.valorServico;

    // Aplicar deduções conforme tipo
    if (config.tipo_base_calculo === 'deducao_presumida') {
      baseCalculo = params.valorServico * (1 - config.percentual_deducao_presumida / 100);
    } else if (config.tipo_base_calculo === 'deducao_real' && params.valorDeducoes) {
      baseCalculo = params.valorServico - params.valorDeducoes;
    }

    const valorISS = baseCalculo * config.aliquota_iss;

    return {
      baseCalculo,
      aliquota: config.aliquota_iss,
      valorISS,
      tipoBaseCalculo: config.tipo_base_calculo,
      percentualDeducao: config.percentual_deducao_presumida,
    };
  }

  // =====================================================
  // CALCULAR ICMS
  // =====================================================

  private async calcularICMS(
    params: TaxCalculationParams,
    config?: ICMSConfig
  ): Promise<TaxCalculationResult['icms']> {
    if (!config || !params.valorMercadoria) {
      return undefined;
    }

    let baseCalculo = params.valorMercadoria;

    // Aplicar redução de base se houver
    if (config.percentual_reducao_base > 0) {
      baseCalculo = baseCalculo * (1 - config.percentual_reducao_base / 100);
    }

    const valorICMS = baseCalculo * config.aliquota_icms;

    // Calcular ICMS ST se houver
    let valorICMSST: number | undefined;
    let baseCalculoST: number | undefined;
    if (config.aliquota_icms_st) {
      baseCalculoST = params.valorMercadoria * (1 + (config.percentual_mva || 0) / 100);
      const icmsST = baseCalculoST * config.aliquota_icms_st;
      valorICMSST = Math.max(0, icmsST - valorICMS);
    }

    return {
      baseCalculo,
      aliquota: config.aliquota_icms,
      valorICMS,
      aliquotaST: config.aliquota_icms_st,
      valorICMSST,
      baseCalculoST,
      permiteCredito: config.permite_credito_insumos,
      percentualCredito: config.percentual_credito_insumos,
    };
  }

  // =====================================================
  // CALCULAR IPI
  // =====================================================

  private async calcularIPI(
    params: TaxCalculationParams,
    config?: IPIConfig
  ): Promise<TaxCalculationResult['ipi']> {
    if (!config || !params.valorMercadoria) {
      return undefined;
    }

    const baseCalculo = params.valorMercadoria;
    const valorIPI = baseCalculo * config.aliquota_ipi;

    return {
      baseCalculo,
      aliquota: config.aliquota_ipi,
      valorIPI,
      permiteCredito: config.permite_credito_ipi,
      percentualCredito: config.percentual_credito_ipi,
    };
  }

  // =====================================================
  // CALCULAR PIS
  // =====================================================

  private async calcularPIS(
    params: TaxCalculationParams,
    config: PISCOFINSConfig
  ): Promise<TaxCalculationResult['pis']> {
    const baseCalculo = params.valorTotal;
    let aliquota: number;
    let valorPIS: number;
    let valorCredito: number | undefined;

    if (config.regime_apuracao === 'cumulativo') {
      aliquota = config.aliquota_pis_cumulativo || 0;
      valorPIS = baseCalculo * aliquota;
    } else {
      aliquota = config.aliquota_pis_nao_cumulativo || 0;
      valorPIS = baseCalculo * aliquota;

      // Calcular créditos permitidos
      if (config.permite_credito_insumos && params.valorCreditoInsumos) {
        valorCredito = params.valorCreditoInsumos * aliquota * (config.percentual_credito_insumos / 100);
      }
    }

    return {
      baseCalculo,
      aliquota,
      valorPIS,
      regime: config.regime_apuracao,
      valorCredito,
    };
  }

  // =====================================================
  // CALCULAR COFINS
  // =====================================================

  private async calcularCOFINS(
    params: TaxCalculationParams,
    config: PISCOFINSConfig
  ): Promise<TaxCalculationResult['cofins']> {
    const baseCalculo = params.valorTotal;
    let aliquota: number;
    let valorCOFINS: number;
    let valorCredito: number | undefined;

    if (config.regime_apuracao === 'cumulativo') {
      aliquota = config.aliquota_cofins_cumulativo || 0;
      valorCOFINS = baseCalculo * aliquota;
    } else {
      aliquota = config.aliquota_cofins_nao_cumulativo || 0;
      valorCOFINS = baseCalculo * aliquota;

      // Calcular créditos permitidos
      if (config.permite_credito_insumos && params.valorCreditoInsumos) {
        valorCredito = params.valorCreditoInsumos * aliquota * (config.percentual_credito_insumos / 100);
      }
    }

    return {
      baseCalculo,
      aliquota,
      valorCOFINS,
      regime: config.regime_apuracao,
      valorCredito,
    };
  }

  // =====================================================
  // CALCULAR INSS
  // =====================================================

  private async calcularINSS(
    params: TaxCalculationParams,
    config: INSSRATFAPConfig
  ): Promise<TaxCalculationResult['inss']> {
    if (!params.valorServico) {
      return undefined;
    }

    const baseCalculo = params.valorServico;
    const aliquotaFinal = config.aliquota_final || (config.aliquota_rat * config.fap);
    const valorINSS = baseCalculo * aliquotaFinal;

    return {
      baseCalculo,
      aliquota: aliquotaFinal,
      valorINSS,
      aliquotaRAT: config.aliquota_rat,
      fap: config.fap,
      aliquotaFinal,
    };
  }

  // =====================================================
  // SIMULADOR DE CENÁRIOS
  // =====================================================

  async simularCenarios(params: TaxCalculationParams): Promise<{
    cenarioLegado: TaxCalculationResult;
    cenarioOtimizado: TaxCalculationResult;
    diferenca: number;
    economia: number;
  }> {
    // Cenário legado: usar configurações atuais
    const cenarioLegado = await this.calcularTributos(params);

    // Cenário otimizado: tentar diferentes configurações para minimizar tributos
    // (implementação simplificada - na prática, testaria múltiplas combinações)
    const cenarioOtimizado = await this.calcularTributos({
      ...params,
      tipoDeducao: 'real', // Sempre usar dedução real se possível
      regimePisCofins: 'nao_cumulativo', // Sempre não cumulativo se possível
    });

    const diferenca = cenarioLegado.totalTributos - cenarioOtimizado.totalTributos;
    const economia = (diferenca / cenarioLegado.totalTributos) * 100;

    return {
      cenarioLegado,
      cenarioOtimizado,
      diferenca,
      economia,
    };
  }
}

// Exportar instância singleton
export const taxCalculationEngine = TaxCalculationEngine.getInstance();

