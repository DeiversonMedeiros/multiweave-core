// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface ApprovalConfig {
  id: string;
  company_id: string;
  nome?: string;
  processo_tipo: 'conta_pagar' | 'requisicao_compra' | 'cotacao_compra' | 'solicitacao_saida_material' | 'solicitacao_transferencia_material' | 'logistica' | 'combustivel';
  centro_custo_id?: string;
  projeto_id?: string;
  classe_financeiras?: string[];
  usuario_id?: string;
  valor_limite?: number;
  nivel_aprovacao: number;
  aprovadores: Array<{
    user_id: string;
    is_primary: boolean;
    ordem: number;
  }>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Approval {
  id: string;
  company_id: string;
  processo_tipo: string;
  processo_id: string;
  nivel_aprovacao: number;
  aprovador_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
  data_aprovacao?: string;
  observacoes?: string;
  aprovador_original_id?: string;
  transferido_em?: string;
  transferido_por?: string;
  motivo_transferencia?: string;
  created_at: string;
  updated_at: string;
  // Campos adicionais para requisições de compra e cotações
  numero_requisicao?: string;
  solicitante_nome?: string;
  comprador_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
}

export interface MaterialExitRequest {
  id: string;
  company_id: string;
  funcionario_solicitante_id: string; // Quem solicita (auxiliar administrativo)
  funcionario_receptor_id: string; // Quem recebe o material (técnico)
  almoxarifado_id: string;
  centro_custo_id?: string;
  projeto_id?: string;
  data_solicitacao: string;
  data_aprovacao?: string;
  data_saida?: string;
  data_prevista_saida?: string;
  data_separacao?: string;
  data_aceite_tecnico?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado' | 'entregue' | 'separado' | 'aceito_tecnico';
  valor_total?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialExitRequestItem {
  id: string;
  company_id: string;
  solicitacao_id: string;
  material_id: string;
  quantidade_solicitada: number;
  quantidade_entregue?: number;
  valor_unitario?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface EditHistory {
  id: string;
  company_id: string;
  processo_tipo: string;
  processo_id: string;
  usuario_editor_id: string;
  data_edicao: string;
  campos_alterados?: string[];
  valores_anteriores?: Record<string, any>;
  valores_novos?: Record<string, any>;
  aprovacoes_resetadas: boolean;
  data_reset?: string;
  created_at: string;
}

export class ApprovalService {
  // =====================================================
  // CONFIGURAÇÕES DE APROVAÇÃO
  // =====================================================

  static async getApprovalConfigs(companyId: string, filters?: {
    processo_tipo?: string;
    ativo?: boolean;
  }): Promise<ApprovalConfig[]> {
    try {
      // Usar query direta para debug
      let query = supabase
        .from('configuracoes_aprovacao_unificada')
        .select('*')
        .eq('company_id', companyId);
      
      if (filters?.processo_tipo) {
        query = query.eq('processo_tipo', filters.processo_tipo);
      }
      
      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar configurações de aprovação:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getApprovalConfigs:', error);
      throw error;
    }
  }

  static async getApprovalConfig(id: string, companyId: string): Promise<ApprovalConfig | null> {
    try {
      const { data, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar configuração de aprovação:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Erro na função getApprovalConfig:', error);
      throw error;
    }
  }

  static async createApprovalConfig(data: Omit<ApprovalConfig, 'id' | 'created_at' | 'updated_at'>, companyId: string): Promise<ApprovalConfig> {
    try {
      const { data: result, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .insert({ ...data, company_id: companyId })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar configuração de aprovação:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função createApprovalConfig:', error);
      throw error;
    }
  }

  static async updateApprovalConfig(id: string, data: Partial<ApprovalConfig>, companyId: string): Promise<ApprovalConfig> {
    try {
      const { data: result, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .update(data)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar configuração de aprovação:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função updateApprovalConfig:', error);
      throw error;
    }
  }

  static async deleteApprovalConfig(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Erro ao excluir configuração de aprovação:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro na função deleteApprovalConfig:', error);
      throw error;
    }
  }

  // =====================================================
  // APROVAÇÕES
  // =====================================================

  static async getPendingApprovals(userId: string, companyId: string): Promise<Approval[]> {
    try {
      // Usar a função RPC que retorna o formato correto Approval[] da tabela aprovacoes_unificada
      // Esta função retorna apenas registros do sistema unificado, não do sistema antigo de RH
      console.log('🔍 [ApprovalService] Buscando aprovações pendentes:', { userId, companyId });
      
      // Buscar diretamente na tabela para evitar problemas de cache da RPC
      // e garantir que estamos vendo os dados mais atualizados
      // Adicionar um timestamp único na query para forçar bypass de cache (se houver)
      const queryTimestamp = Date.now();
      const { data: approvals, error } = await supabase
        .from('aprovacoes_unificada')
        .select('*')
        .eq('aprovador_id', userId)
        .eq('company_id', companyId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ApprovalService] Erro ao buscar aprovações pendentes:', error);
        throw error;
      }

      // VERIFICAÇÃO CRÍTICA: Filtrar explicitamente por status 'pendente' após a query
      // Isso garante que mesmo se houver algum problema de cache ou timing, apenas itens pendentes serão retornados
      const rawCount = approvals?.length || 0;
      let filteredApprovals = (approvals || []).filter(a => {
        const isPending = a.status === 'pendente';
        if (!isPending) {
          console.warn('⚠️ [ApprovalService] Item com status não-pendente encontrado na query:', {
            id: a.id,
            status: a.status,
            processo_tipo: a.processo_tipo,
            processo_id: a.processo_id,
            queryTimestamp
          });
        }
        return isPending;
      });

      console.log('📊 [ApprovalService] Aprovações pendentes encontradas (query direta):', {
        rawCount,
        filteredCount: filteredApprovals.length,
        removedCount: rawCount - filteredApprovals.length,
        ids: filteredApprovals.map(a => ({ 
          id: a.id, 
          status: a.status, 
          processo_tipo: a.processo_tipo,
          processo_id: a.processo_id
        })),
        queryTimestamp
      });

      // Se houve itens removidos, logar detalhes
      if (rawCount > filteredApprovals.length) {
        const removedItems = (approvals || []).filter(a => a.status !== 'pendente');
        console.warn('⚠️ [ApprovalService] Itens removidos por não estarem pendentes:', {
          count: removedItems.length,
          items: removedItems.map(a => ({
            id: a.id,
            status: a.status,
            processo_tipo: a.processo_tipo,
            processo_id: a.processo_id,
            updated_at: a.updated_at
          }))
        });
      }
      
      // Para requisições de compra, buscar informações adicionais de forma otimizada
      // Usar filteredApprovals em vez de approvals para garantir que só processamos itens pendentes
      const requisicaoApprovals = filteredApprovals.filter(a => a.processo_tipo === 'requisicao_compra');
      const requisicaoIds = requisicaoApprovals.map(a => a.processo_id);
      
      let requisicoesMap = new Map<string, { numero_requisicao: string; solicitante_id: string; centro_custo_id?: string; projeto_id?: string }>();
      let usuariosMap = new Map<string, string>();
      let centroCustoMap = new Map<string, string>();
      let projetoMap = new Map<string, string>();
      let requisicoesStatus: Array<{ id: string; status: string }> | null = null;
      
      if (requisicaoIds.length > 0) {
        try {
          // FILTRO CRÍTICO: Primeiro buscar status das requisições para filtrar as já aprovadas
          // Isso evita buscar dados desnecessários de requisições já aprovadas
          try {
            // Usar EntityService para buscar status das requisições (acessa schema compras corretamente)
            const statusPromises = requisicaoIds.map(reqId => 
              EntityService.getById<{ id: string; status: string; workflow_state?: string }>({
                schema: 'compras',
                table: 'requisicoes_compra',
                id: reqId,
                companyId
              })
            );
            
            const statusResults = await Promise.all(statusPromises);
            const statusData = statusResults.filter(r => r !== null) as Array<{ id: string; status: string; workflow_state?: string }>;
            
            if (statusData && statusData.length > 0) {
              requisicoesStatus = statusData;
              // Filtrar requisições que já foram aprovadas ou processadas
              // Incluir status 'aprovada' e workflow_state que indicam processamento
              const aprovadasIds = new Set(
                statusData
                  .filter(r => {
                    // Verificar se status é 'aprovada' ou se workflow_state indica processamento
                    return r.status === 'aprovada' || 
                           r.workflow_state === 'em_pedido' ||
                           r.workflow_state === 'em_cotacao' ||
                           r.workflow_state === 'finalizada';
                  })
                  .map(r => r.id)
              );
              
              // Remover aprovações de requisições já aprovadas ou processadas ANTES de buscar os dados
              if (aprovadasIds.size > 0) {
                const filteredBefore = filteredApprovals.length;
                filteredApprovals = filteredApprovals.filter(a => {
                  if (a.processo_tipo === 'requisicao_compra' && aprovadasIds.has(a.processo_id)) {
                    console.log('🚫 [ApprovalService] Removendo aprovação de requisição já processada:', {
                      aprovacao_id: a.id,
                      requisicao_id: a.processo_id
                    });
                    return false;
                  }
                  return true;
                });
                
                console.log('✅ [ApprovalService] Aprovações filtradas (requisições processadas removidas):', {
                  antes: filteredBefore,
                  depois: filteredApprovals.length,
                  removidas: filteredBefore - filteredApprovals.length
                });
                
                // Atualizar lista de IDs para buscar apenas requisições não processadas
                requisicaoIds.splice(0, requisicaoIds.length, ...requisicaoIds.filter(id => !aprovadasIds.has(id)));
              }
            }
          } catch (statusErr) {
            console.warn('⚠️ [ApprovalService] Erro ao verificar status das requisições:', statusErr);
          }

          // Buscar requisições individualmente usando Promise.all para paralelismo
          // Agora só busca requisições que não foram aprovadas ou processadas
          const requisicoesPromises = requisicaoIds.map(reqId => 
            EntityService.getById<{
              id: string;
              numero_requisicao: string;
              solicitante_id: string;
              centro_custo_id?: string;
              projeto_id?: string;
              status?: string;
              workflow_state?: string;
            }>({
              schema: 'compras',
              table: 'requisicoes_compra',
              id: reqId,
              companyId
            })
          );
          
          const requisicoesResults = await Promise.all(requisicoesPromises);
          const requisicoes = requisicoesResults.filter(r => {
            if (!r) return false;
            // Filtrar requisições que já foram processadas
            const req = r as { id: string; status?: string; workflow_state?: string };
            if (req.status === 'aprovada' || 
                req.workflow_state === 'em_pedido' || 
                req.workflow_state === 'em_cotacao' || 
                req.workflow_state === 'finalizada') {
              console.log('🚫 [ApprovalService] Requisição já processada, removendo:', {
                id: req.id,
                status: req.status,
                workflow_state: req.workflow_state
              });
              return false;
            }
            return true;
          }) as Array<{
            id: string;
            numero_requisicao: string;
            solicitante_id: string;
            centro_custo_id?: string;
            projeto_id?: string;
            status?: string;
            workflow_state?: string;
          }>;

          if (requisicoes.length > 0) {
            // Criar mapa de requisições (apenas as não processadas)
            requisicoes.forEach((req) => {
              requisicoesMap.set(req.id, {
                numero_requisicao: req.numero_requisicao,
                solicitante_id: req.solicitante_id,
                centro_custo_id: req.centro_custo_id,
                projeto_id: req.projeto_id
              });
            });
            
            // Buscar nomes dos solicitantes únicos
            const solicitanteIds = [...new Set(requisicoes.map(r => r.solicitante_id).filter(Boolean))];
            if (solicitanteIds.length > 0) {
              // Buscar usuários usando RPC diretamente do Supabase
              // pois a tabela users está no schema public e pode não ter company_id
              const usuariosPromises = solicitanteIds.map(async (userId) => {
                try {
                  const { data, error } = await (supabase.rpc as any)('get_entity_data', {
                    schema_name: 'public',
                    table_name: 'users',
                    company_id_param: null, // users não tem company_id
                    filters: { id: userId },
                    limit_param: 1,
                    offset_param: 0
                  });
                  
                  if (error) {
                    console.warn(`⚠️ [ApprovalService] Erro ao buscar usuário ${userId}:`, error);
                    return null;
                  }
                  
                  if (data && Array.isArray(data) && data.length > 0) {
                    // O RPC retorna no formato { id, data: {...} } ou direto
                    const userData = data[0]?.data || data[0];
                    if (userData) {
                      return {
                        id: userData.id || userId,
                        nome: userData.nome || 'N/A'
                      };
                    }
                  }
                  return null;
                } catch (err) {
                  console.warn(`⚠️ [ApprovalService] Erro ao buscar usuário ${userId}:`, err);
                  return null;
                }
              });
              
              const usuariosResults = await Promise.all(usuariosPromises);
              usuariosResults.forEach((user) => {
                if (user && user.id) {
                  usuariosMap.set(user.id, user.nome || 'N/A');
                }
              });
            }

            // Buscar nomes de centro de custo e projeto
            const centroCustoIds = [...new Set(requisicoes.map(r => r.centro_custo_id).filter(Boolean))] as string[];
            const projetoIds = [...new Set(requisicoes.map(r => r.projeto_id).filter(Boolean))] as string[];
            if (centroCustoIds.length > 0) {
              const ccPromises = centroCustoIds.map(ccId =>
                EntityService.getById<{ id: string; nome: string }>({
                  schema: 'public',
                  table: 'cost_centers',
                  id: ccId,
                  companyId
                })
              );
              const ccResults = await Promise.all(ccPromises);
              ccResults.forEach((cc) => {
                if (cc?.id && cc.nome) centroCustoMap.set(cc.id, cc.nome);
              });
            }
            if (projetoIds.length > 0) {
              const projPromises = projetoIds.map(projId =>
                EntityService.getById<{ id: string; nome: string }>({
                  schema: 'public',
                  table: 'projects',
                  id: projId,
                  companyId
                })
              );
              const projResults = await Promise.all(projPromises);
              projResults.forEach((p) => {
                if (p?.id && p.nome) projetoMap.set(p.id, p.nome);
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ [ApprovalService] Erro ao buscar detalhes das requisições:', err);
        }
      }
      
      // Para cotações e contas a pagar, também filtrar processadas
      const cotacaoApprovals = filteredApprovals.filter(a => a.processo_tipo === 'cotacao_compra');
      const cotacaoIds = cotacaoApprovals.map(a => a.processo_id);
      
      let cotacoesMap = new Map<string, { status: string; workflow_state?: string }>();
      
      if (cotacaoIds.length > 0) {
        try {
          const cotacoesPromises = cotacaoIds.map(cotId => 
            EntityService.getById<{ id: string; status: string; workflow_state?: string }>({
              schema: 'compras',
              table: 'cotacao_ciclos',
              id: cotId,
              companyId
            })
          );
          
          const cotacoesResults = await Promise.all(cotacoesPromises);
          const cotacoes = cotacoesResults.filter(r => {
            if (!r) return false;
            // Filtrar cotações que já foram processadas
            if (r.status === 'aprovada' || 
                r.workflow_state === 'em_pedido' || 
                r.workflow_state === 'aprovada' || 
                r.workflow_state === 'finalizada') {
              console.log('🚫 [ApprovalService] Cotação já processada, removendo:', {
                id: r.id,
                status: r.status,
                workflow_state: r.workflow_state
              });
              return false;
            }
            return true;
          }) as Array<{ id: string; status: string; workflow_state?: string }>;
          
          cotacoes.forEach((cot) => {
            cotacoesMap.set(cot.id, {
              status: cot.status,
              workflow_state: cot.workflow_state
            });
          });
        } catch (err) {
          console.warn('⚠️ [ApprovalService] Erro ao buscar detalhes das cotações:', err);
        }
      }
      
      // Para contas a pagar, verificar se já foram pagas
      const contaApprovals = filteredApprovals.filter(a => a.processo_tipo === 'conta_pagar');
      const contaIds = contaApprovals.map(a => a.processo_id);
      
      let contasMap = new Map<string, { status: string }>();
      
      if (contaIds.length > 0) {
        try {
          const contasPromises = contaIds.map(contaId => 
            EntityService.getById<{ id: string; status: string }>({
              schema: 'financeiro',
              table: 'contas_pagar',
              id: contaId,
              companyId
            })
          );
          
          const contasResults = await Promise.all(contasPromises);
          const contas = contasResults.filter(r => {
            if (!r) return false;
            // Filtrar contas que já foram pagas
            if (r.status === 'pago') {
              console.log('🚫 [ApprovalService] Conta a pagar já paga, removendo:', {
                id: r.id,
                status: r.status
              });
              return false;
            }
            return true;
          }) as Array<{ id: string; status: string }>;
          
          contas.forEach((conta) => {
            contasMap.set(conta.id, {
              status: conta.status
            });
          });
        } catch (err) {
          console.warn('⚠️ [ApprovalService] Erro ao buscar detalhes das contas a pagar:', err);
        }
      }
      
      // Mapear aprovações com detalhes
      // Usar filteredApprovals em vez de approvals para garantir que só retornamos itens pendentes
      // FILTRO FINAL: Remover aprovações de requisições, cotações e contas que não estão no mapa
      // (isso significa que foram filtradas por estarem processadas)
      const approvalsWithDetails = filteredApprovals
        .filter((approval) => {
          // Se é requisição de compra e não está no mapa, foi filtrada (já processada)
          if (approval.processo_tipo === 'requisicao_compra') {
            const reqData = requisicoesMap.get(approval.processo_id);
            if (!reqData) {
              console.log('🚫 [ApprovalService] Removendo aprovação final de requisição já processada:', {
                aprovacao_id: approval.id,
                requisicao_id: approval.processo_id
              });
              return false;
            }
          }
          // Se é cotação e não está no mapa, foi filtrada (já processada)
          if (approval.processo_tipo === 'cotacao_compra') {
            const cotData = cotacoesMap.get(approval.processo_id);
            if (!cotData) {
              console.log('🚫 [ApprovalService] Removendo aprovação final de cotação já processada:', {
                aprovacao_id: approval.id,
                cotacao_id: approval.processo_id
              });
              return false;
            }
          }
          // Se é conta a pagar e não está no mapa, foi filtrada (já paga)
          if (approval.processo_tipo === 'conta_pagar') {
            const contaData = contasMap.get(approval.processo_id);
            if (!contaData) {
              console.log('🚫 [ApprovalService] Removendo aprovação final de conta a pagar já paga:', {
                aprovacao_id: approval.id,
                conta_id: approval.processo_id
              });
              return false;
            }
          }
          return true;
        })
        .map((approval) => {
          if (approval.processo_tipo === 'requisicao_compra') {
            const reqData = requisicoesMap.get(approval.processo_id);
            if (reqData) {
              const solicitanteNome = usuariosMap.get(reqData.solicitante_id) || 'N/A';
              return {
                ...approval,
                numero_requisicao: reqData.numero_requisicao,
                solicitante_nome: solicitanteNome,
                comprador_nome: solicitanteNome,
                centro_custo_nome: reqData.centro_custo_id ? centroCustoMap.get(reqData.centro_custo_id) : undefined,
                projeto_nome: reqData.projeto_id ? projetoMap.get(reqData.projeto_id) : undefined
              };
            }
          }
          return approval;
        });
      
      // VERIFICAÇÃO FINAL DE SEGURANÇA: Garantir que nenhuma aprovação de requisição aprovada seja retornada
      // Buscar status de todas as requisições que ainda estão na lista final
      const requisicoesFinaisIds = approvalsWithDetails
        .filter(a => a.processo_tipo === 'requisicao_compra')
        .map(a => a.processo_id);
      
      if (requisicoesFinaisIds.length > 0) {
        try {
          // Usar EntityService para buscar status final das requisições
          const statusFinalPromises = requisicoesFinaisIds.map(reqId => 
            EntityService.getById<{ id: string; status: string; workflow_state?: string }>({
              schema: 'compras',
              table: 'requisicoes_compra',
              id: reqId,
              companyId
            })
          );
          
          const statusFinalResults = await Promise.all(statusFinalPromises);
          const statusFinal = statusFinalResults.filter(r => r !== null) as Array<{ id: string; status: string; workflow_state?: string }>;
          
          if (statusFinal && statusFinal.length > 0) {
            const aprovadasFinaisIds = new Set(
              statusFinal
                .filter(r => {
                  // Filtrar requisições já processadas
                  return r.status === 'aprovada' || 
                         r.workflow_state === 'em_pedido' || 
                         r.workflow_state === 'em_cotacao' || 
                         r.workflow_state === 'finalizada';
                })
                .map(r => r.id)
            );
            
            if (aprovadasFinaisIds.size > 0) {
              const antesFinal = approvalsWithDetails.length;
              const approvalsFinal = approvalsWithDetails.filter(a => {
                if (a.processo_tipo === 'requisicao_compra' && aprovadasFinaisIds.has(a.processo_id)) {
                  console.log('🚫 [ApprovalService] VERIFICAÇÃO FINAL: Removendo aprovação de requisição já processada:', {
                    aprovacao_id: a.id,
                    requisicao_id: a.processo_id
                  });
                  return false;
                }
                return true;
              });
              
              console.log('✅ [ApprovalService] Verificação final concluída:', {
                antes: antesFinal,
                depois: approvalsFinal.length,
                removidas: antesFinal - approvalsFinal.length
              });
              
              console.log('✅ [ApprovalService] Aprovações encontradas (final):', { 
                count: approvalsFinal?.length || 0, 
                processos: approvalsFinal?.map(a => ({ 
                  tipo: a.processo_tipo, 
                  id: a.processo_id, 
                  nivel: a.nivel_aprovacao,
                  numero: a.numero_requisicao,
                  solicitante: a.solicitante_nome
                }))
              });
              
              return approvalsFinal || [];
            }
          }
        } catch (finalErr) {
          console.warn('⚠️ [ApprovalService] Erro na verificação final:', finalErr);
        }
      }
      
      console.log('✅ [ApprovalService] Aprovações encontradas:', { 
        count: approvalsWithDetails?.length || 0, 
        processos: approvalsWithDetails?.map(a => ({ 
          tipo: a.processo_tipo, 
          id: a.processo_id, 
          nivel: a.nivel_aprovacao,
          numero: a.numero_requisicao,
          solicitante: a.solicitante_nome
        }))
      });
      
      return approvalsWithDetails || [];
    } catch (error) {
      console.error('❌ [ApprovalService] Erro na função getPendingApprovals:', error);
      throw error;
    }
  }

  static async getApprovalsByProcess(processo_tipo: string, processo_id: string, companyId: string): Promise<Approval[]> {
    try {
      const { data, error } = await supabase
        .from('aprovacoes_unificada')
        .select('*')
        .eq('company_id', companyId)
        .eq('processo_tipo', processo_tipo)
        .eq('processo_id', processo_id);
      
      if (error) {
        console.error('Erro ao buscar aprovações por processo:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getApprovalsByProcess:', error);
      throw error;
    }
  }

  /**
   * Busca o fluxo completo de aprovação para uma requisição
   * Retorna informações sobre a regra aplicada, aprovadores e seus status
   */
  static async getApprovalFlow(
    processo_tipo: string,
    processo_id: string,
    companyId: string
  ): Promise<{
    rule: string | null;
    totalLevels: number;
    approvalFlow: Array<{
      level: number;
      approverId: string;
      approverName: string;
      status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
      approvedAt: string | null;
      observacoes?: string;
    }>;
    completed: boolean;
  }> {
    try {
      // Buscar aprovações
      const { data: approvals, error: approvalsError } = await supabase
        .from('aprovacoes_unificada')
        .select(`
          id,
          nivel_aprovacao,
          aprovador_id,
          status,
          data_aprovacao,
          observacoes,
          created_at
        `)
        .eq('company_id', companyId)
        .eq('processo_tipo', processo_tipo)
        .eq('processo_id', processo_id)
        .order('nivel_aprovacao', { ascending: true });

      if (approvalsError) {
        console.error('Erro ao buscar aprovações:', approvalsError);
        throw approvalsError;
      }

      if (!approvals || approvals.length === 0) {
        return {
          rule: null,
          totalLevels: 0,
          approvalFlow: [],
          completed: false,
        };
      }

      // Buscar nomes dos aprovadores
      const approverIds = [...new Set(approvals.map((a: any) => a.aprovador_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, nome')
        .in('id', approverIds);

      if (usersError) {
        console.warn('Erro ao buscar nomes dos aprovadores:', usersError);
      }

      // Criar mapa de IDs para nomes
      const usersMap = new Map<string, string>();
      (users || []).forEach((user: any) => {
        usersMap.set(user.id, user.nome);
      });

      // Determinar regra aplicada (tentar buscar configuração relacionada)
      let ruleName: string | null = null;
      try {
        // Para requisições de compra, buscar dados da requisição para melhor matching
        let reqData: any = null;
        if (processo_tipo === 'requisicao_compra') {
          try {
            // Usar EntityService para acessar compras.requisicoes_compra via RPC genérica,
            // evitando problemas de schema no PostgREST (406 / schemas expostos).
            const requisicao = await EntityService.getById<{
              id: string;
              valor_total_estimado?: number | null;
              centro_custo_id?: string | null;
              solicitante_id?: string | null;
            }>({
              schema: 'compras',
              table: 'requisicoes_compra',
              id: processo_id,
              companyId,
            });

            if (requisicao) {
              reqData = requisicao;
            } else {
              console.warn(
                '[ApprovalService] Nenhuma requisicao_compra encontrada para cálculo de regra de aprovação',
                { processo_id, companyId }
              );
            }
          } catch (reqError) {
            console.warn('Erro ao buscar dados da requisição:', reqError);
          }
        }

        // Buscar configurações que poderiam se aplicar
        const { data: configs } = await supabase
          .from('configuracoes_aprovacao_unificada')
          .select('*')
          .eq('company_id', companyId)
          .eq('processo_tipo', processo_tipo)
          .eq('ativo', true);

        if (configs && configs.length > 0) {
          const maxLevel = Math.max(...approvals.map((a: any) => a.nivel_aprovacao));
          
          // Tentar encontrar a configuração mais provável
          let matchingConfig: any = null;
          
          if (reqData) {
            // Tentar matching mais preciso
            matchingConfig = configs.find((c: any) => {
              const levelMatches = c.nivel_aprovacao === maxLevel;
              if (reqData.centro_custo_id && c.centro_custo_id) {
                return levelMatches && c.centro_custo_id === reqData.centro_custo_id;
              }
              if (reqData.valor_total_estimado && c.valor_limite) {
                return levelMatches && reqData.valor_total_estimado <= c.valor_limite;
              }
              return levelMatches;
            });
          }
          
          // Se não encontrou match específico, usar a primeira com o nível correto
          if (!matchingConfig) {
            matchingConfig = configs.find((c: any) => c.nivel_aprovacao === maxLevel) || configs[0];
          }
          
          if (matchingConfig) {
            // Determinar tipo de regra
            if (matchingConfig.centro_custo_id) {
              ruleName = 'Regra por Centro de Custo';
            } else if (matchingConfig.valor_limite) {
              ruleName = `Regra por Valor (até R$ ${Number(matchingConfig.valor_limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
            } else if (matchingConfig.departamento) {
              ruleName = 'Regra por Departamento';
            } else {
              ruleName = `Regra de Aprovação Nível ${maxLevel}`;
            }
          }
        } else {
          // Se não há configuração, mostrar baseado no número de níveis
          const maxLevel = Math.max(...approvals.map((a: any) => a.nivel_aprovacao));
          ruleName = `Alçada de ${maxLevel} nível(is)`;
        }
      } catch (configError) {
        console.warn('Erro ao buscar configuração de aprovação:', configError);
        const maxLevel = Math.max(...approvals.map((a: any) => a.nivel_aprovacao));
        ruleName = `Alçada de ${maxLevel} nível(is)`;
      }

      // Mapear aprovações para o formato do fluxo
      const approvalFlow = approvals.map((approval: any) => ({
        level: approval.nivel_aprovacao,
        approverId: approval.aprovador_id,
        approverName: usersMap.get(approval.aprovador_id) || 'N/A',
        status: approval.status,
        approvedAt: approval.data_aprovacao || null,
        observacoes: approval.observacoes,
      }));

      // Calcular total de níveis
      const totalLevels = Math.max(...approvalFlow.map((a) => a.level));

      // Verificar se está completo
      const completed = approvalFlow.every((a) => a.status === 'aprovado');

      return {
        rule: ruleName || 'Regra de Aprovação',
        totalLevels,
        approvalFlow,
        completed,
      };
    } catch (error) {
      console.error('Erro na função getApprovalFlow:', error);
      throw error;
    }
  }

  static async processApproval(
    aprovacao_id: string,
    status: 'aprovado' | 'rejeitado' | 'cancelado',
    observacoes: string,
    aprovador_id: string
  ): Promise<boolean> {
    try {
      console.log('🔍 [ApprovalService.processApproval] INÍCIO - Parâmetros recebidos:', {
        aprovacao_id,
        status,
        observacoes: observacoes?.substring(0, 100) || '(vazio)',
        aprovador_id,
        timestamp: new Date().toISOString()
      });

      // Verificar se aprovador_id está presente
      if (!aprovador_id) {
        console.error('❌ [ApprovalService.processApproval] ERRO: aprovador_id está vazio ou null!');
        throw new Error('aprovador_id é obrigatório');
      }

      // Buscar informações da aprovação para identificar o tipo
      const { data: approvalData, error: approvalError } = await supabase
        .from('aprovacoes_unificada')
        .select('processo_tipo, processo_id, company_id')
        .eq('id', aprovacao_id)
        .single();

      if (!approvalError && approvalData) {
        console.log('📋 [ApprovalService.processApproval] Tipo de processo:', approvalData.processo_tipo);
        if (approvalData.processo_tipo === 'requisicao_compra') {
          console.log('🛒 [ApprovalService.processApproval] ⚠️ REQUISIÇÃO DE COMPRA detectada!');
          console.log('🛒 [ApprovalService.processApproval] Se aprovada, o trigger criará cotação automaticamente.');
          console.log('🛒 [ApprovalService.processApproval] Verifique os logs do banco (RAISE NOTICE) para rastrear a criação da cotação.');
        }
      }

      const rpcParams = {
        p_aprovacao_id: aprovacao_id,
        p_status: status,
        p_observacoes: observacoes,
        p_aprovador_id: aprovador_id
      };

      console.log('📡 [ApprovalService.processApproval] Chamando RPC process_approval com:', {
        ...rpcParams,
        observacoes: observacoes?.substring(0, 100) || '(vazio)'
      });

      const { data, error } = await supabase.rpc('process_approval', rpcParams);

      if (error) {
        console.error('❌ [ApprovalService.processApproval] Erro ao processar aprovação:', error);
        console.error('❌ [ApprovalService.processApproval] Detalhes do erro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        console.error('❌ [ApprovalService.processApproval] Parâmetros que causaram o erro:', rpcParams);
        throw error;
      }

      console.log('✅ [ApprovalService.processApproval] Sucesso! Resultado:', data);
      
      // Se foi uma requisição de compra aprovada, informar sobre a cotação
      if (!approvalError && approvalData && approvalData.processo_tipo === 'requisicao_compra' && status === 'aprovado') {
        console.log('🛒 [ApprovalService.processApproval] ✅ Requisição de compra aprovada!');
        console.log('🛒 [ApprovalService.processApproval] 📝 Se todas as aprovações foram concluídas, o trigger criará a cotação automaticamente.');
      }
      
      return data;
    } catch (error) {
      console.error('❌ [ApprovalService.processApproval] Erro na função processApproval:', error);
      console.error('❌ [ApprovalService.processApproval] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      throw error;
    }
  }

  static async transferApproval(
    aprovacao_id: string,
    novo_aprovador_id: string,
    motivo: string,
    transferido_por: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('transfer_approval', {
        p_aprovacao_id: aprovacao_id,
        p_novo_aprovador_id: novo_aprovador_id,
        p_motivo: motivo,
        p_transferido_por: transferido_por
      });

      if (error) {
        console.error('Erro ao transferir aprovação:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função transferApproval:', error);
      throw error;
    }
  }

  static async createApprovalsForProcess(
    processo_tipo: string,
    processo_id: string,
    companyId: string
  ): Promise<boolean> {
    try {
      console.log('🔍 [ApprovalService.createApprovalsForProcess] Chamando RPC:', {
        processo_tipo,
        processo_id,
        companyId
      });
      
      const { data, error } = await supabase.rpc('create_approvals_for_process', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id,
        p_company_id: companyId
      });

      if (error) {
        console.error('❌ [ApprovalService.createApprovalsForProcess] Erro ao criar aprovações');
        console.error('❌ Error completo (JSON):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error('❌ Error object keys:', Object.keys(error));
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Parâmetros passados:', {
          processo_tipo,
          processo_id,
          companyId
        });
        throw error;
      }
      
      console.log('✅ [ApprovalService.createApprovalsForProcess] Resultado:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [ApprovalService.createApprovalsForProcess] Exceção capturada');
      console.error('❌ Exception type:', typeof error);
      console.error('❌ Exception completo (JSON):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('❌ Exception message:', error?.message);
      console.error('❌ Exception code:', error?.code);
      console.error('❌ Exception details:', error?.details);
      console.error('❌ Exception hint:', error?.hint);
      console.error('❌ Exception stack:', error?.stack);
      console.error('❌ Parâmetros passados:', {
        processo_tipo,
        processo_id,
        companyId
      });
      throw error;
    }
  }

  static async resetApprovalsAfterEdit(
    processo_tipo: string,
    processo_id: string,
    companyId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_approvals_after_edit', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id,
        p_company_id: companyId
      });

      if (error) {
        console.error('Erro ao resetar aprovações:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função resetApprovalsAfterEdit:', error);
      throw error;
    }
  }

  static async canEditSolicitation(processo_tipo: string, processo_id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_edit_solicitation', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id
      });

      if (error) {
        console.error('Erro ao verificar permissão de edição:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função canEditSolicitation:', error);
      throw error;
    }
  }

  // =====================================================
  // SAÍDAS DE MATERIAIS
  // =====================================================

  static async getMaterialExitRequests(companyId: string, filters?: {
    funcionario_solicitante_id?: string;
    funcionario_receptor_id?: string;
    almoxarifado_id?: string;
    status?: string;
  }): Promise<MaterialExitRequest[]> {
    try {
      const result = await EntityService.list({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        filters: filters || {}
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Erro na função getMaterialExitRequests:', error);
      throw error;
    }
  }

  static async getMaterialExitRequest(id: string, companyId: string): Promise<MaterialExitRequest | null> {
    try {
      const result = await EntityService.get({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id
      });
      
      return result.data || null;
    } catch (error) {
      console.error('Erro na função getMaterialExitRequest:', error);
      throw error;
    }
  }

  static async createMaterialExitRequest(data: Omit<MaterialExitRequest, 'id' | 'created_at' | 'updated_at'>, companyId: string): Promise<MaterialExitRequest> {
    try {
      const result = await EntityService.create({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        data: { ...data, company_id: companyId }
      });
      
      return result.data;
    } catch (error) {
      console.error('Erro na função createMaterialExitRequest:', error);
      throw error;
    }
  }

  static async updateMaterialExitRequest(id: string, data: Partial<MaterialExitRequest>, companyId: string): Promise<MaterialExitRequest> {
    try {
      const result = await EntityService.update({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id,
        data
      });
      
      return result.data;
    } catch (error) {
      console.error('Erro na função updateMaterialExitRequest:', error);
      throw error;
    }
  }

  static async deleteMaterialExitRequest(id: string, companyId: string): Promise<void> {
    try {
      await EntityService.delete({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id
      });
    } catch (error) {
      console.error('Erro na função deleteMaterialExitRequest:', error);
      throw error;
    }
  }

  // =====================================================
  // HISTÓRICO DE EDIÇÕES
  // =====================================================

  static async getEditHistory(processo_tipo: string, processo_id: string, companyId: string): Promise<EditHistory[]> {
    try {
      const { data, error } = await supabase
        .from('historico_edicoes_solicitacoes')
        .select('*')
        .eq('company_id', companyId)
        .eq('processo_tipo', processo_tipo)
        .eq('processo_id', processo_id)
        .order('data_edicao', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar histórico de edições:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getEditHistory:', error);
      throw error;
    }
  }

  static async createEditHistory(data: Omit<EditHistory, 'id' | 'created_at'>, companyId: string): Promise<EditHistory> {
    try {
      const { data: result, error } = await supabase
        .from('historico_edicoes_solicitacoes')
        .insert({ ...data, company_id: companyId })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar histórico de edição:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função createEditHistory:', error);
      throw error;
    }
  }
}
