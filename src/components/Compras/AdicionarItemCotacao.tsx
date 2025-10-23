import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Package, 
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react';

interface Material {
  id: string;
  codigo: string;
  descricao: string;
  unidade_medida: string;
  valor_unitario_estimado: number;
  estoque_atual: number;
  estoque_minimo: number;
}

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  observacoes?: string;
}

interface AdicionarItemCotacaoProps {
  cotacaoId: string;
  onItemAdicionado: (item: RequisicaoItem) => void;
  onCancel: () => void;
}

const AdicionarItemCotacao: React.FC<AdicionarItemCotacaoProps> = ({
  cotacaoId,
  onItemAdicionado,
  onCancel
}) => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [requisicaoItens, setRequisicaoItens] = useState<RequisicaoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [valorUnitario, setValorUnitario] = useState<number>(0);
  const [prazoEntrega, setPrazoEntrega] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockMateriais: Material[] = [
      {
        id: '1',
        codigo: 'MAT-001',
        descricao: 'Cabo de Cobre 2,5mm²',
        unidade_medida: 'metro',
        valor_unitario_estimado: 15.50,
        estoque_atual: 100,
        estoque_minimo: 50
      },
      {
        id: '2',
        codigo: 'MAT-002',
        descricao: 'Disjuntor 20A',
        unidade_medida: 'unidade',
        valor_unitario_estimado: 45.00,
        estoque_atual: 25,
        estoque_minimo: 10
      },
      {
        id: '3',
        codigo: 'MAT-003',
        descricao: 'Luminária LED 18W',
        unidade_medida: 'unidade',
        valor_unitario_estimado: 85.00,
        estoque_atual: 15,
        estoque_minimo: 5
      }
    ];

    const mockRequisicaoItens: RequisicaoItem[] = [
      {
        id: '1',
        material_id: '1',
        material_nome: 'Cabo de Cobre 2,5mm²',
        quantidade: 100,
        unidade_medida: 'metro',
        valor_unitario_estimado: 15.50,
        observacoes: 'Para instalação elétrica'
      },
      {
        id: '2',
        material_id: '2',
        material_nome: 'Disjuntor 20A',
        quantidade: 20,
        unidade_medida: 'unidade',
        valor_unitario_estimado: 45.00,
        observacoes: 'Disjuntores para quadro principal'
      }
    ];

    setMateriais(mockMateriais);
    setRequisicaoItens(mockRequisicaoItens);
  }, []);

  const filteredMateriais = materiais.filter(material =>
    material.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material);
    setValorUnitario(material.valor_unitario_estimado);
  };

  const handleAdicionarItem = () => {
    if (!selectedMaterial) return;

    const novoItem: RequisicaoItem = {
      id: Date.now().toString(),
      material_id: selectedMaterial.id,
      material_nome: selectedMaterial.descricao,
      quantidade,
      unidade_medida: selectedMaterial.unidade_medida,
      valor_unitario_estimado: valorUnitario,
      observacoes
    };

    onItemAdicionado(novoItem);
    
    // Reset form
    setSelectedMaterial(null);
    setQuantidade(1);
    setValorUnitario(0);
    setPrazoEntrega(0);
    setObservacoes('');
  };

  const getStatusEstoque = (material: Material) => {
    if (material.estoque_atual <= material.estoque_minimo) {
      return { status: 'CRÍTICO', color: 'bg-red-100 text-red-800' };
    } else if (material.estoque_atual <= material.estoque_minimo * 1.5) {
      return { status: 'ATENÇÃO', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { status: 'NORMAL', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Adicionar Itens à Cotação</h2>
          <p className="text-muted-foreground">
            Selecione materiais da requisição para incluir na cotação
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Itens da Requisição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Itens da Requisição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Total Estimado</TableHead>
                <TableHead>Status Estoque</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisicaoItens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.material_nome}</div>
                      <div className="text-sm text-muted-foreground">
                        Código: MAT-{item.material_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>{item.unidade_medida}</TableCell>
                  <TableCell>
                    R$ {item.valor_unitario_estimado.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    R$ {(item.quantidade * item.valor_unitario_estimado).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      NORMAL
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Busca de Materiais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Materiais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMateriais.map((material) => {
                const statusEstoque = getStatusEstoque(material);
                return (
                  <Card 
                    key={material.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedMaterial?.id === material.id 
                        ? 'ring-2 ring-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleMaterialSelect(material)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{material.descricao}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.codigo}
                            </div>
                          </div>
                          <Badge className={statusEstoque.color}>
                            {statusEstoque.status}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Unidade:</span>
                            <span>{material.unidade_medida}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valor Estimado:</span>
                            <span>R$ {material.valor_unitario_estimado.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Estoque Atual:</span>
                            <span>{material.estoque_atual}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Adição */}
      {selectedMaterial && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Adicionar Item Selecionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="valorUnitario">Valor Unitário</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="valorUnitario"
                    type="number"
                    step="0.01"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prazoEntrega">Prazo de Entrega (dias)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="prazoEntrega"
                    type="number"
                    min="0"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="unidade">Unidade de Medida</Label>
                <Input
                  id="unidade"
                  value={selectedMaterial.unidade_medida}
                  disabled
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre o item..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-lg font-medium">
                Total: R$ {(quantidade * valorUnitario).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedMaterial(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdicionarItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdicionarItemCotacao;
