import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, MapPin, Settings, Image as ImageIcon } from 'lucide-react';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useLocalizacoesFisicas } from '@/hooks/almoxarifado/useLocalizacoesFisicas';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  initialData?: any;
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData
}) => {
  const { data: almoxarifados = [] } = useAlmoxarifados();
  const [selectedAlmoxarifado, setSelectedAlmoxarifado] = useState<string>('');
  const { localizacoes, getLocalizacaoString } = useLocalizacoesFisicas(selectedAlmoxarifado);

  const [formData, setFormData] = useState({
    codigo_interno: initialData?.codigo_interno || '',
    descricao: initialData?.descricao || '',
    tipo: initialData?.tipo || 'produto',
    classe: initialData?.classe || '',
    unidade_medida: initialData?.unidade_medida || '',
    status: initialData?.status || 'ativo',
    equipamento_proprio: initialData?.equipamento_proprio ?? true,
    estoque_minimo: initialData?.estoque_minimo || 0,
    estoque_maximo: initialData?.estoque_maximo || 0,
    valor_unitario: initialData?.valor_unitario || 0,
    validade_dias: initialData?.validade_dias || 0,
    localizacao_id: initialData?.localizacao_id || '',
    observacoes: initialData?.observacoes || '',
    imagem_url: initialData?.imagem_url || '',
    ncm: initialData?.ncm || '',
    cfop: initialData?.cfop || '',
    cst: initialData?.cst || ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const unidadesMedida = [
    'UN', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'MM', 'M²', 'M³', 'CX', 'PC', 'DZ', 'PAR'
  ];

  const classes = [
    'Parafusos', 'Porcas', 'Arruelas', 'Ferramentas', 'Equipamentos Elétricos',
    'Equipamentos Hidráulicos', 'Equipamentos Pneumáticos', 'Materiais de Construção',
    'Produtos Químicos', 'Equipamentos de Segurança', 'Outros'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {initialData ? 'Editar material/equipamento' : 'Cadastrar novo material/equipamento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="dados-basicos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="localizacao">Localização</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="outros">Outros</TabsTrigger>
            </TabsList>

            {/* Dados Básicos */}
            <TabsContent value="dados-basicos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigo_interno">Código Interno *</Label>
                      <Input
                        id="codigo_interno"
                        value={formData.codigo_interno}
                        onChange={(e) => handleInputChange('codigo_interno', e.target.value)}
                        placeholder="Ex: MAT001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => handleInputChange('tipo', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="produto">Produto</SelectItem>
                          <SelectItem value="servico">Serviço</SelectItem>
                          <SelectItem value="equipamento">Equipamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => handleInputChange('descricao', e.target.value)}
                      placeholder="Descrição detalhada do material/equipamento"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classe">Classe</Label>
                      <Select
                        value={formData.classe}
                        onValueChange={(value) => handleInputChange('classe', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(classe => (
                            <SelectItem key={classe} value={classe}>
                              {classe}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="unidade_medida">Unidade de Medida *</Label>
                      <Select
                        value={formData.unidade_medida}
                        onValueChange={(value) => handleInputChange('unidade_medida', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {unidadesMedida.map(unidade => (
                            <SelectItem key={unidade} value={unidade}>
                              {unidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Campos Fiscais */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Informações Fiscais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="ncm">NCM</Label>
                        <Input
                          id="ncm"
                          value={formData.ncm}
                          onChange={(e) => handleInputChange('ncm', e.target.value)}
                          placeholder="Ex: 12345678"
                          maxLength={20}
                        />
                        <p className="text-xs text-gray-500 mt-1">Nomenclatura Comum do Mercosul</p>
                      </div>
                      <div>
                        <Label htmlFor="cfop">CFOP</Label>
                        <Input
                          id="cfop"
                          value={formData.cfop}
                          onChange={(e) => handleInputChange('cfop', e.target.value)}
                          placeholder="Ex: 1102"
                          maxLength={10}
                        />
                        <p className="text-xs text-gray-500 mt-1">Código Fiscal de Operações</p>
                      </div>
                      <div>
                        <Label htmlFor="cst">CST</Label>
                        <Input
                          id="cst"
                          value={formData.cst}
                          onChange={(e) => handleInputChange('cst', e.target.value)}
                          placeholder="Ex: 00"
                          maxLength={10}
                        />
                        <p className="text-xs text-gray-500 mt-1">Código de Situação Tributária</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="equipamento_proprio"
                        checked={formData.equipamento_proprio}
                        onCheckedChange={(checked) => handleInputChange('equipamento_proprio', checked)}
                      />
                      <Label htmlFor="equipamento_proprio">Equipamento Próprio</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="imagem_url">URL da Imagem</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="imagem_url"
                        value={formData.imagem_url}
                        onChange={(e) => handleInputChange('imagem_url', e.target.value)}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                      <Button type="button" variant="outline">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Localização */}
            <TabsContent value="localizacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Localização Física
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="almoxarifado">Almoxarifado</Label>
                      <Select
                        value={selectedAlmoxarifado}
                        onValueChange={(value) => {
                          setSelectedAlmoxarifado(value);
                          handleInputChange('localizacao_id', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o almoxarifado" />
                        </SelectTrigger>
                        <SelectContent>
                          {almoxarifados.map(almoxarifado => (
                            <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                              {almoxarifado.nome} ({almoxarifado.codigo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="localizacao_id">Localização</Label>
                      <Select
                        value={formData.localizacao_id}
                        onValueChange={(value) => handleInputChange('localizacao_id', value)}
                        disabled={!selectedAlmoxarifado}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a localização" />
                        </SelectTrigger>
                        <SelectContent>
                          {localizacoes.map(localizacao => (
                            <SelectItem key={localizacao.id} value={localizacao.id}>
                              {getLocalizacaoString(localizacao)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Selecione primeiro o almoxarifado e depois a localização específica
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Estoque */}
            <TabsContent value="estoque" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Controle de Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                      <Input
                        id="estoque_minimo"
                        type="number"
                        min="0"
                        value={formData.estoque_minimo}
                        onChange={(e) => handleInputChange('estoque_minimo', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="estoque_maximo">Estoque Máximo</Label>
                      <Input
                        id="estoque_maximo"
                        type="number"
                        min="0"
                        value={formData.estoque_maximo}
                        onChange={(e) => handleInputChange('estoque_maximo', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
                      <Input
                        id="valor_unitario"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valor_unitario}
                        onChange={(e) => handleInputChange('valor_unitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="validade_dias">Validade (dias)</Label>
                      <Input
                        id="validade_dias"
                        type="number"
                        min="0"
                        value={formData.validade_dias}
                        onChange={(e) => handleInputChange('validade_dias', parseInt(e.target.value) || 0)}
                        placeholder="0 = sem validade"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Outros */}
            <TabsContent value="outros" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Observações adicionais sobre o material/equipamento"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormModal;
