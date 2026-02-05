import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText,
  Package,
  Users,
  Calculator,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  DollarSign,
  Calendar,
  Zap,
  TrendingDown,
  TrendingUp,
  MapPin,
  Trophy,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Image as ImageIcon,
  Eye,
  Paperclip,
  X as XIcon,
  File,
  Settings
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { useStartQuoteCycle } from '@/hooks/compras/useComprasData';
import { useActivePartners } from '@/hooks/usePartners';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useCreateApprovalsForProcess, useApprovalsByProcess } from '@/hooks/approvals/useApprovals';
import { useApprovalConfigs } from '@/hooks/approvals/useApprovalConfigs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HistoricoComprasItemModal } from './HistoricoComprasItemModal';
import { useQueryClient } from '@tanstack/react-query';

interface ModalGerarCotacaoProps {
  isOpen: boolean;
  onClose: () => void;
  requisicoesIds?: string[]; // IDs das requisições (para nova cotação)
  itemIds?: string[]; // IDs dos itens selecionados no modo explodido (requisicao_item.id)
  cotacaoId?: string; // ID da cotação existente (para edição/visualização)
  readOnly?: boolean; // Modo somente leitura (para visualização)
}

interface RequisicaoData {
  id: string;
  numero_requisicao: string;
  centro_custo_id?: string;
  projeto_id?: string;
  tipo_requisicao?: string;
  is_emergencial?: boolean;
  prioridade?: string;
  local_entrega?: string;
  itens: RequisicaoItem[];
}

interface RequisicaoItem {
  id: string;
  material_id: string;
  material_nome?: string;
  material_codigo?: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado?: number;
  requisicao_id: string;
  requisicao_numero?: string;
  imagem_url?: string | null;
}

interface ItemAgrupado {
  material_id: string;
  material_nome: string;
  material_codigo: string;
  unidade_medida: string;
  quantidade_total: number;
  origem: string[]; // Array de números de requisição
  tipo_requisicao: string; // Tipo da requisição (reposicao, compra_direta)
  selecionado: boolean;
  itens_origem: RequisicaoItem[];
  imagem_url?: string | null;
}

interface FornecedorCotacao {
  id: string;
  fornecedor_id: string;
  fornecedor_nome?: string;
  valor_frete?: number;
  valor_imposto?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  prazo_entrega?: number;
  condicao_pagamento?: string; // Campo legado, mantido para compatibilidade
  // ✅ NOVOS CAMPOS: Condições de pagamento estruturadas
  forma_pagamento?: string;
  is_parcelada?: boolean;
  numero_parcelas?: number;
  intervalo_parcelas?: string;
  observacoes?: string;
  preco_unitario?: number; // Campo legado, mantido para compatibilidade
}

interface RateioItem {
  item_id: string;
  material_id: string;
  material_nome: string;
  requisicao_id: string;
  requisicao_numero: string;
  centro_custo_id?: string;
  centro_custo_nome?: string;
  projeto_id?: string;
  projeto_nome?: string;
  quantidade: number;
  valor_unitario: number; // Valor unitário SEM custos adicionais (preservado)
  valor_total: number; // Valor total dos itens SEM custos adicionais
  frete_proporcional?: number; // Frete rateado proporcionalmente
  imposto_proporcional?: number; // Imposto rateado proporcionalmente
  custos_adicionais?: number; // Frete + Imposto proporcionais
  valor_total_com_custos?: number; // Valor total incluindo custos adicionais
}

type ItemFornecedorValor = {
  quantidade_ofertada: number;
  valor_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  valor_frete?: number;
  prazo_entrega_dias: number;
  condicao_pagamento: string;
  observacoes: string;
  is_vencedor: boolean;
};

type MapaFornecedorItens = Record<
  string, // fornecedor local id (temp ou real)
  Record<
    string, // material_id (agrupado)
    ItemFornecedorValor
  >
>;

