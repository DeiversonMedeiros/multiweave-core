import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Loader2,
  Grid3x3,
  List
} from 'lucide-react';
import { usePurchaseRequisitions, useQuotes } from '@/hooks/compras/useComprasData';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';

interface RequisicoesDisponiveisProps {
  onGerarCotacao: (requisicoesIds: string[], itemIds?: string[]) => void; // itemIds opcional para modo explodido
}

interface ItemExplodido {
  id: string; // ID composto: requisicao_id-requisicao_item_id
  material_id: string;
  material_nome?: string;
  material_codigo?: string;
  quantidade: number;
  unidade_medida: string;
  requisicao_id: string;
  requisicao_item_id: string; // ID real do item de requisição (requisicao_item.id)
  requisicao_numero: string;
  tipo_requisicao: string;
  prioridade: string;
  centro_custo_id?: string;
  projeto_id?: string;
  material_classe?: string;
}

export function RequisicoesDisponiveis({ onGerarCotacao }: RequisicoesDisponiveisProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { data: requisicoes = [], isLoading } = usePurchaseRequisitions();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useActiveProjects();
  const { users } = useUsers();
  
  const [modoExplodido, setModoExplodido] = useState(false);
  const [selectedRequisicoes, setSelectedRequisicoes] = useState<Set<string>>(new Set());
  const [selectedItens, setSelectedItens] = useState<Set<string>>(new Set()); // IDs de itens no modo explodido
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null); // Para validação impeditiva
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [itensExplodidos, setItensExplodidos] = useState<ItemExplodido[]>([]);
  const [filters, setFilters] = useState({
    tipo: 'all',
    centro_custo_id: 'all',
    projeto_id: 'all',
    data_inicio: '',
    data_fim: '',
    apenas_emergenciais: false,
    somente_pendentes: true,
    buscar_item: '',
    grupo_item: 'all',
    ordenar_por: 'none' as 'none' | 'nome' | 'origem',
    ordenar_origem_direcao: 'crescente' as 'crescente' | 'decrescente',
  });

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

  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(user => {
      map.set(user.id, user.nome);
    });
    return map;
  }, [users]);

  // Buscar grupos/classes únicos dos materiais
  const gruposMateriais = useMemo(() => {
    const grupos = new Set<string>();
    itensExplodidos.forEach(item => {
      if (item.material_classe) {
        grupos.add(item.material_classe);
      }
    });
    return Array.from(grupos).sort();
  }, [itensExplodidos]);

  // Buscar cotações para verificar quais requisições já têm cotação criada
  const { data: cotacoes = [] } = useQuotes();
  const [itensEmCotacao, setItensEmCotacao] = useState<Map<string, boolean>>(new Map());
  const [itensPorRequisicao, setItensPorRequisicao] = useState<Map<string, any[]>>(new Map());
  const [loadingItensCotacao, setLoadingItensCotacao] = useState(false);

  // Mapear cotações por requisição
  const cotacoesPorRequisicao = useMemo(() => {
    const map = new Map<string, any>();
    cotacoes.forEach((cotacao: any) => {
      const requisicaoId = cotacao.requisicao_id;
      if (requisicaoId) {
        if (!map.has(requisicaoId) || 
            (cotacao.workflow_state === 'em_aprovacao' || cotacao.workflow_state === 'aprovada')) {
          map.set(requisicaoId, cotacao);
        }
      }
    });
    return map;
  }, [cotacoes]);

  // Carregar quais itens já estão em cotações ativas (não reprovadas) e todos os itens das requisições
  useEffect(() => {
    const carregarDadosItens = async () => {
      if (!selectedCompany?.id || requisicoes.length === 0) return;
      
      setLoadingItensCotacao(true);
      try {
        const itensMap = new Map<string, boolean>();
        const itensReqMap = new Map<string, any[]>();
        
        // Buscar todos os itens de requisição que estão em cotações ativas
        // Uma cotação ativa é aquela que está em rascunho, aguardando aprovação, ou aprovada
        // NÃO considerar reprovadas, rejeitadas ou canceladas
        const cotacoesAtivas = cotacoes.filter((c: any) => {
          const state = c.workflow_state || c.status;
          return state === 'rascunho' || 
                 state === 'em_aprovacao' || 
                 state === 'aprovada' ||
                 state === 'aberta' ||
                 state === 'em_cotacao';
        });

        // Se não há cotações ativas, buscar apenas itens das requisições
        if (cotacoesAtivas.length === 0) {
          // Buscar todos os itens das requisições em paralelo
          const requisicaoIds = requisicoes.map((req: any) => req.id);
          const itensRequisicoesPromises = requisicaoIds.map(async (reqId: string) => {
            try {
              const itensResult = await EntityService.list({
                schema: 'compras',
                table: 'requisicao_itens',
                companyId: selectedCompany.id,
                filters: { requisicao_id: reqId },
                page: 1,
                pageSize: 1000,
                skipCompanyFilter: true,
              });
              return { reqId, itens: itensResult.data || [] };
            } catch (error) {
              console.error(`Erro ao buscar itens da requisição ${reqId}:`, error);
              return { reqId, itens: [] };
            }
          });

          const itensRequisicoesResults = await Promise.all(itensRequisicoesPromises);
          itensRequisicoesResults.forEach(({ reqId, itens }) => {
            itensReqMap.set(reqId, itens);
          });

          setItensEmCotacao(itensMap);
          setItensPorRequisicao(itensReqMap);
          setLoadingItensCotacao(false);
          return;
        }

        // Buscar todos os ciclos de cotação em paralelo
        const requisicaoIdsAtivas = [...new Set(cotacoesAtivas.map((c: any) => c.requisicao_id).filter(Boolean))];
        const ciclosPromises = requisicaoIdsAtivas.map(async (reqId: string) => {
          try {
            const ciclosResult = await EntityService.list({
              schema: 'compras',
              table: 'cotacao_ciclos',
              companyId: selectedCompany.id,
              filters: { requisicao_id: reqId },
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true,
            });
            return ciclosResult.data || [];
          } catch (error) {
            console.error('Erro ao buscar ciclos da cotação:', error);
            return [];
          }
        });

        const ciclosArrays = await Promise.all(ciclosPromises);
        const todosCiclos = ciclosArrays.flat();
        const cicloIds = todosCiclos.map((ciclo: any) => ciclo.id);

        if (cicloIds.length > 0) {
          // Buscar todos os fornecedores em uma única query e filtrar no cliente
          // (EntityService pode não suportar filtros por array diretamente)
          try {
            const fornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'cotacao_fornecedores',
              companyId: selectedCompany.id,
              filters: {},
              page: 1,
              pageSize: 5000,
              skipCompanyFilter: true,
            });

            const todosFornecedores = (fornecedoresResult.data || []).filter((f: any) =>
              cicloIds.includes(f.cotacao_ciclo_id || f.cotacao_id)
            );
            const fornecedorIds = todosFornecedores.map((f: any) => f.id);

            if (fornecedorIds.length > 0) {
              // Buscar todos os itens em uma única query e filtrar no cliente
              try {
                const itensResult = await EntityService.list({
                  schema: 'compras',
                  table: 'cotacao_item_fornecedor',
                  companyId: selectedCompany.id,
                  filters: {},
                  page: 1,
                  pageSize: 5000,
                  skipCompanyFilter: true,
                });

                const todosItens = (itensResult.data || []).filter((item: any) =>
                  fornecedorIds.includes(item.cotacao_fornecedor_id)
                );

                todosItens.forEach((item: any) => {
                  if (item.requisicao_item_id) {
                    // Marcar o item como em cotação
                    itensMap.set(item.requisicao_item_id, true);
                  }
                });
              } catch (error) {
                console.error('Erro ao buscar itens de fornecedores:', error);
              }
            }
          } catch (error) {
            console.error('Erro ao buscar fornecedores:', error);
          }
        }

        // Buscar todos os itens das requisições em paralelo
        const requisicaoIds = requisicoes.map((req: any) => req.id);
        const itensRequisicoesPromises = requisicaoIds.map(async (reqId: string) => {
          try {
            const itensResult = await EntityService.list({
              schema: 'compras',
              table: 'requisicao_itens',
              companyId: selectedCompany.id,
              filters: { requisicao_id: reqId },
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true,
            });
            return { reqId, itens: itensResult.data || [] };
          } catch (error) {
            console.error(`Erro ao buscar itens da requisição ${reqId}:`, error);
            return { reqId, itens: [] };
          }
        });

        const itensRequisicoesResults = await Promise.all(itensRequisicoesPromises);
        itensRequisicoesResults.forEach(({ reqId, itens }) => {
          itensReqMap.set(reqId, itens);
        });

        setItensEmCotacao(itensMap);
        setItensPorRequisicao(itensReqMap);
      } catch (error) {
        console.error('Erro ao carregar itens em cotação:', error);
      } finally {
        setLoadingItensCotacao(false);
      }
    };

    carregarDadosItens();
  }, [selectedCompany?.id, requisicoes, cotacoes]);

  // Verificar quais requisições têm cotações em rascunho ou aguardando aprovação
  const requisicoesComCotacaoAtiva = useMemo(() => {
    const map = new Set<string>();
    cotacoes.forEach((cotacao: any) => {
      const state = cotacao.workflow_state || cotacao.status;
      // Considerar rascunho e em_aprovacao como "cotação ativa" que bloqueia a requisição
      if (state === 'rascunho' || state === 'em_aprovacao') {
        if (cotacao.requisicao_id) {
          map.add(cotacao.requisicao_id);
        }
      }
    });
    return map;
  }, [cotacoes]);

  // Filtrar requisições disponíveis - apenas as que têm pelo menos um item disponível
  // E que NÃO têm cotação em rascunho ou aguardando aprovação
  const requisicoesDisponiveis = useMemo(() => {
    const filtered = requisicoes.filter((req: any) => {
      const status = req.status;
      const workflowState = req.workflow_state;
      const hasEmCotacaoState = workflowState === 'em_cotacao';
      const isApproved = status === 'aprovada';
      const isNotCancelled = status !== 'cancelada' && status !== 'reprovada' && workflowState !== 'cancelada' && workflowState !== 'reprovada';
      
      // Verificar se a requisição está elegível (status correto)
      if (!((hasEmCotacaoState || isApproved) && isNotCancelled)) {
        return false;
      }

      // NÃO mostrar se tem cotação em rascunho ou aguardando aprovação
      if (requisicoesComCotacaoAtiva.has(req.id)) {
        return false;
      }

      // Se ainda está carregando, mostrar a requisição temporariamente
      if (loadingItensCotacao) {
        return true;
      }

      // Verificar se tem pelo menos um item disponível
      const itens = itensPorRequisicao.get(req.id) || [];
      const temItemDisponivel = itens.some((item: any) => {
        return !itensEmCotacao.get(item.id);
      });

      return temItemDisponivel;
    });

    return filtered;
  }, [requisicoes, itensEmCotacao, itensPorRequisicao, loadingItensCotacao, requisicoesComCotacaoAtiva]);

  // Carregar itens quando mudar para modo explodido
  useEffect(() => {
    if (modoExplodido && requisicoesDisponiveis.length > 0 && !loadingItens) {
      carregarItensExplodidos();
    }
  }, [modoExplodido, requisicoesDisponiveis]);

  const carregarItensExplodidos = async () => {
    if (!selectedCompany?.id) return;
    
    setLoadingItens(true);
    try {
      const todosItens: ItemExplodido[] = [];
      
      for (const req of requisicoesDisponiveis) {
        // Buscar itens da requisição
        const itensResult = await EntityService.list({
          schema: 'compras',
          table: 'requisicao_itens',
          companyId: selectedCompany.id,
          filters: { requisicao_id: req.id },
          page: 1,
          pageSize: 1000,
          skipCompanyFilter: true,
        });

        const itensRaw = itensResult.data || [];
        
        // Buscar materiais
        const materialIds = [...new Set(itensRaw.map((item: any) => item.material_id).filter(Boolean))];
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
              if (materialIds.some(id => String(id) === String(material.id))) {
                materiaisMap.set(String(material.id), material);
              }
            });
          }
        }

        // Mapear itens com dados dos materiais
        const itens = itensRaw.map((item: any) => {
          const material = materiaisMap.get(String(item.material_id));
          return {
            id: `${req.id}-${item.id}`, // ID composto para identificação única
            material_id: item.material_id,
            material_nome: material?.nome || material?.descricao || 'Material não encontrado',
            material_codigo: material?.codigo_interno || material?.codigo || '',
            quantidade: item.quantidade,
            unidade_medida: item.unidade_medida || material?.unidade_medida || 'UN',
            requisicao_id: req.id,
            requisicao_item_id: item.id, // ID real do requisicao_item para filtrar no modal
            requisicao_numero: req.numero_requisicao,
            tipo_requisicao: req.tipo_requisicao || '',
            prioridade: req.prioridade || 'normal',
            centro_custo_id: req.centro_custo_id,
            projeto_id: req.projeto_id,
            material_classe: material?.classe || '',
          };
        });

        todosItens.push(...itens);
      }

      // Agrupar itens por material_id E tipo_requisicao
      // O mesmo material pode aparecer em tipos diferentes de requisição
      // e deve ser tratado como itens separados
      // IMPORTANTE: Não agrupar - mostrar cada item individualmente no modo explodido
      // para permitir seleção granular e rastreamento por item
      setItensExplodidos(todosItens);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar itens das requisições',
        variant: 'destructive',
      });
    } finally {
      setLoadingItens(false);
    }
  };

  // Aplicar filtros
  const filtered = useMemo(() => {
    if (modoExplodido) {
      let result = itensExplodidos;

      // Filtrar itens que já estão em cotação ativa
      result = result.filter((item: ItemExplodido) => {
        return !itensEmCotacao.get(item.requisicao_item_id);
      });

      // Filtro de busca
      if (search) {
        result = result.filter((item: ItemExplodido) =>
          item.material_nome?.toLowerCase().includes(search.toLowerCase()) ||
          item.material_codigo?.toLowerCase().includes(search.toLowerCase()) ||
          item.requisicao_numero?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Filtro de tipo
      if (filters.tipo && filters.tipo !== 'all') {
        result = result.filter((item: ItemExplodido) => item.tipo_requisicao === filters.tipo);
      }

      // Filtro de grupo/classe
      if (filters.grupo_item && filters.grupo_item !== 'all') {
        result = result.filter((item: ItemExplodido) => item.material_classe === filters.grupo_item);
      }

      // Filtro buscar item
      if (filters.buscar_item) {
        result = result.filter((item: ItemExplodido) =>
          item.material_nome?.toLowerCase().includes(filters.buscar_item.toLowerCase()) ||
          item.material_codigo?.toLowerCase().includes(filters.buscar_item.toLowerCase())
        );
      }

      // Aplicar ordenação
      if (filters.ordenar_por === 'nome') {
        result = [...result].sort((a, b) => {
          const nomeA = (a.material_nome || '').toLowerCase();
          const nomeB = (b.material_nome || '').toLowerCase();
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
      } else if (filters.ordenar_por === 'origem') {
        result = [...result].sort((a, b) => {
          // Extrair número da requisição (ex: REQ-000018 -> 18)
          const extrairNumero = (numeroReq: string): number => {
            const match = numeroReq?.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 0;
          };
          
          const numA = extrairNumero(a.requisicao_numero || '');
          const numB = extrairNumero(b.requisicao_numero || '');
          
          if (filters.ordenar_origem_direcao === 'crescente') {
            return numA - numB;
          } else {
            return numB - numA;
          }
        });
      }

      return result;
    } else {
      let result = requisicoesDisponiveis;

      if (search) {
        result = result.filter((req: any) =>
          req.numero_requisicao?.toLowerCase().includes(search.toLowerCase()) ||
          usersMap.get(req.solicitante_id)?.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (filters.tipo && filters.tipo !== 'all') {
        result = result.filter((req: any) => req.tipo_requisicao === filters.tipo);
      }

      if (filters.centro_custo_id && filters.centro_custo_id !== 'all') {
        result = result.filter((req: any) => req.centro_custo_id === filters.centro_custo_id);
      }

      if (filters.projeto_id && filters.projeto_id !== 'all') {
        result = result.filter((req: any) => req.projeto_id === filters.projeto_id);
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
          filterDate.setHours(23, 59, 59, 999);
          return reqDate <= filterDate;
        });
      }

      if (filters.apenas_emergenciais) {
        result = result.filter((req: any) => 
          req.tipo_requisicao === 'emergencial' || req.prioridade === 'alta'
        );
      }

      if (filters.somente_pendentes) {
        result = result.filter((req: any) => {
          const status = req.workflow_state || req.status;
          return status === 'aprovada' || status === 'em_cotacao';
        });
      }

      return result;
    }
  }, [modoExplodido, requisicoesDisponiveis, itensExplodidos, itensEmCotacao, search, filters, usersMap]);

  // Projetos filtrados por centro de custo
  const filteredProjects = useMemo(() => {
    const allProjects = projectsData?.data || [];
    if (!filters.centro_custo_id || filters.centro_custo_id === 'all') {
      return allProjects;
    }
    return allProjects.filter((proj: any) => 
      proj.cost_center_id?.toString() === filters.centro_custo_id?.toString()
    );
  }, [projectsData, filters.centro_custo_id]);

  // Validação de tipo (filtro impeditivo)
  const validarTipoCompra = (tipo: string): boolean => {
    if (!tipoSelecionado) {
      setTipoSelecionado(tipo);
      return true;
    }

    // Emergencial NÃO pode misturar com nenhum outro tipo
    if (tipoSelecionado === 'emergencial' || tipo === 'emergencial') {
      return tipoSelecionado === tipo;
    }

    // Reposição NÃO pode misturar com compra direta (podem ser para locais diferentes)
    if ((tipoSelecionado === 'reposicao' && tipo === 'compra_direta') ||
        (tipoSelecionado === 'compra_direta' && tipo === 'reposicao')) {
      return false;
    }

    // Reposição pode misturar apenas com outras reposições
    if (tipoSelecionado === 'reposicao' || tipo === 'reposicao') {
      return tipoSelecionado === tipo;
    }

    // Compra direta pode misturar apenas com outras compras diretas
    if (tipoSelecionado === 'compra_direta' || tipo === 'compra_direta') {
      return tipoSelecionado === tipo;
    }

    // Outros tipos não podem misturar
    return tipoSelecionado === tipo;
  };

  const handleSelectItem = (itemId: string, itemTipo: string, checked: boolean) => {
    if (checked) {
      if (!validarTipoCompra(itemTipo)) {
        toast({
          title: 'Seleção inválida',
          description: `Não é possível misturar itens de ${getTipoNome(tipoSelecionado!)} com itens de ${getTipoNome(itemTipo)} nesta cotação.`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedItens(prev => new Set(prev).add(itemId));
      
      // Coletar requisições dos itens selecionados
      const requisicoesDosItens = new Set<string>();
      (filtered as ItemExplodido[]).forEach((item: ItemExplodido) => {
        if (selectedItens.has(item.id) || item.id === itemId) {
          requisicoesDosItens.add(item.requisicao_id);
        }
      });
      setSelectedRequisicoes(requisicoesDosItens);
    } else {
      setSelectedItens(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      // Se não houver mais itens selecionados, limpar tipo
      if (selectedItens.size === 1) {
        setTipoSelecionado(null);
      }
    }
  };

  const handleSelectRequisicao = (requisicaoId: string, checked: boolean) => {
    if (checked) {
      const requisicao = requisicoesDisponiveis.find((r: any) => r.id === requisicaoId);
      if (requisicao && !validarTipoCompra(requisicao.tipo_requisicao)) {
        toast({
          title: 'Seleção inválida',
          description: `Não é possível misturar requisições de ${getTipoNome(tipoSelecionado!)} com requisições de ${getTipoNome(requisicao.tipo_requisicao)} nesta cotação.`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedRequisicoes(prev => {
        const newSet = new Set(prev);
        newSet.add(requisicaoId);
        return newSet;
      });
    } else {
      setSelectedRequisicoes(prev => {
        const newSet = new Set(prev);
        newSet.delete(requisicaoId);
        return newSet;
      });

      if (selectedRequisicoes.size === 1) {
        setTipoSelecionado(null);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (modoExplodido) {
      if (checked) {
        const tipos = new Set((filtered as ItemExplodido[]).map((item: ItemExplodido) => item.tipo_requisicao));
        
        // Validar se pode selecionar todos os tipos
        if (tipos.size > 1) {
          // Verificar se há tipos incompatíveis
          const temEmergencial = tipos.has('emergencial');
          const temReposicao = tipos.has('reposicao');
          const temCompraDireta = tipos.has('compra_direta');
          
          // Emergencial não pode misturar com nenhum outro
          if (temEmergencial && tipos.size > 1) {
            toast({
              title: 'Seleção inválida',
              description: 'Não é possível selecionar itens emergenciais junto com outros tipos de compra.',
              variant: 'destructive',
            });
            return;
          }
          
          // Reposição não pode misturar com compra direta
          if (temReposicao && temCompraDireta) {
            toast({
              title: 'Seleção inválida',
              description: 'Não é possível misturar requisições de reposição com compra direta (podem ser para locais diferentes).',
              variant: 'destructive',
            });
            return;
          }
        }
        
        setSelectedItens(new Set((filtered as ItemExplodido[]).map((item: ItemExplodido) => item.id)));
        const requisicoesDosItens = new Set((filtered as ItemExplodido[]).map((item: ItemExplodido) => item.requisicao_id));
        setSelectedRequisicoes(requisicoesDosItens);
      } else {
        setSelectedItens(new Set());
        setSelectedRequisicoes(new Set());
        setTipoSelecionado(null);
      }
    } else {
      if (checked) {
        // Validar tipos antes de selecionar todas as requisições
        const tipos = new Set(filtered.map((r: any) => r.tipo_requisicao));
        
        if (tipos.size > 1) {
          const temEmergencial = tipos.has('emergencial');
          const temReposicao = tipos.has('reposicao');
          const temCompraDireta = tipos.has('compra_direta');
          
          if (temEmergencial && tipos.size > 1) {
            toast({
              title: 'Seleção inválida',
              description: 'Não é possível selecionar requisições emergenciais junto com outros tipos de compra.',
              variant: 'destructive',
            });
            return;
          }
          
          if (temReposicao && temCompraDireta) {
            toast({
              title: 'Seleção inválida',
              description: 'Não é possível misturar requisições de reposição com compra direta (podem ser para locais diferentes).',
              variant: 'destructive',
            });
            return;
          }
        }
        
        setSelectedRequisicoes(new Set(filtered.map((r: any) => r.id)));
      } else {
        setSelectedRequisicoes(new Set());
        setTipoSelecionado(null);
      }
    }
  };

  const handleGerarCotacao = () => {
    if (modoExplodido) {
      if (selectedItens.size === 0) {
        toast({
          title: 'Nenhum item selecionado',
          description: 'Selecione pelo menos um item para gerar a cotação.',
          variant: 'destructive',
        });
        return;
      }
      // Converter itens selecionados para requisições e extrair itemIds
      const requisicoesDosItens = new Set<string>();
      const itemIdsSelecionados: string[] = [];
      
      (filtered as ItemExplodido[]).forEach((item: ItemExplodido) => {
        if (selectedItens.has(item.id)) {
          requisicoesDosItens.add(item.requisicao_id);
          // Adicionar o requisicao_item_id real para filtrar no modal
          itemIdsSelecionados.push(item.requisicao_item_id);
        }
      });
      
      onGerarCotacao(Array.from(requisicoesDosItens), itemIdsSelecionados);
    } else {
      if (selectedRequisicoes.size === 0) {
        toast({
          title: 'Nenhuma requisição selecionada',
          description: 'Selecione pelo menos uma requisição para gerar a cotação.',
          variant: 'destructive',
        });
        return;
      }
      onGerarCotacao(Array.from(selectedRequisicoes));
    }
  };

  const getTipoNome = (tipo: string): string => {
    switch (tipo) {
      case 'reposicao': return 'Reposição';
      case 'compra_direta': return 'Compra Direta';
      case 'emergencial': return 'Emergencial';
      default: return tipo;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return <Badge variant="outline" className="text-red-600 bg-red-50">Alta</Badge>;
      case 'normal':
        return <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Normal</Badge>;
      case 'baixa':
        return <Badge variant="outline" className="text-green-600 bg-green-50">Baixa</Badge>;
      default:
        return <Badge variant="outline">{prioridade || 'Normal'}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'emergencial':
        return <Badge variant="outline" className="text-orange-600 bg-orange-50">
          <Zap className="h-3 w-3 mr-1" />
          Emergencial
        </Badge>;
      case 'reposicao':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50">Reposição</Badge>;
      case 'compra_direta':
        return <Badge variant="outline" className="text-purple-600 bg-purple-50">Compra Direta</Badge>;
      default:
        return <Badge variant="outline">{tipo || '—'}</Badge>;
    }
  };

  // Função para calcular status derivado baseado no progresso dos itens
  const getStatusDerivado = (
    totalItens: number,
    itensEmCotacaoAtiva: number,
    itensDisponiveis: number
  ): { status: 'a_cotar' | 'em_cotacao'; badge: React.ReactNode } => {
    // Se nenhum item está em cotação ativa → A COTAR
    if (itensEmCotacaoAtiva === 0) {
      return {
        status: 'a_cotar',
        badge: (
          <Badge variant="outline" className="text-blue-600 bg-blue-50">
            <Clock className="h-3 w-3 mr-1" />
            A COTAR
          </Badge>
        ),
      };
    }

    // Se pelo menos 1 item está em cotação ativa e ainda há itens disponíveis → EM COTAÇÃO
    if (itensEmCotacaoAtiva > 0 && itensDisponiveis > 0) {
      return {
        status: 'em_cotacao',
        badge: (
          <Badge variant="outline" className="text-orange-600 bg-orange-50">
            <Clock className="h-3 w-3 mr-1" />
            EM COTAÇÃO ({itensEmCotacaoAtiva} / {totalItens} itens)
          </Badge>
        ),
      };
    }

    // Fallback (não deveria acontecer se a lógica de visibilidade estiver correta)
    return {
      status: 'a_cotar',
      badge: (
        <Badge variant="outline" className="text-blue-600 bg-blue-50">
          <Clock className="h-3 w-3 mr-1" />
          A COTAR
        </Badge>
      ),
    };
  };

  const allSelected = modoExplodido 
    ? filtered.length > 0 && selectedItens.size === filtered.length
    : filtered.length > 0 && selectedRequisicoes.size === filtered.length;
  const someSelected = modoExplodido
    ? selectedItens.size > 0 && selectedItens.size < filtered.length
    : selectedRequisicoes.size > 0 && selectedRequisicoes.size < filtered.length;

  const countSelected = modoExplodido ? selectedItens.size : selectedRequisicoes.size;

  return (
    <div className="space-y-4">
      {/* Header com toggle e botão Gerar Cotação */}
      <div className="flex justify-between items-center">
        <div className="flex-1 flex items-center gap-4">
          <Input
            placeholder={modoExplodido ? "Buscar itens..." : "Buscar requisições..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="modo-explodido" className="text-sm">Modo Agrupado</Label>
            <Switch
              id="modo-explodido"
              checked={modoExplodido}
              onCheckedChange={(checked) => {
                setModoExplodido(checked);
                setSelectedRequisicoes(new Set());
                setSelectedItens(new Set());
                setTipoSelecionado(null);
              }}
            />
            <Label htmlFor="modo-explodido" className="text-sm">Modo Explodido</Label>
            <List className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button
            onClick={handleGerarCotacao}
            disabled={countSelected === 0}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Gerar Cotação ({countSelected})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Painel de Filtros */}
        {showFilters && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo da Requisição</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="reposicao">Reposição</SelectItem>
                    <SelectItem value="compra_direta">Compra Direta</SelectItem>
                    <SelectItem value="emergencial">Emergencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modoExplodido && (
                <>
                  <div className="space-y-2">
                    <Label>Grupo de Item</Label>
                    <Select
                      value={filters.grupo_item}
                      onValueChange={(value) => setFilters({ ...filters, grupo_item: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {gruposMateriais.map((grupo) => (
                          <SelectItem key={grupo} value={grupo}>
                            {grupo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ordenar por</Label>
                    <Select
                      value={filters.ordenar_por}
                      onValueChange={(value) => setFilters({ ...filters, ordenar_por: value as 'none' | 'nome' | 'origem' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma ordenação</SelectItem>
                        <SelectItem value="nome">Nome do Item (A-Z)</SelectItem>
                        <SelectItem value="origem">Origem (Requisição)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filters.ordenar_por === 'origem' && (
                    <div className="space-y-2">
                      <Label>Direção da Ordenação</Label>
                      <Select
                        value={filters.ordenar_origem_direcao}
                        onValueChange={(value) => setFilters({ ...filters, ordenar_origem_direcao: value as 'crescente' | 'decrescente' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crescente">Menor para Maior (REQ-000001 → REQ-000999)</SelectItem>
                          <SelectItem value="decrescente">Maior para Menor (REQ-000999 → REQ-000001)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {!modoExplodido && (
                <>
                  <div className="space-y-2">
                    <Label>Centro de Custo</Label>
                    <Select
                      value={filters.centro_custo_id}
                      onValueChange={(value) => setFilters({ ...filters, centro_custo_id: value, projeto_id: 'all' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {(costCentersData?.data || []).map((cc: any) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Projeto</Label>
                    <Select
                      value={filters.projeto_id}
                      onValueChange={(value) => setFilters({ ...filters, projeto_id: value })}
                      disabled={!filters.centro_custo_id || filters.centro_custo_id === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {filteredProjects.map((proj: any) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Período - De</Label>
                    <Input
                      type="date"
                      value={filters.data_inicio}
                      onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Período - Até</Label>
                    <Input
                      type="date"
                      value={filters.data_fim}
                      onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apenas_emergenciais"
                  checked={filters.apenas_emergenciais}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, apenas_emergenciais: checked as boolean })
                  }
                />
                <Label htmlFor="apenas_emergenciais" className="text-sm font-normal cursor-pointer">
                  Apenas emergenciais
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="somente_pendentes"
                  checked={filters.somente_pendentes}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, somente_pendentes: checked as boolean })
                  }
                />
                <Label htmlFor="somente_pendentes" className="text-sm font-normal cursor-pointer">
                  Somente pendentes
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Buscar Item</Label>
                <Input
                  placeholder="Código ou descrição do item"
                  value={filters.buscar_item}
                  onChange={(e) => setFilters({ ...filters, buscar_item: e.target.value })}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilters({
                    tipo: 'all',
                    centro_custo_id: 'all',
                    projeto_id: 'all',
                    data_inicio: '',
                    data_fim: '',
                    apenas_emergenciais: false,
                    somente_pendentes: true,
                    buscar_item: '',
                    grupo_item: 'all',
                    ordenar_por: 'none',
                    ordenar_origem_direcao: 'crescente',
                  });
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grid de Requisições ou Itens */}
        <Card className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <CardContent className="pt-6">
            {isLoading || loadingItens ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum {modoExplodido ? 'item' : 'requisição'} disponível para cotação</p>
              </div>
            ) : modoExplodido ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = someSelected;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filtered as ItemExplodido[]).map((item: ItemExplodido) => {
                    const isSelected = selectedItens.has(item.id);
                    const estaEmCotacao = itensEmCotacao.get(item.requisicao_item_id);
                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleSelectItem(item.id, item.tipo_requisicao, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.material_codigo || '—'}
                        </TableCell>
                        <TableCell>
                          {item.material_nome || 'Material sem nome'}
                        </TableCell>
                        <TableCell>{item.unidade_medida}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.requisicao_numero}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getTipoBadge(item.tipo_requisicao)}
                        </TableCell>
                        <TableCell>
                          {getPrioridadeBadge(item.prioridade)}
                        </TableCell>
                        <TableCell>
                          {loadingItensCotacao ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Carregando...
                            </Badge>
                          ) : estaEmCotacao ? (
                            <Badge variant="outline" className="text-orange-600 bg-orange-50">
                              <Clock className="h-3 w-3 mr-1" />
                              Em Cotação
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 bg-blue-50">
                              <Clock className="h-3 w-3 mr-1" />
                              Disponível
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = someSelected;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Itens Disponíveis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((requisicao: any) => {
                    const isSelected = selectedRequisicoes.has(requisicao.id);
                    const itens = itensPorRequisicao.get(requisicao.id) || [];
                    const totalItens = itens.length;
                    
                    // Calcular itens em cotação ativa (rascunho, em_aprovacao, aprovada, aberta, em_cotacao)
                    const itensEmCotacaoAtiva = itens.filter((item: any) => itensEmCotacao.get(item.id)).length;
                    const itensDisponiveis = totalItens - itensEmCotacaoAtiva;
                    
                    // Calcular status derivado baseado no progresso
                    const statusDerivado = getStatusDerivado(totalItens, itensEmCotacaoAtiva, itensDisponiveis);
                    
                    return (
                      <TableRow
                        key={requisicao.id}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleSelectRequisicao(requisicao.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {requisicao.numero_requisicao || requisicao.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          {requisicao.data_solicitacao
                            ? new Date(requisicao.data_solicitacao).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {getTipoBadge(requisicao.tipo_requisicao)}
                        </TableCell>
                        <TableCell>
                          {getPrioridadeBadge(requisicao.prioridade)}
                        </TableCell>
                        <TableCell>
                          {usersMap.get(requisicao.solicitante_id) || '—'}
                        </TableCell>
                        <TableCell>
                          {costCentersMap.get(requisicao.centro_custo_id) || '—'}
                        </TableCell>
                        <TableCell>
                          {projectsMap.get(requisicao.projeto_id) || '—'}
                        </TableCell>
                        <TableCell>
                          {loadingItensCotacao ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Carregando...
                            </Badge>
                          ) : (
                            // Exibir status derivado baseado no progresso dos itens
                            statusDerivado.badge
                          )}
                        </TableCell>
                        <TableCell>
                          {loadingItensCotacao ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Carregando...
                            </Badge>
                          ) : totalItens > 0 ? (
                            <Badge 
                              variant={itensDisponiveis === 0 ? "secondary" : "default"}
                              className={itensDisponiveis === 0 ? "text-muted-foreground" : ""}
                            >
                              {itensDisponiveis} de {totalItens} disponíveis
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              —
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
