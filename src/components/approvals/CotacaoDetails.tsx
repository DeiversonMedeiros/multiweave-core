import React, { useEffect, useState } from 'react';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingDown, Truck, Package, CheckCircle, AlertTriangle, Info, User, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CotacaoFornecedor {
  id: string;
  fornecedor_id: string;
  fornecedor_nome?: string;
  valor_frete?: number;
  valor_imposto?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  preco_total?: number;
  prazo_entrega?: number;
  condicoes_comerciais?: string;
  observacoes?: string;
  status?: string;
  itens: CotacaoItemFornecedor[];
}

interface CotacaoItemFornecedor {
  id: string;
  requisicao_item_id: string;
  material_id: string;
  material_nome?: string;
  quantidade_ofertada?: number;
  quantidade?: number;
  valor_unitario: number;
  valor_total_calculado?: number;
  valor_total?: number;
  valor_frete?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  prazo_entrega_dias?: number;
  prazo_entrega?: number;
  observacoes?: string;
}

interface CotacaoCiclo {
  id: string;
  requisicao_id: string;
  numero_cotacao?: string;
  observacoes?: string;
  status?: string;
  workflow_state?: string;
  created_by?: string;
  created_at?: string;
  valor_frete?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
}

interface CompradorInfo {
  id: string;
  nome: string;
  email?: string;
}

interface CotacaoDetailsData {
  ciclo: CotacaoCiclo;
  comprador?: CompradorInfo;
  fornecedores: CotacaoFornecedor[];
  valorTotalItens: number;
  valorTotalFrete: number;
  valorTotalDesconto: number;
  valorTotalFinal: number;
  valorSaving: number;
  justificativa?: string;
  isCotacaoAntiga: boolean;
}

interface CotacaoDetailsProps {
  cotacaoId: string;
}

