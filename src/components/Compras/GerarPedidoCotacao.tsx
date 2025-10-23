import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  FileText, 
  Package, 
  DollarSign, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Edit,
  Trash2
} from 'lucide-react';

interface CotacaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega: number;
  observacoes?: string;
  selecionado: boolean;
  quantidade_pedido: number;
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

interface GerarPedidoCotacaoProps {
  cotacao: Cotacao;
  onGerarPedido: (dados: any) => void;
  onCancel: () => void;
}

const GerarPedidoCotacao: React.FC<GerarPedidoCotacaoProps> = ({
  cotacao,
  onGerarPedido,
  onCancel
}) => {
  const [itens, setItens] = useState<CotacaoItem[]>([]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [prazoPagamento, setPrazoPagamento] = useState<number>(30);
  const [observacoes, setObservacoes] = useState('');
  const [desconto, setDesconto] = useState<number>(0);
  const [frete, setFrete] = useState<number>(0);

  useEffect(() => {
    // Inicializar itens com seleção padrão
    const itensInicializados = cotacao.itens.map(item => ({
      ...item,
      selecionado: true,
      quantidade_pedido: item.quantidade
    }));
    setItens(itensInicializados);
    
    // Definir data de entrega padrão (7 dias a partir de hoje)
    const dataPadrao = new Date();
    dataPadrao.setDate(dataPadrao.getDate() + 7);
    setDataEntrega(dataPadrao.toISOString().split('T')[0]);
  }, [cotacao]);

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setItens(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, selecionado: selected }
        : item
    ));
  };

  const handleQuantidadeChange = (itemId: string, quantidade: number) => {
    setItens(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            quantidade_pedido: Math.max(0, quantidade),
            valor_total: Math.max(0, quantidade) * item.valor_unitario
          }
        : item
    ));
  };

  const handleSelecionarTodos = (selected: boolean) => {
    setItens(prev => prev.map(item => ({ ...item, selecionado: selected })));
  };

  const itensSelecionados = itens.filter(item => item.selecionado);
  const valorSubtotal = itensSelecionados.reduce((acc, item) => acc + item.valor_total, 0);
  const valorDesconto = (valorSubtotal * desconto) / 100;
  const valorFrete = frete;
  const valorTotal = valorSubtotal - valorDesconto + valorFrete;

  const handleGerarPedido = () => {
    const dadosPedido = {
      cotacao_id: cotacao.id,
      fornecedor_id: cotacao.fornecedor_id,
      data_entrega_prevista: dataEntrega,
      metodo_pagamento: metodoPagamento,
      prazo_pagamento: prazoPagamento,
      observacoes,
      desconto,
      frete,
      valor_total: valorTotal,
      itens: itensSelecionados.map(item => ({
        cotacao_item_id: item.id,
        material_id: item.material_id,
        quantidade: item.quantidade_pedido,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        prazo_entrega: item.prazo_entrega,
        observacoes: item.observacoes
      }))
    };

    onGerarPedido(dadosPedido);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      enviada: { color: 'bg-blue-100 text-blue-800', icon: FileText },
      recebida: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      aprovada: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejeitada: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      vencida: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerar Pedido de Compra</h2>
          <p className="text-muted-foreground">
            A partir da cotação {cotacao.numero} - {cotacao.fornecedor_nome}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Informações da Cotação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informações da Cotação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Número da Cotação</Label>
              <p className="font-medium">{cotacao.numero}</p>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <p className="font-medium">{cotacao.fornecedor_nome}</p>
            </div>
            <div>
              <Label>Data de Validade</Label>
              <p className="font-medium">
                {new Date(cotacao.data_validade).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <Label>Status</Label>
              <div>{getStatusBadge(cotacao.status)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dataEntrega">Data de Entrega Prevista</Label>
              <Input
                id="dataEntrega"
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="metodoPagamento">Método de Pagamento</Label>
              <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prazoPagamento">Prazo de Pagamento (dias)</Label>
              <Input
                id="prazoPagamento"
                type="number"
                min="0"
                value={prazoPagamento}
                onChange={(e) => setPrazoPagamento(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o pedido..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Itens da Cotação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Itens da Cotação
            </span>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selecionar-todos"
                checked={itens.every(item => item.selecionado)}
                onCheckedChange={handleSelecionarTodos}
              />
              <Label htmlFor="selecionar-todos">Selecionar Todos</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sel.</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade Cotada</TableHead>
                <TableHead>Quantidade Pedido</TableHead>
                <TableHead>Valor Unitário</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Prazo (dias)</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={item.selecionado}
                      onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                    />
                  </TableCell>
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
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantidadeChange(item.id, item.quantidade_pedido - 1)}
                        disabled={item.quantidade_pedido <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantidade}
                        value={item.quantidade_pedido}
                        onChange={(e) => handleQuantidadeChange(item.id, Number(e.target.value))}
                        className="w-20 text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantidadeChange(item.id, item.quantidade_pedido + 1)}
                        disabled={item.quantidade_pedido >= item.quantidade}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    R$ {item.valor_unitario.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      R$ {item.valor_total.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2 
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{item.prazo_entrega}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="desconto">Desconto (%)</Label>
                <Input
                  id="desconto"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="frete">Frete (R$)</Label>
                <Input
                  id="frete"
                  type="number"
                  min="0"
                  step="0.01"
                  value={frete}
                  onChange={(e) => setFrete(Number(e.target.value))}
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {valorSubtotal.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2 
                  })}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto ({desconto}%):</span>
                    <span>-R$ {valorDesconto.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}</span>
                  </div>
                )}
                {frete > 0 && (
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>R$ {frete.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>R$ {valorTotal.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2 
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {itensSelecionados.length} item(ns) selecionado(s) de {itens.length} total
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGerarPedido}
            disabled={itensSelecionados.length === 0 || !metodoPagamento}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Gerar Pedido de Compra
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GerarPedidoCotacao;
