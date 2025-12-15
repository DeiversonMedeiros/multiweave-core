import React, { useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  FileText
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
import { CotacaoModal } from '@/components/Compras/CotacaoModal';

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

  const getStatusBadge = (status: string) => {
    const statusValue = status || 'pendente';
    switch (statusValue) {
      case 'pendente':
      case 'aguardando_resposta':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
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
    if (!search) return cotacoes;
    return cotacoes.filter((cotacao: any) =>
      cotacao.numero_cotacao?.toLowerCase().includes(search.toLowerCase()) ||
      cotacao.status?.toLowerCase().includes(search.toLowerCase()) ||
      cotacao.workflow_state?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [cotacoes, search]);

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
                <TableCell>{getStatusBadge(cotacao.workflow_state || cotacao.status)}</TableCell>
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
    </div>
  );
}






