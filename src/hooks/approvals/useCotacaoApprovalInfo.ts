import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

interface CotacaoApprovalInfo {
  numero_cotacao?: string;
  comprador_nome?: string;
  comprador_email?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  valor_total?: number;
  /** Valor final (com frete, desconto, impostos, desconto geral do ciclo) - usar este no card de aprovação */
  valor_final?: number;
  status?: string;
}

export function useCotacaoApprovalInfo(cotacaoId?: string) {
  const { selectedCompany } = useCompany();

  return useQuery<CotacaoApprovalInfo | null>({
    queryKey: ['cotacao-approval-info', cotacaoId, selectedCompany?.id],
    queryFn: async () => {
      if (!cotacaoId || !selectedCompany?.id) return null;

      try {
        // Buscar ciclo de cotação (incluir requisicao_id para comprador, centro e projeto)
        const cicloResult = await EntityService.getById<{
          id: string;
          numero_cotacao?: string;
          status?: string;
          requisicao_id?: string;
          valor_frete?: number;
          desconto_percentual?: number;
          desconto_valor?: number;
        }>({
          schema: 'compras',
          table: 'cotacao_ciclos',
          id: cotacaoId,
          companyId: selectedCompany.id
        });

        if (!cicloResult) return null;

        // Buscar requisição para comprador, centro de custo e projeto
        let compradorNome: string | undefined;
        let compradorEmail: string | undefined;
        let centroCustoNome: string | undefined;
        let projetoNome: string | undefined;

        if (cicloResult.requisicao_id) {
          try {
            const reqResult = await EntityService.getById<{
              id: string;
              created_by?: string;
              solicitante_id?: string;
              centro_custo_id?: string;
              projeto_id?: string;
            }>({
              schema: 'compras',
              table: 'requisicoes_compra',
              id: cicloResult.requisicao_id,
              companyId: selectedCompany.id
            });
            if (reqResult) {
              const compradorId = reqResult.created_by || reqResult.solicitante_id;
              // Comprador: priorizar nome do colaborador (rh.employees), senão perfil (profiles)
              if (compradorId) {
                try {
                  const empList = await EntityService.list<{ id: string; nome?: string; user_id?: string }>({
                    schema: 'rh',
                    table: 'employees',
                    companyId: selectedCompany.id,
                    filters: { user_id: compradorId },
                    page: 1,
                    pageSize: 1
                  });
                  const emp = (empList.data || [])[0];
                  if (emp?.nome) {
                    compradorNome = emp.nome;
                  }
                } catch (_) {}
                if (!compradorNome) {
                  const { data: profile } = await supabase.from('profiles').select('nome, email').eq('id', compradorId).single();
                  if (profile) {
                    compradorNome = profile.nome || profile.email;
                    compradorEmail = profile.email;
                  }
                }
              }
              if (reqResult.centro_custo_id) {
                const cc = await EntityService.getById<{ id: string; nome: string }>({
                  schema: 'public',
                  table: 'cost_centers',
                  id: reqResult.centro_custo_id,
                  companyId: selectedCompany.id
                });
                centroCustoNome = cc?.nome;
              }
              if (reqResult.projeto_id) {
                const proj = await EntityService.getById<{ id: string; nome: string }>({
                  schema: 'public',
                  table: 'projects',
                  id: reqResult.projeto_id,
                  companyId: selectedCompany.id
                });
                projetoNome = proj?.nome;
              }
            }
          } catch (err) {
            console.warn('[useCotacaoApprovalInfo] Erro ao buscar requisição/comprador/centro/projeto:', err);
          }
        }

        // Calcular valor total - usar a mesma lógica do CotacaoDetails
        // Somar TODOS os fornecedores vencedores/selecionados
        let valorTotal = 0;
        try {
          const fornecedoresResult = await EntityService.list<{
            id: string;
            valor_frete?: number;
            valor_imposto?: number;
            desconto_valor?: number;
            desconto_percentual?: number;
            preco_total?: number;
            status?: string;
            selecionado?: boolean;
          }>({
            schema: 'compras',
            table: 'cotacao_fornecedores',
            companyId: selectedCompany.id,
            filters: { cotacao_id: cotacaoId },
            page: 1,
            pageSize: 1000, // Buscar todos (igual CotacaoDetails)
            skipCompanyFilter: true
          });

          // Filtrar fornecedores vencedores/selecionados (mesma lógica do CotacaoDetails)
          const todosFornecedores = fornecedoresResult.data || [];
          
          let fornecedoresVencedores = todosFornecedores.filter(f => {
            // Prioridade 1: Campo selecionado explícito
            if ('selecionado' in f && f.selecionado !== undefined) {
              return f.selecionado === true;
            }
            // Prioridade 2: Status aprovada ou completa
            if (f.status && (f.status === 'aprovada' || f.status === 'completa')) {
              return true;
            }
            // Se não houver critério, mostrar todos (para o gestor ver todas as opções)
            return true;
          });

          // Se não encontrou nenhum com critério, mostrar todos
          if (fornecedoresVencedores.length === 0 && todosFornecedores.length > 0) {
            fornecedoresVencedores = todosFornecedores;
          }

          // Igual CotacaoDetails: só incluir fornecedores que têm PELO MENOS UM item vencedor
          const fornecedoresComItensVencedores: Array<typeof fornecedoresVencedores[0] & { itensVencedores: any[] }> = [];
          for (const fornecedor of fornecedoresVencedores) {
            try {
              const itensResult = await EntityService.list<{
                valor_total_calculado?: number;
                valor_total?: number;
                valor_unitario?: number;
                quantidade_ofertada?: number;
                valor_frete?: number;
                desconto_percentual?: number;
                desconto_valor?: number;
                is_vencedor?: boolean | string;
                status?: string;
              }>({
                schema: 'compras',
                table: 'cotacao_item_fornecedor',
                companyId: selectedCompany.id,
                filters: { cotacao_fornecedor_id: fornecedor.id },
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true
              });

              const itensVencedores = (itensResult.data || []).filter(item =>
                item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor'
              );

              if (itensVencedores.length === 0) continue;
              fornecedoresComItensVencedores.push({ ...fornecedor, itensVencedores });
            } catch (itemErr) {
              console.warn('[useCotacaoApprovalInfo] Erro ao buscar itens do fornecedor:', itemErr);
            }
          }

          console.log('[useCotacaoApprovalInfo] Fornecedores com itens vencedores:', fornecedoresComItensVencedores.length);

          let valorTotalItens = 0;
          let valorTotalFrete = 0;
          let valorTotalDescontoSemGeral = 0;

          for (const fornecedor of fornecedoresComItensVencedores) {
            const itensVencedores = fornecedor.itensVencedores;

            // Valor dos itens vencedores (igual CotacaoDetails: item.valor_total)
            const valorItensFornecedor = itensVencedores.reduce((sum, item) => {
              const vt = item.valor_total_calculado != null
                ? (typeof item.valor_total_calculado === 'string' ? parseFloat(item.valor_total_calculado) : Number(item.valor_total_calculado)) || 0
                : (item.valor_total != null ? (typeof item.valor_total === 'string' ? parseFloat(item.valor_total) : Number(item.valor_total)) || 0 : 0);
              return sum + vt;
            }, 0);
            valorTotalItens += valorItensFornecedor;

            // Frete: fornecedor + imposto + frete dos itens vencedores
            const freteItens = itensVencedores.reduce((s, item) => s + (Number(item.valor_frete) || 0), 0);
            valorTotalFrete += (Number(fornecedor.valor_frete) || 0) + (Number(fornecedor.valor_imposto) || 0) + freteItens;

            // Desconto fornecedor (percentual sobre itens + valor)
            const descontoPctFornecedor = valorItensFornecedor * ((Number(fornecedor.desconto_percentual) || 0) / 100);
            const descontoValorFornecedor = Number(fornecedor.desconto_valor) || 0;
            const descontoFornecedor = descontoPctFornecedor + descontoValorFornecedor;
            // Desconto dos itens
            const descontoItens = itensVencedores.reduce((itemSum, item) => {
              const valorItem = item.valor_total_calculado != null
                ? (typeof item.valor_total_calculado === 'string' ? parseFloat(item.valor_total_calculado) : Number(item.valor_total_calculado)) || 0
                : (Number(item.valor_total) || 0);
              const pct = Number(item.desconto_percentual) || 0;
              const val = Number(item.desconto_valor) || 0;
              return itemSum + (valorItem * (pct / 100)) + val;
            }, 0);
            valorTotalDescontoSemGeral += descontoFornecedor + descontoItens;
          }

          // Frete do ciclo (nível cotação)
          valorTotalFrete += cicloResult.valor_frete != null ? Number(cicloResult.valor_frete) : 0;

          // Desconto geral do ciclo (igual CotacaoDetails)
          const baseParaDescontoGeral = valorTotalItens + valorTotalFrete - valorTotalDescontoSemGeral;
          const descontoGeral = baseParaDescontoGeral * ((cicloResult.desconto_percentual != null ? Number(cicloResult.desconto_percentual) : 0) / 100)
            + (cicloResult.desconto_valor != null ? Number(cicloResult.desconto_valor) : 0);
          const valorTotalDesconto = valorTotalDescontoSemGeral + descontoGeral;

          const valorTotalFinal = valorTotalItens + valorTotalFrete - valorTotalDesconto;
          valorTotal = valorTotalFinal;

          console.log('[useCotacaoApprovalInfo] Valor final calculado:', { valorTotalItens, valorTotalFrete, valorTotalDesconto, valorTotalFinal });
        } catch (err) {
          console.warn('[useCotacaoApprovalInfo] Erro ao calcular valor total:', err);
        }

        return {
          numero_cotacao: cicloResult.numero_cotacao,
          comprador_nome: compradorNome,
          comprador_email: compradorEmail,
          centro_custo_nome: centroCustoNome,
          projeto_nome: projetoNome,
          valor_total: valorTotal,
          valor_final: valorTotal,
          status: cicloResult.status
        };
      } catch (error) {
        console.error('[useCotacaoApprovalInfo] Erro ao buscar informações da cotação:', error);
        return null;
      }
    },
    enabled: !!cotacaoId && !!selectedCompany?.id,
    staleTime: 30000, // 30 segundos
  });
}
