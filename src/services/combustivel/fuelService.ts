import { EntityService } from '@/services/generic/entityService';
import type {
  FuelTypeConfig,
  ApprovedGasStation,
  RefuelLimit,
  FuelBudget,
  BudgetRevision,
  RefuelRequest,
  ScheduledRefuel,
  RefuelRecord,
  VehicleConsumption,
  DriverConsumption,
  ConsumptionAlert,
  RefuelRequestFormData,
  RefuelRecordFormData,
  FuelBudgetFormData,
  RecargaConfirmFormData
} from '@/types/combustivel';

export class FuelService {
  // =====================================================
  // TIPOS DE COMBUSTÍVEL
  // =====================================================

  static async getFuelTypes(companyId: string, filters?: { ativo?: boolean }) {
    return EntityService.list<FuelTypeConfig>({
      schema: 'combustivel',
      table: 'fuel_types',
      companyId,
      filters: filters || {},
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
  }

  static async getFuelType(companyId: string, id: string) {
    return EntityService.get<FuelTypeConfig>({
      schema: 'combustivel',
      table: 'fuel_types',
      companyId,
      id
    });
  }

  static async createFuelType(companyId: string, data: Partial<FuelTypeConfig>) {
    return EntityService.create<FuelTypeConfig>({
      schema: 'combustivel',
      table: 'fuel_types',
      companyId,
      data: { ...data, company_id: companyId }
    });
  }

  static async updateFuelType(companyId: string, id: string, data: Partial<FuelTypeConfig>) {
    return EntityService.update<FuelTypeConfig>({
      schema: 'combustivel',
      table: 'fuel_types',
      companyId,
      id,
      data
    });
  }

  static async deleteFuelType(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'fuel_types',
      companyId,
      id
    });
  }

  // =====================================================
  // POSTOS HOMOLOGADOS
  // =====================================================

  static async getGasStations(companyId: string, filters?: { ativo?: boolean; search?: string }) {
    return EntityService.list<ApprovedGasStation>({
      schema: 'combustivel',
      table: 'approved_gas_stations',
      companyId,
      filters: filters || {},
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
  }

  static async getGasStation(companyId: string, id: string) {
    return EntityService.get<ApprovedGasStation>({
      schema: 'combustivel',
      table: 'approved_gas_stations',
      companyId,
      id
    });
  }

  static async createGasStation(companyId: string, data: Partial<ApprovedGasStation>) {
    return EntityService.create<ApprovedGasStation>({
      schema: 'combustivel',
      table: 'approved_gas_stations',
      companyId,
      data: { ...data, company_id: companyId }
    });
  }

  static async updateGasStation(companyId: string, id: string, data: Partial<ApprovedGasStation>) {
    return EntityService.update<ApprovedGasStation>({
      schema: 'combustivel',
      table: 'approved_gas_stations',
      companyId,
      id,
      data
    });
  }

  static async deleteGasStation(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'approved_gas_stations',
      companyId,
      id
    });
  }

  // =====================================================
  // LIMITES DE ABASTECIMENTO
  // =====================================================

