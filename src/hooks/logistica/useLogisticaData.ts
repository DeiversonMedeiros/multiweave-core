// =====================================================
// HOOKS PARA MÓDULO LOGÍSTICA
// Sistema ERP MultiWeave Core
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { queryConfig } from '@/lib/react-query-config';
import type {
  LogisticsRequest,
  Trip,
  TripItem,
  TripChecklist,
  TripDelivery,
  TripCost,
  VehicleAvailability,
  LogisticsRequestFormData,
  TripFormData,
  ChecklistFormData,
  DeliveryFormData,
  TripCostFormData,
} from '@/types/logistica';

// =====================================================
// 1. HOOKS PARA SOLICITAÇÕES DE LOGÍSTICA
// =====================================================

export const useLogisticsRequests = (filters?: {
  status?: string;
  tipo_transporte?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['logistica', 'requests', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.rpc('list_logistics_requests', {
        p_company_id: selectedCompany.id,
        p_status: filters?.status || null,
        p_tipo_transporte: filters?.tipo_transporte || null,
        p_search: filters?.search || null,
        p_limit: filters?.limit || 50,
        p_offset: filters?.offset || 0,
      });

      if (error) throw error;
      return data as LogisticsRequest[];
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useLogisticsRequest = (requestId: string) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['logistica', 'request', requestId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !requestId) throw new Error('Dados necessários não fornecidos');

      const { data, error } = await supabase.rpc('get_logistics_request', {
        p_request_id: requestId,
        p_company_id: selectedCompany.id,
      });

      if (error) throw error;
      return (data as LogisticsRequest[])[0];
    },
    enabled: !!selectedCompany?.id && !!requestId,
  });
};

export const useCreateLogisticsRequest = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: LogisticsRequestFormData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const requestParams = {
        p_company_id: selectedCompany.id,
        p_tipo_transporte: data.tipo_transporte,
        p_setor_solicitante: data.setor_solicitante || 'na', // Valor padrão se não fornecido
        p_previsao_envio: data.previsao_envio,
        p_prazo_destino: data.prazo_destino,
        p_km_estimado: data.km_estimado || null,
        p_endereco_retirada: data.endereco_retirada,
        p_endereco_entrega: data.endereco_entrega,
        p_cep_retirada: data.cep_retirada || null,
        p_cep_entrega: data.cep_entrega || null,
        p_nome_responsavel_remetente: data.nome_responsavel_remetente,
        p_cpf_responsavel_remetente: data.cpf_responsavel_remetente || null,
        p_telefone_responsavel_remetente: data.telefone_responsavel_remetente,
        p_nome_responsavel_destinatario: data.nome_responsavel_destinatario,
        p_cpf_responsavel_destinatario: data.cpf_responsavel_destinatario || null,
        p_telefone_responsavel_destinatario: data.telefone_responsavel_destinatario || null,
        p_peso: data.peso || null,
        p_largura: data.largura || null,
        p_altura: data.altura || null,
        p_comprimento: data.comprimento || null,
        p_quantidade_volumes: data.quantidade_volumes || null,
        p_project_id: data.project_id || null,
        p_cost_center_id: data.cost_center_id || null,
        p_os_number: data.os_number || null, // Campo removido do formulário, mas mantido para compatibilidade
        p_segmento: data.segmento || null,
        p_cliente: data.cliente || null,
        p_observacoes: data.observacoes || null,
        p_solicitado_por: userCompany.profile_id,
      };

      const { data: requestId, error } = await supabase.rpc('create_logistics_request', requestParams);

      if (error) {
        console.error('[useCreateLogisticsRequest] Erro ao criar solicitação:', error);
        console.error('[useCreateLogisticsRequest] Parâmetros enviados:', requestParams);
        throw error;
      }
      return requestId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'requests'] });
      toast.success('Solicitação de logística criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar solicitação: ' + error.message);
    },
  });
};

export const useApproveLogisticsRequest = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      observacoes,
    }: {
      requestId: string;
      status: 'aprovado' | 'rejeitado';
      observacoes?: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase.rpc('approve_logistics_request', {
        p_request_id: requestId,
        p_company_id: selectedCompany.id,
        p_status: status,
        p_aprovado_por: userCompany.profile_id,
        p_observacoes: observacoes || null,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'requests'] });
      toast.success('Solicitação processada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao processar solicitação: ' + error.message);
    },
  });
};

