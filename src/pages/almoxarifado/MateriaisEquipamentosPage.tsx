import React, { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMateriaisEquipamentos, useCreateMaterialEquipamento, useUpdateMaterialEquipamento, useDeleteMaterialEquipamento } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useLocalizacoesFisicas } from '@/hooks/almoxarifado/useLocalizacoesFisicas';
import FormModal from '@/components/almoxarifado/FormModal';
import { toast } from 'sonner';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';

const MateriaisEquipamentosPage: React.FC = () => {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterClasse, setFilterClasse] = useState<string>('todos');
  const [materialGroups, setMaterialGroups] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'materiais' | 'grupos'>('materiais');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialEquipamento | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialEquipamento | null>(null);

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

  const handleViewMaterial = (material: MaterialEquipamento) => {
    setViewingMaterial(material);
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

  const storageKey = useMemo(
    () => `material-groups-${selectedCompany?.id || 'global'}`,
    [selectedCompany?.id]
  );

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const storedGroups: string[] = stored ? JSON.parse(stored) : [];
    const fromMateriais = materiais
      .map(mat => mat.classe)
      .filter((classe): classe is string => Boolean(classe));
    const unique = Array.from(new Set([...storedGroups, ...fromMateriais])).sort();
    setMaterialGroups(unique);
  }, [materiais, storageKey]);

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error('Informe um nome para o grupo de materiais');
      return;
    }
    if (materialGroups.includes(name)) {
      toast.info('Este grupo já existe');
      return;
    }
    const updated = [...materialGroups, name].sort();
    setMaterialGroups(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNewGroupName('');
    toast.success('Grupo de materiais adicionado');
  };

  const handleStartEditGroup = (group: string) => {
    setEditingGroup(group);
    setEditingGroupName(group);
  };

  const handleSaveEditGroup = () => {
    const name = editingGroupName.trim();
    if (!editingGroup || !name) {
      toast.error('Informe um nome válido para o grupo');
      return;
    }
    if (materialGroups.some((g) => g === name && g !== editingGroup)) {
      toast.info('Já existe um grupo com esse nome');
      return;
    }
    const updated = materialGroups.map((g) => (g === editingGroup ? name : g)).sort();
    setMaterialGroups(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setEditingGroup(null);
    setEditingGroupName('');
    toast.success('Grupo de materiais atualizado');
  };

  const handleCancelEditGroup = () => {
    setEditingGroup(null);
    setEditingGroupName('');
  };

  return (
    <RequirePage pagePath="/almoxarifado/materiais*" action="read">
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
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'materiais' | 'grupos')}>
          <TabsList className="mb-6">
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            <TabsTrigger value="grupos">Grupos de Materiais</TabsTrigger>
          </TabsList>

          <TabsContent value="materiais">
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
                      <SelectValue placeholder="Grupo de Materiais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Grupos</SelectItem>
                      {materialGroups.map((grupo) => (
                        <SelectItem key={grupo} value={grupo}>
                          {grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                            <div>
                              {material.nome && (
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {material.nome}
                                </h3>
                              )}
                              <p className={`text-sm ${material.nome ? 'text-gray-600' : 'text-lg font-semibold text-gray-900'}`}>
                                {material.descricao}
                              </p>
                            </div>
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
                              <span className="font-medium">Grupo:</span> {material.classe || '—'}
                            </div>
                            <div>
                              <span className="font-medium">Unidade:</span> {material.unidade_medida}
                            </div>
                            <div>
                              <span className="font-medium">Valor:</span> R$ {(material.valor_unitario || 0).toFixed(2)}
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewMaterial(material)}
                            title="Visualizar detalhes"
                          >
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
          </TabsContent>

          <TabsContent value="grupos">
            <Card>
              <CardHeader>
                <CardTitle>Grupos de Materiais</CardTitle>
                <CardDescription>Cadastre e gerencie os grupos usados na aba de materiais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Novo grupo de materiais"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGroup();
                      }
                    }}
                  />
                  <Button onClick={handleAddGroup} className="whitespace-nowrap">
                    Adicionar
                  </Button>
                </div>

                {materialGroups.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhum grupo cadastrado ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {materialGroups.map((grupo) => (
                      <Card key={grupo}>
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                          {editingGroup === grupo ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={editingGroupName}
                                onChange={(e) => setEditingGroupName(e.target.value)}
                                placeholder="Nome do grupo"
                              />
                              <Button variant="outline" size="sm" onClick={handleSaveEditGroup}>
                                Salvar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleCancelEditGroup}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-gray-800">{grupo}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Disponível</Badge>
                                <Button variant="ghost" size="sm" onClick={() => handleStartEditGroup(grupo)}>
                                  Editar
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
        classesOptions={materialGroups}
      />

      {/* Modal de Visualização de Detalhes */}
      {viewingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">
                  {viewingMaterial.nome || viewingMaterial.descricao}
                </CardTitle>
                {viewingMaterial.nome && (
                  <CardDescription className="mt-1">{viewingMaterial.descricao}</CardDescription>
                )}
              </div>
              <Button variant="outline" onClick={() => setViewingMaterial(null)}>
                Fechar
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Badges de Status */}
              <div className="flex gap-2">
                <Badge variant={viewingMaterial.tipo === 'equipamento' ? 'default' : viewingMaterial.tipo === 'produto' ? 'secondary' : 'outline'}>
                  {viewingMaterial.tipo === 'equipamento' ? 'Equipamento' : 
                   viewingMaterial.tipo === 'produto' ? 'Produto' : 
                   viewingMaterial.tipo === 'servico' ? 'Serviço' : 'Material'}
                </Badge>
                <Badge variant={viewingMaterial.status === 'ativo' ? 'default' : 'destructive'}>
                  {viewingMaterial.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Código Interno:</span>
                    <p className="text-gray-900">{viewingMaterial.codigo_interno}</p>
                  </div>
                  {viewingMaterial.nome && (
                    <div>
                      <span className="font-medium text-gray-600">Nome:</span>
                      <p className="text-gray-900">{viewingMaterial.nome}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-600">Descrição:</span>
                    <p className="text-gray-900">{viewingMaterial.descricao}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Grupo de Materiais:</span>
                    <p className="text-gray-900">{viewingMaterial.classe || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Unidade de Medida:</span>
                    <p className="text-gray-900">{viewingMaterial.unidade_medida}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Valor Unitário:</span>
                    <p className="text-gray-900">R$ {(viewingMaterial.valor_unitario || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Equipamento Próprio:</span>
                    <p className="text-gray-900">{viewingMaterial.equipamento_proprio ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>

              {/* Informações Fiscais */}
              {(viewingMaterial.ncm || viewingMaterial.cfop || viewingMaterial.cst) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informações Fiscais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                    {viewingMaterial.ncm && (
                      <div>
                        <span className="font-medium text-gray-600">NCM:</span>
                        <p className="text-gray-900">{viewingMaterial.ncm}</p>
                      </div>
                    )}
                    {viewingMaterial.cfop && (
                      <div>
                        <span className="font-medium text-gray-600">CFOP:</span>
                        <p className="text-gray-900">{viewingMaterial.cfop}</p>
                      </div>
                    )}
                    {viewingMaterial.cst && (
                      <div>
                        <span className="font-medium text-gray-600">CST:</span>
                        <p className="text-gray-900">{viewingMaterial.cst}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estoque e Localização */}
              {(() => {
                const estoqueStatus = getEstoqueStatus(viewingMaterial);
                return (
              <div>
                <h3 className="text-lg font-semibold mb-3">Estoque e Localização</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Estoque Mínimo:</span>
                    <p className="text-gray-900">{viewingMaterial.estoque_minimo}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Estoque Máximo:</span>
                    <p className="text-gray-900">{viewingMaterial.estoque_maximo || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Estoque Atual:</span>
                    <p className={`font-semibold ${estoqueStatus.color}`}>
                      {viewingMaterial.estoque_atual?.quantidade_atual || 0}
                    </p>
                    {viewingMaterial.estoque_atual && (
                      <>
                        <p className="text-sm text-gray-500">
                          Reservado: {viewingMaterial.estoque_atual.quantidade_reservada || 0}
                        </p>
                        <p className="text-sm text-gray-500">
                          Disponível: {viewingMaterial.estoque_atual.quantidade_disponivel || 0}
                        </p>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Localização:</span>
                    <p className="text-gray-900">{getLocalizacaoDisplay(viewingMaterial)}</p>
                  </div>
                  {viewingMaterial.validade_dias && viewingMaterial.validade_dias > 0 && (
                    <div>
                      <span className="font-medium text-gray-600">Validade (dias):</span>
                      <p className="text-gray-900">{viewingMaterial.validade_dias} dias</p>
                    </div>
                  )}
                </div>
              </div>
                );
              })()}

              {/* Imagem */}
              {viewingMaterial.imagem_url && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Imagem</h3>
                  <div className="flex justify-center">
                    <img 
                      src={viewingMaterial.imagem_url} 
                      alt={viewingMaterial.nome || viewingMaterial.descricao}
                      className="max-w-md max-h-64 object-contain rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Observações */}
              {viewingMaterial.observacoes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Observações</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingMaterial.observacoes}</p>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Criado em:</span>
                    <p>{new Date(viewingMaterial.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Atualizado em:</span>
                    <p>{new Date(viewingMaterial.updated_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </RequirePage>
  );
};

export default MateriaisEquipamentosPage;