  static async getRefuelLimits(companyId: string, filters?: {
    tipo_limite?: string;
    veiculo_id?: string;
    colaborador_id?: string;
    centro_custo_id?: string;
    projeto_id?: string;
    ativo?: boolean;
  }) {
    return EntityService.list<RefuelLimit>({
      schema: 'combustivel',
      table: 'refuel_limits',
      companyId,
      filters: filters || {},
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getRefuelLimit(companyId: string, id: string) {
    return EntityService.get<RefuelLimit>({
      schema: 'combustivel',
      table: 'refuel_limits',
      companyId,
      id
    });
  }

  static async createRefuelLimit(companyId: string, data: Partial<RefuelLimit>) {
    return EntityService.create<RefuelLimit>({
      schema: 'combustivel',
      table: 'refuel_limits',
      companyId,
      data: { ...data, company_id: companyId }
    });
  }

  static async updateRefuelLimit(companyId: string, id: string, data: Partial<RefuelLimit>) {
    return EntityService.update<RefuelLimit>({
      schema: 'combustivel',
      table: 'refuel_limits',
      companyId,
      id,
      data
    });
  }

  static async deleteRefuelLimit(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'refuel_limits',
      companyId,
      id
    });
  }

  // =====================================================
  // ORÇAMENTOS
  // =====================================================

  static async getBudgets(companyId: string, filters?: {
    centro_custo_id?: string;
    projeto_id?: string;
    condutor_id?: string;
    mes?: number;
    ano?: number;
  }) {
    return EntityService.list<FuelBudget>({
      schema: 'combustivel',
      table: 'fuel_budgets',
      companyId,
      filters: filters || {},
      orderBy: 'ano, mes',
      orderDirection: 'DESC'
    });
  }

  static async getBudget(companyId: string, id: string) {
    return EntityService.get<FuelBudget>({
      schema: 'combustivel',
      table: 'fuel_budgets',
      companyId,
      id
    });
  }

  static async createBudget(companyId: string, data: FuelBudgetFormData, userId?: string) {
    return EntityService.create<FuelBudget>({
      schema: 'combustivel',
      table: 'fuel_budgets',
      companyId,
      data: {
        ...data,
        company_id: companyId,
        valor_consumido: 0,
        litros_consumidos: 0,
        created_by: userId
      }
    });
  }

  static async updateBudget(companyId: string, id: string, data: Partial<FuelBudgetFormData>, userId?: string) {
    // Criar registro de revisão se o valor foi alterado
    const budget = await this.getBudget(companyId, id);
    if (budget && data.valor_orcado && data.valor_orcado !== budget.valor_orcado) {
      await this.createBudgetRevision(companyId, id, {
        valor_anterior: budget.valor_orcado,
        valor_novo: data.valor_orcado,
        motivo: data.observacoes || 'Revisão de orçamento',
        revisado_por: userId
      });
    }

    return EntityService.update<FuelBudget>({
      schema: 'combustivel',
      table: 'fuel_budgets',
      companyId,
      id,
      data
    });
  }

  static async deleteBudget(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'fuel_budgets',
      companyId,
      id
    });
  }

  static async getBudgetRevisions(companyId: string, budgetId: string) {
    return EntityService.list<BudgetRevision>({
      schema: 'combustivel',
      table: 'budget_revisions',
      companyId,
      filters: { budget_id: budgetId },
      orderBy: 'revisado_em',
      orderDirection: 'DESC'
    });
  }

  static async createBudgetRevision(
    companyId: string,
    budgetId: string,
    data: {
      valor_anterior: number;
      valor_novo: number;
      motivo: string;
      revisado_por?: string;
    }
  ) {
    return EntityService.create<BudgetRevision>({
      schema: 'combustivel',
      table: 'budget_revisions',
      companyId,
      data: {
        budget_id: budgetId,
        ...data,
        revisado_em: new Date().toISOString()
      }
    });
  }

  // =====================================================
  // SOLICITAÇÕES DE ABASTECIMENTO
  // =====================================================

  static async getRefuelRequests(companyId: string, filters?: {
    status?: string;
    condutor_id?: string;
    veiculo_id?: string;
    centro_custo_id?: string;
    projeto_id?: string;
    solicitado_por?: string;
    search?: string;
  }) {
    return EntityService.list<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      filters: filters || {},
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async getRefuelRequest(companyId: string, id: string) {
    return EntityService.get<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      id
    });
  }

  static async createRefuelRequest(companyId: string, data: RefuelRequestFormData, userId?: string) {
    return EntityService.create<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      data: {
        ...data,
        company_id: companyId,
        status: 'pendente',
        solicitado_por: userId,
        recarga_confirmada: false
      }
    });
  }

  static async updateRefuelRequest(companyId: string, id: string, data: Partial<RefuelRequestFormData>) {
    return EntityService.update<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      id,
      data
    });
  }

  static async cancelRefuelRequest(companyId: string, id: string) {
    return EntityService.update<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      id,
      data: { status: 'cancelada' }
    });
  }

  static async confirmRecarga(
    companyId: string,
    requestId: string,
    data: RecargaConfirmFormData,
    userId?: string
  ) {
    return EntityService.update<RefuelRequest>({
      schema: 'combustivel',
      table: 'refuel_requests',
      companyId,
      id: requestId,
      data: {
        recarga_confirmada: true,
        valor_recarregado: data.valor_recarregado,
        recarga_anexo_url: data.recarga_anexo_url,
        recarga_observacoes: data.recarga_observacoes,
        recarga_confirmada_por: userId,
        recarga_confirmada_em: new Date().toISOString(),
        status: 'recarregada'
      }
    });
  }

  // =====================================================
  // ABASTECIMENTOS PROGRAMADOS
  // =====================================================

  static async getScheduledRefuels(companyId: string, filters?: {
    condutor_id?: string;
    veiculo_id?: string;
    ativo?: boolean;
  }) {
    return EntityService.list<ScheduledRefuel>({
      schema: 'combustivel',
      table: 'scheduled_refuels',
      companyId,
      filters: filters || {},
      orderBy: 'data_inicio',
      orderDirection: 'DESC'
    });
  }

  static async getScheduledRefuel(companyId: string, id: string) {
    return EntityService.get<ScheduledRefuel>({
      schema: 'combustivel',
      table: 'scheduled_refuels',
      companyId,
      id
    });
  }

  static async createScheduledRefuel(companyId: string, data: Partial<ScheduledRefuel>, userId?: string) {
    return EntityService.create<ScheduledRefuel>({
      schema: 'combustivel',
      table: 'scheduled_refuels',
      companyId,
      data: {
        ...data,
        company_id: companyId,
        created_by: userId
      }
    });
  }

  static async updateScheduledRefuel(companyId: string, id: string, data: Partial<ScheduledRefuel>) {
    return EntityService.update<ScheduledRefuel>({
      schema: 'combustivel',
      table: 'scheduled_refuels',
      companyId,
      id,
      data
    });
  }

  static async deleteScheduledRefuel(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'scheduled_refuels',
      companyId,
      id
    });
  }

  // =====================================================
  // REGISTROS DE ABASTECIMENTO
  // =====================================================

  static async getRefuelRecords(companyId: string, filters?: {
    request_id?: string;
    status?: string;
    data_abastecimento?: string;
    condutor_id?: string;
    veiculo_id?: string;
  }) {
    return EntityService.list<RefuelRecord>({
      schema: 'combustivel',
      table: 'refuel_records',
      companyId,
      filters: filters || {},
      orderBy: 'data_abastecimento',
      orderDirection: 'DESC'
    });
  }

  static async getRefuelRecord(companyId: string, id: string) {
    return EntityService.get<RefuelRecord>({
      schema: 'combustivel',
      table: 'refuel_records',
      companyId,
      id
    });
  }

  static async createRefuelRecord(companyId: string, requestId: string, data: RefuelRecordFormData, userId?: string) {
    // Verificar se já existe registro para esta solicitação
    const existing = await this.getRefuelRecords(companyId, { request_id: requestId });
    if (existing.data.length > 0) {
      throw new Error('Já existe um registro de abastecimento para esta solicitação');
    }

    return EntityService.create<RefuelRecord>({
      schema: 'combustivel',
      table: 'refuel_records',
      companyId,
      data: {
        ...data,
        request_id: requestId,
        company_id: companyId,
        status: 'registrado',
        registrado_por: userId
      }
    });
  }

  static async updateRefuelRecord(companyId: string, id: string, data: Partial<RefuelRecordFormData>) {
    return EntityService.update<RefuelRecord>({
      schema: 'combustivel',
      table: 'refuel_records',
      companyId,
      id,
      data
    });
  }

  static async deleteRefuelRecord(companyId: string, id: string) {
    return EntityService.delete({
      schema: 'combustivel',
      table: 'refuel_records',
      companyId,
      id
    });
  }

  // =====================================================
  // CONSUMO POR VEÍCULO
  // =====================================================

  static async getVehicleConsumption(companyId: string, filters?: {
    veiculo_id?: string;
    mes?: number;
    ano?: number;
  }) {
    return EntityService.list<VehicleConsumption>({
      schema: 'combustivel',
      table: 'vehicle_consumption',
      companyId,
      filters: filters || {},
      orderBy: 'ano, mes',
      orderDirection: 'DESC'
    });
  }

  // =====================================================
  // CONSUMO POR COLABORADOR
  // =====================================================

  static async getDriverConsumption(companyId: string, filters?: {
    condutor_id?: string;
    mes?: number;
    ano?: number;
  }) {
    return EntityService.list<DriverConsumption>({
      schema: 'combustivel',
      table: 'driver_consumption',
      companyId,
      filters: filters || {},
      orderBy: 'ano, mes',
      orderDirection: 'DESC'
    });
  }

  // =====================================================
  // ALERTAS
  // =====================================================

  static async getAlerts(companyId: string, filters?: {
    resolvido?: boolean;
    severidade?: string;
    tipo_alerta?: string;
    veiculo_id?: string;
    condutor_id?: string;
  }) {
    return EntityService.list<ConsumptionAlert>({
      schema: 'combustivel',
      table: 'consumption_alerts',
      companyId,
      filters: filters || {},
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  static async resolveAlert(companyId: string, id: string, observacoes?: string, userId?: string) {
    return EntityService.update<ConsumptionAlert>({
      schema: 'combustivel',
      table: 'consumption_alerts',
      companyId,
      id,
      data: {
        resolvido: true,
        resolvido_por: userId,
        resolvido_em: new Date().toISOString(),
        observacoes_resolucao: observacoes
      }
    });
  }

  // =====================================================
  // DASHBOARD E ESTATÍSTICAS
  // =====================================================

  static async getDashboardStats(companyId: string, mes?: number, ano?: number) {
    const currentDate = new Date();
    const targetMonth = mes || currentDate.getMonth() + 1;
    const targetYear = ano || currentDate.getFullYear();

    // Buscar consumo mensal
    const vehicleConsumption = await this.getVehicleConsumption(companyId, {
      mes: targetMonth,
      ano: targetYear
    });

    const driverConsumption = await this.getDriverConsumption(companyId, {
      mes: targetMonth,
      ano: targetYear
    });

    // Calcular totais
    const consumo_mensal_litros = vehicleConsumption.data.reduce((sum, v) => sum + (v.total_litros || 0), 0);
    const consumo_mensal_valor = vehicleConsumption.data.reduce((sum, v) => sum + (v.total_valor || 0), 0);

    // Buscar orçamento
    const budgets = await this.getBudgets(companyId, {
      mes: targetMonth,
      ano: targetYear
    });

    const orcamento_previsto = budgets.data.reduce((sum, b) => sum + (b.valor_orcado || 0), 0);
    const orcamento_realizado = budgets.data.reduce((sum, b) => sum + (b.valor_consumido || 0), 0);

    // Buscar solicitações pendentes
    const pendingRequests = await this.getRefuelRequests(companyId, {
      status: 'pendente'
    });

    return {
      consumo_mensal_litros,
      consumo_mensal_valor,
      consumo_por_veiculo: vehicleConsumption.data.map(v => ({
        veiculo_id: v.veiculo_id,
        veiculo_placa: v.veiculo_placa || '',
        total_litros: v.total_litros,
        total_valor: v.total_valor
      })),
      consumo_por_colaborador: driverConsumption.data.map(d => ({
        condutor_id: d.condutor_id,
        condutor_nome: d.condutor_nome || '',
        total_litros: d.total_litros,
        total_valor: d.total_valor
      })),
      consumo_por_centro_custo: [], // Será implementado com agregação específica
      consumo_por_projeto: [], // Será implementado com agregação específica
      orcamento_previsto,
      orcamento_realizado,
      abastecimentos_pendentes: pendingRequests.totalCount
    };
  }
}