export function CotacaoDetails({ cotacaoId }: CotacaoDetailsProps) {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<CotacaoDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedCompany?.id || !cotacaoId) {
        console.warn('[CotacaoDetails] Missing company or cotacaoId:', { companyId: selectedCompany?.id, cotacaoId });
        setError('Dados insuficientes para carregar a cotação');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('[CotacaoDetails] Iniciando busca de dados:', { cotacaoId, companyId: selectedCompany.id });
        
        // 1. Buscar ciclo de cotação
        const cicloResult = await EntityService.getById<CotacaoCiclo>({
          schema: 'compras',
          table: 'cotacao_ciclos',
          id: cotacaoId,
          companyId: selectedCompany.id
        });

        console.log('[CotacaoDetails] Ciclo encontrado:', cicloResult);

        if (!cicloResult) {
          console.error('[CotacaoDetails] Ciclo não encontrado para ID:', cotacaoId);
          setError('Cotação não encontrada');
          setLoading(false);
          return;
        }

        // 2. Buscar informações do comprador
        let comprador: CompradorInfo | undefined;
        if (cicloResult.created_by) {
          try {
            const compradorData = await EntityService.getById<{ id: string; nome: string; email?: string }>({
              schema: 'public',
              table: 'users',
              id: cicloResult.created_by,
              companyId: selectedCompany.id
            });
            if (compradorData) {
              comprador = {
                id: compradorData.id,
                nome: compradorData.nome,
                email: compradorData.email
              };
            }
          } catch (err) {
            console.warn('[CotacaoDetails] Erro ao buscar comprador:', err);
          }
        }

        // 3. Buscar fornecedores da cotação
        const fornecedoresResult = await EntityService.list<{
          id: string;
          fornecedor_id: string;
          valor_frete?: number;
          valor_imposto?: number;
          desconto_percentual?: number;
          desconto_valor?: number;
          preco_total?: number;
          prazo_entrega?: number;
          condicoes_comerciais?: string;
          observacoes?: string;
          status?: string;
          selecionado?: boolean;
        }>({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: selectedCompany.id,
          filters: { cotacao_id: cotacaoId },
          page: 1,
          pageSize: 1000,
          skipCompanyFilter: true
        });

        console.log('[CotacaoDetails] Fornecedores encontrados:', fornecedoresResult.data?.length || 0);
        console.log('[CotacaoDetails] Dados brutos dos fornecedores (COMPLETO):', JSON.stringify(fornecedoresResult.data, null, 2));
        console.log('[CotacaoDetails] Dados brutos dos fornecedores (RESUMO):', fornecedoresResult.data?.map(f => ({
          id: f.id,
          cotacao_id: f.cotacao_id,
          fornecedor_id: f.fornecedor_id,
          valor_frete: f.valor_frete,
          valor_frete_type: typeof f.valor_frete,
          valor_imposto: f.valor_imposto,
          valor_imposto_type: typeof f.valor_imposto,
          desconto_percentual: f.desconto_percentual,
          desconto_percentual_type: typeof f.desconto_percentual,
          desconto_valor: f.desconto_valor,
          desconto_valor_type: typeof f.desconto_valor,
          status: f.status,
          preco_total: f.preco_total,
          todas_chaves: Object.keys(f)
        })));

        // Se não houver fornecedores, buscar TODOS (pode ser que ainda não tenha sido finalizada)
        const todosFornecedores = fornecedoresResult.data || [];
        
        // Log detalhado dos valores brutos antes do filtro
        console.log('[CotacaoDetails] Todos os fornecedores ANTES do filtro:', todosFornecedores.map(f => ({
          id: f.id,
          valor_frete: f.valor_frete,
          valor_frete_raw: f.valor_frete,
          valor_imposto: f.valor_imposto,
          desconto_percentual: f.desconto_percentual,
          desconto_valor: f.desconto_valor,
          status: f.status
        })));
        
        // Filtrar fornecedores vencedores/selecionados
        // Se não houver critério de seleção, mostrar todos os que têm status 'completa' ou 'aprovada'
        // Se não houver nenhum com esses status, mostrar todos para o gestor ver
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
        
        // Log detalhado dos valores após o filtro
        console.log('[CotacaoDetails] Fornecedores vencedores APÓS filtro:', fornecedoresVencedores.map(f => ({
          id: f.id,
          fornecedor_id: f.fornecedor_id,
          valor_frete: f.valor_frete,
          valor_frete_type: typeof f.valor_frete,
          valor_imposto: f.valor_imposto,
          valor_imposto_type: typeof f.valor_imposto,
          desconto_percentual: f.desconto_percentual,
          desconto_percentual_type: typeof f.desconto_percentual,
          desconto_valor: f.desconto_valor,
          desconto_valor_type: typeof f.desconto_valor,
          todas_chaves: Object.keys(f)
        })));

        // Se não encontrou nenhum com critério, mostrar todos
        if (fornecedoresVencedores.length === 0 && todosFornecedores.length > 0) {
          console.log('[CotacaoDetails] Nenhum fornecedor com critério de seleção, mostrando todos');
          fornecedoresVencedores = todosFornecedores;
        }

        console.log('[CotacaoDetails] Fornecedores vencedores:', fornecedoresVencedores.length);

        // Verificar se é cotação antiga (sem campos de frete/desconto)
        const isCotacaoAntiga = fornecedoresVencedores.length > 0 && 
          fornecedoresVencedores.every(f => 
            (f.valor_frete === undefined || f.valor_frete === null) &&
            (f.desconto_valor === undefined || f.desconto_valor === null)
          );

        // 4. Buscar itens e dados completos para cada fornecedor
        const fornecedoresCompletos: CotacaoFornecedor[] = await Promise.all(
          fornecedoresVencedores.map(async (fornecedor) => {
            // Buscar nome do fornecedor
            let fornecedorNome = 'Fornecedor não encontrado';
            try {
              const fornecedorData = await EntityService.getById<{ 
                nome_fantasia?: string; 
                razao_social?: string;
                partner_id?: string;
              }>({
                schema: 'compras',
                table: 'fornecedores_dados',
                id: fornecedor.fornecedor_id,
                companyId: selectedCompany.id
              });
              
              if (fornecedorData) {
                fornecedorNome = fornecedorData.nome_fantasia || fornecedorData.razao_social || fornecedorNome;
                
                // Se não encontrou nome, tentar buscar em partners
                if (!fornecedorData.nome_fantasia && !fornecedorData.razao_social && fornecedorData.partner_id) {
                  try {
                    const partner = await EntityService.getById<{ nome_fantasia?: string; razao_social?: string }>({
                      schema: 'public',
                      table: 'partners',
                      id: fornecedorData.partner_id,
                      companyId: selectedCompany.id
                    });
                    fornecedorNome = partner?.nome_fantasia || partner?.razao_social || fornecedorNome;
                  } catch (err) {
                    console.warn('[CotacaoDetails] Erro ao buscar partner:', err);
                  }
                }
              }
            } catch (err) {
              console.warn('[CotacaoDetails] Erro ao buscar fornecedor:', err);
            }

            // Buscar itens deste fornecedor
            const itensResult = await EntityService.list<any>({
              schema: 'compras',
              table: 'cotacao_item_fornecedor',
              companyId: selectedCompany.id,
              filters: { cotacao_fornecedor_id: fornecedor.id },
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true
            });

            console.log(`[CotacaoDetails] Fornecedor ${fornecedor.id} tem ${itensResult.data?.length || 0} itens`);
            console.log(`[CotacaoDetails] Itens brutos do fornecedor:`, itensResult.data);

            // Buscar nomes dos materiais
            const itensComNomes = await Promise.all(
              (itensResult.data || []).map(async (item: any) => {
                // Log detalhado dos valores brutos
                console.log(`[CotacaoDetails] Item bruto:`, {
                  id: item.id,
                  quantidade_ofertada: item.quantidade_ofertada,
                  quantidade_ofertada_type: typeof item.quantidade_ofertada,
                  valor_unitario: item.valor_unitario,
                  valor_unitario_type: typeof item.valor_unitario,
                  valor_total_calculado: item.valor_total_calculado,
                  valor_total_calculado_type: typeof item.valor_total_calculado,
                  valor_frete: item.valor_frete,
                  valor_frete_type: typeof item.valor_frete,
                  desconto_percentual: item.desconto_percentual,
                  desconto_percentual_type: typeof item.desconto_percentual,
                  desconto_valor: item.desconto_valor,
                  desconto_valor_type: typeof item.desconto_valor,
                  todas_chaves: Object.keys(item)
                });

                // Mapear campos corretos da tabela: quantidade_ofertada e valor_total_calculado
                const quantidadeOfertada = item.quantidade_ofertada != null 
                  ? (typeof item.quantidade_ofertada === 'string' ? parseFloat(item.quantidade_ofertada) : Number(item.quantidade_ofertada)) || 0
                  : 0;
                const valorUnitario = item.valor_unitario != null
                  ? (typeof item.valor_unitario === 'string' ? parseFloat(item.valor_unitario) : Number(item.valor_unitario)) || 0
                  : 0;
                const valorTotalCalculado = item.valor_total_calculado != null
                  ? (typeof item.valor_total_calculado === 'string' ? parseFloat(item.valor_total_calculado) : Number(item.valor_total_calculado)) || 0
                  : 0;

                console.log(`[CotacaoDetails] Item normalizado:`, {
                  id: item.id,
                  quantidade: quantidadeOfertada,
                  valorUnitario,
                  valorTotal: valorTotalCalculado
                });
                let materialNome = 'Material não encontrado';
                try {
                  const material = await EntityService.getById<{ nome?: string; descricao?: string }>({
                    schema: 'almoxarifado',
                    table: 'materiais_equipamentos',
                    id: item.material_id,
                    companyId: selectedCompany.id
                  });
                  materialNome = material?.nome || material?.descricao || materialNome;
                } catch (err) {
                  console.warn('[CotacaoDetails] Erro ao buscar material:', err);
                }
                // Garantir conversão dos descontos do item
                const descontoPercentualItem = item.desconto_percentual != null
                  ? (typeof item.desconto_percentual === 'string' ? parseFloat(item.desconto_percentual) : Number(item.desconto_percentual)) || 0
                  : 0;
                const descontoValorItem = item.desconto_valor != null
                  ? (typeof item.desconto_valor === 'string' ? parseFloat(item.desconto_valor) : Number(item.desconto_valor)) || 0
                  : 0;
                
                return { 
                  ...item, 
                  material_nome: materialNome,
                  quantidade: quantidadeOfertada,
                  quantidade_ofertada: quantidadeOfertada,
                  valor_unitario: valorUnitario,
                  valor_total: valorTotalCalculado,
                  valor_total_calculado: valorTotalCalculado,
                  valor_frete: item.valor_frete != null ? Number(item.valor_frete) : 0,
                  desconto_percentual: descontoPercentualItem,
                  desconto_valor: descontoValorItem,
                  is_vencedor: item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor'
                };
              })
            );

            // Log dos itens processados
            console.log(`[CotacaoDetails] Itens processados para fornecedor ${fornecedor.id}:`, itensComNomes);

            // Garantir que os valores numéricos sejam convertidos corretamente
            const valorFrete = fornecedor.valor_frete != null 
              ? (typeof fornecedor.valor_frete === 'string' ? parseFloat(fornecedor.valor_frete) : Number(fornecedor.valor_frete)) || 0
              : 0;
            const valorImposto = fornecedor.valor_imposto != null
              ? (typeof fornecedor.valor_imposto === 'string' ? parseFloat(fornecedor.valor_imposto) : Number(fornecedor.valor_imposto)) || 0
              : 0;
            const descontoPercentual = fornecedor.desconto_percentual != null
              ? (typeof fornecedor.desconto_percentual === 'string' ? parseFloat(fornecedor.desconto_percentual) : Number(fornecedor.desconto_percentual)) || 0
              : 0;
            const descontoValor = fornecedor.desconto_valor != null
              ? (typeof fornecedor.desconto_valor === 'string' ? parseFloat(fornecedor.desconto_valor) : Number(fornecedor.desconto_valor)) || 0
              : 0;

            console.log(`[CotacaoDetails] Fornecedor ${fornecedor.id} valores brutos e convertidos:`, {
              valor_frete_bruto: fornecedor.valor_frete,
              valor_frete_convertido: valorFrete,
              valor_imposto_bruto: fornecedor.valor_imposto,
              valor_imposto_convertido: valorImposto,
              desconto_percentual_bruto: fornecedor.desconto_percentual,
              desconto_percentual_convertido: descontoPercentual,
              desconto_valor_bruto: fornecedor.desconto_valor,
              desconto_valor_convertido: descontoValor
            });

            return {
              id: fornecedor.id,
              fornecedor_id: fornecedor.fornecedor_id,
              fornecedor_nome: fornecedorNome,
              valor_frete: valorFrete,
              valor_imposto: valorImposto,
              desconto_percentual: descontoPercentual,
              desconto_valor: descontoValor,
              preco_total: fornecedor.preco_total || 0,
              prazo_entrega: fornecedor.prazo_entrega || 0,
              condicoes_comerciais: fornecedor.condicoes_comerciais,
              observacoes: fornecedor.observacoes,
              status: fornecedor.status,
              itens: itensComNomes.map(item => {
                // Garantir que os valores já normalizados sejam preservados
                // Usar quantidade_ofertada e valor_total_calculado como fonte primária
                const qty = item.quantidade_ofertada != null 
                  ? (typeof item.quantidade_ofertada === 'string' ? parseFloat(item.quantidade_ofertada) : Number(item.quantidade_ofertada)) || 0
                  : (item.quantidade != null ? (typeof item.quantidade === 'string' ? parseFloat(item.quantidade) : Number(item.quantidade)) || 0 : 0);
                const vUnit = item.valor_unitario != null
                  ? (typeof item.valor_unitario === 'string' ? parseFloat(item.valor_unitario) : Number(item.valor_unitario)) || 0
                  : 0;
                const vTotal = item.valor_total_calculado != null
                  ? (typeof item.valor_total_calculado === 'string' ? parseFloat(item.valor_total_calculado) : Number(item.valor_total_calculado)) || 0
                  : (item.valor_total != null ? (typeof item.valor_total === 'string' ? parseFloat(item.valor_total) : Number(item.valor_total)) || 0 : 0);
                
                return {
                  ...item,
                  quantidade: qty,
                  quantidade_ofertada: qty,
                  valor_unitario: vUnit,
                  valor_total: vTotal,
                  valor_total_calculado: vTotal
                };
              })
            };
          })
        );

        // Filtrar fornecedores que têm pelo menos um item vencedor
        const fornecedoresComItensVencedores = fornecedoresCompletos.filter(f => 
          f.itens.some(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
        );

        console.log('[CotacaoDetails] Fornecedores completos processados:', fornecedoresCompletos.length);
        console.log('[CotacaoDetails] Fornecedores com itens vencedores:', fornecedoresComItensVencedores.length);
        console.log('[CotacaoDetails] Valores dos fornecedores:', fornecedoresComItensVencedores.map(f => ({
          id: f.id,
          nome: f.fornecedor_nome,
          valor_frete: f.valor_frete,
          valor_imposto: f.valor_imposto,
          desconto_percentual: f.desconto_percentual,
          desconto_valor: f.desconto_valor,
          itens_vencedores: f.itens.filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor').length
        })));

        // 5. Calcular totais - APENAS itens vencedores (is_vencedor = true)
        const valorTotalItens = fornecedoresComItensVencedores.reduce((sum, f) => {
          const valorItensFornecedor = f.itens
            .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
            .reduce((itemSum, item) => itemSum + (item.valor_total || 0), 0);
          return sum + valorItensFornecedor;
        }, 0);

        const freteItens = fornecedoresComItensVencedores.reduce((sum, f) => 
          sum + (f.itens || [])
            .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
            .reduce((s, item) => s + (item.valor_frete || 0), 0), 0);
        const valorTotalFrete = fornecedoresComItensVencedores.reduce((sum, f) => sum + (f.valor_frete || 0) + (f.valor_imposto || 0), 0) 
          + freteItens 
          + (cicloResult.valor_frete != null ? Number(cicloResult.valor_frete) : 0);

        // ✅ CORREÇÃO: Calcular desconto TOTAL = desconto do fornecedor + desconto dos itens
        const valorTotalDescontoSemGeral = fornecedoresComItensVencedores.reduce((sum, f) => {
          const itensVencedores = f.itens
            .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor');
          
          // Subtotal dos itens vencedores
          const subtotalItensVencedores = itensVencedores.reduce((itemSum, item) => itemSum + (item.valor_total || 0), 0);
          
          // Desconto do fornecedor: percentual sobre itens vencedores + valor absoluto
          const descontoPercentualFornecedor = (subtotalItensVencedores * ((f.desconto_percentual || 0) / 100));
          const descontoValorFornecedor = f.desconto_valor || 0;
          const descontoFornecedor = descontoPercentualFornecedor + descontoValorFornecedor;
          
          // Desconto dos itens vencedores
          const descontoItens = itensVencedores.reduce((itemSum, item) => {
            const valorItem = item.valor_total || 0;
            const descontoPctItem = item.desconto_percentual || 0;
            const descontoValorItem = item.desconto_valor || 0;
            const descontoPctCalculado = valorItem * (descontoPctItem / 100);
            return itemSum + descontoPctCalculado + descontoValorItem;
          }, 0);
          
          // Total = desconto do fornecedor + desconto dos itens
          return sum + descontoFornecedor + descontoItens;
        }, 0);
        const baseParaDescontoGeral = valorTotalItens + valorTotalFrete - valorTotalDescontoSemGeral;
        const descontoGeral = baseParaDescontoGeral * ((cicloResult.desconto_percentual != null ? Number(cicloResult.desconto_percentual) : 0) / 100) 
          + (cicloResult.desconto_valor != null ? Number(cicloResult.desconto_valor) : 0);
        const valorTotalDesconto = valorTotalDescontoSemGeral + descontoGeral;

        const valorTotalFinal = valorTotalItens + valorTotalFrete - valorTotalDesconto;

        // Calcular saving (economia) - comparar com média dos fornecedores (apenas itens vencedores)
        const valoresFornecedores = fornecedoresComItensVencedores.map(f => {
          const valorItens = f.itens
            .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
            .reduce((sum, item) => sum + (item.valor_total || 0), 0);
          const freteItensVencedores = f.itens
            .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
            .reduce((sum, item) => sum + (item.valor_frete || 0), 0);
          const freteImposto = (f.valor_frete || 0) + (f.valor_imposto || 0) + freteItensVencedores;
          const desconto = f.desconto_valor || 0;
          return valorItens + freteImposto - desconto;
        });
        
        const valorMedio = valoresFornecedores.length > 0 
          ? valoresFornecedores.reduce((sum, v) => sum + v, 0) / valoresFornecedores.length 
          : 0;
        const valorSaving = valorMedio > 0 ? valorMedio - valorTotalFinal : 0;

        // Buscar justificativa (pode estar em observacoes do ciclo ou do fornecedor selecionado)
        const justificativa = cicloResult.observacoes || 
          fornecedoresCompletos.find(f => f.observacoes)?.observacoes || 
          undefined;

        console.log('[CotacaoDetails] Dados finais calculados:', {
          valorTotalItens,
          valorTotalFrete,
          valorTotalDesconto,
          valorTotalFinal,
          valorSaving,
          fornecedoresCount: fornecedoresCompletos.length
        });

        setData({
          ciclo: cicloResult,
          comprador,
          fornecedores: fornecedoresComItensVencedores,
          valorTotalItens,
          valorTotalFrete,
          valorTotalDesconto,
          valorTotalFinal,
          valorSaving,
          justificativa,
          isCotacaoAntiga
        });
      } catch (error) {
        console.error('[CotacaoDetails] Erro ao carregar detalhes da cotação:', error);
        setError(`Erro ao carregar dados da cotação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [cotacaoId, selectedCompany?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando detalhes da cotação...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <span className="font-medium">{error || 'Não foi possível carregar os detalhes da cotação'}</span>
              {cotacaoId && (
                <p className="text-xs mt-1">ID da Cotação: {cotacaoId}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Aviso para cotações antigas
  if (data.isCotacaoAntiga) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">Cotação Antiga</h4>
              <p className="text-sm text-yellow-800">
                Dados detalhados não disponíveis para cotações antigas. Esta cotação foi criada antes da implementação dos campos de frete e desconto detalhados.
              </p>
            </div>
          </div>
        </div>

        {/* Mostrar dados básicos mesmo para cotações antigas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(data.valorTotalFinal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.fornecedores.length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Encontrar menor preço de itens para badges (apenas itens vencedores)
  const precosItensPorFornecedor = (data.fornecedores || []).map(f => ({
    fornecedor: f.fornecedor_nome || 'Fornecedor',
    valorItens: (f.itens || [])
      .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor')
      .reduce((sum, item) => sum + (item.valor_total || 0), 0)
  }));
  const menorPrecoItens = precosItensPorFornecedor.length > 0 && precosItensPorFornecedor.every(p => p.valorItens !== undefined)
    ? Math.min(...precosItensPorFornecedor.map(p => p.valorItens || 0))
    : 0;

  return (
    <div className="space-y-6">
      {/* Informações da Cotação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        {data.ciclo.numero_cotacao && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Número da Cotação:</span>
            <span className="font-semibold">{data.ciclo.numero_cotacao}</span>
          </div>
        )}
        {data.comprador && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Comprador:</span>
            <span className="font-semibold">{data.comprador.nome}</span>
          </div>
        )}
        {((data.ciclo.valor_frete ?? 0) > 0 || (data.ciclo.desconto_percentual ?? 0) > 0 || (data.ciclo.desconto_valor ?? 0) > 0) && (
          <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(data.ciclo.valor_frete ?? 0) > 0 && <span>Frete geral: R$ {Number(data.ciclo.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
            {((data.ciclo.desconto_percentual ?? 0) > 0 || (data.ciclo.desconto_valor ?? 0) > 0) && (
              <span>Desconto geral: {Number(data.ciclo.desconto_percentual || 0).toLocaleString('pt-BR')}% + R$ {Number(data.ciclo.desconto_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </div>
        )}
      </div>

      {/* Topo: 3 Cards (Total, Saving, Frete) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Geral */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(data.valorTotalFinal || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Itens + Frete - Desconto
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Saving (Economia) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Economia (Saving)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format((data.valorSaving || 0) > 0 ? (data.valorSaving || 0) : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs Média de Mercado
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Frete Total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Frete Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(data.valorTotalFrete)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Frete + Impostos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meio: Box com Justificativa */}
      {data.justificativa && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Justificativa da Decisão</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {data.justificativa}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela: Fornecedores Vencedores */}
      {data.fornecedores.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedores Vencedores ({data.fornecedores.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Preço do Produto</TableHead>
                    <TableHead className="text-right">Custo de Frete</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Total Final</TableHead>
                    <TableHead className="text-center">Inteligência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.fornecedores.map((fornecedor) => {
                    // Log dos valores do fornecedor antes do cálculo
                    console.log(`[CotacaoDetails] Renderizando fornecedor ${fornecedor.fornecedor_nome}:`, {
                      id: fornecedor.id,
                      valor_frete_raw: fornecedor.valor_frete,
                      valor_frete_type: typeof fornecedor.valor_frete,
                      valor_imposto_raw: fornecedor.valor_imposto,
                      valor_imposto_type: typeof fornecedor.valor_imposto,
                      desconto_percentual_raw: fornecedor.desconto_percentual,
                      desconto_percentual_type: typeof fornecedor.desconto_percentual,
                      desconto_valor_raw: fornecedor.desconto_valor,
                      desconto_valor_type: typeof fornecedor.desconto_valor,
                      itens_count: fornecedor.itens?.length || 0
                    });
                    
                    // Calcular apenas com itens vencedores
                    const itensVencedores = (fornecedor.itens || [])
                      .filter(item => item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor');
                    const valorItens = itensVencedores.reduce((sum, item) => sum + (item.valor_total || 0), 0);
                    const freteItensVencedores = itensVencedores.reduce((sum, item) => sum + (item.valor_frete || 0), 0);
                    
                    // ✅ CORREÇÃO: Calcular desconto dos ITENS vencedores
                    // O desconto pode estar aplicado nos itens, não apenas no fornecedor
                    const descontoItensVencedores = itensVencedores.reduce((sum, item) => {
                      const valorItem = item.valor_total || 0;
                      const descontoPctItem = item.desconto_percentual || 0;
                      const descontoValorItem = item.desconto_valor || 0;
                      // Desconto percentual aplicado sobre o valor do item
                      const descontoPctCalculado = valorItem * (descontoPctItem / 100);
                      // Total do desconto do item = percentual + valor absoluto
                      return sum + descontoPctCalculado + descontoValorItem;
                    }, 0);
                    
                    // Garantir conversão numérica correta dos valores do fornecedor
                    const freteFornecedor = typeof fornecedor.valor_frete === 'number' 
                      ? fornecedor.valor_frete 
                      : (fornecedor.valor_frete != null && fornecedor.valor_frete !== '' ? Number(fornecedor.valor_frete) : 0);
                    const impostoFornecedor = typeof fornecedor.valor_imposto === 'number'
                      ? fornecedor.valor_imposto
                      : (fornecedor.valor_imposto != null && fornecedor.valor_imposto !== '' ? Number(fornecedor.valor_imposto) : 0);
                    const descontoPctFornecedor = typeof fornecedor.desconto_percentual === 'number'
                      ? fornecedor.desconto_percentual
                      : (fornecedor.desconto_percentual != null && fornecedor.desconto_percentual !== '' ? Number(fornecedor.desconto_percentual) : 0);
                    const descontoValorFornecedor = typeof fornecedor.desconto_valor === 'number'
                      ? fornecedor.desconto_valor
                      : (fornecedor.desconto_valor != null && fornecedor.desconto_valor !== '' ? Number(fornecedor.desconto_valor) : 0);
                    
                    const valorFrete = freteFornecedor + impostoFornecedor + freteItensVencedores;
                    // ✅ CORREÇÃO: Calcular desconto TOTAL = desconto do fornecedor + desconto dos itens
                    // Desconto do fornecedor: percentual sobre valor dos itens vencedores + valor absoluto
                    const descontoPercentualFornecedor = valorItens * (descontoPctFornecedor / 100);
                    const descontoFornecedor = descontoPercentualFornecedor + descontoValorFornecedor;
                    // Desconto total = desconto do fornecedor + desconto dos itens
                    const desconto = descontoFornecedor + descontoItensVencedores;
                    const totalFinal = valorItens + valorFrete - desconto;
                    
                    // Debug log detalhado
                    console.log(`[CotacaoDetails] Fornecedor ${fornecedor.fornecedor_nome}:`, {
                      fornecedor_id: fornecedor.id,
                      valores_brutos: {
                        valor_frete: fornecedor.valor_frete,
                        valor_imposto: fornecedor.valor_imposto,
                        desconto_percentual: fornecedor.desconto_percentual,
                        desconto_valor: fornecedor.desconto_valor
                      },
                      valores_convertidos: {
                        freteFornecedor,
                        impostoFornecedor,
                        descontoPctFornecedor,
                        descontoValorFornecedor
                      },
                      itens_vencedores: itensVencedores.map(item => ({
                        material: item.material_nome,
                        valor_total: item.valor_total,
                        desconto_percentual: item.desconto_percentual,
                        desconto_valor: item.desconto_valor
                      })),
                      calculos: {
                        valorItens,
                        freteItensVencedores,
                        descontoItensVencedores,
                        descontoPercentualFornecedor,
                        descontoFornecedor,
                        valorFrete,
                        desconto,
                        totalFinal
                      }
                    });
                    const percentualFrete = totalFinal > 0 ? (valorFrete / totalFinal) * 100 : 0;
                    
                    const isMenorPrecoItens = valorItens === menorPrecoItens && menorPrecoItens > 0;
                    const isAltoImpactoFrete = percentualFrete > 20;

                    return (
                      <TableRow key={fornecedor.id}>
                        <TableCell className="font-medium">
                          {fornecedor.fornecedor_nome || 'Fornecedor não encontrado'}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(valorItens || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(valorFrete || 0)}
                          {/* Sempre mostrar detalhes se houver valores, mesmo que zero, para transparência */}
                          {(freteFornecedor != null || impostoFornecedor != null || freteItensVencedores != null) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {freteFornecedor != null && freteFornecedor !== 0 && <div>Frete: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteFornecedor)}</div>}
                              {impostoFornecedor != null && impostoFornecedor !== 0 && <div>Imposto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostoFornecedor)}</div>}
                              {freteItensVencedores != null && freteItensVencedores !== 0 && <div>Frete Itens: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteItensVencedores)}</div>}
                              {/* Mostrar quando todos os valores são zero para indicar que não há frete */}
                              {valorFrete === 0 && freteFornecedor === 0 && impostoFornecedor === 0 && freteItensVencedores === 0 && (
                                <div className="text-muted-foreground italic">Sem frete</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(desconto || 0)}
                          {/* Sempre mostrar detalhes para transparência */}
                          <div className="text-xs text-muted-foreground mt-1">
                            {/* Desconto do Fornecedor */}
                            {descontoFornecedor > 0 && (
                              <>
                                {descontoPercentualFornecedor > 0 && (
                                  <div>Fornecedor ({descontoPctFornecedor}% = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descontoPercentualFornecedor)})</div>
                                )}
                                {descontoValorFornecedor > 0 && (
                                  <div>Fornecedor: + R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(descontoValorFornecedor)}</div>
                                )}
                              </>
                            )}
                            {/* Desconto dos Itens */}
                            {descontoItensVencedores > 0 && (
                              <div className="text-blue-600">Itens: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(descontoItensVencedores)}</div>
                            )}
                            {/* Mostrar quando todos os valores são zero para indicar que não há desconto */}
                            {desconto === 0 && descontoFornecedor === 0 && descontoItensVencedores === 0 && (
                              <div className="text-muted-foreground italic">Sem desconto</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(totalFinal || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {isMenorPrecoItens && (
                              <Badge variant="default" className="bg-green-600 text-white text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Menor Preço
                              </Badge>
                            )}
                            {isAltoImpactoFrete && (
                              <Badge variant="default" className="bg-yellow-600 text-white text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Alto Frete
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum fornecedor encontrado para esta cotação.</p>
            <p className="text-xs mt-1">A cotação pode ainda estar em processo de criação.</p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Itens */}
      {(() => {
        // Coletar todos os itens de todos os fornecedores com referência ao fornecedor
        const todosItensComFornecedor = data.fornecedores.flatMap((fornecedor) => {
          const itens = fornecedor.itens || [];
          return itens.map(item => ({ item, fornecedor }));
        });
        
        // Ordenar todos os itens alfabeticamente pelo nome do material
        const itensOrdenados = [...todosItensComFornecedor].sort((a, b) => {
          const nomeA = (a.item.material_nome || '').toLowerCase();
          const nomeB = (b.item.material_nome || '').toLowerCase();
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
        
        console.log(`[CotacaoDetails] Total de itens ordenados:`, itensOrdenados.length);
        
        return data.fornecedores.length > 0 && data.fornecedores.some(f => f.itens.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens da Cotação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unitário</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Frete</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-center">Vencedor</TableHead>
                      <TableHead>Fornecedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensOrdenados.map(({ item, fornecedor }, index) => {
                      // Garantir conversão robusta dos valores
                      const quantidade = item.quantidade != null 
                        ? (typeof item.quantidade === 'string' ? parseFloat(item.quantidade) : Number(item.quantidade)) || 0
                        : 0;
                      const valorUnitario = item.valor_unitario != null
                        ? (typeof item.valor_unitario === 'string' ? parseFloat(item.valor_unitario) : Number(item.valor_unitario)) || 0
                        : 0;
                      // Valor base do item (quantidade * valor unitário)
                      const valorBaseItem = quantidade * valorUnitario;
                      
                      // Frete do item
                      const freteItem = item.valor_frete != null
                        ? (typeof item.valor_frete === 'string' ? parseFloat(item.valor_frete) : Number(item.valor_frete)) || 0
                        : 0;
                      
                      // Verificar se o item é vencedor
                      const isVencedor = item.is_vencedor === true || item.is_vencedor === 'true' || item.status === 'vencedor';
                      
                      // Calcular desconto do item
                      const descontoPercentualItem = item.desconto_percentual != null
                        ? (typeof item.desconto_percentual === 'string' ? parseFloat(item.desconto_percentual) : Number(item.desconto_percentual)) || 0
                        : 0;
                      const descontoValorItem = item.desconto_valor != null
                        ? (typeof item.desconto_valor === 'string' ? parseFloat(item.desconto_valor) : Number(item.desconto_valor)) || 0
                        : 0;
                      
                      // Desconto total do item: percentual sobre valor base + valor absoluto
                      const descontoPercentualCalculado = valorBaseItem * (descontoPercentualItem / 100);
                      const descontoTotalItem = descontoPercentualCalculado + descontoValorItem;
                      
                      // Valor Total = Valor Base + Frete - Desconto
                      const valorTotal = valorBaseItem + freteItem - descontoTotalItem;
                      
                      console.log(`[CotacaoDetails] Renderizando item ${index}:`, {
                        material: item.material_nome,
                        quantidade,
                        valorUnitario,
                        valorBaseItem,
                        freteItem,
                        descontoTotalItem,
                        valorTotal: valorTotal, // Valor Total = Base + Frete - Desconto
                        isVencedor,
                        descontoPercentualItem,
                        descontoValorItem
                      });
                      
                      // Aplicar cor verde para itens vencedores
                      const rowClassName = isVencedor ? 'text-green-600 font-medium' : '';
                      
                      return (
                        <TableRow key={`${fornecedor.id}-${item.id || index}-${index}`} className={rowClassName}>
                          <TableCell className="font-medium">
                            {item.material_nome || 'Material não encontrado'}
                          </TableCell>
                          <TableCell className="text-right">
                            {quantidade > 0 ? quantidade.toLocaleString('pt-BR', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            }) : '0,000'}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(valorUnitario || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(valorTotal || 0)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {freteItem > 0 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteItem)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {descontoTotalItem > 0 ? (
                              <div>
                                <div className="font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(descontoTotalItem)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {descontoPercentualItem > 0 && (
                                    <div>({descontoPercentualItem}% = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descontoPercentualCalculado)})</div>
                                  )}
                                  {descontoValorItem > 0 && (
                                    <div>+ R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(descontoValorItem)}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isVencedor ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sim
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fornecedor.fornecedor_nome || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
