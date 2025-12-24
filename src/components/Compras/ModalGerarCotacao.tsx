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
  Info
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';
import { useStartQuoteCycle } from '@/hooks/compras/useComprasData';
import { useActivePartners } from '@/hooks/usePartners';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ModalGerarCotacaoProps {
  isOpen: boolean;
  onClose: () => void;
  requisicoesIds: string[];
}

interface RequisicaoData {
  id: string;
  numero_requisicao: string;
  centro_custo_id?: string;
  projeto_id?: string;
  tipo_requisicao?: string;
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
}

interface ItemAgrupado {
  material_id: string;
  material_nome: string;
  material_codigo: string;
  unidade_medida: string;
  quantidade_total: number;
  origem: string[]; // Array de números de requisição
  tipo_requisicao: string; // Tipo da requisição (reposicao, compra_direta, emergencial)
  selecionado: boolean;
  itens_origem: RequisicaoItem[];
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
  condicao_pagamento?: string;
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
  valor_unitario: number;
  valor_total: number;
}

type ItemFornecedorValor = {
  quantidade_ofertada: number;
  valor_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
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

export function ModalGerarCotacao({ isOpen, onClose, requisicoesIds }: ModalGerarCotacaoProps) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const startQuoteCycleMutation = useStartQuoteCycle();
  const { data: partnersData } = useActivePartners();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { users } = useUsers();
 
  // loading: carregando dados iniciais do modal
  const [loading, setLoading] = useState(false);
  // submitting: envio da cotação para aprovação
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  
  // Dados da cotação
  const [formData, setFormData] = useState({
    tipo_cotacao: 'reposicao',
    data_cotacao: new Date().toISOString().split('T')[0],
    data_limite: '',
    observacoes_internas: '',
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
  const [buscaFornecedor, setBuscaFornecedor] = useState<string>('');

  // Mapa item x fornecedor (dados do mapa de cotação)
  // Chave: material_id + tipo_requisicao (para diferenciar o mesmo material em tipos diferentes)
  const [mapaFornecedorItens, setMapaFornecedorItens] = useState<MapaFornecedorItens>({});

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
          porFornecedor.set(f.id, (porFornecedor.get(f.id) || 0) + total);

          const atual = porItem.get(item.material_id);
          if (!atual || total < atual.melhor) {
            porItem.set(item.material_id, { melhor: total, fornecedorId: f.id });
          }
        });
      });

    // Agora calcular totais finais incluindo frete, imposto e desconto
    const totaisFinais = new Map<string, number>();
    porFornecedor.forEach((subtotal, fid) => {
      const fornecedor = fornecedores.find(f => f.id === fid);
      if (!fornecedor) {
        totaisFinais.set(fid, subtotal);
        return;
      }

      const frete = fornecedor.valor_frete || 0;
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

  // Criar string estável a partir de requisicoesIds para usar como dependência
  const requisicoesIdsKey = useMemo(() => {
    return requisicoesIds.sort().join(',');
  }, [requisicoesIds]);

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

  // Carregar dados iniciais
  useEffect(() => {
    if (!isOpen || !selectedCompany?.id || requisicoesIds.length === 0) {
      // Resetar dados quando modal fechar
      if (!isOpen) {
        setRequisicoes([]);
        setItensAgrupados([]);
        setItensSelecionados(new Set());
        setFornecedores([]);
        setRateio([]);
        setLoadedRequisicoesIdsKey('');
      }
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

          const itensRaw = itensResult.data || [];

          // Coletar todos os IDs de materiais únicos
          const materialIds = [...new Set(itensRaw.map((item: any) => item.material_id).filter(Boolean))];
          
          // Buscar todos os materiais de uma vez
          const materiaisMap = new Map<string, any>();
          if (materialIds.length > 0) {
            try {
              const materiaisResult = await EntityService.list({
                schema: 'almoxarifado',
                table: 'materiais_equipamentos',
                companyId: selectedCompany.id,
                filters: {},
                page: 1,
                pageSize: 1000,
              });

              // Criar mapa de materiais por ID
              if (materiaisResult.data) {
                materiaisResult.data.forEach((material: any) => {
                  const materialIdStr = String(material.id);
                  if (materialIds.includes(material.id) || materialIds.some(id => String(id) === materialIdStr)) {
                    materiaisMap.set(materialIdStr, material);
                  }
                });
              }
            } catch (error) {
              console.error('Erro ao buscar materiais:', error);
            }
          }

          // Mapear itens com dados dos materiais
          const itens = itensRaw.map((item: any) => {
            const materialIdStr = String(item.material_id);
            const material = materiaisMap.get(materialIdStr);
            
            return {
              ...item,
              requisicao_numero: requisicao.numero_requisicao,
              material_nome: material?.nome || material?.descricao || item.material_nome || 'Material não encontrado',
              material_codigo: material?.codigo_interno || material?.codigo || item.material_codigo || '',
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
              });
            }
            const agrupado = itensMap.get(key)!;
            // Soma a quantidade do item atual à quantidade total do material agrupado
            agrupado.quantidade_total += Number(item.quantidade) || 0;
            if (!agrupado.origem.includes(req.numero_requisicao)) {
              agrupado.origem.push(req.numero_requisicao);
            }
            agrupado.itens_origem.push(item);
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
        ) as Array<'reposicao' | 'compra_direta' | 'emergencial'>;

        let tipoCotacao: 'reposicao' | 'compra_direta' | 'emergencial' = 'reposicao';

        if (tiposRequisicao.length === 1) {
          // Todas as requisições têm o mesmo tipo
          tipoCotacao = tiposRequisicao[0];
        } else if (tiposRequisicao.includes('emergencial')) {
          // Se houver qualquer requisição emergencial, priorizar esse tipo
          tipoCotacao = 'emergencial';
        } else if (tiposRequisicao.includes('compra_direta')) {
          // Caso misto entre reposição e compra direta, priorizar compra direta
          tipoCotacao = 'compra_direta';
        }

        setFormData(prev => ({
          ...prev,
          tipo_cotacao: tipoCotacao,
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

    itensSelecionadosArray.forEach((itemAgrupado) => {
      const itemKey = getItemKey(itemAgrupado);

      // SEMPRE usar o fornecedor vencedor selecionado pelo comprador
      const fornecedorVencedor = fornecedores.find((f) => {
          const cell = mapaFornecedorItens[f.id]?.[itemKey];
        return cell && cell.is_vencedor === true;
      });

      // Se não houver vencedor selecionado, pular este item (não deveria acontecer devido à validação)
      if (!fornecedorVencedor) {
        console.warn(`Item ${itemAgrupado.material_nome} não tem fornecedor vencedor selecionado`);
            return;
          }

      const melhorFornecedorId = fornecedorVencedor.id;
      const cellSelecionada = mapaFornecedorItens[melhorFornecedorId]?.[itemKey];
      if (!cellSelecionada) return;

      const quantidadeUsada = Math.min(
        cellSelecionada.quantidade_ofertada || 0,
        itemAgrupado.quantidade_total
      );
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
      const valorTotal = quantidadeUsada * Math.max(0, valorUnitarioEfetivo);

      itemAgrupado.itens_origem.forEach((item) => {
        const requisicao = requisicoes.find(r => r.id === item.requisicao_id);
        if (!requisicao) return;

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
          valor_unitario: Math.max(0, valorUnitarioEfetivo),
          valor_total: (item.quantidade || 0) * Math.max(0, valorUnitarioEfetivo),
        });
      });
    });

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
    if (formData.tipo_cotacao === 'emergencial' && fornecedores.length >= 1) {
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
          value = novoFornecedorDados.id;
          
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

  const handleSalvarRascunho = async () => {
    // TODO: Implementar salvamento como rascunho
    toast({
      title: "Sucesso",
      description: "Cotação salva como rascunho.",
    });
  };

  const handleEnviarAprovacao = async () => {
    // Validações
    if (formData.tipo_cotacao === 'emergencial' && fornecedores.length !== 1) {
      toast({
        title: "Erro",
        description: "Cotações emergenciais devem ter exatamente 1 fornecedor.",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipo_cotacao !== 'emergencial' && fornecedores.length < 2) {
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
      fornecedoresComId.forEach((f) => {
        const cell = mapaFornecedorItens[f.id]?.[itemKey];
        if (cell && cell.quantidade_ofertada > 0 && cell.valor_unitario > 0) {
          temFornecedor = true;
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
      const fornecedoresData = fornecedores.map((f) => ({
        fornecedor_id: f.fornecedor_id,
        prazo_entrega: 0,
        condicoes_comerciais: '',
      }));

      const cicloResponse: any = await startQuoteCycleMutation.mutateAsync({
        requisicao_id: requisicoesIds[0], // Por enquanto, usar primeira requisição
        fornecedores: fornecedoresData,
        prazo_resposta: formData.data_limite.trim(),
        observacoes: formData.observacoes_internas?.trim() || null,
      });

      const fornecedoresCriados = cicloResponse?.fornecedores || [];
      const cicloId = cicloResponse?.ciclo?.id || cicloResponse?.id;

      const mapFornecedorParaCotacao = new Map<string, string>();
      fornecedores.forEach((f, idx) => {
        const created = fornecedoresCriados[idx];
        if (created?.id) {
          mapFornecedorParaCotacao.set(f.id, created.id);
        }
      });

      // Montar inserts item x fornecedor
      const inserts: Promise<any>[] = [];
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

            // Aplicar para cada item de origem (requisicao_item_id)
            item.itens_origem.forEach((origem) => {
              inserts.push(
                EntityService.create({
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
                    prazo_entrega_dias: valorMapa.prazo_entrega_dias || null,
                    condicao_pagamento: valorMapa.condicao_pagamento || null,
                    observacoes: valorMapa.observacoes || null,
                    status: 'cotado',
                    is_vencedor: valorMapa.is_vencedor || false,
                  },
                })
              );
            });
          });
      });

      if (inserts.length > 0) {
        await Promise.all(inserts);
      }

      // Atualizar workflow_state de todas as requisições selecionadas para 'em_cotacao'
      // A primeira já foi atualizada pelo startQuoteCycle, mas as outras também precisam ser atualizadas
      const updatePromises = requisicoesIds.map(async (reqId) => {
        try {
          // Buscar o estado atual da requisição
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            companyId: selectedCompany!.id,
            id: reqId,
          });

          const currentState = (requisicao as any)?.workflow_state;
          
          // Se já está em 'em_cotacao', não precisa atualizar
          if (currentState !== 'em_cotacao') {
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
          }
        } catch (error) {
          // Log do erro mas não interrompe o processo
          console.error(`Erro ao atualizar requisição ${reqId}:`, error);
        }
      });

      await Promise.all(updatePromises);

      toast({
        title: "Sucesso",
        description: "Cotação enviada para aprovação com mapa por item/fornecedor.",
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

  const isEmergencial = formData.tipo_cotacao === 'emergencial';
  const minFornecedores = isEmergencial ? 1 : 2;

  // Função para obter badge do tipo de requisição
  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'emergencial':
        return <Badge variant="outline" className="text-orange-600 bg-orange-50 text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Emergencial
        </Badge>;
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
    const tipoPrincipal = tipos.includes('emergencial') 
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
            Gerar Cotação
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
                        // Se emergencial, limitar a 1 fornecedor
                        if (value === 'emergencial' && fornecedores.length > 1) {
                          setFornecedores(fornecedores.slice(0, 1));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reposicao">Reposição</SelectItem>
                        <SelectItem value="compra_direta">Compra Direta</SelectItem>
                        <SelectItem value="emergencial">
                          <div className="flex items-center">
                            <Zap className="h-4 w-4 mr-2 text-orange-500" />
                            Emergencial
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isEmergencial && (
                      <p className="text-xs text-muted-foreground">
                        Cotações emergenciais permitem apenas 1 fornecedor
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Data da Cotação *</Label>
                    <Input
                      type="date"
                      value={formData.data_cotacao}
                      onChange={(e) => setFormData({ ...formData, data_cotacao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Limite de Resposta *</Label>
                    <Input
                      type="date"
                      value={formData.data_limite}
                      onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                      min={formData.data_cotacao}
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
                  />
                </div>

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
                        <Button
                          onClick={handleAddFornecedor}
                          disabled={isEmergencial ? fornecedores.length >= 1 : fornecedores.length >= 6}
                          size="sm"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Adicionar Fornecedor
                        </Button>
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
                                        disabled={isBlocked}
                                        onCheckedChange={(checked) => {
                                          if (!checked) {
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
                                            onValueChange={(value) => 
                                              handleUpdateFornecedor(fornecedor.id, 'fornecedor_id', value)
                                            }
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
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveFornecedor(fornecedor.id)}
                                          disabled={isEmergencial && fornecedores.length === 1}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
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
                    <div className="flex items-center space-x-4">
                      <Label className="text-lg font-semibold">Mapa de Cotação - Comparativo de Valores</Label>
                      <Badge variant="secondary">{itensSelecionados.size} itens selecionados</Badge>
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
                                            if (temValoresPreenchidos) {
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
                                  const total = valorItemCalculado(cell);
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
                                      const valorTotal = cell ? valorItemCalculado(cell) : 0;

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
                                                onChange={(e) =>
                                                  handleUpdateMapaValor(
                                                    f.id,
                                                    item,
                                                    'valor_unitario',
                                                    parseFloat(e.target.value) || 0
                                                  )
                                                }
                                                placeholder="0,00"
                                                className="h-8 text-xs text-center"
                                              />
                                            </div>
                                            {/* Quantidade */}
                                            <div>
                                              <Input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                value={cell?.quantidade_ofertada ?? item.quantidade_total}
                                                onChange={(e) =>
                                                  handleUpdateMapaValor(
                                                    f.id,
                                                    item,
                                                    'quantidade_ofertada',
                                                    parseFloat(e.target.value) || 0
                                                  )
                                                }
                                                placeholder="0"
                                                className="h-8 text-xs text-center"
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
                                                          disabled={isOutroVencedor && !isEsteVencedor}
                                                          onCheckedChange={(checked) => {
                                                            if (!isOutroVencedor || checked) {
                                                              handleSelectVencedor(f.id, item, checked as boolean);
                                                            }
                                                          }}
                                                        />
                                                        <Label
                                                          htmlFor={`vencedor-${itemKey}-${f.id}`}
                                                          className={`text-xs ${
                                                            isOutroVencedor && !isEsteVencedor
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
                                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
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
                                    <Label className="text-xs text-muted-foreground">Condição de Pagamento</Label>
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
                                          className={`text-sm min-h-[60px] ${isObrigatorio ? 'border-red-300 focus:border-red-500' : ''}`}
                                          required={isObrigatorio}
                                        />
                                      </>
                                    );
                                  })()}
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
                                <TableHead>Valor Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.requisicao_id))).map((reqId) => {
                                const items = rateio.filter(r => r.requisicao_id === reqId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + item.valor_total, 0);
                                return (
                                  <TableRow key={reqId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.requisicao_numero || reqId.substring(0, 8)}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                <TableHead>Valor Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.centro_custo_id).filter(Boolean))).map((ccId) => {
                                const items = rateio.filter(r => r.centro_custo_id === ccId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + item.valor_total, 0);
                                return (
                                  <TableRow key={ccId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.centro_custo_nome || '—'}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                <TableHead>Valor Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from(new Set(rateio.map(r => r.projeto_id).filter(Boolean))).map((projId) => {
                                const items = rateio.filter(r => r.projeto_id === projId);
                                const totalQtd = items.reduce((sum, item) => sum + item.quantidade, 0);
                                const totalValor = items.reduce((sum, item) => sum + item.valor_total, 0);
                                return (
                                  <TableRow key={projId}>
                                    <TableCell className="font-medium">
                                      {items[0]?.projeto_nome || '—'}
                                    </TableCell>
                                    <TableCell>{totalQtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                      R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      const totalAdjudicado = subtotalParcial + frete + imposto - descontoCalculado;

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
                        totalAdjudicado,
                        qtdItensVencedores,
                      };
                    })
                    .filter(f => f.qtdItensVencedores > 0);

                  // Encontrar fornecedor líder (maior valor total adjudicado)
                  const fornecedorLider = fornecedoresVencedores.length > 0
                    ? fornecedoresVencedores.reduce((lider, atual) => 
                        atual.totalAdjudicado > lider.totalAdjudicado ? atual : lider
                      )
                    : null;

                  // Calcular valor total da cotação
                  const valorTotalCotacao = fornecedoresVencedores.reduce((sum, f) => sum + f.totalAdjudicado, 0);

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
                      const valorAdjudicado = cell ? valorItemCalculado(cell) : 0;

                      // Encontrar menor valor para este item
                      let menorValor: number | null = null;
                      let fornecedorMenorValor: typeof fornecedorVencedor | null = null;
                      
                      fornecedores.filter(f => f.fornecedor_id).forEach((f) => {
                        const cellFornecedor = mapaFornecedorItens[f.id]?.[itemKey];
                        if (cellFornecedor) {
                          const total = valorItemCalculado(cellFornecedor);
                          if (total > 0 && (menorValor === null || total < menorValor)) {
                            menorValor = total;
                            fornecedorMenorValor = f;
                          }
                        }
                      });

                      const isMelhorPreco = menorValor !== null && valorAdjudicado === menorValor;
                      const diferencaValor = menorValor !== null && !isMelhorPreco 
                        ? valorAdjudicado - menorValor 
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
                        valorAdjudicado,
                        isMelhorPreco,
                        menorValor,
                        diferencaValor,
                        observacoesFornecedor,
                      };
                    })
                    .filter(Boolean);

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
                                    ? 'Cotação adjudicada a um único fornecedor'
                                    : isDecisaoDistribuida
                                    ? `Cotação distribuída por item (${fornecedoresVencedores.length} fornecedores vencedores)`
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
                                    const fornecedorDados = fornecedoresDadosMap.get(fornecedorLider.fornecedor.id);
                                    const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                    return partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';
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
                                Esta cotação foi distribuída entre múltiplos fornecedores. Cada item foi adjudicado ao fornecedor selecionado como vencedor.
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
                            Valores adjudicados e percentual de participação no total da cotação
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
                                .sort((a, b) => b.totalAdjudicado - a.totalAdjudicado)
                                .map((f) => {
                                  const fornecedorDados = fornecedoresDadosMap.get(f.fornecedor.id);
                            const partner = fornecedorDados?.partner_id ? partnersMap.get(fornecedorDados.partner_id) : null;
                                  const displayName = partner?.nome_fantasia || partner?.razao_social || 'Fornecedor';
                                  const isLider = fornecedorLider && fornecedorLider.fornecedor.id === f.fornecedor.id;
                                  const percentual = valorTotalCotacao > 0 
                                    ? (f.totalAdjudicado / valorTotalCotacao) * 100 
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
                                            {f.qtdItensVencedores} {f.qtdItensVencedores === 1 ? 'item' : 'itens'} adjudicado{f.qtdItensVencedores > 1 ? 's' : ''}
                                  </div>
                                        </div>
                                        {isLider && (
                                          <Badge className="bg-yellow-600 text-white">Líder</Badge>
                                        )}
                                      </div>
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="text-xs text-muted-foreground mb-1">Total Adjudicado</div>
                                        <div className="font-bold text-xl text-primary">
                                          R$ {f.totalAdjudicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            Detalhamento da adjudicação de cada item da cotação
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
                                      <div className="font-bold text-lg">
                                        R$ {decisao.valorAdjudicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                      {decisao.isMelhorPreco ? (
                                        <Badge className="mt-1 bg-green-600">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Melhor preço
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="mt-1">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Não é menor preço
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                                      Fornecedor Vencedor: {decisao.nomeFornecedor}
                                    </div>
                                    
                                    {!decisao.isMelhorPreco && decisao.menorValor !== null && (
                                      <Alert className="bg-orange-100 border-orange-300">
                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-sm">
                                          <div className="font-semibold mb-1">
                                            Este item não foi adjudicado ao menor preço
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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                              <Label className="text-muted-foreground text-xs">Total Adjudicado</Label>
                              <p className="font-bold text-lg text-primary">
                                R$ {valorTotalCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">Fornecedores Vencedores</Label>
                              <p className="font-medium">{fornecedoresVencedores.length}</p>
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
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
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
                        <Label className="text-xs text-muted-foreground">Condição de Pagamento</Label>
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
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleSalvarRascunho}
            disabled={submitting}
          >
            Salvar como Rascunho
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
                Enviar para Aprovação
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






