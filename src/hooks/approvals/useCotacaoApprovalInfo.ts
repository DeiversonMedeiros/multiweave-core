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

          // ✅ CORREÇÃO: Calcular valor total apenas dos ITENS VENCEDORES (mesma lógica do CotacaoDetails)
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

              // Filtrar APENAS itens vencedores
              const itensVencedores = (itensResult.data || []).filter(item => 
                item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor'
              );

              // Calcular valor base dos itens vencedores
              let valorBaseItens = 0;
              let freteItens = 0;
              let descontoItens = 0;

              for (const item of itensVencedores) {
                // Valor base do item
                const quantidade = item.quantidade_ofertada != null 
                  ? (typeof item.quantidade_ofertada === 'string' ? parseFloat(item.quantidade_ofertada) : Number(item.quantidade_ofertada)) || 0
                  : 0;
                const valorUnitario = item.valor_unitario != null
                  ? (typeof item.valor_unitario === 'string' ? parseFloat(item.valor_unitario) : Number(item.valor_unitario)) || 0
                  : 0;
                const valorBaseItem = quantidade * valorUnitario;
                valorBaseItens += valorBaseItem;

                // Frete do item
                const freteItem = item.valor_frete != null
                  ? (typeof item.valor_frete === 'string' ? parseFloat(item.valor_frete) : Number(item.valor_frete)) || 0
                  : 0;
                freteItens += freteItem;

                // Desconto do item (percentual + valor)
                const descontoPercentualItem = item.desconto_percentual != null
                  ? (typeof item.desconto_percentual === 'string' ? parseFloat(item.desconto_percentual) : Number(item.desconto_percentual)) || 0
                  : 0;
                const descontoValorItem = item.desconto_valor != null
                  ? (typeof item.desconto_valor === 'string' ? parseFloat(item.desconto_valor) : Number(item.desconto_valor)) || 0
                  : 0;
                const descontoPercentualCalculado = valorBaseItem * (descontoPercentualItem / 100);
                descontoItens += descontoPercentualCalculado + descontoValorItem;
              }

              // Frete e imposto do fornecedor
              const freteFornecedor = Number(fornecedor.valor_frete) || 0;
              const impostoFornecedor = Number(fornecedor.valor_imposto) || 0;
              
              // Desconto do fornecedor (percentual sobre valor base dos itens + valor absoluto)
              const descontoPercentualFornecedor = Number(fornecedor.desconto_percentual) || 0;
              const descontoPercentualCalculadoFornecedor = valorBaseItens * (descontoPercentualFornecedor / 100);
              const descontoValorFornecedor = Number(fornecedor.desconto_valor) || 0;
              const descontoFornecedor = descontoPercentualCalculadoFornecedor + descontoValorFornecedor;

              // Total do fornecedor = Valor Base Itens + Frete (fornecedor + itens) + Imposto - Desconto (fornecedor + itens)
              const freteTotal = freteFornecedor + impostoFornecedor + freteItens;
              const descontoTotal = descontoFornecedor + descontoItens;
              const valorFornecedor = valorBaseItens + freteTotal - descontoTotal;

              console.log(`[useCotacaoApprovalInfo] Fornecedor ${fornecedor.id} calculado:`, {
                itensVencedores: itensVencedores.length,
                valorBaseItens,
                freteFornecedor,
                impostoFornecedor,
                freteItens,
                freteTotal,
                descontoFornecedor,
                descontoItens,
                descontoTotal,
                valorFornecedor
              });

              valorTotal += valorFornecedor;
            } catch (itemErr) {
              console.warn('[useCotacaoApprovalInfo] Erro ao buscar itens do fornecedor:', itemErr);
            }
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
