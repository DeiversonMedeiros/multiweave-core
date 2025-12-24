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
import { usePurchaseQuoteStore } from '@/stores/purchaseQuoteStore';
import { Trophy, AlertCircle, CheckCircle2, DollarSign, TrendingDown, TrendingUp, Percent, Calendar, FileText } from 'lucide-react';

// Helper para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function QuoteDecisionTab() {
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

  return (
    <div className="space-y-4">
      {/* Grid Comparativo - Mapa Cotação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Mapa Cotação - Comparativo de Valores
          </CardTitle>
          <CardDescription>
            Preencha os valores por item e fornecedor. Os destaques automáticos indicam menor e maior valor.
          </CardDescription>
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

                              {/* Checkbox Vencedor */}
                              <div className="pt-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`winner-${item.id}-${supplier.id}`}
                                    checked={isWinner}
                                    onCheckedChange={(checked) =>
                                      setItemWinner(item.id, checked ? supplier.id : null)
                                    }
                                  />
                                  <Label
                                    htmlFor={`winner-${item.id}-${supplier.id}`}
                                    className="text-xs cursor-pointer"
                                  >
                                    Marcar como vencedor
                                  </Label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Justificativa se vencedor não for o menor */}
                      {isNotLowest && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-t">
                          <Label className="text-xs text-muted-foreground">
                            Justificativa obrigatória (vencedor não é o menor preço)
                          </Label>
                          <Textarea
                            value={row.justificationIfNotLowest || ''}
                            onChange={(e) =>
                              setItemWinner(item.id, winnerId, e.target.value || undefined)
                            }
                            placeholder="Explique por que este fornecedor foi escolhido mesmo não sendo o menor preço..."
                            className="mt-1 min-h-[60px] text-sm"
                          />
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
                    <Checkbox
                      id={`global-winner-${supplier.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        setGlobalWinner(checked ? supplier.id : null)
                      }
                    />
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

