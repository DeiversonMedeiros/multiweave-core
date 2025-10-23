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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Award, 
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  Users
} from 'lucide-react';

interface Fornecedor {
  id: string;
  partner_id: string;
  nome: string;
  email_cotacao: string;
  telefone: string;
  cidade: string;
  uf: string;
  nota_media: number;
  total_avaliacoes: number;
  status: 'ativo' | 'inativo' | 'suspenso';
  ultima_compra?: string;
  total_compras: number;
  valor_total_compras: number;
  atraso_medio_dias: number;
  especialidades: string[];
}

interface SugestaoFornecedoresProps {
  uf: string;
  materialId?: string;
  onFornecedorSelecionado: (fornecedor: Fornecedor) => void;
  onCancel: () => void;
}

const SugestaoFornecedores: React.FC<SugestaoFornecedoresProps> = ({
  uf,
  materialId,
  onFornecedorSelecionado,
  onCancel
}) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroNota, setFiltroNota] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<string>('nota');

  // Mock data - substituir por chamada à função compras.sugerir_fornecedores_uf
  useEffect(() => {
    const mockFornecedores: Fornecedor[] = [
      {
        id: '1',
        partner_id: 'partner-1',
        nome: 'Fornecedor ABC Ltda',
        email_cotacao: 'cotacoes@abc.com.br',
        telefone: '(11) 99999-9999',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.8,
        total_avaliacoes: 25,
        status: 'ativo',
        ultima_compra: '2024-01-10',
        total_compras: 15,
        valor_total_compras: 125000.00,
        atraso_medio_dias: 1.2,
        especialidades: ['Materiais Elétricos', 'Cabeamento']
      },
      {
        id: '2',
        partner_id: 'partner-2',
        nome: 'Fornecedor XYZ S/A',
        email_cotacao: 'vendas@xyz.com.br',
        telefone: '(11) 88888-8888',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.5,
        total_avaliacoes: 18,
        status: 'ativo',
        ultima_compra: '2024-01-08',
        total_compras: 12,
        valor_total_compras: 98000.00,
        atraso_medio_dias: 2.5,
        especialidades: ['Ferramentas', 'Equipamentos']
      },
      {
        id: '3',
        partner_id: 'partner-3',
        nome: 'Fornecedor DEF Ltda',
        email_cotacao: 'comercial@def.com.br',
        telefone: '(11) 77777-7777',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 4.2,
        total_avaliacoes: 8,
        status: 'ativo',
        ultima_compra: '2024-01-05',
        total_compras: 6,
        valor_total_compras: 45000.00,
        atraso_medio_dias: 3.8,
        especialidades: ['Materiais de Construção']
      },
      {
        id: '4',
        partner_id: 'partner-4',
        nome: 'Fornecedor GHI Comércio',
        email_cotacao: 'orcamentos@ghi.com.br',
        telefone: '(11) 66666-6666',
        cidade: 'São Paulo',
        uf: 'SP',
        nota_media: 3.8,
        total_avaliacoes: 5,
        status: 'ativo',
        ultima_compra: '2023-12-20',
        total_compras: 3,
        valor_total_compras: 15000.00,
        atraso_medio_dias: 5.2,
        especialidades: ['Materiais Diversos']
      }
    ];

    setFornecedores(mockFornecedores);
    setLoading(false);
  }, [uf, materialId]);

  const filteredFornecedores = fornecedores.filter(fornecedor => {
    const matchesSearch = fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fornecedor.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fornecedor.especialidades.some(esp => 
                           esp.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesNota = filtroNota === 'todos' || 
                       (filtroNota === 'alta' && fornecedor.nota_media >= 4.5) ||
                       (filtroNota === 'media' && fornecedor.nota_media >= 3.5 && fornecedor.nota_media < 4.5) ||
                       (filtroNota === 'baixa' && fornecedor.nota_media < 3.5);
    
    const matchesStatus = filtroStatus === 'todos' || fornecedor.status === filtroStatus;
    
    return matchesSearch && matchesNota && matchesStatus;
  });

  const sortedFornecedores = [...filteredFornecedores].sort((a, b) => {
    switch (ordenacao) {
      case 'nota':
        return b.nota_media - a.nota_media;
      case 'avaliacoes':
        return b.total_avaliacoes - a.total_avaliacoes;
      case 'compras':
        return b.total_compras - a.total_compras;
      case 'valor':
        return b.valor_total_compras - a.valor_total_compras;
      case 'atraso':
        return a.atraso_medio_dias - b.atraso_medio_dias;
      default:
        return 0;
    }
  });

  const getNotaBadge = (nota: number) => {
    if (nota >= 4.5) {
      return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    } else if (nota >= 3.5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Bom</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Regular</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inativo: { color: 'bg-gray-100 text-gray-800', icon: Clock },
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

  const getAtrasoBadge = (atraso: number) => {
    if (atraso <= 2) {
      return <Badge className="bg-green-100 text-green-800">Pontual</Badge>;
    } else if (atraso <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Atraso Leve</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Atraso Alto</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
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
          <h2 className="text-2xl font-bold">Sugestão de Fornecedores</h2>
          <p className="text-muted-foreground">
            Fornecedores recomendados para {uf}
            {materialId && ' - Material específico'}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroNota} onValueChange={setFiltroNota}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por nota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Notas</SelectItem>
                <SelectItem value="alta">Alta (4.5+)</SelectItem>
                <SelectItem value="media">Média (3.5-4.4)</SelectItem>
                <SelectItem value="baixa">Baixa (<3.5)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ordenacao} onValueChange={setOrdenacao}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota">Nota Média</SelectItem>
                <SelectItem value="avaliacoes">Total de Avaliações</SelectItem>
                <SelectItem value="compras">Total de Compras</SelectItem>
                <SelectItem value="valor">Valor Total</SelectItem>
                <SelectItem value="atraso">Pontualidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Fornecedores</p>
                <p className="text-2xl font-bold">{filteredFornecedores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Nota Média</p>
                <p className="text-2xl font-bold">
                  {(filteredFornecedores.reduce((acc, f) => acc + f.nota_media, 0) / filteredFornecedores.length || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Compras</p>
                <p className="text-2xl font-bold">
                  {filteredFornecedores.reduce((acc, f) => acc + f.total_compras, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  R$ {filteredFornecedores.reduce((acc, f) => acc + f.valor_total_compras, 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{fornecedor.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {fornecedor.email_cotacao}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{fornecedor.cidade}/{fornecedor.uf}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="ml-1 font-medium">{fornecedor.nota_media}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ({fornecedor.total_avaliacoes})
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(fornecedor.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <strong>{fornecedor.total_compras}</strong> compras
                      </div>
                      <div className="text-sm text-muted-foreground">
                        R$ {fornecedor.valor_total_compras.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                      <div className="text-sm">
                        {getAtrasoBadge(fornecedor.atraso_medio_dias)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {fornecedor.especialidades.slice(0, 2).map((especialidade, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {especialidade}
                        </Badge>
                      ))}
                      {fornecedor.especialidades.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{fornecedor.especialidades.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => onFornecedorSelecionado(fornecedor)}
                      >
                        Selecionar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredFornecedores.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou buscar por outros termos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SugestaoFornecedores;
