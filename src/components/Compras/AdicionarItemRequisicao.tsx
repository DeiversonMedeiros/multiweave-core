import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  unidade_medida: string;
  tipo: string;
  valor_unitario_estimado?: number;
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

interface AdicionarItemRequisicaoProps {
  onAdicionarItem: (item: RequisicaoItem) => void;
  itensExistentes: RequisicaoItem[];
}

const AdicionarItemRequisicao: React.FC<AdicionarItemRequisicaoProps> = ({
  onAdicionarItem,
  itensExistentes
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null);
  const [buscaMaterial, setBuscaMaterial] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    quantidade: 1,
    valor_unitario_estimado: 0,
    especificacao_tecnica: '',
    observacoes: ''
  });

  // Carregar materiais
  useEffect(() => {
    carregarMateriais();
  }, [buscaMaterial]);

  const carregarMateriais = async () => {
    try {
      setLoading(true);
      // Aqui seria a chamada para a API
      // const response = await fetch(`/api/materials?search=${buscaMaterial}`);
      // const data = await response.json();
      
      // Dados mock para demonstração
      const mockMateriais: Material[] = [
        {
          id: '1',
          codigo: 'MAT001',
          nome: 'Parafuso M8x20',
          descricao: 'Parafuso métrico M8 com 20mm de comprimento',
          unidade_medida: 'UN',
          tipo: 'produto',
          valor_unitario_estimado: 0.50
        },
        {
          id: '2',
          codigo: 'MAT002',
          nome: 'Chapa de Aço 3mm',
          descricao: 'Chapa de aço carbono 3mm de espessura',
          unidade_medida: 'M²',
          tipo: 'produto',
          valor_unitario_estimado: 45.00
        },
        {
          id: '3',
          codigo: 'MAT003',
          nome: 'Tubo PVC 100mm',
          descricao: 'Tubo de PVC rígido 100mm de diâmetro',
          unidade_medida: 'M',
          tipo: 'produto',
          valor_unitario_estimado: 25.00
        },
        {
          id: '4',
          codigo: 'SER001',
          nome: 'Serviço de Solda',
          descricao: 'Serviço de solda MIG/MAG',
          unidade_medida: 'H',
          tipo: 'servico',
          valor_unitario_estimado: 80.00
        }
      ];

      const materiaisFiltrados = mockMateriais.filter(material =>
        material.nome.toLowerCase().includes(buscaMaterial.toLowerCase()) ||
        material.codigo.toLowerCase().includes(buscaMaterial.toLowerCase())
      );

      setMateriais(materiaisFiltrados);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar materiais',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarMaterial = (material: Material) => {
    setMaterialSelecionado(material);
    setFormData({
      ...formData,
      valor_unitario_estimado: material.valor_unitario_estimado || 0
    });
  };

  const handleQuantidadeChange = (quantidade: number) => {
    const valorTotal = quantidade * formData.valor_unitario_estimado;
    setFormData({
      ...formData,
      quantidade,
      valor_total_estimado: valorTotal
    });
  };

  const handleValorUnitarioChange = (valor: number) => {
    const valorTotal = formData.quantidade * valor;
    setFormData({
      ...formData,
      valor_unitario_estimado: valor,
      valor_total_estimado: valorTotal
    });
  };

  const handleAdicionarItem = () => {
    if (!materialSelecionado) {
      toast({
        title: 'Erro',
        description: 'Selecione um material',
        variant: 'destructive'
      });
      return;
    }

    if (formData.quantidade <= 0) {
      toast({
        title: 'Erro',
        description: 'Quantidade deve ser maior que zero',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se o material já foi adicionado
    const materialJaAdicionado = itensExistentes.some(
      item => item.material_id === materialSelecionado.id
    );

    if (materialJaAdicionado) {
      toast({
        title: 'Aviso',
        description: 'Este material já foi adicionado à requisição',
        variant: 'destructive'
      });
      return;
    }

    const novoItem: RequisicaoItem = {
      id: Date.now().toString(),
      material_id: materialSelecionado.id,
      material_nome: materialSelecionado.nome,
      material_codigo: materialSelecionado.codigo,
      quantidade: formData.quantidade,
      unidade_medida: materialSelecionado.unidade_medida,
      valor_unitario_estimado: formData.valor_unitario_estimado,
      valor_total_estimado: formData.quantidade * formData.valor_unitario_estimado,
      especificacao_tecnica: formData.especificacao_tecnica,
      observacoes: formData.observacoes,
      status: 'pendente'
    };

    onAdicionarItem(novoItem);
    
    // Resetar formulário
    setMaterialSelecionado(null);
    setFormData({
      quantidade: 1,
      valor_unitario_estimado: 0,
      especificacao_tecnica: '',
      observacoes: ''
    });
    setBuscaMaterial('');
    setOpen(false);

    toast({
      title: 'Sucesso',
      description: 'Item adicionado à requisição',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Item à Requisição</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Busca de Material */}
          <div>
            <Label htmlFor="busca-material">Buscar Material</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="busca-material"
                placeholder="Digite o nome ou código do material..."
                value={buscaMaterial}
                onChange={(e) => setBuscaMaterial(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Materiais */}
          {buscaMaterial && (
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {loading ? (
                <div className="p-4 text-center">Carregando...</div>
              ) : materiais.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhum material encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {materiais.map((material) => (
                    <div
                      key={material.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        materialSelecionado?.id === material.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleSelecionarMaterial(material)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{material.nome}</div>
                          <div className="text-sm text-gray-500">
                            Código: {material.codigo} | {material.descricao}
                          </div>
                          <div className="text-sm text-gray-500">
                            Unidade: {material.unidade_medida} | Tipo: {material.tipo}
                          </div>
                        </div>
                        {material.valor_unitario_estimado && (
                          <div className="text-sm font-medium text-green-600">
                            R$ {material.valor_unitario_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Material Selecionado */}
          {materialSelecionado && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="font-medium text-blue-900">
                Material Selecionado: {materialSelecionado.nome}
              </div>
              <div className="text-sm text-blue-700">
                Código: {materialSelecionado.codigo} | Unidade: {materialSelecionado.unidade_medida}
              </div>
            </div>
          )}

          {/* Formulário do Item */}
          {materialSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.quantidade}
                    onChange={(e) => handleQuantidadeChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="unidade">Unidade de Medida</Label>
                  <Input
                    id="unidade"
                    value={materialSelecionado.unidade_medida}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_unitario">Valor Unitário Estimado (R$)</Label>
                  <Input
                    id="valor_unitario"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.valor_unitario_estimado}
                    onChange={(e) => handleValorUnitarioChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="valor_total">Valor Total Estimado (R$)</Label>
                  <Input
                    id="valor_total"
                    value={formData.quantidade * formData.valor_unitario_estimado}
                    disabled
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="especificacao">Especificação Técnica</Label>
                <Textarea
                  id="especificacao"
                  value={formData.especificacao_tecnica}
                  onChange={(e) => setFormData({...formData, especificacao_tecnica: e.target.value})}
                  placeholder="Especificações técnicas do material..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações sobre o item..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdicionarItem}
              disabled={!materialSelecionado || formData.quantidade <= 0}
            >
              Adicionar Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdicionarItemRequisicao;
