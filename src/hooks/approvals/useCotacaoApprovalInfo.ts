import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

interface CotacaoApprovalInfo {
  numero_cotacao?: string;
  comprador_nome?: string;
  comprador_email?: string;
  valor_total?: number;
  status?: string;
}

export function useCotacaoApprovalInfo(cotacaoId?: string) {
  const { selectedCompany } = useCompany();

  return useQuery<CotacaoApprovalInfo | null>({
    queryKey: ['cotacao-approval-info', cotacaoId, selectedCompany?.id],
    queryFn: async () => {
      if (!cotacaoId || !selectedCompany?.id) return null;

      try {
        // Buscar ciclo de cotação
        const cicloResult = await EntityService.getById<{
          id: string;
          numero_cotacao?: string;
          status?: string;
          created_by?: string;
        }>({
          schema: 'compras',
          table: 'cotacao_ciclos',
          id: cotacaoId,
          companyId: selectedCompany.id
        });

        if (!cicloResult) return null;

        // Buscar informações do comprador
        let compradorNome: string | undefined;
        let compradorEmail: string | undefined;
        
        if (cicloResult.created_by) {
          try {
            // Usar supabase diretamente pois users não tem company_id
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('nome, email')
              .eq('id', cicloResult.created_by)
              .single();
            
            if (!userError && user) {
              compradorNome = user.nome || user.email || 'Usuário não encontrado';
              compradorEmail = user.email;
            }
          } catch (err) {
            console.warn('[useCotacaoApprovalInfo] Erro ao buscar comprador:', err);
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
            preco_total?: number;
            status?: string;
            selecionado?: boolean;
          }>({
            schema: 'compras',
            table: 'cotacao_fornecedores',
            companyId: selectedCompany.id,
            filters: { cotacao_id: cotacaoId },
            page: 1,
            pageSize: 100, // Buscar todos
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

          console.log('[useCotacaoApprovalInfo] Fornecedores vencedores encontrados:', fornecedoresVencedores.length);

          // Calcular valor total somando TODOS os fornecedores vencedores
          for (const fornecedor of fornecedoresVencedores) {
            let valorFornecedor = 0;

            // Se houver preco_total, usar ele como base
            if (fornecedor.preco_total) {
              valorFornecedor = Number(fornecedor.preco_total) || 0;
              console.log(`[useCotacaoApprovalInfo] Fornecedor ${fornecedor.id} usando preco_total:`, valorFornecedor);
            } else {
              // Calcular a partir dos itens
              try {
                const itensResult = await EntityService.list<{
                  valor_total_calculado?: number;
                  valor_total?: number; // Fallback
                }>({
                  schema: 'compras',
                  table: 'cotacao_item_fornecedor',
                  companyId: selectedCompany.id,
                  filters: { cotacao_fornecedor_id: fornecedor.id },
                  page: 1,
                  pageSize: 1000, // Buscar todos os itens
                  skipCompanyFilter: true
                });

                // Usar valor_total_calculado (campo correto da tabela)
                const valorItens = (itensResult.data || []).reduce((sum, item) => {
                  const valor = item.valor_total_calculado != null 
                    ? Number(item.valor_total_calculado) || 0
                    : (item.valor_total != null ? Number(item.valor_total) || 0 : 0);
                  return sum + valor;
                }, 0);

                const freteImposto = (Number(fornecedor.valor_frete) || 0) + 
                                     (Number(fornecedor.valor_imposto) || 0);
                const desconto = Number(fornecedor.desconto_valor) || 0;
                
                // Total = Itens + Frete/Impostos - Desconto
                valorFornecedor = valorItens + freteImposto - desconto;
                console.log(`[useCotacaoApprovalInfo] Fornecedor ${fornecedor.id} calculado:`, {
                  valorItens,
                  freteImposto,
                  desconto,
                  valorFornecedor
                });
              } catch (itemErr) {
                console.warn('[useCotacaoApprovalInfo] Erro ao buscar itens do fornecedor:', itemErr);
              }
            }

            valorTotal += valorFornecedor;
          }

          console.log('[useCotacaoApprovalInfo] Valor total final calculado:', valorTotal);
        } catch (err) {
          console.warn('[useCotacaoApprovalInfo] Erro ao calcular valor total:', err);
        }

        return {
          numero_cotacao: cicloResult.numero_cotacao,
          comprador_nome: compradorNome,
          comprador_email: compradorEmail,
          valor_total: valorTotal,
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
