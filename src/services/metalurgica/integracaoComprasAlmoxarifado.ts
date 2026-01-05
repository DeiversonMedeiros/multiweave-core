// =====================================================
// INTEGRAÇÃO METALÚRGICA COM COMPRAS E ALMOXARIFADO
// =====================================================
// Este serviço integra o módulo metalúrgica com os módulos
// de compras e almoxarifado para:
// - Criar requisições de compra automaticamente quando faltam materiais
// - Reservar materiais do almoxarifado para produção
// - Atualizar estoque após produção
// - Enviar notificações sobre materiais faltantes

import { metalurgicaService } from './metalurgicaService';
import { purchaseService } from '@/services/compras/purchaseService';
import { EntityService } from '@/services/generic/entityService';
import { NotificationService } from '@/services/rh/notificationService';
import type { OrdemProducao, OrdemServico } from '@/types/metalurgica';

export const integracaoComprasAlmoxarifado = {
  /**
   * Verifica materiais necessários para uma OP/OS e cria requisições de compra
   * se não houver estoque suficiente
   */
  async verificarMateriaisECriarRequisicoes(
    companyId: string,
    userId: string,
    opId?: string,
    osId?: string
  ): Promise<{ requisicoesCriadas: number; materiaisReservados: number }> {
    let ordem: OrdemProducao | OrdemServico | null = null;

    // Buscar OP ou OS
    if (opId) {
      ordem = await metalurgicaService.getOrdemProducao(companyId, opId);
    } else if (osId) {
      const osData = await metalurgicaService.listOrdensServico(companyId, { id: osId });
      ordem = osData.data[0] || null;
    }

    if (!ordem) {
      throw new Error('Ordem não encontrada');
    }

    // Calcular materiais necessários
    const materiaisNecessarios = await metalurgicaService.calcularMateriaisNecessarios(
      ordem.produto_id,
      ordem.quantidade_solicitada
    );

    let requisicoesCriadas = 0;
    let materiaisReservados = 0;

    // Para cada material necessário
    for (const material of materiaisNecessarios) {
      // Verificar estoque disponível
      const estoqueData = await EntityService.list({
        schema: 'almoxarifado',
        table: 'estoque_atual',
        companyId,
        filters: {
          material_id: material.material_id,
        },
      });

      const estoqueDisponivel = estoqueData.data.reduce(
        (acc: number, item: any) => acc + (item.quantidade_disponivel || 0),
        0
      );

      const quantidadeNecessaria = material.quantidade_necessaria;

      if (estoqueDisponivel < quantidadeNecessaria) {
        // Criar requisição de compra
        const quantidadeFaltante = quantidadeNecessaria - estoqueDisponivel;

        try {
          await purchaseService.createPurchaseRequisition({
            companyId,
            userId,
            data: {
              data_necessidade: new Date().toISOString().split('T')[0],
              prioridade: ordem.prioridade === 'urgente' ? 'alta' : 'normal',
              centro_custo_id: ordem.centro_custo_id || undefined,
              projeto_id: ordem.projeto_id || undefined,
              tipo_requisicao: 'reposicao',
              justificativa: `Material necessário para ${opId ? 'OP' : 'OS'} ${opId || osId}`,
              itens: [
                {
                  material_id: material.material_id,
                  quantidade: quantidadeFaltante,
                  unidade_medida: material.unidade_medida,
                  observacoes: `Solicitado automaticamente pelo módulo metalúrgica`,
                },
              ],
            },
          });

          requisicoesCriadas++;
          
          // Criar notificação para o solicitante
          try {
            await NotificationService.createNotification(
              userId,
              companyId,
              {
                type: 'system_alert',
                title: 'Requisição de Compra Criada Automaticamente',
                message: `Uma requisição de compra foi criada automaticamente para o material necessário na ${opId ? 'OP' : 'OS'} ${opId || osId}. Quantidade faltante: ${quantidadeFaltante} ${material.unidade_medida}`,
                data: {
                  op_id: opId,
                  os_id: osId,
                  material_id: material.material_id,
                  quantidade_faltante: quantidadeFaltante,
                },
              }
            );
          } catch (notifError) {
            console.error('Erro ao criar notificação:', notifError);
          }
        } catch (error) {
          console.error('Erro ao criar requisição de compra:', error);
          // Continuar com os outros materiais mesmo se um falhar
        }
      } else {
        // Reservar material do almoxarifado
        try {
          // Criar solicitação de material na metalúrgica
          await EntityService.create({
            schema: 'metalurgica',
            table: 'solicitacoes_materiais',
            companyId,
            data: {
              op_id: opId || null,
              os_id: osId || null,
              material_id: material.material_id,
              almoxarifado_id: estoqueData.data[0]?.almoxarifado_id || null,
              quantidade_necessaria: quantidadeNecessaria,
              quantidade_reservada: quantidadeNecessaria,
              quantidade_liberada: 0,
              status: 'pendente',
            },
          });

          materiaisReservados++;
        } catch (error) {
          console.error('Erro ao reservar material:', error);
        }
      }
    }

    return { requisicoesCriadas, materiaisReservados };
  },

  /**
   * Libera materiais reservados após conclusão de produção
   */
  async liberarMateriaisReservados(
    companyId: string,
    opId?: string,
    osId?: string
  ): Promise<void> {
    const solicitacoes = await metalurgicaService.listSolicitacoesMateriais(companyId, opId, osId);

    for (const solicitacao of solicitacoes.data) {
      if (solicitacao.status === 'atendida') {
        // Atualizar estoque do almoxarifado
        // TODO: Implementar lógica de atualização de estoque
        // quando o material for realmente usado na produção
      }
    }
  },

  /**
   * Atualiza estoque após produção de lote
   */
  async atualizarEstoqueAposProducao(
    companyId: string,
    loteId: string,
    produtoId: string,
    quantidade: number
  ): Promise<void> {
    // Verificar se o produto está cadastrado no almoxarifado
    const produto = await metalurgicaService.getProduto(companyId, produtoId);
    
    if (produto?.material_equipamento_id) {
      // Atualizar estoque do almoxarifado
      const estoqueData = await EntityService.list({
        schema: 'almoxarifado',
        table: 'estoque_atual',
        companyId,
        filters: {
          material_id: produto.material_equipamento_id,
        },
      });

      if (estoqueData.data.length > 0) {
        // Criar movimentação de entrada
        await EntityService.create({
          schema: 'almoxarifado',
          table: 'movimentacoes_estoque',
          companyId,
          data: {
            material_id: produto.material_equipamento_id,
            almoxarifado_id: estoqueData.data[0].almoxarifado_id,
            tipo_movimentacao: 'entrada',
            quantidade: quantidade,
            origem: 'producao',
            origem_id: loteId,
            observacoes: `Entrada de produção - Lote ${loteId}`,
          },
        });
      }
    }
  },
};

