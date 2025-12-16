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
  selecionado: boolean;
  itens_origem: RequisicaoItem[];
}

interface FornecedorCotacao {
  id: string;
  fornecedor_id: string;
  fornecedor_nome?: string;
  preco_unitario?: number;
  prazo_entrega?: number;
  condicao_pagamento?: string;
  observacoes?: string;
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
  const [modoCotacao, setModoCotacao] = useState<'requisicao' | 'item'>('requisicao');
  const [itensAgrupados, setItensAgrupados] = useState<ItemAgrupado[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  
  // Fornecedores
  const [fornecedores, setFornecedores] = useState<FornecedorCotacao[]>([]);
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<any[]>([]);
  
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

        // Agrupar itens
        const itensMap = new Map<string, ItemAgrupado>();
        requisicoesData.forEach((req) => {
          req.itens.forEach((item) => {
            const key = item.material_id;
            if (!itensMap.has(key)) {
              itensMap.set(key, {
                material_id: item.material_id,
                material_nome: item.material_nome || 'Material sem nome',
                material_codigo: item.material_codigo || '',
                unidade_medida: item.unidade_medida || 'UN',
                quantidade_total: 0,
                origem: [],
                selecionado: true,
                itens_origem: [],
              });
            }
            const agrupado = itensMap.get(key)!;
            agrupado.quantidade_total += item.quantidade;
            if (!agrupado.origem.includes(req.numero_requisicao)) {
              agrupado.origem.push(req.numero_requisicao);
            }
            agrupado.itens_origem.push(item);
          });
        });

        const itensAgrupadosArray = Array.from(itensMap.values());
        setItensAgrupados(itensAgrupadosArray);
        setItensSelecionados(new Set(itensAgrupadosArray.map(i => i.material_id)));

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
      itemAgrupado.itens_origem.forEach((item) => {
        const requisicao = requisicoes.find(r => r.id === item.requisicao_id);
        if (!requisicao) return;

        // Distribuir valor entre fornecedores (média simples por enquanto)
        const valorPorFornecedor = item.valor_unitario_estimado || 0;
        const quantidadePorFornecedor = item.quantidade / fornecedores.length;

        fornecedores.forEach((fornecedor) => {
          const precoUnitario = fornecedor.preco_unitario || valorPorFornecedor;
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
            quantidade: quantidadePorFornecedor,
            valor_unitario: precoUnitario,
            valor_total: quantidadePorFornecedor * precoUnitario,
          });
        });
      });
    });

    setRateio(rateioItems);
  }, [
    itensAgrupados, 
    itensSelecionados, 
    fornecedores, 
    requisicoes,
    // Usar os Map objects diretamente - eles são estáveis via useMemo
    costCentersMap,
    projectsMap
  ]);

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

  const handleToggleItem = (materialId: string) => {
    setItensSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
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

    setSubmitting(true);
    try {
      // Preparar dados para envio
      const fornecedoresData = fornecedores.map(f => ({
        fornecedor_id: f.fornecedor_id,
      }));

      await startQuoteCycleMutation.mutateAsync({
        requisicao_id: requisicoesIds[0], // Por enquanto, usar primeira requisição
        fornecedores: fornecedoresData,
        prazo_resposta: formData.data_limite,
        observacoes: formData.observacoes_internas,
      });

      toast({
        title: "Sucesso",
        description: "Cotação enviada para aprovação.",
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
    const totalItens = modoCotacao === 'requisicao' 
      ? itensAgrupados.length 
      : itensSelecionados.size;

    return {
      tipoCompra: tipoPrincipal,
      totalRequisicoes: requisicoes.length,
      totalItens,
      numerosRequisicoes: numerosRequisicoes.slice(0, 3), // Mostrar até 3 números
      temMaisRequisicoes: numerosRequisicoes.length > 3,
    };
  }, [requisicoes, itensAgrupados, itensSelecionados, modoCotacao]);

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
          <DialogDescription className="flex items-center gap-2 flex-wrap">
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
          </DialogDescription>
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
                    <Label>Modo de Cotação:</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="modo_requisicao"
                        name="modo_cotacao"
                        checked={modoCotacao === 'requisicao'}
                        onChange={() => setModoCotacao('requisicao')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="modo_requisicao" className="font-normal cursor-pointer">
                        Cotar requisição inteira
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="modo_item"
                        name="modo_cotacao"
                        checked={modoCotacao === 'item'}
                        onChange={() => setModoCotacao('item')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="modo_item" className="font-normal cursor-pointer">
                        Cotar por item
                      </Label>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
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
                        <TableHead>Quantidade Total</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensAgrupados.map((item) => {
                        const isSelected = itensSelecionados.has(item.material_id);
                        return (
                          <TableRow key={item.material_id} className={!isSelected ? 'opacity-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(item.material_id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.material_codigo || '—'}
                            </TableCell>
                            <TableCell>{item.material_nome}</TableCell>
                            <TableCell>{item.unidade_medida}</TableCell>
                            <TableCell>{item.quantidade_total.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>
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
                  <div className="space-y-4">
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

                              <div className="space-y-2">
                                <Label>Preço Unitário (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={fornecedor.preco_unitario || ''}
                                  onChange={(e) => 
                                    handleUpdateFornecedor(fornecedor.id, 'preco_unitario', parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Prazo de Entrega (dias)</Label>
                                <Input
                                  type="number"
                                  value={fornecedor.prazo_entrega || ''}
                                  onChange={(e) => 
                                    handleUpdateFornecedor(fornecedor.id, 'prazo_entrega', parseInt(e.target.value) || 0)
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Condição de Pagamento</Label>
                                <Input
                                  value={fornecedor.condicao_pagamento || ''}
                                  onChange={(e) => 
                                    handleUpdateFornecedor(fornecedor.id, 'condicao_pagamento', e.target.value)
                                  }
                                  placeholder="Ex: 30/60 dias"
                                />
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

              <TabsContent value="finalizacao" className="mt-4 space-y-4">
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






