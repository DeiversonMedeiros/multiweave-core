// =====================================================
// TAB: DECISÃO DA COTAÇÃO
// =====================================================
// Interface para seleção de vencedores e justificativas

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePurchaseQuoteStore } from '@/stores/purchaseQuoteStore';
import { Trophy, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

// Helper para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function QuoteDecisionTab() {
  const { items, suppliers, quoteMatrix, setItemWinner, globalWinnerSupplierId, setGlobalWinner } =
    usePurchaseQuoteStore();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  const selectedSuppliers = suppliers.filter((s) => s.selected);

  // Calcular vencedor por item (menor valor)
  const calculateItemWinner = (itemId: string) => {
    const row = quoteMatrix[itemId] || {};
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

    return { lowestValue, lowestSupplierId };
  };

  // Calcular vencedor global (soma de todos os itens + frete + imposto - descontos)
  const calculateGlobalWinner = () => {
    const subtotals: { [supplierId: string]: number } = {};
    const totals: { [supplierId: string]: number } = {};

    selectedSuppliers.forEach((sup) => {
      let subtotal = 0;
      items.forEach((item) => {
        const row = quoteMatrix[item.id] || {};
        const cell = row[sup.id];
        if (cell?.finalValue != null) {
          subtotal += cell.finalValue;
        }
      });
      subtotals[sup.id] = subtotal;

      // Calcular total final: subtotal + frete + imposto - descontos
      const frete = sup.valor_frete || 0;
      const imposto = sup.valor_imposto || 0;
      const descontoPct = sup.desconto_percentual || 0;
      const descontoValor = sup.desconto_valor || 0;
      const descontoCalculado = subtotal * (descontoPct / 100) + descontoValor;
      
      const totalFinal = subtotal + frete + imposto - descontoCalculado;
      totals[sup.id] = Math.max(0, totalFinal);
    });

    let lowestTotal: number | null = null;
    let winnerId: string | null = null;

    Object.entries(totals).forEach(([supplierId, total]) => {
      if (lowestTotal === null || total < lowestTotal) {
        lowestTotal = total;
        winnerId = supplierId;
      }
    });

    return { subtotals, totals, winnerId, lowestTotal };
  };

  const globalTotals = calculateGlobalWinner();

  return (
    <div className="space-y-4">
      {/* Decisão por Item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Decisão por Item
          </CardTitle>
          <CardDescription>
            Selecione o fornecedor vencedor para cada item
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item) => {
            const row = quoteMatrix[item.id] || {};
            const winnerId = row.winnerSupplierId;
            const { lowestValue, lowestSupplierId } = calculateItemWinner(item.id);
            const isNotLowest = winnerId && lowestSupplierId && winnerId !== lowestSupplierId;

            return (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{item.description}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantity} {item.unit} • {item.originLabel}
                    </p>
                  </div>
                  {lowestValue !== null && (
                    <Badge variant="outline" className="ml-2">
                      Menor: {formatCurrency(lowestValue)}
                    </Badge>
                  )}
                </div>

                <RadioGroup
                  value={winnerId || ''}
                  onValueChange={(value) => setItemWinner(item.id, value || null)}
                >
                  <div className="space-y-2">
                    {selectedSuppliers.map((supplier) => {
                      const cell = row[supplier.id];
                      const value = cell?.finalValue;
                      const isLowest = supplier.id === lowestSupplierId;

                      return (
                        <div
                          key={supplier.id}
                          className="flex items-center space-x-3 p-2 border rounded-md hover:bg-accent/50"
                        >
                          <RadioGroupItem value={supplier.id} id={`${item.id}-${supplier.id}`} />
                          <Label
                            htmlFor={`${item.id}-${supplier.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{supplier.name}</span>
                              <div className="flex items-center gap-2">
                                {value !== null && (
                                  <span className="text-sm font-medium">
                                    {formatCurrency(value)}
                                  </span>
                                )}
                                {isLowest && (
                                  <Badge variant="secondary" className="text-xs">
                                    Menor
                                  </Badge>
                                )}
                                {winnerId === supplier.id && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>

                {/* Justificativa se não for o menor */}
                {isNotLowest && (
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">
                      Justificativa (obrigatória quando vencedor não é o menor preço)
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

                {!winnerId && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Selecione um fornecedor vencedor para este item
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
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
            Visão consolidada de todos os itens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedSuppliers.map((supplier) => {
              const subtotal = globalTotals.subtotals[supplier.id] || 0;
              const total = globalTotals.totals[supplier.id] || 0;
              const isWinner = supplier.id === globalTotals.winnerId;
              const isSelected = globalWinnerSupplierId === supplier.id;
              const frete = supplier.valor_frete || 0;
              const imposto = supplier.valor_imposto || 0;
              const descontoPct = supplier.desconto_percentual || 0;
              const descontoValor = supplier.desconto_valor || 0;
              const descontoCalculado = subtotal * (descontoPct / 100) + descontoValor;
              // Sempre mostrar detalhamento se houver subtotal ou valores extras
              const temInfoExtra = subtotal > 0 || frete > 0 || imposto > 0 || descontoCalculado > 0;

              return (
                <div
                  key={supplier.id}
                  className={`border rounded-md ${
                    isSelected ? 'bg-primary/5 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                        {isWinner && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Menor Total
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Detalhamento: Frete, Imposto, Descontos */}
                  {temInfoExtra && (
                    <div className="px-3 pb-3 pt-2 border-t bg-muted/30 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Subtotal dos itens:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Frete:</span>
                        <span className="font-medium">{formatCurrency(frete)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Impostos:</span>
                        <span className="font-medium">{formatCurrency(imposto)}</span>
                      </div>
                      {descontoCalculado > 0 && (
                        <div className="flex justify-between text-xs text-red-600">
                          <span>Descontos:</span>
                          <span className="font-medium">-{formatCurrency(descontoCalculado)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold pt-1 border-t mt-1">
                        <span>Total Final:</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )}
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

