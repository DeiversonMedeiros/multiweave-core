import React, { useState, useMemo } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  Download,
  Search,
  Calendar,
  RefreshCw,
  X,
} from 'lucide-react';
import { useFollowUp, FollowUpComprasItem, FollowUpComprasFilters } from '@/hooks/compras/useComprasData';
import { FollowUpCard } from '@/components/Compras/FollowUpCard';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsers } from '@/hooks/useUsers';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '@/services/compras/purchaseService';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  FileText,
  ShoppingCart,
  Package,
  CreditCard,
  Warehouse,
} from 'lucide-react';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useServicesByProject } from '@/hooks/useServices';
import { useActivePartners } from '@/hooks/usePartners';
import { cn } from '@/lib/utils';

// Componente principal protegido por permissões
export default function FollowUpComprasPage() {
  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'page', 
        name: '/compras/follow-up*', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Follow-up de Compras</h1>
        </div>

        <FollowUpContent />
      </div>
    </RequireAuth>
  );
}

function FollowUpContent() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<FollowUpComprasFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FollowUpComprasItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: followUpData = [], isLoading, refetch } = useFollowUp(filters);
  const { data: users = [] } = useUsers(selectedCompany?.id || '');

  // Buscar fornecedores para o filtro
  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const result = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId: selectedCompany.id,
      });
      return result.data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Filtrar dados localmente por termo de busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return followUpData;

    const term = searchTerm.toLowerCase();
    return followUpData.filter((item) => {
      return (
        item.numero_requisicao?.toLowerCase().includes(term) ||
        item.numero_cotacao?.toLowerCase().includes(term) ||
        item.numero_pedido?.toLowerCase().includes(term) ||
        item.solicitante_nome?.toLowerCase().includes(term) ||
        item.fornecedor_nome?.toLowerCase().includes(term) ||
        item.numero_nota_fiscal?.toLowerCase().includes(term)
      );
    });
  }, [followUpData, searchTerm]);

  // Agrupar por cotação: um card por cotação (ou por requisição quando não há cotação)
  const groupedCards = useMemo(() => {
    const byKey = new Map<string, FollowUpComprasItem[]>();
    for (const item of filteredData) {
      const key = item.numero_cotacao
        ? `cot-${item.numero_cotacao}`
        : `req-${item.requisicao_id}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(item);
    }
    return Array.from(byKey.entries()).map(([, items]) => {
      const first = items[0];
      // Quando há múltiplos pedidos/contas para a mesma cotação,
      // a função de follow-up retorna uma linha por combinação,
      // então precisamos deduplicar os números de requisição.
      const numerosUnicos = Array.from(
        new Set(items.map((i) => i.numero_requisicao).filter(Boolean))
      );
      // Extrair todos os pedidos únicos (uma cotação pode gerar vários pedidos)
      const pedidosMap = new Map<string, NonNullable<FollowUpComprasItem['pedidos']>[0]>();
      const contasMap = new Map<string, NonNullable<FollowUpComprasItem['contas']>[0]>();
      for (const i of items) {
        if (i.pedido_id && !pedidosMap.has(i.pedido_id)) {
          pedidosMap.set(i.pedido_id, {
            pedido_id: i.pedido_id,
            numero_pedido: i.numero_pedido,
            fornecedor_nome: i.fornecedor_nome,
            data_pedido: i.data_pedido,
            data_entrega_prevista: i.data_entrega_prevista,
            data_entrega_real: i.data_entrega_real,
            pedido_status: i.pedido_status,
            pedido_workflow_state: i.pedido_workflow_state,
            pedido_valor_total: i.pedido_valor_total,
            pedido_valor_final: i.pedido_valor_final,
          });
        }
        if (i.conta_id && !contasMap.has(i.conta_id)) {
          contasMap.set(i.conta_id, {
            conta_id: i.conta_id,
            conta_descricao: i.conta_descricao,
            conta_valor_original: i.conta_valor_original,
            conta_valor_atual: i.conta_valor_atual,
            data_vencimento: i.data_vencimento,
            conta_status: i.conta_status,
            numero_nota_fiscal: i.numero_nota_fiscal,
            pedido_id: i.pedido_id,
            numero_pedido: i.numero_pedido,
          });
        }
      }
      const pedidos = pedidosMap.size > 0 ? Array.from(pedidosMap.values()) : undefined;
      const contas = contasMap.size > 0 ? Array.from(contasMap.values()) : undefined;
      return {
        ...first,
        numeros_requisicoes: numerosUnicos.length > 1 ? numerosUnicos : undefined,
        pedidos,
        contas,
      } as FollowUpComprasItem;
    });
  }, [filteredData]);

  const handleFilterChange = (key: keyof FollowUpComprasFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm.length > 0;

  return (
    <>
      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros e Busca</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Busca rápida */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, solicitante, fornecedor, NF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Período */}
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  />
                </div>

                {/* Status Requisição */}
                <div className="space-y-2">
                  <Label>Status Requisição</Label>
                  <Select
                    value={filters.statusRequisicao || ''}
                    onValueChange={(value) => handleFilterChange('statusRequisicao', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="criada">Criada</SelectItem>
                      <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Cotação */}
                <div className="space-y-2">
                  <Label>Status Cotação</Label>
                  <Select
                    value={filters.statusCotacao || ''}
                    onValueChange={(value) => handleFilterChange('statusCotacao', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="em_pedido">Em Pedido</SelectItem>
                      <SelectItem value="reprovada">Reprovada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Pedido */}
                <div className="space-y-2">
                  <Label>Status Pedido</Label>
                  <Select
                    value={filters.statusPedido || ''}
                    onValueChange={(value) => handleFilterChange('statusPedido', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Conta */}
                <div className="space-y-2">
                  <Label>Status Conta</Label>
                  <Select
                    value={filters.statusConta || ''}
                    onValueChange={(value) => handleFilterChange('statusConta', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="paga">Paga</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Solicitante */}
                <div className="space-y-2">
                  <Label>Solicitante</Label>
                  <Select
                    value={filters.solicitanteId || ''}
                    onValueChange={(value) => handleFilterChange('solicitanteId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
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

                {/* Fornecedor */}
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={filters.fornecedorId || ''}
                    onValueChange={(value) => handleFilterChange('fornecedorId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {fornecedores.map((fornecedor: any) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social || fornecedor.nome_fantasia || fornecedor.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Indicador de filtros ativos */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {filters.dataInicio && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    De {new Date(filters.dataInicio).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
                {filters.dataFim && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Até {new Date(filters.dataFim).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
                {filters.statusRequisicao && (
                  <Badge variant="secondary">Req: {filters.statusRequisicao}</Badge>
                )}
                {filters.statusCotacao && (
                  <Badge variant="secondary">Cot: {filters.statusCotacao}</Badge>
                )}
                {filters.statusPedido && (
                  <Badge variant="secondary">Ped: {filters.statusPedido}</Badge>
                )}
                {filters.statusConta && (
                  <Badge variant="secondary">Conta: {filters.statusConta}</Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary">Busca: {searchTerm}</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Follow-up */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Resultados ({groupedCards.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando dados do follow-up...
            </div>
          ) : groupedCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum resultado encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedCards.map((item, index) => (
                <FollowUpCard
                  key={item.numero_cotacao ? `cot-${item.numero_cotacao}` : `req-${item.requisicao_id}`}
                  item={item}
                  onViewDetails={setSelectedItem}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {selectedItem && (
        <FollowUpDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

interface FollowUpDetailsModalProps {
  item: FollowUpComprasItem;
  onClose: () => void;
}

function FollowUpDetailsModal({ item, onClose }: FollowUpDetailsModalProps) {
  const { selectedCompany } = useCompany();

  // Quando a cotação agrupa várias requisições: buscar todos os ciclos para obter os requisicao_ids
  const { data: ciclosDaCotacao = [] } = useQuery({
    queryKey: ['cotacao-ciclos', item.numero_cotacao, selectedCompany?.id],
    queryFn: async () => {
      if (!item.numero_cotacao || !selectedCompany?.id) return [];
      const result = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_ciclos',
        companyId: selectedCompany.id,
        filters: { numero_cotacao: item.numero_cotacao },
        page: 1,
        pageSize: 100,
      });
      return (result.data || []) as { id: string; requisicao_id: string; numero_cotacao: string }[];
    },
    enabled: !!item.numero_cotacao && !!selectedCompany?.id,
  });

  // IDs das requisições desta cotação (ou só a primeira quando não há agrupamento)
  const requisicaoIds = useMemo(() => {
    if (ciclosDaCotacao.length > 0) {
      return ciclosDaCotacao.map((c: any) => c.requisicao_id).filter(Boolean);
    }
    return item.requisicao_id ? [item.requisicao_id] : [];
  }, [ciclosDaCotacao, item.requisicao_id]);

  // Para cotações multi-requisição, considerar todos os ciclos da mesma
  // `numero_cotacao` ao buscar itens da cotação, para não depender
  // apenas do `cotacao_id` da primeira linha do follow-up.
  const cotacaoIdsForItems = useMemo(() => {
    if (ciclosDaCotacao.length > 0) {
      return ciclosDaCotacao.map((c: any) => c.id).filter(Boolean);
    }
    return item.cotacao_id ? [item.cotacao_id] : [];
  }, [ciclosDaCotacao, item.cotacao_id]);

  // Buscar detalhes de todas as requisições da cotação (centro de custo, projeto, serviço, almoxarifado, etc.)
  const { data: requisicoesDetailList = [] } = useQuery({
    queryKey: ['requisicoes-detail-batch', requisicaoIds.join(','), selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || requisicaoIds.length === 0) return [];
      const details = await Promise.all(
        requisicaoIds.map((id) =>
          EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            id,
            companyId: selectedCompany.id,
          })
        )
      );
      return details.filter(Boolean) as any[];
    },
    enabled: !!selectedCompany?.id && requisicaoIds.length > 0,
  });

  // Para compatibilidade: primeira requisição (usado em itens da requisição, aprovações, etc.)
  const requisicaoDetail = requisicoesDetailList[0] ?? null;

  // Listas para resolver nomes
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { data: almoxarifados = [] } = useAlmoxarifados();
  const { data: servicesData } = useServicesByProject(requisicaoDetail?.projeto_id || undefined);
  const { data: partnersData } = useActivePartners();

  const costCentersMap = useMemo(() => {
    const map = new Map<string, string>();
    (costCentersData?.data || []).forEach((cc: any) => map.set(cc.id, cc.nome || cc.codigo || cc.id));
    return map;
  }, [costCentersData]);
  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    (projectsData?.data || []).forEach((p: any) => map.set(p.id, p.nome || p.codigo || p.id));
    return map;
  }, [projectsData]);
  const almoxarifadosMap = useMemo(() => {
    const map = new Map<string, string>();
    almoxarifados.forEach((a: any) => map.set(a.id, a.nome || a.codigo || a.id));
    return map;
  }, [almoxarifados]);
  const services = servicesData?.data || [];
  const serviceNome = useMemo(() => {
    if (!requisicaoDetail?.service_id) return null;
    const s = services.find((s: any) => s.id === requisicaoDetail.service_id);
    return s?.nome || s?.codigo || null;
  }, [requisicaoDetail?.service_id, services]);
  const projetoIdsUnicos = useMemo(
    () => [...new Set(requisicoesDetailList.map((r: any) => r.projeto_id).filter(Boolean))] as string[],
    [requisicoesDetailList]
  );
  // Serviços por projeto (para múltiplas requisições): buscar nomes de serviço para todos os projeto_id distintos
  const { data: allServicesByProject } = useQuery({
    queryKey: ['services-by-projects', projetoIdsUnicos.join(','), selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || projetoIdsUnicos.length === 0) return {} as Record<string, any[]>;
      const out: Record<string, any[]> = {};
      await Promise.all(
        projetoIdsUnicos.map(async (pid) => {
          const result = await EntityService.list({
            schema: 'public',
            table: 'services',
            companyId: selectedCompany.id,
            filters: { project_id: pid, ativo: true },
            page: 1,
            pageSize: 100,
          });
          out[pid] = result.data || [];
        })
      );
      return out;
    },
    enabled: !!selectedCompany?.id && projetoIdsUnicos.length > 0,
  });
  const getServiceNome = (projetoId?: string | null, serviceId?: string | null) => {
    if (!projetoId || !serviceId || !allServicesByProject) return null;
    const list = allServicesByProject[projetoId] || [];
    const s = list.find((x: any) => x.id === serviceId);
    return s?.nome || s?.codigo || null;
  };
  const partnersMap = useMemo(() => {
    const map = new Map<string, string>();
    const partners = (partnersData as any)?.data || partnersData || [];
    (Array.isArray(partners) ? partners : []).forEach((p: any) => {
      const nome = p.nome_fantasia || p.razao_social || p.nome;
      if (p.id && nome) map.set(p.id, nome);
    });
    return map;
  }, [partnersData]);

  // Fornecedores da cotação
  const { data: cotacaoFornecedoresList = [] } = useQuery({
    queryKey: ['cotacao-fornecedores', item.cotacao_id, selectedCompany?.id],
    queryFn: async () => {
      if (!item.cotacao_id || !selectedCompany?.id) return [];
      const result = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId: selectedCompany.id,
        filters: { cotacao_id: item.cotacao_id },
        page: 1,
        pageSize: 50,
        skipCompanyFilter: true,
      });
      return result.data || [];
    },
    enabled: !!item.cotacao_id && !!selectedCompany?.id,
  });

  const { data: fornecedoresDadosList = [] } = useQuery({
    queryKey: ['fornecedores-dados', selectedCompany?.id, cotacaoFornecedoresList.length],
    queryFn: async () => {
      if (!selectedCompany?.id || cotacaoFornecedoresList.length === 0) return [];
      const result = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId: selectedCompany.id,
        page: 1,
        pageSize: 200,
      });
      return result.data || [];
    },
    enabled: !!selectedCompany?.id && cotacaoFornecedoresList.length > 0,
  });

  const fornecedoresCotacaoNomes = useMemo(() => {
    const fdMap = new Map<string, any>();
    fornecedoresDadosList.forEach((fd: any) => fdMap.set(fd.id, fd));
    const nomes = cotacaoFornecedoresList
      .map((cf: any) => {
        const fd = fdMap.get(cf.fornecedor_id);
        const partnerId = fd?.partner_id;
        return partnerId ? partnersMap.get(partnerId) || '—' : '—';
      })
      .filter((n) => n && n !== '—');
    return [...new Set(nomes)];
  }, [cotacaoFornecedoresList, fornecedoresDadosList, partnersMap]);

  // Buscar itens da requisição
  const { data: requisicaoItems = [] } = useQuery({
    queryKey: ['requisicao-items', item.requisicao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getRequisitionItems(item.requisicao_id, selectedCompany?.id || ''),
    enabled: !!item.requisicao_id && !!selectedCompany?.id,
  });

  // Buscar itens da cotação (considerando todos os ciclos da mesma numero_cotacao)
  const { data: cotacaoItems = [] } = useQuery({
    queryKey: ['cotacao-items', cotacaoIdsForItems.join(','), selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || cotacaoIdsForItems.length === 0) return [];

      // Buscar itens de todos os ciclos relacionados a esta cotação
      const results = await Promise.all(
        cotacaoIdsForItems.map((id) =>
          purchaseService.getCotacaoItems(id, selectedCompany.id)
        )
      );

      const all = results.flat();

      // Deduplicar por requisicao_item_id (ou id) e preferir o item vencedor
      const byRequisicaoItem = new Map<string, any>();
      for (const row of all) {
        const key = String(row.requisicao_item_id ?? row.id);
        const existing = byRequisicaoItem.get(key);
        if (!existing || row.is_vencedor) {
          byRequisicaoItem.set(key, row);
        }
      }

      return Array.from(byRequisicaoItem.values());
    },
    enabled: !!selectedCompany?.id && cotacaoIdsForItems.length > 0,
  });

  // IDs de todos os pedidos (múltiplos quando cotação unificada gera vários pedidos)
  const pedidoIds = useMemo(() => {
    if (item.pedidos && item.pedidos.length > 0) {
      return item.pedidos.map((p) => p.pedido_id).filter(Boolean);
    }
    return item.pedido_id ? [item.pedido_id] : [];
  }, [item.pedido_id, item.pedidos]);

  // Buscar itens de todos os pedidos
  const { data: pedidoItemsByPedido = [] } = useQuery({
    queryKey: ['pedido-items-batch', pedidoIds.join(','), selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || pedidoIds.length === 0) return [];
      const results = await Promise.all(
        pedidoIds.map((pid) =>
          purchaseService.getPedidoItems(pid, selectedCompany.id)
        )
      );
      return results.map((items, idx) => ({ pedidoId: pedidoIds[idx], items }));
    },
    enabled: !!selectedCompany?.id && pedidoIds.length > 0,
  });

  const pedidoItems = useMemo(() => {
    return pedidoItemsByPedido.flatMap((r) => r.items);
  }, [pedidoItemsByPedido]);

  const pedidoItemsComPedidoRef = useMemo(() => {
    return pedidoItemsByPedido.flatMap((r) =>
      (r.items as any[]).map((it) => ({ ...it, _pedidoId: r.pedidoId }))
    );
  }, [pedidoItemsByPedido]);

  const pedidoNumeroPorId = useMemo(() => {
    const map = new Map<string, string>();
    if (item.pedidos) {
      item.pedidos.forEach((p) => {
        if (p.pedido_id && p.numero_pedido) map.set(p.pedido_id, p.numero_pedido);
      });
    } else if (item.pedido_id && item.numero_pedido) {
      map.set(item.pedido_id, item.numero_pedido);
    }
    return map;
  }, [item.pedido_id, item.numero_pedido, item.pedidos]);

  // Valores agregados quando há múltiplos pedidos (soma de valor total e valor final)
  const pedidosValoresAgregados = useMemo(() => {
    if (item.pedidos && item.pedidos.length > 1) {
      const valorTotal = item.pedidos.reduce((s, p) => s + (Number(p.pedido_valor_total) || 0), 0);
      const valorFinal = item.pedidos.reduce((s, p) => s + (Number(p.pedido_valor_final) || 0), 0);
      const datasPedido = [...new Set(item.pedidos.map((p) => p.data_pedido).filter(Boolean))];
      const datasEntregaPrev = [...new Set(item.pedidos.map((p) => p.data_entrega_prevista).filter(Boolean))];
      const datasEntregaReal = [...new Set(item.pedidos.map((p) => p.data_entrega_real).filter(Boolean))];
      const statusPedido = [...new Set(item.pedidos.map((p) => p.pedido_workflow_state || p.pedido_status).filter(Boolean))];
      return {
        valorTotal,
        valorFinal,
        dataPedidoUnica: datasPedido.length === 1 ? datasPedido[0] : null,
        dataEntregaPrevUnica: datasEntregaPrev.length === 1 ? datasEntregaPrev[0] : null,
        dataEntregaRealUnica: datasEntregaReal.length === 1 ? datasEntregaReal[0] : null,
        statusUnico: statusPedido.length === 1 ? statusPedido[0] : null,
        temVariacao: datasPedido.length > 1 || datasEntregaPrev.length > 1 || statusPedido.length > 1,
      };
    }
    return null;
  }, [item.pedidos]);

  // Buscar aprovações da requisição
  const { data: requisicaoApprovals = [] } = useQuery({
    queryKey: ['requisicao-approvals', item.requisicao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getApprovals('requisicao_compra', item.requisicao_id, selectedCompany?.id || ''),
    enabled: !!item.requisicao_id && !!selectedCompany?.id,
  });

  // Buscar aprovações da cotação
  const { data: cotacaoApprovals = [] } = useQuery({
    queryKey: ['cotacao-approvals', item.cotacao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getApprovals('cotacao_compra', item.cotacao_id!, selectedCompany?.id || ''),
    enabled: !!item.cotacao_id && !!selectedCompany?.id,
  });

  // Contas a exibir: array de contas (múltiplas quando cotação unificada)
  const contasParaExibir = useMemo(() => {
    if (item.contas && item.contas.length > 0) {
      return item.contas;
    }
    if (item.conta_id) {
      return [
        {
          conta_id: item.conta_id,
          conta_descricao: item.conta_descricao,
          conta_valor_original: item.conta_valor_original,
          conta_valor_atual: item.conta_valor_atual,
          data_vencimento: item.data_vencimento,
          conta_status: item.conta_status,
          numero_nota_fiscal: item.numero_nota_fiscal,
          pedido_id: item.pedido_id,
          numero_pedido: item.numero_pedido,
        },
      ];
    }
    return [];
  }, [item]);

  // Buscar aprovações do pedido (se existir tipo de processo para pedidos)
  const { data: pedidoApprovals = [] } = useQuery({
    queryKey: ['pedido-approvals', item.pedido_id, selectedCompany?.id],
    queryFn: async () => {
      // Verificar se existe tipo de processo para pedidos
      // Por enquanto, retornar array vazio se não houver tipo definido
      try {
        return await purchaseService.getApprovals('pedido_compra', item.pedido_id!, selectedCompany?.id || '');
      } catch (error) {
        // Se não existir tipo de processo para pedidos, retornar vazio
        return [];
      }
    },
    enabled: !!item.pedido_id && !!selectedCompany?.id,
  });

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-5xl max-h-[90vh] rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-2xl flex flex-col">
        <DialogHeader className="border-b border-slate-200 pb-4 mb-2 shrink-0">
          <DialogTitle className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Detalhes do Follow-up
            </span>
            <span className="text-lg md:text-2xl font-semibold text-slate-900">
              {item.numeros_requisicoes?.length
                ? item.numeros_requisicoes.join(', ')
                : item.numero_requisicao}
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Visão consolidada de todas as etapas do processo de compra.
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {item.requisicao_workflow_state || item.requisicao_status ? (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border border-emerald-100">
                Requisição: {item.requisicao_workflow_state || item.requisicao_status}
              </Badge>
            ) : null}
            {item.cotacao_status || item.cotacao_workflow_state ? (
              <Badge variant="secondary" className="bg-sky-50 text-sky-800 border border-sky-100">
                Cotação: {item.cotacao_workflow_state || item.cotacao_status}
              </Badge>
            ) : null}
            {item.pedido_status || item.pedido_workflow_state ? (
              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-100">
                Pedido: {item.pedido_workflow_state || item.pedido_status}
              </Badge>
            ) : null}
            {item.conta_status ? (
              <Badge variant="secondary" className="bg-violet-50 text-violet-800 border border-violet-100">
                Conta: {item.conta_status}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <ScrollArea className="w-full h-[60vh] pr-4">
          <div className="space-y-6 pb-6">
            {/* Requisição(ões) */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">1. Requisição de Compra</h3>
                    <p className="text-xs text-gray-600">
                      Informações principais da requisição e dos itens solicitados.
                    </p>
                  </div>
                </div>
                <div className="hidden text-xs text-gray-500 md:flex flex-col items-end gap-1">
                  <span>
                    {requisicaoItems.length} item{requisicaoItems.length === 1 ? '' : 's'}
                  </span>
                  {requisicaoApprovals.length > 0 && (
                    <span>
                      {requisicaoApprovals.length} aprovação
                      {requisicaoApprovals.length === 1 ? '' : 'es'}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Número(s)
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {item.numeros_requisicoes?.length
                      ? item.numeros_requisicoes.join(', ')
                      : item.numero_requisicao}
                  </span>
                </div>
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Solicitante
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {item.solicitante_nome || '—'}
                  </span>
                </div>
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Data da solicitação
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {formatDate(item.data_solicitacao)}
                  </span>
                </div>
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Data de necessidade
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {formatDate(item.data_necessidade)}
                  </span>
                </div>
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Status da requisição
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {item.requisicao_workflow_state || item.requisicao_status || '—'}
                  </span>
                </div>
                <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2 flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                    Valor estimado
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(item.valor_total_estimado)}
                  </span>
                </div>
              </div>

              {/* Tabela com uma linha por requisição (centro de custo, projeto, serviço, almoxarifado por requisição) */}
              {requisicoesDetailList.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {requisicoesDetailList.length === 1
                      ? 'Dados da requisição'
                      : 'Dados por requisição (centro de custo, projeto, serviço, almoxarifado)'}
                  </h4>
                  <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white/90">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Número</TableHead>
                          <TableHead>Centro de Custo</TableHead>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Almoxarifado</TableHead>
                          <TableHead>Local de Entrega</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requisicoesDetailList.map((req: any) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.numero_requisicao || '—'}</TableCell>
                            <TableCell>
                              {req.centro_custo_id ? costCentersMap.get(req.centro_custo_id) || '—' : '—'}
                            </TableCell>
                            <TableCell>
                              {req.projeto_id ? projectsMap.get(req.projeto_id) || '—' : '—'}
                            </TableCell>
                            <TableCell>{getServiceNome(req.projeto_id, req.service_id) || '—'}</TableCell>
                            <TableCell>
                              {req.tipo_requisicao === 'reposicao'
                                ? 'Reposição'
                                : req.tipo_requisicao === 'compra_direta'
                                ? 'Compra Direta'
                                : req.tipo_requisicao || '—'}
                            </TableCell>
                            <TableCell>
                              {req.destino_almoxarifado_id
                                ? almoxarifadosMap.get(req.destino_almoxarifado_id) || '—'
                                : '—'}
                            </TableCell>
                            <TableCell>{req.local_entrega || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Accordion type="multiple" className="w-full">
                {/* Itens da Requisição */}
                <AccordionItem value="requisicao-itens">
                  <AccordionTrigger className="text-sm font-medium">
                    Itens da Requisição ({requisicaoItems.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white/90">
                      <Table className="min-w-[650px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requisicaoItems.length > 0 ? (
                            requisicaoItems.map((reqItem: any) => (
                              <TableRow key={reqItem.id}>
                                <TableCell>
                                  {reqItem.material?.nome || reqItem.material?.codigo || '—'}
                                </TableCell>
                                <TableCell>{reqItem.quantidade || '—'}</TableCell>
                                <TableCell>{reqItem.unidade_medida || 'UN'}</TableCell>
                                <TableCell>{formatCurrency(reqItem.valor_unitario_estimado)}</TableCell>
                                <TableCell>{formatCurrency(reqItem.valor_total_estimado)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{reqItem.status || 'pendente'}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-gray-400">
                                Nenhum item encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Aprovações da Requisição */}
                {requisicaoApprovals.length > 0 && (
                  <AccordionItem value="requisicao-approvals">
                    <AccordionTrigger className="text-sm font-medium">
                      Aprovações ({requisicaoApprovals.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {requisicaoApprovals.map((approval: any) => (
                          <div
                            key={approval.id}
                            className="flex items-start justify-between p-3 border rounded-lg bg-white/80"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              {getApprovalStatusIcon(approval.status)}
                              <div className="flex-1">
                                <div className="font-medium">
                                  Nível {approval.nivel_aprovacao} -{' '}
                                  {approval.aprovador?.nome ||
                                    approval.aprovador?.email ||
                                    'Usuário'}
                                </div>
                                {approval.observacoes && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    {approval.observacoes}
                                  </div>
                                )}
                                {approval.data_aprovacao && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {formatDate(approval.data_aprovacao)}
                                  </div>
                                )}
                              </div>
                              {getApprovalStatusBadge(approval.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            {/* Cotação */}
            {item.cotacao_id ? (
              <div className="rounded-lg border border-sky-100 bg-sky-50/40 px-4 py-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">2. Cotação de Preços</h3>
                      <p className="text-xs text-gray-600">
                        Detalhes da cotação enviada aos fornecedores.
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-xs text-gray-500 md:flex flex-col items-end gap-1">
                    <span>
                      {cotacaoItems.length} item{cotacaoItems.length === 1 ? '' : 's'} cotados
                    </span>
                    {cotacaoApprovals.length > 0 && (
                      <span>
                        {cotacaoApprovals.length} aprovação
                        {cotacaoApprovals.length === 1 ? '' : 'es'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="rounded-md bg-white/80 border border-sky-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                      Número da cotação
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.numero_cotacao || '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-sky-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                      Data da cotação
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {formatDate(item.data_cotacao)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-sky-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                      Status da cotação
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.cotacao_workflow_state || item.cotacao_status || '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-sky-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                      Prazo de resposta
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.prazo_resposta ? formatDate(item.prazo_resposta) : '—'}
                    </span>
                  </div>
                  {fornecedoresCotacaoNomes.length > 0 && (
                    <div className="rounded-md bg-white/80 border border-sky-100 px-3 py-2 flex flex-col md:col-span-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                        Fornecedores cotados
                      </span>
                      <span className="mt-1 text-sm font-semibold text-gray-900">
                        {fornecedoresCotacaoNomes.join(' • ')}
                      </span>
                    </div>
                  )}
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* Itens da Cotação */}
                  <AccordionItem value="cotacao-itens">
                    <AccordionTrigger className="text-sm font-medium">
                      Itens da Cotação ({cotacaoItems.length})
                    </AccordionTrigger>
                  <AccordionContent>
                    <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white/90">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Prazo Entrega</TableHead>
                            <TableHead>Fornecedor ganhador</TableHead>
                            <TableHead>Condições de pagamento</TableHead>
                            <TableHead>Forma de pagamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cotacaoItems.length > 0 ? (
                            cotacaoItems.map((cotItem: any) => (
                              <TableRow key={cotItem.id}>
                                <TableCell>
                                  {cotItem.material?.nome || cotItem.material?.codigo || '—'}
                                </TableCell>
                                <TableCell>{cotItem.quantidade || '—'}</TableCell>
                                <TableCell>{formatCurrency(cotItem.valor_unitario)}</TableCell>
                                <TableCell>{formatCurrency(cotItem.valor_total)}</TableCell>
                                <TableCell>
                                  {cotItem.prazo_entrega ? `${cotItem.prazo_entrega} dias` : '—'}
                                </TableCell>
                                <TableCell>{cotItem.fornecedor_ganhador_nome ?? '—'}</TableCell>
                                <TableCell>{cotItem.condicoes_pagamento ?? '—'}</TableCell>
                                <TableCell>{cotItem.forma_pagamento ?? '—'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-gray-400">
                                Nenhum item encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                  </AccordionItem>

                  {/* Aprovações da Cotação */}
                  {cotacaoApprovals.length > 0 && (
                    <AccordionItem value="cotacao-approvals">
                      <AccordionTrigger className="text-sm font-medium">
                        Aprovações ({cotacaoApprovals.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {cotacaoApprovals.map((approval: any) => (
                            <div
                              key={approval.id}
                              className="flex items-start justify-between p-3 border rounded-lg bg-white/80"
                            >
                              <div className="flex items-start gap-3 flex-1">
                                {getApprovalStatusIcon(approval.status)}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Nível {approval.nivel_aprovacao} -{' '}
                                    {approval.aprovador?.nome ||
                                      approval.aprovador?.email ||
                                      'Usuário'}
                                  </div>
                                  {approval.observacoes && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {approval.observacoes}
                                    </div>
                                  )}
                                  {approval.data_aprovacao && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {formatDate(approval.data_aprovacao)}
                                    </div>
                                  )}
                                </div>
                                {getApprovalStatusBadge(approval.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-gray-500 italic flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-400" />
                <span>2. Cotação de Preços - Não iniciada</span>
              </div>
            )}

            {/* Pedido(s) */}
            {pedidoIds.length > 0 ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">3. Pedido de Compra</h3>
                      <p className="text-xs text-gray-600">
                        {pedidoIds.length === 1
                          ? 'Resumo do pedido gerado a partir da cotação.'
                          : `Resumo dos ${pedidoIds.length} pedidos gerados a partir da cotação unificada.`}
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-xs text-gray-500 md:flex flex-col items-end gap-1">
                    <span>
                      {pedidoItems.length} item{pedidoItems.length === 1 ? '' : 's'} no{pedidoIds.length > 1 ? 's pedidos' : ' pedido'}
                    </span>
                    {pedidoApprovals.length > 0 && (
                      <span>
                        {pedidoApprovals.length} aprovação
                        {pedidoApprovals.length === 1 ? '' : 'es'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Número{pedidoIds.length > 1 ? 's' : ''} do pedido
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.pedidos && item.pedidos.length > 0
                        ? item.pedidos.map((p) => p.numero_pedido).filter(Boolean).join(', ') || '—'
                        : item.numero_pedido || '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Fornecedor{pedidoIds.length > 1 ? 'es' : ''}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.pedidos && item.pedidos.length > 0
                        ? [...new Set(item.pedidos.map((p) => p.fornecedor_nome).filter(Boolean))].join(', ') || '—'
                        : item.fornecedor_nome || '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Data do pedido
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {pedidosValoresAgregados?.temVariacao
                        ? 'Vários'
                        : formatDate(pedidosValoresAgregados?.dataPedidoUnica ?? item.data_pedido)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Entrega prevista
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {pedidosValoresAgregados?.temVariacao
                        ? 'Vários'
                        : formatDate(pedidosValoresAgregados?.dataEntregaPrevUnica ?? item.data_entrega_prevista)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Entrega realizada
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {pedidosValoresAgregados?.temVariacao
                        ? 'Vários'
                        : formatDate(pedidosValoresAgregados?.dataEntregaRealUnica ?? item.data_entrega_real)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Status do pedido
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {pedidosValoresAgregados?.statusUnico ?? item.pedido_workflow_state ?? item.pedido_status ?? '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Valor total {pedidoIds.length > 1 ? '(soma)' : ''}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {formatCurrency(pedidosValoresAgregados?.valorTotal ?? item.pedido_valor_total)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-amber-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Valor final {pedidoIds.length > 1 ? '(soma)' : ''}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {formatCurrency(pedidosValoresAgregados?.valorFinal ?? item.pedido_valor_final)}
                    </span>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* Itens do Pedido */}
                  <AccordionItem value="pedido-itens">
                    <AccordionTrigger className="text-sm font-medium">
                      Itens do Pedido ({pedidoItems.length})
                    </AccordionTrigger>
                  <AccordionContent>
                    <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white/90">
                      <Table className="min-w-[750px]">
                        <TableHeader>
                          <TableRow>
                            {pedidoIds.length > 1 && <TableHead>Pedido</TableHead>}
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Qtd. Entregue</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pedidoItems.length > 0 ? (
                            (pedidoIds.length > 1 ? pedidoItemsComPedidoRef : pedidoItems).map(
                              (pedItem: any, idx: number) => (
                                <TableRow key={pedItem.id || idx}>
                                  {pedidoIds.length > 1 && (
                                    <TableCell className="font-medium">
                                      {pedidoNumeroPorId.get(pedItem._pedidoId) || pedItem._pedidoId || '—'}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    {pedItem.material?.nome || pedItem.material?.codigo || '—'}
                                  </TableCell>
                                  <TableCell>{pedItem.quantidade || '—'}</TableCell>
                                  <TableCell>{pedItem.quantidade_entregue || 0}</TableCell>
                                  <TableCell>{formatCurrency(pedItem.valor_unitario)}</TableCell>
                                  <TableCell>{formatCurrency(pedItem.valor_total)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{pedItem.status || 'pendente'}</Badge>
                                  </TableCell>
                                </TableRow>
                              )
                            )
                          ) : (
                            <TableRow>
                              <TableCell colSpan={pedidoIds.length > 1 ? 7 : 6} className="text-center text-gray-400">
                                Nenhum item encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                  </AccordionItem>

                  {/* Aprovações do Pedido */}
                  {pedidoApprovals.length > 0 && (
                    <AccordionItem value="pedido-approvals">
                      <AccordionTrigger className="text-sm font-medium">
                        Aprovações ({pedidoApprovals.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {pedidoApprovals.map((approval: any) => (
                            <div
                              key={approval.id}
                              className="flex items-start justify-between p-3 border rounded-lg bg-white/80"
                            >
                              <div className="flex items-start gap-3 flex-1">
                                {getApprovalStatusIcon(approval.status)}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Nível {approval.nivel_aprovacao} -{' '}
                                    {approval.aprovador?.nome ||
                                      approval.aprovador?.email ||
                                      'Usuário'}
                                  </div>
                                  {approval.observacoes && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {approval.observacoes}
                                    </div>
                                  )}
                                  {approval.data_aprovacao && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {formatDate(approval.data_aprovacao)}
                                    </div>
                                  )}
                                </div>
                                {getApprovalStatusBadge(approval.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-gray-500 italic flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span>3. Pedido de Compra - Não criado</span>
              </div>
            )}

            {/* Conta(s) a Pagar */}
            {contasParaExibir.length > 0 ? (
              <div className="rounded-lg border border-violet-100 bg-violet-50/40 px-4 py-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">4. Conta a Pagar</h3>
                      <p className="text-xs text-gray-600">
                        {contasParaExibir.length === 1
                          ? 'Informações financeiras relacionadas ao pedido.'
                          : `${contasParaExibir.length} contas a pagar vinculadas aos pedidos.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {contasParaExibir.map((conta: any, idx: number) => (
                    <div
                      key={conta.conta_id || idx}
                      className={cn(
                        'rounded-lg border bg-white/80 p-4',
                        contasParaExibir.length > 1 && 'border-violet-200'
                      )}
                    >
                      {contasParaExibir.length > 1 && (
                        <div className="text-xs font-medium text-violet-700 mb-3">
                          Conta {idx + 1}
                          {conta.numero_pedido && ` • Pedido ${conta.numero_pedido}`}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Descrição
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {conta.conta_descricao || '—'}
                          </span>
                        </div>
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Número da NF
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {conta.numero_nota_fiscal || '—'}
                          </span>
                        </div>
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Valor original
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {formatCurrency(conta.conta_valor_original)}
                          </span>
                        </div>
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Valor atual
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {formatCurrency(conta.conta_valor_atual)}
                          </span>
                        </div>
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Data de vencimento
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {formatDate(conta.data_vencimento)}
                          </span>
                        </div>
                        <div className="rounded-md bg-white/80 border border-violet-100 px-3 py-2 flex flex-col">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                            Status da conta
                          </span>
                          <span className="mt-1 text-sm font-semibold text-gray-900">
                            {conta.conta_status || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-gray-500 italic flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span>4. Conta a Pagar - Não criada</span>
              </div>
            )}

            {/* Entrada em Estoque */}
            {item.entrada_id ? (
              <div className="rounded-lg border border-orange-100 bg-orange-50/40 px-4 py-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                      <Warehouse className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">5. Entrada em Estoque</h3>
                      <p className="text-xs text-gray-600">
                        Registro da entrada de materiais no estoque.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-white/80 border border-orange-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
                      Número do documento
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.entrada_numero_documento || '—'}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-orange-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
                      Data da entrada
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {formatDate(item.data_entrada)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white/80 border border-orange-100 px-3 py-2 flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
                      Status da entrada
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {item.entrada_status || '—'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-gray-500 italic flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-gray-400" />
                <span>5. Entrada em Estoque - Não registrada</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
