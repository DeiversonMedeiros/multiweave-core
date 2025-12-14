// =====================================================
// HOOK: USAR M7 - GOVERNANÇA, PLANEJAMENTO E MÉRITO
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar módulo de governança e planejamento
// Autor: Sistema MultiWeave Core
// Módulo: M7 - Governança, Planejamento e Mérito

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { 
  SLAEtapa, 
  EventoPlanejamento, 
  KPIPlanejamentoGestor,
  SLAEtapaFormData,
  EventoPlanejamentoFilters,
  KPIPlanejamentoFilters
} from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';

interface UseGovernancaPlanejamentoReturn {
  // SLAs
  slas: SLAEtapa[];
  slasLoading: boolean;
  slasError: string | null;
  criarSLA: (data: SLAEtapaFormData) => Promise<void>;
  atualizarSLA: (id: string, data: Partial<SLAEtapaFormData>) => Promise<void>;
  deletarSLA: (id: string) => Promise<void>;
  criarSLAsPadrao: () => Promise<void>;
  
  // Eventos
  eventos: EventoPlanejamento[];
  eventosLoading: boolean;
  eventosError: string | null;
  eventosFilters: EventoPlanejamentoFilters;
  setEventosFilters: (filters: EventoPlanejamentoFilters) => void;
  marcarEventoResolvido: (id: string, observacoes?: string) => Promise<void>;
  
  // KPIs
  kpis: KPIPlanejamentoGestor[];
  kpisLoading: boolean;
  kpisError: string | null;
  kpisFilters: KPIPlanejamentoFilters;
  setKpisFilters: (filters: KPIPlanejamentoFilters) => void;
  calcularKPIs: (gestorId: string, periodoInicio: string, periodoFim: string) => Promise<void>;
  calcularKPIsTodosGestores: (periodoInicio: string, periodoFim: string) => Promise<void>;
  
  // Refresh
  refreshSLAs: () => Promise<void>;
  refreshEventos: () => Promise<void>;
  refreshKPIs: () => Promise<void>;
}

