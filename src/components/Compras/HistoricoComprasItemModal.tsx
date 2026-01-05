// =====================================================
// MODAL: HISTÓRICO DE COMPRAS DO ITEM
// =====================================================
// Modal para exibir histórico de compras de um item específico
// Ajuda o comprador na tomada de decisão de preço

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tooltip customizado para o gráfico
const CustomTooltip = ({ active, payload, label, item }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };
    return (
      <div className="bg-white border border-gray-200 rounded-md p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{`Data: ${label}`}</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">{formatCurrency(data.preco)}</p>
          <p className="text-muted-foreground">
            Quantidade: {data.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item?.unidade_medida || ''}
          </p>
          <p className="text-muted-foreground">
            Fornecedor: {data.fornecedor}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface HistoricoCompra {
  id: string;
  data_compra: string;
  fornecedor_nome: string;
  valor_unitario: number;
  quantidade: number;
  numero_cotacao?: string;
  pedido_id?: string;
}

interface HistoricoComprasItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    material_id: string;
    material_nome: string;
    unidade_medida: string;
  };
}

export function HistoricoComprasItemModal({
  isOpen,
  onClose,
  item,
}: HistoricoComprasItemModalProps) {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<HistoricoCompra[]>([]);

  useEffect(() => {
    if (isOpen && item.material_id && selectedCompany?.id) {
      carregarHistorico();
    } else {
      setHistorico([]);
    }
  }, [isOpen, item.material_id, selectedCompany?.id]);

  const carregarHistorico = async () => {
    if (!selectedCompany?.id || !item.material_id) return;

    setLoading(true);
    try {
      // Buscar histórico de compras
      const historicoResult = await EntityService.list({
        schema: 'compras',
        table: 'historico_compras',
        companyId: selectedCompany.id,
        filters: { material_id: item.material_id },
        page: 1,
        pageSize: 100,
        skipCompanyFilter: true,
      });

      let historicoData: HistoricoCompra[] = [];

      if (historicoResult.data && historicoResult.data.length > 0) {
        // Buscar dados dos fornecedores e pedidos
        const fornecedorIds = [...new Set(historicoResult.data.map((h: any) => h.fornecedor_id).filter(Boolean))];
        const pedidoIds = [...new Set(historicoResult.data.map((h: any) => h.pedido_id).filter(Boolean))];

        // Buscar fornecedores
        const fornecedoresMap = new Map<string, string>();
        if (fornecedorIds.length > 0) {
          const fornecedoresResult = await EntityService.list({
            schema: 'compras',
            table: 'fornecedores_dados',
            companyId: selectedCompany.id,
            filters: {},
            page: 1,
            pageSize: 1000,
          });

          if (fornecedoresResult.data) {
            fornecedoresResult.data.forEach((f: any) => {
              if (fornecedorIds.includes(f.id)) {
                fornecedoresMap.set(f.id, f.contato_principal || f.nome || 'Fornecedor');
              }
            });
          }

          // Buscar partners para obter nome completo
          const partnersResult = await EntityService.list({
            schema: 'public',
            table: 'partners',
            companyId: selectedCompany.id,
            filters: { ativo: true },
            page: 1,
            pageSize: 1000,
          });

          if (partnersResult.data) {
            fornecedoresResult.data.forEach((f: any) => {
              if (f.partner_id) {
                const partner = partnersResult.data.find((p: any) => p.id === f.partner_id);
                if (partner) {
                  fornecedoresMap.set(f.id, partner.nome_fantasia || partner.razao_social || fornecedoresMap.get(f.id) || 'Fornecedor');
                }
              }
            });
          }
        }

        // Buscar números de cotação dos pedidos
        const cotacoesMap = new Map<string, string>();
        if (pedidoIds.length > 0) {
          const pedidosResult = await EntityService.list({
            schema: 'compras',
            table: 'pedidos_compra',
            companyId: selectedCompany.id,
            filters: {},
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });

          if (pedidosResult.data) {
            pedidosResult.data.forEach((p: any) => {
              if (pedidoIds.includes(p.id) && p.cotacao_id) {
                // Buscar número da cotação
                try {
                  EntityService.getById({
                    schema: 'compras',
                    table: 'cotacao_ciclos',
                    id: p.cotacao_id,
                    companyId: selectedCompany.id,
                  }).then((cotacao: any) => {
                    if (cotacao?.numero_cotacao) {
                      cotacoesMap.set(p.id, cotacao.numero_cotacao);
                    }
                  }).catch(() => {
                    // Tentar tabela legado
                    EntityService.getById({
                      schema: 'compras',
                      table: 'cotacoes',
                      id: p.cotacao_id,
                      companyId: selectedCompany.id,
                    }).then((cotacao: any) => {
                      if (cotacao?.numero_cotacao) {
                        cotacoesMap.set(p.id, cotacao.numero_cotacao);
                      }
                    }).catch(() => {});
                  });
                } catch {
                  // Ignorar erro
                }
              }
            });
          }
        }

        // Mapear histórico
        historicoData = historicoResult.data
          .map((h: any) => ({
            id: h.id,
            data_compra: h.data_compra || h.created_at,
            fornecedor_nome: fornecedoresMap.get(h.fornecedor_id) || 'Fornecedor',
            valor_unitario: Number(h.valor_unitario) || 0,
            quantidade: Number(h.quantidade) || 0,
            numero_cotacao: cotacoesMap.get(h.pedido_id) || undefined,
            pedido_id: h.pedido_id,
          }))
          .sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());
      }

      // Se não houver histórico em historico_compras, buscar em pedido_itens
      if (historicoData.length === 0) {
        const pedidoItensResult = await EntityService.list({
          schema: 'compras',
          table: 'pedido_itens',
          companyId: selectedCompany.id,
          filters: { material_id: item.material_id },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });

        if (pedidoItensResult.data && pedidoItensResult.data.length > 0) {
          const pedidoIds = [...new Set(pedidoItensResult.data.map((pi: any) => pi.pedido_id).filter(Boolean))];
          
          // Buscar pedidos para obter fornecedor e data
          const pedidosResult = await EntityService.list({
            schema: 'compras',
            table: 'pedidos_compra',
            companyId: selectedCompany.id,
            filters: {},
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });

          const pedidosMap = new Map<string, any>();
          if (pedidosResult.data) {
            pedidosResult.data.forEach((p: any) => {
              if (pedidoIds.includes(p.id)) {
                pedidosMap.set(p.id, p);
              }
            });
          }

          // Buscar fornecedores dos pedidos
          const fornecedorIds = [...new Set(Array.from(pedidosMap.values()).map((p: any) => p.fornecedor_id).filter(Boolean))];
          const fornecedoresMap = new Map<string, string>();
          
          if (fornecedorIds.length > 0) {
            const fornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'fornecedores_dados',
              companyId: selectedCompany.id,
              filters: {},
              page: 1,
              pageSize: 1000,
            });

            if (fornecedoresResult.data) {
              fornecedoresResult.data.forEach((f: any) => {
                if (fornecedorIds.includes(f.id)) {
                  fornecedoresMap.set(f.id, f.contato_principal || f.nome || 'Fornecedor');
                }
              });

              // Buscar partners
              const partnersResult = await EntityService.list({
                schema: 'public',
                table: 'partners',
                companyId: selectedCompany.id,
                filters: { ativo: true },
                page: 1,
                pageSize: 1000,
              });

              if (partnersResult.data) {
                fornecedoresResult.data.forEach((f: any) => {
                  if (f.partner_id) {
                    const partner = partnersResult.data.find((p: any) => p.id === f.partner_id);
                    if (partner) {
                      fornecedoresMap.set(f.id, partner.nome_fantasia || partner.razao_social || fornecedoresMap.get(f.id) || 'Fornecedor');
                    }
                  }
                });
              }
            }
          }

          historicoData = pedidoItensResult.data
            .map((pi: any) => {
              const pedido = pedidosMap.get(pi.pedido_id);
              return {
                id: pi.id,
                data_compra: pedido?.data_pedido || pedido?.created_at || pi.created_at,
                fornecedor_nome: pedido?.fornecedor_id ? (fornecedoresMap.get(pedido.fornecedor_id) || 'Fornecedor') : 'Fornecedor',
                valor_unitario: Number(pi.valor_unitario) || 0,
                quantidade: Number(pi.quantidade) || 0,
                numero_cotacao: undefined,
                pedido_id: pi.pedido_id,
              };
            })
            .sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());
        }
      }

      setHistorico(historicoData);
    } catch (error) {
      console.error('Erro ao carregar histórico de compras:', error);
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  };

  // Preparar dados para o gráfico
  const chartData = historico
    .slice()
    .reverse()
    .map((h) => ({
      data: format(new Date(h.data_compra), 'dd/MM/yyyy', { locale: ptBR }),
      preco: h.valor_unitario,
      quantidade: h.quantidade,
      fornecedor: h.fornecedor_nome,
      dataCompleta: h.data_compra,
    }));

  // Calcular insights
  const insights = React.useMemo(() => {
    if (historico.length === 0) return null;

    const precos = historico.map((h) => h.valor_unitario);
    const precoMedio = precos.reduce((sum, p) => sum + p, 0) / precos.length;
    const ultimoPreco = historico[0]?.valor_unitario || 0;
    const variacao = precoMedio > 0 ? ((ultimoPreco - precoMedio) / precoMedio) * 100 : 0;

    // Fornecedor mais recorrente
    const fornecedoresCount = new Map<string, number>();
    historico.forEach((h) => {
      const count = fornecedoresCount.get(h.fornecedor_nome) || 0;
      fornecedoresCount.set(h.fornecedor_nome, count + 1);
    });

    let fornecedorMaisRecorrente = '';
    let maxCompras = 0;
    fornecedoresCount.forEach((count, nome) => {
      if (count > maxCompras) {
        maxCompras = count;
        fornecedorMaisRecorrente = nome;
      }
    });

    return {
      precoMedio,
      ultimoPreco,
      variacao,
      fornecedorMaisRecorrente,
      totalCompras: maxCompras,
    };
  }, [historico]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Histórico de Compras
          </DialogTitle>
          <DialogDescription>
            {item.material_nome} • {item.unidade_medida}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Carregando histórico...</span>
          </div>
        ) : historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <BarChart3 className="h-16 w-16 text-muted-foreground opacity-50" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Este item ainda não possui histórico de compras.</p>
              <p className="text-sm text-muted-foreground">
                Essa será a primeira cotação registrada no sistema.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cabeçalho com contagem */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Histórico de compras: {historico.length} {historico.length === 1 ? 'compra' : 'compras'}
              </p>
            </div>

            {/* Gráfico */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Evolução de Preços</CardTitle>
                  <CardDescription>Tendência de preço unitário ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                      />
                      <Tooltip content={<CustomTooltip item={item} />} />
                      <Line
                        type="monotone"
                        dataKey="preco"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        name="Preço Unitário"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Últimas compras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Últimas Compras</CardTitle>
                <CardDescription>Últimas 5 compras registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Nº Cotação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.slice(0, 5).map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          {format(new Date(h.data_compra), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{h.fornecedor_nome}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(h.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          {h.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unidade_medida}
                        </TableCell>
                        <TableCell>
                          {h.numero_cotacao ? (
                            <Badge variant="outline" className="text-xs">
                              {h.numero_cotacao}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Insights */}
            {insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Insights Rápidos</CardTitle>
                  <CardDescription>Informações para auxiliar na decisão</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Preço médio histórico</p>
                        <p className="text-sm font-semibold">{formatCurrency(insights.precoMedio)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <Package className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Último preço pago</p>
                        <p className="text-sm font-semibold">{formatCurrency(insights.ultimoPreco)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      {insights.variacao >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Variação vs média</p>
                        <p className={`text-sm font-semibold ${insights.variacao >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {insights.variacao >= 0 ? '+' : ''}{insights.variacao.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <Package className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fornecedor mais recorrente</p>
                        <p className="text-sm font-semibold">
                          {insights.fornecedorMaisRecorrente} ({insights.totalCompras} {insights.totalCompras === 1 ? 'compra' : 'compras'})
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

