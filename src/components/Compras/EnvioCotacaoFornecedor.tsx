import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Send, 
  Mail, 
  Link, 
  Copy, 
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  uf: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  nota_media: number;
  total_avaliacoes: number;
}

interface CotacaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  observacoes?: string;
}

interface EnvioCotacaoFornecedorProps {
  cotacaoId: string;
  itens: CotacaoItem[];
  onEnviar: (dados: any) => void;
  onCancel: () => void;
}

const EnvioCotacaoFornecedor: React.FC<EnvioCotacaoFornecedorProps> = ({
  cotacaoId,
  itens,
  onEnviar,
  onCancel
}) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<string[]>([]);
  const [metodoEnvio, setMetodoEnvio] = useState<'email' | 'link' | 'presencial'>('email');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data - substituir por chamadas à API
  useEffect(() => {
    const mockFornecedores: Fornecedor[] = [
      {
        id: '1',
        nome: 'Fornecedor ABC Ltda',
        email: 'cotacoes@abc.com.br',
        telefone: '(11) 99999-9999',
        uf: 'SP',
        cidade: 'São Paulo',
        status: 'ativo',
        nota_media: 4.5,
        total_avaliacoes: 15
      },
      {
        id: '2',
        nome: 'Fornecedor XYZ S/A',
        email: 'vendas@xyz.com.br',
        telefone: '(11) 88888-8888',
        uf: 'SP',
        cidade: 'São Paulo',
        status: 'ativo',
        nota_media: 4.2,
        total_avaliacoes: 8
      },
      {
        id: '3',
        nome: 'Fornecedor DEF Ltda',
        email: 'comercial@def.com.br',
        telefone: '(21) 77777-7777',
        uf: 'RJ',
        cidade: 'Rio de Janeiro',
        status: 'ativo',
        nota_media: 4.8,
        total_avaliacoes: 22
      }
    ];

    setFornecedores(mockFornecedores);
    
    // Preencher campos padrão
    setAssunto(`Cotação de Materiais - ${new Date().toLocaleDateString('pt-BR')}`);
    setMensagem(`Prezado(a) Fornecedor(a),

Solicitamos sua cotação para os materiais listados abaixo.

Por favor, envie sua proposta até a data de validade especificada.

Agradecemos sua atenção e aguardamos seu retorno.

Atenciosamente,
Equipe de Compras`);
    setDataValidade(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  }, []);

  const handleFornecedorSelect = (fornecedorId: string, checked: boolean) => {
    if (checked) {
      setFornecedoresSelecionados([...fornecedoresSelecionados, fornecedorId]);
    } else {
      setFornecedoresSelecionados(fornecedoresSelecionados.filter(id => id !== fornecedorId));
    }
  };

  const handleSelecionarTodos = (checked: boolean) => {
    if (checked) {
      setFornecedoresSelecionados(fornecedores.filter(f => f.status === 'ativo').map(f => f.id));
    } else {
      setFornecedoresSelecionados([]);
    }
  };

  const gerarLinkCotacao = () => {
    const link = `https://cotacao.sistema.com.br/${cotacaoId}?token=${Math.random().toString(36).substr(2, 9)}`;
    setLinkGerado(link);
    return link;
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(linkGerado);
  };

  const calcularValorTotal = () => {
    return itens.reduce((total, item) => total + (item.quantidade * item.valor_unitario_estimado), 0);
  };

  const handleEnviar = async () => {
    setLoading(true);
    
    try {
      const dadosEnvio = {
        cotacaoId,
        fornecedores: fornecedoresSelecionados,
        metodoEnvio,
        assunto,
        mensagem,
        dataValidade,
        observacoes,
        link: linkGerado || (metodoEnvio === 'link' ? gerarLinkCotacao() : null)
      };

      await onEnviar(dadosEnvio);
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enviar Cotação para Fornecedores</h2>
          <p className="text-muted-foreground">
            Selecione os fornecedores e configure o envio da cotação
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Resumo da Cotação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumo da Cotação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="font-medium">{itens.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
                <p className="font-medium">
                  R$ {calcularValorTotal().toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2 
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selecionar Fornecedores</span>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selecionar-todos"
                checked={fornecedoresSelecionados.length === fornecedores.filter(f => f.status === 'ativo').length}
                onCheckedChange={handleSelecionarTodos}
              />
              <Label htmlFor="selecionar-todos">Selecionar Todos</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fornecedores.map((fornecedor) => (
              <div key={fornecedor.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Checkbox
                  id={fornecedor.id}
                  checked={fornecedoresSelecionados.includes(fornecedor.id)}
                  onCheckedChange={(checked) => handleFornecedorSelect(fornecedor.id, checked as boolean)}
                  disabled={fornecedor.status !== 'ativo'}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{fornecedor.nome}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {fornecedor.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {fornecedor.cidade}/{fornecedor.uf}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(fornecedor.status)}
                        <div className="text-sm">
                          <div className="font-medium">Nota: {fornecedor.nota_media}/5</div>
                          <div className="text-muted-foreground">
                            {fornecedor.total_avaliacoes} avaliações
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Envio */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Envio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metodo-envio">Método de Envio</Label>
                <Select value={metodoEnvio} onValueChange={(value: any) => setMetodoEnvio(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        E-mail
                      </div>
                    </SelectItem>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Link Externo
                      </div>
                    </SelectItem>
                    <SelectItem value="presencial">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Presencial
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data-validade">Data de Validade</Label>
                <Input
                  id="data-validade"
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                />
              </div>
            </div>

            {metodoEnvio === 'email' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assunto">Assunto do E-mail</Label>
                  <Input
                    id="assunto"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Assunto do e-mail"
                  />
                </div>
                <div>
                  <Label htmlFor="mensagem">Mensagem</Label>
                  <Textarea
                    id="mensagem"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Mensagem para os fornecedores"
                    rows={6}
                  />
                </div>
              </div>
            )}

            {metodoEnvio === 'link' && (
              <div className="space-y-4">
                <div>
                  <Label>Link da Cotação</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={linkGerado || gerarLinkCotacao()}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={copiarLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compartilhe este link com os fornecedores selecionados
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="observacoes">Observações Adicionais</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais para a cotação"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens da Cotação</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
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
                  <TableCell>{item.observacoes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {fornecedoresSelecionados.length} fornecedor(es) selecionado(s)
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEnviar} 
            disabled={fornecedoresSelecionados.length === 0 || loading}
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Cotação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnvioCotacaoFornecedor;
