import React, { useState, useEffect } from 'react';
import { RequirePage } from '@/components/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Package,
  Building,
  BarChart3,
  FileText
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-picker';

interface HistoricoCompra {
  id: string;
  pedido_id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number;
  valor_total: number;
  data_compra: string;
  data_entrega: string;
  status: 'pendente' | 'entregue' | 'faturado' | 'cancelado';
  centro_custo: string;
  solicitante: string;
  observacoes?: string;
}

interface VariacaoPreco {
  material_id: string;
  material_nome: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  preco_anterior: number;
  preco_atual: number;
  variacao_percentual: number;
  data_variacao: string;
  pedido_id: string;
}

interface EstatisticaCompra {
  total_compras: number;
  valor_total: number;
  fornecedores_unicos: number;
  materiais_unicos: number;
  ticket_medio: number;
  variacao_precos: number;
}

const HistoricoCompras: React.FC = () => {
  const [historico, setHistorico] = useState<HistoricoCompra[]>([]);
  const [variacoesPreco, setVariacoesPreco] = useState<VariacaoPreco[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticaCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [filtroMaterial, setFiltroMaterial] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroData, setFiltroData] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedCompra, setSelectedCompra] = useState<HistoricoCompra | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockHistorico: HistoricoCompra[] = [
      {
        id: '1',
        pedido_id: 'PED-2024-001',
        material_id: 'MAT-001',
        material_nome: 'Cabo de Cobre 2,5mm²',
        material_codigo: 'CAB-001',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        quantidade: 100,
        unidade_medida: 'metro',
        valor_unitario: 15.50,
        valor_total: 1550.00,
        data_compra: '2024-01-15',
        data_entrega: '2024-01-23',
        status: 'entregue',
        centro_custo: 'Manutenção',
        solicitante: 'João Silva',
        observacoes: 'Cabo nacional de qualidade'
      },
      {
        id: '2',
        pedido_id: 'PED-2024-002',
        material_id: 'MAT-002',
        material_nome: 'Disjuntor 20A',
        material_codigo: 'DIS-001',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        quantidade: 20,
        unidade_medida: 'unidade',
        valor_unitario: 45.00,
        valor_total: 900.00,
        data_compra: '2024-01-15',
        data_entrega: '2024-01-20',
        status: 'entregue',
        centro_custo: 'Manutenção',
        solicitante: 'João Silva',
        observacoes: 'Disjuntor bipolar'
      },
      {
        id: '3',
        pedido_id: 'PED-2024-003',
        material_id: 'MAT-003',
        material_nome: 'Cabo de Cobre 2,5mm²',
        material_codigo: 'CAB-001',
        fornecedor_id: '2',
        fornecedor_nome: 'Fornecedor XYZ S/A',
        quantidade: 50,
        unidade_medida: 'metro',
        valor_unitario: 14.80,
        valor_total: 740.00,
        data_compra: '2024-01-20',
        data_entrega: '2024-01-30',
        status: 'entregue',
        centro_custo: 'Implantação',
        solicitante: 'Maria Santos',
        observacoes: 'Cabo importado'
      }
    ];

    const mockVariacoes: VariacaoPreco[] = [
      {
        material_id: 'MAT-001',
        material_nome: 'Cabo de Cobre 2,5mm²',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        preco_anterior: 15.00,
        preco_atual: 15.50,
        variacao_percentual: 3.33,
        data_variacao: '2024-01-15',
        pedido_id: 'PED-2024-001'
      },
      {
        material_id: 'MAT-002',
        material_nome: 'Disjuntor 20A',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        preco_anterior: 42.00,
        preco_atual: 45.00,
        variacao_percentual: 7.14,
        data_variacao: '2024-01-15',
        pedido_id: 'PED-2024-002'
      }
    ];

    const mockEstatisticas: EstatisticaCompra = {
      total_compras: 3,
      valor_total: 3190.00,
      fornecedores_unicos: 2,
      materiais_unicos: 3,
      ticket_medio: 1063.33,
      variacao_precos: 5.24
    };

    setHistorico(mockHistorico);
    setVariacoesPreco(mockVariacoes);
    setEstatisticas(mockEstatisticas);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
      entregue: { color: 'bg-green-100 text-green-800', icon: Package },
      faturado: { color: 'bg-blue-100 text-blue-800', icon: FileText },
      cancelado: { color: 'bg-red-100 text-red-800', icon: Package }
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

  const getVariacaoBadge = (variacao: number) => {
    if (variacao > 0) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{variacao.toFixed(2)}%
        </Badge>
      );
    } else if (variacao < 0) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <TrendingDown className="w-3 h-3 mr-1" />
          {variacao.toFixed(2)}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          {variacao.toFixed(2)}%
        </Badge>
      );
    }
  };

  const filteredHistorico = historico.filter(compra => {
    const matchesSearch = compra.material_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.pedido_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.centro_custo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFornecedor = filtroFornecedor === 'todos' || compra.fornecedor_id === filtroFornecedor;
    const matchesMaterial = filtroMaterial === 'todos' || compra.material_id === filtroMaterial;
    const matchesStatus = filtroStatus === 'todos' || compra.status === filtroStatus;
    
    const matchesData = !filtroData || (
      new Date(compra.data_compra) >= filtroData.from &&
      new Date(compra.data_compra) <= filtroData.to
    );
    
    return matchesSearch && matchesFornecedor && matchesMaterial && matchesStatus && matchesData;
  });

  const handleVerDetalhes = (compra: HistoricoCompra) => {
    setSelectedCompra(compra);
    setShowDetalhes(true);
  };

  const handleExportar = () => {
    // Implementar exportação
    console.log('Exportando histórico...');
  };

  const fornecedores = [...new Map(historico.map(c => [c.fornecedor_id, { id: c.fornecedor_id, nome: c.fornecedor_nome }])).values()];
  const materiais = [...new Map(historico.map(c => [c.material_id, { id: c.material_id, nome: c.material_nome }])).values()];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/compras/historico*" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Compras</h1>
          <p className="text-muted-foreground">
            Consulte o histórico completo de compras e variações de preços
          </p>
        </div>
        <Button onClick={handleExportar}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Compras</p>
                  <p className="text-2xl font-bold">{estatisticas.total_compras}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    R$ {estatisticas.valor_total.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold">{estatisticas.fornecedores_unicos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Materiais</p>
                  <p className="text-2xl font-bold">{estatisticas.materiais_unicos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">
                    R$ {estatisticas.ticket_medio.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Variação Preços</p>
                  <p className="text-2xl font-bold">{estatisticas.variacao_precos.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por material, fornecedor ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Fornecedores</SelectItem>
                {fornecedores.map(fornecedor => (
                  <SelectItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroMaterial} onValueChange={setFiltroMaterial}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Materiais</SelectItem>
                {materiais.map(material => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="faturado">Faturado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="variacoes">Variações de Preço</TabsTrigger>
          <TabsTrigger value="analises">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Valor Unitário</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Data Compra</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorico.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="font-medium">{compra.pedido_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{compra.material_nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {compra.material_codigo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{compra.fornecedor_nome}</TableCell>
                      <TableCell>
                        {compra.quantidade} {compra.unidade_medida}
                      </TableCell>
                      <TableCell>
                        R$ {compra.valor_unitario.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        R$ {compra.valor_total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(compra.data_compra).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{getStatusBadge(compra.status)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerDetalhes(compra)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variacoes">
          <Card>
            <CardHeader>
              <CardTitle>Variações de Preço</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Preço Anterior</TableHead>
                    <TableHead>Preço Atual</TableHead>
                    <TableHead>Variação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacoesPreco.map((variacao, index) => (
                    <TableRow key={`${variacao.material_id}-${variacao.fornecedor_id}-${variacao.pedido_id}-${index}`}>
                      <TableCell className="font-medium">{variacao.material_nome}</TableCell>
                      <TableCell>{variacao.fornecedor_nome}</TableCell>
                      <TableCell>
                        R$ {variacao.preco_anterior.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        R$ {variacao.preco_atual.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>{getVariacaoBadge(variacao.variacao_percentual)}</TableCell>
                      <TableCell>
                        {new Date(variacao.data_variacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{variacao.pedido_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analises">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Fornecedores por Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fornecedores.map((fornecedor, index) => {
                    const valorTotal = historico
                      .filter(c => c.fornecedor_id === fornecedor.id)
                      .reduce((acc, c) => acc + c.valor_total, 0);
                    
                    return (
                      <div key={`fornecedor-${fornecedor.id}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{fornecedor.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {historico.filter(c => c.fornecedor_id === fornecedor.id).length} compras
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {valorTotal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Materiais por Frequência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materiais.map((material, index) => {
                    const frequencia = historico.filter(c => c.material_id === material.id).length;
                    const valorTotal = historico
                      .filter(c => c.material_id === material.id)
                      .reduce((acc, c) => acc + c.valor_total, 0);
                    
                    return (
                      <div key={`material-${material.id}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{material.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {frequencia} compras
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {valorTotal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Detalhes da Compra */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra - {selectedCompra?.pedido_id}</DialogTitle>
          </DialogHeader>
          {selectedCompra && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Material</Label>
                      <p className="font-medium">{selectedCompra.material_nome}</p>
                      <p className="text-sm text-muted-foreground">{selectedCompra.material_codigo}</p>
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <p className="font-medium">{selectedCompra.fornecedor_nome}</p>
                    </div>
                    <div>
                      <Label>Centro de Custo</Label>
                      <p className="font-medium">{selectedCompra.centro_custo}</p>
                    </div>
                    <div>
                      <Label>Solicitante</Label>
                      <p className="font-medium">{selectedCompra.solicitante}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes Financeiros */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes Financeiros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <p className="font-medium text-lg">
                        {selectedCompra.quantidade} {selectedCompra.unidade_medida}
                      </p>
                    </div>
                    <div>
                      <Label>Valor Unitário</Label>
                      <p className="font-medium text-lg">
                        R$ {selectedCompra.valor_unitario.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <p className="font-medium text-xl text-green-600">
                        R$ {selectedCompra.valor_total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div>{getStatusBadge(selectedCompra.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Datas */}
              <Card>
                <CardHeader>
                  <CardTitle>Datas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data da Compra</Label>
                      <p className="font-medium">
                        {new Date(selectedCompra.data_compra).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <Label>Data de Entrega</Label>
                      <p className="font-medium">
                        {new Date(selectedCompra.data_entrega).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {selectedCompra.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedCompra.observacoes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </RequirePage>
  );
};

export default HistoricoCompras;
