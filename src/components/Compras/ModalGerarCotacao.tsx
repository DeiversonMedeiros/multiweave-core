import React, { useState, useEffect, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';
import { useStartQuoteCycle } from '@/hooks/compras/useComprasData';
import { useActivePartners } from '@/hooks/usePartners';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    let melhorFornecedorId: string | undefined;
    let melhorTotal = Number.POSITIVE_INFINITY;
    porFornecedor.forEach((total, fid) => {
      if (total < melhorTotal) {
        melhorTotal = total;
        melhorFornecedorId = fid;
      }
    });

    return {
      porFornecedor,
      porItem,
      melhorFornecedorId,
      melhorTotal: Number.isFinite(melhorTotal) ? melhorTotal : 0,
      totalItens: Array.from(porFornecedor.values()).reduce((a, b) => a + b, 0),
    };
  }, [fornecedores, itensAgrupados, itensSelecionados, mapaFornecedorItens]);
  
  // Rateio
  const [rateio, setRateio] = useState<RateioItem[]>([]);

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
        const fornecedoresResult = await EntityService.list({
          schema: 'compras',
          table: 'fornecedores_dados',
          companyId: selectedCompany.id,
          filters: { status: 'ativo' },
          page: 1,
          pageSize: 100,
        });
        setFornecedoresDisponiveis(fornecedoresResult.data || []);

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
      itensSelecionados.has(i.material_id)
    );

    itensSelecionadosArray.forEach((itemAgrupado) => {
      const itemKey = getItemKey(itemAgrupado);
      // escolher fornecedor vencedor ou o de menor valor total
      const melhorFornecedorId = (() => {
        let chosen: string | null = null;
        let best = Number.POSITIVE_INFINITY;

        fornecedores.forEach((f) => {
          const cell = mapaFornecedorItens[f.id]?.[itemKey];
          if (!cell) return;
          if (cell.is_vencedor) {
            chosen = f.id;
            best = valorItemCalculado(cell);
            return;
          }
          const total = valorItemCalculado(cell);
          if (total > 0 && total < best) {
            best = total;
            chosen = f.id;
          }
        });

        return chosen;
      })();

      if (!melhorFornecedorId) return;

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

  const handleUpdateFornecedor = (id: string, field: keyof FornecedorCotacao, value: any) => {
    setFornecedores(fornecedores.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
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

    // Validação de mapa por item
    const itensSelecionadosArray = itensAgrupados.filter((i) => itensSelecionados.has(getItemKey(i)));
    for (const item of itensSelecionadosArray) {
      let cobertura = 0;
      let temFornecedor = false;
      const itemKey = getItemKey(item);
      fornecedores.forEach((f) => {
        const cell = mapaFornecedorItens[f.id]?.[itemKey];
        if (cell && cell.quantidade_ofertada > 0 && cell.valor_unitario > 0) {
          temFornecedor = true;
          cobertura += cell.quantidade_ofertada;
        }
      });

      if (!temFornecedor) {
        toast({
          title: "Erro",
          description: `Item ${item.material_nome} sem nenhuma oferta de fornecedor.`,
          variant: "destructive",
        });
        return;
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

  // Calcular contexto da seleção para o header dinâmico
  const contextoSelecao = useMemo(() => {
    if (requisicoes.length === 0) {
      return {
        tipoCompra: '',
        totalRequisicoes: 0,
        totalItens: itensAgrupados.length,
        numerosRequisicoes: [],
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

    return {
      tipoCompra: tipoPrincipal,
      totalRequisicoes: requisicoes.length,
      totalItens,
      numerosRequisicoes: numerosRequisicoes.slice(0, 3), // Mostrar até 3 números
      temMaisRequisicoes: numerosRequisicoes.length > 3,
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
            <TabsList className="px-6 pt-4 flex-shrink-0">
              <TabsTrigger value="dados">
                <FileText className="h-4 w-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="requisicoes">
                <FileText className="h-4 w-4 mr-2" />
                Requisições
              </TabsTrigger>
              <TabsTrigger value="itens">
                <Package className="h-4 w-4 mr-2" />
                Itens
              </TabsTrigger>
              <TabsTrigger value="fornecedores">
                <Users className="h-4 w-4 mr-2" />
                Fornecedores
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

            <ScrollArea className="flex-1 px-6">
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

              <TabsContent value="itens" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Label>Itens selecionados para o mapa</Label>
                    <Badge variant="secondary">{itensSelecionados.size} itens</Badge>
                  </div>

                  <div className="max-h-[60vh] overflow-auto rounded border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={itensAgrupados.length > 0 && itensSelecionados.size === itensAgrupados.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setItensSelecionados(new Set(itensAgrupados.map(i => i.material_id)));
                                } else {
                                  setItensSelecionados(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Qtd. Total</TableHead>
                          <TableHead>Origem</TableHead>
                          {fornecedores.map((f, idx) => {
                            const partner = partnersMap.get(f.fornecedor_id);
                            const fd = fornecedoresDisponiveis.find((x: any) => x.id === f.fornecedor_id);
                            const partnerFromFd = fd ? partnersMap.get(fd.partner_id) : null;
                            const displayName =
                              partner?.nome_fantasia ||
                              partner?.razao_social ||
                              partnerFromFd?.nome_fantasia ||
                              partnerFromFd?.razao_social ||
                              fd?.nome_fantasia ||
                              fd?.razao_social ||
                              `Fornecedor ${idx + 1}`;
                            return (
                              <TableHead key={f.id} className="min-w-[260px]">
                                {displayName}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensAgrupados.map((item) => {
                          const itemKey = getItemKey(item);
                          const isSelected = itensSelecionados.has(itemKey);
                          return (
                            <TableRow key={itemKey} className={!isSelected ? 'opacity-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleItem(item)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {item.material_codigo || '—'}
                              </TableCell>
                              <TableCell>{item.material_nome}</TableCell>
                              <TableCell>{item.unidade_medida}</TableCell>
                              <TableCell>{item.quantidade_total.toLocaleString('pt-BR')}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap gap-1">
                                    {item.origem.map((origem, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {origem}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {getTipoBadge(item.tipo_requisicao)}
                                  </div>
                                </div>
                              </TableCell>
                              {fornecedores.map((f) => {
                                const itemKey = getItemKey(item);
                                const cell = mapaFornecedorItens[f.id]?.[itemKey];
                                return (
                                  <TableCell key={`${item.material_id}-${f.id}`} className="min-w-[260px] align-top">
                                    <div className="grid grid-cols-2 gap-2 pb-10">
                                      <div className="col-span-2">
                                        <Label className="text-[11px]">Qtd. ofertada</Label>
                                        <Input
                                          type="number"
                                          value={cell?.quantidade_ofertada ?? item.quantidade_total}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'quantidade_ofertada',
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[11px]">Valor (R$)</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={cell?.valor_unitario ?? 0}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'valor_unitario',
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[11px]">Desconto %</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={cell?.desconto_percentual ?? 0}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'desconto_percentual',
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[11px]">Desc. (R$)</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={cell?.desconto_valor ?? 0}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'desconto_valor',
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[11px]">Prazo (dias)</Label>
                                        <Input
                                          type="number"
                                          value={cell?.prazo_entrega_dias ?? 0}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'prazo_entrega_dias',
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <Label className="text-[11px]">Condição</Label>
                                        <Input
                                          value={cell?.condicao_pagamento ?? ''}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'condicao_pagamento',
                                              e.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <Label className="text-[11px]">Obs</Label>
                                        <Textarea
                                          rows={2}
                                          value={cell?.observacoes ?? ''}
                                          onChange={(e) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'observacoes',
                                              e.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="col-span-2 flex items-center gap-2">
                                        <Checkbox
                                          checked={cell?.is_vencedor || false}
                                          onCheckedChange={(checked) =>
                                            handleUpdateMapaValor(
                                              f.id,
                                              item,
                                              'is_vencedor',
                                              Boolean(checked)
                                            )
                                          }
                                        />
                                        <span className="text-xs text-muted-foreground">Marcar vencedor</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fornecedores" className="mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Label>Fornecedores</Label>
                    <p className="text-sm text-muted-foreground">
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

                {fornecedores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum fornecedor adicionado</p>
                    <p className="text-sm">Clique em "Adicionar Fornecedor" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-auto pr-3 pb-6">
                    {fornecedores.map((fornecedor, index) => {
                      const partner = fornecedor.fornecedor_id 
                        ? partnersMap.get(fornecedor.fornecedor_id) 
                        : null;
                      
                      return (
                        <Card key={fornecedor.id}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                Fornecedor {index + 1}
                                {partner && ` - ${partner.nome_fantasia || partner.razao_social}`}
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFornecedor(fornecedor.id)}
                                disabled={isEmergencial && fornecedores.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Fornecedor *</Label>
                                <Select
                                  value={fornecedor.fornecedor_id}
                                  onValueChange={(value) => 
                                    handleUpdateFornecedor(fornecedor.id, 'fornecedor_id', value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um fornecedor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fornecedoresDisponiveis.length === 0 ? (
                                      <SelectItem value="no-suppliers" disabled>
                                        Nenhum fornecedor disponível
                                      </SelectItem>
                                    ) : (
                                      fornecedoresDisponiveis.map((fd: any) => {
                                        const p = partnersMap.get(fd.partner_id);
                                        const displayName = p?.nome_fantasia || p?.razao_social || `Fornecedor ${fd.id.substring(0, 8)}`;
                                        return (
                                          <SelectItem key={fd.id} value={fd.id}>
                                            {displayName}
                                          </SelectItem>
                                        );
                                      })
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Observações</Label>
                              <Textarea
                                value={fornecedor.observacoes || ''}
                                onChange={(e) => 
                                  handleUpdateFornecedor(fornecedor.id, 'observacoes', e.target.value)
                                }
                                placeholder="Observações sobre este fornecedor"
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo da Cotação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Tipo</Label>
                        <p className="font-medium">{formData.tipo_cotacao}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data Limite</Label>
                        <p className="font-medium">
                          {formData.data_limite 
                            ? new Date(formData.data_limite).toLocaleDateString('pt-BR')
                            : '—'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Requisições</Label>
                        <p className="font-medium">{requisicoes.length}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Itens Selecionados</Label>
                        <p className="font-medium">{itensSelecionados.size}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Fornecedores</Label>
                        <p className="font-medium">
                          {fornecedoresValidos} {!fornecedoresOk && <span className="text-red-600">⚠️</span>}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-dashed">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Totais por fornecedor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {fornecedores.length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhum fornecedor adicionado</p>
                          )}
                          {fornecedores.map((f) => {
                            const total = resumoTotais.porFornecedor.get(f.id) || 0;
                            const partner = partnersMap.get(f.fornecedor_id);
                            const isMelhor = resumoTotais.melhorFornecedorId === f.id;
                            return (
                              <div
                                key={f.id}
                                className={`flex items-center justify-between rounded px-3 py-2 ${
                                  isMelhor ? 'bg-green-50 border border-green-200' : 'bg-muted/30'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {partner?.nome_fantasia || partner?.razao_social || 'Fornecedor'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">ID: {f.fornecedor_id || '—'}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  {isMelhor && <Badge className="mt-1 bg-green-600">Menor total</Badge>}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Melhor por item</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-64 overflow-auto">
                          {Array.from(resumoTotais.porItem.entries()).map(([materialId, info]) => {
                            const item = itensAgrupados.find((i) => i.material_id === materialId);
                            const fornecedorMelhor = fornecedores.find((f) => f.id === info.fornecedorId);
                            const partner = fornecedorMelhor
                              ? partnersMap.get(fornecedorMelhor.fornecedor_id)
                              : null;
                            return (
                              <div key={materialId} className="flex justify-between rounded bg-muted/30 px-3 py-2">
                                <div className="flex-1">
                                  <div className="font-medium">{item?.material_nome || 'Item'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item?.material_codigo || materialId}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    R$ {info.melhor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  {partner && (
                                    <div className="text-xs text-muted-foreground">
                                      {partner.nome_fantasia || partner.razao_social}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {resumoTotais.porItem.size === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhum item calculado.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {formData.observacoes_internas && (
                      <div>
                        <Label className="text-muted-foreground">Observações</Label>
                        <p className="text-sm">{formData.observacoes_internas}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Status da Cotação</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Rascunho</Badge>
                    <Badge variant="outline">Em cotação</Badge>
                    <Badge variant="outline">Aguardando aprovação</Badge>
                    <Badge variant="outline">Aprovada</Badge>
                    <Badge variant="outline">Reprovada</Badge>
                    <Badge variant="outline">Vencida</Badge>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

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
          <Button
            onClick={handleEnviarAprovacao}
            disabled={loading || submitting || !fornecedoresOk || itensSelecionados.size === 0}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






