import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Edit, 
  Trash2, 
  Eye,
  Calculator,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  valor_total_estimado: number;
  especificacao_tecnica?: string;
  observacoes?: string;
  status: string;
}

interface ListaItensRequisicaoProps {
  itens: RequisicaoItem[];
  onEditarItem: (item: RequisicaoItem) => void;
  onRemoverItem: (itemId: string) => void;
  onVisualizarItem: (item: RequisicaoItem) => void;
  readonly?: boolean;
}

const ListaItensRequisicao: React.FC<ListaItensRequisicaoProps> = ({
  itens,
  onEditarItem,
  onRemoverItem,
  onVisualizarItem,
  readonly = false
}) => {
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { label: 'Pendente', variant: 'secondary' as const },
      'cotado': { label: 'Cotado', variant: 'default' as const },
      'aprovado': { label: 'Aprovado', variant: 'default' as const },
      'rejeitado': { label: 'Rejeitado', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calcularTotalGeral = () => {
    return itens.reduce((total, item) => total + item.valor_total_estimado, 0);
  };

  const handleRemoverItem = (itemId: string) => {
    onRemoverItem(itemId);
    toast({
      title: 'Item Removido',
      description: 'Item removido da requisição',
    });
  };

  if (itens.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum item adicionado à requisição</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Itens da Requisição ({itens.length})</span>
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span className="text-lg font-bold text-green-600">
                Total: R$ {calcularTotalGeral().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.material_codigo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.material_nome}</div>
                        {item.especificacao_tecnica && (
                          <div className="text-sm text-gray-500">
                            {item.especificacao_tecnica}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>{item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</span>
                        <span className="text-gray-500 text-sm">{item.unidade_medida}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {item.valor_unitario_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {item.valor_total_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onVisualizarItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!readonly && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditarItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoverItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo dos Itens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{itens.length}</div>
              <div className="text-sm text-gray-500">Total de Itens</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                R$ {calcularTotalGeral().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-500">Valor Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {itens.filter(item => item.status === 'pendente').length}
              </div>
              <div className="text-sm text-gray-500">Pendentes</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListaItensRequisicao;
