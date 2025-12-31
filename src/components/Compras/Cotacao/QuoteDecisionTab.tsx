// =====================================================
// TAB: MAPA COTAÇÃO (VALORES + DECISÃO)
// =====================================================
// Esta aba representa o momento decisório do comprador.
// Grid comparativo com coluna fixa à esquerda (Itens) e colunas dinâmicas (Fornecedores)

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePurchaseQuoteStore, PurchaseItemState, SupplierState, QuoteValueState } from '@/stores/purchaseQuoteStore';
import { Trophy, AlertCircle, CheckCircle2, DollarSign, TrendingDown, TrendingUp, Percent, Calendar, FileText, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface QuoteDecisionTabProps {
  isEditMode?: boolean;
}

export function QuoteDecisionTab({ isEditMode = false }: QuoteDecisionTabProps) {
  const {
    items,
    suppliers,
    quoteMatrix,
    setQuoteValue,
    setItemWinner,
    globalWinnerSupplierId,
    setGlobalWinner,
  } = usePurchaseQuoteStore();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  const selectedSuppliers = suppliers.filter((s) => s.selected);

  if (selectedSuppliers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione pelo menos um fornecedor na aba "Itens & Fornecedores" para visualizar o mapa de cotação.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calcular menor e maior valor por item
  const getItemValueRange = (itemId: string) => {
    const row = quoteMatrix[itemId] || {};
    let lowestValue: number | null = null;
    let highestValue: number | null = null;
    let lowestSupplierId: string | null = null;
    let highestSupplierId: string | null = null;

    selectedSuppliers.forEach((sup) => {
      const cell = row[sup.id];
      if (cell?.finalValue != null) {
        if (lowestValue === null || cell.finalValue < lowestValue) {
          lowestValue = cell.finalValue;
          lowestSupplierId = sup.id;
        }
        if (highestValue === null || cell.finalValue > highestValue) {
          highestValue = cell.finalValue;
          highestSupplierId = sup.id;
        }
      }
    });

    return { lowestValue, highestValue, lowestSupplierId, highestSupplierId };
  };

  // Função para selecionar automaticamente os valores mais baratos de cada item
  const handleSelectLowestPrices = () => {
    items.forEach((item) => {
      const row = quoteMatrix[item.id] || {};
      let lowestValue: number | null = null;
      let lowestSupplierId: string | null = null;

      selectedSuppliers.forEach((sup) => {
        const cell = row[sup.id];
        if (cell?.finalValue != null) {
          if (lowestValue === null || cell.finalValue < lowestValue) {
            lowestValue = cell.finalValue;
            lowestSupplierId = sup.id;
          }
        }
      });

      if (lowestSupplierId) {
        setItemWinner(item.id, lowestSupplierId);
      }
    });
  };

  // Função para selecionar todos os itens de um fornecedor específico
  const handleSelectSupplierForAllItems = (supplierId: string) => {
    items.forEach((item) => {
      const row = quoteMatrix[item.id] || {};
      // Verificar se o fornecedor tem valores preenchidos para este item
      const cell = row[supplierId];
      if (cell?.finalValue != null) {
        setItemWinner(item.id, supplierId);
      }
    });
  };

  // Calcular vencedor global (soma de todos os itens)
  const globalTotals = useMemo(() => {
    const totals: { [supplierId: string]: number } = {};

    selectedSuppliers.forEach((sup) => {
      let total = 0;
      items.forEach((item) => {
        const row = quoteMatrix[item.id] || {};
        const cell = row[sup.id];
        if (cell?.finalValue != null) {
          total += cell.finalValue;
        }
      });
      totals[sup.id] = total;
    });

    let lowestTotal: number | null = null;
    let winnerId: string | null = null;

    Object.entries(totals).forEach(([supplierId, total]) => {
      if (lowestTotal === null || total < lowestTotal) {
        lowestTotal = total;
        winnerId = supplierId;
      }
    });

    return { totals, winnerId, lowestTotal };
  }, [items, selectedSuppliers, quoteMatrix]);

  // Se não estiver em modo edição, mostrar visualização resumida apenas com vencedores
  if (!isEditMode) {
    // Filtrar apenas itens com vencedor
    const itemsComVencedor = items.filter(item => {
      const row = quoteMatrix[item.id] || {};
      return row.winnerSupplierId;
    });

    // Calcular totais por fornecedor vencedor (incluindo frete e impostos)
    const resumoPorFornecedor = useMemo(() => {
      const resumo: {
        [supplierId: string]: {
          supplier: SupplierState;
          items: Array<{
            item: PurchaseItemState;
            cell: QuoteValueState;
            valorTotal: number;
          }>;
          subtotal: number;
          frete: number;
          impostos: number;
          total: number;
        };
      } = {};

      itemsComVencedor.forEach((item) => {
        const row = quoteMatrix[item.id] || {};
        const winnerId = row.winnerSupplierId;
        if (!winnerId) return;

        const supplier = suppliers.find(s => s.id === winnerId);
        if (!supplier) return;

        const cell = row[winnerId];
        if (!cell) return;

        if (!resumo[winnerId]) {
          resumo[winnerId] = {
            supplier,
            items: [],
            subtotal: 0,
            frete: supplier.valor_frete || 0,
            impostos: supplier.valor_imposto || 0,
            total: 0,
          };
        }

        const valorTotal = cell.finalValue || (cell.price || 0) * item.quantity;
        resumo[winnerId].items.push({ item, cell, valorTotal });
        resumo[winnerId].subtotal += valorTotal;
      });

      // Calcular totais
      Object.values(resumo).forEach(r => {
        r.total = r.subtotal + r.frete + r.impostos;
      });

      return resumo;
    }, [itemsComVencedor, quoteMatrix, suppliers]);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Resumo da Cotação - Itens Vencedores
            </CardTitle>
            <CardDescription>
              Itens escolhidos pelos compradores com condições comerciais e valores finais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(resumoPorFornecedor).map(([supplierId, resumo]) => (
                <div key={supplierId} className="border rounded-lg p-4 space-y-4">
                  {/* Cabeçalho do Fornecedor */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div>
                      <h3 className="font-semibold text-lg">{resumo.supplier.name}</h3>
                      <p className="text-sm text-muted-foreground">{resumo.supplier.cnpj}</p>
                    </div>
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Fornecedor Vencedor
                    </Badge>
                  </div>

                  {/* Lista de Itens */}
                  <div className="space-y-3">
                    {resumo.items.map(({ item, cell, valorTotal }) => (
                      <div key={item.id} className="bg-muted/50 rounded-md p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.description}</h4>
                              <Badge variant="secondary" className="text-xs">
                                Vencedor
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Código: {item.code} • Quantidade: {item.quantity} {item.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Valor Unitário</p>
                            <p className="font-semibold">{formatCurrency(cell.price || 0)}</p>
                            <p className="text-sm text-muted-foreground mt-1">Valor Total</p>
                            <p className="font-bold text-lg">{formatCurrency(valorTotal)}</p>
                          </div>
                        </div>

                        {/* Informações Comerciais */}
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                          <div>
                            <Label className="text-xs text-muted-foreground">Condição Comercial</Label>
                            <p className="text-sm font-medium mt-1">
                              {cell.commercialTerms || 'Não informado'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Prazo de Entrega</Label>
                            <p className="text-sm font-medium mt-1">
                              {cell.leadTime ? `${cell.leadTime} dias` : 'Não informado'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Desconto</Label>
                            <p className="text-sm font-medium mt-1">
                              {cell.discount ? `${cell.discount}%` : '0%'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totais do Fornecedor */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal dos Itens:</span>
                      <span className="font-medium">{formatCurrency(resumo.subtotal)}</span>
                    </div>
                    {resumo.frete > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frete:</span>
                        <span className="font-medium">{formatCurrency(resumo.frete)}</span>
                      </div>
                    )}
                    {resumo.impostos > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Impostos:</span>
                        <span className="font-medium">{formatCurrency(resumo.impostos)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>Total para Pedido de Compra:</span>
                      <span className="text-primary">{formatCurrency(resumo.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid Comparativo - Mapa Cotação */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Mapa Cotação - Comparativo de Valores
              </CardTitle>
              <CardDescription className="mt-1">
                Preencha os valores por item e fornecedor. Os destaques automáticos indicam menor e maior valor.
              </CardDescription>
            </div>
            {isEditMode && selectedSuppliers.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectLowestPrices}
                  className="flex items-center gap-2"
                  title="Seleciona automaticamente o fornecedor com menor valor para cada item"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Selecionar Mais Baratos</span>
                  <span className="sm:hidden">Mais Baratos</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      title="Seleciona todos os itens de um fornecedor específico"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Selecionar Fornecedor</span>
                      <span className="sm:hidden">Fornecedor</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Selecionar todos os itens de:</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {selectedSuppliers.map((supplier) => (
                      <DropdownMenuItem
                        key={supplier.id}
                        onClick={() => handleSelectSupplierForAllItems(supplier.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          <span className="text-xs text-muted-foreground">{supplier.cnpj}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="border rounded-lg">
                {/* Cabeçalho Fixo */}
                <div className="grid border-b bg-muted/50 sticky top-0 z-10" 
                     style={{ gridTemplateColumns: `250px repeat(${selectedSuppliers.length}, minmax(280px, 1fr))` }}>
                  {/* Coluna de Itens */}
                  <div className="p-3 font-medium text-sm border-r">
                    Item
                  </div>
                  {/* Colunas de Fornecedores */}
                  {selectedSuppliers.map((supplier) => (
                    <div key={supplier.id} className="p-3 font-medium text-sm border-r last:border-r-0 text-center">
                      <div className="font-semibold">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{supplier.cnpj}</div>
                    </div>
                  ))}
                </div>

                {/* Linhas de Itens */}
                {items.map((item) => {
                  const row = quoteMatrix[item.id] || {};
                  const winnerId = row.winnerSupplierId;
                  const { lowestValue, highestValue, lowestSupplierId, highestSupplierId } = getItemValueRange(item.id);
                  const isNotLowest = winnerId && lowestSupplierId && winnerId !== lowestSupplierId;

                  return (
                    <div key={item.id} className="border-b last:border-b-0">
                      {/* Linha Principal do Item */}
                      <div className="grid border-b" 
                           style={{ gridTemplateColumns: `250px repeat(${selectedSuppliers.length}, minmax(280px, 1fr))` }}>
                        {/* Coluna de Item (Fixa) */}
                        <div className="p-3 border-r bg-muted/30">
                          <div className="font-medium text-sm">{item.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.code} • {item.quantity} {item.unit}
                          </div>
                          {winnerId && (
                            <div className="mt-2 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">Vencedor</span>
                            </div>
                          )}
                        </div>

                        {/* Colunas de Fornecedores */}
                        {selectedSuppliers.map((supplier) => {
                          const cell = row[supplier.id] || {
                            price: null,
                            discount: null,
                            leadTime: null,
                            commercialTerms: null,
                            finalValue: null,
                          };
                          const isLowest = supplier.id === lowestSupplierId && lowestValue !== null;
                          const isHighest = supplier.id === highestSupplierId && highestValue !== null && lowestSupplierId !== highestSupplierId;
                          const isWinner = winnerId === supplier.id;

                          return (
                            <div
                              key={supplier.id}
                              className={`p-3 border-r last:border-r-0 space-y-2 ${
                                isLowest ? 'bg-green-50 dark:bg-green-950/20' : ''
                              } ${
                                isHighest ? 'bg-red-50 dark:bg-red-950/20' : ''
                              } ${
                                isWinner ? 'ring-2 ring-green-500' : ''
                              }`}
                            >
                              {/* Preço */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Preço *
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cell.price ?? ''}
                                  onChange={(e) =>
                                    setQuoteValue(
                                      item.id,
                                      supplier.id,
                                      'price',
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                  required
                                  disabled={!isEditMode}
                                  readOnly={!isEditMode}
                                />
                              </div>

                              {/* Desconto */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <Percent className="h-3 w-3" />
                                  Desconto (%)
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={cell.discount ?? ''}
                                  onChange={(e) =>
                                    setQuoteValue(
                                      item.id,
                                      supplier.id,
                                      'discount',
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                  disabled={!isEditMode}
                                  readOnly={!isEditMode}
                                />
                              </div>

                              {/* Prazo */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Prazo (dias) *
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={cell.leadTime ?? ''}
                                  onChange={(e) =>
                                    setQuoteValue(
                                      item.id,
                                      supplier.id,
                                      'leadTime',
                                      e.target.value ? parseInt(e.target.value) : null
                                    )
                                  }
                                  placeholder="0"
                                  className="h-8 text-sm"
                                  required
                                  disabled={!isEditMode}
                                  readOnly={!isEditMode}
                                />
                              </div>

                              {/* Condição Comercial */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Condição Comercial *
                                </Label>
                                <Input
                                  type="text"
                                  value={cell.commercialTerms ?? ''}
                                  onChange={(e) =>
                                    setQuoteValue(
                                      item.id,
                                      supplier.id,
                                      'commercialTerms',
                                      e.target.value || null
                                    )
                                  }
                                  placeholder="Ex: 30/60 dias"
                                  className="h-8 text-sm"
                                  required
                                  disabled={!isEditMode}
                                  readOnly={!isEditMode}
                                />
                              </div>

                              {/* Valor Final Calculado */}
                              {cell.finalValue !== null && (
                                <div className="pt-2 border-t">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total</span>
                                    <span className={`text-sm font-semibold ${
                                      isLowest ? 'text-green-600' : ''
                                    } ${
                                      isHighest ? 'text-red-600' : ''
                                    }`}>
                                      {formatCurrency(cell.finalValue)}
                                    </span>
                                  </div>
                                  {isLowest && (
                                    <Badge variant="secondary" className="mt-1 text-xs flex items-center gap-1 w-full justify-center">
                                      <TrendingDown className="h-3 w-3" />
                                      Menor
                                    </Badge>
                                  )}
                                  {isHighest && !isLowest && (
                                    <Badge variant="destructive" className="mt-1 text-xs flex items-center gap-1 w-full justify-center">
                                      <TrendingUp className="h-3 w-3" />
                                      Maior
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Checkbox Vencedor - Somente exibir quando houver vencedor ou em modo edição */}
                              {(isWinner || isEditMode) && (
                                <div className="pt-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`winner-${item.id}-${supplier.id}`}
                                      checked={isWinner}
                                      onCheckedChange={(checked) =>
                                        setItemWinner(item.id, checked ? supplier.id : null)
                                      }
                                      disabled={!isEditMode}
                                    />
                                    <Label
                                      htmlFor={`winner-${item.id}-${supplier.id}`}
                                      className={`text-xs ${isEditMode ? 'cursor-pointer' : ''}`}
                                    >
                                      {isWinner ? 'Vencedor' : 'Marcar como vencedor'}
                                    </Label>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Justificativa se vencedor não for o menor */}
                      {isNotLowest && row.justificationIfNotLowest && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-t">
                          <Label className="text-xs text-muted-foreground">
                            Justificativa (vencedor não é o menor preço)
                          </Label>
                          {isEditMode ? (
                            <Textarea
                              value={row.justificationIfNotLowest || ''}
                              onChange={(e) =>
                                setItemWinner(item.id, winnerId, e.target.value || undefined)
                              }
                              placeholder="Explique por que este fornecedor foi escolhido mesmo não sendo o menor preço..."
                              className="mt-1 min-h-[60px] text-sm"
                            />
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {row.justificationIfNotLowest}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decisão Global */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Decisão Global
          </CardTitle>
          <CardDescription>
            Visão consolidada de todos os itens - Selecione o vencedor global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedSuppliers.map((supplier) => {
              const total = globalTotals.totals[supplier.id] || 0;
              const isWinner = supplier.id === globalTotals.winnerId;
              const isSelected = globalWinnerSupplierId === supplier.id;

              return (
                <div
                  key={supplier.id}
                  className={`flex items-center justify-between p-3 border rounded-md ${
                    isSelected ? 'bg-primary/5 border-primary ring-2 ring-primary' : ''
                  } ${
                    isWinner ? 'bg-green-50 dark:bg-green-950/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <Checkbox
                        id={`global-winner-${supplier.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          setGlobalWinner(checked ? supplier.id : null)
                        }
                        disabled={!isEditMode}
                      />
                    )}
                    {!isEditMode && isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                      {isWinner && (
                        <Badge variant="secondary" className="text-xs mt-1 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Menor Total
                        </Badge>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {globalTotals.lowestTotal !== null && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Consolidado (Menor)</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(globalTotals.lowestTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

