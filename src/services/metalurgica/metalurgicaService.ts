// =====================================================
// SERVIÇO METALÚRGICA
// =====================================================
// Usa EntityService para evitar erro PGRST205
// Seguindo padrão do projeto (memória ID: 10560161)

import { EntityService, EntityFilters, EntityListResult, callSchemaFunction } from '@/services/generic/entityService';
import type {
  Produto,
  EstruturaProduto,
  Maquina,
  TipoParada,
  OrdemProducao,
  OrdemServico,
  SolicitacaoMaterial,
  Lote,
  ParadaProducao,
  Galvanizacao,
  GalvanizacaoItem,
  Inspecao,
  CertificadoQualidade,
  NaoConformidade,
  PlanejamentoProducao,
  PlanejamentoItem,
  ProdutoInput,
  EstruturaProdutoInput,
  OrdemProducaoInput,
  OrdemServicoInput,
  LoteInput,
  InspecaoInput,
  GalvanizacaoInput,
  PlanejamentoProducaoInput,
  OEE
} from '@/types/metalurgica';

// =====================================================
// PRODUTOS
// =====================================================

export const metalurgicaService = {
  // =====================================================
  // PRODUTOS
  // =====================================================

  async listProdutos(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<Produto>> {
    return EntityService.list<Produto>({
      schema: 'metalurgica',
      table: 'produtos',
      companyId,
      filters,
    });
  },

  async getProduto(companyId: string, id: string): Promise<Produto | null> {
    const result = await EntityService.list<Produto>({
      schema: 'metalurgica',
      table: 'produtos',
      companyId,
      filters: { id },
    });
    return result.data[0] || null;
  },

  async createProduto(companyId: string, data: ProdutoInput): Promise<Produto> {
    return EntityService.create({
      schema: 'metalurgica',
      table: 'produtos',
      companyId,
      data,
    });
  },

  async updateProduto(companyId: string, id: string, data: Partial<ProdutoInput>): Promise<Produto> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'produtos',
      companyId,
      id,
      data,
    });
  },

  async deleteProduto(companyId: string, id: string): Promise<void> {
    return EntityService.delete({
      schema: 'metalurgica',
      table: 'produtos',
      companyId,
      id,
    });
  },

  // =====================================================
  // ESTRUTURA DE PRODUTOS (BOM)
  // =====================================================

  async listEstruturaProdutos(
    companyId: string,
    produtoPaiId?: string
  ): Promise<EntityListResult<EstruturaProduto>> {
    return EntityService.list<EstruturaProduto>({
      schema: 'metalurgica',
      table: 'estrutura_produtos',
      companyId,
      filters: produtoPaiId ? { produto_pai_id: produtoPaiId } : undefined,
      skipCompanyFilter: true, // Estrutura não tem company_id direto
    });
  },

  async createEstruturaProduto(data: EstruturaProdutoInput): Promise<EstruturaProduto> {
    // Buscar company_id do produto pai
    const produtoPai = await this.getProduto('', data.produto_pai_id);
    if (!produtoPai) throw new Error('Produto pai não encontrado');

    return EntityService.create({
      schema: 'metalurgica',
      table: 'estrutura_produtos',
      companyId: produtoPai.company_id,
      data,
      skipCompanyFilter: true,
    });
  },

  async deleteEstruturaProduto(id: string): Promise<void> {
    // Buscar estrutura para pegar company_id
    const estruturas = await EntityService.list<EstruturaProduto>({
      schema: 'metalurgica',
      table: 'estrutura_produtos',
      companyId: '',
      filters: { id },
      skipCompanyFilter: true,
    });

    if (estruturas.data.length === 0) {
      throw new Error('Estrutura não encontrada');
    }

    // Buscar produto pai para pegar company_id
    const produtoPai = await this.getProduto('', estruturas.data[0].produto_pai_id);
    if (!produtoPai) throw new Error('Produto pai não encontrado');

    return EntityService.delete({
      schema: 'metalurgica',
      table: 'estrutura_produtos',
      companyId: produtoPai.company_id,
      id,
      skipCompanyFilter: true,
    });
  },

  // =====================================================
  // MÁQUINAS
  // =====================================================

  async listMaquinas(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<Maquina>> {
    return EntityService.list<Maquina>({
      schema: 'metalurgica',
      table: 'maquinas',
      companyId,
      filters,
    });
  },

  async createMaquina(companyId: string, data: Partial<Maquina>): Promise<Maquina> {
    return EntityService.create({
      schema: 'metalurgica',
      table: 'maquinas',
      companyId,
      data,
    });
  },

  async updateMaquina(companyId: string, id: string, data: Partial<Maquina>): Promise<Maquina> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'maquinas',
      companyId,
      id,
      data,
    });
  },

  async deleteMaquina(companyId: string, id: string): Promise<void> {
    return EntityService.delete({
      schema: 'metalurgica',
      table: 'maquinas',
      companyId,
      id,
    });
  },

  // =====================================================
  // TIPOS DE PARADA
  // =====================================================

  async listTiposParada(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<TipoParada>> {
    return EntityService.list<TipoParada>({
      schema: 'metalurgica',
      table: 'tipos_parada',
      companyId,
      filters,
    });
  },

  async createTipoParada(companyId: string, data: Partial<TipoParada>): Promise<TipoParada> {
    return EntityService.create({
      schema: 'metalurgica',
      table: 'tipos_parada',
      companyId,
      data,
    });
  },

  // =====================================================
  // ORDENS DE PRODUÇÃO (OP)
  // =====================================================

  async listOrdensProducao(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<OrdemProducao>> {
    return EntityService.list<OrdemProducao>({
      schema: 'metalurgica',
      table: 'ordens_producao',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  },

  async getOrdemProducao(companyId: string, id: string): Promise<OrdemProducao | null> {
    const result = await EntityService.list<OrdemProducao>({
      schema: 'metalurgica',
      table: 'ordens_producao',
      companyId,
      filters: { id },
    });
    return result.data[0] || null;
  },

  async createOrdemProducao(
    companyId: string,
    userId: string,
    data: OrdemProducaoInput
  ): Promise<OrdemProducao> {
    // Gerar número de OP
    const numeroData = await callSchemaFunction<{ result: string }>('metalurgica', 'gerar_numero_op', {
      p_company_id: companyId,
    });

    const numero_op =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result) ||
      `OP-${new Date().getFullYear()}-${Date.now()}`;

    return EntityService.create({
      schema: 'metalurgica',
      table: 'ordens_producao',
      companyId,
      data: {
        ...data,
        numero_op,
        created_by: userId,
        status: 'rascunho',
      },
    });
  },

  async updateOrdemProducao(
    companyId: string,
    id: string,
    data: Partial<OrdemProducaoInput>
  ): Promise<OrdemProducao> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'ordens_producao',
      companyId,
      id,
      data,
    });
  },

  async deleteOrdemProducao(companyId: string, id: string): Promise<void> {
    return EntityService.delete({
      schema: 'metalurgica',
      table: 'ordens_producao',
      companyId,
      id,
    });
  },

  // =====================================================
  // ORDENS DE SERVIÇO (OS)
  // =====================================================

  async listOrdensServico(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<OrdemServico>> {
    return EntityService.list<OrdemServico>({
      schema: 'metalurgica',
      table: 'ordens_servico',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  },

  async createOrdemServico(
    companyId: string,
    userId: string,
    data: OrdemServicoInput
  ): Promise<OrdemServico> {
    // Gerar número de OS
    const numeroData = await callSchemaFunction<{ result: string }>('metalurgica', 'gerar_numero_os', {
      p_company_id: companyId,
    });

    const numero_os =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result) ||
      `OS-${new Date().getFullYear()}-${Date.now()}`;

    return EntityService.create({
      schema: 'metalurgica',
      table: 'ordens_servico',
      companyId,
      data: {
        ...data,
        numero_os,
        created_by: userId,
        status: 'rascunho',
      },
    });
  },

  async updateOrdemServico(
    companyId: string,
    id: string,
    data: Partial<OrdemServicoInput>
  ): Promise<OrdemServico> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'ordens_servico',
      companyId,
      id,
      data,
    });
  },

  // =====================================================
  // SOLICITAÇÕES DE MATERIAIS
  // =====================================================

  async listSolicitacoesMateriais(
    companyId: string,
    opId?: string,
    osId?: string
  ): Promise<EntityListResult<SolicitacaoMaterial>> {
    const filters: EntityFilters = {};
    if (opId) filters.op_id = opId;
    if (osId) filters.os_id = osId;

    return EntityService.list<SolicitacaoMaterial>({
      schema: 'metalurgica',
      table: 'solicitacoes_materiais',
      companyId,
      filters,
    });
  },

  // =====================================================
  // LOTES
  // =====================================================

  async listLotes(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<Lote>> {
    return EntityService.list<Lote>({
      schema: 'metalurgica',
      table: 'lotes',
      companyId,
      filters,
      orderBy: 'data_producao',
      orderDirection: 'DESC',
    });
  },

  async createLote(
    companyId: string,
    data: LoteInput
  ): Promise<Lote> {
    // Gerar número de lote
    const numeroData = await callSchemaFunction<{ result: string }>('metalurgica', 'gerar_numero_lote', {
      p_company_id: companyId,
    });

    const numero_lote =
      (typeof numeroData === 'string' ? numeroData : numeroData?.result) ||
      `LOTE-${new Date().getFullYear()}-${Date.now()}`;

    return EntityService.create({
      schema: 'metalurgica',
      table: 'lotes',
      companyId,
      data: {
        ...data,
        numero_lote,
        status: 'em_producao',
      },
    });
  },

  async updateLote(
    companyId: string,
    id: string,
    data: Partial<LoteInput>
  ): Promise<Lote> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'lotes',
      companyId,
      id,
      data,
    });
  },

  // =====================================================
  // PARADAS DE PRODUÇÃO
  // =====================================================

  async listParadasProducao(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<ParadaProducao>> {
    return EntityService.list<ParadaProducao>({
      schema: 'metalurgica',
      table: 'paradas_producao',
      companyId,
      filters,
      orderBy: 'data_hora_inicio',
      orderDirection: 'DESC',
    });
  },

  async createParadaProducao(
    companyId: string,
    data: Partial<ParadaProducao>
  ): Promise<ParadaProducao> {
    return EntityService.create({
      schema: 'metalurgica',
      table: 'paradas_producao',
      companyId,
      data,
    });
  },

  async updateParadaProducao(
    companyId: string,
    id: string,
    data: Partial<ParadaProducao>
  ): Promise<ParadaProducao> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'paradas_producao',
      companyId,
      id,
      data,
    });
  },

  // =====================================================
  // GALVANIZAÇÃO
  // =====================================================

  async listGalvanizacoes(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<Galvanizacao>> {
    return EntityService.list<Galvanizacao>({
      schema: 'metalurgica',
      table: 'galvanizacoes',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  },

  async createGalvanizacao(
    companyId: string,
    userId: string,
    data: GalvanizacaoInput
  ): Promise<Galvanizacao> {
    // Gerar número de galvanização
    const numero_galvanizacao = `GALV-${new Date().getFullYear()}-${Date.now()}`;

    const galvanizacao = await EntityService.create({
      schema: 'metalurgica',
      table: 'galvanizacoes',
      companyId,
      data: {
        ...data,
        numero_galvanizacao,
        created_by: userId,
        status: 'pendente',
      },
    });

    // Criar itens de galvanização
    if (data.itens && data.itens.length > 0) {
      for (const item of data.itens) {
        await EntityService.create({
          schema: 'metalurgica',
          table: 'galvanizacao_itens',
          companyId,
          data: {
            ...item,
            galvanizacao_id: galvanizacao.id,
          },
          skipCompanyFilter: true,
        });
      }
    }

    return galvanizacao;
  },

  async updateGalvanizacao(
    companyId: string,
    id: string,
    data: Partial<GalvanizacaoInput>
  ): Promise<Galvanizacao> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'galvanizacoes',
      companyId,
      id,
      data,
    });
  },

  // =====================================================
  // INSPEÇÕES
  // =====================================================

  async listInspecoes(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<Inspecao>> {
    return EntityService.list<Inspecao>({
      schema: 'metalurgica',
      table: 'inspecoes',
      companyId,
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  },

  async createInspecao(
    companyId: string,
    data: InspecaoInput
  ): Promise<Inspecao> {
    return EntityService.create({
      schema: 'metalurgica',
      table: 'inspecoes',
      companyId,
      data: {
        ...data,
        status: 'pendente',
      },
    });
  },

  async updateInspecao(
    companyId: string,
    id: string,
    data: Partial<InspecaoInput>
  ): Promise<Inspecao> {
    return EntityService.update({
      schema: 'metalurgica',
      table: 'inspecoes',
      companyId,
      id,
      data,
    });
  },

  // =====================================================
  // CERTIFICADOS DE QUALIDADE
  // =====================================================

  async listCertificadosQualidade(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<CertificadoQualidade>> {
    return EntityService.list<CertificadoQualidade>({
      schema: 'metalurgica',
      table: 'certificados_qualidade',
      companyId,
      filters,
      orderBy: 'data_emissao',
      orderDirection: 'DESC',
    });
  },

  // =====================================================
  // NÃO CONFORMIDADES
  // =====================================================

  async listNaoConformidades(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<NaoConformidade>> {
    return EntityService.list<NaoConformidade>({
      schema: 'metalurgica',
      table: 'nao_conformidades',
      companyId,
      filters,
      orderBy: 'data_identificacao',
      orderDirection: 'DESC',
    });
  },

  async createNaoConformidade(
    companyId: string,
    userId: string,
    data: Partial<NaoConformidade>
  ): Promise<NaoConformidade> {
    // Gerar número de NC
    const numero_nc = `NC-${new Date().getFullYear()}-${Date.now()}`;

    return EntityService.create({
      schema: 'metalurgica',
      table: 'nao_conformidades',
      companyId,
      data: {
        ...data,
        numero_nc,
        created_by: userId,
        status: 'identificada',
        data_identificacao: new Date().toISOString().split('T')[0],
      },
    });
  },

  // =====================================================
  // PCP - PLANEJAMENTO
  // =====================================================

  async listPlanejamentos(
    companyId: string,
    filters?: EntityFilters
  ): Promise<EntityListResult<PlanejamentoProducao>> {
    return EntityService.list<PlanejamentoProducao>({
      schema: 'metalurgica',
      table: 'planejamento_producao',
      companyId,
      filters,
      orderBy: 'periodo_inicio',
      orderDirection: 'DESC',
    });
  },

  async createPlanejamento(
    companyId: string,
    userId: string,
    data: PlanejamentoProducaoInput
  ): Promise<PlanejamentoProducao> {
    const planejamento = await EntityService.create({
      schema: 'metalurgica',
      table: 'planejamento_producao',
      companyId,
      data: {
        periodo_inicio: data.periodo_inicio,
        periodo_fim: data.periodo_fim,
        observacoes: data.observacoes,
        created_by: userId,
        status: 'rascunho',
      },
    });

    // Criar itens do planejamento
    if (data.itens && data.itens.length > 0) {
      for (const item of data.itens) {
        await EntityService.create({
          schema: 'metalurgica',
          table: 'planejamento_itens',
          companyId,
          data: {
            ...item,
            planejamento_id: planejamento.id,
          },
          skipCompanyFilter: true,
        });
      }
    }

    return planejamento;
  },

  // =====================================================
  // INDICADORES
  // =====================================================

  async calcularOEE(
    companyId: string,
    maquinaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<OEE> {
    const result = await callSchemaFunction<OEE>('metalurgica', 'calcular_oee', {
      p_maquina_id: maquinaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });

    return result as OEE;
  },

  async calcularMTBF(
    companyId: string,
    maquinaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<number | null> {
    const result = await callSchemaFunction<number>('metalurgica', 'calcular_mtbf', {
      p_maquina_id: maquinaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });

    return result as number | null;
  },

  async calcularMTTR(
    companyId: string,
    maquinaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<number | null> {
    const result = await callSchemaFunction<number>('metalurgica', 'calcular_mttr', {
      p_maquina_id: maquinaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });

    return result as number | null;
  },

  // =====================================================
  // CÁLCULO DE MATERIAIS NECESSÁRIOS
  // =====================================================

  async calcularMateriaisNecessarios(
    produtoId: string,
    quantidade: number
  ): Promise<Array<{ material_id: string; quantidade_necessaria: number; unidade_medida: string }>> {
    const result = await callSchemaFunction<any>('metalurgica', 'calcular_materiais_necessarios', {
      p_produto_id: produtoId,
      p_quantidade: quantidade,
    });

    return result as Array<{ material_id: string; quantidade_necessaria: number; unidade_medida: string }>;
  },
};

