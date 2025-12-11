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
  useUpdatePurchaseRequisition,
} from '@/hooks/compras/useComprasData';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import type { MaterialEquipamento } from '@/services/almoxarifado/almoxarifadoService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EntityService } from '@/services/generic/entityService';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useServicesByProject } from '@/hooks/useServices';
import { useUsers } from '@/hooks/useUsers';

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
              <DialogDescription>
                Preencha os dados para criar uma nova solicitação de compra
              </DialogDescription>
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
  const { users } = useUsers();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const [search, setSearch] = useState('');
  const [selectedRequisicao, setSelectedRequisicao] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    centro_custo_id: '',
    projeto_id: '',
    solicitante_id: '',
    data_inicio: '',
    data_fim: '',
    prioridade: '',
  });
  
  // Debug: Log das requisições recebidas
  useEffect(() => {
    console.log('🔍 [RequisicoesList] Total de requisições:', requisicoes.length);
    console.log('🔍 [RequisicoesList] Requisições por status:', 
      requisicoes.reduce((acc: any, req: any) => {
        const status = req.workflow_state || req.status || 'sem_status';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    );
    console.log('🔍 [RequisicoesList] IDs das requisições:', requisicoes.map((r: any) => r.id));
    console.log('🔍 [RequisicoesList] Requisições aprovadas:', 
      requisicoes.filter((r: any) => (r.workflow_state || r.status) === 'aprovada').length
    );
    console.log('🔍 [RequisicoesList] isLoading:', isLoading);
  }, [requisicoes, isLoading]);
  
  // Criar mapa de IDs de usuários para nomes
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(user => {
      map.set(user.id, user.nome);
    });
    return map;
  }, [users]);

  // Criar mapa de IDs de centros de custo para nomes
  const costCentersMap = useMemo(() => {
    const map = new Map<string, string>();
    const costCenters = costCentersData?.data || [];
    costCenters.forEach((cc: any) => {
      map.set(cc.id, cc.nome);
    });
    return map;
  }, [costCentersData]);

  // Criar mapa de IDs de projetos para nomes
  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    const projects = projectsData?.data || [];
    projects.forEach((proj: any) => {
      map.set(proj.id, proj.nome);
    });
    return map;
  }, [projectsData]);

  // Função para capitalizar primeira letra da prioridade
  const capitalizePrioridade = (prioridade: string) => {
    if (!prioridade) return '';
    return prioridade.charAt(0).toUpperCase() + prioridade.slice(1).toLowerCase();
  };

  const getStatusBadge = (status: string) => {
    // Usar status como principal, fallback para workflow_state
    const statusValue = status || 'pendente_aprovacao';
    
    switch (statusValue) {
      case 'pendente_aprovacao':
      case 'rascunho': // Requisições em rascunho também aguardam aprovação
      case 'criada': // Tratamento para requisições antigas
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando Aprovação
          </Badge>
        );
      case 'aprovada':
        return (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case 'rejeitada':
        return (
          <Badge variant="outline" className="text-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejeitada
          </Badge>
        );
      case 'cancelada':
        return (
          <Badge variant="outline" className="text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      case 'reprovada': // Mantido para compatibilidade com dados antigos
        return (
          <Badge variant="outline" className="text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Reprovada
          </Badge>
        );
      default:
        return <Badge variant="outline">{statusValue}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    let result = requisicoes;
    
    // Aplicar busca
    if (search) {
      result = result.filter((req: any) =>
        req.numero_requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        req.workflow_state?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    
    // Aplicar filtros
    if (filters.status) {
      result = result.filter((req: any) => {
        const status = req.status || req.workflow_state || '';
        return status === filters.status;
      });
    }
    
    if (filters.centro_custo_id) {
      result = result.filter((req: any) => req.centro_custo_id === filters.centro_custo_id);
    }
    
    if (filters.projeto_id) {
      result = result.filter((req: any) => req.projeto_id === filters.projeto_id);
    }
    
    if (filters.solicitante_id) {
      result = result.filter((req: any) => req.solicitante_id === filters.solicitante_id);
    }
    
    if (filters.data_inicio) {
      result = result.filter((req: any) => {
        if (!req.data_solicitacao) return false;
        return new Date(req.data_solicitacao) >= new Date(filters.data_inicio);
      });
    }
    
    if (filters.data_fim) {
      result = result.filter((req: any) => {
        if (!req.data_solicitacao) return false;
        const reqDate = new Date(req.data_solicitacao);
        const filterDate = new Date(filters.data_fim);
        filterDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
        return reqDate <= filterDate;
      });
    }
    
    if (filters.prioridade) {
      result = result.filter((req: any) => req.prioridade === filters.prioridade);
    }
    
    // Ordenar por número de requisição (decrescente - última primeiro)
    result = [...result].sort((a: any, b: any) => {
      const numA = a.numero_requisicao || '';
      const numB = b.numero_requisicao || '';
      // Extrair número da requisição (ex: REQ-000009 -> 9)
      const matchA = numA.match(/\d+/);
      const matchB = numB.match(/\d+/);
      const numAInt = matchA ? parseInt(matchA[0], 10) : 0;
      const numBInt = matchB ? parseInt(matchB[0], 10) : 0;
      return numBInt - numAInt; // Ordem decrescente
    });
    
    return result;
  }, [requisicoes, search, filters]);
  
  // Função para exportar dados para CSV
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }
    
    // Preparar dados para exportação
    const exportData = filtered.map((req: any) => {
      const status = req.status || req.workflow_state || 'sem_status';
      const statusLabel = {
        'pendente_aprovacao': 'Aguardando Aprovação',
        'rascunho': 'Aguardando Aprovação',
        'criada': 'Aguardando Aprovação',
        'aprovada': 'Aprovada',
        'rejeitada': 'Rejeitada',
        'cancelada': 'Cancelada',
        'reprovada': 'Reprovada',
      }[status] || status;
      
      return {
        'Número': req.numero_requisicao || '',
        'Data Solicitação': req.data_solicitacao 
          ? new Date(req.data_solicitacao).toLocaleDateString('pt-BR')
          : '',
        'Data Necessidade': req.data_necessidade
          ? new Date(req.data_necessidade).toLocaleDateString('pt-BR')
          : '',
        'Status': statusLabel,
        'Centro de Custo': costCentersMap.get(req.centro_custo_id) || '',
        'Projeto': projectsMap.get(req.projeto_id) || '',
        'Solicitante': usersMap.get(req.solicitante_id) || req.solicitante_nome || '',
        'Prioridade': capitalizePrioridade(req.prioridade || 'normal'),
        'Valor Total Estimado': req.valor_total_estimado
          ? `R$ ${Number(req.valor_total_estimado).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : 'R$ 0,00',
        'Observações': req.observacoes || req.justificativa || '',
      };
    });
    
    // Converter para CSV
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row] || '';
          // Escapar vírgulas e aspas
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `requisicoes_compra_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${exportData.length} requisição(ões) exportada(s) com sucesso`);
  };
  
  // Função para limpar filtros
  const clearFilters = () => {
    setFilters({
      status: '',
      centro_custo_id: '',
      projeto_id: '',
      solicitante_id: '',
      data_inicio: '',
      data_fim: '',
      prioridade: '',
    });
  };
  
  // Contar filtros ativos
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

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
        <Button variant="outline" onClick={() => setShowFiltersDialog(true)}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
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
            <TableHead>Status Aprovação</TableHead>
            <TableHead>Centro de Custo</TableHead>
            <TableHead>Projeto</TableHead>
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
                <TableCell>{getStatusBadge(requisicao.status || requisicao.workflow_state)}</TableCell>
                <TableCell>
                  {requisicao.centro_custo_id
                    ? costCentersMap.get(requisicao.centro_custo_id) || '--'
                    : '--'}
                </TableCell>
                <TableCell>
                  {requisicao.projeto_id
                    ? projectsMap.get(requisicao.projeto_id) || '--'
                    : '--'}
                </TableCell>
                <TableCell>{usersMap.get(requisicao.solicitante_id) || requisicao.solicitante_nome || requisicao.solicitante_id}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedRequisicao(requisicao);
                        setShowViewDialog(true);
                      }}
                    >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                    <PermissionGuard entity="solicitacoes_compra" action="edit" fallback={null}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!canEditEntity || requisicao.status === 'cancelada'}
                        onClick={() => {
                          setSelectedRequisicao(requisicao);
                          setShowEditDialog(true);
                        }}
                        title={requisicao.status === 'cancelada' ? 'Requisições canceladas não podem ser editadas' : 'Editar requisição'}
                      >
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
      
      {/* Dialog de Visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Visualize os detalhes completos da solicitação de compra
            </DialogDescription>
          </DialogHeader>
          {selectedRequisicao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número</Label>
                  <p className="font-medium">{selectedRequisicao.numero_requisicao}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedRequisicao.status || selectedRequisicao.workflow_state)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data Solicitação</Label>
                  <p>{selectedRequisicao.data_solicitacao ? new Date(selectedRequisicao.data_solicitacao).toLocaleDateString('pt-BR') : '--'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data Necessidade</Label>
                  <p>{selectedRequisicao.data_necessidade ? new Date(selectedRequisicao.data_necessidade).toLocaleDateString('pt-BR') : '--'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p>{usersMap.get(selectedRequisicao.solicitante_id) || selectedRequisicao.solicitante_nome || selectedRequisicao.solicitante_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prioridade</Label>
                  <Badge variant={selectedRequisicao.prioridade === 'alta' || selectedRequisicao.prioridade === 'urgente' ? 'destructive' : 'secondary'}>
                    {capitalizePrioridade(selectedRequisicao.prioridade || 'normal')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total Estimado</Label>
                  <p className="font-medium">
                    {selectedRequisicao.valor_total_estimado
                      ? `R$ ${Number(selectedRequisicao.valor_total_estimado).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`
                      : '--'}
                  </p>
                </div>
              </div>
              {selectedRequisicao.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm">{selectedRequisicao.observacoes}</p>
                </div>
              )}
              
              {/* Observações de Aprovação/Rejeição/Cancelamento */}
              {selectedRequisicao.observacoes_aprovacao && (
                <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-amber-900 font-semibold flex items-center gap-2">
                        {selectedRequisicao.status === 'rejeitada' && 'Motivo da Rejeição'}
                        {selectedRequisicao.status === 'cancelada' && 'Motivo do Cancelamento'}
                        {!['rejeitada', 'cancelada'].includes(selectedRequisicao.status) && 'Observações da Aprovação'}
                      </Label>
                      <p className="text-sm text-amber-800 mt-1">{selectedRequisicao.observacoes_aprovacao}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Editar Solicitação de Compra</DialogTitle>
            <DialogDescription>
              Atualize os dados da solicitação de compra
            </DialogDescription>
          </DialogHeader>
          {selectedRequisicao && (
            <EditarSolicitacaoForm 
              requisicao={selectedRequisicao} 
              onClose={() => setShowEditDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Filtros */}
      <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtros de Requisições</DialogTitle>
            <DialogDescription>
              Selecione os filtros para buscar requisições específicas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="filter_status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="pendente_aprovacao">Aguardando Aprovação</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="rejeitada">Rejeitada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Prioridade */}
              <div className="space-y-2">
                <Label htmlFor="filter_prioridade">Prioridade</Label>
                <Select
                  value={filters.prioridade}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, prioridade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Centro de Custo */}
              <div className="space-y-2">
                <Label htmlFor="filter_centro_custo">Centro de Custo</Label>
                <Select
                  value={filters.centro_custo_id}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, centro_custo_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os centros de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {(costCentersData?.data || []).map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Projeto */}
              <div className="space-y-2">
                <Label htmlFor="filter_projeto">Projeto</Label>
                <Select
                  value={filters.projeto_id}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, projeto_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os projetos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {(projectsData?.data || []).map((proj: any) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.codigo} - {proj.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Solicitante */}
              <div className="space-y-2">
                <Label htmlFor="filter_solicitante">Solicitante</Label>
                <Select
                  value={filters.solicitante_id}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, solicitante_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os solicitantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Data Início */}
              <div className="space-y-2">
                <Label htmlFor="filter_data_inicio">Data Solicitação - Início</Label>
                <Input
                  id="filter_data_inicio"
                  type="date"
                  value={filters.data_inicio}
                  onChange={(e) => setFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>
              
              {/* Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="filter_data_fim">Data Solicitação - Fim</Label>
                <Input
                  id="filter_data_fim"
                  type="date"
                  value={filters.data_fim}
                  onChange={(e) => setFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={clearFilters} disabled={activeFiltersCount === 0}>
                Limpar Filtros
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowFiltersDialog(false)}>
                  Fechar
                </Button>
                <Button onClick={() => setShowFiltersDialog(false)}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

// Componente do formulário de edição de solicitação
function EditarSolicitacaoForm({ requisicao, onClose }: { requisicao: any; onClose: () => void }) {
  const updateMutation = useUpdatePurchaseRequisition();
  const { selectedCompany } = useCompany();
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Buscar dados para os selects
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { data: almoxarifados = [] } = useAlmoxarifados();
  
  const costCenters = costCentersData?.data || [];
  const allProjects = projectsData?.data || [];
  
  const [formData, setFormData] = useState({
    data_necessidade: '',
    prioridade: 'normal',
    centro_custo_id: '',
    projeto_id: '',
    service_id: '',
    tipo_requisicao: '' as '' | 'reposicao' | 'compra_direta' | 'emergencial',
    destino_almoxarifado_id: '',
    local_entrega: '',
    observacoes: '',
    itens: [] as RequisicaoItem[],
  });
  
  // Estados para busca nos selects
  const [costCenterSearch, setCostCenterSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  
  // Carregar dados da requisição e seus itens
  useEffect(() => {
    const loadRequisicaoData = async () => {
      if (!selectedCompany?.id || !requisicao?.id) return;
      
      setLoading(true);
      try {
        // Buscar itens da requisição
        // Nota: requisicao_itens não tem company_id, então usamos skipCompanyFilter
        // A segurança é garantida pelo filtro requisicao_id que referencia uma requisição com company_id
        const itensResult = await EntityService.list({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId: selectedCompany.id,
          filters: { requisicao_id: requisicao.id },
          page: 1,
          pageSize: 1000,
          orderBy: 'created_at',
          orderDirection: 'DESC',
          skipCompanyFilter: true, // Tabela não tem company_id diretamente
        });

        const itens = itensResult.data || [];

        // Buscar dados dos materiais para cada item
        const itensCompletos = await Promise.all(
          itens.map(async (item: any) => {
            // Buscar dados do material
            const materialResult = await EntityService.list({
              schema: 'almoxarifado',
              table: 'materiais_equipamentos',
              companyId: selectedCompany.id,
              filters: { id: item.material_id },
              page: 1,
              pageSize: 1,
            });

            const material = materialResult.data?.[0] || {};
            
            return {
              id: item.id,
              material_id: item.material_id,
              material_nome: material.nome || material.descricao || 'Material não encontrado',
              material_codigo: material.codigo_interno,
              material_imagem_url: material.imagem_url,
              quantidade: Number(item.quantidade),
              unidade: item.unidade_medida || 'UN',
              valor_unitario: Number(item.valor_unitario_estimado || 0),
              valor_total: Number(item.quantidade) * Number(item.valor_unitario_estimado || 0),
              valor_medio: Number(item.valor_unitario_estimado || 0),
              observacoes: item.observacoes || '',
              almoxarifado_id: item.almoxarifado_id,
            };
          })
        );

        // Formatar data de necessidade
        const dataNecessidade = requisicao.data_necessidade
          ? new Date(requisicao.data_necessidade).toISOString().split('T')[0]
          : '';

        setFormData({
          data_necessidade: dataNecessidade,
          prioridade: requisicao.prioridade || 'normal',
          centro_custo_id: requisicao.centro_custo_id || '',
          projeto_id: requisicao.projeto_id || '',
          service_id: requisicao.service_id || '',
          tipo_requisicao: requisicao.tipo_requisicao || '',
          destino_almoxarifado_id: requisicao.destino_almoxarifado_id || '',
          local_entrega: requisicao.local_entrega || '',
          observacoes: requisicao.observacoes || requisicao.justificativa || '',
          itens: itensCompletos,
        });
      } catch (error) {
        console.error('Erro ao carregar dados da requisição:', error);
        toast.error('Erro ao carregar dados da requisição');
      } finally {
        setLoading(false);
      }
    };

    loadRequisicaoData();
  }, [requisicao?.id, selectedCompany?.id]);
  
  // Filtrar centros de custo pela busca
  const filteredCostCenters = useMemo(() => {
    if (!costCenterSearch) return costCenters;
    const searchLower = costCenterSearch.toLowerCase();
    return costCenters.filter((cc: any) => 
      cc.codigo?.toLowerCase().includes(searchLower) || 
      cc.nome?.toLowerCase().includes(searchLower)
    );
  }, [costCenters, costCenterSearch]);
  
  // Filtrar projetos pelo centro de custo selecionado
  const projects = useMemo(() => {
    if (!formData.centro_custo_id) return [];
    
    // Debug: verificar os dados
    console.log('🔍 [DEBUG] Filtrando projetos:', {
      centro_custo_id: formData.centro_custo_id,
      totalProjetos: allProjects.length,
      projetosComCostCenter: allProjects.filter((p: any) => p.cost_center_id).length,
      projetosSample: allProjects.slice(0, 3).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        cost_center_id: p.cost_center_id,
        costCenterMatch: p.cost_center_id === formData.centro_custo_id
      }))
    });
    
    const filtered = allProjects.filter((proj: any) => {
      // Comparar como string para garantir que funcione
      const projCostCenter = proj.cost_center_id?.toString();
      const selectedCostCenter = formData.centro_custo_id?.toString();
      return projCostCenter === selectedCostCenter;
    });
    
    console.log('🔍 [DEBUG] Projetos filtrados:', {
      count: filtered.length,
      projetos: filtered.map((p: any) => ({ codigo: p.codigo, nome: p.nome }))
    });
    
    return filtered;
  }, [allProjects, formData.centro_custo_id]);
  
  // Filtrar projetos pela busca
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const searchLower = projectSearch.toLowerCase();
    return projects.filter((proj: any) => 
      proj.codigo?.toLowerCase().includes(searchLower) || 
      proj.nome?.toLowerCase().includes(searchLower)
    );
  }, [projects, projectSearch]);
  
  // Buscar serviços do projeto selecionado
  const { data: servicesData } = useServicesByProject(formData.projeto_id || undefined);
  const services = servicesData?.data || [];

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
      
      const result = data as { valorMedio?: number; valorMedioFormatado?: string } | null;
      return result?.valorMedio || 0;
    } catch (error) {
      console.error('Erro ao buscar valor médio:', error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    // Validações obrigatórias
    if (!formData.data_necessidade) {
      toast.error('Selecione a data de necessidade');
      return;
    }
    
    if (!formData.tipo_requisicao) {
      toast.error('Selecione o tipo da requisição');
      return;
    }
    
    if (!formData.centro_custo_id) {
      toast.error('Selecione o centro de custo');
      return;
    }
    
    if (!formData.projeto_id) {
      toast.error('Selecione o projeto');
      return;
    }
    
    if (!formData.service_id) {
      toast.error('Selecione o serviço');
      return;
    }
    
    // Validações condicionais conforme tipo de requisição
    if (formData.tipo_requisicao === 'reposicao' && !formData.destino_almoxarifado_id) {
      toast.error('Selecione o almoxarifado de destino para requisições de reposição');
      return;
    }
    
    if (formData.tipo_requisicao === 'compra_direta' && !formData.local_entrega) {
      toast.error('Informe o local de entrega para compras diretas');
      return;
    }
    
    if (formData.itens.length === 0) {
      toast.error('Adicione pelo menos um item à solicitação');
      return;
    }
    
    try {
      await updateMutation.mutateAsync({
        id: requisicao.id,
        payload: {
          data_necessidade: formData.data_necessidade,
          prioridade: formData.prioridade,
          centro_custo_id: formData.centro_custo_id,
          projeto_id: formData.projeto_id,
          service_id: formData.service_id || undefined,
          tipo_requisicao: formData.tipo_requisicao as 'reposicao' | 'compra_direta' | 'emergencial',
          destino_almoxarifado_id:
            formData.tipo_requisicao === 'reposicao' ? formData.destino_almoxarifado_id : undefined,
          local_entrega: formData.tipo_requisicao === 'compra_direta' ? formData.local_entrega : undefined,
          justificativa: formData.observacoes,
          observacoes: formData.observacoes,
          itens: formData.itens.map((item) => ({
            id: item.id, // Incluir ID para atualização
            material_id: item.material_id,
            quantidade: item.quantidade,
            unidade_medida: item.unidade,
            valor_unitario_estimado: item.valor_medio || item.valor_unitario || 0,
            observacoes: item.observacoes,
            almoxarifado_id: formData.destino_almoxarifado_id || undefined,
          })),
        },
    });
    onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar solicitação:', error);
      const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido ao atualizar solicitação';
      toast.error(`Erro: ${errorMessage}`);
    }
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
        material_nome: material.nome || material.descricao,
        material_codigo: material.codigo_interno,
        material_imagem_url: material.imagem_url,
        quantidade: 1,
        unidade: material.unidade_medida || 'UN',
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

  if (loading) {
  return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando dados da requisição...</p>
      </div>
    );
  }

  // Bloquear edição se a requisição estiver cancelada
  if (requisicao?.status === 'cancelada') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Requisição Cancelada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Requisições canceladas não podem ser editadas.
          </p>
          {requisicao.observacoes_aprovacao && (
            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 max-w-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-amber-900 font-semibold">Motivo do Cancelamento</Label>
                  <p className="text-sm text-amber-800 mt-1">{requisicao.observacoes_aprovacao}</p>
                </div>
              </div>
            </div>
          )}
          <Button onClick={onClose} className="mt-4">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  // Reutilizar o mesmo JSX do NovaSolicitacaoForm
  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Body com scroll - reutilizar o mesmo conteúdo do NovaSolicitacaoForm */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <div className="space-y-6">
          {/* Primeira linha: Data, Prioridade, Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
              <Label htmlFor="data_necessidade">Data de Necessidade *</Label>
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
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_requisicao">Tipo da Requisição *</Label>
              <Select
                value={formData.tipo_requisicao || ''}
                onValueChange={(value: 'reposicao' | 'compra_direta' | 'emergencial') =>
                  setFormData(prev => ({ ...prev, tipo_requisicao: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de requisição" />
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

          {/* Segunda linha: Centro de Custo, Projeto, Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
              <Label htmlFor="centro_custo">Centro de Custo *</Label>
              <Select
                value={formData.centro_custo_id || ''}
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    centro_custo_id: value,
                    projeto_id: '',
                    service_id: ''
                  }));
                  setCostCenterSearch('');
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    setCostCenterSearch('');
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
                        placeholder="Buscar centro de custo..."
                        value={costCenterSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCostCenterSearch(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredCostCenters.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum centro de custo encontrado</div>
                    ) : (
                      filteredCostCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id || 'unknown'}>
                          {cc.codigo} - {cc.nome}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projeto_id">Projeto *</Label>
              <Select
                value={formData.projeto_id || ''}
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    projeto_id: value,
                    service_id: ''
                  }));
                  setProjectSearch('');
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    setProjectSearch('');
                  }
                }}
                disabled={!formData.centro_custo_id}
          required
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.centro_custo_id ? "Selecione o projeto" : "Selecione primeiro o centro de custo"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar projeto..."
                        value={projectSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setProjectSearch(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pl-8 h-9"
                        disabled={!formData.centro_custo_id}
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {formData.centro_custo_id ? "Nenhum projeto encontrado" : "Selecione primeiro o centro de custo"}
                      </div>
                    ) : (
                      filteredProjects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id || 'unknown'}>
                          {proj.codigo} - {proj.nome}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
      </div>

            <div className="space-y-2">
              <Label htmlFor="service_id">Serviço *</Label>
              <Select
                value={formData.service_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, service_id: value || '' }))}
                disabled={!formData.projeto_id}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.projeto_id ? "Selecione o serviço" : "Selecione primeiro o projeto"} />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {formData.projeto_id ? "Nenhum serviço disponível para este projeto" : "Selecione primeiro o projeto"}
                    </div>
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id || 'unknown'}>
                        {service.codigo} - {service.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_requisicao === 'reposicao' && (
              <div className="space-y-2">
                <Label htmlFor="destino_almoxarifado_id">Almoxarifado / Localização *</Label>
                <Select
                  value={formData.destino_almoxarifado_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, destino_almoxarifado_id: value }))}
                  required
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
                <Label htmlFor="local_entrega">Local de Entrega *</Label>
                <Select
                  value={formData.local_entrega && ['Almoxarifado Central', 'Obra Principal', 'Escritório', 'Depósito'].includes(formData.local_entrega) ? formData.local_entrega : (formData.local_entrega ? 'custom' : '')}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setFormData(prev => ({ ...prev, local_entrega: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, local_entrega: value }));
                    }
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local de entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Almoxarifado Central">Almoxarifado Central</SelectItem>
                    <SelectItem value="Obra Principal">Obra Principal</SelectItem>
                    <SelectItem value="Escritório">Escritório</SelectItem>
                    <SelectItem value="Depósito">Depósito</SelectItem>
                    <SelectItem value="custom">Outro (personalizado)</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Seção de Itens - Reutilizar o mesmo código do NovaSolicitacaoForm */}
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
              <div className="border rounded-lg bg-background overflow-hidden">
                <ScrollArea className="h-[60vh]">
                  <div className="p-4">
                    <div className="space-y-4">
        {formData.itens.map((item, index) => (
                        <Card key={item.id} className="border-2 hover:border-primary/40 transition-colors">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
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
                      ))}
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
        <Button type="submit" disabled={updateMutation.isPending || loading}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
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
  const allProjects = projectsData?.data || [];
  
  const [formData, setFormData] = useState({
    data_necessidade: '',
    prioridade: 'normal',
    centro_custo_id: '',
    projeto_id: '',
    service_id: '',
    tipo_requisicao: '' as '' | 'reposicao' | 'compra_direta' | 'emergencial',
    destino_almoxarifado_id: '',
    local_entrega: '',
    observacoes: '',
    itens: [] as RequisicaoItem[],
  });
  
  // Estados para busca nos selects
  const [costCenterSearch, setCostCenterSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  
  // Filtrar centros de custo pela busca
  const filteredCostCenters = useMemo(() => {
    if (!costCenterSearch) return costCenters;
    const searchLower = costCenterSearch.toLowerCase();
    return costCenters.filter((cc: any) => 
      cc.codigo?.toLowerCase().includes(searchLower) || 
      cc.nome?.toLowerCase().includes(searchLower)
    );
  }, [costCenters, costCenterSearch]);
  
  // Filtrar projetos pelo centro de custo selecionado
  const projects = useMemo(() => {
    if (!formData.centro_custo_id) return [];
    
    // Debug: verificar os dados
    console.log('🔍 [DEBUG] Filtrando projetos:', {
      centro_custo_id: formData.centro_custo_id,
      totalProjetos: allProjects.length,
      projetosComCostCenter: allProjects.filter((p: any) => p.cost_center_id).length,
      projetosSample: allProjects.slice(0, 3).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        cost_center_id: p.cost_center_id,
        costCenterMatch: p.cost_center_id === formData.centro_custo_id
      }))
    });
    
    const filtered = allProjects.filter((proj: any) => {
      // Comparar como string para garantir que funcione
      const projCostCenter = proj.cost_center_id?.toString();
      const selectedCostCenter = formData.centro_custo_id?.toString();
      return projCostCenter === selectedCostCenter;
    });
    
    console.log('🔍 [DEBUG] Projetos filtrados:', {
      count: filtered.length,
      projetos: filtered.map((p: any) => ({ codigo: p.codigo, nome: p.nome }))
    });
    
    return filtered;
  }, [allProjects, formData.centro_custo_id]);
  
  // Filtrar projetos pela busca
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const searchLower = projectSearch.toLowerCase();
    return projects.filter((proj: any) => 
      proj.codigo?.toLowerCase().includes(searchLower) || 
      proj.nome?.toLowerCase().includes(searchLower)
    );
  }, [projects, projectSearch]);
  
  // Buscar serviços do projeto selecionado
  const { data: servicesData } = useServicesByProject(formData.projeto_id || undefined);
  const services = servicesData?.data || [];

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
    
    // Validações obrigatórias
    if (!formData.data_necessidade) {
      toast.error('Selecione a data de necessidade');
      return;
    }
    
    if (!formData.tipo_requisicao) {
      toast.error('Selecione o tipo da requisição');
      return;
    }
    
    if (!formData.centro_custo_id) {
      toast.error('Selecione o centro de custo');
      return;
    }
    
    if (!formData.projeto_id) {
      toast.error('Selecione o projeto');
      return;
    }
    
    if (!formData.service_id) {
      toast.error('Selecione o serviço');
      return;
    }
    
    // Validações condicionais conforme tipo de requisição
    if (formData.tipo_requisicao === 'reposicao' && !formData.destino_almoxarifado_id) {
      toast.error('Selecione o almoxarifado de destino para requisições de reposição');
      return;
    }
    
    if (formData.tipo_requisicao === 'compra_direta' && !formData.local_entrega) {
      toast.error('Informe o local de entrega para compras diretas');
      return;
    }
    
    if (formData.itens.length === 0) {
      toast.error('Adicione pelo menos um item à solicitação');
      return;
    }
    
    // Verificar se há materiais duplicados antes de enviar
    const materialCounts = new Map<string, number>();
    formData.itens.forEach(item => {
      const count = materialCounts.get(item.material_id) || 0;
      materialCounts.set(item.material_id, count + 1);
    });
    
    const materiaisDuplicados = Array.from(materialCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([material_id]) => {
        const item = formData.itens.find(i => i.material_id === material_id);
        return item?.material_nome || material_id;
      });
    
    if (materiaisDuplicados.length > 0) {
      toast.info(
        `Materiais duplicados serão agrupados automaticamente: ${materiaisDuplicados.join(', ')}. As quantidades serão somadas.`,
        { duration: 5000 }
      );
    }
    
    try {
      await createMutation.mutateAsync({
        data_necessidade: formData.data_necessidade,
        prioridade: formData.prioridade,
        centro_custo_id: formData.centro_custo_id,
        projeto_id: formData.projeto_id,
        service_id: formData.service_id || undefined,
        tipo_requisicao: formData.tipo_requisicao as 'reposicao' | 'compra_direta' | 'emergencial',
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
    } catch (error: any) {
      // Erro já será tratado pelo hook de mutação
      console.error('Erro ao criar solicitação:', error);
      const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido ao criar solicitação';
      toast.error(`Erro: ${errorMessage}`);
    }
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
              <Label htmlFor="data_necessidade">Data de Necessidade *</Label>
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
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_requisicao">Tipo da Requisição *</Label>
              <Select
                value={formData.tipo_requisicao || ''}
                onValueChange={(value: 'reposicao' | 'compra_direta' | 'emergencial') =>
                  setFormData(prev => ({ ...prev, tipo_requisicao: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de requisição" />
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

          {/* Segunda linha: Centro de Custo, Projeto, Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centro_custo">Centro de Custo *</Label>
              <Select
                value={formData.centro_custo_id || ''}
                onValueChange={(value) => {
                  // Limpar projeto e serviço quando mudar o centro de custo
                  setFormData(prev => ({ 
                    ...prev, 
                    centro_custo_id: value,
                    projeto_id: '',
                    service_id: ''
                  }));
                  setCostCenterSearch(''); // Limpar busca ao selecionar
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    setCostCenterSearch(''); // Limpar busca ao fechar
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                        placeholder="Buscar centro de custo..."
                        value={costCenterSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCostCenterSearch(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredCostCenters.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum centro de custo encontrado</div>
                    ) : (
                      filteredCostCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id || 'unknown'}>
                          {cc.codigo} - {cc.nome}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projeto_id">Projeto *</Label>
              <Select
                value={formData.projeto_id || ''}
                onValueChange={(value) => {
                  // Limpar serviço quando mudar o projeto
                  setFormData(prev => ({ 
                    ...prev, 
                    projeto_id: value,
                    service_id: ''
                  }));
                  setProjectSearch(''); // Limpar busca ao selecionar
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    setProjectSearch(''); // Limpar busca ao fechar
                  }
                }}
                disabled={!formData.centro_custo_id}
                  required
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.centro_custo_id ? "Selecione o projeto" : "Selecione primeiro o centro de custo"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar projeto..."
                        value={projectSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setProjectSearch(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pl-8 h-9"
                        disabled={!formData.centro_custo_id}
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {formData.centro_custo_id ? "Nenhum projeto encontrado" : "Selecione primeiro o centro de custo"}
                      </div>
                    ) : (
                      filteredProjects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id || 'unknown'}>
                          {proj.codigo} - {proj.nome}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
              </div>
              
              <div className="space-y-2">
              <Label htmlFor="service_id">Serviço *</Label>
              <Select
                value={formData.service_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, service_id: value || '' }))}
                disabled={!formData.projeto_id}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.projeto_id ? "Selecione o serviço" : "Selecione primeiro o projeto"} />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {formData.projeto_id ? "Nenhum serviço disponível para este projeto" : "Selecione primeiro o projeto"}
                    </div>
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id || 'unknown'}>
                        {service.codigo} - {service.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_requisicao === 'reposicao' && (
              <div className="space-y-2">
                <Label htmlFor="destino_almoxarifado_id">Almoxarifado / Localização *</Label>
                <Select
                  value={formData.destino_almoxarifado_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, destino_almoxarifado_id: value }))}
                  required
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
                <Label htmlFor="local_entrega">Local de Entrega *</Label>
                <Select
                  value={formData.local_entrega && ['Almoxarifado Central', 'Obra Principal', 'Escritório', 'Depósito'].includes(formData.local_entrega) ? formData.local_entrega : (formData.local_entrega ? 'custom' : '')}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setFormData(prev => ({ ...prev, local_entrega: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, local_entrega: value }));
                    }
                  }}
                  required
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
                {formData.local_entrega && ['Almoxarifado Central', 'Obra Principal', 'Escritório', 'Depósito'].includes(formData.local_entrega) && (
                  <p className="text-xs text-muted-foreground mt-1">Local selecionado: {formData.local_entrega}</p>
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