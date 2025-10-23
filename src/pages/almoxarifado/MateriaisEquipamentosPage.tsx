import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  MapPin,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMateriaisEquipamentos, useCreateMaterialEquipamento, useUpdateMaterialEquipamento, useDeleteMaterialEquipamento } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useLocalizacoesFisicas } from '@/hooks/almoxarifado/useLocalizacoesFisicas';
import FormModal from '@/components/almoxarifado/FormModal';
import { toast } from 'sonner';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const MateriaisEquipamentosPage: React.FC = () => {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterClasse, setFilterClasse] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialEquipamento | null>(null);

  // Hooks para dados reais
  const {
    data: materiais = [],
    isLoading: loading,
    error,
    refetch
  } = useMateriaisEquipamentos({
    tipo: filterTipo !== 'todos' ? filterTipo : undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
    classe: filterClasse !== 'todos' ? filterClasse : undefined,
    search: searchTerm || undefined
  });

  const { data: almoxarifados = [] } = useAlmoxarifados();
  const [selectedAlmoxarifado, setSelectedAlmoxarifado] = useState<string>('');
  const { localizacoes, getLocalizacaoString } = useLocalizacoesFisicas(selectedAlmoxarifado);

  // Hooks de mutação
  const createMaterial = useCreateMaterialEquipamento();
  const updateMaterial = useUpdateMaterialEquipamento();
  const deleteMaterial = useDeleteMaterialEquipamento();

  // Os filtros são aplicados automaticamente via queryKey

  const handleCreateMaterial = async (data: any) => {
    try {
      await createMaterial.mutateAsync(data);
      toast.success('Material criado com sucesso!');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao criar material');
      console.error(error);
    }
  };

  const handleUpdateMaterial = async (data: any) => {
    if (!editingMaterial) return;
    
    try {
      await updateMaterial.mutateAsync({ id: editingMaterial.id, data });
      toast.success('Material atualizado com sucesso!');
      setEditingMaterial(null);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar material');
      console.error(error);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;
    
    try {
      await deleteMaterial.mutateAsync(id);
      toast.success('Material excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir material');
      console.error(error);
    }
  };

  const handleEditMaterial = (material: MaterialEquipamento) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleNewMaterial = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const getLocalizacaoDisplay = (material: MaterialEquipamento) => {
    if (material.localizacao) {
      return getLocalizacaoString(material.localizacao);
    }
    return 'Não definido';
  };

  const getEstoqueStatus = (material: MaterialEquipamento) => {
    const estoqueAtual = material.estoque_atual?.quantidade_atual || 0;
    const estoqueMinimo = material.estoque_minimo || 0;
    
    if (estoqueAtual <= estoqueMinimo) {
      return { status: 'ruptura', color: 'text-red-600', icon: AlertTriangle };
    }
    return { status: 'ok', color: 'text-green-600', icon: Package };
  };

  return (
    <RequireEntity entityName="materials_equipment" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Package className="inline-block mr-3 h-8 w-8" />
              Materiais e Equipamentos
            </h1>
            <p className="text-gray-600">
              Cadastro e gestão de materiais e equipamentos do almoxarifado
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleNewMaterial}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Material
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterClasse} onValueChange={setFilterClasse}>
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Classes</SelectItem>
                  <SelectItem value="Parafusos">Parafusos</SelectItem>
                  <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando materiais...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de Materiais */}
      {!loading && !error && (
        <div className="space-y-4">
          {materiais.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum material encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterTipo !== 'todos' || filterStatus !== 'todos' || filterClasse !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece adicionando seu primeiro material'
                  }
                </p>
                <Button onClick={handleNewMaterial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Material
                </Button>
              </CardContent>
            </Card>
          ) : (
            materiais.map((material) => {
              const estoqueStatus = getEstoqueStatus(material);
              const StatusIcon = estoqueStatus.icon;
              
              return (
            <Card key={material.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {material.descricao}
                      </h3>
                      <Badge variant={material.tipo === 'equipamento' ? 'default' : material.tipo === 'produto' ? 'secondary' : 'outline'}>
                        {material.tipo === 'equipamento' ? 'Equipamento' : 
                         material.tipo === 'produto' ? 'Produto' : 
                         material.tipo === 'servico' ? 'Serviço' : 'Material'}
                      </Badge>
                      <Badge variant={material.status === 'ativo' ? 'default' : 'destructive'}>
                        {material.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Código:</span> {material.codigo_interno}
                      </div>
                      <div>
                        <span className="font-medium">Classe:</span> {material.classe}
                      </div>
                      <div>
                        <span className="font-medium">Unidade:</span> {material.unidade_medida}
                      </div>
                      <div>
                        <span className="font-medium">Valor:</span> R$ {material.valor_unitario.toFixed(2)}
                      </div>
                    </div>

                    {/* Campos Fiscais */}
                    {(material.ncm || material.cfop || material.cst) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        {material.ncm && (
                          <div>
                            <span className="font-medium">NCM:</span> {material.ncm}
                          </div>
                        )}
                        {material.cfop && (
                          <div>
                            <span className="font-medium">CFOP:</span> {material.cfop}
                          </div>
                        )}
                        {material.cst && (
                          <div>
                            <span className="font-medium">CST:</span> {material.cst}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                      <div>
                        <span className="font-medium">Estoque Mín:</span> {material.estoque_minimo}
                      </div>
                      <div>
                        <span className="font-medium">Estoque Máx:</span> {material.estoque_maximo || 'N/A'}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="font-medium">Local:</span> {getLocalizacaoDisplay(material)}
                      </div>
                      <div className={`flex items-center ${estoqueStatus.color}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">Estoque:</span> {material.estoque_atual?.quantidade_atual || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditMaterial(material)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
              );
            })
          )}
        </div>
      )}

      {/* Paginação */}
      {!loading && !error && materiais.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            <Button variant="outline" disabled>
              Anterior
            </Button>
            <Button variant="outline" className="bg-primary text-primary-foreground">
              1
            </Button>
            <Button variant="outline" disabled>
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Formulário */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMaterial(null);
        }}
        onSubmit={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
        title={editingMaterial ? 'Editar Material' : 'Novo Material'}
        initialData={editingMaterial}
      />
      </div>
    </RequireEntity>
  );
};

export default MateriaisEquipamentosPage;
