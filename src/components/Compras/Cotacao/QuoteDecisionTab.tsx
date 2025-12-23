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

  // Calcular vencedor global (soma de todos os itens)
  const calculateGlobalWinner = () => {
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
                      {item.quantity} {item.unit} • {item.code}
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
              const total = globalTotals.totals[supplier.id] || 0;
              const isWinner = supplier.id === globalTotals.winnerId;
              const isSelected = globalWinnerSupplierId === supplier.id;

              return (
                <div
                  key={supplier.id}
                  className={`flex items-center justify-between p-3 border rounded-md ${
                    isSelected ? 'bg-primary/5 border-primary' : ''
                  }`}
                >
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

