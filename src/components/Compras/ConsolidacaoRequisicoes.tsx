import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { 
  Search, 
  Package, 
  Users, 
  Building, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';

interface RequisicaoItem {
  id: string;
  requisicao_id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  observacoes?: string;
  centro_custo: string;
  solicitante: string;
  data_solicitacao: string;
  status: string;
}

interface MaterialConsolidado {
  material_id: string;
  material_nome: string;
  material_codigo: string;
  unidade_medida: string;
  quantidade_total: number;
  valor_unitario_estimado: number;
  valor_total_estimado: number;
  itens_originais: RequisicaoItem[];
  observacoes_consolidadas: string[];
}

interface ConsolidacaoRequisicoesProps {
  onConsolidar: (materiais: MaterialConsolidado[]) => void;
  onCancel: () => void;
}

const ConsolidacaoRequisicoes: React.FC<ConsolidacaoRequisicoesProps> = ({
  onConsolidar,
  onCancel
}) => {
  const [requisicoes, setRequisicoes] = useState<any[]>([]);
  const [itensRequisicao, setItensRequisicao] = useState<RequisicaoItem[]>([]);
  const [materiaisConsolidados, setMateriaisConsolidados] = useState<MaterialConsolidado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCentroCusto, setFiltroCentroCusto] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockItens: RequisicaoItem[] = [
      {
        id: '1',
        requisicao_id: 'REQ-2024-001',
        material_id: 'MAT-001',
        material_nome: 'Cabo de Cobre 2,5mm²',
        material_codigo: 'CAB-001',
        quantidade: 30,
        unidade_medida: 'metro',
        valor_unitario_estimado: 15.50,
        observacoes: 'Para instalação elétrica',
        centro_custo: 'Manutenção',
        solicitante: 'João Silva',
        data_solicitacao: '2024-01-15',
        status: 'pendente'
      },
      {
        id: '2',
        requisicao_id: 'REQ-2024-002',
        material_id: 'MAT-001',
        material_nome: 'Cabo de Cobre 2,5mm²',
        material_codigo: 'CAB-001',
        quantidade: 20,
        unidade_medida: 'metro',
        valor_unitario_estimado: 15.50,
        observacoes: 'Para projeto de expansão',
        centro_custo: 'Implantação',
        solicitante: 'Maria Santos',
        data_solicitacao: '2024-01-16',
        status: 'pendente'
      },
      {
        id: '3',
        requisicao_id: 'REQ-2024-001',
        material_id: 'MAT-002',
        material_nome: 'Disjuntor 20A',
        material_codigo: 'DIS-001',
        quantidade: 10,
        unidade_medida: 'unidade',
        valor_unitario_estimado: 45.00,
        observacoes: 'Disjuntores para quadro principal',
        centro_custo: 'Manutenção',
        solicitante: 'João Silva',
        data_solicitacao: '2024-01-15',
        status: 'pendente'
      },
      {
        id: '4',
        requisicao_id: 'REQ-2024-003',
        material_id: 'MAT-002',
        material_nome: 'Disjuntor 20A',
        material_codigo: 'DIS-001',
        quantidade: 15,
        unidade_medida: 'unidade',
        valor_unitario_estimado: 45.00,
        observacoes: 'Disjuntores para nova instalação',
        centro_custo: 'Projetos',
        solicitante: 'Pedro Costa',
        data_solicitacao: '2024-01-17',
        status: 'pendente'
      }
    ];

    setItensRequisicao(mockItens);
    setLoading(false);
  }, []);

  // Consolidar materiais automaticamente
  useEffect(() => {
    const consolidados = consolidarMateriais(itensRequisicao);
    setMateriaisConsolidados(consolidados);
  }, [itensRequisicao]);

  const consolidarMateriais = (itens: RequisicaoItem[]): MaterialConsolidado[] => {
    const consolidadosMap = new Map<string, MaterialConsolidado>();

    itens.forEach(item => {
      const key = item.material_id;
      
      if (consolidadosMap.has(key)) {
        const consolidado = consolidadosMap.get(key)!;
        consolidado.quantidade_total += item.quantidade;
        consolidado.valor_total_estimado += item.quantidade * item.valor_unitario_estimado;
        consolidado.itens_originais.push(item);
        if (item.observacoes) {
          consolidado.observacoes_consolidadas.push(`${item.centro_custo}: ${item.observacoes}`);
        }
      } else {
        consolidadosMap.set(key, {
          material_id: item.material_id,
          material_nome: item.material_nome,
          material_codigo: item.material_codigo,
          unidade_medida: item.unidade_medida,
          quantidade_total: item.quantidade,
          valor_unitario_estimado: item.valor_unitario_estimado,
          valor_total_estimado: item.quantidade * item.valor_unitario_estimado,
          itens_originais: [item],
          observacoes_consolidadas: item.observacoes ? [`${item.centro_custo}: ${item.observacoes}`] : []
        });
      }
    });

    return Array.from(consolidadosMap.values());
  };

  const filteredItens = itensRequisicao.filter(item => {
    const matchesSearch = item.material_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.material_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.centro_custo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCentroCusto = filtroCentroCusto === 'todos' || item.centro_custo === filtroCentroCusto;
    const matchesStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    
    return matchesSearch && matchesCentroCusto && matchesStatus;
  });

  const handleConsolidar = () => {
    onConsolidar(materiaisConsolidados);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      aprovada: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejeitada: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      em_cotacao: { color: 'bg-blue-100 text-blue-800', icon: FileText }
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

  const centrosCusto = [...new Set(itensRequisicao.map(item => item.centro_custo))];
  const statusDisponiveis = [...new Set(itensRequisicao.map(item => item.status))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Carregando requisições...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Consolidação de Requisições</h2>
          <p className="text-muted-foreground">
            Consolide requisições com materiais similares para otimizar compras
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConsolidar}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Consolidar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por material, centro de custo ou solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroCentroCusto} onValueChange={setFiltroCentroCusto}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por centro de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Centros</SelectItem>
                {centrosCusto.map(centro => (
                  <SelectItem key={centro} value={centro}>{centro}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {statusDisponiveis.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
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
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{filteredItens.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Materiais Únicos</p>
                <p className="text-2xl font-bold">{materiaisConsolidados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Centros de Custo</p>
                <p className="text-2xl font-bold">{centrosCusto.length}</p>
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
                  R$ {materiaisConsolidados.reduce((acc, m) => acc + m.valor_total_estimado, 0).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materiais Consolidados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materiais Consolidados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade Total</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valor Unitário</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiaisConsolidados.map((material) => (
                <TableRow key={material.material_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{material.material_nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {material.material_codigo}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-lg">
                      {material.quantidade_total}
                    </div>
                  </TableCell>
                  <TableCell>{material.unidade_medida}</TableCell>
                  <TableCell>
                    R$ {material.valor_unitario_estimado.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      R$ {material.valor_total_estimado.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2 
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {material.itens_originais.map((item, index) => (
                        <div key={index} className="text-sm">
                          <Badge variant="outline" className="text-xs">
                            {item.centro_custo}
                          </Badge>
                          <span className="ml-2 text-muted-foreground">
                            {item.quantidade} {item.unidade_medida}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {material.observacoes_consolidadas.map((obs, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {obs}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Itens Originais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Itens Originais das Requisições
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisição</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.requisicao_id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.material_nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.material_codigo}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.quantidade} {item.unidade_medida}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.centro_custo}</Badge>
                  </TableCell>
                  <TableCell>{item.solicitante}</TableCell>
                  <TableCell>
                    {new Date(item.data_solicitacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsolidacaoRequisicoes;
