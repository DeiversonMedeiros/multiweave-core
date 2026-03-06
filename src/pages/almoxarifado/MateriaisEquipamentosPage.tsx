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
  Loader2,
  Upload,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { useGrupoClassesFinanceiras } from '@/hooks/almoxarifado/useGruposMateriaisQuery';
import { Checkbox } from '@/components/ui/checkbox';
import { useMateriaisEquipamentos, useCreateMaterialEquipamento, useUpdateMaterialEquipamento, useDeleteMaterialEquipamento } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useLocalizacoesFisicas } from '@/hooks/almoxarifado/useLocalizacoesFisicas';
import { useGruposMateriais, useGruposMateriaisComClasses, useCreateGrupoMaterial, useUpdateGrupoMaterial, useDeleteGrupoMaterial, useSetClassesFinanceirasGrupo } from '@/hooks/almoxarifado/useGruposMateriaisQuery';
import FormModal from '@/components/almoxarifado/FormModal';
import { ImportacaoMateriaisModal } from '@/components/almoxarifado/ImportacaoMateriaisModal';
import { generateMateriaisExcelTemplate } from '@/services/almoxarifado/materiaisImportService';
import { toast } from 'sonner';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';
import type { MaterialEquipamento } from '@/services/almoxarifado/almoxarifadoService';

