// =====================================================
// HOOK: USAR PARAMETRIZAÇÃO TRIBUTÁRIA
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar parametrização tributária
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import {
  ISSConfig,
  ICMSConfig,
  IPIConfig,
  PISCOFINSConfig,
  INSSRATFAPConfig,
} from '@/integrations/supabase/financial-types';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';

interface UseParametrizacaoTributariaReturn {
  // ISS
  issConfigs: ISSConfig[];
  loadingISS: boolean;
  createISSConfig: (data: Partial<ISSConfig>) => Promise<ISSConfig>;
  updateISSConfig: (id: string, data: Partial<ISSConfig>) => Promise<void>;
  deleteISSConfig: (id: string) => Promise<void>;

  // ICMS
  icmsConfigs: ICMSConfig[];
  loadingICMS: boolean;
  createICMSConfig: (data: Partial<ICMSConfig>) => Promise<ICMSConfig>;
  updateICMSConfig: (id: string, data: Partial<ICMSConfig>) => Promise<void>;
  deleteICMSConfig: (id: string) => Promise<void>;

  // IPI
  ipiConfigs: IPIConfig[];
  loadingIPI: boolean;
  createIPIConfig: (data: Partial<IPIConfig>) => Promise<IPIConfig>;
  updateIPIConfig: (id: string, data: Partial<IPIConfig>) => Promise<void>;
  deleteIPIConfig: (id: string) => Promise<void>;

  // PIS/COFINS
  pisCofinsConfigs: PISCOFINSConfig[];
  loadingPISCofins: boolean;
  createPISCofinsConfig: (data: Partial<PISCOFINSConfig>) => Promise<PISCOFINSConfig>;
  updatePISCofinsConfig: (id: string, data: Partial<PISCOFINSConfig>) => Promise<void>;
  deletePISCofinsConfig: (id: string) => Promise<void>;

  // INSS/RAT/FAP
  inssConfigs: INSSRATFAPConfig[];
  loadingINSS: boolean;
  createINSSConfig: (data: Partial<INSSRATFAPConfig>) => Promise<INSSRATFAPConfig>;
  updateINSSConfig: (id: string, data: Partial<INSSRATFAPConfig>) => Promise<void>;
  deleteINSSConfig: (id: string) => Promise<void>;

  refresh: () => Promise<void>;
}

