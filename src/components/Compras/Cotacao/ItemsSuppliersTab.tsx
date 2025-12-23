// =====================================================
// TAB: ITENS & FORNECEDORES
// =====================================================
// Matriz de itens x fornecedores para entrada de valores

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { usePurchaseQuoteStore } from '@/stores/purchaseQuoteStore';
import { Package, Users, DollarSign, Calendar, Percent } from 'lucide-react';

// Helper para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ItemsSuppliersTab() {
  const { items, suppliers, quoteMatrix, toggleSupplierSelection, setQuoteValue } = usePurchaseQuoteStore();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  const selectedSuppliers = suppliers.filter((s) => s.selected);

  return (
    <div className="space-y-4">
      {/* Lista de Fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fornecedores Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50"
              >
                <Checkbox
                  id={`supplier-${supplier.id}`}
                  checked={supplier.selected}
                  onCheckedChange={(checked) =>
                    toggleSupplierSelection(supplier.id, checked === true)
                  }
                />
                <Label
                  htmlFor={`supplier-${supplier.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{supplier.name}</span>
                    <Badge
                      variant={supplier.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {supplier.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                    </Badge>
                  </div>
                  {supplier.cnpj && (
                    <p className="text-xs text-muted-foreground mt-1">{supplier.cnpj}</p>
                  )}
                </Label>
              </div>
            ))}
          </div>
          {selectedSuppliers.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Selecione pelo menos um fornecedor para continuar
            </p>
          )}
        </CardContent>
      </Card>

      {/* Matriz de Valores */}
      {selectedSuppliers.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Valores por Item e Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Cabeçalho da Tabela */}
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `300px repeat(${selectedSuppliers.length}, 1fr)` }}>
                    <div className="font-medium text-sm p-2 border-b">Item</div>
                    {selectedSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="font-medium text-sm p-2 border-b text-center"
                      >
                        {supplier.name}
                      </div>
                    ))}
                  </div>

                  {/* Linhas de Itens */}
                  {items.map((item) => {
                    const row = quoteMatrix[item.id] || {};
                    return (
                      <div
                        key={item.id}
                        className="grid gap-2 mb-4 pb-4 border-b last:border-0"
                        style={{ gridTemplateColumns: `300px repeat(${selectedSuppliers.length}, 1fr)` }}
                      >
                        {/* Informações do Item */}
                        <div className="p-2">
                          <div className="font-medium text-sm">{item.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.quantity} {item.unit} • {item.code}
                          </div>
                        </div>

                        {/* Campos por Fornecedor */}
                        {selectedSuppliers.map((supplier) => {
                          const cell = row[supplier.id] || {
                            price: null,
                            discount: null,
                            leadTime: null,
                            commercialTerms: null,
                            finalValue: null,
                          };

                          return (
                            <div key={supplier.id} className="space-y-2 p-2">
                              {/* Preço Unitário */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Preço Unit.
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

                              {/* Prazo de Entrega */}
                              <div>
                                <Label className="text-xs flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Prazo (dias)
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
                                />
                              </div>

                              {/* Valor Final Calculado */}
                              {cell.finalValue !== null && (
                                <div className="pt-1">
                                  <div className="text-xs text-muted-foreground">Total</div>
                                  <div className="text-sm font-semibold">
                                    {formatCurrency(cell.finalValue)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

