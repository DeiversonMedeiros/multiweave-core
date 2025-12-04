import React, { useMemo, useState, useEffect } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Boxes,
  MapPin,
  Zap,
  Package
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useCreatePurchaseRequisition,
  usePurchaseRequisitions,
} from '@/hooks/compras/useComprasData';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import type { MaterialEquipamento } from '@/services/almoxarifado/almoxarifadoService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome: string;
  material_codigo?: string;
  material_imagem_url?: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  valor_medio?: number; // Valor médio das últimas compras
  observacoes?: string;
  almoxarifado_id?: string;
}

// Componente principal protegido por permissões
export default function RequisicoesCompraPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [showNovaSolicitacao, setShowNovaSolicitacao] = useState(false);

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'solicitacoes_compra', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Solicitações de Compra</h1>
          
          {/* Botão de criar protegido por permissão */}
          <PermissionGuard 
            entity="solicitacoes_compra" 
            action="create"
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Solicitação
              </Button>
            }
          >
            <Button onClick={() => setShowNovaSolicitacao(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </PermissionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <RequisicoesList />
          </CardContent>
        </Card>

        {/* Modal Nova Solicitação */}
        <Dialog open={showNovaSolicitacao} onOpenChange={setShowNovaSolicitacao}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle>Nova Solicitação de Compra</DialogTitle>
            </DialogHeader>
            <NovaSolicitacaoForm onClose={() => setShowNovaSolicitacao(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de requisições
function RequisicoesList() {
  const { canEditEntity, canDeleteEntity } = usePermissions();
  const { data: requisicoes = [], isLoading } = usePurchaseRequisitions();
  const [search, setSearch] = useState('');

  const getStatusBadge = (workflow: string) => {
    switch (workflow) {
      case 'pendente_aprovacao':
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'aprovada':
        return (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case 'reprovada':
      case 'cancelada':
        return (
          <Badge variant="outline" className="text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Reprovada
          </Badge>
        );
      default:
        return <Badge variant="outline">{workflow}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    if (!search) return requisicoes;
    return requisicoes.filter((req: any) =>
      req.numero_requisicao?.toLowerCase().includes(search.toLowerCase()) ||
      req.workflow_state?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [requisicoes, search]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar solicitações..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Data Solicitação</TableHead>
            <TableHead>Data Necessidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Carregando requisições...
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((requisicao: any) => (
              <TableRow key={requisicao.id}>
                <TableCell className="font-medium">{requisicao.numero_requisicao}</TableCell>
                <TableCell>
                  {requisicao.data_solicitacao
                    ? new Date(requisicao.data_solicitacao).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>
                  {requisicao.data_necessidade
                    ? new Date(requisicao.data_necessidade).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>{getStatusBadge(requisicao.workflow_state || requisicao.status)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      requisicao.prioridade === 'Alta' || requisicao.prioridade === 'Urgente'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {requisicao.prioridade}
                  </Badge>
                </TableCell>
                <TableCell>
                  {requisicao.valor_total_estimado
                    ? `R$ ${Number(requisicao.valor_total_estimado).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : '--'}
                </TableCell>
                <TableCell>{requisicao.solicitante_nome || requisicao.solicitante_id}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>

                    <PermissionGuard entity="solicitacoes_compra" action="edit" fallback={null}>
                      <Button variant="outline" size="sm" disabled={!canEditEntity}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard entity="solicitacoes_compra" action="delete" fallback={null}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={!canDeleteEntity}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Componente de busca de material
function MaterialSearchModal({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (material: MaterialEquipamento) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Usar o hook correto que usa EntityService (RPC)
  const { data: materiais = [], isLoading: loading } = useMateriaisEquipamentos({
    status: 'ativo'
  });

  // Limpar busca ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filtrar localmente em vez de fazer nova busca a cada digitação
  const filteredMateriais = useMemo(() => {
    if (!searchTerm.trim()) {
      return materiais;
    }
    const searchLower = searchTerm.toLowerCase();
    return materiais.filter(m => 
      m.descricao?.toLowerCase().includes(searchLower) ||
      m.codigo_interno?.toLowerCase().includes(searchLower)
    );
  }, [materiais, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Buscar Material</DialogTitle>
          <DialogDescription>
            Selecione um material do almoxarifado para adicionar à requisição
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 px-6 pb-6 overflow-hidden">
          <div className="relative mb-4 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Carregando materiais...</p>
              </div>
            ) : filteredMateriais.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Nenhum material encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 pr-2">
                {filteredMateriais.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => {
                      onSelect(material);
                      onClose();
                    }}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={material.imagem_url} alt={material.nome || material.descricao} />
                      <AvatarFallback>
                        <Package className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.nome || material.descricao}</p>
                      {material.nome && (
                        <p className="text-xs text-muted-foreground truncate">{material.descricao}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Código: {material.codigo_interno} • {material.unidade_medida}
                      </p>
                    </div>
                    {material.valor_unitario !== undefined && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium">
                          R$ {Number(material.valor_unitario).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente do formulário de nova solicitação
function NovaSolicitacaoForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreatePurchaseRequisition();
  const { selectedCompany } = useCompany();
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  
  // Buscar dados para os selects
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { data: almoxarifados = [] } = useAlmoxarifados();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];
  const [formData, setFormData] = useState({
    data_necessidade: '',
    prioridade: 'Normal',
    centro_custo_id: '',
    projeto_id: '',
    tipo_requisicao: 'reposicao' as 'reposicao' | 'compra_direta' | 'emergencial',
    destino_almoxarifado_id: '',
    local_entrega: '',
    observacoes: '',
    itens: [] as RequisicaoItem[],
  });

  // Função para buscar valor médio das últimas compras
  const getMaterialAveragePrice = async (materialId: string): Promise<number> => {
    if (!selectedCompany?.id) return 0;
    
    try {
      const { data, error } = await (supabase as any).rpc(
        'get_material_average_price',
        {
          p_material_id: materialId,
          p_company_id: selectedCompany.id,
          p_limit_compras: 10
        }
      );
      
      if (error) {
        console.error('Erro ao buscar valor médio:', error);
        return 0;
      }
      
      // A função retorna JSONB com {valorMedio, valorMedioFormatado}
      const result = data as { valorMedio?: number; valorMedioFormatado?: string } | null;
      return result?.valorMedio || 0;
    } catch (error) {
      console.error('Erro ao buscar valor médio:', error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      data_necessidade: formData.data_necessidade,
      prioridade: formData.prioridade,
      centro_custo_id: formData.centro_custo_id,
      projeto_id: formData.projeto_id || undefined,
      tipo_requisicao: formData.tipo_requisicao,
      destino_almoxarifado_id:
        formData.tipo_requisicao === 'reposicao' ? formData.destino_almoxarifado_id : undefined,
      local_entrega: formData.tipo_requisicao === 'compra_direta' ? formData.local_entrega : undefined,
      justificativa: formData.observacoes,
      observacoes: formData.observacoes,
      itens: formData.itens.map((item) => ({
        material_id: item.material_id,
        quantidade: item.quantidade,
        unidade_medida: item.unidade,
        valor_unitario_estimado: item.valor_medio || item.valor_unitario || 0,
        observacoes: item.observacoes,
        almoxarifado_id: formData.destino_almoxarifado_id || undefined,
      })),
    });
    onClose();
  };

  const addItem = () => {
    setSelectedItemIndex(formData.itens.length);
    setShowMaterialSearch(true);
  };

  const handleMaterialSelect = async (material: MaterialEquipamento) => {
    if (selectedItemIndex !== null) {
      // Buscar valor médio das últimas compras
      const valorMedio = await getMaterialAveragePrice(material.id);
      
      const newItem: RequisicaoItem = {
        id: Date.now().toString(),
        material_id: material.id,
        material_nome: material.nome || material.descricao, // Usa nome se disponível, senão descrição
        material_codigo: material.codigo_interno,
        material_imagem_url: material.imagem_url,
        quantidade: 1,
        unidade: material.unidade_medida || 'UN', // Garante que sempre tenha uma unidade, padrão 'UN'
        valor_unitario: valorMedio || material.valor_unitario || 0,
        valor_total: valorMedio || material.valor_unitario || 0,
        valor_medio: valorMedio,
        observacoes: ''
      };

      if (selectedItemIndex === formData.itens.length) {
        // Novo item
        setFormData(prev => ({
          ...prev,
          itens: [...prev.itens, newItem]
        }));
      } else {
        // Atualizar item existente
        setFormData(prev => ({
          ...prev,
          itens: prev.itens.map((item, idx) => 
            idx === selectedItemIndex ? newItem : item
          )
        }));
      }
      
      if (valorMedio > 0) {
        toast.success(`Valor médio das últimas compras: R$ ${valorMedio.toFixed(2)}`);
      }
    }
    setSelectedItemIndex(null);
    setShowMaterialSearch(false);
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof RequisicaoItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Body com scroll */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <div className="space-y-6">
          {/* Primeira linha: Data, Prioridade, Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_necessidade">Data de Necessidade</Label>
              <Input
                id="data_necessidade"
                type="date"
                value={formData.data_necessidade}
                onChange={(e) => setFormData(prev => ({ ...prev, data_necessidade: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_requisicao">Tipo da Requisição</Label>
              <Select
                value={formData.tipo_requisicao}
                onValueChange={(value: 'reposicao' | 'compra_direta' | 'emergencial') =>
                  setFormData(prev => ({ ...prev, tipo_requisicao: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reposicao">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-3 w-3" />
                      Reposição de estoque
                    </div>
                  </SelectItem>
                  <SelectItem value="compra_direta">
                    <div className="flex items-center gap-2">
                      <Building className="h-3 w-3" />
                      Compra direta
                    </div>
                  </SelectItem>
                  <SelectItem value="emergencial">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Emergencial
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Segunda linha: Centro de Custo, Projeto, Almoxarifado/Local */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centro_custo">Centro de Custo</Label>
              <Select
                value={formData.centro_custo_id || undefined}
                onValueChange={(value) => setFormData(prev => ({ ...prev, centro_custo_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum centro de custo disponível</div>
                  ) : (
                    costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id || 'unknown'}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projeto_id">Projeto (opcional)</Label>
              <Select
                value={formData.projeto_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projeto_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum projeto</SelectItem>
                  {projects.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum projeto disponível</div>
                  ) : (
                    projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id || 'unknown'}>
                        {proj.codigo} - {proj.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_requisicao === 'reposicao' && (
              <div className="space-y-2">
                <Label htmlFor="destino_almoxarifado_id">Almoxarifado / Localização</Label>
                <Select
                  value={formData.destino_almoxarifado_id || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, destino_almoxarifado_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o almoxarifado" />
                  </SelectTrigger>
                  <SelectContent>
                    {almoxarifados.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum almoxarifado disponível</div>
                    ) : (
                      almoxarifados.map((alm) => (
                        <SelectItem key={alm.id} value={alm.id || 'unknown'}>
                          {alm.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo_requisicao === 'compra_direta' && (
              <div className="space-y-2">
                <Label htmlFor="local_entrega">Local de Entrega</Label>
                <Select
                  value={formData.local_entrega && ['Almoxarifado Central', 'Obra Principal', 'Escritório', 'Depósito'].includes(formData.local_entrega) ? formData.local_entrega : (formData.local_entrega ? 'custom' : undefined)}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setFormData(prev => ({ ...prev, local_entrega: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, local_entrega: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local de entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Lista de locais de entrega comuns */}
                    <SelectItem value="Almoxarifado Central">Almoxarifado Central</SelectItem>
                    <SelectItem value="Obra Principal">Obra Principal</SelectItem>
                    <SelectItem value="Escritório">Escritório</SelectItem>
                    <SelectItem value="Depósito">Depósito</SelectItem>
                    <SelectItem value="custom">Outro (personalizado)</SelectItem>
                  </SelectContent>
                </Select>
                {/* Se selecionar "Outro" ou se o valor não estiver na lista, mostrar campo de texto */}
                {(!formData.local_entrega || !['Almoxarifado Central', 'Obra Principal', 'Escritório', 'Depósito'].includes(formData.local_entrega)) && (
                  <Input
                    id="local_entrega_custom"
                    value={formData.local_entrega || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, local_entrega: e.target.value }))}
                    placeholder="Informe o local de entrega"
                    className="mt-2"
                    required
                  />
                )}
              </div>
            )}

            {formData.tipo_requisicao === 'emergencial' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 rounded-md border p-3 bg-yellow-50 dark:bg-yellow-950">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Flag de emergência ativo</p>
                    <p className="text-xs text-muted-foreground">
                      Fornecedor único e SLA dedicado
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          {/* Seção de Itens - Visualização melhorada */}
          <div className="space-y-4 border-2 border-primary/20 rounded-lg p-6 bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-lg font-semibold">Itens da Solicitação</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.itens.length} {formData.itens.length === 1 ? 'item adicionado' : 'itens adicionados'}
                </p>
              </div>
              <Button type="button" onClick={addItem} size="sm" variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {formData.itens.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground bg-background">
                <Boxes className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base font-medium mb-1">Nenhum item adicionado</p>
                <p className="text-sm">Clique em "Adicionar Item" para buscar e adicionar materiais</p>
              </div>
            ) : (
              // Container com scroll interno para lista de itens
              <div className="border rounded-lg bg-background overflow-hidden">
                <ScrollArea className="h-[60vh]">
                  <div className="p-4">
                    {/* Visualização em cards para todos os itens */}
                    <div className="space-y-4">
                {formData.itens.map((item, index) => {
                  return (
                    <Card key={item.id} className="border-2 hover:border-primary/40 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Imagem e número do item */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-16 w-16 border-2 border-primary/20">
                                <AvatarImage src={item.material_imagem_url} alt={item.material_nome} />
                                <AvatarFallback className="bg-primary/10">
                                  <Package className="h-8 w-8 text-primary" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Informações do material */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Material</Label>
                                <p className="font-semibold text-base">{item.material_nome || 'Material não selecionado'}</p>
                                {item.material_codigo && (
                                  <p className="text-xs text-muted-foreground mt-1">Código: {item.material_codigo}</p>
                                )}
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs mt-1"
                                  onClick={() => {
                                    setSelectedItemIndex(index);
                                    setShowMaterialSearch(true);
                                  }}
                                >
                                  {item.material_id ? '✏️ Alterar material' : '🔍 Buscar material'}
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Quantidade</Label>
                                <Input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const qty = Number(e.target.value);
                                    updateItem(index, 'quantidade', qty);
                                  }}
                                  min="1"
                                  required
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Unidade</Label>
                                <Input
                                  value={item.unidade || ''}
                                  readOnly
                                  disabled
                                  placeholder="UN"
                                  className="h-10 bg-muted cursor-not-allowed"
                                  title="Unidade definida no cadastro do material"
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs text-muted-foreground">Valor Médio (Últimas Compras)</Label>
                                <div className="h-10 flex items-center px-3 bg-primary/10 rounded-md border border-primary/20">
                                  <span className="font-semibold text-sm text-primary">
                                    R$ {Number(item.valor_medio || item.valor_unitario || 0).toFixed(2)}
                                  </span>
                                </div>
                                {(!item.valor_medio || item.valor_medio === 0) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Nenhuma compra anterior encontrada para este material
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">Observações do Item</Label>
                              <Input
                                value={item.observacoes || ''}
                                onChange={(e) => updateItem(index, 'observacoes', e.target.value)}
                                placeholder="Adicione observações específicas para este item..."
                                className="h-10"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                        </Card>
                      );
                    })}
                      </div>
                  </div>
                </ScrollArea>
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      Total de itens: <strong className="text-foreground">{formData.itens.length}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Valor Médio Estimado:</span>
                      <span className="text-lg font-bold text-primary">
                        R$ {formData.itens.reduce((sum, item) => sum + (item.quantidade * (item.valor_medio || item.valor_unitario || 0)), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo destacado sempre visível */}
            {formData.itens.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resumo da Solicitação</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.itens.length} {formData.itens.length === 1 ? 'item' : 'itens'} • 
                        Valor médio estimado: <span className="font-semibold text-foreground">
                          R$ {formData.itens.reduce((sum, item) => sum + (item.quantidade * (item.valor_medio || item.valor_unitario || 0)), 0).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer fixo com botões */}
      <div className="flex-shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Processando...' : 'Criar Solicitação'}
        </Button>
      </div>

      {/* Modal de busca de material */}
      <MaterialSearchModal
        isOpen={showMaterialSearch}
        onClose={() => {
          setShowMaterialSearch(false);
          setSelectedItemIndex(null);
        }}
        onSelect={handleMaterialSelect}
      />
    </form>
  );
}