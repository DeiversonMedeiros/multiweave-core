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
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Package,
  Truck,
  Percent,
  DollarSign,
  X,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuotes, useDeleteQuote } from '@/hooks/compras/useComprasData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { useActivePartners } from '@/hooks/usePartners';
import { supabase } from '@/integrations/supabase/client';

// Componente principal protegido por permissões
export default function CotacoesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'cotacoes', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Cotações de Preços</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <CotacoesList />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de cotações
function CotacoesList() {
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
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Aprovada':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
      case 'Rejeitada':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    if (!search) return cotacoes;
    return cotacoes.filter((cotacao: any) =>
      cotacao.numero_cotacao?.toLowerCase().includes(search.toLowerCase()) ||
      cotacao.status?.toLowerCase().includes(search.toLowerCase()),
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
            <TableHead>Data Vencimento</TableHead>
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
          ) : (
            filtered.map((cotacao: any) => (
              <TableRow key={cotacao.id}>
                <TableCell className="font-medium">{cotacao.numero_cotacao}</TableCell>
                <TableCell>
                  {cotacao.created_at
                    ? new Date(cotacao.created_at).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>
                  {cotacao.prazo_resposta
                    ? new Date(cotacao.prazo_resposta).toLocaleDateString('pt-BR')
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
          // TODO: Implementar salvamento
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

// Componente Modal Completo de Cotação
interface CotacaoModalProps {
  cotacao: any;
  isOpen: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function CotacaoModal({ cotacao, isOpen, isEditMode, onClose, onSave }: CotacaoModalProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { data: partnersData } = useActivePartners();
  const partners = (partnersData as any)?.data || partnersData || [];
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Aprovada':
      case 'aprovada':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
      case 'Rejeitada':
      case 'reprovada':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const [loading, setLoading] = useState(false);
  const [requisicaoData, setRequisicaoData] = useState<any>(null);
  const [requisicaoItens, setRequisicaoItens] = useState<any[]>([]);
  const [materiaisMap, setMateriaisMap] = useState<Map<string, { nome: string; imagem_url: string | null }>>(new Map());
  const [fornecedoresCotacao, setFornecedoresCotacao] = useState<any[]>([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('');
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    prazo_resposta: '',
    status: 'aberta',
    observacoes: '',
    // Valores
    subtotal: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    acrescimo_percentual: 0,
    acrescimo_valor: 0,
    valor_frete: 0,
    tipo_frete: 'cif',
    forma_envio: 'terrestre',
    // Impostos
    icms: 0,
    ipi: 0,
    pis: 0,
    cofins: 0,
    valor_total: 0,
  });

  // Carregar dados da cotação
  useEffect(() => {
    if (!isOpen || !cotacao || !selectedCompany?.id) {
      // Limpar dados quando o modal fechar
      setRequisicaoItens([]);
      setMateriaisMap(new Map());
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Carregar fornecedores disponíveis
        if (selectedCompany?.id) {
          try {
            const fornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'fornecedores_dados',
              companyId: selectedCompany.id,
              filters: { status: 'ativo' },
              page: 1,
              pageSize: 100,
            });
            setFornecedores(fornecedoresResult.data || []);
          } catch (error) {
            console.warn('Erro ao carregar fornecedores:', error);
          }
        }

        // Carregar dados da requisição
        if (cotacao.requisicao_id) {
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            id: cotacao.requisicao_id,
            companyId: selectedCompany.id,
          });
          setRequisicaoData(requisicao);

          // Carregar itens da requisição
          const itensResult = await EntityService.list({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany.id,
            filters: { requisicao_id: cotacao.requisicao_id },
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });
          const itens = itensResult.data || [];
          setRequisicaoItens(itens);

          // Buscar dados dos materiais usando Supabase diretamente para melhor controle
          const materialIds = [...new Set(itens.map((item: any) => item.material_id).filter(Boolean))];
          console.log('🔍 [CotacaoModal] Buscando materiais. IDs:', materialIds);
          
          if (materialIds.length > 0) {
            const materiaisMap = new Map<string, { nome: string; imagem_url: string | null }>();
            
            try {
              // Buscar materiais da tabela almoxarifado.materiais_equipamentos
              // A tabela public.materials foi removida e migrada para almoxarifado.materiais_equipamentos
              const materiaisResult = await EntityService.list({
                schema: 'almoxarifado',
                table: 'materiais_equipamentos',
                companyId: selectedCompany.id,
                filters: {},
                page: 1,
                pageSize: 1000,
              });

              console.log('🔍 [CotacaoModal] Resultado busca materiais:', {
                encontrados: materiaisResult.data?.length || 0,
                total: materiaisResult.total || 0
              });

              // Filtrar apenas os materiais que precisamos e criar o mapa
              if (materiaisResult.data) {
                const materialIdsStr = materialIds.map(id => String(id));
                
                materiaisResult.data.forEach((material: any) => {
                  const materialIdStr = String(material.id);
                  if (materialIdsStr.includes(materialIdStr)) {
                    materiaisMap.set(materialIdStr, {
                      nome: material.nome || material.descricao || 'Material sem nome',
                      imagem_url: material.imagem_url || null,
                    });
                    console.log(`✅ [CotacaoModal] Material encontrado: ${materialIdStr} -> ${material.nome || material.descricao}`);
                  }
                });
              }

              // Para materiais não encontrados, adicionar placeholder
              materialIds.forEach((materialId: string) => {
                const materialIdStr = String(materialId);
                if (!materiaisMap.has(materialIdStr)) {
                  console.warn(`⚠️ [CotacaoModal] Material não encontrado: ${materialIdStr}`);
                  materiaisMap.set(materialIdStr, {
                    nome: 'Material não encontrado',
                    imagem_url: null,
                  });
                }
              });

              console.log(`✅ [CotacaoModal] Mapa de materiais criado: ${materiaisMap.size} entradas`);
              setMateriaisMap(materiaisMap);
            } catch (error) {
              console.error('❌ [CotacaoModal] Erro ao buscar materiais:', error);
              // Em caso de erro, criar mapa com placeholders
              materialIds.forEach((materialId: string) => {
                materiaisMap.set(String(materialId), {
                  nome: 'Erro ao carregar',
                  imagem_url: null,
                });
              });
              setMateriaisMap(materiaisMap);
            }
          } else {
            console.log('⚠️ [CotacaoModal] Nenhum material_id encontrado nos itens');
            setMateriaisMap(new Map());
          }
        }

        // Carregar fornecedores da cotação
        const fornecedoresResult = await EntityService.list({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: selectedCompany.id,
          filters: { cotacao_id: cotacao.id },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });
        setFornecedoresCotacao(fornecedoresResult.data || []);

        // Preencher formulário
        setFormData({
          prazo_resposta: cotacao.prazo_resposta 
            ? new Date(cotacao.prazo_resposta).toISOString().split('T')[0]
            : '',
          status: cotacao.workflow_state || cotacao.status || 'aberta',
          observacoes: cotacao.observacoes || '',
          subtotal: cotacao.subtotal || 0,
          desconto_percentual: cotacao.desconto_percentual || 0,
          desconto_valor: cotacao.desconto_valor || 0,
          acrescimo_percentual: cotacao.acrescimo_percentual || 0,
          acrescimo_valor: cotacao.acrescimo_valor || 0,
          valor_frete: cotacao.valor_frete || 0,
          tipo_frete: cotacao.tipo_frete || 'cif',
          forma_envio: cotacao.forma_envio || 'terrestre',
          icms: cotacao.icms || 0,
          ipi: cotacao.ipi || 0,
          pis: cotacao.pis || 0,
          cofins: cotacao.cofins || 0,
          valor_total: cotacao.valor_total || 0,
        });
      } catch (error) {
        console.error('Erro ao carregar dados da cotação:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da cotação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, cotacao, selectedCompany]);

  const calcularTotal = () => {
    let total = formData.subtotal;
    total -= formData.desconto_valor;
    total += formData.acrescimo_valor;
    total += formData.valor_frete;
    total += formData.icms + formData.ipi + formData.pis + formData.cofins;
    return total;
  };

  const handleAddFornecedor = async () => {
    if (!selectedFornecedor || !cotacao?.id || !selectedCompany?.id) return;

    try {
      await EntityService.create({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId: selectedCompany.id,
        data: {
          cotacao_id: cotacao.id,
          fornecedor_id: selectedFornecedor,
          status: 'pendente',
        },
        skipCompanyFilter: true,
      });

      // Recarregar fornecedores
      const fornecedoresResult = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId: selectedCompany.id,
        filters: { cotacao_id: cotacao.id },
        page: 1,
        pageSize: 100,
        skipCompanyFilter: true,
      });
      setFornecedoresCotacao(fornecedoresResult.data || []);
      setSelectedFornecedor('');
      
      toast({
        title: "Sucesso",
        description: "Fornecedor adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao adicionar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o fornecedor.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFornecedor = async (fornecedorId: string) => {
    if (!cotacao?.id || !selectedCompany?.id) return;

    try {
      await EntityService.delete({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId: selectedCompany.id,
        id: fornecedorId,
        skipCompanyFilter: true,
      });

      setFornecedoresCotacao(fornecedoresCotacao.filter(f => f.id !== fornecedorId));
      
      toast({
        title: "Sucesso",
        description: "Fornecedor removido com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao remover fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o fornecedor.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!cotacao?.id || !selectedCompany?.id) return;

    try {
      setLoading(true);
      const totalCalculado = calcularTotal();
      
      await EntityService.update({
        schema: 'compras',
        table: 'cotacao_ciclos',
        companyId: selectedCompany.id,
        id: cotacao.id,
        data: {
          prazo_resposta: formData.prazo_resposta,
          workflow_state: formData.status,
          status: formData.status,
          observacoes: formData.observacoes,
          // Valores calculados serão salvos em cotacao_fornecedores
        },
      });

      await onSave({ ...formData, valor_total: totalCalculado });
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a cotação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!cotacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar' : 'Visualizar'} Cotação - {cotacao.numero_cotacao}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Edite todas as informações da cotação'
              : 'Visualize todas as informações da cotação'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="valores">Valores</TabsTrigger>
              <TabsTrigger value="impostos">Impostos</TabsTrigger>
              <TabsTrigger value="frete">Frete</TabsTrigger>
            </TabsList>

            {/* Aba Geral */}
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número da Cotação</Label>
                  <Input value={cotacao.numero_cotacao || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditMode ? (
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="completa">Completa</SelectItem>
                        <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="reprovada">Reprovada</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">{getStatusBadge(cotacao.workflow_state || cotacao.status)}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Data de Criação</Label>
                  <Input 
                    value={cotacao.created_at 
                      ? new Date(cotacao.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--'} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Resposta</Label>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={formData.prazo_resposta}
                      onChange={(e) => setFormData({...formData, prazo_resposta: e.target.value})}
                    />
                  ) : (
                    <Input 
                      value={cotacao.prazo_resposta
                        ? new Date(cotacao.prazo_resposta).toLocaleDateString('pt-BR')
                        : '--'} 
                      disabled 
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Requisição</Label>
                  <Input value={requisicaoData?.numero_requisicao || cotacao.requisicao_id || '--'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input 
                    value={`R$ ${calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    disabled 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                {isEditMode ? (
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    placeholder="Observações adicionais"
                    rows={4}
                  />
                ) : (
                  <Textarea value={cotacao.observacoes || '--'} disabled rows={4} />
                )}
              </div>
            </TabsContent>

            {/* Aba Fornecedores */}
            <TabsContent value="fornecedores" className="space-y-4">
              <div className="space-y-4">
                {isEditMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Adicionar Fornecedor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map((fornecedor: any) => {
                              const partner = partners.find((p: any) => p.id === fornecedor.partner_id);
                              return (
                                <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                  {partner?.nome || fornecedor.partner_id} {partner?.cnpj ? `- ${partner.cnpj}` : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddFornecedor} disabled={!selectedFornecedor}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fornecedores da Cotação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fornecedoresCotacao.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum fornecedor adicionado ainda
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Prazo Entrega</TableHead>
                            <TableHead>Preço Total</TableHead>
                            {isEditMode && <TableHead>Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fornecedoresCotacao.map((fornecedor: any) => {
                            const fornecedorData = fornecedores.find((f: any) => f.id === fornecedor.fornecedor_id);
                            const partner = partners.find((p: any) => p.id === fornecedorData?.partner_id);
                            return (
                              <TableRow key={fornecedor.id}>
                                <TableCell>{partner?.nome || fornecedorData?.partner_id || fornecedor.fornecedor_id}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{fornecedor.status || 'pendente'}</Badge>
                                </TableCell>
                                <TableCell>
                                  {fornecedor.prazo_entrega ? `${fornecedor.prazo_entrega} dias` : '--'}
                                </TableCell>
                                <TableCell>
                                  {fornecedor.preco_total
                                    ? `R$ ${Number(fornecedor.preco_total).toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}`
                                    : '--'}
                                </TableCell>
                                {isEditMode && (
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveFornecedor(fornecedor.id)}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Itens */}
            <TabsContent value="itens" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens da Requisição</CardTitle>
                </CardHeader>
                <CardContent>
                  {requisicaoItens.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum item encontrado
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Valor Unit. Estimado</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requisicaoItens.map((item: any) => {
                          const materialIdStr = item.material_id ? String(item.material_id) : null;
                          const material = materialIdStr ? materiaisMap.get(materialIdStr) : null;
                          const materialNome = material?.nome || item.material_nome || (materialIdStr ? 'Carregando...' : 'Sem material');
                          const materialImagem = material?.imagem_url;
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12 flex-shrink-0">
                                    <AvatarImage 
                                      src={materialImagem || undefined} 
                                      alt={materialNome}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-muted">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{materialNome}</p>
                                    {materialIdStr && material?.nome === 'Material não encontrado' && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        ID: {materialIdStr.substring(0, 8)}...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{item.quantidade}</TableCell>
                              <TableCell>{item.unidade_medida || 'UN'}</TableCell>
                              <TableCell>
                                {item.valor_unitario_estimado
                                  ? `R$ ${Number(item.valor_unitario_estimado).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}`
                                  : '--'}
                              </TableCell>
                              <TableCell>
                                {item.quantidade && item.valor_unitario_estimado
                                  ? `R$ ${(item.quantidade * item.valor_unitario_estimado).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}`
                                  : '--'}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {item.observacoes || '--'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Valores */}
            <TabsContent value="valores" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Valores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.subtotal}
                          onChange={(e) => setFormData({...formData, subtotal: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`R$ ${formData.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.desconto_percentual}
                          onChange={(e) => {
                            const percent = Number(e.target.value);
                            const valor = (formData.subtotal * percent) / 100;
                            setFormData({
                              ...formData,
                              desconto_percentual: percent,
                              desconto_valor: valor,
                            });
                          }}
                        />
                      ) : (
                        <Input value={`${formData.desconto_percentual}%`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (R$)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.desconto_valor}
                          onChange={(e) => setFormData({...formData, desconto_valor: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`R$ ${formData.desconto_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Acréscimo (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.acrescimo_percentual}
                          onChange={(e) => {
                            const percent = Number(e.target.value);
                            const valor = (formData.subtotal * percent) / 100;
                            setFormData({
                              ...formData,
                              acrescimo_percentual: percent,
                              acrescimo_valor: valor,
                            });
                          }}
                        />
                      ) : (
                        <Input value={`${formData.acrescimo_percentual}%`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Acréscimo (R$)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.acrescimo_valor}
                          onChange={(e) => setFormData({...formData, acrescimo_valor: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`R$ ${formData.acrescimo_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
                      )}
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-semibold">Total</Label>
                        <span className="text-lg font-bold">
                          R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Impostos */}
            <TabsContent value="impostos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Impostos e Tributos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ICMS (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.icms}
                          onChange={(e) => setFormData({...formData, icms: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`${formData.icms}%`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>IPI (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.ipi}
                          onChange={(e) => setFormData({...formData, ipi: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`${formData.ipi}%`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>PIS (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.pis}
                          onChange={(e) => setFormData({...formData, pis: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`${formData.pis}%`} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>COFINS (%)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cofins}
                          onChange={(e) => setFormData({...formData, cofins: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`${formData.cofins}%`} disabled />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Frete */}
            <TabsContent value="frete" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Frete e Envio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Frete</Label>
                      {isEditMode ? (
                        <Select value={formData.tipo_frete} onValueChange={(value) => setFormData({...formData, tipo_frete: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cif">CIF - Por conta do fornecedor</SelectItem>
                            <SelectItem value="fob">FOB - Por conta do comprador</SelectItem>
                            <SelectItem value="terceiros">Terceiros</SelectItem>
                            <SelectItem value="sem_frete">Sem frete</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={formData.tipo_frete.toUpperCase()} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Forma de Envio</Label>
                      {isEditMode ? (
                        <Select value={formData.forma_envio} onValueChange={(value) => setFormData({...formData, forma_envio: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="terrestre">Terrestre</SelectItem>
                            <SelectItem value="aereo">Aéreo</SelectItem>
                            <SelectItem value="maritimo">Marítimo</SelectItem>
                            <SelectItem value="ferroviario">Ferroviário</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={formData.forma_envio} disabled />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Valor do Frete (R$)</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.valor_frete}
                          onChange={(e) => setFormData({...formData, valor_frete: Number(e.target.value)})}
                        />
                      ) : (
                        <Input value={`R$ ${formData.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {isEditMode ? 'Cancelar' : 'Fechar'}
          </Button>
          {isEditMode && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente do formulário de nova cotação
function NovaCotacaoForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    data_vencimento: '',
    fornecedor_nome: '',
    requisicao_id: '',
    observacoes: '',
    itens: [] as any[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria a lógica de criação da cotação
    toast({
      title: "Cotação criada",
      description: "A cotação de preços foi criada com sucesso.",
    });
    onClose();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        id: Date.now().toString(),
        material_nome: '',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: 0,
        valor_total: 0,
        observacoes: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Data de Vencimento</Label>
          <Input
            id="data_vencimento"
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fornecedor_nome">Fornecedor</Label>
          <Input
            id="fornecedor_nome"
            value={formData.fornecedor_nome}
            onChange={(e) => setFormData(prev => ({ ...prev, fornecedor_nome: e.target.value }))}
            placeholder="Nome do fornecedor"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requisicao_id">Requisição de Compra</Label>
        <Input
          id="requisicao_id"
          value={formData.requisicao_id}
          onChange={(e) => setFormData(prev => ({ ...prev, requisicao_id: e.target.value }))}
          placeholder="ID da requisição de compra"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          placeholder="Observações adicionais"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Itens da Cotação</Label>
          <Button type="button" onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {formData.itens.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Item {index + 1}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={item.material_nome}
                  onChange={(e) => updateItem(index, 'material_nome', e.target.value)}
                  placeholder="Nome do material"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                  min="1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={item.unidade}
                  onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                  placeholder="UN, KG, etc."
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.valor_unitario}
                  onChange={(e) => updateItem(index, 'valor_unitario', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observações do Item</Label>
                <Input
                  value={item.observacoes}
                  onChange={(e) => updateItem(index, 'observacoes', e.target.value)}
                  placeholder="Observações específicas do item"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar Cotação
        </Button>
      </div>
    </form>
  );
}