// =====================================================
// TAB: ITENS & FORNECEDORES (UNIFICADOS)
// =====================================================
// Esta aba define o campo de jogo, não a cotação.
// Parte superior: Itens da Cotação (Sticky) - Grid somente leitura
// Parte inferior: Seleção de Fornecedores - Grid com seleção

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePurchaseQuoteStore } from '@/stores/purchaseQuoteStore';
import { Package, Users, Lock, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ItemsSuppliersTabProps {
  isEditMode?: boolean;
}

export function ItemsSuppliersTab({ isEditMode = false }: ItemsSuppliersTabProps) {
  const { items, suppliers, context, toggleSupplierSelection } = usePurchaseQuoteStore();
  const [showValuesSection, setShowValuesSection] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  const selectedSuppliers = suppliers.filter((s) => s.selected);
  const hasSelectedSuppliers = selectedSuppliers.length > 0;

  // Validações de fornecedores
  const getSupplierTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      LOCAL: 'Local',
      NACIONAL: 'Nacional',
      INTERNACIONAL: 'Internacional',
    };
    return types[type] || type;
  };

  // Validação de cotação emergencial
  const validateEmergencyQuote = () => {
    if (context?.type !== 'EMERGENCY') return null;
    const count = selectedSuppliers.length;
    if (count < 1) return 'Cotação emergencial requer pelo menos 1 fornecedor';
    if (count > 6) return 'Cotação emergencial permite no máximo 6 fornecedores';
    return null;
  };

  const emergencyError = validateEmergencyQuote();

  return (
    <div className="flex flex-col h-full">
      {/* Parte Superior - Itens da Cotação (Sticky) */}
      <div className="sticky top-0 z-10 bg-background border-b pb-4 mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Itens da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Unidade</TableHead>
                    <TableHead className="w-[120px] text-right">Quantidade</TableHead>
                    <TableHead className="w-[150px]">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.originLabel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parte Inferior - Seleção de Fornecedores */}
      <div className="flex-1 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Seleção de Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-[150px]">CNPJ</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => {
                    const isBlocked = supplier.status === 'BLOCKED';
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Checkbox
                            id={`supplier-${supplier.id}`}
                            checked={supplier.selected}
                            disabled={isBlocked || !isEditMode}
                            onCheckedChange={(checked) =>
                              toggleSupplierSelection(supplier.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Label
                            htmlFor={`supplier-${supplier.id}`}
                            className={`cursor-pointer ${isBlocked ? 'opacity-50' : ''}`}
                          >
                            {supplier.name}
                          </Label>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {supplier.cnpj || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getSupplierTypeLabel(supplier.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isBlocked ? (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Bloqueado
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {suppliers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Nenhum fornecedor disponível
              </p>
            )}

            {selectedSuppliers.length === 0 && suppliers.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Selecione pelo menos um fornecedor para continuar
                </AlertDescription>
              </Alert>
            )}

            {emergencyError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{emergencyError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Campo Valores da Cotação - Só habilita quando tem fornecedor vinculado */}
        {hasSelectedSuppliers && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Valores da Cotação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {selectedSuppliers.length} fornecedor(es) selecionado(s). 
                  Você pode preencher os valores na aba "Mapa Cotação" após selecionar os fornecedores.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowValuesSection(!showValuesSection)}
                  >
                    {showValuesSection ? 'Ocultar' : 'Mostrar'} Resumo
                  </Button>
                </div>
                {showValuesSection && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Fornecedores Selecionados:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedSuppliers.map((supplier) => (
                        <li key={supplier.id} className="text-sm text-muted-foreground">
                          {supplier.name} {supplier.cnpj && `(${supplier.cnpj})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

