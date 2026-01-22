import React, { useState, useEffect } from 'react';
import { RequirePage } from '@/components/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Filter, 
  Star, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Award,
  ThumbsUp,
  ThumbsDown
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
import { Slider } from '@/components/ui/slider';

interface AvaliacaoFornecedor {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  pedido_id: string;
  avaliador_id: string;
  avaliador_nome: string;
  data_avaliacao: string;
  nota_prazo: number;
  nota_qualidade: number;
  nota_preco: number;
  nota_atendimento: number;
  media_geral: number;
  observacoes?: string;
  status: 'pendente' | 'avaliado' | 'aprovado' | 'rejeitado';
  pedido_numero: string;
  valor_pedido: number;
}

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
  status: 'ativo' | 'inativo' | 'suspenso' | 'homologado';
  ultima_avaliacao?: string;
  total_pedidos: number;
  valor_total_compras: number;
  atraso_medio_dias: number;
  especialidades: string[];
}

const AvaliacaoFornecedores: React.FC = () => {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFornecedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<AvaliacaoFornecedor | null>(null);
  const [showNovaAvaliacao, setShowNovaAvaliacao] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockAvaliacoes: AvaliacaoFornecedor[] = [
      {
        id: '1',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        pedido_id: 'PED-001',
        avaliador_id: 'user1',
        avaliador_nome: 'João Silva',
        data_avaliacao: '2024-01-20',
        nota_prazo: 5,
        nota_qualidade: 4,
        nota_preco: 4,
        nota_atendimento: 5,
        media_geral: 4.5,
        observacoes: 'Excelente fornecedor, entregou no prazo e com qualidade',
        status: 'avaliado',
        pedido_numero: 'PED-2024-001',
        valor_pedido: 15000.00
      },
      {
        id: '2',
        fornecedor_id: '2',
        fornecedor_nome: 'Fornecedor XYZ S/A',
        pedido_id: 'PED-002',
        avaliador_id: 'user2',
        avaliador_nome: 'Maria Santos',
        data_avaliacao: '2024-01-18',
        nota_prazo: 3,
        nota_qualidade: 4,
        nota_preco: 5,
        nota_atendimento: 3,
        media_geral: 3.75,
        observacoes: 'Preço bom, mas atrasou na entrega',
        status: 'avaliado',
        pedido_numero: 'PED-2024-002',
        valor_pedido: 8500.00
      }
    ];

    const mockFornecedores: Fornecedor[] = [
      {
        id: '1',
        partner_id: 'partner-1',
        nome: 'Fornecedor ABC Ltda',
        email: 'cotacoes@abc.com.br',
        telefone: '(11) 99999-9999',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.5,
        total_avaliacoes: 15,
        status: 'homologado',
        ultima_avaliacao: '2024-01-20',
        total_pedidos: 25,
        valor_total_compras: 150000.00,
        atraso_medio_dias: 1.2,
        especialidades: ['Materiais Elétricos', 'Cabeamento']
      },
      {
        id: '2',
        partner_id: 'partner-2',
        nome: 'Fornecedor XYZ S/A',
        email: 'vendas@xyz.com.br',
        telefone: '(11) 88888-8888',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 3.8,
        total_avaliacoes: 8,
        status: 'ativo',
        ultima_avaliacao: '2024-01-18',
        total_pedidos: 12,
        valor_total_compras: 75000.00,
        atraso_medio_dias: 3.5,
        especialidades: ['Ferramentas', 'Equipamentos']
      }
    ];

    setAvaliacoes(mockAvaliacoes);
    setFornecedores(mockFornecedores);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      avaliado: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      aprovado: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejeitado: { color: 'bg-red-100 text-red-800', icon: XCircle }
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

  const getNotaBadge = (nota: number) => {
    if (nota >= 4.5) {
      return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    } else if (nota >= 3.5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Bom</Badge>;
    } else if (nota >= 2.5) {
      return <Badge className="bg-orange-100 text-orange-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Ruim</Badge>;
    }
  };

  const filteredAvaliacoes = avaliacoes.filter(avaliacao => {
    const matchesSearch = avaliacao.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         avaliacao.pedido_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         avaliacao.avaliador_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || avaliacao.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleNovaAvaliacao = () => {
    setShowNovaAvaliacao(true);
  };

  const handleVerDetalhes = (avaliacao: AvaliacaoFornecedor) => {
    setSelectedAvaliacao(avaliacao);
    setShowDetalhes(true);
  };

  const handleAprovarAvaliacao = (avaliacaoId: string) => {
    // Implementar aprovação de avaliação
    console.log('Aprovando avaliação:', avaliacaoId);
  };

  const handleRejeitarAvaliacao = (avaliacaoId: string) => {
    // Implementar rejeição de avaliação
    console.log('Rejeitando avaliação:', avaliacaoId);
  };

  const calcularEstatisticas = () => {
    const total = avaliacoes.length;
    const pendentes = avaliacoes.filter(a => a.status === 'pendente').length;
    const avaliadas = avaliacoes.filter(a => a.status === 'avaliado').length;
    const aprovadas = avaliacoes.filter(a => a.status === 'aprovado').length;
    const notaMedia = avaliacoes.reduce((acc, a) => acc + a.media_geral, 0) / avaliacoes.length || 0;
    
    return { total, pendentes, avaliadas, aprovadas, notaMedia };
  };

  const stats = calcularEstatisticas();

  return (
    <RequirePage pagePath="/compras/fornecedores*" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avaliação de Fornecedores</h1>
          <p className="text-muted-foreground">
            Avalie fornecedores e gerencie homologações
          </p>
        </div>
        <Button onClick={handleNovaAvaliacao}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Avaliação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avaliadas</p>
                <p className="text-2xl font-bold">{stats.avaliadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{stats.aprovadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Nota Média</p>
                <p className="text-2xl font-bold">{stats.notaMedia.toFixed(1)}</p>
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
                  placeholder="Buscar por fornecedor, pedido ou avaliador..."
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
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="avaliado">Avaliado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
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
      <Tabs defaultValue="todas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="avaliadas">Avaliadas</TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Nota Média</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvaliacoes.map((avaliacao) => (
                    <TableRow key={avaliacao.id}>
                      <TableCell className="font-medium">{avaliacao.fornecedor_nome}</TableCell>
                      <TableCell>{avaliacao.pedido_numero}</TableCell>
                      <TableCell>{avaliacao.avaliador_nome}</TableCell>
                      <TableCell>
                        {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="ml-1 font-medium">{avaliacao.media_geral}</span>
                          </div>
                          {getNotaBadge(avaliacao.media_geral)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(avaliacao.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVerDetalhes(avaliacao)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {avaliacao.status === 'avaliado' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleAprovarAvaliacao(avaliacao.id)}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRejeitarAvaliacao(avaliacao.id)}
                                className="text-red-600"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

        <TabsContent value="fornecedores">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Nota Média</TableHead>
                    <TableHead>Avaliações</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedores
                    .sort((a, b) => b.nota_media - a.nota_media)
                    .map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="ml-1 font-medium">{fornecedor.nota_media}</span>
                          </div>
                          {getNotaBadge(fornecedor.nota_media)}
                        </div>
                      </TableCell>
                      <TableCell>{fornecedor.total_avaliacoes}</TableCell>
                      <TableCell>{fornecedor.total_pedidos}</TableCell>
                      <TableCell>
                        R$ {fornecedor.valor_total_compras.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          fornecedor.status === 'homologado' 
                            ? 'bg-green-100 text-green-800' 
                            : fornecedor.status === 'ativo'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }>
                          {fornecedor.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
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
      </Tabs>

      {/* Dialog Nova Avaliação */}
      <Dialog open={showNovaAvaliacao} onOpenChange={setShowNovaAvaliacao}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nova Avaliação de Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="pedido">Pedido</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ped1">PED-2024-001</SelectItem>
                    <SelectItem value="ped2">PED-2024-002</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Critérios de Avaliação</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Prazo de Entrega</Label>
                  <div className="mt-2">
                    <Slider
                      defaultValue={[3]}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 - Muito Ruim</span>
                      <span>5 - Excelente</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Qualidade do Produto</Label>
                  <div className="mt-2">
                    <Slider
                      defaultValue={[3]}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 - Muito Ruim</span>
                      <span>5 - Excelente</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Preço</Label>
                  <div className="mt-2">
                    <Slider
                      defaultValue={[3]}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 - Muito Ruim</span>
                      <span>5 - Excelente</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Atendimento</Label>
                  <div className="mt-2">
                    <Slider
                      defaultValue={[3]}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 - Muito Ruim</span>
                      <span>5 - Excelente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea 
                id="observacoes" 
                placeholder="Comentários sobre a avaliação..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNovaAvaliacao(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setShowNovaAvaliacao(false)}>
                Salvar Avaliação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes da Avaliação */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          {selectedAvaliacao && (
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
                      <p className="font-medium">{selectedAvaliacao.fornecedor_nome}</p>
                    </div>
                    <div>
                      <Label>Pedido</Label>
                      <p className="font-medium">{selectedAvaliacao.pedido_numero}</p>
                    </div>
                    <div>
                      <Label>Avaliador</Label>
                      <p className="font-medium">{selectedAvaliacao.avaliador_nome}</p>
                    </div>
                    <div>
                      <Label>Data</Label>
                      <p className="font-medium">
                        {new Date(selectedAvaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notas Detalhadas */}
              <Card>
                <CardHeader>
                  <CardTitle>Notas por Critério</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <Label>Prazo</Label>
                      <div className="text-3xl font-bold text-blue-600">{selectedAvaliacao.nota_prazo}</div>
                    </div>
                    <div className="text-center">
                      <Label>Qualidade</Label>
                      <div className="text-3xl font-bold text-green-600">{selectedAvaliacao.nota_qualidade}</div>
                    </div>
                    <div className="text-center">
                      <Label>Preço</Label>
                      <div className="text-3xl font-bold text-orange-600">{selectedAvaliacao.nota_preco}</div>
                    </div>
                    <div className="text-center">
                      <Label>Atendimento</Label>
                      <div className="text-3xl font-bold text-purple-600">{selectedAvaliacao.nota_atendimento}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Label>Média Geral</Label>
                    <div className="text-4xl font-bold text-gray-800">{selectedAvaliacao.media_geral}</div>
                    {getNotaBadge(selectedAvaliacao.media_geral)}
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {selectedAvaliacao.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedAvaliacao.observacoes}</p>
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

export default AvaliacaoFornecedores;
