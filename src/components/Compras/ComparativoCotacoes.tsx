import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  BarChart3, 
  Download, 
  Award, 
  Clock, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface CotacaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega: number;
  observacoes?: string;
}

interface Cotacao {
  id: string;
  numero: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  data_cotacao: string;
  data_validade: string;
  status: string;
  valor_total: number;
  observacoes?: string;
  itens: CotacaoItem[];
}

interface ComparativoCotacoesProps {
  cotacoes: Cotacao[];
  onClose: () => void;
}

const ComparativoCotacoes: React.FC<ComparativoCotacoesProps> = ({
  cotacoes,
  onClose
}) => {
  const [cotacoesSelecionadas, setCotacoesSelecionadas] = useState<string[]>([]);
  const [melhorCotacao, setMelhorCotacao] = useState<string | null>(null);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockCotacoes: Cotacao[] = [
      {
        id: '1',
        numero: 'COT-2024-001',
        fornecedor_id: '1',
        fornecedor_nome: 'Fornecedor ABC Ltda',
        data_cotacao: '2024-01-15',
        data_validade: '2024-01-22',
        status: 'recebida',
        valor_total: 15000.00,
        observacoes: 'Cotação para materiais elétricos',
        itens: [
          {
            id: '1',
            material_id: '1',
            material_nome: 'Cabo de Cobre 2,5mm²',
            quantidade: 100,
            unidade_medida: 'metro',
            valor_unitario: 15.50,
            valor_total: 1550.00,
            prazo_entrega: 7,
            observacoes: 'Cabo nacional'
          },
          {
            id: '2',
            material_id: '2',
            material_nome: 'Disjuntor 20A',
            quantidade: 20,
            unidade_medida: 'unidade',
            valor_unitario: 45.00,
            valor_total: 900.00,
            prazo_entrega: 5,
            observacoes: 'Disjuntor bipolar'
          }
        ]
      },
      {
        id: '2',
        numero: 'COT-2024-002',
        fornecedor_id: '2',
        fornecedor_nome: 'Fornecedor XYZ S/A',
        data_cotacao: '2024-01-15',
        data_validade: '2024-01-22',
        status: 'recebida',
        valor_total: 14200.00,
        observacoes: 'Cotação para materiais elétricos',
        itens: [
          {
            id: '1',
            material_id: '1',
            material_nome: 'Cabo de Cobre 2,5mm²',
            quantidade: 100,
            unidade_medida: 'metro',
            valor_unitario: 14.80,
            valor_total: 1480.00,
            prazo_entrega: 10,
            observacoes: 'Cabo importado'
          },
          {
            id: '2',
            material_id: '2',
            material_nome: 'Disjuntor 20A',
            quantidade: 20,
            unidade_medida: 'unidade',
            valor_unitario: 42.00,
            valor_total: 840.00,
            prazo_entrega: 7,
            observacoes: 'Disjuntor monopolar'
          }
        ]
      }
    ];

    // Simular dados das cotações
    setCotacoesSelecionadas(['1', '2']);
  }, []);

  const cotacoesFiltradas = cotacoes.filter(c => cotacoesSelecionadas.includes(c.id));

  const calcularMelhorCotacao = () => {
    if (cotacoesFiltradas.length === 0) return null;

    // Critérios de avaliação: menor preço, menor prazo, melhor qualidade
    const cotacoesComPontuacao = cotacoesFiltradas.map(cotacao => {
      let pontuacao = 0;
      
      // Pontuação por preço (menor preço = maior pontuação)
      const menorPreco = Math.min(...cotacoesFiltradas.map(c => c.valor_total));
      pontuacao += (menorPreco / cotacao.valor_total) * 40;
      
      // Pontuação por prazo (menor prazo = maior pontuação)
      const prazoMedio = cotacao.itens.reduce((acc, item) => acc + item.prazo_entrega, 0) / cotacao.itens.length;
      const menorPrazo = Math.min(...cotacoesFiltradas.map(c => 
        c.itens.reduce((acc, item) => acc + item.prazo_entrega, 0) / c.itens.length
      ));
      pontuacao += (menorPrazo / prazoMedio) * 30;
      
      // Pontuação por status (recebida = maior pontuação)
      if (cotacao.status === 'recebida') pontuacao += 20;
      else if (cotacao.status === 'enviada') pontuacao += 10;
      
      // Pontuação por completude (todos os itens cotados)
      const itensCompletos = cotacao.itens.length;
      pontuacao += (itensCompletos / 10) * 10; // Assumindo 10 itens como referência
      
      return { ...cotacao, pontuacao };
    });

    return cotacoesComPontuacao.reduce((melhor, atual) => 
      atual.pontuacao > melhor.pontuacao ? atual : melhor
    );
  };

  const melhorCotacaoCalculada = calcularMelhorCotacao();

  const handleCotacaoSelect = (cotacaoId: string, checked: boolean) => {
    if (checked) {
      setCotacoesSelecionadas([...cotacoesSelecionadas, cotacaoId]);
    } else {
      setCotacoesSelecionadas(cotacoesSelecionadas.filter(id => id !== cotacaoId));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      enviada: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      recebida: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      aprovada: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejeitada: { color: 'bg-red-100 text-red-800', icon: XCircle },
      vencida: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
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

  const calcularEconomia = () => {
    if (cotacoesFiltradas.length < 2) return 0;
    
    const valores = cotacoesFiltradas.map(c => c.valor_total);
    const maiorValor = Math.max(...valores);
    const menorValor = Math.min(...valores);
    
    return maiorValor - menorValor;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Comparativo de Cotações</h2>
          <p className="text-muted-foreground">
            Compare cotações e identifique a melhor proposta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Seleção de Cotações */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Cotações para Comparação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cotacoes.map((cotacao) => (
              <div key={cotacao.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Checkbox
                  id={cotacao.id}
                  checked={cotacoesSelecionadas.includes(cotacao.id)}
                  onCheckedChange={(checked) => handleCotacaoSelect(cotacao.id, checked as boolean)}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{cotacao.numero}</h3>
                      <p className="text-sm text-muted-foreground">{cotacao.fornecedor_nome}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        R$ {cotacao.valor_total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </div>
                      {getStatusBadge(cotacao.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo da Comparação */}
      {cotacoesFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Cotações Selecionadas</p>
                  <p className="text-2xl font-bold">{cotacoesFiltradas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Economia Potencial</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {calcularEconomia().toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Prazo Médio</p>
                  <p className="text-2xl font-bold">
                    {Math.round(cotacoesFiltradas.reduce((acc, c) => 
                      acc + c.itens.reduce((a, i) => a + i.prazo_entrega, 0) / c.itens.length, 0
                    ) / cotacoesFiltradas.length)} dias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Melhor Proposta</p>
                  <p className="text-sm font-medium">
                    {melhorCotacaoCalculada?.numero || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela Comparativa */}
      {cotacoesFiltradas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tabela Comparativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    {cotacoesFiltradas.map((cotacao) => (
                      <TableHead key={cotacao.id} className="text-center">
                        <div>
                          <div className="font-medium">{cotacao.numero}</div>
                          <div className="text-sm text-muted-foreground">{cotacao.fornecedor_nome}</div>
                          {melhorCotacaoCalculada?.id === cotacao.id && (
                            <Badge className="bg-green-100 text-green-800 mt-1">
                              <Award className="w-3 h-3 mr-1" />
                              MELHOR
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Assumindo que todas as cotações têm os mesmos itens para comparação */}
                  {cotacoesFiltradas[0]?.itens.map((item, index) => (
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
                      {cotacoesFiltradas.map((cotacao) => {
                        const cotacaoItem = cotacao.itens[index];
                        const isMelhor = melhorCotacaoCalculada?.id === cotacao.id;
                        return (
                          <TableCell key={cotacao.id} className={`text-center ${isMelhor ? 'bg-green-50' : ''}`}>
                            <div className="space-y-1">
                              <div className="font-medium">
                                R$ {cotacaoItem?.valor_unitario.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2 
                                }) || 'N/A'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Total: R$ {cotacaoItem?.valor_total.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2 
                                }) || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Prazo: {cotacaoItem?.prazo_entrega || 'N/A'} dias
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendação */}
      {melhorCotacaoCalculada && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Award className="w-5 h-5" />
              Recomendação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-green-800">
                <strong>Melhor proposta:</strong> {melhorCotacaoCalculada.numero} - {melhorCotacaoCalculada.fornecedor_nome}
              </p>
              <p className="text-green-700">
                <strong>Valor total:</strong> R$ {melhorCotacaoCalculada.valor_total.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </p>
              <p className="text-green-700">
                <strong>Economia:</strong> R$ {calcularEconomia().toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })} em relação à proposta mais cara
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar Cotação
              </Button>
              <Button variant="outline">
                Gerar Pedido de Compra
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparativoCotacoes;