const MateriaisEquipamentosPage: React.FC = () => {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterGrupoId, setFilterGrupoId] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'materiais' | 'grupos'>('materiais');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<{ id: string; nome: string } | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [grupoClassesModal, setGrupoClassesModal] = useState<{ id: string; nome: string } | null>(null);
  const [grupoClassesSelectedIds, setGrupoClassesSelectedIds] = useState<string[]>([]);
  const [grupoClassesSearch, setGrupoClassesSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialEquipamento | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialEquipamento | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data: grupos = [] } = useGruposMateriais();
  const { data: gruposComClasses = [] } = useGruposMateriaisComClasses();
  const createGrupo = useCreateGrupoMaterial();
  const { data: grupoClassesLinked = [] } = useGrupoClassesFinanceiras(grupoClassesModal?.id ?? null);
  const { data: classesFinanceirasData } = useActiveClassesFinanceiras();
  const classesFinanceiras = (classesFinanceirasData?.data ?? []) as { id: string; codigo?: string; nome?: string }[];
  const updateGrupo = useUpdateGrupoMaterial();
  const deleteGrupo = useDeleteGrupoMaterial();
  const setClassesGrupo = useSetClassesFinanceirasGrupo();

  // Hooks para dados reais
  const {
    data: materiais = [],
    isLoading: loading,
    error,
    refetch
  } = useMateriaisEquipamentos({
    tipo: filterTipo !== 'todos' ? filterTipo : undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
    grupo_material_id: filterGrupoId !== 'todos' ? filterGrupoId : undefined,
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
    } catch (error: any) {
      const msg = error?.message || error?.error_description || 'Erro ao atualizar material';
      toast.error(msg);
      console.error('Update material error:', error);
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

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name || !selectedCompany?.id) {
      toast.error('Informe um nome para o grupo de materiais');
      return;
    }
    if (grupos.some((g) => g.nome === name)) {
      toast.info('Este grupo já existe');
      return;
    }
    try {
      await createGrupo.mutateAsync({ nome: name, company_id: selectedCompany.id, ativo: true });
      setNewGroupName('');
      toast.success('Grupo de materiais adicionado');
    } catch {
      toast.error('Erro ao adicionar grupo');
    }
  };

  const handleStartEditGroup = (grupo: { id: string; nome: string }) => {
    setEditingGroup(grupo);
    setEditingGroupName(grupo.nome);
  };

  const handleSaveEditGroup = async () => {
    const name = editingGroupName.trim();
    if (!editingGroup || !name) {
      toast.error('Informe um nome válido para o grupo');
      return;
    }
    if (grupos.some((g) => g.nome === name && g.id !== editingGroup.id)) {
      toast.info('Já existe um grupo com esse nome');
      return;
    }
    try {
      await updateGrupo.mutateAsync({ id: editingGroup.id, data: { nome: name } });
      setEditingGroup(null);
      setEditingGroupName('');
      toast.success('Grupo de materiais atualizado');
    } catch {
      toast.error('Erro ao atualizar grupo');
    }
  };

  const handleCancelEditGroup = () => {
    setEditingGroup(null);
    setEditingGroupName('');
  };

  const handleDeleteGroup = async (grupo: { id: string; nome: string }) => {
    if (!confirm(`Excluir o grupo "${grupo.nome}"? Os materiais vinculados ficarão sem grupo.`)) return;
    try {
      await deleteGrupo.mutateAsync(grupo.id);
      toast.success('Grupo excluído');
    } catch {
      toast.error('Erro ao excluir grupo');
    }
  };

  useEffect(() => {
    if (grupoClassesModal && grupoClassesLinked) {
      setGrupoClassesSelectedIds([...grupoClassesLinked]);
    }
  }, [grupoClassesModal?.id, grupoClassesLinked]);

  const handleSaveGrupoClasses = async () => {
    if (!grupoClassesModal) return;
    try {
      await setClassesGrupo.mutateAsync({
        grupoMaterialId: grupoClassesModal.id,
        classeFinanceiraIds: grupoClassesSelectedIds
      });
      toast.success('Classes financeiras atualizadas');
      setGrupoClassesModal(null);
    } catch {
      toast.error('Erro ao salvar classes');
    }
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
            <div className="flex gap-2">
              <PermissionButton
                action="create"
                page="/almoxarifado/materiais*"
                variant="outline"
                onClick={() => {
                  try {
                    generateMateriaisExcelTemplate();
                    toast.success('Template baixado com sucesso!');
                  } catch (e) {
                    toast.error('Erro ao baixar template');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar template
              </PermissionButton>
              <PermissionButton
                action="create"
                page="/almoxarifado/materiais*"
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </PermissionButton>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleNewMaterial}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
            </div>
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

                  <Select value={filterGrupoId} onValueChange={setFilterGrupoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grupo de Materiais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Grupos</SelectItem>
                      {grupos.filter((g) => g.ativo).map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
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
                        {searchTerm || filterTipo !== 'todos' || filterStatus !== 'todos' || filterGrupoId !== 'todos'
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
                              <span className="font-medium">Grupo:</span>{' '}
                              {material.grupo_material_id
                                ? grupos.find((g) => g.id === material.grupo_material_id)?.nome ?? material.classe ?? '—'
                                : material.classe ?? '—'}
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
                <CardDescription>
                  Cadastre e gerencie os grupos. Vincule classes financeiras ao grupo para que, ao cadastrar um material nesse grupo, as classes já venham pré-definidas.
                </CardDescription>
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
                  <Button onClick={handleAddGroup} className="whitespace-nowrap" disabled={createGrupo.isPending}>
                    {createGrupo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>

                {grupos.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhum grupo cadastrado ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {grupos.map((grupo) => (
                      <Card key={grupo.id}>
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-3 flex-wrap">
                          {editingGroup?.id === grupo.id ? (
                            <div className="flex-1 flex items-center gap-2 flex-wrap">
                              <Input
                                value={editingGroupName}
                                onChange={(e) => setEditingGroupName(e.target.value)}
                                placeholder="Nome do grupo"
                                className="min-w-[140px]"
                              />
                              <Button variant="outline" size="sm" onClick={handleSaveEditGroup} disabled={updateGrupo.isPending}>
                                Salvar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleCancelEditGroup}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-gray-800">{grupo.nome}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setGrupoClassesModal({ id: grupo.id, nome: grupo.nome })}
                                >
                                  Classes financeiras
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleStartEditGroup(grupo)}>
                                  Editar
                                </Button>
                                <PermissionButton
                                  action="delete"
                                  page="/almoxarifado/materiais*"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteGroup(grupo)}
                                  disabled={deleteGrupo.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </PermissionButton>
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

      {/* Modal de Importação em Massa */}
      <ImportacaoMateriaisModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompany?.id || ''}
        onSuccess={() => refetch()}
      />

      {/* Modal Classes Financeiras do Grupo */}
      <Dialog open={!!grupoClassesModal} onOpenChange={(open) => !open && setGrupoClassesModal(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Classes financeiras — {grupoClassesModal?.nome}</DialogTitle>
            <DialogDescription>
              Selecione as classes financeiras vinculadas a este grupo. Ao cadastrar um material neste grupo, essas classes poderão ser pré-definidas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Buscar por código ou nome..."
              value={grupoClassesSearch}
              onChange={(e) => setGrupoClassesSearch(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="grid gap-2 py-2">
            {classesFinanceiras
              .filter((cf) => {
                if (!grupoClassesSearch.trim()) return true;
                const term = grupoClassesSearch.toLowerCase();
                return (
                  (cf.codigo || '').toLowerCase().includes(term) ||
                  (cf.nome || '').toLowerCase().includes(term)
                );
              })
              .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
              .map((cf) => (
                <label
                  key={cf.id}
                  className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={grupoClassesSelectedIds.includes(cf.id)}
                    onCheckedChange={(checked) => {
                      setGrupoClassesSelectedIds((prev) =>
                        checked ? [...prev, cf.id] : prev.filter((id) => id !== cf.id)
                      );
                    }}
                  />
                  <span className="text-sm">
                    {cf.codigo} — {cf.nome}
                  </span>
                </label>
              ))}
            {classesFinanceiras.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma classe financeira cadastrada.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrupoClassesModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGrupoClasses} disabled={setClassesGrupo.isPending}>
              {setClassesGrupo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        gruposComClasses={gruposComClasses}
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
                    <p className="text-gray-900">
                      {viewingMaterial.grupo_material_id
                        ? grupos.find((g) => g.id === viewingMaterial.grupo_material_id)?.nome ?? viewingMaterial.classe ?? 'Não informado'
                        : viewingMaterial.classe || 'Não informado'}
                    </p>
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
