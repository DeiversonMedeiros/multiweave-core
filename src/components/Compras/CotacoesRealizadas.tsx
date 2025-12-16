import React, { useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuotes, useDeleteQuote } from '@/hooks/compras/useComprasData';
import { useCompany } from '@/lib/company-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CotacaoModal } from '@/components/Compras/CotacaoModal';

interface FiltrosCotacoes {
  status: string;
  dataInicio: string;
  dataFim: string;
  fornecedor: string;
  valorMin: string;
  valorMax: string;
}

export function CotacoesRealizadas() {
  const { canEditEntity, canDeleteEntity } = usePermissions();
  const { data: cotacoes = [], isLoading } = useQuotes();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const deleteQuoteMutation = useDeleteQuote();
  const [search, setSearch] = useState('');
  const [selectedCotacao, setSelectedCotacao] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosCotacoes>({
    status: 'all',
    dataInicio: '',
    dataFim: '',
    fornecedor: '',
    valorMin: '',
    valorMax: '',
  });

  const getStatusBadge = (status: string, workflowState?: string) => {
    const statusValue = workflowState || status || 'pendente';
    switch (statusValue) {
      case 'pendente':
      case 'aguardando_resposta':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'em_aprovacao':
        return <Badge variant="outline" className="text-orange-600"><Clock className="h-3 w-3 mr-1" />Aguardando Aprovação</Badge>;
      case 'aprovada':
      case 'completa':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
      case 'rejeitada':
      case 'reprovada':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      case 'aberta':
      case 'em_cotacao':
        return <Badge variant="outline" className="text-blue-600"><Clock className="h-3 w-3 mr-1" />Aberta</Badge>;
      case 'vencida':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Vencida</Badge>;
      default:
        return <Badge variant="outline">{statusValue}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    let result = cotacoes;

    // Filtro de busca por texto
    if (search) {
      result = result.filter((cotacao: any) =>
        cotacao.numero_cotacao?.toLowerCase().includes(search.toLowerCase()) ||
        cotacao.status?.toLowerCase().includes(search.toLowerCase()) ||
        cotacao.workflow_state?.toLowerCase().includes(search.toLowerCase()) ||
        cotacao.fornecedor_nome?.toLowerCase().includes(search.toLowerCase()) ||
        cotacao.numero_requisicao?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Filtro por status
    if (filtros.status && filtros.status !== 'all') {
      result = result.filter((cotacao: any) => {
        const status = cotacao.workflow_state || cotacao.status;
        return status === filtros.status;
      });
    }

    // Filtro por data de criação
    if (filtros.dataInicio) {
      result = result.filter((cotacao: any) => {
        if (!cotacao.created_at) return false;
        const dataCotacao = new Date(cotacao.created_at);
        const dataInicio = new Date(filtros.dataInicio);
        return dataCotacao >= dataInicio;
      });
    }

    if (filtros.dataFim) {
      result = result.filter((cotacao: any) => {
        if (!cotacao.created_at) return false;
        const dataCotacao = new Date(cotacao.created_at);
        const dataFim = new Date(filtros.dataFim);
        dataFim.setHours(23, 59, 59, 999); // Incluir o dia inteiro
        return dataCotacao <= dataFim;
      });
    }

    // Filtro por fornecedor
    if (filtros.fornecedor) {
      result = result.filter((cotacao: any) =>
        cotacao.fornecedor_nome?.toLowerCase().includes(filtros.fornecedor.toLowerCase()) ||
        cotacao.fornecedor_id === filtros.fornecedor
      );
    }

    // Filtro por valor mínimo
    if (filtros.valorMin) {
      const valorMin = parseFloat(filtros.valorMin);
      result = result.filter((cotacao: any) => {
        const valor = parseFloat(cotacao.valor_total || 0);
        return valor >= valorMin;
      });
    }

    // Filtro por valor máximo
    if (filtros.valorMax) {
      const valorMax = parseFloat(filtros.valorMax);
      result = result.filter((cotacao: any) => {
        const valor = parseFloat(cotacao.valor_total || 0);
        return valor <= valorMax;
      });
    }

    return result;
  }, [cotacoes, search, filtros]);

  const hasActiveFilters = useMemo(() => {
    return (
      filtros.status !== 'all' ||
      filtros.dataInicio !== '' ||
      filtros.dataFim !== '' ||
      filtros.fornecedor !== '' ||
      filtros.valorMin !== '' ||
      filtros.valorMax !== ''
    );
  }, [filtros]);

  const clearFilters = () => {
    setFiltros({
      status: 'all',
      dataInicio: '',
      dataFim: '',
      fornecedor: '',
      valorMin: '',
      valorMax: '',
    });
  };

  const handleView = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setIsViewModalOpen(true);
    setIsEditModalOpen(false);
  };

  const handleEdit = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setIsEditModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleDelete = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCotacao || !selectedCompany?.id) return;
    
    try {
      await deleteQuoteMutation.mutateAsync(selectedCotacao.id);
      setIsDeleteConfirmOpen(false);
      setSelectedCotacao(null);
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar cotações..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsFiltersOpen(true)}
          className={hasActiveFilters ? 'bg-primary/10 border-primary' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              !
            </Badge>
          )}
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
            <TableHead>Data Cotação</TableHead>
            <TableHead>Data Limite</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Requisição</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Carregando cotações...
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Nenhuma cotação encontrada
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((cotacao: any) => (
              <TableRow key={cotacao.id}>
                <TableCell className="font-medium">{cotacao.numero_cotacao || '—'}</TableCell>
                <TableCell>
                  {cotacao.created_at
                    ? new Date(cotacao.created_at).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>
                  {cotacao.prazo_resposta || cotacao.data_validade
                    ? new Date(cotacao.prazo_resposta || cotacao.data_validade).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>{getStatusBadge(cotacao.status, cotacao.workflow_state)}</TableCell>
                <TableCell>
                  {cotacao.fornecedor_nome || cotacao.fornecedor_id || 'Aguardando fornecedores'}
                </TableCell>
                <TableCell>
                  {cotacao.valor_total
                    ? `R$ ${Number(cotacao.valor_total).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : '--'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {cotacao.numero_requisicao ? (
                      cotacao.numero_requisicao
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {cotacao.requisicao_id ? cotacao.requisicao_id.substring(0, 8) + '...' : '—'}
                      </span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleView(cotacao)}
                      title="Visualizar cotação"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <PermissionGuard entity="cotacoes" action="edit" fallback={null}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!canEditEntity}
                        onClick={() => handleEdit(cotacao)}
                        title="Editar cotação"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard entity="cotacoes" action="delete" fallback={null}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={!canDeleteEntity}
                        onClick={() => handleDelete(cotacao)}
                        title="Excluir cotação"
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

      {/* Modal Completo de Cotação */}
      <CotacaoModal
        cotacao={selectedCotacao}
        isOpen={isViewModalOpen || isEditModalOpen}
        isEditMode={isEditModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCotacao(null);
        }}
        onSave={async (data) => {
          toast({
            title: "Sucesso",
            description: "Cotação atualizada com sucesso.",
          });
          setIsEditModalOpen(false);
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a cotação {selectedCotacao?.numero_cotacao}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros */}
      <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtros de Cotações</DialogTitle>
            <DialogDescription>
              Aplique filtros para encontrar cotações específicas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filtro por Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filtros.status}
                onValueChange={(value) => setFiltros({ ...filtros, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                  <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                  <SelectItem value="reprovada">Reprovada</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                />
              </div>
            </div>

            {/* Filtro por Fornecedor */}
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                placeholder="Buscar por nome do fornecedor"
                value={filtros.fornecedor}
                onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
              />
            </div>

            {/* Filtro por Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorMin">Valor Mínimo (R$)</Label>
                <Input
                  id="valorMin"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filtros.valorMin}
                  onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorMax">Valor Máximo (R$)</Label>
                <Input
                  id="valorMax"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filtros.valorMax}
                  onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value })}
                />
              </div>
            </div>

            {/* Indicador de filtros ativos */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Filtros ativos aplicados
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
            <Button onClick={() => setIsFiltersOpen(false)}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}






