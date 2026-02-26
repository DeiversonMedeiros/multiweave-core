import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ArrowDownToLine, 
  Plus, 
  Search, 
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Loader2,
  AlertTriangle,
  Package,
  Calendar,
  Building2,
  Banknote,
  PackageCheck,
  MessageSquare,
  Warehouse
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntradasMateriais, EntradaMaterial } from '@/hooks/almoxarifado/useEntradasMateriaisQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import XMLUploadModal from '@/components/almoxarifado/XMLUploadModal';
import NovaEntradaModal from '@/components/almoxarifado/NovaEntradaModal';
import { toast } from 'sonner';
import { RequirePage } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

const EntradasMateriaisPage: React.FC = () => {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [filterAlmoxarifadoId, setFilterAlmoxarifadoId] = useState<string>('');
  const [filterCentroCustoId, setFilterCentroCustoId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNovaEntradaModal, setShowNovaEntradaModal] = useState(false);
  const [entradaParaEditar, setEntradaParaEditar] = useState<EntradaMaterial | null>(null);

  // Hooks para dados
  const { 
    data: entradas = [], 
    isLoading: loading, 
    error, 
    refetch
  } = useEntradasMateriais({
    status: filterStatus !== 'todos' ? filterStatus : undefined,
    data_inicio: filterDataInicio || undefined,
    data_fim: filterDataFim || undefined,
    search: searchTerm || undefined,
    almoxarifado_id: filterAlmoxarifadoId || undefined,
    centro_custo_id: filterCentroCustoId || undefined,
  });

  const { data: materiais = [] } = useMateriaisEquipamentos();
  const { data: almoxarifados = [] } = useAlmoxarifados();
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];

  // Os filtros são aplicados automaticamente via queryKey

  /** Retorna o status para exibição no badge: "parcial" quando apenas parte dos itens teve entrada confirmada. */
  const getDisplayStatus = (entrada: EntradaMaterial): string => {
    const itens = entrada.itens || [];
    if (itens.length === 0) return entrada.status;
    const comEntrada = itens.filter((i: { entrada_estoque_em?: string }) => !!i.entrada_estoque_em).length;
    if (comEntrada > 0 && comEntrada < itens.length) return 'parcial';
    return entrada.status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: Clock, text: 'Pendente' },
      inspecao: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', icon: FileText, text: 'Em Inspeção' },
      aprovado: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle, text: 'Aprovado' },
      rejeitado: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: XCircle, text: 'Rejeitado' },
      parcial: { color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200', icon: Package, text: 'Parcial' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <RequirePage pagePath="/almoxarifado/entradas*" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <ArrowDownToLine className="inline-block mr-3 h-8 w-8" />
              Entradas de Materiais
            </h1>
            <p className="text-gray-600">
              Recebimento e controle de materiais via NF-e
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload XML
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowNovaEntradaModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nota, código da entrada, pedido ou cotação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="inspecao">Em Inspeção</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAlmoxarifadoId || 'todos'} onValueChange={(v) => setFilterAlmoxarifadoId(v === 'todos' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Almoxarifado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os almoxarifados</SelectItem>
                  {(almoxarifados as { id: string; nome?: string }[]).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome || a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCentroCustoId || 'todos'} onValueChange={(v) => setFilterCentroCustoId(v === 'todos' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os centros de custo</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data início"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
              />

              <Input
                type="date"
                placeholder="Data fim"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando entradas...</p>
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

      {/* Lista de Entradas */}
      {!loading && !error && (
        <div className="space-y-4">
          {entradas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ArrowDownToLine className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma entrada encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece fazendo upload de uma NF-e ou criando uma entrada manual
                </p>
                <Button onClick={() => setShowNovaEntradaModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Entrada
                </Button>
              </CardContent>
            </Card>
          ) : (
            entradas.map((entrada) => {
              const confirmados = entrada.itens?.length
                ? (entrada.itens as { entrada_estoque_em?: string }[]).filter((i) => !!i.entrada_estoque_em).length
                : 0;
              const totalItens = entrada.itens?.length ?? 0;
              return (
              <Card key={entrada.id} className="overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-0">
                  {/* Cabeçalho do card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b bg-muted/30 px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ArrowDownToLine className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground truncate">
                          {entrada.numero_nota || `ENT-${entrada.id.slice(0, 8).toUpperCase()}`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Entrada de materiais
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(getDisplayStatus(entrada))}
                      <TooltipProvider>
                        {(entrada as any).pedido_id && (entrada.status === 'pendente' || entrada.status === 'inspecao') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                className="shrink-0"
                                onClick={() => {
                                  setEntradaParaEditar(entrada);
                                  setShowNovaEntradaModal(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Confirmar recebimento e lançar itens não quarentena no estoque</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Blocos de informação */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{formatDate(entrada.data_entrada)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fornecedor</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5 truncate" title={entrada.fornecedor?.nome || 'N/A'}>
                            {entrada.fornecedor?.nome || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor total</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(entrada.valor_total || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Itens</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</p>
                        </div>
                      </div>
                      {totalItens > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                            <PackageCheck className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmado</p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                              {confirmados}/{totalItens}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Almoxarifados dos itens desta entrada */}
                      {(() => {
                        const ids = [...new Set((entrada.itens || []).map((i: { almoxarifado_id?: string }) => i.almoxarifado_id).filter(Boolean))] as string[];
                        const nomes = ids.map((id) => (almoxarifados as { id: string; nome?: string }[]).find((a) => a.id === id)?.nome).filter(Boolean);
                        if (ids.length === 0) return null;
                        return (
                          <div className="flex items-start gap-3 rounded-lg border bg-card p-4 sm:col-span-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                              <Warehouse className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Almoxarifado(s)</p>
                              <p className="text-sm font-semibold text-foreground mt-0.5 break-words" title={nomes.length > 0 ? nomes.join(', ') : 'N/A'}>
                                {nomes.length > 0 ? nomes.join(', ') : ids.join(', ')}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* NF-e e Observações */}
                    {(entrada.nfe || entrada.observacoes) && (
                      <div className="mt-4 flex flex-col sm:flex-row gap-4 rounded-lg border bg-muted/20 p-4">
                        {entrada.nfe && (
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">NF-e</p>
                              <p className="text-sm text-foreground mt-0.5">
                                {entrada.nfe.numero_nfe}
                                {entrada.nfe.status_sefaz && (
                                  <span className="text-muted-foreground ml-2">· SEFAZ: {entrada.nfe.status_sefaz}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        {entrada.observacoes && (
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">Observações</p>
                              <p className="text-sm text-foreground mt-0.5 line-clamp-2">{entrada.observacoes.replace(/cota\?+\?+/gi, 'cotação')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Upload XML */}
      <XMLUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={(entradaId) => {
          toast.success('Entrada criada com sucesso!');
          refetch();
        }}
      />

      {/* Modal de Nova Entrada Manual / Confirmar Pré-entrada */}
      <NovaEntradaModal
        isOpen={showNovaEntradaModal}
        onClose={() => {
          setShowNovaEntradaModal(false);
          setEntradaParaEditar(null);
        }}
        entradaParaEditar={entradaParaEditar}
        onSuccess={(entradaId) => {
          toast.success(entradaParaEditar ? 'Entrada confirmada com sucesso!' : 'Entrada criada com sucesso!');
          refetch();
          setShowNovaEntradaModal(false);
          setEntradaParaEditar(null);
        }}
      />
    </div>
    </RequirePage>
  );
};

export default EntradasMateriaisPage;