// =====================================================
// 2. HOOKS PARA VIAGENS
// =====================================================

export const useTrips = (filters?: {
  status?: string;
  vehicle_id?: string;
  driver_id?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['logistica', 'trips', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.rpc('list_trips', {
        p_company_id: selectedCompany.id,
        p_status: filters?.status || null,
        p_vehicle_id: filters?.vehicle_id || null,
        p_driver_id: filters?.driver_id || null,
        p_data_inicio: filters?.data_inicio || null,
        p_data_fim: filters?.data_fim || null,
        p_search: filters?.search || null,
        p_limit: filters?.limit || 50,
        p_offset: filters?.offset || 0,
      });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

// Hook para verificar conflitos de viagem
export const useCheckTripConflict = () => {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      vehicle_id: string;
      data_saida: string;
      hora_saida?: string;
      trip_id?: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      // Usar wrapper no schema public
      const { data, error } = await supabase.rpc('check_trip_conflict', {
        p_company_id: selectedCompany.id,
        p_vehicle_id: params.vehicle_id,
        p_data_saida: params.data_saida,
        p_hora_saida: params.hora_saida || null,
        p_trip_id: params.trip_id || null,
      });

      if (error) throw error;
      return data?.[0] || { has_conflict: false };
    },
  });
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: TripFormData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const { data: tripId, error } = await supabase.rpc('create_trip', {
        p_company_id: selectedCompany.id,
        p_request_id: data.request_id,
        p_vehicle_id: data.vehicle_id,
        p_driver_id: data.driver_id,
        p_data_saida: data.data_saida,
        p_hora_saida: data.hora_saida || null,
        p_km_inicial: data.km_inicial || null,
        p_project_id: data.project_id || null,
        p_cost_center_id: data.cost_center_id || null,
        p_os_number: data.os_number || null,
        p_observacoes: data.observacoes || null,
        p_created_by: userCompany.profile_id,
      });

      if (error) throw error;
      return tripId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'trips'] });
      queryClient.invalidateQueries({ queryKey: ['logistica', 'vehicle-availability'] });
      toast.success('Viagem criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar viagem: ' + error.message);
    },
  });
};

export const useUpdateTripStatus = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({
      tripId,
      status,
      km_final,
      data_chegada,
      hora_chegada,
    }: {
      tripId: string;
      status: 'agendada' | 'em_viagem' | 'concluida' | 'cancelada';
      km_final?: number;
      data_chegada?: string;
      hora_chegada?: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.rpc('update_trip_status', {
        p_trip_id: tripId,
        p_company_id: selectedCompany.id,
        p_status: status,
        p_km_final: km_final || null,
        p_data_chegada: data_chegada || null,
        p_hora_chegada: hora_chegada || null,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'trips'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      toast.success('Status da viagem atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
};

// =====================================================
// 3. HOOKS PARA DISPONIBILIDADE DE VEÍCULOS (CALENDÁRIO)
// =====================================================

export const useVehicleAvailability = (dataInicio: string, dataFim: string, vehicleId?: string) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['logistica', 'vehicle-availability', selectedCompany?.id, dataInicio, dataFim, vehicleId],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.rpc('get_vehicle_availability', {
        p_company_id: selectedCompany.id,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
        p_vehicle_id: vehicleId || null,
      });

      if (error) throw error;
      return data as VehicleAvailability[];
    },
    enabled: !!selectedCompany?.id && !!dataInicio && !!dataFim,
    ...queryConfig.semiStatic,
  });
};

// =====================================================
// 4. HOOKS PARA ITENS DE VIAGEM
// =====================================================

export const useTripItems = (tripId: string) => {
  return useQuery({
    queryKey: ['logistica', 'trip-items', tripId],
    queryFn: async () => {
      if (!tripId) throw new Error('ID da viagem não fornecido');

      const { data, error } = await supabase.rpc('list_trip_items', {
        p_trip_id: tripId,
      });

      if (error) throw error;
      return data as TripItem[];
    },
    enabled: !!tripId,
  });
};

