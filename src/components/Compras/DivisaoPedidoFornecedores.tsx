import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { 
  Package, 
  Users, 
  DollarSign, 
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Building,
  MapPin,
  Star
} from 'lucide-react';

interface Fornecedor {
  id: string;
  partner_id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  nota_media: number;
  total_avaliacoes: number;
  status: 'ativo' | 'inativo' | 'suspenso';
}

interface MaterialItem {
  id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  quantidade_total: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  valor_total_estimado: number;
  divisoes: DivisaoFornecedor[];
}

interface DivisaoFornecedor {
  fornecedor_id: string;
  fornecedor_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega: number;
  observacoes?: string;
}

interface DivisaoPedidoFornecedoresProps {
  itens: MaterialItem[];
  onConfirmarDivisao: (divisoes: any) => void;
  onCancel: () => void;
}

const DivisaoPedidoFornecedores: React.FC<DivisaoPedidoFornecedoresProps> = ({
  itens,
  onConfirmarDivisao,
  onCancel
}) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockFornecedores: Fornecedor[] = [
      {
        id: '1',
        partner_id: 'partner-1',
        nome: 'Fornecedor ABC Ltda',
        email: 'cotacoes@abc.com.br',
        telefone: '(11) 99999-9999',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.8,
        total_avaliacoes: 25,
        status: 'ativo'
      },
      {
        id: '2',
        partner_id: 'partner-2',
        nome: 'Fornecedor XYZ S/A',
        email: 'vendas@xyz.com.br',
        telefone: '(11) 88888-8888',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.5,
        total_avaliacoes: 18,
        status: 'ativo'
      },
      {
        id: '3',
        partner_id: 'partner-3',
        nome: 'Fornecedor DEF Ltda',
        email: 'comercial@def.com.br',
        telefone: '(21) 77777-7777',
        cidade: 'Rio de Janeiro',
        uf: 'RJ',
        nota_media: 4.2,
        total_avaliacoes: 8,
        status: 'ativo'
      }
    ];

    setFornecedores(mockFornecedores);
    
    // Inicializar materiais com divisões vazias
    const materiaisInicializados = itens.map(material => ({
      ...material,
      divisoes: []
    }));
    setMateriais(materiaisInicializados);
    setLoading(false);
  }, [itens]);

  const adicionarDivisao = (materialId: string) => {
    setMateriais(prev => prev.map(material => 
      material.id === materialId 
        ? {
            ...material,
            divisoes: [
              ...material.divisoes,
              {
                fornecedor_id: '',
                fornecedor_nome: '',
                quantidade: 0,
                valor_unitario: material.valor_unitario_estimado,
                valor_total: 0,
                prazo_entrega: 0,
                observacoes: ''
              }
            ]
          }
        : material
    ));
  };

  const removerDivisao = (materialId: string, index: number) => {
    setMateriais(prev => prev.map(material => 
      material.id === materialId 
        ? {
            ...material,
            divisoes: material.divisoes.filter((_, i) => i !== index)
          }
        : material
    ));
  };

  const atualizarDivisao = (materialId: string, index: number, campo: string, valor: any) => {
    setMateriais(prev => prev.map(material => 
      material.id === materialId 
        ? {
            ...material,
            divisoes: material.divisoes.map((divisao, i) => 
              i === index 
                ? {
                    ...divisao,
                    [campo]: valor,
                    ...(campo === 'fornecedor_id' && {
                      fornecedor_nome: fornecedores.find(f => f.id === valor)?.nome || ''
                    }),
                    ...(campo === 'quantidade' && {
                      valor_total: valor * divisao.valor_unitario
                    }),
                    ...(campo === 'valor_unitario' && {
                      valor_total: divisao.quantidade * valor
                    })
                  }
                : divisao
            )
          }
        : material
    ));
  };

  const calcularQuantidadeRestante = (material: MaterialItem) => {
    const quantidadeDivisao = material.divisoes.reduce((acc, div) => acc + div.quantidade, 0);
    return material.quantidade_total - quantidadeDivisao;
  };

  const calcularValorTotalDivisao = (material: MaterialItem) => {
    return material.divisoes.reduce((acc, div) => acc + div.valor_total, 0);
  };

  const validarDivisoes = () => {
    return materiais.every(material => {
      const quantidadeDivisao = material.divisoes.reduce((acc, div) => acc + div.quantidade, 0);
      return quantidadeDivisao === material.quantidade_total && 
             material.divisoes.every(div => div.fornecedor_id && div.quantidade > 0);
    });
  };

  const handleConfirmarDivisao = () => {
    const divisoes = materiais.map(material => ({
      material_id: material.material_id,
      material_nome: material.material_nome,
      quantidade_total: material.quantidade_total,
      divisoes: material.divisoes.map(div => ({
        fornecedor_id: div.fornecedor_id,
        quantidade: div.quantidade,
        valor_unitario: div.valor_unitario,
        valor_total: div.valor_total,
        prazo_entrega: div.prazo_entrega,
        observacoes: div.observacoes
      }))
    }));

    onConfirmarDivisao(divisoes);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inativo: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      suspenso: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Carregando fornecedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Divisão de Pedido entre Fornecedores</h2>
          <p className="text-muted-foreground">
            Divida os materiais entre diferentes fornecedores para otimizar compras
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Instruções */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Instruções</h3>
              <p className="text-sm text-blue-800 mt-1">
                Para cada material, adicione divisões com diferentes fornecedores. 
                A quantidade total das divisões deve ser igual à quantidade solicitada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materiais e Divisões */}
      {materiais.map((material) => (
        <Card key={material.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {material.material_nome}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Quantidade Total: <span className="font-medium">{material.quantidade_total} {material.unidade_medida}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Restante: <span className={`font-medium ${calcularQuantidadeRestante(material) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calcularQuantidadeRestante(material)} {material.unidade_medida}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => adicionarDivisao(material.id)}
                  disabled={calcularQuantidadeRestante(material) === 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Divisão
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {material.divisoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma divisão adicionada</p>
                <p className="text-sm">Clique em "Adicionar Divisão" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Valor Unitário</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Prazo (dias)</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {material.divisoes.map((divisao, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={divisao.fornecedor_id}
                          onValueChange={(value) => atualizarDivisao(material.id, index, 'fornecedor_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(fornecedor => (
                              <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                <div className="flex items-center space-x-2">
                                  <span>{fornecedor.nome}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {fornecedor.nota_media}/5
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={calcularQuantidadeRestante(material) + divisao.quantidade}
                          value={divisao.quantidade}
                          onChange={(e) => atualizarDivisao(material.id, index, 'quantidade', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={divisao.valor_unitario}
                          onChange={(e) => atualizarDivisao(material.id, index, 'valor_unitario', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          R$ {divisao.valor_total.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={divisao.prazo_entrega}
                          onChange={(e) => atualizarDivisao(material.id, index, 'prazo_entrega', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Observações..."
                          value={divisao.observacoes || ''}
                          onChange={(e) => atualizarDivisao(material.id, index, 'observacoes', e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removerDivisao(material.id, index)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Resumo do Material */}
            {material.divisoes.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total das Divisões: </span>
                    <span className="font-medium">
                      {material.divisoes.reduce((acc, div) => acc + div.quantidade, 0)} {material.unidade_medida}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Valor Total: </span>
                    <span className="font-medium">
                      R$ {calcularValorTotalDivisao(material).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Total de Materiais</Label>
              <p className="text-2xl font-bold">{materiais.length}</p>
            </div>
            <div>
              <Label>Total de Divisões</Label>
              <p className="text-2xl font-bold">
                {materiais.reduce((acc, mat) => acc + mat.divisoes.length, 0)}
              </p>
            </div>
            <div>
              <Label>Valor Total Estimado</Label>
              <p className="text-2xl font-bold">
                R$ {materiais.reduce((acc, mat) => acc + calcularValorTotalDivisao(mat), 0).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {validarDivisoes() ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Todas as divisões estão válidas
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Verifique as divisões antes de continuar
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarDivisao}
            disabled={!validarDivisoes()}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Divisão
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DivisaoPedidoFornecedores;
