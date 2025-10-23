import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Settings
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Contrato {
  id: string;
  numero: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: 'ativo' | 'inativo' | 'vencido' | 'renovado' | 'cancelado';
  tipo_reajuste: 'ipca' | 'igpm' | 'cdi' | 'fixo';
  indice_reajuste: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  itens: ContratoItem[];
}

interface ContratoItem {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade_mensal: number;
  valor_unitario: number;
  valor_total_mensal: number;
  unidade_medida: string;
  observacoes?: string;
}

interface CompraRecorrente {
  id: string;
  contrato_id: string;
  material_id: string;
  material_nome: string;
  quantidade_mensal: number;
  valor_unitario: number;
  proxima_compra: string;
  status: 'ativo' | 'pausado' | 'finalizado';
  ultima_compra?: string;
  total_compras: number;
  valor_total_gasto: number;
}

const ContratosRecorrentes: React.FC = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [comprasRecorrentes, setComprasRecorrentes] = useState<CompraRecorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showNovoContrato, setShowNovoContrato] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockContratos: Contrato[] = [
      {
        id: '1',
        numero: 'CONT-2024-001',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        descricao: 'Contrato para fornecimento de materiais elétricos',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        valor_total: 120000.00,
        status: 'ativo',
        tipo_reajuste: 'ipca',
        indice_reajuste: 4.62,
        observacoes: 'Contrato anual com reajuste pelo IPCA',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        itens: [
          {
            id: '1',
            material_id: 'MAT-001',
            material_nome: 'Cabo de Cobre 2,5mm²',
            quantidade_mensal: 100,
            valor_unitario: 15.50,
            valor_total_mensal: 1550.00,
            unidade_medida: 'metro',
            observacoes: 'Cabo nacional'
          },
          {
            id: '2',
            material_id: 'MAT-002',
            material_nome: 'Disjuntor 20A',
            quantidade_mensal: 20,
            valor_unitario: 45.00,
            valor_total_mensal: 900.00,
            unidade_medida: 'unidade',
            observacoes: 'Disjuntor bipolar'
          }
        ]
      },
      {
        id: '2',
        numero: 'CONT-2024-002',
        fornecedor_id: '2',
        fornecedor_nome: 'Fornecedor XYZ S/A',
        descricao: 'Contrato para fornecimento de ferramentas',
        data_inicio: '2024-02-01',
        data_fim: '2024-07-31',
        valor_total: 50000.00,
        status: 'ativo',
        tipo_reajuste: 'igpm',
        indice_reajuste: 3.85,
        observacoes: 'Contrato semestral com reajuste pelo IGPM',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        itens: [
          {
            id: '3',
            material_id: 'MAT-003',
            material_nome: 'Furadeira Elétrica',
            quantidade_mensal: 2,
            valor_unitario: 4250.00,
            valor_total_mensal: 8500.00,
            unidade_medida: 'unidade',
            observacoes: 'Furadeira profissional'
          }
        ]
      }
    ];

    const mockComprasRecorrentes: CompraRecorrente[] = [
      {
        id: '1',
        contrato_id: '1',
        material_id: 'MAT-001',
        material_nome: 'Cabo de Cobre 2,5mm²',
        quantidade_mensal: 100,
        valor_unitario: 15.50,
        proxima_compra: '2024-02-01',
        status: 'ativo',
        ultima_compra: '2024-01-01',
        total_compras: 1,
        valor_total_gasto: 1550.00
      },
      {
        id: '2',
        contrato_id: '1',
        material_id: 'MAT-002',
        material_nome: 'Disjuntor 20A',
        quantidade_mensal: 20,
        valor_unitario: 45.00,
        proxima_compra: '2024-02-01',
        status: 'ativo',
        ultima_compra: '2024-01-01',
        total_compras: 1,
        valor_total_gasto: 900.00
      }
    ];

    setContratos(mockContratos);
    setComprasRecorrentes(mockComprasRecorrentes);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inativo: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      vencido: { color: 'bg-red-100 text-red-800', icon: XCircle },
      renovado: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      cancelado: { color: 'bg-red-100 text-red-800', icon: XCircle },
      pausado: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      finalizado: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle }
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

  const getTipoReajusteLabel = (tipo: string) => {
    const tipos = {
      ipca: 'IPCA',
      igpm: 'IGPM',
      cdi: 'CDI',
      fixo: 'Fixo'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const filteredContratos = contratos.filter(contrato => {
    const matchesSearch = contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contrato.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contrato.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || contrato.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleNovoContrato = () => {
    setShowNovoContrato(true);
  };

  const handleVerDetalhes = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowDetalhes(true);
  };

  const handleRenovarContrato = (contratoId: string) => {
    // Implementar renovação de contrato
    console.log('Renovando contrato:', contratoId);
  };

  const handlePausarCompra = (compraId: string) => {
    // Implementar pausar compra recorrente
    console.log('Pausando compra:', compraId);
  };

  const calcularEstatisticas = () => {
    const totalContratos = contratos.length;
    const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
    const contratosVencidos = contratos.filter(c => c.status === 'vencido').length;
    const valorTotalContratos = contratos.reduce((acc, c) => acc + c.valor_total, 0);
    const comprasAtivas = comprasRecorrentes.filter(c => c.status === 'ativo').length;
    
    return { totalContratos, contratosAtivos, contratosVencidos, valorTotalContratos, comprasAtivas };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contratos e Compras Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie contratos e compras automáticas recorrentes
          </p>
        </div>
        <Button onClick={handleNovoContrato}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Contratos</p>
                <p className="text-2xl font-bold">{stats.totalContratos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Contratos Ativos</p>
                <p className="text-2xl font-bold">{stats.contratosAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold">{stats.contratosVencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Compras Ativas</p>
                <p className="text-2xl font-bold">{stats.comprasAtivas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  R$ {stats.valorTotalContratos.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número, fornecedor ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="renovado">Renovado</SelectItem>
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
      <Tabs defaultValue="contratos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="recorrentes">Compras Recorrentes</TabsTrigger>
          <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos">
          <Card>
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Reajuste</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell className="font-medium">{contrato.numero}</TableCell>
                      <TableCell>{contrato.fornecedor_nome}</TableCell>
                      <TableCell className="max-w-xs truncate">{contrato.descricao}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}</div>
                          <div className="text-muted-foreground">
                            até {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        R$ {contrato.valor_total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{getTipoReajusteLabel(contrato.tipo_reajuste)}</div>
                          <div className="text-muted-foreground">
                            {contrato.indice_reajuste}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVerDetalhes(contrato)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {contrato.status === 'ativo' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRenovarContrato(contrato.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recorrentes">
          <Card>
            <CardHeader>
              <CardTitle>Compras Recorrentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade Mensal</TableHead>
                    <TableHead>Valor Unitário</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Próxima Compra</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprasRecorrentes.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="font-medium">{compra.material_nome}</TableCell>
                      <TableCell>{compra.quantidade_mensal}</TableCell>
                      <TableCell>
                        R$ {compra.valor_unitario.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        R$ {(compra.quantidade_mensal * compra.valor_unitario).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(compra.proxima_compra).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{getStatusBadge(compra.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePausarCompra(compra.id)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimentos">
          <Card>
            <CardHeader>
              <CardTitle>Vencimentos Próximos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contratos
                  .filter(c => c.status === 'ativo')
                  .sort((a, b) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())
                  .slice(0, 5)
                  .map((contrato) => {
                    const diasParaVencimento = Math.ceil(
                      (new Date(contrato.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    return (
                      <div key={contrato.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{contrato.numero}</h3>
                          <p className="text-sm text-muted-foreground">{contrato.fornecedor_nome}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Vence em {diasParaVencimento} dias
                          </div>
                          <div className="text-sm">
                            {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Renovar
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Novo Contrato */}
      <Dialog open={showNovoContrato} onOpenChange={setShowNovoContrato}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero">Número do Contrato</Label>
                <Input id="numero" placeholder="CONT-2024-XXX" />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forn1">Fornecedor ABC Ltda</SelectItem>
                    <SelectItem value="forn2">Fornecedor XYZ S/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" placeholder="Descrição do contrato..." />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data de Início</Label>
                <Input type="date" id="dataInicio" />
              </div>
              <div>
                <Label htmlFor="dataFim">Data de Fim</Label>
                <Input type="date" id="dataFim" />
              </div>
              <div>
                <Label htmlFor="valorTotal">Valor Total</Label>
                <Input type="number" id="valorTotal" placeholder="0.00" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipoReajuste">Tipo de Reajuste</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipca">IPCA</SelectItem>
                    <SelectItem value="igpm">IGPM</SelectItem>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="indiceReajuste">Índice de Reajuste (%)</Label>
                <Input type="number" id="indiceReajuste" placeholder="0.00" step="0.01" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" placeholder="Observações sobre o contrato..." />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNovoContrato(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setShowNovoContrato(false)}>
                Criar Contrato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes do Contrato */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato - {selectedContrato?.numero}</DialogTitle>
          </DialogHeader>
          {selectedContrato && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Fornecedor</Label>
                      <p className="font-medium">{selectedContrato.fornecedor_nome}</p>
                    </div>
                    <div>
                      <Label>Período</Label>
                      <p className="font-medium">
                        {new Date(selectedContrato.data_inicio).toLocaleDateString('pt-BR')} - {new Date(selectedContrato.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <p className="font-medium">
                        R$ {selectedContrato.valor_total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div>{getStatusBadge(selectedContrato.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens do Contrato */}
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Contrato</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantidade Mensal</TableHead>
                        <TableHead>Valor Unitário</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedContrato.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.material_nome}</TableCell>
                          <TableCell>{item.quantidade_mensal} {item.unidade_medida}</TableCell>
                          <TableCell>
                            R$ {item.valor_unitario.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </TableCell>
                          <TableCell>
                            R$ {item.valor_total_mensal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </TableCell>
                          <TableCell>{item.observacoes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContratosRecorrentes;
