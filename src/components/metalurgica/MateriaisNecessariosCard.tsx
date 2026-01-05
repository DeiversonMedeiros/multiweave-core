import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMateriaisNecessarios } from '@/hooks/metalurgica/useMateriaisNecessarios';
import { useEstoqueAtual } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { Loader2 } from 'lucide-react';

interface MateriaisNecessariosCardProps {
  produtoId: string;
  quantidade: number;
}

export const MateriaisNecessariosCard: React.FC<MateriaisNecessariosCardProps> = ({
  produtoId,
  quantidade,
}) => {
  const { data: materiaisNecessarios, isLoading } = useMateriaisNecessarios(produtoId, quantidade);
  const { data: estoqueData } = useEstoqueAtual();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Calculando materiais necessários...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const materiais = materiaisNecessarios || [];
  const estoque = estoqueData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Materiais Necessários
        </CardTitle>
      </CardHeader>
      <CardContent>
        {materiais.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum material necessário</p>
        ) : (
          <div className="space-y-3">
            {materiais.map((material, index) => {
              const estoqueItem = estoque.find(
                (e: any) => e.material_id === material.material_id
              );
              const estoqueDisponivel = estoqueItem?.quantidade_disponivel || 0;
              const suficiente = estoqueDisponivel >= material.quantidade_necessaria;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {suficiente ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium">Material {index + 1}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Necessário: {material.quantidade_necessaria} {material.unidade_medida}
                    </div>
                    <div className="text-sm text-gray-600">
                      Disponível: {estoqueDisponivel} {material.unidade_medida}
                    </div>
                  </div>
                  <Badge variant={suficiente ? 'default' : 'destructive'}>
                    {suficiente ? 'Suficiente' : 'Insuficiente'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