export function useGovernancaPlanejamento(): UseGovernancaPlanejamentoReturn {
  const { selectedCompany } = useCompany();
  
  // Estados para SLAs
  const [slas, setSlas] = useState<SLAEtapa[]>([]);
  const [slasLoading, setSlasLoading] = useState(false);
  const [slasError, setSlasError] = useState<string | null>(null);
  
  // Estados para Eventos
  const [eventos, setEventos] = useState<EventoPlanejamento[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [eventosError, setEventosError] = useState<string | null>(null);
  const [eventosFilters, setEventosFilters] = useState<EventoPlanejamentoFilters>({});
  
  // Estados para KPIs
  const [kpis, setKpis] = useState<KPIPlanejamentoGestor[]>([]);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [kpisFilters, setKpisFilters] = useState<KPIPlanejamentoFilters>({});
  
  // =====================================================
  // SLAs
  // =====================================================
  
  const refreshSLAs = async () => {
    if (!selectedCompany?.id) return;
    
    setSlasLoading(true);
    setSlasError(null);
    
    try {
      const result = await EntityService.list<SLAEtapa>({
        schema: 'financeiro',
        table: 'slas_etapas',
        companyId: selectedCompany.id,
        filters: { ativo: true },
        orderBy: 'etapa_processo',
        orderDirection: 'ASC'
      });
      
      setSlas(result.data || []);
    } catch (error: any) {
      setSlasError(error.message);
      console.error('Erro ao buscar SLAs:', error);
    } finally {
      setSlasLoading(false);
    }
  };
  
  const criarSLA = async (data: SLAEtapaFormData) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    try {
      await EntityService.create({
        schema: 'financeiro',
        table: 'slas_etapas',
        companyId: selectedCompany.id,
        data: {
          ...data,
          ativo: data.ativo ?? true
        }
      });
      
      toast.success('SLA criado com sucesso');
      await refreshSLAs();
    } catch (error: any) {
      toast.error(`Erro ao criar SLA: ${error.message}`);
      throw error;
    }
  };
  
  const atualizarSLA = async (id: string, data: Partial<SLAEtapaFormData>) => {
    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'slas_etapas',
        id,
        data
      });
      
      toast.success('SLA atualizado com sucesso');
      await refreshSLAs();
    } catch (error: any) {
      toast.error(`Erro ao atualizar SLA: ${error.message}`);
      throw error;
    }
  };
  
  const deletarSLA = async (id: string) => {
    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'slas_etapas',
        id,
        data: { ativo: false }
      });
      
      toast.success('SLA desativado com sucesso');
      await refreshSLAs();
    } catch (error: any) {
      toast.error(`Erro ao deletar SLA: ${error.message}`);
      throw error;
    }
  };
  
  const criarSLAsPadrao = async () => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    try {
      const { error } = await supabase.rpc('financeiro.criar_slas_padrao', {
        p_company_id: selectedCompany.id
      });
      
      if (error) throw error;
      
      toast.success('SLAs padrão criados com sucesso');
      await refreshSLAs();
    } catch (error: any) {
      toast.error(`Erro ao criar SLAs padrão: ${error.message}`);
      throw error;
    }
  };
  
  // =====================================================
  // EVENTOS
  // =====================================================
  
  const refreshEventos = async () => {
    if (!selectedCompany?.id) return;
    
    setEventosLoading(true);
    setEventosError(null);
    
    try {
      const filters: any = {};
      
      // Aplicar filtros
      if (eventosFilters.gestor_id) {
        filters.gestor_id = eventosFilters.gestor_id;
      }
      if (eventosFilters.tipo_evento) {
        filters.tipo_evento = eventosFilters.tipo_evento;
      }
      if (eventosFilters.etapa_processo) {
        filters.etapa_processo = eventosFilters.etapa_processo;
      }
      if (eventosFilters.violou_sla !== undefined) {
        filters.violou_sla = eventosFilters.violou_sla;
      }
      if (eventosFilters.resolvido !== undefined) {
        filters.resolvido = eventosFilters.resolvido;
      }
      
      const result = await EntityService.list<EventoPlanejamento>({
        schema: 'financeiro',
        table: 'eventos_planejamento',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'data_evento',
        orderDirection: 'DESC'
      });
      
      let eventos = result.data || [];
      
      // Filtrar por data (após buscar, pois EntityService pode não suportar range)
      if (eventosFilters.data_inicio) {
        eventos = eventos.filter(e => e.data_evento >= eventosFilters.data_inicio!);
      }
      if (eventosFilters.data_fim) {
        eventos = eventos.filter(e => e.data_evento <= eventosFilters.data_fim!);
      }
      
      setEventos(eventos);
    } catch (error: any) {
      setEventosError(error.message);
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setEventosLoading(false);
    }
  };
  
  const marcarEventoResolvido = async (id: string, observacoes?: string) => {
    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'eventos_planejamento',
        id,
        data: {
          resolvido: true,
          data_resolucao: new Date().toISOString(),
          observacoes: observacoes || undefined
        }
      });
      
      toast.success('Evento marcado como resolvido');
      await refreshEventos();
    } catch (error: any) {
      toast.error(`Erro ao marcar evento como resolvido: ${error.message}`);
      throw error;
    }
  };
  
  // =====================================================
  // KPIs
  // =====================================================
  
  const refreshKPIs = async () => {
    if (!selectedCompany?.id) return;
    
    setKpisLoading(true);
    setKpisError(null);
    
    try {
      const filters: any = {};
      
      // Aplicar filtros
      if (kpisFilters.gestor_id) {
        filters.gestor_id = kpisFilters.gestor_id;
      }
      
      const result = await EntityService.list<KPIPlanejamentoGestor>({
        schema: 'financeiro',
        table: 'kpis_planejamento_gestor',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'periodo_fim',
        orderDirection: 'DESC'
      });
      
      let kpis = result.data || [];
      
      // Filtrar por período (após buscar)
      if (kpisFilters.periodo_inicio) {
        kpis = kpis.filter(k => k.periodo_inicio >= kpisFilters.periodo_inicio!);
      }
      if (kpisFilters.periodo_fim) {
        kpis = kpis.filter(k => k.periodo_fim <= kpisFilters.periodo_fim!);
      }
      
      setKpis(kpis);
    } catch (error: any) {
      setKpisError(error.message);
      console.error('Erro ao buscar KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  };
  
  const calcularKPIs = async (gestorId: string, periodoInicio: string, periodoFim: string) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    try {
      const { error } = await supabase.rpc('financeiro.calcular_kpis_planejamento_gestor', {
        p_company_id: selectedCompany.id,
        p_gestor_id: gestorId,
        p_periodo_inicio: periodoInicio,
        p_periodo_fim: periodoFim
      });
      
      if (error) throw error;
      
      toast.success('KPIs calculados com sucesso');
      await refreshKPIs();
    } catch (error: any) {
      toast.error(`Erro ao calcular KPIs: ${error.message}`);
      throw error;
    }
  };
  
  const calcularKPIsTodosGestores = async (periodoInicio: string, periodoFim: string) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    try {
      // Buscar todos os usuários da empresa usando RPC
      const { data: gestores, error: gestoresError } = await supabase.rpc('get_users_by_company', {
        p_company_id: selectedCompany.id
      });
      
      if (gestoresError) throw gestoresError;
      
      if (!gestores || gestores.length === 0) {
        toast.info('Nenhum gestor encontrado');
        return;
      }
      
      // Extrair IDs dos gestores
      const gestorIds = gestores.map(g => g.id);
      
      // Calcular KPIs para cada gestor
      const promises = gestorIds.map(gestorId =>
        supabase.rpc('financeiro.calcular_kpis_planejamento_gestor', {
          p_company_id: selectedCompany.id,
          p_gestor_id: gestorId,
          p_periodo_inicio: periodoInicio,
          p_periodo_fim: periodoFim
        })
      );
      
      await Promise.all(promises);
      
      toast.success(`KPIs calculados para ${gestorIds.length} gestores`);
      await refreshKPIs();
    } catch (error: any) {
      toast.error(`Erro ao calcular KPIs: ${error.message}`);
      throw error;
    }
  };
  
  // =====================================================
  // EFEITOS
  // =====================================================
  
  useEffect(() => {
    if (selectedCompany?.id) {
      refreshSLAs();
      refreshKPIs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id]);
  
  useEffect(() => {
    if (selectedCompany?.id) {
      refreshEventos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id, eventosFilters]);
  
  return {
    // SLAs
    slas,
    slasLoading,
    slasError,
    criarSLA,
    atualizarSLA,
    deletarSLA,
    criarSLAsPadrao,
    
    // Eventos
    eventos,
    eventosLoading,
    eventosError,
    eventosFilters,
    setEventosFilters,
    marcarEventoResolvido,
    
    // KPIs
    kpis,
    kpisLoading,
    kpisError,
    kpisFilters,
    setKpisFilters,
    calcularKPIs,
    calcularKPIsTodosGestores,
    
    // Refresh
    refreshSLAs,
    refreshEventos,
    refreshKPIs
  };
}
