import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Package, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CentroCusto {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
}

interface Projeto {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
}

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  material_codigo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  valor_total_estimado: number;
  especificacao_tecnica?: string;
  observacoes?: string;
  status: string;
}

interface RequisicaoCompra {
  id: string;
  numero_requisicao: string;
  data_solicitacao: string;
  data_necessidade: string;
  status: string;
  prioridade: string;
  valor_total_estimado: number;
  solicitante_nome: string;
  centro_custo_nome: string;
  projeto_nome?: string;
  observacoes?: string;
  itens: RequisicaoItem[];
}

interface DuplicarRequisicaoProps {
  requisicao: RequisicaoCompra;
  onDuplicar: (novaRequisicao: Partial<RequisicaoCompra>) => void;
}

const DuplicarRequisicao: React.FC<DuplicarRequisicaoProps> = ({
  requisicao,
  onDuplicar
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    data_necessidade: '',
    prioridade: requisicao.prioridade,
    centro_custo_id: '',
    projeto_id: '',
    observacoes: `Duplicada de ${requisicao.numero_requisicao}`,
    justificativa: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar centros de custo
      // const responseCentros = await fetch('/api/cost-centers');
      // const centros = await responseCentros.json();
      
      // Dados mock para demonstração
      const mockCentros: CentroCusto[] = [
        { id: '1', nome: 'Manutenção', codigo: 'MAN', descricao: 'Centro de custo de manutenção' },
        { id: '2', nome: 'Produção', codigo: 'PROD', descricao: 'Centro de custo de produção' },
        { id: '3', nome: 'Administrativo', codigo: 'ADM', descricao: 'Centro de custo administrativo' },
        { id: '4', nome: 'Qualidade', codigo: 'QUAL', descricao: 'Centro de custo de qualidade' },
        { id: '5', nome: 'Logística', codigo: 'LOG', descricao: 'Centro de custo de logística' }
      ];

      // Carregar projetos
      // const responseProjetos = await fetch('/api/projects');
      // const projetos = await responseProjetos.json();
      
      const mockProjetos: Projeto[] = [
        { id: '1', nome: 'Projeto Alpha', codigo: 'ALPHA', descricao: 'Projeto de expansão' },
        { id: '2', nome: 'Projeto Beta', codigo: 'BETA', descricao: 'Projeto de modernização' },
        { id: '3', nome: 'Projeto Gamma', codigo: 'GAMMA', descricao: 'Projeto de otimização' }
      ];

      setCentrosCusto(mockCentros);
      setProjetos(mockProjetos);
      
      // Selecionar todos os itens por padrão
      setItensSelecionados(requisicao.itens.map(item => item.id));
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarItem = (itemId: string, selecionado: boolean) => {
    if (selecionado) {
      setItensSelecionados([...itensSelecionados, itemId]);
    } else {
      setItensSelecionados(itensSelecionados.filter(id => id !== itemId));
    }
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setItensSelecionados(requisicao.itens.map(item => item.id));
    } else {
      setItensSelecionados([]);
    }
  };

  const handleDuplicar = async () => {
    if (itensSelecionados.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos um item para duplicar',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.centro_custo_id) {
      toast({
        title: 'Aviso',
        description: 'Selecione um centro de custo',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const itensDuplicados = requisicao.itens.filter(item => 
        itensSelecionados.includes(item.id)
      );

      const valorTotalDuplicado = itensDuplicados.reduce(
        (total, item) => total + item.valor_total_estimado, 
        0
      );

      const novaRequisicao = {
        data_necessidade: formData.data_necessidade,
        prioridade: formData.prioridade,
        centro_custo_id: formData.centro_custo_id,
        projeto_id: formData.projeto_id || null,
        observacoes: formData.observacoes,
        justificativa: formData.justificativa,
        itens: itensDuplicados.map(item => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Novo ID
          status: 'pendente'
        })),
        valor_total_estimado: valorTotalDuplicado,
        status: 'rascunho'
      };

      onDuplicar(novaRequisicao);
      
      toast({
        title: 'Sucesso',
        description: `Requisição duplicada com ${itensDuplicados.length} item(ns)`,
      });

      setOpen(false);
      
      // Resetar formulário
      setFormData({
        data_necessidade: '',
        prioridade: requisicao.prioridade,
        centro_custo_id: '',
        projeto_id: '',
        observacoes: `Duplicada de ${requisicao.numero_requisicao}`,
        justificativa: ''
      });
      setItensSelecionados(requisicao.itens.map(item => item.id));

    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao duplicar requisição',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const itensSelecionadosData = requisicao.itens.filter(item => 
    itensSelecionados.includes(item.id)
  );

  const valorTotalSelecionado = itensSelecionadosData.reduce(
    (total, item) => total + item.valor_total_estimado, 
    0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Copy className="h-5 w-5" />
            <span>Duplicar Requisição {requisicao.numero_requisicao}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações da Requisição Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requisição Original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Número:</span> {requisicao.numero_requisicao}
                </div>
                <div>
                  <span className="font-medium">Solicitante:</span> {requisicao.solicitante_nome}
                </div>
                <div>
                  <span className="font-medium">Centro de Custo:</span> {requisicao.centro_custo_nome}
                </div>
                <div>
                  <span className="font-medium">Valor Total:</span> R$ {requisicao.valor_total_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div>
                  <span className="font-medium">Prioridade:</span> {requisicao.prioridade}
                </div>
                <div>
                  <span className="font-medium">Itens:</span> {requisicao.itens.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário da Nova Requisição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova Requisição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_necessidade">Data Necessidade</Label>
                  <Input
                    id="data_necessidade"
                    type="date"
                    value={formData.data_necessidade}
                    onChange={(e) => setFormData({...formData, data_necessidade: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(value) => setFormData({...formData, prioridade: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="centro_custo">Centro de Custo *</Label>
                  <Select value={formData.centro_custo_id} onValueChange={(value) => setFormData({...formData, centro_custo_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosCusto.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id}>
                          {centro.nome} ({centro.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="projeto">Projeto</Label>
                  <Select value={formData.projeto_id} onValueChange={(value) => setFormData({...formData, projeto_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projetos.map((projeto) => (
                        <SelectItem key={projeto.id} value={projeto.id}>
                          {projeto.nome} ({projeto.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="justificativa">Justificativa</Label>
                <Textarea
                  id="justificativa"
                  value={formData.justificativa}
                  onChange={(e) => setFormData({...formData, justificativa: e.target.value})}
                  placeholder="Justificativa para a duplicação..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Selecionar Itens para Duplicar</span>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selecionar-todos"
                    checked={itensSelecionados.length === requisicao.itens.length}
                    onCheckedChange={handleSelecionarTodos}
                  />
                  <Label htmlFor="selecionar-todos">Selecionar Todos</Label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requisicao.itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={itensSelecionados.includes(item.id)}
                      onCheckedChange={(checked) => handleSelecionarItem(item.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.material_nome}</div>
                          <div className="text-sm text-gray-500">
                            {item.material_codigo} | {item.quantidade} {item.unidade_medida}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            R$ {item.valor_total_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-gray-500">
                            R$ {item.valor_unitario_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {item.unidade_medida}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Resumo da Duplicação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {itensSelecionados.length}
                  </div>
                  <div className="text-sm text-gray-500">Itens Selecionados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {valorTotalSelecionado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-500">Valor Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {centrosCusto.find(c => c.id === formData.centro_custo_id)?.nome || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Centro de Custo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDuplicar}
              disabled={loading || itensSelecionados.length === 0 || !formData.centro_custo_id}
            >
              {loading ? 'Duplicando...' : 'Duplicar Requisição'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicarRequisicao;
