import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { ContaPagar, ContaPagarRateio } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';

export interface ContaPagarApprovalRateioLine {
  centro_custo_nome: string;
  projeto_nome?: string;
  tipo_rateio: 'percentual' | 'valor';
  valor_percentual?: number;
  valor_monetario?: number;
}

interface ContaPagarApprovalInfo {
  numero_titulo: string;
  fornecedor_nome?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  valor_atual: number;
  created_by_name?: string;
  /** Preenchido quando a conta tem rateio (múltiplos centros/projetos) */
  rateio?: ContaPagarApprovalRateioLine[];
}

export function useContaPagarApprovalInfo(contaPagarId: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['conta-pagar-approval-info', contaPagarId, selectedCompany?.id],
    queryFn: async (): Promise<ContaPagarApprovalInfo | null> => {
      if (!selectedCompany?.id || !contaPagarId) return null;

      try {
        // Buscar conta a pagar
        const conta = await EntityService.getById<ContaPagar>({
          schema: 'financeiro',
          table: 'contas_pagar',
          id: contaPagarId,
          companyId: selectedCompany.id
        });

        if (!conta) return null;

        // Buscar centro de custo
        let centroCustoNome: string | undefined;
        if (conta.centro_custo_id) {
          try {
            const centroCusto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'cost_centers',
              id: conta.centro_custo_id,
              companyId: selectedCompany.id
            });
            centroCustoNome = centroCusto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar centro de custo:', err);
          }
        }

        // Buscar projeto
        let projetoNome: string | undefined;
        if (conta.projeto_id) {
          try {
            const projeto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'projects',
              id: conta.projeto_id,
              companyId: selectedCompany.id
            });
            projetoNome = projeto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar projeto:', err);
          }
        }

        // Rateio: carregar linhas de rateio quando existirem
        let rateioLines: ContaPagarApprovalRateioLine[] | undefined;
        const rateioResult = await EntityService.list<ContaPagarRateio>({
          schema: 'financeiro',
          table: 'contas_pagar_rateio',
          companyId: selectedCompany.id,
          filters: { conta_pagar_id: contaPagarId },
          pageSize: 100,
        });
        const rateioList = rateioResult?.data ?? [];
        if (rateioList.length > 0) {
          rateioLines = await Promise.all(
            rateioList.map(async (r) => {
              let centroCustoNome = '';
              let projetoNomeR = '';
              try {
                const cc = await EntityService.getById<{ nome: string }>({
                  schema: 'public',
                  table: 'cost_centers',
                  id: r.centro_custo_id,
                  companyId: selectedCompany.id,
                });
                centroCustoNome = cc?.nome ?? '';
              } catch (_) {}
              if (r.projeto_id) {
                try {
                  const pr = await EntityService.getById<{ nome: string }>({
                    schema: 'public',
                    table: 'projects',
                    id: r.projeto_id,
                    companyId: selectedCompany.id,
                  });
                  projetoNomeR = pr?.nome ?? '';
                } catch (_) {}
              }
              return {
                centro_custo_nome: centroCustoNome,
                projeto_nome: projetoNomeR || undefined,
                tipo_rateio: r.tipo_rateio,
                valor_percentual: r.valor_percentual ?? undefined,
                valor_monetario: r.valor_monetario ?? undefined,
              };
            })
          );
          centroCustoNome = `Rateio (${rateioList.length} linha(s))`;
          projetoNome = undefined;
        }

        // Buscar nome do fornecedor (conta pode ter só fornecedor_id; partners tem razao_social)
        let fornecedorNome = conta.fornecedor_nome;
        if (!fornecedorNome && conta.fornecedor_id) {
          try {
            const partner = await EntityService.getById<{ id: string; razao_social?: string; nome?: string }>({
              schema: 'public',
              table: 'partners',
              id: conta.fornecedor_id,
              companyId: selectedCompany.id
            });
            if (partner) {
              fornecedorNome = partner.razao_social || partner.nome;
            }
          } catch (err) {
            console.warn('Erro ao buscar fornecedor:', err);
          }
        }

        // Buscar nome do criador
        let createdByName: string | undefined;
        if (conta.created_by) {
          try {
            // Usar supabase diretamente pois users não tem company_id
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('nome, email')
              .eq('id', conta.created_by)
              .single();
            
            if (!userError && user) {
              createdByName = user.nome || user.email || 'Usuário não encontrado';
            }
          } catch (err) {
            console.warn('Erro ao buscar criador:', err);
          }
        }

        return {
          numero_titulo: conta.numero_titulo,
          fornecedor_nome: fornecedorNome,
          centro_custo_nome: centroCustoNome,
          projeto_nome: projetoNome,
          valor_atual: conta.valor_atual,
          created_by_name: createdByName,
          rateio: rateioLines,
        };
      } catch (error) {
        console.error('Erro ao buscar informações da conta a pagar:', error);
        return null;
      }
    },
    enabled: !!selectedCompany?.id && !!contaPagarId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