export function ModalGerarCotacao({ isOpen, onClose, requisicoesIds = [], itemIds, cotacaoId, readOnly = false }: ModalGerarCotacaoProps) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startQuoteCycleMutation = useStartQuoteCycle();
  const createApprovalsMutation = useCreateApprovalsForProcess();
  const { data: partnersData } = useActivePartners();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { users } = useUsers();
  
  // Buscar informações de aprovação quando em modo visualização
  const { data: approvalsData } = useApprovalsByProcess(
    'cotacao_compra',
    cotacaoId || '',
  );
  
  // Buscar regras de aprovação para cotação
  const { data: approvalConfigs } = useApprovalConfigs({
    processo_tipo: 'cotacao_compra',
    ativo: true,
  });
 
  // loading: carregando dados iniciais do modal
  const [loading, setLoading] = useState(false);
  // submitting: envio da cotação para aprovação
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  
  // Dados da cotação
  const [formData, setFormData] = useState({
    tipo_cotacao: 'reposicao',
    is_emergencial: false,
    data_cotacao: new Date().toISOString().split('T')[0],
    data_limite: '',
    observacoes_internas: '',
    valor_frete: 0 as number,
    desconto_percentual: 0 as number,
    desconto_valor: 0 as number,
  });

  // Requisições vinculadas
  const [requisicoes, setRequisicoes] = useState<RequisicaoData[]>([]);
  const [loadedRequisicoesIdsKey, setLoadedRequisicoesIdsKey] = useState<string>('');
  
  // Itens da cotação
  const [itensAgrupados, setItensAgrupados] = useState<ItemAgrupado[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  
  // Fornecedores
  const [fornecedores, setFornecedores] = useState<FornecedorCotacao[]>([]);
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<any[]>([]);
  
  // Estado para gerenciar anexos por fornecedor
  // Estrutura: { [fornecedorId]: Array<{ id: string, file_name: string, storage_path: string, url: string }> }
  const [anexosPorFornecedor, setAnexosPorFornecedor] = useState<Record<string, Array<{
    id: string;
    file_name: string;
    storage_path: string;
    url: string;
    mime_type?: string;
    size_bytes?: number;
  }>>>({});
  
  // Estado para controlar upload em progresso por fornecedor
  const [uploadingFornecedor, setUploadingFornecedor] = useState<string | null>(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState<string>('');

  // Mapa item x fornecedor (dados do mapa de cotação)
  // Chave: material_id + tipo_requisicao (para diferenciar o mesmo material em tipos diferentes)
  const [mapaFornecedorItens, setMapaFornecedorItens] = useState<MapaFornecedorItens>({});

  // Estado para controlar modal de frete/desconto do item
  const [modalItemDetalhes, setModalItemDetalhes] = useState<{
    fornecedorId: string;
    itemKey: string;
    item: ItemAgrupado;
  } | null>(null);

  // Função helper para gerar chave composta do item no mapa
  const getItemKey = (item: ItemAgrupado): string => {
    return `${item.material_id}_${item.tipo_requisicao || 'sem_tipo'}`;
  };

  const valorItemCalculado = (cell: ItemFornecedorValor) => {
    const bruto = (cell.quantidade_ofertada || 0) * (cell.valor_unitario || 0);
    const descPct = bruto * ((cell.desconto_percentual || 0) / 100);
    const descAbs = cell.desconto_valor || 0;
    return Math.max(0, bruto - descPct - descAbs);
  };

  const resumoTotais = useMemo(() => {
    const porFornecedor = new Map<string, number>();
    const porItem = new Map<string, { melhor: number; fornecedorId?: string }>();

    // Primeiro, calcular subtotais dos itens por fornecedor
    itensAgrupados
      .filter((i) => itensSelecionados.has(getItemKey(i)))
      .forEach((item) => {
        const itemKey = getItemKey(item);
        fornecedores.forEach((f) => {
          const cell = mapaFornecedorItens[f.id]?.[itemKey];
          if (!cell) return;
          const total = valorItemCalculado(cell);
          const custoComFreteItem = total + (cell.valor_frete || 0);
          porFornecedor.set(f.id, (porFornecedor.get(f.id) || 0) + total);

          const atual = porItem.get(item.material_id);
          if (!atual || custoComFreteItem < atual.melhor) {
            porItem.set(item.material_id, { melhor: custoComFreteItem, fornecedorId: f.id });
          }
        });
      });

    // Agora calcular totais finais: subtotal itens + frete itens + frete/imposto forn - desconto forn
    const totaisFinais = new Map<string, number>();
    porFornecedor.forEach((subtotal, fid) => {
      const fornecedor = fornecedores.find(f => f.id === fid);
      if (!fornecedor) {
        totaisFinais.set(fid, subtotal);
        return;
      }
      const freteItens = itensAgrupados
        .filter((i) => itensSelecionados.has(getItemKey(i)))
        .reduce((s, item) => s + (mapaFornecedorItens[fid]?.[getItemKey(item)]?.valor_frete || 0), 0);
      const frete = (fornecedor.valor_frete || 0) + freteItens;
      const imposto = fornecedor.valor_imposto || 0;
      const descontoPct = fornecedor.desconto_percentual || 0;
      const descontoValor = fornecedor.desconto_valor || 0;
      const descontoCalculado = subtotal * (descontoPct / 100) + descontoValor;
      
      const totalFinal = subtotal + frete + imposto - descontoCalculado;
      totaisFinais.set(fid, Math.max(0, totalFinal));
    });

    let melhorFornecedorId: string | undefined;
    let melhorTotal = Number.POSITIVE_INFINITY;
    totaisFinais.forEach((total, fid) => {
      if (total < melhorTotal) {
        melhorTotal = total;
        melhorFornecedorId = fid;
      }
    });

    return {
      porFornecedor, // Subtotal dos itens (sem frete/imposto/desconto)
      porItem,
      totaisFinais, // Totais finais incluindo frete/imposto/desconto
      melhorFornecedorId,
      melhorTotal: Number.isFinite(melhorTotal) ? melhorTotal : 0,
      totalItens: Array.from(porFornecedor.values()).reduce((a, b) => a + b, 0),
    };
  }, [fornecedores, itensAgrupados, itensSelecionados, mapaFornecedorItens]);
  
  // Rateio
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  
  // Modal de Informações Adicionais do Fornecedor
  const [fornecedorModalAberto, setFornecedorModalAberto] = useState(false);
  const [fornecedorSelecionadoModal, setFornecedorSelecionadoModal] = useState<string | null>(null);
  
  // Modal de Visualização de Imagem do Item
  const [imagemModalAberto, setImagemModalAberto] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState<{ url: string; nome: string } | null>(null);
  const [historicoModalAberto, setHistoricoModalAberto] = useState(false);
  const [itemHistoricoSelecionado, setItemHistoricoSelecionado] = useState<{
    material_id: string;
    material_nome: string;
    unidade_medida: string;
  } | null>(null);

  // Criar string estável a partir de requisicoesIds e itemIds para usar como dependência
  const requisicoesIdsKey = useMemo(() => {
    const reqKey = requisicoesIds.sort().join(',');
    const itemKey = itemIds && itemIds.length > 0 ? itemIds.sort().join(',') : '';
    return `${reqKey}|${itemKey}`;
  }, [requisicoesIds, itemIds]);

  // Mapear IDs para nomes
  const costCentersMap = useMemo(() => {
    const map = new Map<string, string>();
    const costCenters = costCentersData?.data || [];
    costCenters.forEach((cc: any) => {
      map.set(cc.id, cc.nome);
    });
    return map;
  }, [costCentersData]);

  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    const projects = projectsData?.data || [];
    projects.forEach((proj: any) => {
      map.set(proj.id, proj.nome);
    });
    return map;
  }, [projectsData]);

  const partnersMap = useMemo(() => {
    const map = new Map<string, any>();
    const partners = (partnersData as any)?.data || partnersData || [];
    partners.forEach((p: any) => {
      map.set(p.id, p);
    });
    return map;
  }, [partnersData]);

  // Mapa de fornecedores_dados: fornecedor_id -> fornecedor_dados completo
  const fornecedoresDadosMap = useMemo(() => {
    const map = new Map<string, any>();
    fornecedoresDisponiveis.forEach((fd: any) => {
      map.set(fd.id, fd);
    });
    return map;
  }, [fornecedoresDisponiveis]);

  // Função para carregar cotação existente e reidratar estado
  const loadExistingQuote = useCallback(async (quoteId: string) => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      // Carregar cotação ciclo
      const quote = await EntityService.getById({
        schema: 'compras',
        table: 'cotacao_ciclos',
        id: quoteId,
        companyId: selectedCompany.id,
      });

      if (!quote) {
        toast({
          title: "Erro",
          description: "Cotação não encontrada",
          variant: "destructive",
        });
        return;
      }

      // Carregar fornecedores da cotação
      const fornecedoresCotacaoResult = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_fornecedores',
        companyId: selectedCompany.id,
        filters: { cotacao_id: quoteId },
        page: 1,
        pageSize: 100,
        skipCompanyFilter: true,
      });
      const fornecedoresCotacao = fornecedoresCotacaoResult.data || [];

      // Carregar itens cotados (cotacao_item_fornecedor)
      const cotacaoFornecedoresIds = fornecedoresCotacao.map((fc: any) => fc.id);
      const cotacaoItensResult = await EntityService.list({
        schema: 'compras',
        table: 'cotacao_item_fornecedor',
        companyId: selectedCompany.id,
        filters: {},
        page: 1,
        pageSize: 1000,
        skipCompanyFilter: true,
      });
      
      const cotacaoItens = (cotacaoItensResult.data || []).filter((item: any) => 
        cotacaoFornecedoresIds.includes(item.cotacao_fornecedor_id)
      );

      // Obter requisicao_item_ids únicos
      const requisicaoItemIds = [...new Set(cotacaoItens.map((item: any) => item.requisicao_item_id).filter(Boolean))];
      
      // Carregar itens de requisição
      const requisicaoItensData: any[] = [];
      const requisicoesIdsSet = new Set<string>();
      
      for (const itemId of requisicaoItemIds) {
        try {
          const item = await EntityService.getById({
            schema: 'compras',
            table: 'requisicao_itens',
            id: itemId,
            companyId: selectedCompany.id,
          });
          if (item) {
            requisicaoItensData.push(item);
            if (item.requisicao_id) {
              requisicoesIdsSet.add(item.requisicao_id);
            }
          }
        } catch (e) {
          console.warn(`Erro ao buscar item ${itemId}:`, e);
        }
      }

      // Carregar requisições
      const requisicoesData: RequisicaoData[] = [];
      for (const reqId of Array.from(requisicoesIdsSet)) {
        try {
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            id: reqId,
            companyId: selectedCompany.id,
          });

          // Filtrar apenas os itens desta requisição
          const itensDaRequisicao = requisicaoItensData.filter(item => item.requisicao_id === reqId);

          // Carregar materiais
          const materialIds = [...new Set(itensDaRequisicao.map((item: any) => item.material_id).filter(Boolean))];
          const materiaisMap = new Map<string, any>();
          
          if (materialIds.length > 0) {
            const materiaisResult = await EntityService.list({
              schema: 'almoxarifado',
              table: 'materiais_equipamentos',
              companyId: selectedCompany.id,
              filters: {},
              page: 1,
              pageSize: 1000,
            });

            if (materiaisResult.data) {
              materiaisResult.data.forEach((material: any) => {
                materiaisMap.set(String(material.id), material);
              });
            }
          }

          // Mapear itens com dados dos materiais
          const itens = itensDaRequisicao.map((item: any) => {
            const material = materiaisMap.get(String(item.material_id));
            const imagemUrl = material?.imagem_url && typeof material.imagem_url === 'string' && material.imagem_url.trim() !== '' 
              ? material.imagem_url.trim() 
              : null;
            
            return {
              ...item,
              requisicao_numero: requisicao.numero_requisicao,
              material_nome: material?.nome || material?.descricao || item.material_nome || 'Material não encontrado',
              material_codigo: material?.codigo_interno || material?.codigo || item.material_codigo || '',
              imagem_url: imagemUrl,
            };
          });

          requisicoesData.push({
            id: requisicao.id,
            numero_requisicao: requisicao.numero_requisicao || reqId.substring(0, 8),
            centro_custo_id: requisicao.centro_custo_id,
            projeto_id: requisicao.projeto_id,
            tipo_requisicao: requisicao.tipo_requisicao,
            prioridade: requisicao.prioridade,
            local_entrega: requisicao.local_entrega,
            itens,
          });
        } catch (e) {
          console.warn(`Erro ao buscar requisição ${reqId}:`, e);
        }
      }

      setRequisicoes(requisicoesData);

      // Agrupar itens (mesma lógica do fluxo de gerar)
      const itensMap = new Map<string, ItemAgrupado>();
      requisicoesData.forEach((req) => {
        req.itens.forEach((item) => {
          const tipoReq = req.tipo_requisicao || 'sem_tipo';
          const key = `${item.material_id}_${tipoReq}`;
          if (!itensMap.has(key)) {
            itensMap.set(key, {
              material_id: item.material_id,
              material_nome: item.material_nome || 'Material sem nome',
              material_codigo: item.material_codigo || '',
              unidade_medida: item.unidade_medida || 'UN',
              quantidade_total: 0,
              origem: [],
              tipo_requisicao: tipoReq,
              selecionado: true,
              itens_origem: [],
              imagem_url: item.imagem_url,
            });
          }
          const agrupado = itensMap.get(key)!;
          agrupado.quantidade_total += Number(item.quantidade) || 0;
          if (!agrupado.origem.includes(req.numero_requisicao)) {
            agrupado.origem.push(req.numero_requisicao);
          }
          agrupado.itens_origem.push(item);
          if (item.imagem_url && !agrupado.imagem_url) {
            agrupado.imagem_url = item.imagem_url;
          }
        });
      });

      const itensAgrupadosArray = Array.from(itensMap.values());
      setItensAgrupados(itensAgrupadosArray);
      setItensSelecionados(new Set(itensAgrupadosArray.map(i => getItemKey(i))));

      // Carregar fornecedores disponíveis e mapear para formato esperado
      const fornecedoresDadosResult = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId: selectedCompany.id,
        filters: {},
        page: 1,
        pageSize: 1000,
      });
      const fornecedoresDados = fornecedoresDadosResult.data || [];

      const partnersMapLocal = new Map<string, any>();
      const partners = (partnersData as any)?.data || partnersData || [];
      partners.forEach((p: any) => {
        partnersMapLocal.set(p.id, p);
      });

      // Mapear fornecedores da cotação
      const fornecedoresMapeados: FornecedorCotacao[] = fornecedoresCotacao.map((fc: any) => {
        const fornecedorDados = fornecedoresDados.find((fd: any) => fd.id === fc.fornecedor_id);
        const partner = fornecedorDados ? partnersMapLocal.get(fornecedorDados.partner_id) : null;
        
        return {
          id: fc.id, // ID do cotacao_fornecedores
          fornecedor_id: fc.fornecedor_id,
          fornecedor_nome: partner?.nome_fantasia || partner?.razao_social || 'Fornecedor',
          valor_frete: fc.valor_frete != null && fc.valor_frete !== '' ? Number(fc.valor_frete) : 0,
          valor_imposto: fc.valor_imposto != null && fc.valor_imposto !== '' ? Number(fc.valor_imposto) : 0,
          desconto_percentual: fc.desconto_percentual ? Number(fc.desconto_percentual) : 0,
          desconto_valor: fc.desconto_valor ? Number(fc.desconto_valor) : 0,
          prazo_entrega: fc.prazo_entrega,
          condicao_pagamento: fc.condicao_pagamento,
          // ✅ NOVOS CAMPOS: Condições de pagamento estruturadas
          forma_pagamento: fc.forma_pagamento || undefined,
          is_parcelada: fc.is_parcelada || false,
          numero_parcelas: fc.numero_parcelas || 1,
          intervalo_parcelas: fc.intervalo_parcelas || '30',
          observacoes: fc.observacoes,
        };
      });

      setFornecedores(fornecedoresMapeados);
      setFornecedoresDisponiveis(fornecedoresDados);

      // Criar mapa fornecedor x itens com valores cotados
      const mapa: MapaFornecedorItens = {};
      
      // Criar mapa: cotacao_fornecedor_id -> fornecedor_id
      const cotacaoFornecedorToFornecedorMap = new Map<string, string>();
      fornecedoresCotacao.forEach((fc: any) => {
        cotacaoFornecedorToFornecedorMap.set(fc.id, fc.fornecedor_id);
      });

      cotacaoItens.forEach((cotacaoItem: any) => {
        const fornecedorId = cotacaoFornecedorToFornecedorMap.get(cotacaoItem.cotacao_fornecedor_id);
        if (!fornecedorId || !cotacaoItem.requisicao_item_id) return;

        // Encontrar o item de requisição correspondente
        const requisicaoItem = requisicaoItensData.find(item => item.id === cotacaoItem.requisicao_item_id);
        if (!requisicaoItem) return;

        // Encontrar a requisição correspondente
        const requisicao = requisicoesData.find(req => req.id === requisicaoItem.requisicao_id);
        if (!requisicao) return;

        // Criar chave do item (material_id + tipo_requisicao)
        const tipoReq = requisicao.tipo_requisicao || 'sem_tipo';
        const itemKey = `${requisicaoItem.material_id}_${tipoReq}`;

        // Encontrar o fornecedor local ID (id do cotacao_fornecedores)
        const fornecedorLocal = fornecedoresMapeados.find(f => f.id === cotacaoItem.cotacao_fornecedor_id);
        if (!fornecedorLocal) return;

        if (!mapa[fornecedorLocal.id]) {
          mapa[fornecedorLocal.id] = {};
        }

        mapa[fornecedorLocal.id][itemKey] = {
          quantidade_ofertada: cotacaoItem.quantidade_ofertada || requisicaoItem.quantidade,
          valor_unitario: cotacaoItem.valor_unitario || 0,
          desconto_percentual: cotacaoItem.desconto_percentual || 0,
          desconto_valor: cotacaoItem.desconto_valor || 0,
          valor_frete: cotacaoItem.valor_frete != null ? Number(cotacaoItem.valor_frete) : 0,
          prazo_entrega_dias: cotacaoItem.prazo_entrega_dias || 0,
          condicao_pagamento: cotacaoItem.condicao_pagamento || '',
          observacoes: cotacaoItem.observacoes || '',
          is_vencedor: cotacaoItem.is_vencedor || false,
        };
      });

      setMapaFornecedorItens(mapa);

      setFormData({
        tipo_cotacao: quote.tipo_cotacao || 'reposicao',
        data_cotacao: quote.data_cotacao ? new Date(quote.data_cotacao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        data_limite: quote.prazo_resposta ? new Date(quote.prazo_resposta).toISOString().split('T')[0] : '',
        observacoes_internas: quote.observacoes || '',
        valor_frete: quote.valor_frete != null ? Number(quote.valor_frete) : 0,
        desconto_percentual: quote.desconto_percentual != null ? Number(quote.desconto_percentual) : 0,
        desconto_valor: quote.desconto_valor != null ? Number(quote.desconto_valor) : 0,
      });

      setLoadedRequisicoesIdsKey(`quote_${quoteId}`);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar cotação existente:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar cotação",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [selectedCompany?.id, partnersData, toast]);

  // Carregar dados iniciais
  useEffect(() => {
    // Se for cotação existente, carregar usando função específica
    if (isOpen && cotacaoId && selectedCompany?.id) {
      if (loadedRequisicoesIdsKey !== `quote_${cotacaoId}`) {
        loadExistingQuote(cotacaoId);
      }
      return;
    }

    // Resetar dados quando modal fechar
    if (!isOpen) {
      setRequisicoes([]);
      setItensAgrupados([]);
      setItensSelecionados(new Set());
      setFornecedores([]);
      setRateio([]);
      setLoadedRequisicoesIdsKey('');
      setMapaFornecedorItens({});
      return;
    }

    if (!isOpen || !selectedCompany?.id || requisicoesIds.length === 0) {
      return;
    }

    // Evitar recarregar se já temos os dados carregados para as mesmas requisições
    if (loadedRequisicoesIdsKey === requisicoesIdsKey && requisicoes.length > 0) {
      console.log('⏭️ [ModalGerarCotacao] Dados já carregados, pulando recarregamento');
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // Carregar requisições
        const requisicoesData: RequisicaoData[] = [];
        for (const reqId of requisicoesIds) {
          if (!isMounted) return; // Cancelar se componente foi desmontado
          
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            id: reqId,
            companyId: selectedCompany.id,
          });

          // Carregar itens da requisição
          const itensResult = await EntityService.list({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany.id,
            filters: { requisicao_id: reqId },
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });

          let itensRaw = itensResult.data || [];

          // Se itemIds foi fornecido (modo explodido), filtrar apenas os itens selecionados
          if (itemIds && itemIds.length > 0) {
            itensRaw = itensRaw.filter((item: any) => itemIds.includes(item.id));
            console.log('🔍 [ModalGerarCotacao] Modo explodido: filtrando itens. Total recebido:', itensResult.data?.length || 0, 'Filtrados:', itensRaw.length);
          }

          // ✅ IMPORTANTE: Filtrar itens que já estão em cotação ativa
          // Só aplicar esse filtro quando NÃO há cotacaoId (nova cotação)
          // Quando há cotacaoId (visualizando cotação existente), mostrar todos os itens da cotação
          if (!cotacaoId && itensRaw.length > 0) {
            try {
              // Buscar ciclos de cotação ativos para esta requisição
              const ciclosResult = await EntityService.list({
                schema: 'compras',
                table: 'cotacao_ciclos',
                companyId: selectedCompany.id,
                filters: { requisicao_id: reqId },
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true,
              });

              const ciclosAtivos = (ciclosResult.data || []).filter((ciclo: any) => {
                const state = ciclo.workflow_state || ciclo.status;
                return state === 'rascunho' || 
                       state === 'em_aprovacao' || 
                       state === 'aprovada' ||
                       state === 'aberta' ||
                       state === 'em_cotacao';
              });

              if (ciclosAtivos.length > 0) {
                const cicloIds = ciclosAtivos.map((ciclo: any) => ciclo.id);
                
                // Buscar fornecedores desses ciclos
                const fornecedoresResult = await EntityService.list({
                  schema: 'compras',
                  table: 'cotacao_fornecedores',
                  companyId: selectedCompany.id,
                  filters: {},
                  page: 1,
                  pageSize: 5000,
                  skipCompanyFilter: true,
                });

                const fornecedoresAtivos = (fornecedoresResult.data || []).filter((f: any) =>
                  cicloIds.includes(f.cotacao_ciclo_id || f.cotacao_id)
                );
                const fornecedorIds = fornecedoresAtivos.map((f: any) => f.id);

                if (fornecedorIds.length > 0) {
                  // Buscar itens cotados
                  const cotacaoItensResult = await EntityService.list({
                    schema: 'compras',
                    table: 'cotacao_item_fornecedor',
                    companyId: selectedCompany.id,
                    filters: {},
                    page: 1,
                    pageSize: 5000,
                    skipCompanyFilter: true,
                  });

                  const itensEmCotacao = (cotacaoItensResult.data || []).filter((item: any) =>
                    fornecedorIds.includes(item.cotacao_fornecedor_id)
                  );

                  const itemIdsEmCotacao = new Set(
                    itensEmCotacao
                      .map((item: any) => item.requisicao_item_id)
                      .filter(Boolean)
                  );

                  // Filtrar itens que NÃO estão em cotação ativa
                  const itensAntes = itensRaw.length;
                  itensRaw = itensRaw.filter((item: any) => !itemIdsEmCotacao.has(item.id));
                  const itensDepois = itensRaw.length;

                  console.log('🔍 [ModalGerarCotacao] Filtro de itens em cotação ativa:', {
                    requisicao_id: reqId,
                    ciclosAtivos: ciclosAtivos.length,
                    fornecedoresAtivos: fornecedorIds.length,
                    itensEmCotacao: itemIdsEmCotacao.size,
                    itensAntes,
                    itensDepois,
                    itensFiltrados: itensAntes - itensDepois,
                    itemIdsEmCotacao: Array.from(itemIdsEmCotacao)
                  });

                  if (itensAntes > itensDepois) {
                    toast({
                      title: "Aviso",
                      description: `${itensAntes - itensDepois} item(ns) já estão em cotação ativa e foram removidos da lista.`,
                      variant: "default",
                    });
                  }
                }
              }
            } catch (error) {
              console.error('⚠️ [ModalGerarCotacao] Erro ao verificar itens em cotação ativa:', error);
              // Não bloquear o fluxo se houver erro na verificação
            }
          }

          // Coletar todos os IDs de materiais únicos
          const materialIds = [...new Set(itensRaw.map((item: any) => item.material_id).filter(Boolean))];
          
          console.log('📋 IDs de materiais das requisições:', materialIds);
          
          // Buscar todos os materiais de uma vez
          const materiaisMap = new Map<string, any>();
          if (materialIds.length > 0) {
            try {
              // Buscar materiais filtrando pelos IDs específicos
              const materiaisResult = await EntityService.list({
                schema: 'almoxarifado',
                table: 'materiais_equipamentos',
                companyId: selectedCompany.id,
                filters: {},
                page: 1,
                pageSize: 1000,
              });

              console.log('📦 Materiais encontrados no banco:', materiaisResult.data?.length || 0);
              console.log('📦 Todos os materiais do banco:', materiaisResult.data);

              // Criar mapa de materiais por ID (usando múltiplas chaves para garantir correspondência)
              if (materiaisResult.data) {
                materiaisResult.data.forEach((material: any) => {
                  const materialIdStr = String(material.id);
                  // Mapear pelo ID como string
                  materiaisMap.set(materialIdStr, material);
                  // Também mapear pelo ID original (UUID) se for diferente
                  if (material.id && String(material.id) !== materialIdStr) {
                    materiaisMap.set(String(material.id), material);
                  }
                  // Mapear também pelo material_id se existir (pode ser referência a public.materials)
                  if (material.material_id) {
                    materiaisMap.set(String(material.material_id), material);
                  }
                  
                  // Debug: log de cada material encontrado
                  console.log('✅ Material mapeado:', {
                    id: material.id,
                    material_id: material.material_id,
                    nome: material.nome || material.descricao,
                    imagem_url: material.imagem_url,
                    imagem_url_tipo: typeof material.imagem_url,
                    imagem_url_length: material.imagem_url?.length,
                    imagem_url_trim: material.imagem_url?.trim(),
                    tem_imagem: !!(material.imagem_url && material.imagem_url.trim() !== ''),
                    material_completo: JSON.parse(JSON.stringify(material)) // Mostrar objeto completo serializado
                  });
                });
              }
            } catch (error) {
              console.error('Erro ao buscar materiais:', error);
            }
          }

          // Mapear itens com dados dos materiais
          const itens = itensRaw.map((item: any) => {
            const materialIdStr = String(item.material_id);
            
            // Estratégia 1: Tentar buscar diretamente pelo ID (se material_id da requisição = id do materiais_equipamentos)
            let material = materiaisMap.get(materialIdStr);
            
            // Estratégia 2: Se não encontrou, pode ser que o material_id da requisição seja referência a public.materials
            // e precisamos buscar pelo campo material_id do materiais_equipamentos (que referencia public.materials.id)
            if (!material) {
              // Procurar em todos os materiais pelo material_id
              for (const [key, mat] of materiaisMap.entries()) {
                if (mat.material_id && String(mat.material_id) === materialIdStr) {
                  material = mat;
                  console.log('✅ Material encontrado pelo material_id:', {
                    item_material_id: item.material_id,
                    material_id_encontrado: mat.material_id,
                    material_nome: mat.nome || mat.descricao
                  });
                  break;
                }
              }
            }
            
            // Estratégia 3: Tentar buscar pelo ID original também (caso haja diferença de tipo)
            if (!material) {
              material = materiaisMap.get(String(item.material_id));
            }
            
            // Buscar imagem_url do material - verificar se existe e não está vazia
            const imagemUrl = material?.imagem_url && typeof material.imagem_url === 'string' && material.imagem_url.trim() !== '' 
              ? material.imagem_url.trim() 
              : null;
            
            // Debug: log para verificar se a imagem está sendo encontrada
            console.log('🔍 Mapeamento item -> material:', {
              item_material_id: item.material_id,
              materialIdStr,
              material_encontrado: !!material,
              material_id: material?.id,
              material_material_id: material?.material_id,
              material_nome: material?.nome || material?.descricao,
              imagem_url_original: material?.imagem_url,
              imagem_url_original_tipo: typeof material?.imagem_url,
              imagem_url_original_length: material?.imagem_url?.length,
              imagem_url_original_trim: material?.imagem_url?.trim(),
              imagem_url_final: imagemUrl,
              imagem_url_final_tipo: typeof imagemUrl,
              tem_imagem: !!imagemUrl,
              item_imagem_url: item.imagem_url // Verificar se já está no item
            });
            
            // Log adicional se não encontrou material
            if (!material) {
              console.warn('⚠️ Material NÃO encontrado para item:', {
                item_material_id: item.material_id,
                materialIdStr,
                chaves_disponiveis_no_map: Array.from(materiaisMap.keys()).slice(0, 10) // Limitar a 10 para não poluir
              });
            } else if (!imagemUrl) {
              console.warn('⚠️ Material encontrado mas SEM imagem_url:', {
                material_id: material.id,
                material_nome: material.nome || material.descricao,
                imagem_url: material.imagem_url,
                imagem_url_tipo: typeof material.imagem_url
              });
            }
            
            return {
              ...item,
              requisicao_numero: requisicao.numero_requisicao,
              material_nome: material?.nome || material?.descricao || item.material_nome || 'Material não encontrado',
              material_codigo: material?.codigo_interno || material?.codigo || item.material_codigo || '',
              imagem_url: imagemUrl,
            };
          });

          requisicoesData.push({
            id: requisicao.id,
            numero_requisicao: requisicao.numero_requisicao || reqId.substring(0, 8),
            centro_custo_id: requisicao.centro_custo_id,
            projeto_id: requisicao.projeto_id,
            tipo_requisicao: requisicao.tipo_requisicao,
            prioridade: requisicao.prioridade,
            local_entrega: requisicao.local_entrega,
            itens,
          });
        }

        setRequisicoes(requisicoesData);

        // Agrupar itens por material_id E tipo_requisicao
        // IMPORTANTE: O mesmo material pode aparecer em tipos diferentes de requisição
        // e deve ser tratado como itens separados para diferenciar origem e tipo
        // A quantidade_total deve ser a SOMA de todas as quantidades
        // dos itens com o mesmo material_id E tipo_requisicao
        const itensMap = new Map<string, ItemAgrupado>();
        requisicoesData.forEach((req) => {
          req.itens.forEach((item) => {
            // Chave composta: material_id + tipo_requisicao
            const tipoReq = req.tipo_requisicao || 'sem_tipo';
            const key = `${item.material_id}_${tipoReq}`;
            if (!itensMap.has(key)) {
              itensMap.set(key, {
                material_id: item.material_id,
                material_nome: item.material_nome || 'Material sem nome',
                material_codigo: item.material_codigo || '',
                unidade_medida: item.unidade_medida || 'UN',
                quantidade_total: 0, // Será somado abaixo
                origem: [],
                tipo_requisicao: tipoReq,
                selecionado: true,
                itens_origem: [],
                imagem_url: item.imagem_url, // Preservar imagem_url do item
              });
            }
            const agrupado = itensMap.get(key)!;
            // Soma a quantidade do item atual à quantidade total do material agrupado
            agrupado.quantidade_total += Number(item.quantidade) || 0;
            if (!agrupado.origem.includes(req.numero_requisicao)) {
              agrupado.origem.push(req.numero_requisicao);
            }
            agrupado.itens_origem.push(item);
            // Se o item atual tem imagem_url e o agrupado não tem, atualizar
            if (item.imagem_url && !agrupado.imagem_url) {
              agrupado.imagem_url = item.imagem_url;
            }
          });
        });

        const itensAgrupadosArray = Array.from(itensMap.values());
        setItensAgrupados(itensAgrupadosArray);
        // Usar chave composta (material_id + tipo_requisicao) para seleção
        setItensSelecionados(new Set(itensAgrupadosArray.map(i => getItemKey(i))));

        // Definir tipo da cotação com base nas requisições selecionadas
        const tiposRequisicao = Array.from(
          new Set(
            requisicoesData
              .map((r) => r.tipo_requisicao)
              .filter(Boolean)
          )
        ) as Array<'reposicao' | 'compra_direta'>;

        let tipoCotacao: 'reposicao' | 'compra_direta' = 'reposicao';

        if (tiposRequisicao.length === 1) {
          // Todas as requisições têm o mesmo tipo
          tipoCotacao = tiposRequisicao[0];
        } else if (tiposRequisicao.includes('compra_direta')) {
          // Caso misto entre reposição e compra direta, priorizar compra direta
          tipoCotacao = 'compra_direta';
        }

        // Verificar se há requisições emergenciais
        const temEmergencial = requisicoesData.some((r) => r.is_emergencial === true);

        setFormData(prev => ({
          ...prev,
          tipo_cotacao: tipoCotacao,
          is_emergencial: temEmergencial,
        }));

        // Carregar fornecedores disponíveis
        // Primeiro, carregar todos os partners ativos do tipo 'fornecedor'
        try {
          // Carregar todos os partners ativos
          const partnersResult = await EntityService.list({
            schema: 'public',
            table: 'partners',
            companyId: selectedCompany.id,
            filters: { ativo: true },
            page: 1,
            pageSize: 1000,
          });
          const allPartners = partnersResult.data || [];
          
          // Filtrar apenas partners do tipo 'fornecedor'
          const fornecedorPartners = allPartners.filter((p: any) => 
            Array.isArray(p.tipo) && p.tipo.includes('fornecedor')
          );
          
          console.log('📦 [ModalGerarCotacao] Partners do tipo fornecedor encontrados:', fornecedorPartners.length);
          
          // Carregar fornecedores_dados para obter dados adicionais
          const fornecedoresDadosResult = await EntityService.list({
              schema: 'compras',
              table: 'fornecedores_dados',
              companyId: selectedCompany.id,
              filters: {},
              page: 1,
            pageSize: 1000,
          });
          const fornecedoresDados = fornecedoresDadosResult.data || [];
          
          // Criar mapa: partner_id -> fornecedores_dados
          const fornecedoresDadosMap = new Map(
            fornecedoresDados.map((fd: any) => [fd.partner_id, fd])
          );
          
          // Criar lista de fornecedores disponíveis combinando partners e fornecedores_dados
          // Se o partner tem fornecedores_dados, usar os dados dele
          // Se não tem, criar um objeto virtual com dados do partner
          const fornecedoresDisponiveisList = fornecedorPartners.map((partner: any) => {
            const fornecedorDados = fornecedoresDadosMap.get(partner.id);
            
            if (fornecedorDados) {
              // Se tem fornecedores_dados, usar ele
              return {
                ...fornecedorDados,
                partner_id: partner.id,
                // Garantir que tem os dados do partner
                partner_nome_fantasia: partner.nome_fantasia,
                partner_razao_social: partner.razao_social,
                partner_cnpj: partner.cnpj,
              };
          } else {
              // Se não tem fornecedores_dados, criar objeto virtual
              // Usar partner.id como id temporário (será substituído quando criar fornecedores_dados)
              return {
                id: `temp_${partner.id}`, // ID temporário
                partner_id: partner.id,
                company_id: selectedCompany.id,
                contato_principal: (partner.contato as any)?.nome_contato || null,
                email_cotacao: (partner.contato as any)?.email || null,
                telefone: (partner.contato as any)?.telefone || (partner.contato as any)?.celular || null,
                uf: (partner.endereco as any)?.estado || null,
                cidade: (partner.endereco as any)?.cidade || null,
                status: 'ativo', // Default para novos
                // Dados do partner para exibição
                partner_nome_fantasia: partner.nome_fantasia,
                partner_razao_social: partner.razao_social,
                partner_cnpj: partner.cnpj,
                is_virtual: true, // Flag para indicar que precisa criar fornecedores_dados
              };
            }
          });
          
          console.log('📦 [ModalGerarCotacao] Fornecedores disponíveis (partners + dados):', fornecedoresDisponiveisList.length);
          console.log('📦 [ModalGerarCotacao] Fornecedores com dados:', fornecedoresDisponiveisList.filter((f: any) => !f.is_virtual).length);
          console.log('📦 [ModalGerarCotacao] Fornecedores virtuais (sem dados):', fornecedoresDisponiveisList.filter((f: any) => f.is_virtual).length);
          
          setFornecedoresDisponiveis(fornecedoresDisponiveisList);
        } catch (error) {
          console.error('❌ [ModalGerarCotacao] Erro ao carregar fornecedores:', error);
          setFornecedoresDisponiveis([]);
        }

        // Definir data limite padrão (7 dias)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + 7);
        setFormData(prev => ({
          ...prev,
          data_limite: dataLimite.toISOString().split('T')[0],
        }));

        // Marcar como carregado
        if (isMounted) {
          setLoadedRequisicoesIdsKey(requisicoesIdsKey);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (isMounted) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados das requisições.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedCompany?.id, requisicoesIdsKey]);

  // Calcular rateio quando itens ou fornecedores mudarem
  useEffect(() => {
    if (itensAgrupados.length === 0 || fornecedores.length === 0) {
      setRateio([]);
      return;
    }

    const rateioItems: RateioItem[] = [];
    const itensSelecionadosArray = itensAgrupados.filter(i =>
      itensSelecionados.has(getItemKey(i))
    );

    // Primeiro, calcular totais por fornecedor vencedor para rateio de custos adicionais
    // Mapa: fornecedor_id -> { subtotal, frete, imposto, totalItens }
    const totaisPorFornecedor = new Map<string, {
      subtotal: number;
      frete: number;
      imposto: number;
      totalItens: number;
    }>();

    itensSelecionadosArray.forEach((itemAgrupado) => {
      const itemKey = getItemKey(itemAgrupado);
      const fornecedorVencedor = fornecedores.find((f) => {
        const cell = mapaFornecedorItens[f.id]?.[itemKey];
        return cell && cell.is_vencedor === true;
      });

      if (!fornecedorVencedor) return;

      const cellSelecionada = mapaFornecedorItens[fornecedorVencedor.id]?.[itemKey];
      if (!cellSelecionada) return;

      const quantidadeUsada = Math.min(
        cellSelecionada.quantidade_ofertada || 0,
        itemAgrupado.quantidade_total
      );

      // Calcular valor do item após descontos (sem custos adicionais)
      const descontoUnit =
        (cellSelecionada.desconto_percentual || 0) > 0
          ? (cellSelecionada.valor_unitario || 0) *
            ((cellSelecionada.desconto_percentual || 0) / 100)
          : 0;
      const descontoUnitAbsoluto =
        quantidadeUsada > 0
          ? (cellSelecionada.desconto_valor || 0) / quantidadeUsada
          : 0;
      const valorUnitarioEfetivo =
        (cellSelecionada.valor_unitario || 0) - descontoUnit - descontoUnitAbsoluto;
      const valorTotalItem = quantidadeUsada * Math.max(0, valorUnitarioEfetivo);

      // Acumular subtotal por fornecedor
      const fornecedorId = fornecedorVencedor.id;
      if (!totaisPorFornecedor.has(fornecedorId)) {
        // Garantir que os valores sejam numéricos
        const frete = typeof fornecedorVencedor.valor_frete === 'number' 
          ? fornecedorVencedor.valor_frete 
          : (fornecedorVencedor.valor_frete != null && fornecedorVencedor.valor_frete !== '' ? Number(fornecedorVencedor.valor_frete) : 0);
        const imposto = typeof fornecedorVencedor.valor_imposto === 'number' 
          ? fornecedorVencedor.valor_imposto 
          : (fornecedorVencedor.valor_imposto != null && fornecedorVencedor.valor_imposto !== '' ? Number(fornecedorVencedor.valor_imposto) : 0);
        totaisPorFornecedor.set(fornecedorId, {
          subtotal: 0,
          frete,
          imposto,
          totalItens: 0,
        });
      }

      const totalFornecedor = totaisPorFornecedor.get(fornecedorId)!;
      totalFornecedor.subtotal += valorTotalItem;
      totalFornecedor.totalItens += itemAgrupado.itens_origem.length;
    });

    // Agora calcular rateio com custos adicionais proporcionais
    itensSelecionadosArray.forEach((itemAgrupado) => {
      const itemKey = getItemKey(itemAgrupado);
      const fornecedorVencedor = fornecedores.find((f) => {
          const cell = mapaFornecedorItens[f.id]?.[itemKey];
        return cell && cell.is_vencedor === true;
      });

      if (!fornecedorVencedor) {
        console.warn(`Item ${itemAgrupado.material_nome} não tem fornecedor vencedor selecionado`);
            return;
          }

      const cellSelecionada = mapaFornecedorItens[fornecedorVencedor.id]?.[itemKey];
      if (!cellSelecionada) return;

      const quantidadeUsada = Math.min(
        cellSelecionada.quantidade_ofertada || 0,
        itemAgrupado.quantidade_total
      );

      // Calcular valor do item após descontos (PRESERVAR valor unitário - sem custos adicionais)
      const descontoUnit =
        (cellSelecionada.desconto_percentual || 0) > 0
          ? (cellSelecionada.valor_unitario || 0) *
            ((cellSelecionada.desconto_percentual || 0) / 100)
          : 0;
      const descontoUnitAbsoluto =
        quantidadeUsada > 0
          ? (cellSelecionada.desconto_valor || 0) / quantidadeUsada
          : 0;
      // IMPORTANTE: valor_unitario preservado - não inclui custos adicionais
      const valorUnitarioEfetivo =
        (cellSelecionada.valor_unitario || 0) - descontoUnit - descontoUnitAbsoluto;
      const valorTotalItem = quantidadeUsada * Math.max(0, valorUnitarioEfetivo);

      // Obter totais do fornecedor para calcular proporção
      const totalFornecedor = totaisPorFornecedor.get(fornecedorVencedor.id);
      if (!totalFornecedor) return;

      // Calcular proporção deste item no subtotal do fornecedor
      const proporcaoItem = totalFornecedor.subtotal > 0 
        ? valorTotalItem / totalFornecedor.subtotal 
        : 0;

      // Ratear custos adicionais proporcionalmente ao valor do item
      const freteProporcional = totalFornecedor.frete * proporcaoItem;
      const impostoProporcional = totalFornecedor.imposto * proporcaoItem;
      const custosAdicionais = freteProporcional + impostoProporcional;

      itemAgrupado.itens_origem.forEach((item) => {
        const requisicao = requisicoes.find(r => r.id === item.requisicao_id);
        if (!requisicao) return;

        // Para cada item da requisição, calcular sua proporção no item agrupado
        const proporcaoItemRequisicao = quantidadeUsada > 0 
          ? (item.quantidade || 0) / quantidadeUsada 
          : 0;

        const valorTotalItemRequisicao = (item.quantidade || 0) * Math.max(0, valorUnitarioEfetivo);
        const freteProporcionalItem = freteProporcional * proporcaoItemRequisicao;
        const impostoProporcionalItem = impostoProporcional * proporcaoItemRequisicao;
        const custosAdicionaisItem = custosAdicionais * proporcaoItemRequisicao;

        rateioItems.push({
          item_id: item.id,
          material_id: item.material_id,
          material_nome: itemAgrupado.material_nome,
          requisicao_id: requisicao.id,
          requisicao_numero: requisicao.numero_requisicao,
          centro_custo_id: requisicao.centro_custo_id,
          centro_custo_nome: requisicao.centro_custo_id
            ? costCentersMap.get(requisicao.centro_custo_id)
            : undefined,
          projeto_id: requisicao.projeto_id,
          projeto_nome: requisicao.projeto_id
            ? projectsMap.get(requisicao.projeto_id)
            : undefined,
          quantidade: item.quantidade, // rateio espelha requisição
          // IMPORTANTE: valor_unitario preservado - NÃO inclui custos adicionais
          valor_unitario: Math.max(0, valorUnitarioEfetivo),
          valor_total: valorTotalItemRequisicao, // Valor total SEM custos adicionais
          frete_proporcional: freteProporcionalItem,
          imposto_proporcional: impostoProporcionalItem,
          custos_adicionais: custosAdicionaisItem,
          valor_total_com_custos: valorTotalItemRequisicao + custosAdicionaisItem,
        });
      });
    });

    // Validar que o total do rateio fecha com o valor total da cotação (incluindo custos adicionais)
    const totalRateioItens = rateioItems.reduce((sum, item) => sum + (item.valor_total || 0), 0);
    const totalRateioCustos = rateioItems.reduce((sum, item) => sum + (item.custos_adicionais || 0), 0);
    const totalRateio = totalRateioItens + totalRateioCustos;
    
    // Calcular valor total esperado da cotação (subtotal + frete + imposto - descontos)
    const valorTotalEsperado = fornecedores
      .filter(f => f.fornecedor_id)
      .reduce((sum, f) => {
        const subtotalParcial = itensAgrupados
          .filter((item) => itensSelecionados.has(getItemKey(item)))
          .reduce((subSum, item) => {
            const itemKey = getItemKey(item);
            const cell = mapaFornecedorItens[f.id]?.[itemKey];
            if (cell && cell.is_vencedor) {
              const bruto = (cell.quantidade_ofertada || 0) * (cell.valor_unitario || 0);
              const descPct = bruto * ((cell.desconto_percentual || 0) / 100);
              const descAbs = cell.desconto_valor || 0;
              const valorItem = Math.max(0, bruto - descPct - descAbs);
              return subSum + valorItem;
            }
            return subSum;
          }, 0);
        
        const frete = f.valor_frete || 0;
        const imposto = f.valor_imposto || 0;
        const descontoPct = f.desconto_percentual || 0;
        const descontoValor = f.desconto_valor || 0;
        const descontoCalculado = subtotalParcial * (descontoPct / 100) + descontoValor;
        const totalFornecedor = subtotalParcial + frete + imposto - descontoCalculado;
        
        return sum + totalFornecedor;
      }, 0);
    
    // Validar fechamento do rateio (permitir diferença de centavos por arredondamento)
    const diferenca = Math.abs(totalRateio - valorTotalEsperado);
    if (diferenca > 0.01 && rateioItems.length > 0) {
      console.warn('⚠️ [Rateio] Diferença entre total do rateio e valor total da cotação:', {
        totalRateio,
        valorTotalEsperado,
        diferenca,
        totalRateioItens,
        totalRateioCustos
      });
      
      // Ajustar o último item para fechar exatamente (se houver diferença pequena por arredondamento)
      if (diferenca < 1.00 && rateioItems.length > 0) {
        const ultimoItem = rateioItems[rateioItems.length - 1];
        const ajuste = valorTotalEsperado - totalRateio;
        if (ultimoItem.custos_adicionais !== undefined) {
          ultimoItem.custos_adicionais = (ultimoItem.custos_adicionais || 0) + ajuste;
          ultimoItem.valor_total_com_custos = (ultimoItem.valor_total || 0) + (ultimoItem.custos_adicionais || 0);
        }
      }
    }

    setRateio(rateioItems);
  }, [
    itensAgrupados,
    itensSelecionados,
    fornecedores,
    requisicoes,
    mapaFornecedorItens,
    costCentersMap,
    projectsMap,
  ]);

  // Sincronizar mapa item x fornecedor quando fornecedores ou itens mudam
  useEffect(() => {
    if (fornecedores.length === 0 || itensAgrupados.length === 0) {
      setMapaFornecedorItens({});
      return;
    }

    setMapaFornecedorItens((prev) => {
      const next: MapaFornecedorItens = { ...prev };

      fornecedores.forEach((fornecedor) => {
        if (!next[fornecedor.id]) next[fornecedor.id] = {};

        itensAgrupados.forEach((item) => {
          const itemKey = getItemKey(item);
          if (!next[fornecedor.id][itemKey]) {
            next[fornecedor.id][itemKey] = {
              quantidade_ofertada: item.quantidade_total,
              valor_unitario: 0,
              desconto_percentual: 0,
              desconto_valor: 0,
              valor_frete: 0,
              prazo_entrega_dias: 0,
              condicao_pagamento: '',
              observacoes: '',
              is_vencedor: false,
            };
          }
        });
      });

      // Limpar fornecedores removidos
      Object.keys(next).forEach((fornecedorId) => {
        if (!fornecedores.find((f) => f.id === fornecedorId)) {
          delete next[fornecedorId];
        }
      });

      return { ...next };
    });
  }, [fornecedores, itensAgrupados]);

  const handleAddFornecedor = () => {
    if (formData.is_emergencial && fornecedores.length >= 1) {
      toast({
        title: "Atenção",
        description: "Cotações emergenciais permitem apenas 1 fornecedor.",
        variant: "destructive",
      });
      return;
    }

    if (fornecedores.length >= 6) {
      toast({
        title: "Atenção",
        description: "Máximo de 6 fornecedores permitidos.",
        variant: "destructive",
      });
      return;
    }

    setFornecedores([
      ...fornecedores,
      {
        id: `temp-${Date.now()}`,
        fornecedor_id: '',
        preco_unitario: 0,
        prazo_entrega: 0,
        condicao_pagamento: '',
        observacoes: '',
      },
    ]);
  };

  const handleRemoveFornecedor = (id: string) => {
    setFornecedores(fornecedores.filter(f => f.id !== id));
  };

  const handleUpdateFornecedor = async (id: string, field: keyof FornecedorCotacao, value: any) => {
    // Validação: não permitir fornecedores duplicados
    if (field === 'fornecedor_id' && value) {
      // Verificar se o fornecedor já foi selecionado em outra linha
      const fornecedorJaSelecionado = fornecedores.some(
        (f) => f.id !== id && f.fornecedor_id === value
      );
      
      if (fornecedorJaSelecionado) {
        toast({
          title: "Atenção",
          description: "Este fornecedor já foi adicionado à cotação. Não é possível adicionar o mesmo fornecedor duas vezes.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Se está selecionando um fornecedor e o valor é um ID virtual (temp_*), criar fornecedores_dados
    if (field === 'fornecedor_id' && value && value.startsWith('temp_')) {
      const partnerId = value.replace('temp_', '');
      const fornecedorVirtual = fornecedoresDisponiveis.find((fd: any) => fd.id === value);
      
      if (fornecedorVirtual && fornecedorVirtual.is_virtual) {
        try {
          // Criar fornecedores_dados para este partner
          const novoFornecedorDados = await EntityService.create({
            schema: 'compras',
            table: 'fornecedores_dados',
            companyId: selectedCompany?.id || '',
            data: {
              partner_id: partnerId,
              company_id: selectedCompany?.id,
              status: 'ativo',
              contato_principal: fornecedorVirtual.contato_principal || null,
              email_cotacao: fornecedorVirtual.email_cotacao || null,
              telefone: fornecedorVirtual.telefone || null,
              uf: fornecedorVirtual.uf || null,
              cidade: fornecedorVirtual.cidade || null,
            },
          });
          
          // Atualizar a lista de fornecedores disponíveis para incluir o novo
          const updatedFornecedor = {
            ...novoFornecedorDados,
            partner_id: partnerId,
            partner_nome_fantasia: fornecedorVirtual.partner_nome_fantasia,
            partner_razao_social: fornecedorVirtual.partner_razao_social,
            partner_cnpj: fornecedorVirtual.partner_cnpj,
          };
          
          setFornecedoresDisponiveis((prev: any[]) => 
            prev.map((fd: any) => fd.id === value ? updatedFornecedor : fd)
          );
          
          // Usar o novo ID real
          value = (novoFornecedorDados as any).id || value;
          
          toast({
            title: "Sucesso",
            description: "Dados de compras criados para o fornecedor.",
          });
        } catch (error: any) {
          console.error('Erro ao criar fornecedores_dados:', error);
          toast({
            title: "Erro",
            description: error.message || "Erro ao criar dados de compras para o fornecedor.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    setFornecedores(fornecedores.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
    
    // Limpar busca após seleção
    if (field === 'fornecedor_id') {
      setBuscaFornecedor('');
    }
  };

  const handleUpdateMapaValor = (
    fornecedorId: string,
    item: ItemAgrupado,
    field: keyof ItemFornecedorValor,
    value: any
  ) => {
    const itemKey = getItemKey(item);
    setMapaFornecedorItens((prev) => {
      const next = { ...prev };
      if (!next[fornecedorId]) next[fornecedorId] = {};
      if (!next[fornecedorId][itemKey]) {
        next[fornecedorId][itemKey] = {
          quantidade_ofertada: item.quantidade_total,
          valor_unitario: 0,
          desconto_percentual: 0,
          desconto_valor: 0,
          valor_frete: 0,
          prazo_entrega_dias: 0,
          condicao_pagamento: '',
          observacoes: '',
          is_vencedor: false,
        };
      }
      (next[fornecedorId][itemKey] as any)[field] = value;
      return { ...next };
    });
  };

  // Função para selecionar fornecedor vencedor de um item (apenas um por item)
  const handleSelectVencedor = useCallback((
    fornecedorId: string,
    item: ItemAgrupado,
    checked: boolean
  ) => {
    const itemKey = getItemKey(item);
    setMapaFornecedorItens((prev) => {
      const next = { ...prev };
      
      // Se marcado, desmarcar todos os outros fornecedores deste item
      if (checked) {
        // Iterar sobre todas as chaves de fornecedores no mapa para desmarcar todos
        Object.keys(next).forEach((fId) => {
          if (fId !== fornecedorId && next[fId] && next[fId][itemKey]) {
            next[fId][itemKey] = {
              ...next[fId][itemKey],
              is_vencedor: false,
            };
          }
        });
        
        // Marcar o fornecedor selecionado
        if (!next[fornecedorId]) next[fornecedorId] = {};
        if (!next[fornecedorId][itemKey]) {
          next[fornecedorId][itemKey] = {
            quantidade_ofertada: item.quantidade_total,
            valor_unitario: 0,
            desconto_percentual: 0,
            desconto_valor: 0,
            valor_frete: 0,
            prazo_entrega_dias: 0,
            condicao_pagamento: '',
            observacoes: '',
            is_vencedor: false,
          };
        }
        next[fornecedorId][itemKey] = {
          ...next[fornecedorId][itemKey],
          is_vencedor: true,
        };
      } else {
        // Se desmarcado, apenas remover o vencedor
        if (next[fornecedorId] && next[fornecedorId][itemKey]) {
          next[fornecedorId][itemKey] = {
            ...next[fornecedorId][itemKey],
            is_vencedor: false,
          };
        }
      }
      
      return { ...next };
    });
  }, []);

  // Função para selecionar automaticamente os valores mais baratos de cada item
  const handleSelectLowestPrices = useCallback(() => {
    const fornecedoresValidosList = fornecedores.filter(f => f.fornecedor_id);
    
    itensAgrupados
      .filter((item) => itensSelecionados.has(getItemKey(item)))
      .forEach((item) => {
        const itemKey = getItemKey(item);
        let lowestValue: number | null = null;
        let lowestSupplierId: string | null = null;

        fornecedoresValidosList.forEach((f) => {
          const cell = mapaFornecedorItens[f.id]?.[itemKey];
          if (cell) {
            // Calcular o valor total do item considerando:
            // 1. Valor do item (quantidade * valor_unitario) com descontos
            // 2. Frete do item (se houver)
            const valorItem = valorItemCalculado(cell);
            const freteItem = cell.valor_frete || 0;
            const total = valorItem + freteItem;
            
            if (total > 0) {
              if (lowestValue === null || total < lowestValue) {
                lowestValue = total;
                lowestSupplierId = f.id;
              }
            }
          }
        });

        if (lowestSupplierId) {
          handleSelectVencedor(lowestSupplierId, item, true);
        }
      });
  }, [fornecedores, itensAgrupados, itensSelecionados, mapaFornecedorItens, handleSelectVencedor]);

  // Função para selecionar todos os itens de um fornecedor específico
  const handleSelectSupplierForAllItems = useCallback((fornecedorId: string) => {
    itensAgrupados
      .filter((item) => itensSelecionados.has(getItemKey(item)))
      .forEach((item) => {
        const itemKey = getItemKey(item);
        const cell = mapaFornecedorItens[fornecedorId]?.[itemKey];
        // Verificar se o fornecedor tem valores preenchidos para este item
        if (cell && valorItemCalculado(cell) > 0) {
          handleSelectVencedor(fornecedorId, item, true);
        }
      });
  }, [itensAgrupados, itensSelecionados, mapaFornecedorItens, handleSelectVencedor]);

  const handleToggleItem = (item: ItemAgrupado) => {
    const itemKey = getItemKey(item);
    setItensSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Função helper para verificar se itens ainda estão disponíveis
  const verificarItensDisponiveis = useCallback(async (itemIds: Set<string>) => {
    if (!selectedCompany?.id || itemIds.size === 0) return;

    try {
      // Buscar estado atual dos itens
      const itensAtuais = await Promise.all(
        Array.from(itemIds).map(async (itemId) => {
          try {
            return await EntityService.getById({
              schema: 'compras',
              table: 'requisicao_itens',
              id: itemId,
              companyId: selectedCompany.id,
            });
          } catch (error) {
            console.error(`Erro ao buscar item ${itemId}:`, error);
            return null;
          }
        })
      );

      // Filtrar itens que já estão cotados
      const itensIndisponiveis = itensAtuais.filter(
        (item: any) => item && item.status === 'cotado'
      );

      if (itensIndisponiveis.length > 0) {
        const itensInfo = itensIndisponiveis.slice(0, 3).map((item: any) => 
          item.id.substring(0, 8)
        ).join(', ');
        const maisItens = itensIndisponiveis.length > 3 ? ` e mais ${itensIndisponiveis.length - 3}` : '';
        
        throw new Error(
          `Os seguintes itens já foram cotados por outro comprador: ${itensInfo}${maisItens}. ` +
          `Por favor, recarregue a página e selecione apenas itens disponíveis.`
        );
      }
    } catch (error: any) {
      if (error.message?.includes('já foram cotados')) {
        throw error; // Relançar erro específico
      }
      console.error('Erro ao verificar disponibilidade dos itens:', error);
      // Em caso de erro na verificação, continuar mas alertar
      toast({
        title: "Atenção",
        description: "Não foi possível verificar se todos os itens estão disponíveis. Prosseguindo com cautela...",
        variant: "default",
      });
    }
  }, [selectedCompany?.id, toast]);

  const handleSalvarRascunho = async () => {
    // Validações mínimas para rascunho
    if (itensSelecionados.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um item para salvar como rascunho.",
        variant: "destructive",
      });
      return;
    }

    if (fornecedoresValidos === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um fornecedor para salvar como rascunho.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // ✅ NOVO: Coletar IDs dos itens que serão cotados ANTES de verificar
      const requisicaoItemIdsParaVerificar = new Set<string>();
      itensAgrupados
        .filter((item) => itensSelecionados.has(getItemKey(item)))
        .forEach((item) => {
          item.itens_origem.forEach((origem) => {
            requisicaoItemIdsParaVerificar.add(origem.id);
          });
        });

      // ✅ VERIFICAÇÃO DE CONCORRÊNCIA: Verificar se itens ainda estão disponíveis
      try {
        await verificarItensDisponiveis(requisicaoItemIdsParaVerificar);
      } catch (error: any) {
        setSubmitting(false);
        toast({
          title: "Item indisponível",
          description: error.message,
          variant: "destructive",
        });
        // Invalidar queries para recarregar dados
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      // Preparar dados para envio (similar ao handleEnviarAprovacao, mas sem validações rigorosas)
      // ✅ IMPORTANTE: Incluir valor_frete, valor_imposto, desconto_percentual e desconto_valor para que sejam salvos no banco
      // ✅ NOVO: Incluir condições de pagamento estruturadas
      const fornecedoresData = fornecedores.map((f) => ({
        fornecedor_id: f.fornecedor_id,
        prazo_entrega: f.prazo_entrega || 0,
        condicoes_comerciais: f.condicao_pagamento || '',
        valor_frete: f.valor_frete != null ? Number(f.valor_frete) : 0,
        valor_imposto: f.valor_imposto != null ? Number(f.valor_imposto) : 0,
        desconto_percentual: f.desconto_percentual != null ? Number(f.desconto_percentual) : 0,
        desconto_valor: f.desconto_valor != null ? Number(f.desconto_valor) : 0,
        // ✅ NOVOS CAMPOS: Condições de pagamento
        forma_pagamento: f.forma_pagamento || null,
        is_parcelada: f.is_parcelada || false,
        numero_parcelas: f.is_parcelada ? (f.numero_parcelas || 1) : 1,
        intervalo_parcelas: f.is_parcelada ? (f.intervalo_parcelas || '30') : '30',
      }));

      // Coletar requisicao_item_ids dos itens selecionados para validação no modo explodido
      const requisicaoItemIds = Array.from(requisicaoItemIdsParaVerificar);

      const cicloResponse: any = await startQuoteCycleMutation.mutateAsync({
        requisicao_id: requisicoesIds[0],
        fornecedores: fornecedoresData,
        prazo_resposta: formData.data_limite?.trim() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias padrão se não informado
        observacoes: formData.observacoes_internas?.trim() || null,
        requisicao_item_ids: requisicaoItemIds.length > 0 ? requisicaoItemIds : undefined,
      });

      const fornecedoresCriados = cicloResponse?.fornecedores || [];
      const cicloId = cicloResponse?.ciclo?.id || cicloResponse?.id;

      // ✅ IMPORTANTE: Atualizar workflow_state E status do ciclo para 'rascunho'
      // Isso garante que o status apareça corretamente na UI
      if (cicloId) {
        try {
          const updateResult = await EntityService.update({
            schema: 'compras',
            table: 'cotacao_ciclos',
            companyId: selectedCompany!.id,
            id: cicloId,
            data: {
              workflow_state: 'rascunho',
              status: 'rascunho',
              observacoes: formData.observacoes_internas?.trim() || null,
              valor_frete: formData.valor_frete != null ? Number(formData.valor_frete) : 0,
              desconto_percentual: formData.desconto_percentual != null ? Number(formData.desconto_percentual) : 0,
              desconto_valor: formData.desconto_valor != null ? Number(formData.desconto_valor) : 0,
            },
          });
          console.log('✅ [handleGerarCotacao] Status do ciclo atualizado para rascunho:', updateResult);
        } catch (error) {
          console.error('❌ [handleGerarCotacao] Erro ao atualizar workflow_state do ciclo:', error);
        }
      }

      // ✅ CORREÇÃO: Mapear fornecedores corretamente mesmo quando já existem
      // O mapeamento deve ser por fornecedor_id, não por índice, pois fornecedores existentes
      // podem estar em posições diferentes no array
      const mapFornecedorParaCotacao = new Map<string, string>();
      fornecedores.forEach((f) => {
        // Buscar pelo fornecedor_id para garantir que encontramos o registro correto
        const created = fornecedoresCriados.find((fc: any) => fc.fornecedor_id === f.fornecedor_id);
        if (created?.id) {
          mapFornecedorParaCotacao.set(f.id, created.id);
        } else {
          console.warn(`[handleSalvarRascunho] ⚠️ Fornecedor ${f.fornecedor_id} (${f.fornecedor_nome}) não encontrado em fornecedoresCriados`);
        }
      });

      // ✅ IMPORTANTE: Atualizar fornecedores com valor_frete, valor_imposto e desconto
      // Esses valores foram inseridos pelo comprador no painel e precisam ser salvos
      const updateFornecedoresPromises = fornecedores.map(async (f) => {
        const cotacaoFornecedorId = mapFornecedorParaCotacao.get(f.id);
        if (!cotacaoFornecedorId) {
          console.warn(`[handleSalvarRascunho] ⚠️ Fornecedor local ${f.id} não tem ID de cotacao_fornecedores mapeado`);
          return;
        }

        try {
          const valoresParaSalvar = {
            valor_frete: f.valor_frete != null ? Number(f.valor_frete) : 0,
            valor_imposto: f.valor_imposto != null ? Number(f.valor_imposto) : 0,
            desconto_percentual: f.desconto_percentual != null ? Number(f.desconto_percentual) : 0,
            desconto_valor: f.desconto_valor != null ? Number(f.desconto_valor) : 0,
            prazo_entrega: f.prazo_entrega || 0,
            condicoes_comerciais: f.condicao_pagamento || '',
            // ✅ NOVOS CAMPOS: Condições de pagamento
            forma_pagamento: f.forma_pagamento || null,
            is_parcelada: f.is_parcelada || false,
            numero_parcelas: f.is_parcelada ? (f.numero_parcelas || 1) : 1,
            intervalo_parcelas: f.is_parcelada ? (f.intervalo_parcelas || '30') : '30',
          };
          
          console.log(`[handleSalvarRascunho] Atualizando fornecedor ${cotacaoFornecedorId} (${f.fornecedor_nome}) com valores:`, {
            fornecedor_local_id: f.id,
            cotacao_fornecedor_id: cotacaoFornecedorId,
            valores_originais: {
              valor_frete: f.valor_frete,
              valor_imposto: f.valor_imposto,
              desconto_percentual: f.desconto_percentual,
              desconto_valor: f.desconto_valor
            },
            valores_para_salvar: valoresParaSalvar
          });
          
          await EntityService.update({
            schema: 'compras',
            table: 'cotacao_fornecedores',
            companyId: selectedCompany!.id,
            id: cotacaoFornecedorId,
            data: valoresParaSalvar,
          });
          
          console.log(`[handleSalvarRascunho] ✅ Fornecedor ${cotacaoFornecedorId} atualizado com sucesso`);
        } catch (error) {
          console.error(`[handleSalvarRascunho] ❌ Erro ao atualizar fornecedor ${f.id} (${cotacaoFornecedorId}) com frete/imposto/desconto:`, error);
        }
      });

      await Promise.allSettled(updateFornecedoresPromises);

      const inserts: Promise<any>[] = [];
      const requisicaoItemIdsCotados = new Set<string>();
      
      fornecedores.forEach((fornecedor) => {
        if (!mapFornecedorParaCotacao.has(fornecedor.id)) return;
        const cotacaoFornecedorId = mapFornecedorParaCotacao.get(fornecedor.id)!;

        itensAgrupados
          .filter((item) => itensSelecionados.has(getItemKey(item)))
          .forEach((item) => {
            const itemKey = getItemKey(item);
            const valorMapa = mapaFornecedorItens[fornecedor.id]?.[itemKey];
            if (!valorMapa) return;
            
            item.itens_origem.forEach((origem) => {
              requisicaoItemIdsCotados.add(origem.id);
              inserts.push(
                (async () => {
                  try {
                    const itemAtual = await EntityService.getById({
                      schema: 'compras',
                      table: 'requisicao_itens',
                      id: origem.id,
                      companyId: selectedCompany!.id,
                    });
                    if (itemAtual && (itemAtual as any).status === 'cotado') {
                      throw new Error(`Item ${origem.id.substring(0, 8)} já foi cotado por outro comprador`);
                    }
                  } catch (error: any) {
                    if (error.message?.includes('já foi cotado')) throw error;
                    console.warn(`Não foi possível verificar item ${origem.id} antes de criar:`, error);
                  }
                  return EntityService.create({
                    schema: 'compras',
                    table: 'cotacao_item_fornecedor',
                    companyId: selectedCompany!.id,
                    data: {
                      cotacao_fornecedor_id: cotacaoFornecedorId,
                      requisicao_item_id: origem.id,
                      material_id: origem.material_id,
                      quantidade_ofertada: valorMapa.quantidade_ofertada || origem.quantidade,
                      valor_unitario: valorMapa.valor_unitario || 0,
                      desconto_percentual: valorMapa.desconto_percentual || 0,
                      desconto_valor: valorMapa.desconto_valor || 0,
                      valor_frete: valorMapa.valor_frete != null ? Number(valorMapa.valor_frete) : 0,
                      prazo_entrega_dias: valorMapa.prazo_entrega_dias || null,
                      condicao_pagamento: valorMapa.condicao_pagamento || null,
                      observacoes: valorMapa.observacoes || null,
                      status: 'pendente',
                      is_vencedor: valorMapa.is_vencedor || false,
                    },
                  });
                })()
              );
            });
          });
      });

      // Executar inserts com tratamento individual de erros
      if (inserts.length > 0) {
        const results = await Promise.allSettled(inserts);
        const erros = results.filter((r) => r.status === 'rejected');
        
        if (erros.length > 0) {
          // ✅ TRATAMENTO DE ERRO MELHORADO: Verificar se são erros de concorrência
          const errosConcorrencia = erros.filter((e: any) => 
            e.reason?.message?.includes('já foi cotado') ||
            e.reason?.message?.includes('já foi cotado por outro comprador')
          );
          
          if (errosConcorrencia.length > 0) {
            const mensagem = errosConcorrencia.length === erros.length
              ? 'Todos os itens selecionados já foram cotados por outro comprador. Por favor, recarregue a página.'
              : `Alguns itens (${errosConcorrencia.length}) já foram cotados por outro comprador. Por favor, recarregue a página.`;
            
            setSubmitting(false);
            toast({
              title: "Conflito detectado",
              description: mensagem,
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
          
          const mensagensErro = erros.map((e: any) => 
            e.reason?.message || 'Erro desconhecido ao criar item de cotação'
          ).join('; ');
          
          throw new Error(`Erro ao salvar alguns itens da cotação: ${mensagensErro}`);
        }
      }

      // Verificar se todos os itens de cada requisição foram cotados
      // No modo explodido (itemIds fornecido), não atualizar status se nem todos foram cotados
      const updatePromises = requisicoesIds.map(async (reqId) => {
        try {
          // Buscar todos os itens da requisição
          const itensRequisicao = await EntityService.list({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany!.id,
            filters: { requisicao_id: reqId },
            page: 1,
            pageSize: 1000,
          });

          const totalItens = itensRequisicao.data?.length || 0;
          const itensCotadosNestaRequisicao = (itensRequisicao.data || []).filter((item: any) =>
            requisicaoItemIdsCotados.has(item.id)
          ).length;

          // Se estamos no modo explodido (itemIds fornecido) e nem todos os itens foram cotados,
          // não atualizar o status da requisição - ela deve permanecer disponível
          const todosItensCotados = totalItens > 0 && itensCotadosNestaRequisicao === totalItens;
          
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            companyId: selectedCompany!.id,
            id: reqId,
          });

          const currentState = (requisicao as any)?.workflow_state;
          
          // Apenas atualizar status se todos os itens foram cotados ou se já está em em_cotacao
          // No modo explodido parcial, manter a requisição disponível
          if (todosItensCotados && currentState !== 'em_cotacao') {
            await EntityService.update({
              schema: 'compras',
              table: 'requisicoes_compra',
              companyId: selectedCompany!.id,
              id: reqId,
              data: {
                workflow_state: 'em_cotacao',
              },
            });

            if (user?.id) {
              await EntityService.create({
                schema: 'compras',
                table: 'workflow_logs',
                companyId: selectedCompany!.id,
                data: {
                  entity_type: 'requisicao_compra',
                  entity_id: reqId,
                  from_state: currentState,
                  to_state: 'em_cotacao',
                  actor_id: user.id,
                  payload: { cotacao_ciclo_id: cicloId, status: 'rascunho' },
                },
              });
            }
          } else if (!todosItensCotados && itemIds && itemIds.length > 0) {
            // Modo explodido: apenas alguns itens foram cotados
            // Atualizar status dos itens cotados para 'cotado'
            await Promise.all(
              Array.from(requisicaoItemIdsCotados).map((itemId) =>
                EntityService.update({
                  schema: 'compras',
                  table: 'requisicao_itens',
                  companyId: selectedCompany!.id,
                  id: itemId,
                  data: { status: 'cotado' },
                  skipCompanyFilter: true, // requisicao_itens não tem company_id
                }).catch((error) => {
                  console.error(`Erro ao atualizar status do item ${itemId}:`, error);
                })
              )
            );
          }
        } catch (error) {
          console.error(`Erro ao atualizar requisição ${reqId}:`, error);
          // Não relançar - continuar com outras requisições
        }
      });

      await Promise.all(updatePromises);

      // ✅ IMPORTANTE: Invalidar queries para atualizar a UI e garantir que o status apareça corretamente
      // Usar as mesmas query keys que os hooks usam para garantir que a lista seja atualizada
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] }),
          queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] }),
          queryClient.invalidateQueries({ queryKey: ['compras'] }), // Invalidar todas as queries de compras também
        ]);
        console.log('✅ [handleSalvarRascunho] Queries invalidadas com sucesso');
      } catch (queryError) {
        console.error('⚠️ [handleSalvarRascunho] Erro ao invalidar queries:', queryError);
      }

      toast({
        title: "Sucesso",
        description: "Cotação salva como rascunho. Você pode continuar editando na aba 'Cotações Realizadas'.",
      });
      
      // ✅ Resetar submitting ANTES de fechar para garantir que o botão não fique desabilitado
      setSubmitting(false);
      
      // Aguardar um pouco para garantir que as queries foram atualizadas
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onClose();
    } catch (error: any) {
      console.error('❌ [handleSalvarRascunho] Erro ao salvar cotação como rascunho:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a cotação como rascunho.",
        variant: "destructive",
      });
      // ✅ Resetar submitting mesmo em caso de erro para não travar o botão
      setSubmitting(false);
    }
  };

  const handleEnviarAprovacao = async () => {
    // Validações
    if (formData.is_emergencial && fornecedores.length !== 1) {
      toast({
        title: "Erro",
        description: "Cotações emergenciais devem ter exatamente 1 fornecedor.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.is_emergencial && fornecedores.length < 2) {
      toast({
        title: "Erro",
        description: "Cotações normais devem ter no mínimo 2 fornecedores.",
        variant: "destructive",
      });
      return;
    }

    if (itensSelecionados.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um item para cotar.",
        variant: "destructive",
      });
      return;
    }

    // Validar se cada fornecedor tem pelo menos um item com valor preenchido
    const fornecedoresComId = fornecedores.filter(f => f.fornecedor_id);
    const fornecedoresSemValor = fornecedoresComId.filter((fornecedor) => {
      const temValorPreenchido = itensAgrupados
        .filter((item) => itensSelecionados.has(getItemKey(item)))
        .some((item) => {
          const itemKey = getItemKey(item);
          const cell = mapaFornecedorItens[fornecedor.id]?.[itemKey];
          return cell && cell.valor_unitario && cell.valor_unitario > 0;
        });
      return !temValorPreenchido;
    });

    if (fornecedoresSemValor.length > 0) {
      const fornecedorDados = fornecedoresSemValor.map((f) => {
        const fd = fornecedoresDadosMap.get(f.fornecedor_id);
        const partner = fd?.partner_id ? partnersMap.get(fd.partner_id) : null;
        return partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';
      }).join(', ');

      toast({
        title: "Erro",
        description: `Cada fornecedor deve ter pelo menos um item com valor preenchido no mapa de cotação. Fornecedor(es) sem valor: ${fornecedorDados}`,
        variant: "destructive",
      });
      return;
    }

    // Validação de mapa por item (cada item deve ter pelo menos um fornecedor com valor)
    const itensSelecionadosArray = itensAgrupados.filter((i) => itensSelecionados.has(getItemKey(i)));
    for (const item of itensSelecionadosArray) {
      let temFornecedor = false;
      const itemKey = getItemKey(item);
      
      // Calcular menor valor e fornecedor para este item
      let lowestValue: number | null = null;
      let lowestSupplierId: string | null = null;
      let cobertura = 0;
      
      fornecedoresComId.forEach((f) => {
        const cell = mapaFornecedorItens[f.id]?.[itemKey];
        if (cell && cell.quantidade_ofertada > 0 && cell.valor_unitario > 0) {
          temFornecedor = true;
          // Calcular valor total do item para este fornecedor (usando a mesma lógica da função handleSelectLowestPrices)
          const valorItem = valorItemCalculado(cell);
          const freteItem = cell.valor_frete || 0;
          const valorFinal = valorItem + freteItem;
          if (lowestValue === null || valorFinal < lowestValue) {
            lowestValue = valorFinal;
            lowestSupplierId = f.id;
          }
          
          // Somar cobertura (quantidade ofertada)
          cobertura += cell.quantidade_ofertada || 0;
        }
      });

      if (!temFornecedor) {
        toast({
          title: "Erro",
          description: `Item ${item.material_nome} sem nenhuma oferta de fornecedor com valor preenchido.`,
          variant: "destructive",
        });
        return;
      }

      // Verificar se o item tem um fornecedor vencedor selecionado
      let temVencedor = false;
      let fornecedorVencedorId: string | null = null;
      fornecedoresComId.forEach((f) => {
        const cell = mapaFornecedorItens[f.id]?.[itemKey];
        if (cell && cell.is_vencedor) {
          temVencedor = true;
          fornecedorVencedorId = f.id;
        }
      });
      if (!temVencedor) {
        toast({
          title: "Erro",
          description: `Selecione o fornecedor vencedor para o item "${item.material_nome}".`,
          variant: "destructive",
        });
        return;
      }

      // Verificar se o vencedor não é o menor preço e se tem observações
      if (fornecedorVencedorId && lowestSupplierId && fornecedorVencedorId !== lowestSupplierId) {
        const fornecedorVencedor = fornecedores.find(f => f.id === fornecedorVencedorId);
        if (!fornecedorVencedor?.observacoes || fornecedorVencedor.observacoes.trim() === '') {
          const fornecedorDados = fornecedorVencedor?.fornecedor_id 
            ? fornecedoresDadosMap.get(fornecedorVencedor.fornecedor_id)
            : null;
          const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
          const nomeFornecedor = partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';
          
          toast({
            title: "Erro",
            description: `O fornecedor vencedor "${nomeFornecedor}" para o item "${item.material_nome}" não é o menor preço. É obrigatório preencher as observações justificando a escolha.`,
            variant: "destructive",
          });
          return;
        }
      }

      if (cobertura < item.quantidade_total) {
        toast({
          title: "Erro",
          description: `Cobertura insuficiente para ${item.material_nome}. Quantidade ofertada: ${cobertura} de ${item.quantidade_total}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      // ✅ NOVO: Coletar IDs dos itens que serão cotados ANTES de verificar
      const requisicaoItemIdsParaVerificar = new Set<string>();
      itensAgrupados
        .filter((item) => itensSelecionados.has(getItemKey(item)))
        .forEach((item) => {
          item.itens_origem.forEach((origem) => {
            requisicaoItemIdsParaVerificar.add(origem.id);
          });
        });

      // ✅ VERIFICAÇÃO DE CONCORRÊNCIA: Verificar se itens ainda estão disponíveis
      try {
        await verificarItensDisponiveis(requisicaoItemIdsParaVerificar);
      } catch (error: any) {
        setSubmitting(false);
        toast({
          title: "Item indisponível",
          description: error.message,
          variant: "destructive",
        });
        // Invalidar queries para recarregar dados
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      // Validar data limite
      if (!formData.data_limite || formData.data_limite.trim() === '') {
        toast({
          title: "Erro",
          description: "A data limite para resposta é obrigatória.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Preparar dados para envio
      // ✅ IMPORTANTE: Incluir valor_frete, valor_imposto, desconto_percentual e desconto_valor para que sejam salvos/atualizados no banco
      const fornecedoresData = fornecedores.map((f) => {
        const dados = {
          fornecedor_id: f.fornecedor_id,
          prazo_entrega: f.prazo_entrega || 0,
          condicoes_comerciais: f.condicao_pagamento || '',
          valor_frete: f.valor_frete != null ? Number(f.valor_frete) : 0,
          valor_imposto: f.valor_imposto != null ? Number(f.valor_imposto) : 0,
          desconto_percentual: f.desconto_percentual != null ? Number(f.desconto_percentual) : 0,
          desconto_valor: f.desconto_valor != null ? Number(f.desconto_valor) : 0,
        };
        
        console.log(`[handleEnviarAprovacao] Preparando dados do fornecedor ${f.fornecedor_nome}:`, {
          fornecedor_local_id: f.id,
          valores_originais: {
            valor_frete: f.valor_frete,
            valor_imposto: f.valor_imposto,
            desconto_percentual: f.desconto_percentual,
            desconto_valor: f.desconto_valor
          },
          dados_enviados: dados
        });
        
        return dados;
      });

      // Coletar requisicao_item_ids dos itens selecionados para validação no modo explodido
      const requisicaoItemIds = Array.from(requisicaoItemIdsParaVerificar);

      const cicloResponse: any = await startQuoteCycleMutation.mutateAsync({
        requisicao_id: requisicoesIds[0], // Por enquanto, usar primeira requisição
        fornecedores: fornecedoresData,
        prazo_resposta: formData.data_limite.trim(),
        observacoes: formData.observacoes_internas?.trim() || null,
        requisicao_item_ids: requisicaoItemIds.length > 0 ? requisicaoItemIds : undefined,
      });

      const fornecedoresCriados = cicloResponse?.fornecedores || [];
      const cicloId = cicloResponse?.ciclo?.id || cicloResponse?.id;

      // ✅ CORREÇÃO: Mapear fornecedores corretamente mesmo quando já existem
      // O mapeamento deve ser por fornecedor_id, não por índice, pois fornecedores existentes
      // podem estar em posições diferentes no array
      const mapFornecedorParaCotacao = new Map<string, string>();
      fornecedores.forEach((f) => {
        // Buscar pelo fornecedor_id para garantir que encontramos o registro correto
        const created = fornecedoresCriados.find((fc: any) => fc.fornecedor_id === f.fornecedor_id);
        if (created?.id) {
          mapFornecedorParaCotacao.set(f.id, created.id);
        } else {
          console.warn(`[handleEnviarAprovacao] ⚠️ Fornecedor ${f.fornecedor_id} (${f.fornecedor_nome}) não encontrado em fornecedoresCriados`);
        }
      });

      console.log('[handleEnviarAprovacao] Mapeamento fornecedor local -> cotacao_fornecedores:', 
        Array.from(mapFornecedorParaCotacao.entries()).map(([localId, cotacaoId]) => ({
          local_id: localId,
          cotacao_fornecedor_id: cotacaoId,
          fornecedor: fornecedores.find(f => f.id === localId)?.fornecedor_nome || 'N/A'
        }))
      );

      // ✅ IMPORTANTE: Atualizar fornecedores com valor_frete e valor_imposto
      // Esses valores foram inseridos pelo comprador no painel e precisam ser salvos
      const updateFornecedoresPromises = fornecedores.map(async (f) => {
        const cotacaoFornecedorId = mapFornecedorParaCotacao.get(f.id);
        if (!cotacaoFornecedorId) {
          console.warn(`[handleEnviarAprovacao] ⚠️ Fornecedor local ${f.id} não tem ID de cotacao_fornecedores mapeado`);
          return;
        }

        try {
          const valoresParaSalvar = {
            valor_frete: f.valor_frete != null ? Number(f.valor_frete) : 0,
            valor_imposto: f.valor_imposto != null ? Number(f.valor_imposto) : 0,
            desconto_percentual: f.desconto_percentual != null ? Number(f.desconto_percentual) : 0,
            desconto_valor: f.desconto_valor != null ? Number(f.desconto_valor) : 0,
            prazo_entrega: f.prazo_entrega || 0,
            condicoes_comerciais: f.condicao_pagamento || '',
            // ✅ NOVOS CAMPOS: Condições de pagamento
            forma_pagamento: f.forma_pagamento || null,
            is_parcelada: f.is_parcelada || false,
            numero_parcelas: f.is_parcelada ? (f.numero_parcelas || 1) : 1,
            intervalo_parcelas: f.is_parcelada ? (f.intervalo_parcelas || '30') : '30',
          };
          
          console.log(`[handleEnviarAprovacao] Atualizando fornecedor ${cotacaoFornecedorId} (${f.fornecedor_nome}) com valores:`, {
            fornecedor_local_id: f.id,
            cotacao_fornecedor_id: cotacaoFornecedorId,
            valores_originais: {
              valor_frete: f.valor_frete,
              valor_imposto: f.valor_imposto,
              desconto_percentual: f.desconto_percentual,
              desconto_valor: f.desconto_valor
            },
            valores_para_salvar: valoresParaSalvar
          });
          
          await EntityService.update({
            schema: 'compras',
            table: 'cotacao_fornecedores',
            companyId: selectedCompany!.id,
            id: cotacaoFornecedorId,
            data: valoresParaSalvar,
          });
          
          console.log(`[handleEnviarAprovacao] ✅ Fornecedor ${cotacaoFornecedorId} atualizado com sucesso`);
        } catch (error) {
          console.error(`[handleEnviarAprovacao] ❌ Erro ao atualizar fornecedor ${f.id} (${cotacaoFornecedorId}) com frete/imposto:`, error);
        }
      });

      await Promise.allSettled(updateFornecedoresPromises);

      if (cicloId) {
        try {
          await EntityService.update({
            schema: 'compras',
            table: 'cotacao_ciclos',
            companyId: selectedCompany!.id,
            id: cicloId,
            data: {
              valor_frete: formData.valor_frete != null ? Number(formData.valor_frete) : 0,
              desconto_percentual: formData.desconto_percentual != null ? Number(formData.desconto_percentual) : 0,
              desconto_valor: formData.desconto_valor != null ? Number(formData.desconto_valor) : 0,
            },
          });
        } catch (e) {
          console.warn('Erro ao atualizar frete/desconto geral do ciclo:', e);
        }
      }

      const inserts: Promise<any>[] = [];
      const requisicaoItemIdsCotados = new Set<string>();
      
      fornecedores.forEach((fornecedor) => {
        if (!mapFornecedorParaCotacao.has(fornecedor.id)) return;
        const cotacaoFornecedorId = mapFornecedorParaCotacao.get(fornecedor.id)!;

        itensAgrupados
          .filter((item) => itensSelecionados.has(getItemKey(item)))
          .forEach((item) => {
            const itemKey = getItemKey(item);
            const valorMapa = mapaFornecedorItens[fornecedor.id]?.[itemKey];
            if (!valorMapa) return;
            const { quantidade_ofertada, valor_unitario } = valorMapa;
            if (!quantidade_ofertada || !valor_unitario) return;

            item.itens_origem.forEach((origem) => {
              requisicaoItemIdsCotados.add(origem.id);
              inserts.push(
                (async () => {
                  try {
                    const itemAtual = await EntityService.getById({
                      schema: 'compras',
                      table: 'requisicao_itens',
                      id: origem.id,
                      companyId: selectedCompany!.id,
                    });
                    if (itemAtual && (itemAtual as any).status === 'cotado') {
                      throw new Error(`Item ${origem.id.substring(0, 8)} já foi cotado por outro comprador`);
                    }
                  } catch (error: any) {
                    if (error.message?.includes('já foi cotado')) throw error;
                    console.warn(`Não foi possível verificar item ${origem.id} antes de criar:`, error);
                  }
                  return EntityService.create({
                    schema: 'compras',
                    table: 'cotacao_item_fornecedor',
                    companyId: selectedCompany!.id,
                    data: {
                      cotacao_fornecedor_id: cotacaoFornecedorId,
                      requisicao_item_id: origem.id,
                      material_id: origem.material_id,
                      quantidade_ofertada: valorMapa.quantidade_ofertada,
                      valor_unitario: valorMapa.valor_unitario,
                      desconto_percentual: valorMapa.desconto_percentual || 0,
                      desconto_valor: valorMapa.desconto_valor || 0,
                      valor_frete: valorMapa.valor_frete != null ? Number(valorMapa.valor_frete) : 0,
                      prazo_entrega_dias: valorMapa.prazo_entrega_dias || null,
                      condicao_pagamento: valorMapa.condicao_pagamento || null,
                      observacoes: valorMapa.observacoes || null,
                      status: 'cotado',
                      is_vencedor: valorMapa.is_vencedor || false,
                    },
                  });
                })()
              );
            });
          });
      });

      // Executar inserts com tratamento individual de erros
      if (inserts.length > 0) {
        const results = await Promise.allSettled(inserts);
        const erros = results.filter((r) => r.status === 'rejected');
        
        if (erros.length > 0) {
          // ✅ TRATAMENTO DE ERRO MELHORADO: Verificar se são erros de concorrência
          const errosConcorrencia = erros.filter((e: any) => 
            e.reason?.message?.includes('já foi cotado') ||
            e.reason?.message?.includes('já foi cotado por outro comprador')
          );
          
          if (errosConcorrencia.length > 0) {
            const mensagem = errosConcorrencia.length === erros.length
              ? 'Todos os itens selecionados já foram cotados por outro comprador. Por favor, recarregue a página.'
              : `Alguns itens (${errosConcorrencia.length}) já foram cotados por outro comprador. Por favor, recarregue a página.`;
            
            setSubmitting(false);
            toast({
              title: "Conflito detectado",
              description: mensagem,
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
          
          const mensagensErro = erros.map((e: any) => 
            e.reason?.message || 'Erro desconhecido ao criar item de cotação'
          ).join('; ');
          
          throw new Error(`Erro ao salvar alguns itens da cotação: ${mensagensErro}`);
        }
      }

      // Verificar se todos os itens de cada requisição foram cotados
      // No modo explodido (itemIds fornecido), não atualizar status se nem todos foram cotados
      const updatePromises = requisicoesIds.map(async (reqId) => {
        try {
          // Buscar todos os itens da requisição
          const itensRequisicao = await EntityService.list({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany!.id,
            filters: { requisicao_id: reqId },
            page: 1,
            pageSize: 1000,
          });

          const totalItens = itensRequisicao.data?.length || 0;
          const itensCotadosNestaRequisicao = (itensRequisicao.data || []).filter((item: any) =>
            requisicaoItemIdsCotados.has(item.id)
          ).length;

          // Se estamos no modo explodido (itemIds fornecido) e nem todos os itens foram cotados,
          // não atualizar o status da requisição - ela deve permanecer disponível
          const todosItensCotados = totalItens > 0 && itensCotadosNestaRequisicao === totalItens;
          
          // Buscar o estado atual da requisição
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            companyId: selectedCompany!.id,
            id: reqId,
          });

          const currentState = (requisicao as any)?.workflow_state;
          
          // Apenas atualizar status se todos os itens foram cotados ou se já está em em_cotacao
          // No modo explodido parcial, manter a requisição disponível
          if (todosItensCotados && currentState !== 'em_cotacao') {
            // Atualizar diretamente o workflow_state
            await EntityService.update({
              schema: 'compras',
              table: 'requisicoes_compra',
              companyId: selectedCompany!.id,
              id: reqId,
              data: {
                workflow_state: 'em_cotacao',
              },
            });

            // Registrar no log de workflow
            if (user?.id) {
              await EntityService.create({
                schema: 'compras',
                table: 'workflow_logs',
                companyId: selectedCompany!.id,
                data: {
                  entity_type: 'requisicao_compra',
                  entity_id: reqId,
                  from_state: currentState,
                  to_state: 'em_cotacao',
                  actor_id: user.id,
                  payload: { cotacao_ciclo_id: cicloId },
                },
              });
            }
          } else if (!todosItensCotados && itemIds && itemIds.length > 0) {
            // Modo explodido: apenas alguns itens foram cotados
            // Atualizar status dos itens cotados para 'cotado'
            await Promise.all(
              Array.from(requisicaoItemIdsCotados).map((itemId) =>
                EntityService.update({
                  schema: 'compras',
                  table: 'requisicao_itens',
                  companyId: selectedCompany!.id,
                  id: itemId,
                  data: { status: 'cotado' },
                  skipCompanyFilter: true, // requisicao_itens não tem company_id
                }).catch((error) => {
                  console.error(`Erro ao atualizar status do item ${itemId}:`, error);
                })
              )
            );
          }
        } catch (error) {
          // Log do erro mas não interrompe o processo
          console.error(`Erro ao atualizar requisição ${reqId}:`, error);
        }
      });

      await Promise.all(updatePromises);

      // ✅ Verificar se há configuração de aprovação ANTES de atualizar o status
      // Se houver configuração, atualizar para 'em_aprovacao' - o trigger criará aprovações automaticamente
      let temAprovacoes = false;
      if (cicloId && selectedCompany?.id) {
        try {
          // Aguardar um pouco para garantir que todos os inserts foram commitados
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Verificar se há configuração de aprovação
          const configsResult = await EntityService.list({
            schema: 'public',
            table: 'configuracoes_aprovacao_unificada',
            companyId: selectedCompany.id,
            filters: {
              processo_tipo: 'cotacao_compra',
              ativo: true,
            },
            page: 1,
            pageSize: 10,
          });
          
          temAprovacoes = configsResult.data && configsResult.data.length > 0;
          
          console.log('🔍 [handleEnviarAprovacao] Verificação de configuração de aprovação:', {
            temConfiguracao: temAprovacoes,
            count: configsResult.data?.length || 0,
            configs: configsResult.data?.map((c: any) => ({
              id: c.id,
              nivel: c.nivel_aprovacao,
              valor_limite: c.valor_limite,
              aprovadores_count: Array.isArray(c.aprovadores) ? c.aprovadores.length : 0
            }))
          });
        } catch (error: any) {
          console.error('❌ [handleEnviarAprovacao] Erro ao verificar configuração de aprovação:', error);
          // Em caso de erro, assumir que não há aprovação para não bloquear o fluxo
          temAprovacoes = false;
        }
      }

      // ✅ Atualizar status do ciclo para 'em_aprovacao' se houver configuração, senão 'aberta'
      // IMPORTANTE: O trigger vai criar as aprovações automaticamente quando status mudar para 'em_aprovacao'
      if (cicloId) {
        try {
          const novoStatus = temAprovacoes ? 'em_aprovacao' : 'aberta';
          console.log('🔄 [handleEnviarAprovacao] Atualizando status do ciclo:', {
            cicloId,
            temAprovacoes,
            novoStatus,
            status: novoStatus,
            workflow_state: novoStatus,
          });

          const updateResult = await EntityService.update({
            schema: 'compras',
            table: 'cotacao_ciclos',
            companyId: selectedCompany!.id,
            id: cicloId,
            data: {
              workflow_state: novoStatus,
              status: novoStatus,
              observacoes: formData.observacoes_internas?.trim() || null,
            },
          });

          console.log('✅ [handleEnviarAprovacao] Status do ciclo atualizado com sucesso:', updateResult);
          
          // Aguardar um pouco para garantir que o trigger foi executado e aprovações foram criadas
          if (temAprovacoes) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar se aprovações foram criadas pelo trigger
            try {
              const aprovacoesCheck = await EntityService.list({
                schema: 'public',
                table: 'aprovacoes_unificada',
                companyId: selectedCompany.id,
                filters: {
                  processo_tipo: 'cotacao_compra',
                  processo_id: cicloId,
                },
                page: 1,
                pageSize: 100,
              });
              
              const aprovacoesPendentes = aprovacoesCheck.data?.filter((a: any) => a.status === 'pendente') || [];
              
              console.log('✅ [handleEnviarAprovacao] Verificação de aprovações criadas pelo trigger:', {
                encontradas: aprovacoesPendentes.length > 0,
                total_aprovacoes: aprovacoesCheck.data?.length || 0,
                pendentes: aprovacoesPendentes.length,
                aprovações: aprovacoesPendentes.map((a: any) => ({
                  id: a.id,
                  nivel: a.nivel_aprovacao,
                  aprovador_id: a.aprovador_id,
                  status: a.status
                }))
              });
              
              // Se não foram criadas, tentar criar manualmente como fallback
              if (aprovacoesPendentes.length === 0) {
                console.warn('⚠️ [handleEnviarAprovacao] Nenhuma aprovação foi criada pelo trigger. Tentando criar manualmente...');
                try {
                  await createApprovalsMutation.mutateAsync({
                    processo_tipo: 'cotacao_compra',
                    processo_id: cicloId,
                  });
                  console.log('✅ [handleEnviarAprovacao] Aprovações criadas manualmente com sucesso');
                } catch (manualError: any) {
                  console.error('❌ [handleEnviarAprovacao] Erro ao criar aprovações manualmente:', manualError);
                }
              }
            } catch (checkError) {
              console.warn('⚠️ [handleEnviarAprovacao] Erro ao verificar aprovações criadas:', checkError);
            }
          }

          // Registrar no log de workflow
          if (user?.id) {
            try {
            await EntityService.create({
              schema: 'compras',
              table: 'workflow_logs',
              companyId: selectedCompany!.id,
              data: {
                entity_type: 'cotacao_compra',
                entity_id: cicloId,
                from_state: 'rascunho',
                  to_state: novoStatus,
                actor_id: user.id,
                payload: { motivo: 'cotacao_enviada_aprovacao', tem_aprovacoes: temAprovacoes },
              },
            });
            } catch (logError) {
              console.warn('⚠️ [handleEnviarAprovacao] Erro ao criar log de workflow (não crítico):', logError);
            }
          }
        } catch (error: any) {
          console.error('❌ [handleEnviarAprovacao] Erro ao atualizar status do ciclo:', error);
          console.error('❌ [handleEnviarAprovacao] Detalhes do erro:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            stack: error?.stack,
            cicloId,
            temAprovacoes,
          });
          // Não bloquear o fluxo, mas avisar o usuário
          toast({
            title: "Aviso",
            description: "Cotação criada, mas houve um problema ao atualizar o status. Por favor, verifique manualmente.",
            variant: "default",
          });
        }
      }

      // ✅ IMPORTANTE: Invalidar queries para atualizar a UI após enviar para aprovação
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] }),
          queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] }),
          queryClient.invalidateQueries({ queryKey: ['compras'] }),
        ]);
        console.log('✅ [handleEnviarAprovacao] Queries invalidadas com sucesso');
      } catch (queryError) {
        console.error('⚠️ [handleEnviarAprovacao] Erro ao invalidar queries:', queryError);
      }

      toast({
        title: "Sucesso",
        description: temAprovacoes 
          ? "Cotação enviada para aprovação com mapa por item/fornecedor."
          : "Cotação criada com sucesso.",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a cotação.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isEmergencial = formData.is_emergencial === true;
  const minFornecedores = isEmergencial ? 1 : 2;

  // Função para obter badge do tipo de requisição
  const getTipoBadge = (tipo: string, isEmergencial?: boolean) => {
    if (isEmergencial) {
      return <Badge variant="outline" className="text-orange-600 bg-orange-50 text-xs">
        <Zap className="h-3 w-3 mr-1" />
        Emergencial
      </Badge>;
    }
    switch (tipo) {
      case 'reposicao':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50 text-xs">Reposição</Badge>;
      case 'compra_direta':
        return <Badge variant="outline" className="text-purple-600 bg-purple-50 text-xs">Compra Direta</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{tipo || '—'}</Badge>;
    }
  };
  const maxFornecedores = 6;
  const fornecedoresValidos = fornecedores.filter(f => f.fornecedor_id).length;
  const fornecedoresOk = fornecedoresValidos >= minFornecedores && fornecedoresValidos <= maxFornecedores;

  // Validação: Verificar se cada fornecedor tem pelo menos um item com valor preenchido
  const validarFornecedoresComValores = useMemo(() => {
    if (fornecedoresValidos === 0) return false;
    
    const fornecedoresComId = fornecedores.filter(f => f.fornecedor_id);
    
    // Verificar se cada fornecedor tem pelo menos um item com valor_unitario preenchido
    return fornecedoresComId.every((fornecedor) => {
      // Verificar se há pelo menos um item selecionado com valor preenchido para este fornecedor
      const temValorPreenchido = itensAgrupados
        .filter((item) => itensSelecionados.has(getItemKey(item)))
        .some((item) => {
          const itemKey = getItemKey(item);
          const cell = mapaFornecedorItens[fornecedor.id]?.[itemKey];
          return cell && cell.valor_unitario && cell.valor_unitario > 0;
        });
      
      return temValorPreenchido;
    });
  }, [fornecedores, fornecedoresValidos, itensAgrupados, itensSelecionados, mapaFornecedorItens]);

  // Validação completa para habilitar botão
  const podeEnviarAprovacao = useMemo(() => {
    // Verificar requisitos básicos
    if (itensSelecionados.size === 0) return false;
    if (!fornecedoresOk) return false;
    
    // Verificar se todos os fornecedores têm pelo menos um item com valor
    if (!validarFornecedoresComValores) return false;
    
    return true;
  }, [itensSelecionados.size, fornecedoresOk, validarFornecedoresComValores]);

  // Calcular contexto da seleção para o header dinâmico
  const contextoSelecao = useMemo(() => {
    if (requisicoes.length === 0) {
      return {
        tipoCompra: '',
        totalRequisicoes: 0,
        totalItens: itensAgrupados.length,
        numerosRequisicoes: [],
        locaisEntrega: [],
      };
    }

    const tipos = requisicoes.map(r => r.tipo_requisicao).filter(Boolean);
    const temEmergencial = requisicoes.some(r => r.is_emergencial === true);
    const tipoPrincipal = temEmergencial
      ? 'Emergencial'
      : tipos.includes('compra_direta')
      ? 'Compra Direta'
      : tipos.includes('reposicao')
      ? 'Reposição'
      : tipos[0] || '';

    const numerosRequisicoes = requisicoes.map(r => r.numero_requisicao);
    const totalItens = itensSelecionados.size || itensAgrupados.length;

    // Coletar locais de entrega das requisições de compra direta
    const locaisEntrega = requisicoes
      .filter(r => r.tipo_requisicao === 'compra_direta' && r.local_entrega)
      .map(r => r.local_entrega)
      .filter((local, index, self) => self.indexOf(local) === index) // Remover duplicatas
      .filter(Boolean) as string[];

    return {
      tipoCompra: tipoPrincipal,
      totalRequisicoes: requisicoes.length,
      totalItens,
      numerosRequisicoes: numerosRequisicoes.slice(0, 3), // Mostrar até 3 números
      temMaisRequisicoes: numerosRequisicoes.length > 3,
      locaisEntrega,
    };
  }, [requisicoes, itensAgrupados, itensSelecionados]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? 'Visualizar Cotação' : cotacaoId ? 'Editar Cotação' : 'Gerar Cotação'}
            {contextoSelecao.tipoCompra && (
              <Badge variant="outline" className="ml-2">
                {contextoSelecao.tipoCompra}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Modal para gerar cotação de preços para as requisições selecionadas
          </DialogDescription>
          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>
              {contextoSelecao.totalRequisicoes > 0 
                ? `${contextoSelecao.totalRequisicoes} requisição(ões): ${contextoSelecao.numerosRequisicoes.join(', ')}${contextoSelecao.temMaisRequisicoes ? '...' : ''}`
                : 'Configure a cotação para as requisições selecionadas'}
            </span>
            {contextoSelecao.totalItens > 0 && (
              <Badge variant="secondary" className="ml-2">
                {contextoSelecao.totalItens} {contextoSelecao.totalItens === 1 ? 'item' : 'itens'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading && requisicoes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando dados...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 flex-shrink-0 border-b">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex">
                  <TabsTrigger value="dados">
                    <FileText className="h-4 w-4 mr-2" />
                    Dados
                  </TabsTrigger>
                  <TabsTrigger value="requisicoes">
                    <FileText className="h-4 w-4 mr-2" />
                    Requisições
                  </TabsTrigger>
                  <TabsTrigger value="itens-fornecedores">
                    <Package className="h-4 w-4 mr-2" />
                    Itens & Fornecedores
                  </TabsTrigger>
                  <TabsTrigger value="mapa-cotacao">
                    <Calculator className="h-4 w-4 mr-2" />
                    Mapa Cotação
                  </TabsTrigger>
                  <TabsTrigger value="rateio">
                    <Calculator className="h-4 w-4 mr-2" />
                    Rateio
                  </TabsTrigger>
                  <TabsTrigger value="finalizacao">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalização
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
              <TabsContent value="dados" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo da Cotação *</Label>
                    <Select
                      value={formData.tipo_cotacao}
                      onValueChange={(value) => {
                        setFormData({ ...formData, tipo_cotacao: value });
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reposicao">Reposição</SelectItem>
                        <SelectItem value="compra_direta">Compra Direta</SelectItem>
                      </SelectContent>
                    </Select>
                    {isEmergencial && (
                      <div className="flex items-center gap-2 rounded-md border p-2 bg-orange-50 dark:bg-orange-950">
                        <Zap className="h-4 w-4 text-orange-600" />
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                          Requisição emergencial detectada - permite apenas 1 fornecedor
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Data da Cotação *</Label>
                    <Input
                      type="date"
                      value={formData.data_cotacao}
                      onChange={(e) => setFormData({ ...formData, data_cotacao: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Limite de Resposta *</Label>
                    <Input
                      type="date"
                      value={formData.data_limite}
                      onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                      min={formData.data_cotacao}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.observacoes_internas}
                    onChange={(e) => setFormData({ ...formData, observacoes_internas: e.target.value })}
                    placeholder="Observações internas sobre a cotação"
                    rows={4}
                    disabled={readOnly}
                  />
                </div>

                {/* Informações de Aprovação - Apenas em modo visualização */}
                {readOnly && cotacaoId && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Detalhes da Alçada de Aprovação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Regras de Aprovação */}
                      {approvalConfigs && approvalConfigs.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Regras de Aprovação Configuradas:</Label>
                          <div className="space-y-2">
                            {approvalConfigs.map((config, index) => (
                              <div key={config.id || index} className="p-3 bg-background border rounded-md">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Nível:</span> {config.nivel_aprovacao}
                                  </div>
                                  {config.nome && (
                                    <div>
                                      <span className="font-medium">Nome:</span> {config.nome}
                                    </div>
                                  )}
                                  {config.valor_limite && (
                                    <div className="col-span-2">
                                      <span className="font-medium">Valor Limite:</span> R$ {config.valor_limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                  {config.usuario_id && (
                                    <div>
                                      <span className="font-medium">Aprovador:</span> {(() => {
                                        const approverUser = users.find(u => u.id === config.usuario_id);
                                        return approverUser?.nome || approverUser?.username || config.usuario_id;
                                      })()}
                                    </div>
                                  )}
                                  {config.centro_custo_id && (
                                    <div>
                                      <span className="font-medium">Centro de Custo:</span> {costCentersMap.get(config.centro_custo_id) || config.centro_custo_id}
                                    </div>
                                  )}
                                  {config.aprovadores && config.aprovadores.length > 0 && (
                                    <div className="col-span-2">
                                      <span className="font-medium">Aprovadores:</span>
                                      <ul className="list-disc list-inside ml-2 mt-1">
                                        {config.aprovadores.map((aprovador, idx) => {
                                          const approverUser = users.find(u => u.id === aprovador.user_id);
                                          return (
                                            <li key={idx} className="text-xs">
                                              {approverUser?.nome || approverUser?.username || aprovador.user_id}
                                              {aprovador.is_primary && ' (Principal)'}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status das Aprovações */}
                      {approvalsData && approvalsData.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Status das Aprovações:</Label>
                          <div className="space-y-2">
                            {approvalsData.map((approval: any) => {
                              const approverUser = users.find(u => u.id === approval.aprovador_id);
                              
                              // Encontrar a regra de aprovação correspondente baseado em nível, centro_custo_id, etc.
                              const regraCorrespondente = approvalConfigs?.find(config => {
                                // Match por nível
                                if (config.nivel_aprovacao !== approval.nivel_aprovacao) return false;
                                
                                // Se a aprovação tem centro_custo_id, tentar match
                                // (assumindo que a aprovação pode ter informações sobre qual regra foi aplicada)
                                // Como não temos um campo direto, vamos fazer match por nível e aprovador
                                const configAprovador = config.aprovadores?.find(a => a.user_id === approval.aprovador_id);
                                return !!configAprovador;
                              });
                              
                              return (
                                <div key={approval.id} className="p-3 bg-background border rounded-md">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium">Nível:</span> {approval.nivel_aprovacao}
                                    </div>
                                    <div>
                                      <span className="font-medium">Status:</span>{' '}
                                      <Badge variant={
                                        approval.status === 'aprovado' ? 'default' :
                                        approval.status === 'rejeitado' ? 'destructive' :
                                        'secondary'
                                      }>
                                        {approval.status === 'aprovado' ? 'Aprovado' :
                                         approval.status === 'rejeitado' ? 'Rejeitado' :
                                         'Pendente'}
                                      </Badge>
                                    </div>
                                    {regraCorrespondente && (
                                      <div className="col-span-2">
                                        <span className="font-medium">Regra de Aprovação:</span>{' '}
                                        <Badge variant="outline" className="text-xs">
                                          {regraCorrespondente.nome || `Nível ${regraCorrespondente.nivel_aprovacao}`}
                                          {regraCorrespondente.centro_custo_id && ` - ${costCentersMap.get(regraCorrespondente.centro_custo_id) || regraCorrespondente.centro_custo_id}`}
                                        </Badge>
                                      </div>
                                    )}
                                    {approverUser && (
                                      <div>
                                        <span className="font-medium">Aprovador:</span> {approverUser.nome || approverUser.username || '—'}
                                      </div>
                                    )}
                                    {approval.data_aprovacao && (
                                      <div>
                                        <span className="font-medium">Data:</span> {new Date(approval.data_aprovacao).toLocaleDateString('pt-BR')}
                                      </div>
                                    )}
                                    {approval.observacoes && (
                                      <div className="col-span-2">
                                        <span className="font-medium">Observações:</span> {approval.observacoes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(!approvalConfigs || approvalConfigs.length === 0) && (!approvalsData || approvalsData.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma informação de aprovação disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Campo destacado de Local de Entrega para Compra Direta */}
                {contextoSelecao.locaisEntrega.length > 0 && (
                  <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold text-primary">
                        Local de Entrega - Compra Direta
                      </Label>
                    </div>
                    <div className="space-y-2">
                      {contextoSelecao.locaisEntrega.map((local, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-background border border-primary/20 rounded-md"
                        >
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm">{local}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Informação fornecida pelo solicitante na requisição de compra direta
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requisicoes" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisicoes.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.numero_requisicao}</TableCell>
                        <TableCell>
                          {req.centro_custo_id ? costCentersMap.get(req.centro_custo_id) : '—'}
                        </TableCell>
                        <TableCell>
                          {req.projeto_id ? projectsMap.get(req.projeto_id) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {req.tipo_requisicao || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {req.prioridade || 'Normal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="itens-fornecedores" className="mt-4 space-y-4 pb-8">
                {/* Parte Superior - Itens da Cotação */}
                <div className="flex-shrink-0">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Itens da Cotação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Código</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="w-[100px]">Unidade</TableHead>
                              <TableHead className="w-[120px] text-right">Quantidade</TableHead>
                              <TableHead className="w-[150px]">Origem</TableHead>
                              <TableHead className="w-[80px] text-center">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensAgrupados.map((item) => {
                              const itemKey = getItemKey(item);
                              return (
                                <TableRow key={itemKey}>
                                  <TableCell className="font-mono text-xs">{item.material_codigo || '—'}</TableCell>
                                  <TableCell className="font-medium">{item.material_nome}</TableCell>
                                  <TableCell className="text-muted-foreground">{item.unidade_medida}</TableCell>
                                  <TableCell className="text-right">{item.quantidade_total.toLocaleString('pt-BR')}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    <div className="flex flex-wrap gap-1">
                                      {item.origem.map((origem, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {origem}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {/* Botão Histórico de Compras */}
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 hover:bg-primary/10 cursor-pointer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setItemHistoricoSelecionado({
                                                  material_id: item.material_id,
                                                  material_nome: item.material_nome,
                                                  unidade_medida: item.unidade_medida,
                                                });
                                                setHistoricoModalAberto(true);
                                              }}
                                              title="Ver histórico de compras"
                                            >
                                              <DollarSign className="h-4 w-4 text-primary" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Ver histórico de compras</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      {/* Botão Visualizar Imagem */}
                                      {(() => {
                                        const imagemUrl = item.imagem_url;
                                        const temImagem = imagemUrl && typeof imagemUrl === 'string' && imagemUrl.trim() !== '';
                                        
                                        if (temImagem) {
                                          return (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-primary/10 cursor-pointer"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setImagemSelecionada({
                                                        url: imagemUrl,
                                                        nome: item.material_nome
                                                      });
                                                      setImagemModalAberto(true);
                                                    }}
                                                    title={`Visualizar foto: ${item.material_nome}`}
                                                  >
                                                    <Eye className="h-4 w-4 text-primary" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Visualizar foto</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          );
                                        }
                                        
                                        return (
                                          <div 
                                            className="h-8 w-8 flex items-center justify-center text-muted-foreground opacity-30"
                                            title="Item sem foto cadastrada"
                                          >
                                            <ImageIcon className="h-4 w-4" />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Parte Inferior - Seleção de Fornecedores */}
                <div>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Seleção de Fornecedores
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isEmergencial 
                              ? 'Cotações emergenciais: exatamente 1 fornecedor'
                              : `Cotações normais: mínimo ${minFornecedores}, máximo ${maxFornecedores} fornecedores`
                            }
                          </p>
                          <p className="text-sm font-medium mt-1">
                            Fornecedores selecionados: {fornecedoresValidos} / {isEmergencial ? '1' : `${minFornecedores}-${maxFornecedores}`}
                          </p>
                          {!fornecedoresOk && (
                            <p className="text-sm text-red-600 mt-1">
                              {isEmergencial 
                                ? 'Selecione exatamente 1 fornecedor'
                                : `Selecione entre ${minFornecedores} e ${maxFornecedores} fornecedores`
                              }
                            </p>
                          )}
                        </div>
                        {!readOnly && (
                          <Button
                            onClick={handleAddFornecedor}
                            disabled={isEmergencial ? fornecedores.length >= 1 : fornecedores.length >= 6}
                            size="sm"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Adicionar Fornecedor
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {fornecedoresDisponiveis.length === 0 && (
                        <Alert className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum fornecedor ativo encontrado. Verifique se há fornecedores cadastrados no sistema.
                          </AlertDescription>
                        </Alert>
                      )}
                      {fornecedores.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum fornecedor adicionado</p>
                          <p className="text-sm">Clique em "Adicionar Fornecedor" para começar</p>
                          {fornecedoresDisponiveis.length > 0 && (
                            <p className="text-xs mt-2">
                              {fornecedoresDisponiveis.length} fornecedor(es) disponível(is)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Fornecedor</TableHead>
                                <TableHead className="w-[150px]">CNPJ</TableHead>
                                <TableHead className="w-[150px]">Região</TableHead>
                                <TableHead className="w-[120px]">Tipo</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fornecedores.map((fornecedor, index) => {
                                const partner = fornecedor.fornecedor_id 
                                  ? (() => {
                                      const fd = fornecedoresDadosMap.get(fornecedor.fornecedor_id);
                                      return fd?.partner_id ? partnersMap.get(fd.partner_id) : null;
                                    })()
                                  : null;
                                const fd = fornecedoresDisponiveis.find((x: any) => x.id === fornecedor.fornecedor_id);
                                const isBlocked = fd?.status === 'bloqueado';
                                
                                return (
                                  <TableRow key={fornecedor.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={!!fornecedor.fornecedor_id}
                                        disabled={isBlocked || readOnly}
                                        onCheckedChange={(checked) => {
                                          if (!checked && !readOnly) {
                                            handleRemoveFornecedor(fornecedor.id);
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {partner ? (
                                          <div className="flex flex-col">
                                          <span className={isBlocked ? 'opacity-50' : ''}>
                                            {partner.nome_fantasia || partner.razao_social}
                                          </span>
                                          </div>
                                        ) : (
                                          <Select
                                            value={fornecedor.fornecedor_id}
                                            onValueChange={(value) => {
                                              if (!readOnly) {
                                                handleUpdateFornecedor(fornecedor.id, 'fornecedor_id', value);
                                              }
                                            }}
                                            disabled={readOnly}
                                          >
                                            <SelectTrigger className="w-[300px]">
                                              <SelectValue placeholder="Selecione um fornecedor">
                                                {(() => {
                                                  if (!fornecedor.fornecedor_id) return null;
                                                  const fdSelecionado = fornecedoresDisponiveis.find((fd: any) => fd.id === fornecedor.fornecedor_id);
                                                  if (!fdSelecionado) return null;
                                                  
                                                  const partnerName = fdSelecionado.partner_nome_fantasia || 
                                                                    fdSelecionado.partner_razao_social ||
                                                                    (fdSelecionado.partner_id ? partnersMap.get(fdSelecionado.partner_id)?.nome_fantasia : null) ||
                                                                    (fdSelecionado.partner_id ? partnersMap.get(fdSelecionado.partner_id)?.razao_social : null);
                                                  
                                                  return partnerName || 
                                                         fdSelecionado.contato_principal || 
                                                         (fdSelecionado.email_cotacao ? fdSelecionado.email_cotacao.split('@')[0] : null) ||
                                                         `Fornecedor ${fdSelecionado.id.substring(0, 8)}`;
                                                })()}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[400px]">
                                              {/* Campo de busca */}
                                              <div className="p-2 border-b">
                                                <Input
                                                  placeholder="Buscar fornecedor..."
                                                  value={buscaFornecedor}
                                                  onChange={(e) => setBuscaFornecedor(e.target.value)}
                                                  className="h-9"
                                                  onKeyDown={(e) => e.stopPropagation()}
                                                />
                                              </div>
                                              
                                              <ScrollArea className="max-h-[350px]">
                                              {(() => {
                                                  // Filtrar fornecedores já selecionados
                                                  const fornecedoresSelecionadosIds = new Set(
                                                    fornecedores
                                                      .filter((f) => f.id !== fornecedor.id && f.fornecedor_id)
                                                      .map((f) => f.fornecedor_id)
                                                  );
                                                  
                                                  // Filtrar por busca e remover já selecionados
                                                  const fornecedoresFiltrados = fornecedoresDisponiveis.filter((fd: any) => {
                                                    // Não mostrar se já está selecionado
                                                    if (fornecedoresSelecionadosIds.has(fd.id)) {
                                                      return false;
                                                    }
                                                    
                                                    // Filtrar por busca
                                                    if (buscaFornecedor.trim()) {
                                                      const busca = buscaFornecedor.toLowerCase();
                                                      const partnerName = (fd.partner_nome_fantasia || 
                                                                          fd.partner_razao_social ||
                                                                          (fd.partner_id ? partnersMap.get(fd.partner_id)?.nome_fantasia : null) ||
                                                                          (fd.partner_id ? partnersMap.get(fd.partner_id)?.razao_social : null) || '').toLowerCase();
                                                      const cnpj = (fd.partner_cnpj || 
                                                                   (fd.partner_id ? partnersMap.get(fd.partner_id)?.cnpj : null) || '').toLowerCase();
                                                      const cidade = (fd.cidade || '').toLowerCase();
                                                      const uf = (fd.uf || '').toLowerCase();
                                                      const email = (fd.email_cotacao || '').toLowerCase();
                                                      
                                                      return partnerName.includes(busca) ||
                                                             cnpj.includes(busca) ||
                                                             cidade.includes(busca) ||
                                                             uf.includes(busca) ||
                                                             email.includes(busca);
                                                    }
                                                    
                                                    return true;
                                                  });
                                                  
                                                  if (fornecedoresFiltrados.length === 0) {
                                                  return (
                                                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                                        {buscaFornecedor.trim() 
                                                          ? 'Nenhum fornecedor encontrado com o termo buscado'
                                                          : 'Nenhum fornecedor disponível'}
                                                    </div>
                                                  );
                                                }
                                                  
                                                  return fornecedoresFiltrados.map((fd: any) => {
                                                    // Usar dados do partner que já estão no objeto ou buscar do mapa
                                                    const partnerName = fd.partner_nome_fantasia || 
                                                                      fd.partner_razao_social ||
                                                                      (fd.partner_id ? partnersMap.get(fd.partner_id)?.nome_fantasia : null) ||
                                                                      (fd.partner_id ? partnersMap.get(fd.partner_id)?.razao_social : null);
                                                    
                                                  // Tentar várias fontes para o nome do fornecedor
                                                  const displayName = 
                                                      partnerName ||
                                                    fd.contato_principal || 
                                                    (fd.email_cotacao ? fd.email_cotacao.split('@')[0] : null) ||
                                                    `Fornecedor ${fd.id.substring(0, 8)}`;
                                                  
                                                    const isVirtual = fd.is_virtual === true;
                                                    
                                                    // Obter região (cidade/UF) - sempre mostrar UF quando disponível
                                                    const partnerEndereco = fd.partner_id ? (partnersMap.get(fd.partner_id)?.endereco as any) : null;
                                                    const cidade = fd.cidade || partnerEndereco?.cidade || null;
                                                    const uf = fd.uf || partnerEndereco?.estado || null;
                                                    
                                                    // Formatar região: sempre mostrar UF quando disponível
                                                    let regiao = null;
                                                    if (cidade && uf) {
                                                      regiao = `${cidade}/${uf}`;
                                                    } else if (cidade) {
                                                      regiao = cidade;
                                                    } else if (uf) {
                                                      regiao = uf;
                                                    }
                                                  
                                                  return (
                                                      <SelectItem key={fd.id} value={fd.id} disabled={false}>
                                                        <div className="flex flex-col gap-1">
                                                          <div className="flex items-center gap-2">
                                                            <span className="font-medium">{displayName}</span>
                                                            {isVirtual && (
                                                              <Badge variant="outline" className="text-xs h-5 px-1.5 text-amber-600 border-amber-600">
                                                                Sem dados
                                                              </Badge>
                                                            )}
                                                          </div>
                                                          {regiao && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                              <span>📍 {regiao}</span>
                                                            </div>
                                                        )}
                                                        {fd.email_cotacao && (
                                                          <span className="text-xs text-muted-foreground">
                                                              ✉️ {fd.email_cotacao}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </SelectItem>
                                                  );
                                                });
                                              })()}
                                              </ScrollArea>
                                            </SelectContent>
                                          </Select>
                                        )}
                                        {!readOnly && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFornecedor(fornecedor.id)}
                                            disabled={isEmergencial && fornecedores.length === 1}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                      {partner?.cnpj || '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {(() => {
                                        const partnerEndereco = (partner?.endereco as any) || null;
                                        const cidade = fd?.cidade || partnerEndereco?.cidade || null;
                                        const uf = fd?.uf || partnerEndereco?.estado || null;
                                        
                                        // Sempre mostrar UF quando disponível
                                        if (cidade && uf) {
                                          return `${cidade}/${uf}`;
                                        } else if (cidade) {
                                          return cidade;
                                        } else if (uf) {
                                          return uf;
                                        }
                                        return '—';
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {fd?.tipo === 'local' ? 'Local' : fd?.tipo === 'nacional' ? 'Nacional' : fd?.tipo === 'internacional' ? 'Internacional' : '—'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {isBlocked ? (
                                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                          <AlertCircle className="h-3 w-3" />
                                          Bloqueado
                                        </Badge>
                                      ) : (
                                        <Badge variant="default" className="text-xs">
                                          Ativo
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Campo Valores da Cotação - Só habilita quando tem fornecedor vinculado */}
                  {fornecedoresValidos > 0 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">
                          Valores da Cotação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {fornecedoresValidos} fornecedor(es) selecionado(s). 
                            Você pode preencher os valores na aba "Mapa Cotação".
                          </p>
                          <div className="p-4 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-2">Fornecedores Selecionados:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {fornecedores.filter(f => f.fornecedor_id).map((fornecedor) => {
                                const fornecedorDados = fornecedoresDadosMap.get(fornecedor.fornecedor_id);
                                const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                return (
                                  <li key={fornecedor.id} className="text-sm text-muted-foreground">
                                    {partner?.nome_fantasia || partner?.razao_social} {partner?.cnpj && `(${partner.cnpj})`}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Nova Aba: Mapa Cotação */}
              <TabsContent value="mapa-cotacao" className="mt-4 space-y-4">
                {fornecedoresValidos === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecione pelo menos um fornecedor na aba "Itens & Fornecedores" para visualizar o mapa de cotação.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <Label className="text-lg font-semibold">Mapa de Cotação - Comparativo de Valores</Label>
                        <Badge variant="secondary">{itensSelecionados.size} itens selecionados</Badge>
                      </div>
                      {fornecedoresValidos > 0 && !readOnly && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectLowestPrices}
                            className="flex items-center gap-2"
                            title="Seleciona automaticamente o fornecedor com menor valor para cada item"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">Selecionar Mais Baratos</span>
                            <span className="sm:hidden">Mais Baratos</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                title="Seleciona todos os itens de um fornecedor específico"
                              >
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Selecionar Fornecedor</span>
                                <span className="sm:hidden">Fornecedor</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Selecionar todos os itens de:</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {fornecedores.filter(f => f.fornecedor_id).map((f) => {
                                const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor_id);
                                const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.id.substring(0, 8)}`;
                                return (
                                  <DropdownMenuItem
                                    key={f.id}
                                    onClick={() => handleSelectSupplierForAllItems(f.id)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{displayName}</span>
                                      {partner?.cnpj && (
                                        <span className="text-xs text-muted-foreground">{partner.cnpj}</span>
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {readOnly && (
                        <Badge variant="outline" className="text-sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Modo Visualização - Edições Desabilitadas
                        </Badge>
                      )}
                    </div>

                    {/* Tabela Principal: Itens x Fornecedores com Scroll Horizontal */}
                    <div className="rounded border bg-background overflow-hidden">
                      <div className="relative">
                        {/* Container com scroll horizontal e vertical */}
                        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                          <div className="inline-block min-w-full">
                            <div className="border rounded-lg bg-background">
                              {/* Cabeçalho Fixo - Apenas primeira linha congelada */}
                              <div className="flex border-b bg-muted/50 sticky top-0 z-30">
                                {/* Coluna de Itens Fixa com fundo sólido */}
                                <div className="sticky left-0 z-40 bg-background p-3 font-medium text-sm border-r w-[250px] flex-shrink-0 shadow-lg">
                                  <div className="bg-background">Item / Descrição</div>
                            </div>
                                {/* Container de Fornecedores com Scroll */}
                                <div className="flex">
                            {fornecedores.filter(f => f.fornecedor_id).map((f) => {
                              // Buscar fornecedor_dados pelo fornecedor_id
                              const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor_id);
                              // Buscar partner pelo partner_id do fornecedor_dados
                              const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                              const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.id.substring(0, 8)}`;
                                    
                                    // Verificar se este fornecedor tem pelo menos um item com valor preenchido
                                    const temValoresPreenchidos = itensAgrupados
                                      .filter((item) => itensSelecionados.has(getItemKey(item)))
                                      .some((item) => {
                                        const cell = mapaFornecedorItens[f.id]?.[getItemKey(item)];
                                        return cell && cell.valor_unitario && cell.valor_unitario > 0;
                                      });
                                    
                              return (
                                      <div key={f.id} className="p-2 font-medium text-xs border-r last:border-r-0 text-center bg-muted/30 w-[300px] flex-shrink-0">
                                        <div 
                                          className={`font-semibold text-sm mb-1 truncate ${
                                            temValoresPreenchidos 
                                              ? 'cursor-pointer hover:text-primary hover:underline transition-colors' 
                                              : ''
                                          }`}
                                          title={temValoresPreenchidos ? `Clique para editar informações de ${displayName}` : displayName}
                                          onClick={() => {
                                            if (temValoresPreenchidos && !readOnly) {
                                              setFornecedorSelecionadoModal(f.id);
                                              setFornecedorModalAberto(true);
                                            }
                                          }}
                                        >
                                          {displayName}
                                        </div>
                                  {partner?.cnpj && (
                                          <div className="text-xs text-muted-foreground mb-2">{partner.cnpj}</div>
                                        )}
                                        <div className="grid grid-cols-3 gap-1 text-xs font-normal">
                                          <div className="bg-background/50 p-1.5 rounded text-center border">Valor</div>
                                          <div className="bg-background/50 p-1.5 rounded text-center border">Qtd.</div>
                                          <div className="bg-background/50 p-1.5 rounded text-center border">Total</div>
                                  </div>
                                </div>
                              );
                            })}
                                </div>
                          </div>

                          {/* Linhas de Itens */}
                          {itensAgrupados
                            .filter((item) => itensSelecionados.has(getItemKey(item)))
                            .map((item) => {
                              const itemKey = getItemKey(item);
                              const fornecedoresValidosList = fornecedores.filter(f => f.fornecedor_id);
                              
                              // Calcular menor e maior valor
                              let lowestValue: number | null = null;
                              let highestValue: number | null = null;
                              let lowestSupplierId: string | null = null;
                              let highestSupplierId: string | null = null;

                              fornecedoresValidosList.forEach((f) => {
                                const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                if (cell) {
                                  const total = valorItemCalculado(cell) + (cell.valor_frete || 0);
                                  if (total > 0) {
                                    if (lowestValue === null || total < lowestValue) {
                                      lowestValue = total;
                                      lowestSupplierId = f.id;
                                    }
                                    if (highestValue === null || total > highestValue) {
                                      highestValue = total;
                                      highestSupplierId = f.id;
                                    }
                                  }
                                }
                              });

                              return (
                                    <div key={itemKey} className="flex border-b last:border-b-0 relative">
                                      {/* Coluna de Item Fixa com fundo sólido para não mostrar fornecedores por trás */}
                                      <div className="sticky left-0 z-30 p-3 border-r bg-background w-[250px] flex-shrink-0 shadow-lg">
                                        <div className="bg-background">
                                      <div className="font-medium text-sm">{item.material_nome}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {item.material_codigo || '—'} • {item.quantidade_total.toLocaleString('pt-BR')} {item.unidade_medida}
                                          </div>
                                          {/* Indicador de Fornecedor Vencedor */}
                                          {(() => {
                                            const vencedor = fornecedoresValidosList.find((f) => {
                                              const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                              return cell?.is_vencedor;
                                            });
                                            if (vencedor) {
                                              const fornecedorDados = fornecedoresDadosMap.get(vencedor.fornecedor_id);
                                              const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                              const displayName = partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';
                                              return (
                                                <div className="mt-2 flex items-center gap-1">
                                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                                  <span className="text-xs text-green-600 font-medium">Vencedor: {displayName}</span>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                      </div>
                                    </div>

                                      {/* Container de Fornecedores com Scroll - Mantém alinhamento perfeito */}
                                      <div className="flex bg-background">
                                    {fornecedoresValidosList.map((f) => {
                                      const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                      const isLowest = f.id === lowestSupplierId && lowestValue !== null;
                                      const isHighest = f.id === highestSupplierId && highestValue !== null && lowestSupplierId !== highestSupplierId;
                                      // Calcular valor total incluindo frete do item para exibição
                                      const valorItem = cell ? valorItemCalculado(cell) : 0;
                                      const freteItem = cell?.valor_frete || 0;
                                      const valorTotal = valorItem + freteItem;

                                          const isVencedor = cell?.is_vencedor || false;

                                      return (
                                        <div
                                          key={f.id}
                                              className={`p-2 border-r last:border-r-0 w-[300px] flex-shrink-0 bg-background ${
                                            isLowest ? 'bg-green-50 dark:bg-green-950/20' : ''
                                          } ${
                                            isHighest ? 'bg-red-50 dark:bg-red-950/20' : ''
                                              } ${
                                                isVencedor ? 'ring-2 ring-green-500 ring-offset-1 bg-green-50 dark:bg-green-950/30' : ''
                                          }`}
                                        >
                                              <div className="space-y-2">
                                          <div className="grid grid-cols-3 gap-1">
                                            {/* Valor Unitário */}
                                            <div>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                      value={cell?.valor_unitario ?? ''}
                                                onChange={(e) => {
                                                  if (!readOnly) {
                                                    handleUpdateMapaValor(
                                                      f.id,
                                                      item,
                                                      'valor_unitario',
                                                      parseFloat(e.target.value) || 0
                                                    );
                                                  }
                                                }}
                                                placeholder="0,00"
                                                className="h-8 text-xs text-center"
                                                disabled={readOnly}
                                              />
                                            </div>
                                            {/* Quantidade */}
                                            <div>
                                              <Input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                value={cell?.quantidade_ofertada ?? item.quantidade_total}
                                                onChange={(e) => {
                                                  if (!readOnly) {
                                                    handleUpdateMapaValor(
                                                      f.id,
                                                      item,
                                                      'quantidade_ofertada',
                                                      parseFloat(e.target.value) || 0
                                                    );
                                                  }
                                                }}
                                                placeholder="0"
                                                className="h-8 text-xs text-center"
                                                disabled={readOnly}
                                              />
                                            </div>
                                            {/* Valor Total (calculado) */}
                                            <div className="flex items-center justify-center">
                                              <span className={`text-xs font-semibold ${
                                                isLowest ? 'text-green-600 dark:text-green-400' : ''
                                              } ${
                                                isHighest ? 'text-red-600 dark:text-red-400' : ''
                                              }`}>
                                                {valorTotal > 0 
                                                  ? `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                  : '—'
                                                }
                                              </span>
                                                  </div>
                                                </div>
                                                
                                                {/* Botão para abrir modal de frete/desconto */}
                                                <div className="flex items-center justify-center pt-1 border-t">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs px-2"
                                                    onClick={() => {
                                                      if (!readOnly) {
                                                        setModalItemDetalhes({
                                                          fornecedorId: f.id,
                                                          itemKey,
                                                          item,
                                                        });
                                                      }
                                                    }}
                                                    disabled={readOnly}
                                                    title="Configurar frete e descontos do item"
                                                  >
                                                    <Settings className="h-3 w-3" />
                                                    {(cell?.valor_frete || cell?.desconto_percentual || cell?.desconto_valor) && (
                                                      <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">•</span>
                                                    )}
                                                  </Button>
                                                </div>
                                                
                                                {/* Checkbox Vencedor */}
                                                <div className="flex items-center justify-center pt-1 border-t">
                                                  {(() => {
                                                    // Verificar se algum outro fornecedor já é vencedor deste item
                                                    const outroVencedor = fornecedoresValidosList.find((forn) => {
                                                      if (forn.id === f.id) return false;
                                                      const outraCell = mapaFornecedorItens[forn.id]?.[itemKey];
                                                      return outraCell && outraCell.is_vencedor === true;
                                                    });
                                                    
                                                    const isOutroVencedor = !!outroVencedor;
                                                    const isEsteVencedor = cell?.is_vencedor || false;
                                                    
                                                    return (
                                                      <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                          id={`vencedor-${itemKey}-${f.id}`}
                                                          checked={isEsteVencedor}
                                                          disabled={(isOutroVencedor && !isEsteVencedor) || readOnly}
                                                          onCheckedChange={(checked) => {
                                                            if (!readOnly && (!isOutroVencedor || checked)) {
                                                              handleSelectVencedor(f.id, item, checked as boolean);
                                                            }
                                                          }}
                                                        />
                                                        <Label
                                                          htmlFor={`vencedor-${itemKey}-${f.id}`}
                                                          className={`text-xs ${
                                                            (isOutroVencedor && !isEsteVencedor) || readOnly
                                                              ? 'cursor-not-allowed text-muted-foreground opacity-50'
                                                              : 'cursor-pointer'
                                                          }`}
                                                        >
                                                          Vencedor
                                                        </Label>
                                                      </div>
                                                    );
                                                  })()}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seção de Soma Parcial por Fornecedor Vencedor */}
                    {(() => {
                      const fornecedoresVencedores = fornecedores
                        .filter(f => f.fornecedor_id)
                        .filter(f => {
                          // Verificar se este fornecedor tem pelo menos um item vencedor
                          return itensAgrupados
                            .filter((item) => itensSelecionados.has(getItemKey(item)))
                            .some((item) => {
                              const itemKey = getItemKey(item);
                              const cell = mapaFornecedorItens[f.id]?.[itemKey];
                              return cell && cell.is_vencedor === true;
                            });
                        });

                      if (fornecedoresVencedores.length === 0) return null;

                      return (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardHeader>
                            <CardTitle className="text-base">Resumo Parcial por Fornecedor Vencedor</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Valores parciais dos itens selecionados como vencedores para cada fornecedor
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {fornecedoresVencedores.map((f) => {
                                const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor_id);
                                const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.id.substring(0, 8)}`;
                                
                                // Calcular subtotal PARCIAL (apenas itens onde este fornecedor é vencedor)
                                const subtotalParcial = itensAgrupados
                                  .filter((item) => itensSelecionados.has(getItemKey(item)))
                                  .reduce((sum, item) => {
                                    const itemKey = getItemKey(item);
                                    const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                    if (cell && cell.is_vencedor) {
                                      return sum + valorItemCalculado(cell);
                                    }
                                    return sum;
                                  }, 0);

                                // Contar quantos itens este fornecedor é vencedor
                                const qtdItensVencedores = itensAgrupados
                                  .filter((item) => itensSelecionados.has(getItemKey(item)))
                                  .filter((item) => {
                                    const itemKey = getItemKey(item);
                                    const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                    return cell && cell.is_vencedor === true;
                                  }).length;

                                return (
                                  <div key={f.id} className="p-4 border rounded-lg bg-background">
                                    <div className="font-semibold text-sm mb-2">{displayName}</div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {qtdItensVencedores} {qtdItensVencedores === 1 ? 'item vencedor' : 'itens vencedores'}
                                    </div>
                                    <div className="font-bold text-lg text-primary">
                                      R$ {subtotalParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Seção de Informações Adicionais por Fornecedor */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Informações Adicionais da Cotação</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Frete e Desconto da Cotação (Geral) - aplicado a toda a cotação */}
                          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                            <div className="font-semibold text-sm">Frete e Desconto da Cotação (Geral)</div>
                            <p className="text-xs text-muted-foreground">Aplicado ao total da cotação. Pode ser usado junto com frete/desconto por fornecedor e por item.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Frete (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.valor_frete ?? 0}
                                  onChange={(e) => !readOnly && setFormData(f => ({ ...f, valor_frete: parseFloat(e.target.value) || 0 }))}
                                  className="h-9 text-sm"
                                  disabled={readOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Desconto (%)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={formData.desconto_percentual ?? 0}
                                  onChange={(e) => !readOnly && setFormData(f => ({ ...f, desconto_percentual: parseFloat(e.target.value) || 0 }))}
                                  className="h-9 text-sm"
                                  disabled={readOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.desconto_valor ?? 0}
                                  onChange={(e) => !readOnly && setFormData(f => ({ ...f, desconto_valor: parseFloat(e.target.value) || 0 }))}
                                  className="h-9 text-sm"
                                  disabled={readOnly}
                                />
                              </div>
                            </div>
                          </div>

                          {fornecedores.filter(f => f.fornecedor_id).map((f) => {
                            // Buscar fornecedor_dados pelo fornecedor_id
                            const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor_id);
                            // Buscar partner pelo partner_id do fornecedor_dados
                            const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                            const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.id.substring(0, 8)}`;
                            
                            // Calcular subtotal PARCIAL (apenas itens onde este fornecedor é vencedor)
                            const subtotalParcial = itensAgrupados
                              .filter((item) => itensSelecionados.has(getItemKey(item)))
                              .reduce((sum, item) => {
                                const itemKey = getItemKey(item);
                                const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                if (cell && cell.is_vencedor) {
                                  return sum + valorItemCalculado(cell);
                                }
                                return sum;
                              }, 0);

                            // Calcular subtotal TOTAL (todos os itens cotados por este fornecedor)
                            const subtotalTotal = itensAgrupados
                              .filter((item) => itensSelecionados.has(getItemKey(item)))
                              .reduce((sum, item) => {
                                const cell = mapaFornecedorItens[f.id]?.[getItemKey(item)];
                                return sum + (cell ? valorItemCalculado(cell) : 0);
                              }, 0);

                            const frete = f.valor_frete || 0;
                            const imposto = f.valor_imposto || 0;
                            const descontoPct = f.desconto_percentual || 0;
                            const descontoValor = f.desconto_valor || 0;
                            // Desconto aplicado apenas sobre o subtotal PARCIAL (itens vencedores)
                            const descontoCalculado = subtotalParcial * (descontoPct / 100) + descontoValor;
                            const total = subtotalParcial + frete + imposto - descontoCalculado;

                            return (
                              <div key={f.id} className="border rounded-lg p-4 space-y-3">
                                <div className="font-semibold text-sm mb-3 pb-2 border-b">
                                  {displayName}
                                </div>
                                
                                {/* Resumo Parcial e Total */}
                                <div className="p-3 bg-muted/30 rounded-lg mb-3">
                                  <div className="text-xs text-muted-foreground mb-1">Subtotal Parcial (Itens Vencedores):</div>
                                  <div className="font-bold text-lg text-primary">R$ {subtotalParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-xs text-muted-foreground mt-2">Subtotal Total (Todos os Itens Cotados):</div>
                                  <div className="font-semibold text-sm">R$ {subtotalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {/* Frete */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Frete (R$)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={frete}
                                      onChange={(e) => {
                                        if (!readOnly) {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          setFornecedores(fornecedores.map(forn => 
                                            forn.id === f.id ? { ...forn, valor_frete: newValue } : forn
                                          ));
                                        }
                                      }}
                                      className="h-9 text-sm"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  {/* Imposto */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Imposto (R$)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={imposto}
                                      onChange={(e) => {
                                        if (!readOnly) {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          setFornecedores(fornecedores.map(forn => 
                                            forn.id === f.id ? { ...forn, valor_imposto: newValue } : forn
                                          ));
                                        }
                                      }}
                                      className="h-9 text-sm"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  {/* Desconto Percentual */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Desconto (%)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={descontoPct}
                                      onChange={(e) => {
                                        if (!readOnly) {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          console.log(`[ModalGerarCotacao] Atualizando desconto_percentual do fornecedor ${f.id} (${f.fornecedor_nome}):`, {
                                            fornecedor_id: f.id,
                                            fornecedor_nome: f.fornecedor_nome,
                                            valor_anterior: descontoPct,
                                            valor_novo: newValue
                                          });
                                          setFornecedores(fornecedores.map(forn => 
                                            forn.id === f.id ? { ...forn, desconto_percentual: newValue } : forn
                                          ));
                                        }
                                      }}
                                      className="h-9 text-sm"
                                      disabled={readOnly}
                                    />
                                  </div>

                                  {/* Desconto Valor */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={descontoValor}
                                      onChange={(e) => {
                                        if (!readOnly) {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          console.log(`[ModalGerarCotacao] Atualizando desconto_valor do fornecedor ${f.id} (${f.fornecedor_nome}):`, {
                                            fornecedor_id: f.id,
                                            fornecedor_nome: f.fornecedor_nome,
                                            valor_anterior: descontoValor,
                                            valor_novo: newValue
                                          });
                                          setFornecedores(fornecedores.map(forn => 
                                            forn.id === f.id ? { ...forn, desconto_valor: newValue } : forn
                                          ));
                                        }
                                      }}
                                      className="h-9 text-sm"
                                      disabled={readOnly}
                                    />
                                  </div>
                                </div>

                                {/* Resumo Financeiro */}
                                <div className="mt-4 pt-3 border-t">
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Subtotal Parcial:</span>
                                      <div className="font-semibold">R$ {subtotalParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Frete:</span>
                                      <div className="font-semibold">R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Imposto:</span>
                                      <div className="font-semibold">R$ {imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Desconto:</span>
                                      <div className="font-semibold text-red-600">- R$ {descontoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="border-l pl-3">
                                      <span className="text-muted-foreground">Total:</span>
                                      <div className="font-bold text-lg">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Prazo e Condições */}
                                <div className="mt-3 pt-3 border-t">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Prazo de Entrega (dias)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={f.prazo_entrega || 0}
                                        onChange={(e) => {
                                          if (!readOnly) {
                                            const newValue = parseInt(e.target.value) || 0;
                                            setFornecedores(fornecedores.map(forn => 
                                              forn.id === f.id ? { ...forn, prazo_entrega: newValue } : forn
                                            ));
                                          }
                                        }}
                                        className="h-9 text-sm"
                                        disabled={readOnly}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Condição de Pagamento (Legado)</Label>
                                      <Input
                                        value={f.condicao_pagamento || ''}
                                        onChange={(e) => {
                                          if (!readOnly) {
                                            setFornecedores(fornecedores.map(forn => 
                                              forn.id === f.id ? { ...forn, condicao_pagamento: e.target.value } : forn
                                            ));
                                          }
                                        }}
                                        placeholder="Ex: 30/60/90 dias"
                                        className="h-9 text-sm"
                                        disabled={readOnly}
                                      />
                                    </div>
                                  </div>

                                  {/* ✅ NOVO: Condições de Pagamento Estruturadas */}
                                  <div className="space-y-3 pt-3 border-t">
                                    <Label className="text-sm font-medium">Condições de Pagamento</Label>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Forma de Pagamento */}
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                                        <Select
                                          value={f.forma_pagamento || ''}
                                          onValueChange={(value) => {
                                            if (!readOnly) {
                                              setFornecedores(fornecedores.map(forn => 
                                                forn.id === f.id ? { ...forn, forma_pagamento: value } : forn
                                              ));
                                            }
                                          }}
                                          disabled={readOnly}
                                        >
                                          <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Selecione a forma" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PIX">PIX</SelectItem>
                                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                            <SelectItem value="À Vista">À Vista</SelectItem>
                                            <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Parcelamento */}
                                      <div className="flex items-end gap-2">
                                        <div className="flex items-center space-x-2 pt-6">
                                          <Checkbox
                                            id={`parcelar-${f.id}`}
                                            checked={f.is_parcelada || false}
                                            onCheckedChange={(checked) => {
                                              if (!readOnly) {
                                                const isParcelada = checked === true;
                                                setFornecedores(fornecedores.map(forn => 
                                                  forn.id === f.id ? { 
                                                    ...forn, 
                                                    is_parcelada: isParcelada,
                                                    numero_parcelas: isParcelada ? (forn.numero_parcelas || 2) : 1
                                                  } : forn
                                                ));
                                              }
                                            }}
                                            disabled={readOnly}
                                          />
                                          <Label 
                                            htmlFor={`parcelar-${f.id}`}
                                            className="text-xs font-normal cursor-pointer"
                                          >
                                            Parcelar
                                          </Label>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Número de Parcelas e Intervalo (quando parcelado) */}
                                    {f.is_parcelada && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Número de Parcelas</Label>
                                          <Input
                                            type="number"
                                            min="2"
                                            max="12"
                                            value={f.numero_parcelas || 2}
                                            onChange={(e) => {
                                              if (!readOnly) {
                                                const newValue = Math.max(2, parseInt(e.target.value) || 2);
                                                setFornecedores(fornecedores.map(forn => 
                                                  forn.id === f.id ? { ...forn, numero_parcelas: newValue } : forn
                                                ));
                                              }
                                            }}
                                            className="h-9 text-sm"
                                            disabled={readOnly}
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Intervalo entre Parcelas</Label>
                                          <Select
                                            value={f.intervalo_parcelas || '30'}
                                            onValueChange={(value) => {
                                              if (!readOnly) {
                                                setFornecedores(fornecedores.map(forn => 
                                                  forn.id === f.id ? { ...forn, intervalo_parcelas: value } : forn
                                                ));
                                              }
                                            }}
                                            disabled={readOnly}
                                          >
                                            <SelectTrigger className="h-9 text-sm">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="30">30 dias</SelectItem>
                                              <SelectItem value="60">60 dias</SelectItem>
                                              <SelectItem value="90">90 dias</SelectItem>
                                              <SelectItem value="120">120 dias</SelectItem>
                                              <SelectItem value="150">150 dias</SelectItem>
                                              <SelectItem value="180">180 dias</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Observações */}
                                <div className="mt-3">
                                  {(() => {
                                    // Verificar se este fornecedor tem algum item vencedor que não é o de menor preço
                                    const fornecedoresValidosParaComparacao = fornecedores.filter(f => f.fornecedor_id);
                                    const temItemVencedorNaoMenor = itensAgrupados
                                      .filter((item) => itensSelecionados.has(getItemKey(item)))
                                      .some((item) => {
                                        const itemKey = getItemKey(item);
                                        const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                        if (!cell || !cell.is_vencedor) return false;
                                        
                                        // Calcular menor valor para este item (incluindo frete do item)
                                        let menorValor: number | null = null;
                                        fornecedoresValidosParaComparacao.forEach((forn) => {
                                          const cellFornecedor = mapaFornecedorItens[forn.id]?.[itemKey];
                                          if (cellFornecedor) {
                                            const valorItem = valorItemCalculado(cellFornecedor);
                                            const freteItem = cellFornecedor.valor_frete || 0;
                                            const total = valorItem + freteItem;
                                            if (total > 0 && (menorValor === null || total < menorValor)) {
                                              menorValor = total;
                                            }
                                          }
                                        });
                                        
                                        const valorItemVencedor = valorItemCalculado(cell);
                                        const freteItemVencedor = cell.valor_frete || 0;
                                        const valorVencedor = valorItemVencedor + freteItemVencedor;
                                        return menorValor !== null && valorVencedor > menorValor;
                                      });
                                    
                                    const isObrigatorio = temItemVencedorNaoMenor;
                                    
                                    return (
                                      <>
                                        <Label className={`text-xs ${isObrigatorio ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                          Observações {isObrigatorio && '*'}
                                        </Label>
                                        {isObrigatorio && (
                                          <p className="text-xs text-red-600 mb-1">
                                            Obrigatório: este fornecedor foi selecionado como vencedor para item(ns) que não são o menor preço
                                          </p>
                                        )}
                                  <Textarea
                                    value={f.observacoes || ''}
                                    onChange={(e) => {
                                      if (!readOnly) {
                                        setFornecedores(fornecedores.map(forn => 
                                          forn.id === f.id ? { ...forn, observacoes: e.target.value } : forn
                                        ));
                                      }
                                    }}
                                          placeholder={
                                            isObrigatorio 
                                              ? "Justifique por que este fornecedor foi escolhido mesmo não sendo o menor preço..."
                                              : "Observações sobre esta cotação..."
                                          }
                                          className={`text-sm min-h-[60px] ${isObrigatorio ? 'border-red-300 focus:border-red-500' : ''}`}
                                          required={isObrigatorio}
                                          disabled={readOnly}
                                        />
                                      </>
                                    );
                                  })()}
                                </div>
                                
                                {/* Anexos */}
                                <div className="mt-3 pt-3 border-t">
                                  <Label className="text-xs text-muted-foreground mb-2 block">Anexos</Label>
                                  <div className="space-y-2">
                                    {/* Lista de anexos existentes */}
                                    {anexosPorFornecedor[f.id]?.map((anexo) => (
                                      <div key={anexo.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <a
                                            href={anexo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline truncate"
                                            title={anexo.file_name}
                                          >
                                            {anexo.file_name}
                                          </a>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          onClick={async () => {
                                            try {
                                              // Remover do storage
                                              const { error: deleteError } = await supabase.storage
                                                .from('cotacao-anexos')
                                                .remove([anexo.storage_path]);
                                              
                                              if (deleteError) throw deleteError;
                                              
                                              // Remover do estado
                                              setAnexosPorFornecedor(prev => ({
                                                ...prev,
                                                [f.id]: prev[f.id]?.filter(a => a.id !== anexo.id) || []
                                              }));
                                              
                                              toast({
                                                title: 'Anexo removido',
                                                description: 'O anexo foi removido com sucesso.',
                                              });
                                            } catch (error: any) {
                                              toast({
                                                title: 'Erro ao remover anexo',
                                                description: error.message || 'Não foi possível remover o anexo.',
                                                variant: 'destructive',
                                              });
                                            }
                                          }}
                                        >
                                          <XIcon className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    
                                    {/* Botão de upload */}
                                    <div className="relative">
                                      <input
                                        type="file"
                                        id={`anexo-${f.id}`}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !selectedCompany?.id) return;
                                          
                                          // Validar tamanho (10MB)
                                          if (file.size > 10 * 1024 * 1024) {
                                            toast({
                                              title: 'Arquivo muito grande',
                                              description: 'O arquivo deve ter no máximo 10MB.',
                                              variant: 'destructive',
                                            });
                                            return;
                                          }
                                          
                                          setUploadingFornecedor(f.id);
                                          
                                          try {
                                            // Sanitizar nome do arquivo
                                            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                                            const timestamp = Date.now();
                                            const fileName = `${timestamp}_${sanitizedName}`;
                                            
                                            // Estrutura: {company_id}/{cotacao_id}/{fornecedor_id}/{filename}
                                            // Como ainda não temos cotacao_id, usamos temporário
                                            const filePath = `${selectedCompany.id}/temp/${f.id}/${fileName}`;
                                            
                                            // Upload do arquivo
                                            const { data: uploadData, error: uploadError } = await supabase.storage
                                              .from('cotacao-anexos')
                                              .upload(filePath, file, {
                                                cacheControl: '3600',
                                                upsert: false
                                              });
                                            
                                            if (uploadError) throw uploadError;
                                            
                                            // Obter URL do arquivo (signed URL para bucket privado)
                                            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                              .from('cotacao-anexos')
                                              .createSignedUrl(filePath, 3600 * 24 * 365); // 1 ano
                                            
                                            let fileUrl = '';
                                            if (signedUrlError || !signedUrlData) {
                                              const { data: publicUrlData } = supabase.storage
                                                .from('cotacao-anexos')
                                                .getPublicUrl(filePath);
                                              fileUrl = publicUrlData.publicUrl;
                                            } else {
                                              fileUrl = signedUrlData.signedUrl;
                                            }
                                            
                                            // Adicionar ao estado
                                            const novoAnexo = {
                                              id: `${Date.now()}-${Math.random()}`,
                                              file_name: file.name,
                                              storage_path: filePath,
                                              url: fileUrl,
                                              mime_type: file.type,
                                              size_bytes: file.size
                                            };
                                            
                                            setAnexosPorFornecedor(prev => ({
                                              ...prev,
                                              [f.id]: [...(prev[f.id] || []), novoAnexo]
                                            }));
                                            
                                            toast({
                                              title: 'Anexo enviado',
                                              description: 'O arquivo foi anexado com sucesso.',
                                            });
                                            
                                          } catch (error: any) {
                                            console.error('Erro no upload:', error);
                                            toast({
                                              title: 'Erro no upload',
                                              description: error.message || 'Não foi possível fazer upload do arquivo.',
                                              variant: 'destructive',
                                            });
                                          } finally {
                                            setUploadingFornecedor(null);
                                            // Limpar input
                                            e.target.value = '';
                                          }
                                        }}
                                        disabled={uploadingFornecedor === f.id}
                                      />
                                      <label htmlFor={`anexo-${f.id}`}>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs"
                                          disabled={uploadingFornecedor === f.id}
                                          asChild
                                        >
                                          <span className="flex items-center justify-center gap-2 cursor-pointer">
                                            {uploadingFornecedor === f.id ? (
                                              <>
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Enviando...
                                              </>
                                            ) : (
                                              <>
                                                <Paperclip className="h-3 w-3" />
                                                Anexar arquivo
                                              </>
                                            )}
                                          </span>
                                        </Button>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>


              <TabsContent value="rateio" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label>Rateio Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Distribuição automática por requisição, centro de custo e projeto
                      </p>
                    </div>
                  </div>

                  {rateio.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum rateio calculado</p>
                      <p className="text-sm">Adicione itens e fornecedores para calcular o rateio</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Resumo por Requisição */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Por Requisição</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Requisição</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Valor Itens</TableHead>
                                <TableHead>Frete</TableHead>
                                <TableHead>Imposto</TableHead>
                                <TableHead>Custos Adicionais</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.requisicao_id))).map((reqId) => {
                                const items = rateio.filter(r => r.requisicao_id === reqId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);
                                const totalFrete = items.reduce((sum, item) => sum + (item.frete_proporcional || 0), 0);
                                const totalImposto = items.reduce((sum, item) => sum + (item.imposto_proporcional || 0), 0);
                                const totalCustos = totalFrete + totalImposto; // Total = frete + imposto
                                const totalGeral = totalValor + totalCustos; // Total geral = valor itens + custos
                                return (
                                  <TableRow key={reqId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.requisicao_numero || reqId.substring(0, 8)}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                      {totalFrete > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalImposto > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalCustos > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Resumo por Centro de Custo */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Por Centro de Custo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Centro de Custo</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Valor Itens</TableHead>
                                <TableHead>Frete</TableHead>
                                <TableHead>Imposto</TableHead>
                                <TableHead>Custos Adicionais</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.centro_custo_id).filter(Boolean))).map((ccId) => {
                                const items = rateio.filter(r => r.centro_custo_id === ccId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);
                                const totalFrete = items.reduce((sum, item) => sum + (item.frete_proporcional || 0), 0);
                                const totalImposto = items.reduce((sum, item) => sum + (item.imposto_proporcional || 0), 0);
                                const totalCustos = totalFrete + totalImposto; // Total = frete + imposto
                                const totalGeral = totalValor + totalCustos; // Total geral = valor itens + custos
                                return (
                                  <TableRow key={ccId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.centro_custo_nome || '—'}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                      {totalFrete > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalImposto > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalCustos > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Resumo por Projeto */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Por Projeto</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Projeto</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Valor Itens</TableHead>
                                <TableHead>Frete</TableHead>
                                <TableHead>Imposto</TableHead>
                                <TableHead>Custos Adicionais</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.projeto_id).filter(Boolean))).map((projId) => {
                                const items = rateio.filter(r => r.projeto_id === projId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);
                                const totalFrete = items.reduce((sum, item) => sum + (item.frete_proporcional || 0), 0);
                                const totalImposto = items.reduce((sum, item) => sum + (item.imposto_proporcional || 0), 0);
                                const totalCustos = totalFrete + totalImposto; // Total = frete + imposto
                                const totalGeral = totalValor + totalCustos; // Total geral = valor itens + custos
                                return (
                                  <TableRow key={projId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.projeto_nome || '—'}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                      {totalFrete > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalImposto > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {totalCustos > 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="finalizacao" className="mt-4 space-y-4 max-h-[75vh] overflow-auto pr-2">
                {(() => {
                  // Calcular fornecedores vencedores e seus totais parciais
                  const fornecedoresVencedores = fornecedores
                    .filter(f => f.fornecedor_id)
                    .map(f => {
                      // Calcular subtotal PARCIAL (apenas itens onde este fornecedor é vencedor)
                      const subtotalParcial = itensAgrupados
                        .filter((item) => itensSelecionados.has(getItemKey(item)))
                        .reduce((sum, item) => {
                          const itemKey = getItemKey(item);
                          const cell = mapaFornecedorItens[f.id]?.[itemKey];
                          if (cell && cell.is_vencedor) {
                            return sum + valorItemCalculado(cell);
                          }
                          return sum;
                        }, 0);

                      // Aplicar descontos, frete e imposto
                      const frete = f.valor_frete || 0;
                      const imposto = f.valor_imposto || 0;
                      const descontoPct = f.desconto_percentual || 0;
                      const descontoValor = f.desconto_valor || 0;
                      const descontoCalculado = subtotalParcial * (descontoPct / 100) + descontoValor;
                      const totalSelecionado = subtotalParcial + frete + imposto - descontoCalculado;

                      // Contar itens vencedores
                      const qtdItensVencedores = itensAgrupados
                        .filter((item) => itensSelecionados.has(getItemKey(item)))
                        .filter((item) => {
                          const itemKey = getItemKey(item);
                          const cell = mapaFornecedorItens[f.id]?.[itemKey];
                          return cell && cell.is_vencedor === true;
                        }).length;

                      return {
                        fornecedor: f,
                        subtotalParcial,
                        totalSelecionado,
                        qtdItensVencedores,
                      };
                    })
                    .filter(f => f.qtdItensVencedores > 0);

                  // Encontrar fornecedor líder (maior valor total selecionado)
                  const fornecedorLider = fornecedoresVencedores.length > 0
                    ? fornecedoresVencedores.reduce((lider, atual) => 
                        atual.totalSelecionado > lider.totalSelecionado ? atual : lider
                      )
                    : null;

                  // Calcular valores para o resumo detalhado
                  // Calcular subtotalItens diretamente a partir de todos os itens vencedores
                  const subtotalItens = itensAgrupados
                    .filter((item) => itensSelecionados.has(getItemKey(item)))
                    .reduce((sum, item) => {
                      const itemKey = getItemKey(item);
                      // Encontrar o fornecedor vencedor para este item
                      const fornecedorVencedor = fornecedores.find(f => {
                        const cell = mapaFornecedorItens[f.id]?.[itemKey];
                        return cell && cell.is_vencedor === true;
                      });
                      if (fornecedorVencedor) {
                        const cell = mapaFornecedorItens[fornecedorVencedor.id]?.[itemKey];
                        if (cell) {
                          return sum + valorItemCalculado(cell);
                        }
                      }
                      return sum;
                    }, 0);
                  const freteTotal = fornecedoresVencedores.reduce((sum, f) => {
                    const frete = typeof f.fornecedor.valor_frete === 'number' 
                      ? f.fornecedor.valor_frete 
                      : (f.fornecedor.valor_frete != null && f.fornecedor.valor_frete !== '' ? Number(f.fornecedor.valor_frete) : 0);
                    return sum + frete;
                  }, 0);
                  const impostoTotal = fornecedoresVencedores.reduce((sum, f) => {
                    const imposto = typeof f.fornecedor.valor_imposto === 'number' 
                      ? f.fornecedor.valor_imposto 
                      : (f.fornecedor.valor_imposto != null && f.fornecedor.valor_imposto !== '' ? Number(f.fornecedor.valor_imposto) : 0);
                    return sum + imposto;
                  }, 0);
                  const descontoTotal = fornecedoresVencedores.reduce((sum, f) => {
                    const descontoPct = f.fornecedor.desconto_percentual || 0;
                    const descontoValor = f.fornecedor.desconto_valor || 0;
                    const descontoCalculado = f.subtotalParcial * (descontoPct / 100) + descontoValor;
                    return sum + descontoCalculado;
                  }, 0);
                  
                  // Calcular valor total da cotação (antes de aplicar campos gerais)
                  const valorTotalAntesGeral = fornecedoresVencedores.reduce((sum, f) => sum + f.totalSelecionado, 0);
                  
                  // Aplicar campos gerais da cotação (frete, desconto percentual e desconto valor)
                  const freteGeral = formData.valor_frete != null ? Number(formData.valor_frete) : 0;
                  const descontoPercentualGeral = formData.desconto_percentual != null ? Number(formData.desconto_percentual) : 0;
                  const descontoValorGeral = formData.desconto_valor != null ? Number(formData.desconto_valor) : 0;
                  
                  // Calcular: subtotal + frete geral - descontos gerais
                  const baseParaDescontoGeral = valorTotalAntesGeral + freteGeral;
                  const descontoGeralCalculado = (baseParaDescontoGeral * (descontoPercentualGeral / 100)) + descontoValorGeral;
                  const valorTotalCotacao = Math.max(0, baseParaDescontoGeral - descontoGeralCalculado);
                  
                  // Calcular economia estimada: diferença entre valor selecionado e média das propostas
                  const economiaEstimada = (() => {
                    // Para cada item selecionado, calcular a média de todos os fornecedores que cotaram
                    let somaValoresMedios = 0;
                    let somaValoresSelecionados = 0;
                    
                    itensAgrupados
                      .filter((item) => itensSelecionados.has(getItemKey(item)))
                      .forEach((item) => {
                        const itemKey = getItemKey(item);
                        const valoresFornecedores: number[] = [];
                        
                        // Coletar todos os valores cotados para este item (incluindo frete do item)
                        fornecedores.filter(f => f.fornecedor_id).forEach((f) => {
                          const cell = mapaFornecedorItens[f.id]?.[itemKey];
                          if (cell) {
                            const valorItem = valorItemCalculado(cell);
                            const freteItem = cell.valor_frete || 0;
                            const valorTotal = valorItem + freteItem;
                            if (valorTotal > 0) {
                              valoresFornecedores.push(valorTotal);
                            }
                          }
                        });
                        
                        if (valoresFornecedores.length > 0) {
                          // Calcular média dos valores (incluindo frete do item)
                          const mediaValor = valoresFornecedores.reduce((sum, v) => sum + v, 0) / valoresFornecedores.length;
                          somaValoresMedios += mediaValor;
                          
                          // Encontrar valor selecionado (vencedor) incluindo frete do item
                          const fornecedorVencedor = fornecedores.find(f => {
                            const cell = mapaFornecedorItens[f.id]?.[itemKey];
                            return cell && cell.is_vencedor === true;
                          });
                          
                          if (fornecedorVencedor) {
                            const cell = mapaFornecedorItens[fornecedorVencedor.id]?.[itemKey];
                            const valorItemSelecionado = cell ? valorItemCalculado(cell) : 0;
                            const freteItemSelecionado = cell?.valor_frete || 0;
                            const valorSelecionado = valorItemSelecionado + freteItemSelecionado;
                            somaValoresSelecionados += valorSelecionado;
                          }
                        }
                      });
                    
                    // Economia = Média - Selecionado (se positivo, houve economia)
                    return somaValoresMedios - somaValoresSelecionados;
                  })();

                  // Verificar se é decisão única ou distribuída
                  const isDecisaoUnica = fornecedoresVencedores.length === 1;
                  const isDecisaoDistribuida = fornecedoresVencedores.length > 1;

                  // Calcular decisão por item
                  const decisaoPorItem = itensAgrupados
                    .filter((item) => itensSelecionados.has(getItemKey(item)))
                    .map((item) => {
                      const itemKey = getItemKey(item);
                      
                      // Encontrar fornecedor vencedor para este item
                      const fornecedorVencedor = fornecedores.find(f => {
                        const cell = mapaFornecedorItens[f.id]?.[itemKey];
                        return cell && cell.is_vencedor === true;
                      });
                      
                      if (!fornecedorVencedor) return null;

                      const cell = mapaFornecedorItens[fornecedorVencedor.id]?.[itemKey];
                      const valorItemSelecionado = cell ? valorItemCalculado(cell) : 0;
                      const freteItemSelecionado = cell?.valor_frete || 0;
                      const valorSelecionado = valorItemSelecionado + freteItemSelecionado;

                      // Calcular Preço Negociado (valor unitário * quantidade, sem descontos, frete, imposto)
                      const precoNegociado = cell ? (cell.valor_unitario || 0) * (cell.quantidade_ofertada || 0) : 0;
                      
                      // Calcular descontos aplicados ao item
                      const descontoItem = cell ? (precoNegociado * ((cell.desconto_percentual || 0) / 100) + (cell.desconto_valor || 0)) : 0;
                      
                      // Calcular proporção de frete e imposto para este item
                      // Primeiro, calcular o subtotal parcial do fornecedor (itens vencedores, após descontos + frete do item)
                      const subtotalParcialFornecedor = itensAgrupados
                        .filter((i) => itensSelecionados.has(getItemKey(i)))
                        .reduce((sum, i) => {
                          const key = getItemKey(i);
                          const c = mapaFornecedorItens[fornecedorVencedor.id]?.[key];
                          if (c && c.is_vencedor) {
                            const valorItemC = valorItemCalculado(c);
                            const freteItemC = c.valor_frete || 0;
                            return sum + valorItemC + freteItemC;
                          }
                          return sum;
                        }, 0);
                      
                      // Usar o valor do item após descontos + frete do item para calcular a proporção
                      // Nota: freteItemSelecionado já foi declarado acima
                      const valorItemAposDescontosComFrete = precoNegociado - descontoItem + freteItemSelecionado;
                      const proporcaoItem = subtotalParcialFornecedor > 0 
                        ? valorItemAposDescontosComFrete / subtotalParcialFornecedor 
                        : 0;
                      
                      // Garantir que os valores sejam numéricos
                      const frete = typeof fornecedorVencedor.valor_frete === 'number' 
                        ? fornecedorVencedor.valor_frete 
                        : (fornecedorVencedor.valor_frete != null && fornecedorVencedor.valor_frete !== '' ? Number(fornecedorVencedor.valor_frete) : 0);
                      const imposto = typeof fornecedorVencedor.valor_imposto === 'number' 
                        ? fornecedorVencedor.valor_imposto 
                        : (fornecedorVencedor.valor_imposto != null && fornecedorVencedor.valor_imposto !== '' ? Number(fornecedorVencedor.valor_imposto) : 0);
                      const freteProporcional = frete * proporcaoItem;
                      const impostoProporcional = imposto * proporcaoItem;
                      
                      // Custos Adicionais = frete + imposto (proporcionais)
                      // Nota: descontos já estão aplicados no valorItemCalculado, então não entram aqui
                      const custosAdicionais = freteProporcional + impostoProporcional;

                      // Encontrar menor valor TOTAL (incluindo custos adicionais proporcionais) para este item
                      let menorValor: number | null = null;
                      let fornecedorMenorValor: typeof fornecedorVencedor | null = null;
                      
                      // Encontrar menor valor UNITÁRIO para este item (para badge de eficiência)
                      // IMPORTANTE: valor unitário NÃO inclui custos adicionais
                      let menorValorUnitario: number | null = null;
                      let fornecedorMenorValorUnitario: typeof fornecedorVencedor | null = null;
                      
                      fornecedores.filter(f => f.fornecedor_id).forEach((f) => {
                        const cellFornecedor = mapaFornecedorItens[f.id]?.[itemKey];
                        if (cellFornecedor) {
                          // Calcular valor do item (com descontos) + frete do item
                          const valorItem = valorItemCalculado(cellFornecedor);
                          const freteItem = cellFornecedor.valor_frete || 0;
                          const valorItemComFrete = valorItem + freteItem;
                          
                          // Calcular custos adicionais proporcionais para este fornecedor
                          const subtotalParcialFornecedorComparacao = itensAgrupados
                            .filter((i) => itensSelecionados.has(getItemKey(i)))
                            .reduce((sum, i) => {
                              const key = getItemKey(i);
                              const c = mapaFornecedorItens[f.id]?.[key];
                              if (c && c.is_vencedor) {
                                const valorItemC = valorItemCalculado(c);
                                const freteItemC = c.valor_frete || 0;
                                return sum + valorItemC + freteItemC;
                              }
                              return sum;
                            }, 0);
                          
                          const proporcaoItem = subtotalParcialFornecedorComparacao > 0 
                            ? valorItemComFrete / subtotalParcialFornecedorComparacao 
                            : 0;
                          
                          // Garantir que os valores sejam numéricos
                          const frete = typeof f.valor_frete === 'number' 
                            ? f.valor_frete 
                            : (f.valor_frete != null && f.valor_frete !== '' ? Number(f.valor_frete) : 0);
                          const imposto = typeof f.valor_imposto === 'number' 
                            ? f.valor_imposto 
                            : (f.valor_imposto != null && f.valor_imposto !== '' ? Number(f.valor_imposto) : 0);
                          const custosAdicionaisProporcionais = (frete + imposto) * proporcaoItem;
                          
                          // Valor total incluindo frete do item + custos adicionais proporcionais do fornecedor
                          const valorTotalComCustos = valorItemComFrete + custosAdicionaisProporcionais;
                          
                          // Comparar valor total com custos adicionais
                          if (valorTotalComCustos > 0 && (menorValor === null || valorTotalComCustos < menorValor)) {
                            menorValor = valorTotalComCustos;
                            fornecedorMenorValor = f;
                          }
                          
                          // Comparar valor unitário (SEM custos adicionais) para eficiência
                          const valorUnit = cellFornecedor.valor_unitario || 0;
                          if (valorUnit > 0 && (menorValorUnitario === null || valorUnit < menorValorUnitario)) {
                            menorValorUnitario = valorUnit;
                            fornecedorMenorValorUnitario = f;
                          }
                        }
                      });

                      // Comparar valor total incluindo frete do item + custos adicionais proporcionais
                      // Nota: valorSelecionado já inclui o frete do item, então não precisa adicionar novamente
                      const valorTotalSelecionadoComCustos = valorSelecionado + custosAdicionais;
                      const isMelhorPreco = menorValor !== null && Math.abs(valorTotalSelecionadoComCustos - menorValor) < 0.01;
                      const diferencaValor = menorValor !== null && !isMelhorPreco 
                        ? valorTotalSelecionadoComCustos - menorValor 
                        : 0;
                      
                      // Verificar se tem o menor valor unitário (Eficiência em Compras)
                      const valorUnitarioSelecionado = cell ? (cell.valor_unitario || 0) : 0;
                      const temEficienciaCompras = menorValorUnitario !== null && valorUnitarioSelecionado === menorValorUnitario;
                      
                      // Calcular economia na negociação (comparando valor total incluindo frete do item)
                      // Economia = Menor valor total - Valor selecionado total
                      // Se positivo = economia (escolhido é mais barato)
                      // Se negativo = gasto extra (escolhido é mais caro)
                      const economiaNegociacao = menorValor !== null && valorTotalSelecionadoComCustos > 0
                        ? menorValor - valorTotalSelecionadoComCustos
                        : 0;

                      const fornecedorDados = fornecedoresDadosMap.get(fornecedorVencedor.fornecedor_id);
                      const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                      const nomeFornecedor = partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';

                      // Buscar observações do fornecedor se não for melhor preço
                      const observacoesFornecedor = fornecedorVencedor.observacoes || '';

                      return {
                        item,
                        itemKey,
                        fornecedorVencedor,
                        nomeFornecedor,
                        valorSelecionado,
                        precoNegociado,
                        freteProporcional,
                        impostoProporcional,
                        custosAdicionais,
                        isMelhorPreco,
                        menorValor,
                        diferencaValor,
                        temEficienciaCompras,
                        economiaNegociacao,
                        observacoesFornecedor,
                      };
                    })
                    .filter(Boolean);
                  
                  // Calcular economia na negociação (soma de todas as economias por item)
                  const economiaNegociacaoTotal = decisaoPorItem.reduce((sum, decisao) => {
                    return sum + (decisao.economiaNegociacao || 0);
                  }, 0);

                  return (
                    <div className="space-y-4">
                      {/* 1️⃣ Cabeçalho de Decisão */}
                      <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PieChart className="h-5 w-5 text-primary" />
                      <div>
                                <CardTitle className="text-lg">Modelo de Decisão</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {isDecisaoUnica 
                                    ? 'Cotação selecionada para um único fornecedor'
                                    : isDecisaoDistribuida
                                    ? `Cotação distribuída por item (${fornecedoresVencedores.length} fornecedores ganhadores)`
                                    : 'Nenhuma decisão tomada ainda'
                          }
                        </p>
                      </div>
                      </div>
                            {fornecedorLider && (
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                  <Trophy className="h-4 w-4 text-yellow-600" />
                                  <span className="text-xs font-semibold text-muted-foreground">Fornecedor Líder</span>
                      </div>
                                <div className="font-bold text-lg">
                                  {(() => {
                                    const fornecedorDados = fornecedoresDadosMap.get(fornecedorLider.fornecedor.fornecedor_id);
                                    const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                    return partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${fornecedorLider.fornecedor.id.substring(0, 8)}`;
                                  })()}
                      </div>
                    </div>
                            )}
                          </div>
                        </CardHeader>
                        {isDecisaoDistribuida && (
                          <CardContent>
                            <Alert className="border-blue-200 bg-blue-50">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-900">
                                Esta cotação foi distribuída entre múltiplos fornecedores. Cada item foi selecionado para o fornecedor ganhador.
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        )}
                      </Card>

                      {/* 2️⃣ Impacto Financeiro por Fornecedor */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Impacto Financeiro por Fornecedor
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Valores selecionados e percentual de participação no total da cotação
                          </p>
                        </CardHeader>
                        <CardContent>
                          {fornecedoresVencedores.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhum fornecedor vencedor selecionado</p>
                              <p className="text-sm">Selecione os fornecedores vencedores na aba "Mapa Cotação"</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {fornecedoresVencedores
                                .sort((a, b) => b.totalSelecionado - a.totalSelecionado)
                                .map((f) => {
                                  const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor.fornecedor_id);
                            const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                  const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.fornecedor.id.substring(0, 8)}`;
                                  const isLider = fornecedorLider && fornecedorLider.fornecedor.id === f.fornecedor.id;
                                  const percentual = valorTotalCotacao > 0 
                                    ? (f.totalSelecionado / valorTotalCotacao) * 100 
                                    : 0;

                            return (
                              <div
                                      key={f.fornecedor.id}
                                      className={`p-4 border-2 rounded-lg ${
                                        isLider
                                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
                                          : 'border-muted bg-background'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            {isLider && <Trophy className="h-4 w-4 text-yellow-600" />}
                                            <span className="font-semibold text-sm">{displayName}</span>
                                </div>
                                          <div className="text-xs text-muted-foreground">
                                            {f.qtdItensVencedores} {f.qtdItensVencedores === 1 ? 'item' : 'itens'} selecionado{f.qtdItensVencedores > 1 ? 's' : ''}
                                  </div>
                                        </div>
                                        {isLider && (
                                          <Badge className="bg-yellow-600 text-white">Líder</Badge>
                                        )}
                                      </div>
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="text-xs text-muted-foreground mb-1">Total Selecionado</div>
                                        <div className="font-bold text-xl text-primary">
                                          R$ {f.totalSelecionado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                          {percentual.toFixed(1)}% do valor total da cotação
                                        </div>
                                </div>
                              </div>
                            );
                          })}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* 3️⃣ Decisão por Item */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Decisão por Item
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Detalhamento da seleção de cada item da cotação
                          </p>
                        </CardHeader>
                        <CardContent>
                          {decisaoPorItem.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhum item com fornecedor vencedor selecionado</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {decisaoPorItem.map((decisao) => (
                                <div
                                  key={decisao.itemKey}
                                  className={`p-4 border rounded-lg ${
                                    decisao.isMelhorPreco
                                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200'
                                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                      <div className="font-semibold text-sm mb-1">
                                        {decisao.item.material_nome}
                                      </div>
                                  <div className="text-xs text-muted-foreground">
                                        {decisao.item.material_codigo || '—'} • {decisao.item.quantidade_total.toLocaleString('pt-BR')} {decisao.item.unidade_medida}
                                  </div>
                                </div>
                                <div className="text-right">
                                      <div className="space-y-1 mb-2">
                                        {/* IMPORTANTE: Valor do item SEM custos adicionais - custos adicionais são do fornecedor, não do item */}
                                        <div className="text-xs text-muted-foreground">Preço Negociado</div>
                                        <div className="font-semibold text-base">
                                          R$ {decisao.valorSelecionado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                        {/* Custos adicionais são exibidos apenas como informação do fornecedor, NÃO fazem parte do valor do item */}
                                        {(decisao.freteProporcional > 0 || decisao.impostoProporcional > 0) && (
                                          <>
                                            <div className="text-xs text-muted-foreground mt-2">Custos Adicionais (Fornecedor)</div>
                                            {decisao.freteProporcional > 0 && (
                                              <div className="text-xs text-muted-foreground">
                                                Frete: <span className="font-semibold text-orange-600">R$ {decisao.freteProporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                              </div>
                                            )}
                                            {decisao.impostoProporcional > 0 && (
                                              <div className="text-xs text-muted-foreground">
                                                Imposto: <span className="font-semibold text-orange-600">R$ {decisao.impostoProporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                              </div>
                                            )}
                                            {decisao.custosAdicionais > 0 && (
                                              <div className="font-semibold text-sm text-orange-600 mt-1">
                                                Total: R$ {decisao.custosAdicionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                              </div>
                                            )}
                                            <div className="text-xs text-muted-foreground italic mt-1">
                                              (Não incluído no valor do item)
                                            </div>
                                          </>
                                        )}
                                        {/* NOTA: NÃO exibir campo "Total" aqui - o valor do item não inclui custos adicionais */}
                                      </div>
                                      <div className="flex flex-col gap-1 mt-2">
                                        {decisao.temEficienciaCompras && (
                                          <Badge className="bg-blue-600 text-white">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Eficiência em Compras
                                          </Badge>
                                        )}
                                        {decisao.isMelhorPreco ? (
                                          <Badge className="bg-green-600">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Melhor preço
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Não é menor preço
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-semibold text-muted-foreground">Fornecedor Ganhador:</span>
                                      <Badge className="bg-primary text-primary-foreground">
                                        {decisao.nomeFornecedor}
                                      </Badge>
                                    </div>
                                    
                                    {!decisao.isMelhorPreco && decisao.menorValor !== null && (
                                      <Alert className="bg-orange-100 border-orange-300">
                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-sm">
                                          <div className="font-semibold mb-1">
                                            Este item não foi selecionado pelo menor preço
                                          </div>
                                          <div className="text-xs space-y-1">
                                            <div>
                                              Menor preço disponível: <strong>R$ {decisao.menorValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div>
                                              Diferença: <strong>R$ {decisao.diferencaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                            </div>
                                            {decisao.observacoesFornecedor && (
                                              <div className="mt-2 pt-2 border-t border-orange-300">
                                                <strong>Justificativa:</strong> {decisao.observacoesFornecedor}
                                    </div>
                                  )}
                                </div>
                                        </AlertDescription>
                                      </Alert>
                                    )}
                              </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* 4️⃣ Observações da Decisão */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Observações da Decisão
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Justificativa geral para auditoria e aprovação
                          </p>
                        </CardHeader>
                        <CardContent>
                          {formData.observacoes_internas ? (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{formData.observacoes_internas}</p>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              Nenhuma observação registrada
                      </div>
                    )}
                  </CardContent>
                </Card>

                      {/* 5️⃣ Resumo Final */}
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                          <CardTitle>Resumo Final da Cotação</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Informações gerais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-muted-foreground text-xs">Tipo de Cotação</Label>
                                <p className="font-medium">{formData.tipo_cotacao}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Data Limite</Label>
                                <p className="font-medium">
                                  {formData.data_limite 
                                    ? new Date(formData.data_limite).toLocaleDateString('pt-BR')
                                    : '—'
                                  }
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Fornecedores Ganhadores</Label>
                                <p className="font-medium">{fornecedoresVencedores.length}</p>
                              </div>
                            </div>

                            {/* Detalhamento de valores */}
                            <div className="border-t pt-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label className="text-muted-foreground text-sm">Subtotal dos Itens</Label>
                                  <p className="font-medium text-sm">
                                    R$ {subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                
                                {freteTotal > 0 && (
                                  <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground text-sm">Frete</Label>
                                    <p className="font-medium text-sm text-blue-600">
                                      + R$ {freteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                
                                {impostoTotal > 0 && (
                                  <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground text-sm">Impostos</Label>
                                    <p className="font-medium text-sm text-blue-600">
                                      + R$ {impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                
                                {descontoTotal > 0 && (
                                  <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground text-sm">Desconto</Label>
                                    <p className="font-medium text-sm text-green-600">
                                      - R$ {descontoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Campos gerais da cotação */}
                                {(freteGeral > 0 || descontoPercentualGeral > 0 || descontoValorGeral > 0) && (
                                  <>
                                    <div className="border-t pt-2 mt-2">
                                      <Label className="text-muted-foreground text-xs font-semibold">Ajustes Gerais da Cotação</Label>
                                    </div>
                                    {freteGeral > 0 && (
                                      <div className="flex justify-between items-center">
                                        <Label className="text-muted-foreground text-sm">Frete Geral</Label>
                                        <p className="font-medium text-sm text-blue-600">
                                          + R$ {freteGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    )}
                                    {descontoPercentualGeral > 0 && (
                                      <div className="flex justify-between items-center">
                                        <Label className="text-muted-foreground text-sm">Desconto Geral ({descontoPercentualGeral}%)</Label>
                                        <p className="font-medium text-sm text-green-600">
                                          - R$ {(baseParaDescontoGeral * (descontoPercentualGeral / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    )}
                                    {descontoValorGeral > 0 && (
                                      <div className="flex justify-between items-center">
                                        <Label className="text-muted-foreground text-sm">Desconto Geral (R$)</Label>
                                        <p className="font-medium text-sm text-green-600">
                                          - R$ {descontoValorGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground text-sm font-semibold">Total Final</Label>
                                    <p className="font-bold text-lg text-primary">
                                      R$ {valorTotalCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Economia Estimada */}
                            <div className="border-t pt-4">
                              <Label className="text-muted-foreground text-xs">Economia Estimada</Label>
                              <p className={`font-bold text-lg mt-1 ${economiaEstimada >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {economiaEstimada >= 0 ? '+' : ''}R$ {economiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {economiaEstimada >= 0 
                                  ? 'Economia em relação à média das propostas'
                                  : 'Acima da média das propostas'
                                }
                              </p>
                              {economiaNegociacaoTotal !== 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">Economia gerada na negociação do item:</p>
                                  <p className={`font-semibold text-sm ${economiaNegociacaoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {economiaNegociacaoTotal >= 0 ? '+' : ''}R$ {economiaNegociacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Modal de Visualização de Imagem do Item */}
        {/* Modal de Histórico de Compras */}
        {itemHistoricoSelecionado && (
          <HistoricoComprasItemModal
            isOpen={historicoModalAberto}
            onClose={() => {
              setHistoricoModalAberto(false);
              setItemHistoricoSelecionado(null);
            }}
            item={itemHistoricoSelecionado}
          />
        )}

        {/* Modal de Imagem */}
        <Dialog open={imagemModalAberto} onOpenChange={setImagemModalAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {imagemSelecionada && (
              <>
                <DialogHeader>
                  <DialogTitle>{imagemSelecionada.nome}</DialogTitle>
                  <DialogDescription>
                    Foto do item para referência na cotação
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex items-center justify-center">
                  <img
                    src={imagemSelecionada.url}
                    alt={imagemSelecionada.nome}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-center py-8 text-muted-foreground';
                      errorDiv.textContent = 'Erro ao carregar imagem';
                      target.parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setImagemModalAberto(false)}
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Informações Adicionais do Fornecedor */}
        <Dialog open={fornecedorModalAberto} onOpenChange={setFornecedorModalAberto}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {fornecedorSelecionadoModal && (() => {
              const f = fornecedores.find(f => f.id === fornecedorSelecionadoModal);
              if (!f) return null;
              
              const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor_id);
              const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
              const displayName = partner?.nome_fantasia || partner?.razao_social || fornecedorDados?.contato_principal || `Fornecedor ${f.id.substring(0, 8)}`;
              
              // Calcular subtotal PARCIAL (apenas itens onde este fornecedor é vencedor)
              const subtotalParcial = itensAgrupados
                .filter((item) => itensSelecionados.has(getItemKey(item)))
                .reduce((sum, item) => {
                  const itemKey = getItemKey(item);
                  const cell = mapaFornecedorItens[f.id]?.[itemKey];
                  if (cell && cell.is_vencedor) {
                    return sum + valorItemCalculado(cell);
                  }
                  return sum;
                }, 0);

              // Calcular subtotal TOTAL (todos os itens cotados por este fornecedor)
              const subtotalTotal = itensAgrupados
                .filter((item) => itensSelecionados.has(getItemKey(item)))
                .reduce((sum, item) => {
                  const cell = mapaFornecedorItens[f.id]?.[getItemKey(item)];
                  return sum + (cell ? valorItemCalculado(cell) : 0);
                }, 0);

              const frete = f.valor_frete || 0;
              const imposto = f.valor_imposto || 0;
              const descontoPct = f.desconto_percentual || 0;
              const descontoValor = f.desconto_valor || 0;
              // Desconto aplicado apenas sobre o subtotal PARCIAL (itens vencedores)
              const descontoCalculado = subtotalParcial * (descontoPct / 100) + descontoValor;
              const total = subtotalParcial + frete + imposto - descontoCalculado;

              // Verificar se este fornecedor tem algum item vencedor que não é o de menor preço
              const fornecedoresValidosParaComparacao = fornecedores.filter(f => f.fornecedor_id);
              const temItemVencedorNaoMenor = itensAgrupados
                .filter((item) => itensSelecionados.has(getItemKey(item)))
                .some((item) => {
                  const itemKey = getItemKey(item);
                  const cell = mapaFornecedorItens[f.id]?.[itemKey];
                  if (!cell || !cell.is_vencedor) return false;
                  
                  // Calcular menor valor para este item
                  let menorValor: number | null = null;
                  fornecedoresValidosParaComparacao.forEach((forn) => {
                    const cellFornecedor = mapaFornecedorItens[forn.id]?.[itemKey];
                    if (cellFornecedor) {
                      const total = valorItemCalculado(cellFornecedor);
                      if (total > 0 && (menorValor === null || total < menorValor)) {
                        menorValor = total;
                      }
                    }
                  });
                  
                  const valorVencedor = valorItemCalculado(cell);
                  return menorValor !== null && valorVencedor > menorValor;
                });
              
              const isObrigatorio = temItemVencedorNaoMenor;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>Informações Adicionais - {displayName}</DialogTitle>
                    <DialogDescription>
                      Preencha as informações comerciais e financeiras para este fornecedor
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Frete */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Frete (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={frete}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            setFornecedores(fornecedores.map(forn => 
                              forn.id === f.id ? { ...forn, valor_frete: newValue } : forn
                            ));
                          }}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Imposto */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Imposto (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={imposto}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            setFornecedores(fornecedores.map(forn => 
                              forn.id === f.id ? { ...forn, valor_imposto: newValue } : forn
                            ));
                          }}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Desconto Percentual */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Desconto (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={descontoPct}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            setFornecedores(fornecedores.map(forn => 
                              forn.id === f.id ? { ...forn, desconto_percentual: newValue } : forn
                            ));
                          }}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Desconto Valor */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={descontoValor}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            setFornecedores(fornecedores.map(forn => 
                              forn.id === f.id ? { ...forn, desconto_valor: newValue } : forn
                            ));
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="pt-3 border-t">
                      <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Subtotal Parcial (Itens Vencedores):</div>
                        <div className="font-bold text-lg text-primary">R$ {subtotalParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-muted-foreground mt-2">Subtotal Total (Todos os Itens Cotados):</div>
                        <div className="font-semibold text-sm">R$ {subtotalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Subtotal Parcial:</span>
                          <div className="font-semibold">R$ {subtotalParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frete:</span>
                          <div className="font-semibold">R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Imposto:</span>
                          <div className="font-semibold">R$ {imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Desconto:</span>
                          <div className="font-semibold text-red-600">- R$ {descontoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="border-l pl-3">
                          <span className="text-muted-foreground">Total:</span>
                          <div className="font-bold text-lg">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    </div>

                    {/* Prazo e Condições */}
                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Prazo de Entrega (dias)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={f.prazo_entrega || 0}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              setFornecedores(fornecedores.map(forn => 
                                forn.id === f.id ? { ...forn, prazo_entrega: newValue } : forn
                              ));
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Condição de Pagamento (Legado)</Label>
                          <Input
                            value={f.condicao_pagamento || ''}
                            onChange={(e) => {
                              setFornecedores(fornecedores.map(forn => 
                                forn.id === f.id ? { ...forn, condicao_pagamento: e.target.value } : forn
                              ));
                            }}
                            placeholder="Ex: 30/60/90 dias"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* ✅ NOVO: Condições de Pagamento Estruturadas */}
                      <div className="space-y-3 pt-3 border-t">
                        <Label className="text-sm font-medium">Condições de Pagamento</Label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Forma de Pagamento */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                            <Select
                              value={f.forma_pagamento || ''}
                              onValueChange={(value) => {
                                setFornecedores(fornecedores.map(forn => 
                                  forn.id === f.id ? { ...forn, forma_pagamento: value } : forn
                                ));
                              }}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Selecione a forma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                <SelectItem value="À Vista">À Vista</SelectItem>
                                <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Parcelamento */}
                          <div className="flex items-end gap-2">
                            <div className="flex items-center space-x-2 pt-6">
                              <Checkbox
                                id={`parcelar-modal-${f.id}`}
                                checked={f.is_parcelada || false}
                                onCheckedChange={(checked) => {
                                  const isParcelada = checked === true;
                                  setFornecedores(fornecedores.map(forn => 
                                    forn.id === f.id ? { 
                                      ...forn, 
                                      is_parcelada: isParcelada,
                                      numero_parcelas: isParcelada ? (forn.numero_parcelas || 2) : 1
                                    } : forn
                                  ));
                                }}
                              />
                              <Label 
                                htmlFor={`parcelar-modal-${f.id}`}
                                className="text-xs font-normal cursor-pointer"
                              >
                                Parcelar
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Número de Parcelas e Intervalo (quando parcelado) */}
                        {f.is_parcelada && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Número de Parcelas</Label>
                              <Input
                                type="number"
                                min="2"
                                max="12"
                                value={f.numero_parcelas || 2}
                                onChange={(e) => {
                                  const newValue = Math.max(2, parseInt(e.target.value) || 2);
                                  setFornecedores(fornecedores.map(forn => 
                                    forn.id === f.id ? { ...forn, numero_parcelas: newValue } : forn
                                  ));
                                }}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Intervalo entre Parcelas</Label>
                              <Select
                                value={f.intervalo_parcelas || '30'}
                                onValueChange={(value) => {
                                  setFornecedores(fornecedores.map(forn => 
                                    forn.id === f.id ? { ...forn, intervalo_parcelas: value } : forn
                                  ));
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">30 dias</SelectItem>
                                  <SelectItem value="60">60 dias</SelectItem>
                                  <SelectItem value="90">90 dias</SelectItem>
                                  <SelectItem value="120">120 dias</SelectItem>
                                  <SelectItem value="150">150 dias</SelectItem>
                                  <SelectItem value="180">180 dias</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="pt-3">
                      <Label className={`text-xs ${isObrigatorio ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        Observações {isObrigatorio && '*'}
                      </Label>
                      {isObrigatorio && (
                        <p className="text-xs text-red-600 mb-1">
                          Obrigatório: este fornecedor foi selecionado como vencedor para item(ns) que não são o menor preço
                        </p>
                      )}
                      <Textarea
                        value={f.observacoes || ''}
                        onChange={(e) => {
                          setFornecedores(fornecedores.map(forn => 
                            forn.id === f.id ? { ...forn, observacoes: e.target.value } : forn
                          ));
                        }}
                        placeholder={
                          isObrigatorio 
                            ? "Justifique por que este fornecedor foi escolhido mesmo não sendo o menor preço..."
                            : "Observações sobre esta cotação..."
                        }
                        className={`text-sm min-h-[80px] mt-1 ${isObrigatorio ? 'border-red-300 focus:border-red-500' : ''}`}
                        required={isObrigatorio}
                      />
                    </div>

                    {/* Anexos */}
                    <div className="pt-3 border-t">
                      <Label className="text-xs text-muted-foreground mb-2 block">Anexos</Label>
                      <div className="space-y-2">
                        {/* Lista de anexos existentes */}
                        {anexosPorFornecedor[f.id]?.map((anexo) => (
                          <div key={anexo.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a
                                href={anexo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                                title={anexo.file_name}
                              >
                                {anexo.file_name}
                              </a>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={async () => {
                                try {
                                  // Remover do storage
                                  const { error: deleteError } = await supabase.storage
                                    .from('cotacao-anexos')
                                    .remove([anexo.storage_path]);
                                  
                                  if (deleteError) throw deleteError;
                                  
                                  // Remover do estado
                                  setAnexosPorFornecedor(prev => ({
                                    ...prev,
                                    [f.id]: prev[f.id]?.filter(a => a.id !== anexo.id) || []
                                  }));
                                  
                                  toast({
                                    title: 'Anexo removido',
                                    description: 'O anexo foi removido com sucesso.',
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: 'Erro ao remover anexo',
                                    description: error.message || 'Não foi possível remover o anexo.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Botão de upload */}
                        <div className="relative">
                          <input
                            type="file"
                            id={`anexo-modal-${f.id}`}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !selectedCompany?.id) return;
                              
                              // Validar tamanho (10MB)
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: 'Arquivo muito grande',
                                  description: 'O arquivo deve ter no máximo 10MB.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              
                              setUploadingFornecedor(f.id);
                              
                              try {
                                // Sanitizar nome do arquivo
                                const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                                const timestamp = Date.now();
                                const fileName = `${timestamp}_${sanitizedName}`;
                                
                                // Estrutura: {company_id}/{cotacao_id}/{fornecedor_id}/{filename}
                                // Como ainda não temos cotacao_id, usamos temporário
                                const filePath = `${selectedCompany.id}/temp/${f.id}/${fileName}`;
                                
                                // Upload do arquivo
                                const { data: uploadData, error: uploadError } = await supabase.storage
                                  .from('cotacao-anexos')
                                  .upload(filePath, file, {
                                    cacheControl: '3600',
                                    upsert: false
                                  });
                                
                                if (uploadError) throw uploadError;
                                
                                // Obter URL do arquivo (signed URL para bucket privado)
                                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                  .from('cotacao-anexos')
                                  .createSignedUrl(filePath, 3600 * 24 * 365); // 1 ano
                                
                                let fileUrl = '';
                                if (signedUrlError || !signedUrlData) {
                                  const { data: publicUrlData } = supabase.storage
                                    .from('cotacao-anexos')
                                    .getPublicUrl(filePath);
                                  fileUrl = publicUrlData.publicUrl;
                                } else {
                                  fileUrl = signedUrlData.signedUrl;
                                }
                                
                                // Adicionar ao estado
                                const novoAnexo = {
                                  id: `${Date.now()}-${Math.random()}`,
                                  file_name: file.name,
                                  storage_path: filePath,
                                  url: fileUrl,
                                  mime_type: file.type,
                                  size_bytes: file.size
                                };
                                
                                setAnexosPorFornecedor(prev => ({
                                  ...prev,
                                  [f.id]: [...(prev[f.id] || []), novoAnexo]
                                }));
                                
                                toast({
                                  title: 'Anexo enviado',
                                  description: 'O arquivo foi anexado com sucesso.',
                                });
                                
                              } catch (error: any) {
                                console.error('Erro no upload:', error);
                                toast({
                                  title: 'Erro no upload',
                                  description: error.message || 'Não foi possível fazer upload do arquivo.',
                                  variant: 'destructive',
                                });
                              } finally {
                                setUploadingFornecedor(null);
                                // Limpar input
                                e.target.value = '';
                              }
                            }}
                            disabled={uploadingFornecedor === f.id}
                          />
                          <label htmlFor={`anexo-modal-${f.id}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled={uploadingFornecedor === f.id}
                              asChild
                            >
                              <span className="flex items-center justify-center gap-2 cursor-pointer">
                                {uploadingFornecedor === f.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Paperclip className="h-3 w-3" />
                                    Anexar arquivo
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setFornecedorModalAberto(false)}
                    >
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {readOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!readOnly && (
            <>
              <Button
                variant="outline"
                onClick={handleSalvarRascunho}
                disabled={submitting}
              >
                {cotacaoId ? 'Atualizar Rascunho' : 'Salvar como Rascunho'}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        onClick={handleEnviarAprovacao}
                        disabled={loading || submitting || !podeEnviarAprovacao}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {cotacaoId ? 'Atualizar e Enviar para Aprovação' : 'Enviar para Aprovação'}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!podeEnviarAprovacao && !loading && !submitting && (
                    <TooltipContent>
                      <div className="max-w-xs">
                        {!fornecedoresOk ? (
                          <p>Selecione {isEmergencial ? '1' : 'entre 2 e 6'} fornecedor(es) conforme o tipo de cotação</p>
                        ) : !validarFornecedoresComValores ? (
                          <p>Cada fornecedor deve ter pelo menos um item com valor preenchido no mapa de cotação</p>
                        ) : itensSelecionados.size === 0 ? (
                          <p>Selecione pelo menos um item</p>
                        ) : (
                          <p>Preencha todos os requisitos para enviar</p>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Modal de Frete e Descontos do Item */}
      <Dialog 
        open={modalItemDetalhes !== null} 
        onOpenChange={(open) => {
          if (!open) setModalItemDetalhes(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Item</DialogTitle>
            <DialogDescription>
              {modalItemDetalhes && (
                <>
                  Configure frete e descontos para o item: <strong>{modalItemDetalhes.item.material_nome}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {modalItemDetalhes && (() => {
            const cell = mapaFornecedorItens[modalItemDetalhes.fornecedorId]?.[modalItemDetalhes.itemKey];
            return (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="frete-item">Frete do Item (R$)</Label>
                  <Input
                    id="frete-item"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cell?.valor_frete ?? ''}
                    onChange={(e) => {
                      handleUpdateMapaValor(
                        modalItemDetalhes.fornecedorId,
                        modalItemDetalhes.item,
                        'valor_frete',
                        parseFloat(e.target.value) || 0
                      );
                    }}
                    placeholder="0,00"
                    disabled={readOnly}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="desconto-percentual">Desconto Percentual (%)</Label>
                  <Input
                    id="desconto-percentual"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cell?.desconto_percentual ?? ''}
                    onChange={(e) => {
                      handleUpdateMapaValor(
                        modalItemDetalhes.fornecedorId,
                        modalItemDetalhes.item,
                        'desconto_percentual',
                        parseFloat(e.target.value) || 0
                      );
                    }}
                    placeholder="0,00"
                    disabled={readOnly}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="desconto-valor">Desconto em Valor (R$)</Label>
                  <Input
                    id="desconto-valor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cell?.desconto_valor ?? ''}
                    onChange={(e) => {
                      handleUpdateMapaValor(
                        modalItemDetalhes.fornecedorId,
                        modalItemDetalhes.item,
                        'desconto_valor',
                        parseFloat(e.target.value) || 0
                      );
                    }}
                    placeholder="0,00"
                    disabled={readOnly}
                  />
                </div>

                {/* Exibir resumo do cálculo */}
                {cell && (cell.valor_unitario || cell.valor_frete || cell.desconto_percentual || cell.desconto_valor) && (
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <div className="text-sm font-medium">Resumo do Cálculo:</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Valor Bruto:</span>
                        <span>R$ {((cell.quantidade_ofertada || 0) * (cell.valor_unitario || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {cell.desconto_percentual > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Desconto ({cell.desconto_percentual}%):</span>
                          <span>- R$ {(((cell.quantidade_ofertada || 0) * (cell.valor_unitario || 0)) * (cell.desconto_percentual / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {cell.desconto_valor > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Desconto (R$):</span>
                          <span>- R$ {cell.desconto_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium">
                        <span>Valor do Item:</span>
                        <span>R$ {valorItemCalculado(cell).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {cell.valor_frete > 0 && (
                        <div className="flex justify-between">
                          <span>Frete:</span>
                          <span>+ R$ {cell.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-primary border-t pt-1 mt-1">
                        <span>Total:</span>
                        <span>R$ {(valorItemCalculado(cell) + (cell.valor_frete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setModalItemDetalhes(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}