export const useCreateTripItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      trip_id: string;
      descricao: string;
      quantidade: number;
      unidade_medida?: string;
      peso?: number;
      observacoes?: string;
      material_id?: string;
    }) => {
      const { data: itemId, error } = await supabase.rpc('create_trip_item', {
        p_trip_id: data.trip_id,
        p_descricao: data.descricao,
        p_quantidade: data.quantidade,
        p_unidade_medida: data.unidade_medida || null,
        p_peso: data.peso || null,
        p_observacoes: data.observacoes || null,
        p_material_id: data.material_id || null,
      });

      if (error) throw error;
      return itemId as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'trip-items', variables.trip_id] });
      toast.success('Item adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar item: ' + error.message);
    },
  });
};

// =====================================================
// 5. HOOKS PARA CHECKLIST DE CONFERÊNCIA
// =====================================================

export const useSaveTripChecklist = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: { trip_id: string } & ChecklistFormData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const { data: checklistId, error } = await supabase.rpc('save_trip_checklist', {
        p_trip_id: data.trip_id,
        p_items_conferidos: data.items_conferidos as any,
        p_observacoes: data.observacoes || null,
        p_conferido_por: userCompany.profile_id,
      });

      if (error) throw error;
      return checklistId as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'trips'] });
      toast.success('Checklist salvo com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar checklist: ' + error.message);
    },
  });
};

// =====================================================
// 6. HOOKS PARA ENTREGAS
// =====================================================

export const useCreateTripDelivery = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: { trip_id: string } & DeliveryFormData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const { data: deliveryId, error } = await supabase.rpc('create_trip_delivery', {
        p_trip_id: data.trip_id,
        p_data_entrega: data.data_entrega,
        p_hora_entrega: data.hora_entrega || null,
        p_recebido_por: data.recebido_por,
        p_cpf_recebedor: data.cpf_recebedor || null,
        p_telefone_recebedor: data.telefone_recebedor || null,
        p_items_entregues: data.items_entregues as any,
        p_todos_itens_entregues: data.todos_itens_entregues,
        p_observacoes: data.observacoes || null,
        p_comprovante_url: data.comprovante_url || null,
        p_entregue_por: userCompany.profile_id,
      });

      if (error) throw error;
      return deliveryId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'trips'] });
      toast.success('Entrega registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar entrega: ' + error.message);
    },
  });
};

// =====================================================
// 7. HOOKS PARA CUSTOS LOGÍSTICOS
// =====================================================

export const useTripCosts = (filters?: {
  trip_id?: string;
  cost_center_id?: string;
  project_id?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['logistica', 'costs', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.rpc('list_trip_costs', {
        p_company_id: selectedCompany.id,
        p_trip_id: filters?.trip_id || null,
        p_cost_center_id: filters?.cost_center_id || null,
        p_project_id: filters?.project_id || null,
        p_data_inicio: filters?.data_inicio || null,
        p_data_fim: filters?.data_fim || null,
        p_limit: filters?.limit || 50,
        p_offset: filters?.offset || 0,
      });

      if (error) throw error;
      return data as TripCost[];
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useCreateTripCost = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: TripCostFormData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar profile_id do usuário através de user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .single();

      if (!userCompany?.profile_id) throw new Error('Perfil não encontrado');

      const { data: costId, error } = await supabase.rpc('create_trip_cost', {
        p_company_id: selectedCompany.id,
        p_trip_id: data.trip_id || null,
        p_tipo_custo: data.tipo_custo,
        p_descricao: data.descricao,
        p_valor: data.valor,
        p_data_custo: data.data_custo,
        p_vehicle_id: data.vehicle_id || null,
        p_cost_center_id: data.cost_center_id,
        p_project_id: data.project_id || null,
        p_os_number: data.os_number || null,
        p_comprovante_url: data.comprovante_url || null,
        p_observacoes: data.observacoes || null,
        p_created_by: userCompany.profile_id,
      });

      if (error) throw error;
      return costId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica', 'costs'] });
      toast.success('Custo registrado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar custo: ' + error.message);
    },
  });
};