export function useParametrizacaoTributaria(): UseParametrizacaoTributariaReturn {
  const { selectedCompany } = useCompany();

  const [issConfigs, setIssConfigs] = useState<ISSConfig[]>([]);
  const [icmsConfigs, setIcmsConfigs] = useState<ICMSConfig[]>([]);
  const [ipiConfigs, setIpiConfigs] = useState<IPIConfig[]>([]);
  const [pisCofinsConfigs, setPisCofinsConfigs] = useState<PISCOFINSConfig[]>([]);
  const [inssConfigs, setInssConfigs] = useState<INSSRATFAPConfig[]>([]);

  const [loadingISS, setLoadingISS] = useState(true);
  const [loadingICMS, setLoadingICMS] = useState(true);
  const [loadingIPI, setLoadingIPI] = useState(true);
  const [loadingPISCofins, setLoadingPISCofins] = useState(true);
  const [loadingINSS, setLoadingINSS] = useState(true);

  // Carregar configurações ISS
  const loadISSConfigs = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingISS(true);
      const result = await EntityService.list<ISSConfig>({
        schema: 'tributario',
        table: 'iss_config',
        companyId: selectedCompany.id,
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });
      setIssConfigs((result.data as ISSConfig[]) || []);
    } catch (err) {
      console.error('Erro ao carregar configurações ISS:', err);
    } finally {
      setLoadingISS(false);
    }
  };

  // Carregar configurações ICMS
  const loadICMSConfigs = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingICMS(true);
      const result = await EntityService.list<ICMSConfig>({
        schema: 'tributario',
        table: 'icms_config',
        companyId: selectedCompany.id,
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });
      setIcmsConfigs((result.data as ICMSConfig[]) || []);
    } catch (err) {
      console.error('Erro ao carregar configurações ICMS:', err);
    } finally {
      setLoadingICMS(false);
    }
  };

  // Carregar configurações IPI
  const loadIPIConfigs = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingIPI(true);
      const result = await EntityService.list<IPIConfig>({
        schema: 'tributario',
        table: 'ipi_config',
        companyId: selectedCompany.id,
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });
      setIpiConfigs((result.data as IPIConfig[]) || []);
    } catch (err) {
      console.error('Erro ao carregar configurações IPI:', err);
    } finally {
      setLoadingIPI(false);
    }
  };

  // Carregar configurações PIS/COFINS
  const loadPISCofinsConfigs = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingPISCofins(true);
      const result = await EntityService.list<PISCOFINSConfig>({
        schema: 'tributario',
        table: 'pis_cofins_config',
        companyId: selectedCompany.id,
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });
      setPisCofinsConfigs((result.data as PISCOFINSConfig[]) || []);
    } catch (err) {
      console.error('Erro ao carregar configurações PIS/COFINS:', err);
    } finally {
      setLoadingPISCofins(false);
    }
  };

  // Carregar configurações INSS
  const loadINSSConfigs = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingINSS(true);
      const result = await EntityService.list<INSSRATFAPConfig>({
        schema: 'tributario',
        table: 'inss_rat_fap_config',
        companyId: selectedCompany.id,
        orderBy: 'data_inicio_vigencia',
        orderDirection: 'DESC',
      });
      setInssConfigs((result.data as INSSRATFAPConfig[]) || []);
    } catch (err) {
      console.error('Erro ao carregar configurações INSS:', err);
    } finally {
      setLoadingINSS(false);
    }
  };

  // CRUD ISS
  const createISSConfig = async (data: Partial<ISSConfig>): Promise<ISSConfig> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    const result = await EntityService.create<ISSConfig>({
      schema: 'tributario',
      table: 'iss_config',
      companyId: selectedCompany.id,
      data: { ...data, company_id: selectedCompany.id } as any,
    });
    toast.success('Configuração ISS criada com sucesso');
    await loadISSConfigs();
    return result;
  };

  const updateISSConfig = async (id: string, data: Partial<ISSConfig>): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.update({
      schema: 'tributario',
      table: 'iss_config',
      companyId: selectedCompany.id,
      id,
      data,
    });
    toast.success('Configuração ISS atualizada');
    await loadISSConfigs();
  };

  const deleteISSConfig = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'tributario',
      table: 'iss_config',
      companyId: selectedCompany.id,
      id,
    });
    toast.success('Configuração ISS excluída');
    await loadISSConfigs();
  };

  // CRUD ICMS
  const createICMSConfig = async (data: Partial<ICMSConfig>): Promise<ICMSConfig> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    const result = await EntityService.create<ICMSConfig>({
      schema: 'tributario',
      table: 'icms_config',
      companyId: selectedCompany.id,
      data: { ...data, company_id: selectedCompany.id } as any,
    });
    toast.success('Configuração ICMS criada com sucesso');
    await loadICMSConfigs();
    return result;
  };

  const updateICMSConfig = async (id: string, data: Partial<ICMSConfig>): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.update({
      schema: 'tributario',
      table: 'icms_config',
      companyId: selectedCompany.id,
      id,
      data,
    });
    toast.success('Configuração ICMS atualizada');
    await loadICMSConfigs();
  };

  const deleteICMSConfig = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'tributario',
      table: 'icms_config',
      companyId: selectedCompany.id,
      id,
    });
    toast.success('Configuração ICMS excluída');
    await loadICMSConfigs();
  };

  // CRUD IPI
  const createIPIConfig = async (data: Partial<IPIConfig>): Promise<IPIConfig> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    const result = await EntityService.create<IPIConfig>({
      schema: 'tributario',
      table: 'ipi_config',
      companyId: selectedCompany.id,
      data: { ...data, company_id: selectedCompany.id } as any,
    });
    toast.success('Configuração IPI criada com sucesso');
    await loadIPIConfigs();
    return result;
  };

  const updateIPIConfig = async (id: string, data: Partial<IPIConfig>): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.update({
      schema: 'tributario',
      table: 'ipi_config',
      companyId: selectedCompany.id,
      id,
      data,
    });
    toast.success('Configuração IPI atualizada');
    await loadIPIConfigs();
  };

  const deleteIPIConfig = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'tributario',
      table: 'ipi_config',
      companyId: selectedCompany.id,
      id,
    });
    toast.success('Configuração IPI excluída');
    await loadIPIConfigs();
  };

  // CRUD PIS/COFINS
  const createPISCofinsConfig = async (data: Partial<PISCOFINSConfig>): Promise<PISCOFINSConfig> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    const result = await EntityService.create<PISCOFINSConfig>({
      schema: 'tributario',
      table: 'pis_cofins_config',
      companyId: selectedCompany.id,
      data: { ...data, company_id: selectedCompany.id } as any,
    });
    toast.success('Configuração PIS/COFINS criada com sucesso');
    await loadPISCofinsConfigs();
    return result;
  };

  const updatePISCofinsConfig = async (id: string, data: Partial<PISCOFINSConfig>): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.update({
      schema: 'tributario',
      table: 'pis_cofins_config',
      companyId: selectedCompany.id,
      id,
      data,
    });
    toast.success('Configuração PIS/COFINS atualizada');
    await loadPISCofinsConfigs();
  };

  const deletePISCofinsConfig = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'tributario',
      table: 'pis_cofins_config',
      companyId: selectedCompany.id,
      id,
    });
    toast.success('Configuração PIS/COFINS excluída');
    await loadPISCofinsConfigs();
  };

  // CRUD INSS
  const createINSSConfig = async (data: Partial<INSSRATFAPConfig>): Promise<INSSRATFAPConfig> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Calcular aliquota_final se não fornecido
    const aliquotaFinal = data.aliquota_final ?? 
      ((data.aliquota_rat || 0) * (data.fap || 1));
    
    const result = await EntityService.create<INSSRATFAPConfig>({
      schema: 'tributario',
      table: 'inss_rat_fap_config',
      companyId: selectedCompany.id,
      data: { 
        ...data, 
        company_id: selectedCompany.id,
        aliquota_final: aliquotaFinal,
      } as any,
    });
    toast.success('Configuração INSS criada com sucesso');
    await loadINSSConfigs();
    return result;
  };

  const updateINSSConfig = async (id: string, data: Partial<INSSRATFAPConfig>): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Recalcular aliquota_final se necessário
    if (data.aliquota_rat !== undefined || data.fap !== undefined) {
      const config = inssConfigs.find(c => c.id === id);
      const aliquotaRAT = data.aliquota_rat ?? config?.aliquota_rat ?? 0;
      const fap = data.fap ?? config?.fap ?? 1;
      data.aliquota_final = aliquotaRAT * fap;
    }
    
    await EntityService.update({
      schema: 'tributario',
      table: 'inss_rat_fap_config',
      companyId: selectedCompany.id,
      id,
      data,
    });
    toast.success('Configuração INSS atualizada');
    await loadINSSConfigs();
  };

  const deleteINSSConfig = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'tributario',
      table: 'inss_rat_fap_config',
      companyId: selectedCompany.id,
      id,
    });
    toast.success('Configuração INSS excluída');
    await loadINSSConfigs();
  };

  // Refresh
  const refresh = async () => {
    await Promise.all([
      loadISSConfigs(),
      loadICMSConfigs(),
      loadIPIConfigs(),
      loadPISCofinsConfigs(),
      loadINSSConfigs(),
    ]);
  };

  useEffect(() => {
    refresh();
  }, [selectedCompany?.id]);

  return {
    issConfigs,
    loadingISS,
    createISSConfig,
    updateISSConfig,
    deleteISSConfig,
    icmsConfigs,
    loadingICMS,
    createICMSConfig,
    updateICMSConfig,
    deleteICMSConfig,
    ipiConfigs,
    loadingIPI,
    createIPIConfig,
    updateIPIConfig,
    deleteIPIConfig,
    pisCofinsConfigs,
    loadingPISCofins,
    createPISCofinsConfig,
    updatePISCofinsConfig,
    deletePISCofinsConfig,
    inssConfigs,
    loadingINSS,
    createINSSConfig,
    updateINSSConfig,
    deleteINSSConfig,
    refresh,
  };
}

