import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Loader2, Trash2, Calculator, Check, ShieldAlert, ShieldCheck, CheckCircle, Clock, XCircle, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEntradaMaterial, useUpdateEntradaMaterial } from '@/hooks/almoxarifado/useEntradasMateriaisQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useActivePartners } from '@/hooks/usePartners';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { EntityService } from '@/services/generic/entityService';
import { useChecklistRecebimento } from '@/hooks/almoxarifado/useChecklistRecebimento';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface NovaEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entradaId: string) => void;
  entradaParaEditar?: any; // Entrada existente para editar (pré-entrada)
}

interface EntradaItem {
  id: string;
  material_equipamento_id: string;
  quantidade_recebida: number;
  quantidade_aprovada: number;
  valor_unitario: number;
  valor_total: number;
  centro_custo_id?: string;
  projeto_id?: string;
  almoxarifado_id?: string;
  lote?: string;
  validade?: string;
  observacoes?: string;
  /** Quarentena: item fora do padrão até correção */
  em_quarentena?: boolean;
  quarentena_motivo?: string;
  quarentena_em?: string;
  quarentena_retirada_em?: string;
  /** Quando preenchido, o item já foi lançado no estoque e fica read-only */
  entrada_estoque_em?: string;
}

const NovaEntradaModal: React.FC<NovaEntradaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entradaParaEditar
}) => {
  const { selectedCompany } = useCompany();
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    almoxarifado_id: '',
    numero_nota: '',
    serie_nota_fiscal: '',
    tipo_documento_fiscal: '',
    chave_acesso: '',
    data_entrada: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [itens, setItens] = useState<EntradaItem[]>([]);
  /** Em modo "confirmar pré-entrada": quais itens incluir nesta confirmação (entrada parcial). Id -> true = incluir. */
  const [incluirNaEntradaAgora, setIncluirNaEntradaAgora] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [materialOpen, setMaterialOpen] = useState<{ [key: string]: boolean }>({});
  const [retirarQuarentenaLoading, setRetirarQuarentenaLoading] = useState<string | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createEntrada = useCreateEntradaMaterial();
  const updateEntrada = useUpdateEntradaMaterial();
  const { data: materiais = [] } = useMateriaisEquipamentos();
  const {
    checklistItems,
    criterios,
    createChecklistItem,
    updateChecklistItem,
  } = useChecklistRecebimento(entradaParaEditar?.id);
  const { data: partnersData } = useActivePartners();
  const { data: costCentersData } = useActiveCostCenters();
  const { data: projectsData } = useProjects();
  const { data: almoxarifadosData } = useAlmoxarifados();

  const partners = partnersData?.data || [];
  const fornecedores = partners.filter((p: any) => 
    Array.isArray(p.tipo) && p.tipo.includes('fornecedor')
  );
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];
  // Em useAlmoxarifados, data já é um array de almoxarifados (não um objeto { data })
  const almoxarifados = (almoxarifadosData as any[]) || [];

  if (almoxarifados && (almoxarifados as any[]).length) {
    console.log('[NovaEntradaModal] 🏬 almoxarifados carregados:', {
      quantidade: (almoxarifados as any[]).length,
      primeiros: (almoxarifados as any[]).slice(0, 3).map((a: any) => ({ id: a.id, nome: a.nome }))
    });
  } else {
    console.log('[NovaEntradaModal] ⚠️ Nenhum almoxarifado carregado para o modal');
  }

  useEffect(() => {
    if (isOpen) {
      if (entradaParaEditar) {
        // Carregar dados da pré-entrada para edição
        setFormData({
          fornecedor_id: entradaParaEditar.fornecedor_id || '',
          almoxarifado_id: '',
          numero_nota: entradaParaEditar.numero_nota || '',
          serie_nota_fiscal: entradaParaEditar.serie_nota_fiscal || '',
          tipo_documento_fiscal: entradaParaEditar.tipo_documento_fiscal || '',
          chave_acesso: entradaParaEditar.chave_acesso || '',
          data_entrada: entradaParaEditar.data_entrada || new Date().toISOString().split('T')[0],
          observacoes: entradaParaEditar.observacoes || '',
        });
        
        // Carregar itens da entrada e buscar dados do pedido/requisição (passar itens para não perder almoxarifado_id do banco)
        loadEntradaItens(entradaParaEditar.id).then((itensCarregados) => {
          const list = itensCarregados ?? [];
          if (list.length > 0) setItens(list);
          if (entradaParaEditar.pedido_id) {
            loadDadosPedido(entradaParaEditar.pedido_id, list);
          }
        });
      } else {
        // Resetar formulário quando abrir para nova entrada
        setFormData({
          fornecedor_id: '',
          almoxarifado_id: '',
          numero_nota: '',
          serie_nota_fiscal: '',
          tipo_documento_fiscal: '',
          chave_acesso: '',
          data_entrada: new Date().toISOString().split('T')[0],
          observacoes: '',
        });
        setItens([]);
        setIncluirNaEntradaAgora({});
      }
    }
  }, [isOpen, entradaParaEditar]);

  // Inicializar "incluir na entrada agora" quando os itens forem carregados no modo confirmar (entrada parcial)
  useEffect(() => {
    if (entradaParaEditar && itens.length > 0) {
      setIncluirNaEntradaAgora((prev) => {
        const next = { ...prev };
        itens.forEach((i) => {
          if (!i.entrada_estoque_em && next[i.id] === undefined) next[i.id] = true;
        });
        return next;
      });
    }
  }, [entradaParaEditar?.id, itens.length]);

  const loadEntradaItens = async (entradaId: string): Promise<EntradaItem[] | undefined> => {
    if (!selectedCompany?.id) {
      console.error('Empresa não selecionada');
      return undefined;
    }

    try {
      console.log('🔍 [loadEntradaItens] Carregando itens da entrada:', entradaId);
      
      // Usar RPC (EntityService): schema almoxarifado não é exposto no REST em alguns projetos Supabase (PGRST106), RPC retorna todas as colunas incluindo almoxarifado_id
      const result = await EntityService.list<any>({
        schema: 'almoxarifado',
        table: 'entrada_itens',
        companyId: selectedCompany.id,
        filters: { entrada_id: entradaId },
        orderBy: 'created_at',
        orderDirection: 'ASC',
        skipCompanyFilter: true,
      });
      const rawItens = result.data || [];
      console.log('✅ [loadEntradaItens] Itens encontrados:', rawItens.length);
      if (rawItens.length) {
        const primeiro = rawItens[0] as any;
        console.log('[NovaEntradaModal] 📋 loadEntradaItens raw almoxarifado_id=', primeiro?.almoxarifado_id);
      }
      
      if (rawItens.length > 0) {
        const itensMapeados: EntradaItem[] = rawItens.map((item: any) => ({
          id: item.id,
          material_equipamento_id: item.material_equipamento_id,
          quantidade_recebida: item.quantidade_recebida,
          quantidade_aprovada: item.quantidade_aprovada,
          valor_unitario: item.valor_unitario || 0,
          valor_total: item.valor_total || 0,
          centro_custo_id: item.centro_custo_id || '',
          projeto_id: item.projeto_id || '',
          almoxarifado_id: item.almoxarifado_id || '',
          lote: item.lote || '',
          validade: item.validade || '',
          observacoes: item.observacoes || '',
          em_quarentena: item.em_quarentena ?? false,
          quarentena_motivo: item.quarentena_motivo || '',
          quarentena_em: item.quarentena_em || undefined,
          quarentena_retirada_em: item.quarentena_retirada_em || undefined,
          entrada_estoque_em: item.entrada_estoque_em || undefined,
        }));
        
        console.log('[NovaEntradaModal] 📋 loadEntradaItens mapeados almoxarifado_id:', itensMapeados.map(i => ({ id: i.id, almoxarifado_id: i.almoxarifado_id })));
        setItens(itensMapeados);
        return itensMapeados;
      }
      return undefined;
    } catch (error) {
      console.error('❌ [loadEntradaItens] Erro ao carregar itens da entrada:', error);
      toast.error('Erro ao carregar itens da entrada');
      return undefined;
    }
  };

  // Buscar dados do pedido e requisição para preencher automaticamente centro_custo, projeto e almoxarifado.
  // itensCarregados: itens já carregados do banco (ex.: com almoxarifado_id do backfill) para não serem sobrescritos pelo estado assíncrono.
  const loadDadosPedido = async (pedidoId: string, itensCarregados?: EntradaItem[]) => {
    if (!selectedCompany?.id) {
      return;
    }

    try {
      console.log('[NovaEntradaModal] 🔍 loadDadosPedido inicio:', { pedidoId, itensCarregados_qtd: itensCarregados?.length, almoxarifado_ids: itensCarregados?.map(i => i.almoxarifado_id) });
      
      // Buscar pedido de compra
      const pedido = await EntityService.getById<any>({
        schema: 'compras',
        table: 'pedidos_compra',
        id: pedidoId,
        companyId: selectedCompany.id
      });

      if (!pedido) {
        console.warn('⚠️ [loadDadosPedido] Pedido não encontrado:', pedidoId);
        return;
      }

      console.log('✅ [loadDadosPedido] Pedido encontrado:', pedido.numero_pedido);
      console.log('📋 [loadDadosPedido] Campos do pedido:', {
        cotacao_id: pedido.cotacao_id,
        cotacao_ciclo_id: pedido.cotacao_ciclo_id
      });

      // Buscar cotação (pode ser cotacao_id ou cotacao_ciclo_id)
      let cotacao = null;
      let cotacaoCiclo = null;
      let requisicao = null;
      let requisicaoId: string | null = null;

      // Priorizar cotacao_ciclo_id (novo sistema)
      let numeroCotacao: string | null = null;
      if (pedido.cotacao_ciclo_id) {
        cotacaoCiclo = await EntityService.getById<any>({
          schema: 'compras',
          table: 'cotacao_ciclos',
          id: pedido.cotacao_ciclo_id,
          companyId: selectedCompany.id
        });
        console.log('✅ [loadDadosPedido] Cotação ciclo encontrada (cotacao_ciclo_id):', pedido.cotacao_ciclo_id);
        
        if (cotacaoCiclo) {
          requisicaoId = cotacaoCiclo.requisicao_id;
          numeroCotacao = cotacaoCiclo.numero_cotacao || null;
          console.log('📋 [loadDadosPedido] Requisição ID e numero_cotacao:', requisicaoId, numeroCotacao);
        }
      } else if (pedido.cotacao_id) {
        // Sistema antigo: buscar cotacao e depois requisicao através dela
        cotacao = await EntityService.getById<any>({
          schema: 'compras',
          table: 'cotacoes',
          id: pedido.cotacao_id,
          companyId: selectedCompany.id
        });
        console.log('✅ [loadDadosPedido] Cotação encontrada (cotacao_id):', pedido.cotacao_id);
        
        if (cotacao) {
          // Se a cotação tem cotacao_ciclo_id, buscar o ciclo para pegar requisicao_id
          if (cotacao.cotacao_ciclo_id) {
            cotacaoCiclo = await EntityService.getById<any>({
              schema: 'compras',
              table: 'cotacao_ciclos',
              id: cotacao.cotacao_ciclo_id,
              companyId: selectedCompany.id
            });
            if (cotacaoCiclo) {
              requisicaoId = cotacaoCiclo.requisicao_id;
              numeroCotacao = cotacaoCiclo.numero_cotacao || null;
              console.log('📋 [loadDadosPedido] Requisição ID e numero_cotacao via cotacao.cotacao_ciclo_id:', requisicaoId, numeroCotacao);
            }
          } else if (cotacao.requisicao_id) {
            // Sistema muito antigo: cotação tem requisicao_id diretamente
            requisicaoId = cotacao.requisicao_id;
            console.log('📋 [loadDadosPedido] Requisição ID direto da cotação:', requisicaoId);
          }
        }
      }

      // Se não encontrou através de cotacao_id ou cotacao_ciclo_id, tentar buscar através dos itens do pedido usando função RPC
      if (!requisicaoId) {
        console.log('🔄 [loadDadosPedido] Tentando buscar requisição através dos itens do pedido usando função RPC...');
        
        try {
          // Usar função RPC para buscar requisição através dos itens do pedido
          const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_requisicao_from_pedido', {
            p_pedido_id: pedidoId
          });

          if (rpcError) {
            console.warn('⚠️ [loadDadosPedido] Erro ao buscar requisição via RPC:', rpcError);
          } else if (rpcData) {
            requisicaoId = rpcData;
            console.log('✅ [loadDadosPedido] Requisição encontrada via RPC:', requisicaoId);
          }
        } catch (rpcErr: any) {
          console.warn('⚠️ [loadDadosPedido] Erro ao chamar função RPC get_requisicao_from_pedido:', rpcErr);
        }

        if (!requisicaoId) {
          console.warn('⚠️ [loadDadosPedido] Requisição não encontrada para o pedido. Verifique se o pedido tem cotacao_id ou cotacao_ciclo_id válido, ou se os itens do pedido correspondem a uma requisição.');
          return;
        }
      }

      // Buscar requisição usando o requisicao_id encontrado
      requisicao = await EntityService.getById<any>({
        schema: 'compras',
        table: 'requisicoes_compra',
        id: requisicaoId,
        companyId: selectedCompany.id
      });

      if (requisicao) {
        console.log('✅ [loadDadosPedido] Requisição encontrada:', requisicao.numero_requisicao);
        console.log('📋 [loadDadosPedido] Dados da requisição:', {
          centro_custo_id: requisicao.centro_custo_id,
          projeto_id: requisicao.projeto_id,
          destino_almoxarifado_id: requisicao.destino_almoxarifado_id
        });

        // Garantir destino_almoxarifado_id: às vezes o getById não retorna a coluna; buscar direto do banco
        if (!requisicao.destino_almoxarifado_id) {
          try {
            const { data: reqRow } = await supabase
              .schema('compras')
              .from('requisicoes_compra')
              .select('destino_almoxarifado_id')
              .eq('id', requisicaoId)
              .single();
            if (reqRow?.destino_almoxarifado_id) {
              requisicao.destino_almoxarifado_id = reqRow.destino_almoxarifado_id;
              console.log('✅ [loadDadosPedido] destino_almoxarifado_id obtido via Supabase:', requisicao.destino_almoxarifado_id);
            }
          } catch (_) {
            // ignora
          }
        }

        // Cotação com múltiplos centros de custo: buscar todas as requisições da mesma cotação (numero_cotacao)
        if (numeroCotacao && !requisicao.destino_almoxarifado_id) {
          try {
            const { data: ciclos } = await supabase
              .schema('compras')
              .from('cotacao_ciclos')
              .select('requisicao_id')
              .eq('numero_cotacao', numeroCotacao);
            const reqIdsCotacao = [...new Set((ciclos || []).map((c: any) => c.requisicao_id).filter(Boolean))];
            for (const rid of reqIdsCotacao) {
              const { data: r2 } = await supabase
                .schema('compras')
                .from('requisicoes_compra')
                .select('destino_almoxarifado_id')
                .eq('id', rid)
                .single();
              if (r2?.destino_almoxarifado_id) {
                requisicao.destino_almoxarifado_id = r2.destino_almoxarifado_id;
                console.log('✅ [loadDadosPedido] destino_almoxarifado_id de requisição da cotação:', numeroCotacao, rid, requisicao.destino_almoxarifado_id);
                break;
              }
            }
          } catch (_) {
            // ignora
          }
        }

        // Se ainda não tem almoxarifado, tentar outras requisições vinculadas ao pedido (itens em comum)
        if (!requisicao.destino_almoxarifado_id) {
          try {
            const { data: pedidoItens } = await supabase
              .schema('compras')
              .from('pedido_itens')
              .select('material_id')
              .eq('pedido_id', pedidoId);
            const materialIds = (pedidoItens || []).map((pi: any) => pi.material_id).filter(Boolean);
            if (materialIds.length > 0) {
              const { data: riRows } = await supabase
                .schema('compras')
                .from('requisicao_itens')
                .select('requisicao_id')
                .in('material_id', materialIds);
              const reqIds = [...new Set((riRows || []).map((r: any) => r.requisicao_id))];
              for (const rid of reqIds) {
                const { data: r2 } = await supabase
                  .schema('compras')
                  .from('requisicoes_compra')
                  .select('destino_almoxarifado_id')
                  .eq('id', rid)
                  .single();
                if (r2?.destino_almoxarifado_id) {
                  requisicao.destino_almoxarifado_id = r2.destino_almoxarifado_id;
                  console.log('✅ [loadDadosPedido] destino_almoxarifado_id de outra requisição vinculada:', rid, requisicao.destino_almoxarifado_id);
                  break;
                }
              }
            }
          } catch (_) {
            // ignora
          }
        }

        // Mapa material_id -> almoxarifado_id a partir de TODAS as requisições da cotação (múltiplos centros de custo)
        let materialToAlmox = new Map<string, string>();
        if (numeroCotacao) {
          try {
            const { data: ciclos } = await supabase
              .schema('compras')
              .from('cotacao_ciclos')
              .select('requisicao_id')
              .eq('numero_cotacao', numeroCotacao);
            const reqIdsAll = [...new Set((ciclos || []).map((c: any) => c.requisicao_id).filter(Boolean))];
            for (const rid of reqIdsAll) {
              const { data: riList } = await supabase
                .schema('compras')
                .from('requisicao_itens')
                .select('material_id, almoxarifado_id')
                .eq('requisicao_id', rid);
              const { data: rcRow } = await supabase
                .schema('compras')
                .from('requisicoes_compra')
                .select('destino_almoxarifado_id')
                .eq('id', rid)
                .single();
              const fallbackAlmox = rcRow?.destino_almoxarifado_id || null;
              (riList || []).forEach((ri: any) => {
                if (ri.material_id && !materialToAlmox.has(ri.material_id)) {
                  const almoxId = ri.almoxarifado_id || fallbackAlmox;
                  if (almoxId) materialToAlmox.set(ri.material_id, almoxId);
                }
              });
            }
          } catch (_) {
            // ignora
          }
        }
        const almoxGerais = requisicao.destino_almoxarifado_id || '';

        // Preencher centro_custo_id, projeto_id e almoxarifado_id nos itens (usar itensCarregados para preservar almoxarifado_id do banco)
        setItens(prevItens => {
          const base = (itensCarregados !== undefined && itensCarregados.length > 0) ? itensCarregados : prevItens;
          const novosItens = base.map(item => ({
            ...item,
            centro_custo_id: requisicao.centro_custo_id || item.centro_custo_id || '',
            projeto_id: requisicao.projeto_id || item.projeto_id || '',
            // Preservar almoxarifado_id já vindo do banco (backfill); senão preencher da cotação/requisição
            almoxarifado_id: item.almoxarifado_id || (item.material_equipamento_id
              ? (materialToAlmox.get(item.material_equipamento_id) || almoxGerais || '')
              : almoxGerais),
          }));
          console.log('✅ [loadDadosPedido] Itens atualizados com centro_custo, projeto e almoxarifado:', novosItens.map(i => ({ almoxarifado_id: i.almoxarifado_id })));
          return novosItens;
        });
      } else {
        console.warn('⚠️ [loadDadosPedido] Requisição não encontrada com ID:', requisicaoId);
        return;
      }

      // Buscar almoxarifado_id: priorizar destino_almoxarifado_id da requisição (já garantido acima)
      if (requisicao?.id) {
        console.log('🔍 [loadDadosPedido] Verificando destino_almoxarifado_id na requisição:', requisicao.destino_almoxarifado_id);
        
        if (requisicao.destino_almoxarifado_id) {
          console.log('✅ [loadDadosPedido] Almoxarifado encontrado na requisição (destino_almoxarifado_id):', requisicao.destino_almoxarifado_id);
          setFormData(prev => ({
            ...prev,
            almoxarifado_id: requisicao.destino_almoxarifado_id || ''
          }));
        } else {
          console.log('⚠️ [loadDadosPedido] Requisição não tem destino_almoxarifado_id. Buscando através dos itens...');
          // Se não tem na requisição, buscar nos itens
          const requisicaoItens = await EntityService.list<any>({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany.id,
            filters: { requisicao_id: requisicao.id },
            skipCompanyFilter: true
          });

          console.log('📦 [loadDadosPedido] Itens da requisição encontrados:', requisicaoItens.data?.length || 0);
          console.log('📋 [loadDadosPedido] Dados dos itens da requisição (primeiros 3):', requisicaoItens.data?.slice(0, 3).map((ri: any) => ({
            material_id: ri.material_id,
            almoxarifado_id: ri.almoxarifado_id,
            quantidade: ri.quantidade
          })));

          if (requisicaoItens.data && requisicaoItens.data.length > 0) {
            // Criar mapa de material_id -> almoxarifado_id
            const almoxarifadoMap = new Map<string, string>();
            requisicaoItens.data.forEach((ri: any) => {
              if (ri.almoxarifado_id && ri.material_id) {
                almoxarifadoMap.set(ri.material_id, ri.almoxarifado_id);
                console.log('🗺️ [loadDadosPedido] Mapeamento requisicao_item:', ri.material_id, '->', ri.almoxarifado_id);
              } else {
                console.log('⚠️ [loadDadosPedido] Item da requisição sem almoxarifado_id ou material_id:', {
                  material_id: ri.material_id,
                  almoxarifado_id: ri.almoxarifado_id
                });
              }
            });

            console.log('🗺️ [loadDadosPedido] Mapa de almoxarifados criado com', almoxarifadoMap.size, 'entradas');

            // Buscar almoxarifado_id usando os itens da entrada já carregados
            // O material_equipamento_id em entrada_itens é o mesmo que material_id em pedido_itens
            let primeiroAlmoxarifadoId: string | null = null;
            
            // Tentar encontrar usando os itens da entrada (já carregados)
            if (itens.length > 0) {
              console.log('🔍 [loadDadosPedido] Buscando almoxarifado através dos itens da entrada:', itens.map((i: any) => i.material_equipamento_id));
              for (const itemEntrada of itens) {
                if (itemEntrada.material_equipamento_id) {
                  primeiroAlmoxarifadoId = almoxarifadoMap.get(itemEntrada.material_equipamento_id) || null;
                  if (primeiroAlmoxarifadoId) {
                    console.log('✅ [loadDadosPedido] Almoxarifado encontrado via item da entrada:', {
                      material_equipamento_id: itemEntrada.material_equipamento_id,
                      almoxarifado_id: primeiroAlmoxarifadoId
                    });
                    break;
                  } else {
                    console.log('⚠️ [loadDadosPedido] Material da entrada não encontrado no mapa:', itemEntrada.material_equipamento_id);
                  }
                }
              }
            }

            // Se não encontrou pelos itens da entrada, tentar pelos itens do pedido
            if (!primeiroAlmoxarifadoId) {
              const pedidoItens = await EntityService.list<any>({
                schema: 'compras',
                table: 'pedido_itens',
                companyId: selectedCompany.id,
                filters: { pedido_id: pedidoId },
                skipCompanyFilter: true
              });

              console.log('📦 [loadDadosPedido] Itens do pedido encontrados:', pedidoItens.data?.length || 0);
              console.log('📋 [loadDadosPedido] Material IDs dos itens do pedido:', pedidoItens.data?.map((pi: any) => pi.material_id));

              if (pedidoItens.data && pedidoItens.data.length > 0) {
                // Tentar encontrar o almoxarifado do primeiro item do pedido
                for (const pedidoItem of pedidoItens.data) {
                  primeiroAlmoxarifadoId = almoxarifadoMap.get(pedidoItem.material_id) || null;
                  if (primeiroAlmoxarifadoId) {
                    console.log('✅ [loadDadosPedido] Almoxarifado encontrado via pedido:', {
                      material_id: pedidoItem.material_id,
                      almoxarifado_id: primeiroAlmoxarifadoId
                    });
                    break;
                  } else {
                    console.log('⚠️ [loadDadosPedido] Material do pedido não encontrado no mapa:', pedidoItem.material_id);
                  }
                }
              }
            }

            // Se ainda não encontrou, usar o primeiro almoxarifado disponível no mapa
            if (!primeiroAlmoxarifadoId && almoxarifadoMap.size > 0) {
              primeiroAlmoxarifadoId = Array.from(almoxarifadoMap.values())[0];
              console.log('✅ [loadDadosPedido] Usando primeiro almoxarifado disponível no mapa:', primeiroAlmoxarifadoId);
            }

            // Se ainda não encontrou, tentar buscar através do estoque_atual do material
            if (!primeiroAlmoxarifadoId && itens.length > 0) {
              console.log('🔍 [loadDadosPedido] Tentando buscar almoxarifado através do estoque do material...');
              for (const itemEntrada of itens) {
                if (itemEntrada.material_equipamento_id) {
                  try {
                    // Buscar estoque_atual do material para ver onde ele está armazenado
                    // Nota: estoque_atual não tem company_id diretamente, mas o material_equipamento_id já está vinculado à empresa
                    const estoqueData = await EntityService.list<any>({
                      schema: 'almoxarifado',
                      table: 'estoque_atual',
                      companyId: selectedCompany.id,
                      filters: { material_equipamento_id: itemEntrada.material_equipamento_id },
                      skipCompanyFilter: true // estoque_atual não tem company_id, mas o material já está filtrado
                    });

                    console.log('📊 [loadDadosPedido] Dados do estoque encontrados:', estoqueData.data?.length || 0);

                    if (estoqueData.data && estoqueData.data.length > 0) {
                      // Pegar o primeiro almoxarifado onde o material está armazenado
                      primeiroAlmoxarifadoId = estoqueData.data[0]?.almoxarifado_id || null;
                      if (primeiroAlmoxarifadoId) {
                        console.log('✅ [loadDadosPedido] Almoxarifado encontrado via estoque do material:', {
                          material_equipamento_id: itemEntrada.material_equipamento_id,
                          almoxarifado_id: primeiroAlmoxarifadoId
                        });
                        break;
                      }
                    } else {
                      console.log('⚠️ [loadDadosPedido] Nenhum estoque encontrado para o material:', itemEntrada.material_equipamento_id);
                    }
                  } catch (error) {
                    console.warn('⚠️ [loadDadosPedido] Erro ao buscar estoque do material:', error);
                  }
                }
              }
            }

            // Se ainda não encontrou, usar o primeiro almoxarifado ativo da empresa como fallback
            if (!primeiroAlmoxarifadoId) {
              console.log('🔍 [loadDadosPedido] Tentando buscar primeiro almoxarifado ativo da empresa...');
              try {
                const almoxarifadosData = await EntityService.list<any>({
                  schema: 'almoxarifado',
                  table: 'almoxarifados',
                  companyId: selectedCompany.id,
                  filters: {},
                  skipCompanyFilter: true,
                  pageSize: 10
                });

                if (almoxarifadosData.data && almoxarifadosData.data.length > 0) {
                  // Filtrar apenas os ativos no frontend
                  const almoxarifadoAtivo = almoxarifadosData.data.find((a: any) => a.ativo === true) || almoxarifadosData.data[0];
                  primeiroAlmoxarifadoId = almoxarifadoAtivo?.id || null;
                  if (primeiroAlmoxarifadoId) {
                    console.log('✅ [loadDadosPedido] Usando primeiro almoxarifado ativo da empresa como fallback:', primeiroAlmoxarifadoId);
                  }
                }
              } catch (error) {
                console.warn('⚠️ [loadDadosPedido] Erro ao buscar almoxarifados da empresa:', error);
              }
            }

            // Atualizar formData com almoxarifado_id se encontrado
            if (primeiroAlmoxarifadoId) {
              setFormData(prev => {
                console.log('✅ [loadDadosPedido] Atualizando formData com almoxarifado_id:', primeiroAlmoxarifadoId);
                return { ...prev, almoxarifado_id: primeiroAlmoxarifadoId || '' };
              });
            } else {
              console.warn('⚠️ [loadDadosPedido] Nenhum almoxarifado encontrado após todos os fallbacks');
              console.warn('⚠️ [loadDadosPedido] Verifique se a requisição tem destino_almoxarifado_id ou se os itens têm almoxarifado_id preenchido');
            }
          } else {
            console.warn('⚠️ [loadDadosPedido] Nenhum item da requisição encontrado');
          }
        }
      }
    } catch (error) {
      console.error('❌ [loadDadosPedido] Erro ao carregar dados do pedido:', error);
      // Não mostrar erro ao usuário, pois não é crítico
    }
  };

  const adicionarItem = () => {
    const novoItem: EntradaItem = {
      id: Date.now().toString(),
      material_equipamento_id: '',
      quantidade_recebida: 1,
      quantidade_aprovada: 0,
      valor_unitario: 0,
      valor_total: 0,
      centro_custo_id: '',
      projeto_id: '',
      almoxarifado_id: formData.almoxarifado_id || '',
      lote: '',
      validade: '',
      observacoes: '',
      em_quarentena: false,
    };
    setItens([...itens, novoItem]);
  };

  const removerItem = (itemId: string) => {
    setItens(itens.filter(item => item.id !== itemId));
  };

  const atualizarItem = (itemId: string, campo: keyof EntradaItem, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === itemId) {
        const itemAtualizado = { ...item, [campo]: valor };
        
        // Calcular valor total quando quantidade ou valor unitário mudar
        if (campo === 'quantidade_recebida' || campo === 'valor_unitario') {
          itemAtualizado.valor_total = itemAtualizado.quantidade_recebida * itemAtualizado.valor_unitario;
        }
        
        return itemAtualizado;
      }
      return item;
    }));
  };

  const calcularValorTotal = () => {
    return itens.reduce((total, item) => total + item.valor_total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.fornecedor_id && !entradaParaEditar) {
      toast.error('Selecione um fornecedor');
      return;
    }

    // No modo "Confirmar recebimento" (entradaParaEditar), Dados Gerais obrigatórios
    if (entradaParaEditar) {
      if (!formData.numero_nota?.trim()) {
        toast.error('Informe o número da nota');
        return;
      }
      if (!formData.serie_nota_fiscal?.trim()) {
        toast.error('Informe a série da nota fiscal');
        return;
      }
      if (!formData.tipo_documento_fiscal?.trim()) {
        toast.error('Selecione o tipo de documento fiscal');
        return;
      }
      if (!formData.chave_acesso?.trim()) {
        toast.error('Informe a chave de acesso');
        return;
      }
    } else {
      if (!formData.numero_nota?.trim()) {
        toast.error('Informe o número da nota');
        return;
      }
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    // Validar itens
    for (const item of itens) {
      const incluirEste = incluirNaEntradaAgora[item.id] !== false;
      const itemReadOnly = !!item.entrada_estoque_em;

      if (!item.material_equipamento_id) {
        toast.error('Selecione o material para todos os itens');
        return;
      }
      if (item.quantidade_recebida <= 0) {
        toast.error('A quantidade recebida deve ser maior que zero');
        return;
      }
      if (item.valor_unitario < 0) {
        toast.error('O valor unitário não pode ser negativo');
        return;
      }

      // Quando "Incluir na Entrada Agora" está marcado (modo confirmar recebimento, item não read-only)
      if (entradaParaEditar && incluirEste && !itemReadOnly) {
        if (!item.validade?.trim()) {
          toast.error(`Informe a validade do item "${getMaterialNome(item.material_equipamento_id) || 'item'}"`);
          return;
        }
        // Checklist de Recebimento: todos os critérios devem estar respondidos para este item
        if (criterios.length > 0) {
          const itemChecklist = checklistItems.filter((ci) => ci.item_id === item.id);
          const criteriosRespondidos = new Set(itemChecklist.map((ci) => ci.criterio));
          const faltando = criterios.filter((c) => !criteriosRespondidos.has(c.nome));
          if (faltando.length > 0) {
            const nomes = faltando.map((c) => c.nome).join(', ');
            toast.error(`Conclua o checklist de recebimento do item "${getMaterialNome(item.material_equipamento_id) || 'item'}": ${nomes}`);
            return;
          }
        }
      }
    }

    try {
      setLoading(true);

      if (entradaParaEditar) {
        // Atualizar entrada existente (confirmar pré-entrada)
        const entradaData: any = {
          numero_nota: formData.numero_nota || null,
          serie_nota_fiscal: formData.serie_nota_fiscal || null,
          tipo_documento_fiscal: formData.tipo_documento_fiscal || null,
          chave_acesso: formData.chave_acesso || null,
          data_entrada: formData.data_entrada,
          valor_total: calcularValorTotal(),
          // Após checklist concluído no modal, a entrada já está inspecionada.
          // Atualizar diretamente para "aprovado" e marcar checklist_aprovado.
          status: 'aprovado',
          checklist_aprovado: true,
          observacoes: formData.observacoes || null,
        };

        await updateEntrada.mutateAsync({
          id: entradaParaEditar.id,
          data: entradaData
        });

        // Atualizar itens da entrada e dar entrada no estoque para itens não quarentena
        if (!selectedCompany?.id || !user?.id) {
          throw new Error('Empresa ou usuário não identificado');
        }

        const now = new Date().toISOString();

        for (const item of itens) {
          const emQuarentena = item.em_quarentena ?? false;
          const qtdAprovada = (item.quantidade_aprovada ?? 0) || item.quantidade_recebida || 0;
          const jaDeuEntrada = !!item.entrada_estoque_em;
          const incluirEste = incluirNaEntradaAgora[item.id] !== false;
          const deveDarEntrada = incluirEste && !emQuarentena && qtdAprovada > 0 && !!item.almoxarifado_id && !jaDeuEntrada;

          await EntityService.update<any>({
            schema: 'almoxarifado',
            table: 'entrada_itens',
            companyId: selectedCompany.id,
            id: item.id,
            data: {
              quantidade_recebida: item.quantidade_recebida,
              quantidade_aprovada: deveDarEntrada ? qtdAprovada : (incluirEste ? (item.quantidade_aprovada ?? qtdAprovada) : 0),
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              centro_custo_id: item.centro_custo_id || null,
              projeto_id: item.projeto_id || null,
              almoxarifado_id: item.almoxarifado_id || null,
              lote: item.lote || null,
              validade: item.validade || null,
              observacoes: item.observacoes || null,
              em_quarentena: emQuarentena,
              quarentena_motivo: item.quarentena_motivo || null,
              quarentena_em: emQuarentena ? (item.quarentena_em || now) : null,
              quarentena_retirada_em: item.quarentena_retirada_em || null,
              entrada_estoque_em: deveDarEntrada ? now : (item.entrada_estoque_em || null),
            },
            skipCompanyFilter: true
          });

          if (deveDarEntrada) {
            const listEstoque = await EntityService.list<any>({
              schema: 'almoxarifado',
              table: 'estoque_atual',
              companyId: selectedCompany.id,
              filters: { material_equipamento_id: item.material_equipamento_id, almoxarifado_id: item.almoxarifado_id },
            });
            const rowEstoque = listEstoque.data?.[0];
            const valorTotalItem = Number(item.valor_total) || (Number(item.valor_unitario) || 0) * qtdAprovada;

            if (rowEstoque) {
              await EntityService.update<any>({
                schema: 'almoxarifado',
                table: 'estoque_atual',
                companyId: selectedCompany.id,
                id: rowEstoque.id,
                data: {
                  quantidade_atual: (rowEstoque.quantidade_atual ?? 0) + qtdAprovada,
                  valor_total: (Number(rowEstoque.valor_total) || 0) + valorTotalItem,
                },
                skipCompanyFilter: true,
              });
            } else {
              await EntityService.create<any>({
                schema: 'almoxarifado',
                table: 'estoque_atual',
                companyId: selectedCompany.id,
                data: {
                  material_equipamento_id: item.material_equipamento_id,
                  almoxarifado_id: item.almoxarifado_id,
                  quantidade_atual: qtdAprovada,
                  quantidade_reservada: 0,
                  valor_total: valorTotalItem,
                },
              });
            }

            await EntityService.create<any>({
              schema: 'almoxarifado',
              table: 'movimentacoes_estoque',
              companyId: selectedCompany.id,
              data: {
                company_id: selectedCompany.id,
                material_equipamento_id: item.material_equipamento_id,
                almoxarifado_origem_id: null,
                almoxarifado_destino_id: item.almoxarifado_id,
                tipo_movimentacao: 'entrada',
                quantidade: qtdAprovada,
                valor_unitario: item.valor_unitario ?? null,
                valor_total: item.valor_total ?? null,
                centro_custo_id: item.centro_custo_id || null,
                projeto_id: item.projeto_id || null,
                observacoes: `Entrada ${entradaParaEditar.id} - Confirmação de recebimento`,
                usuario_id: user.id,
                status: 'confirmado',
              },
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'estoque_atual'] });
        toast.success('Recebimento confirmado. Itens não quarentena foram lançados no estoque.');
        onSuccess?.(entradaParaEditar.id);
        onClose();
        return;
      }

      // Criar nova entrada manual
      const entradaData: any = {
        fornecedor_id: formData.fornecedor_id || null,
        numero_nota: formData.numero_nota,
        serie_nota_fiscal: formData.serie_nota_fiscal || null,
        tipo_documento_fiscal: formData.tipo_documento_fiscal || null,
        chave_acesso: formData.chave_acesso || null,
        data_entrada: formData.data_entrada,
        valor_total: calcularValorTotal(),
        status: 'pendente',
        observacoes: formData.observacoes || null,
      };

      const entrada = await createEntrada.mutateAsync(entradaData);

      // Criar itens da entrada usando EntityService
      if (itens.length > 0) {
        if (!selectedCompany?.id) {
          throw new Error('Empresa não selecionada');
        }

        for (const item of itens) {
          await EntityService.create<any>({
            schema: 'almoxarifado',
            table: 'entrada_itens',
            companyId: selectedCompany.id,
            data: {
              entrada_id: entrada.id,
              material_equipamento_id: item.material_equipamento_id,
              quantidade_recebida: item.quantidade_recebida,
              quantidade_aprovada: item.quantidade_aprovada,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              centro_custo_id: item.centro_custo_id || null,
              projeto_id: item.projeto_id || null,
              almoxarifado_id: item.almoxarifado_id || null,
              lote: item.lote || null,
              validade: item.validade || null,
              observacoes: item.observacoes || null,
              company_id: selectedCompany.id,
            },
            skipCompanyFilter: true // A tabela não tem company_id diretamente, mas incluímos no data
          });
        }
      }

      toast.success('Entrada criada com sucesso!');
      onSuccess?.(entrada.id);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar entrada:', error);
      toast.error(error?.message || 'Erro ao criar entrada');
    } finally {
      setLoading(false);
    }
  };

  /** Retira o item da quarentena e lança a quantidade aprovada no estoque. */
  const retirarDaQuarentena = async (item: EntradaItem) => {
    if (!entradaParaEditar || !selectedCompany?.id || !user?.id) {
      toast.error('Dados incompletos para retirar da quarentena');
      return;
    }
    if (!item.almoxarifado_id) {
      toast.error('Item sem almoxarifado de destino definido');
      return;
    }
    const qtd = item.quantidade_aprovada || 0;
    if (qtd <= 0) {
      toast.error('Quantidade aprovada deve ser maior que zero para lançar no estoque');
      return;
    }
    setRetirarQuarentenaLoading(item.id);
    try {
      const now = new Date().toISOString();
      await EntityService.update<any>({
        schema: 'almoxarifado',
        table: 'entrada_itens',
        companyId: selectedCompany.id,
        id: item.id,
        data: {
          em_quarentena: false,
          quarentena_retirada_em: now,
          entrada_estoque_em: now,
        },
        skipCompanyFilter: true,
      });
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, em_quarentena: false, quarentena_retirada_em: now, entrada_estoque_em: now } : i));

      const listEstoque = await EntityService.list<any>({
        schema: 'almoxarifado',
        table: 'estoque_atual',
        companyId: selectedCompany.id,
        filters: { material_equipamento_id: item.material_equipamento_id, almoxarifado_id: item.almoxarifado_id },
      });
      const rowEstoque = listEstoque.data?.[0];
      const valorTotalItem = Number(item.valor_total) || (Number(item.valor_unitario) || 0) * qtd;

      if (rowEstoque) {
        await EntityService.update<any>({
          schema: 'almoxarifado',
          table: 'estoque_atual',
          companyId: selectedCompany.id,
          id: rowEstoque.id,
          data: {
            quantidade_atual: (rowEstoque.quantidade_atual ?? 0) + qtd,
            valor_total: (Number(rowEstoque.valor_total) || 0) + valorTotalItem,
          },
        });
      } else {
        await EntityService.create<any>({
          schema: 'almoxarifado',
          table: 'estoque_atual',
          companyId: selectedCompany.id,
          data: {
            material_equipamento_id: item.material_equipamento_id,
            almoxarifado_id: item.almoxarifado_id,
            quantidade_atual: qtd,
            quantidade_reservada: 0,
            valor_total: valorTotalItem,
          },
        });
      }

      await EntityService.create<any>({
        schema: 'almoxarifado',
        table: 'movimentacoes_estoque',
        companyId: selectedCompany.id,
        data: {
          company_id: selectedCompany.id,
          material_equipamento_id: item.material_equipamento_id,
          almoxarifado_origem_id: null,
          almoxarifado_destino_id: item.almoxarifado_id,
          tipo_movimentacao: 'entrada',
          quantidade: qtd,
          valor_unitario: item.valor_unitario ?? null,
          valor_total: item.valor_total ?? null,
          centro_custo_id: item.centro_custo_id || null,
          projeto_id: item.projeto_id || null,
          observacoes: `Liberado da quarentena - Entrada ${entradaParaEditar.id}`,
          usuario_id: user.id,
          status: 'confirmado',
        },
      });

      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'estoque_atual'] });
      toast.success('Item retirado da quarentena e quantidade lançada no estoque.');
    } catch (err: any) {
      console.error('Erro ao retirar da quarentena:', err);
      toast.error(err?.message || 'Erro ao retirar da quarentena');
    } finally {
      setRetirarQuarentenaLoading(null);
    }
  };

  const getMaterialNome = (materialId: string) => {
    const material = materiais.find(m => m.id === materialId);
    return material ? `${material.codigo_interno} - ${material.nome}` : '';
  };

  const getFornecedorNome = (fornecedorId: string) => {
    const fornecedor = fornecedores.find((f: any) => f.id === fornecedorId);
    return fornecedor ? fornecedor.nome_fantasia || fornecedor.razao_social : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            {entradaParaEditar ? 'Confirmar recebimento de materiais' : 'Nova Entrada de Materiais'}
          </DialogTitle>
          <DialogDescription>
            {entradaParaEditar 
              ? 'Marque apenas os itens que chegaram nesta remessa. Itens desmarcados poderão ser confirmados depois (entrada parcial).'
              : 'Preencha os dados da entrada de materiais no almoxarifado'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!entradaParaEditar && (
                  <div className="space-y-2">
                    <Label htmlFor="fornecedor_id">Fornecedor *</Label>
                    <Select
                      value={formData.fornecedor_id}
                      onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((fornecedor: any) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome_fantasia || fornecedor.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="numero_nota">Número da Nota *</Label>
                  <Input
                    id="numero_nota"
                    value={formData.numero_nota}
                    onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                    placeholder="Número da nota fiscal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serie_nota_fiscal">Série da Nota Fiscal {entradaParaEditar ? '*' : ''}</Label>
                  <Input
                    id="serie_nota_fiscal"
                    value={formData.serie_nota_fiscal}
                    onChange={(e) => setFormData({ ...formData, serie_nota_fiscal: e.target.value })}
                    placeholder="Ex.: 1, 2"
                    required={!!entradaParaEditar}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_documento_fiscal">Tipo de Documento Fiscal {entradaParaEditar ? '*' : ''}</Label>
                  <Select
                    value={formData.tipo_documento_fiscal || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, tipo_documento_fiscal: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="NF-e">NF-e</SelectItem>
                      <SelectItem value="NFC-e">NFC-e</SelectItem>
                      <SelectItem value="CT-e">CT-e</SelectItem>
                      <SelectItem value="NF">NF (modelo 1/1A)</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chave_acesso">Chave de acesso {entradaParaEditar ? '*' : ''}</Label>
                  <Input
                    id="chave_acesso"
                    value={formData.chave_acesso}
                    onChange={(e) => setFormData({ ...formData, chave_acesso: e.target.value.replace(/\D/g, '').slice(0, 44) })}
                    placeholder="44 dígitos da chave NF-e"
                    maxLength={44}
                    required={!!entradaParaEditar}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_entrada">Data de Entrada *</Label>
                  <Input
                    id="data_entrada"
                    type="date"
                    value={formData.data_entrada}
                    onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                    required
                  />
                </div>

                {entradaParaEditar && (
                  <div className="space-y-2">
                    <Label htmlFor="almoxarifado_id">Almoxarifado</Label>
                    <Select
                      value={formData.almoxarifado_id || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, almoxarifado_id: value === 'none' ? '' : value })}
                      disabled
                    >
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue placeholder={formData.almoxarifado_id ? undefined : "Carregando almoxarifado..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {almoxarifados.map((almox: any) => (
                          <SelectItem key={almox.id} value={almox.id}>
                            {almox.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações adicionais sobre a entrada"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Itens da Entrada</CardTitle>
                <Button type="button" onClick={adicionarItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                </div>
              ) : (
                <>
                  <Accordion type="multiple" className="w-full space-y-2">
                    {itens.map((item, index) => {
                      const itemReadOnly = !!item.entrada_estoque_em;
                      const nomeItem = item.material_equipamento_id ? getMaterialNome(item.material_equipamento_id) : `Item ${index + 1}`;
                      return (
                        <AccordionItem
                          key={item.id}
                          value={item.id}
                          className={cn('border rounded-lg px-4 bg-card', itemReadOnly && 'opacity-95 bg-muted/30')}
                        >
                          <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                            <div className="flex flex-1 items-center justify-between gap-4 text-left flex-wrap">
                              <span className="font-medium text-sm">{nomeItem}</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {itemReadOnly ? (
                                  <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                    <CheckCircle className="h-3 w-3" />
                                    Entrada lançada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 dark:text-amber-300">
                                    <Clock className="h-3 w-3" />
                                    Pendente
                                  </Badge>
                                )}
                                {entradaParaEditar && !itemReadOnly && (
                                  <label
                                    className="flex items-center gap-2 cursor-pointer text-sm font-medium text-primary"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={incluirNaEntradaAgora[item.id] !== false}
                                      onChange={(e) =>
                                        setIncluirNaEntradaAgora((prev) => ({ ...prev, [item.id]: e.target.checked }))
                                      }
                                      className="rounded border-gray-300"
                                    />
                                    Incluir na entrada agora
                                  </label>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-4">
                            <div className="flex justify-end mb-2">
                              {!itemReadOnly && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerItem(item.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remover item
                                </Button>
                              )}
                            </div>
                            <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Material *</Label>
                            <Popover
                              open={materialOpen[item.id] || false}
                              onOpenChange={(open) =>
                                setMaterialOpen({ ...materialOpen, [item.id]: open })
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                  disabled={itemReadOnly}
                                >
                                  {item.material_equipamento_id
                                    ? getMaterialNome(item.material_equipamento_id)
                                    : 'Selecione o material...'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar material..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum material encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {materiais.map((material) => (
                                        <CommandItem
                                          key={material.id}
                                          value={material.id}
                                          onSelect={() => {
                                            atualizarItem(item.id, 'material_equipamento_id', material.id);
                                            setMaterialOpen({ ...materialOpen, [item.id]: false });
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              item.material_equipamento_id === material.id
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                          {material.codigo_interno} - {material.nome}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label>Quantidade Recebida *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade_recebida}
                              onChange={(e) =>
                                atualizarItem(item.id, 'quantidade_recebida', parseFloat(e.target.value) || 0)
                              }
                              required
                              disabled={itemReadOnly}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Valor Unitário (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.valor_unitario}
                              onChange={(e) =>
                                atualizarItem(item.id, 'valor_unitario', parseFloat(e.target.value) || 0)
                              }
                              disabled={itemReadOnly}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Valor Total (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valor_total}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Centro de Custo</Label>
                            <Select
                              value={item.centro_custo_id || 'none'}
                              onValueChange={(value) =>
                                atualizarItem(item.id, 'centro_custo_id', value === 'none' ? undefined : value)
                              }
                              disabled={!!entradaParaEditar || itemReadOnly}
                            >
                              <SelectTrigger className={entradaParaEditar ? 'bg-gray-50' : ''}>
                                <SelectValue placeholder="Selecione o centro de custo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {costCenters.map((cc) => (
                                  <SelectItem key={cc.id} value={cc.id}>
                                    {cc.codigo} - {cc.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Projeto</Label>
                            <Select
                              value={item.projeto_id || 'none'}
                              onValueChange={(value) =>
                                atualizarItem(item.id, 'projeto_id', value === 'none' ? undefined : value)
                              }
                              disabled={!!entradaParaEditar || itemReadOnly}
                            >
                              <SelectTrigger className={entradaParaEditar ? 'bg-gray-50' : ''}>
                                <SelectValue placeholder="Selecione o projeto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Almoxarifado (destino do item)</Label>
                            <Select
                              value={item.almoxarifado_id || 'none'}
                              onValueChange={(value) =>
                                atualizarItem(item.id, 'almoxarifado_id', value === 'none' ? '' : value)
                              }
                              disabled={itemReadOnly || !!entradaParaEditar}
                            >
                              <SelectTrigger className={entradaParaEditar ? 'bg-muted' : ''}>
                                <SelectValue placeholder="Selecione o almoxarifado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {almoxarifados.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Lote</Label>
                            <Input
                              value={item.lote || ''}
                              onChange={(e) =>
                                atualizarItem(item.id, 'lote', e.target.value || undefined)
                              }
                              placeholder="Número do lote"
                              disabled={itemReadOnly}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Validade
                              {entradaParaEditar && !itemReadOnly && incluirNaEntradaAgora[item.id] !== false && ' *'}
                            </Label>
                            <Input
                              type="date"
                              value={item.validade || ''}
                              onChange={(e) =>
                                atualizarItem(item.id, 'validade', e.target.value || undefined)
                              }
                              disabled={itemReadOnly}
                              required={!!entradaParaEditar && !itemReadOnly && incluirNaEntradaAgora[item.id] !== false}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Observações do Item</Label>
                          <Textarea
                            value={item.observacoes || ''}
                            onChange={(e) =>
                              atualizarItem(item.id, 'observacoes', e.target.value || undefined)
                            }
                            placeholder="Observações sobre este item"
                            rows={2}
                            disabled={itemReadOnly}
                          />
                        </div>

                        {/* Checklist de Recebimento (por item) - apenas no modal Confirmar Recebimento */}
                        {entradaParaEditar && criterios.length > 0 && !itemReadOnly && (
                          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <ClipboardCheck className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold tracking-tight">
                                  Checklist de Recebimento
                                  {incluirNaEntradaAgora[item.id] !== false && ' *'}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {incluirNaEntradaAgora[item.id] !== false
                                    ? 'Obrigatório quando "Incluir na entrada agora" está marcado. Avalie cada critério.'
                                    : 'Avalie cada critério para este item'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {criterios.map((criterio) => {
                                const itemChecklist = checklistItems.filter((ci) => ci.item_id === item.id);
                                const checklistItem = itemChecklist.find((ci) => ci.criterio === criterio.nome);
                                const isConforme = checklistItem == null ? null : checklistItem.aprovado;
                                const isNaoConforme = checklistItem != null && !checklistItem.aprovado;
                                return (
                                  <div
                                    key={criterio.id}
                                    className={cn(
                                      'rounded-lg border bg-card p-4 transition-colors',
                                      isConforme === true && 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20',
                                      isNaoConforme && 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/20'
                                    )}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium text-foreground">{criterio.nome}</span>
                                        {criterio.obrigatorio && (
                                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                            Obrigatório
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              if (checklistItem) {
                                                await updateChecklistItem(checklistItem.id, {
                                                  aprovado: true,
                                                  observacoes: undefined,
                                                });
                                              } else {
                                                if (!user?.id) {
                                                  toast.error('Usuário não identificado');
                                                  return;
                                                }
                                                await createChecklistItem({
                                                  entrada_id: entradaParaEditar.id,
                                                  item_id: item.id,
                                                  criterio: criterio.nome,
                                                  aprovado: true,
                                                  usuario_id: user.id,
                                                });
                                              }
                                            } catch (err) {
                                              console.error('Erro ao atualizar checklist:', err);
                                              toast.error('Erro ao atualizar checklist');
                                            }
                                          }}
                                          className={cn(
                                            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            isConforme === true
                                              ? 'border-green-500 bg-green-600 text-white shadow-sm hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
                                              : 'border-border bg-background text-green-700 hover:bg-green-50 hover:border-green-300 dark:text-green-400 dark:hover:bg-green-950/30 dark:hover:border-green-700'
                                          )}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                          Conforme
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              if (checklistItem) {
                                                await updateChecklistItem(checklistItem.id, {
                                                  aprovado: false,
                                                });
                                              } else {
                                                if (!user?.id) {
                                                  toast.error('Usuário não identificado');
                                                  return;
                                                }
                                                await createChecklistItem({
                                                  entrada_id: entradaParaEditar.id,
                                                  item_id: item.id,
                                                  criterio: criterio.nome,
                                                  aprovado: false,
                                                  usuario_id: user.id,
                                                });
                                              }
                                            } catch (err) {
                                              console.error('Erro ao atualizar checklist:', err);
                                              toast.error('Erro ao atualizar checklist');
                                            }
                                          }}
                                          className={cn(
                                            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            isNaoConforme
                                              ? 'border-red-500 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                                              : 'border-border bg-background text-red-700 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:border-red-700'
                                          )}
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Não Conforme
                                        </button>
                                      </div>
                                    </div>
                                    {isNaoConforme && (
                                      <div className="mt-4 pt-4 border-t border-red-200/50 dark:border-red-800/30">
                                        <Label htmlFor={`motivo-${item.id}-${criterio.id}`} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                                          <XCircle className="h-3.5 w-3.5" />
                                          Motivo (obrigatório quando não conforme)
                                        </Label>
                                        <Textarea
                                          id={`motivo-${item.id}-${criterio.id}`}
                                          className="min-h-[88px] rounded-lg border-red-200/70 bg-background focus-visible:ring-red-500/30 dark:border-red-800/50"
                                          placeholder="Descreva o motivo da não conformidade..."
                                          defaultValue={checklistItem?.observacoes ?? ''}
                                          onBlur={async (e) => {
                                            const motivo = e.target.value?.trim() ?? '';
                                            if (checklistItem && motivo !== (checklistItem.observacoes ?? '')) {
                                              try {
                                                await updateChecklistItem(checklistItem.id, { observacoes: motivo || undefined });
                                              } catch (err) {
                                                console.error('Erro ao salvar motivo:', err);
                                                toast.error('Erro ao salvar motivo');
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quarentena: exibida quando há "Não Conforme" no checklist ou item já está/esteve em quarentena */}
                        {entradaParaEditar && (() => {
                          if (itemReadOnly) return null;
                          const itemChecklistForItem = checklistItems.filter((ci) => ci.item_id === item.id);
                          const hasNaoConforme = itemChecklistForItem.some((ci) => !ci.aprovado);
                          const showQuarentenaSection = hasNaoConforme || item.em_quarentena || item.quarentena_retirada_em;
                          if (!showQuarentenaSection) return null;
                          return (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              <Label className="text-sm font-semibold flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Quarentena
                              </Label>
                              {item.em_quarentena && !item.quarentena_retirada_em ? (
                                <div className="space-y-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 dark:bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                                      <ShieldAlert className="h-3 w-3" /> Em quarentena
                                    </span>
                                    {item.quarentena_motivo && (
                                      <span className="text-sm text-muted-foreground">
                                        Motivo: {item.quarentena_motivo}
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                    disabled={!!retirarQuarentenaLoading || (item.quantidade_aprovada ?? 0) <= 0 || !item.almoxarifado_id}
                                    onClick={() => retirarDaQuarentena(item)}
                                  >
                                    {retirarQuarentenaLoading === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <ShieldCheck className="h-4 w-4 mr-2" />
                                    )}
                                    Retirar da quarentena e lançar no estoque
                                  </Button>
                                </div>
                              ) : item.quarentena_retirada_em ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3 text-green-600" />
                                  Liberado da quarentena
                                </p>
                              ) : hasNaoConforme ? (
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.em_quarentena ?? false}
                                      onChange={(e) =>
                                        atualizarItem(item.id, 'em_quarentena', e.target.checked)
                                      }
                                      className="rounded border-gray-300"
                                    />
                                    <span className="text-sm">Colocar este item em quarentena</span>
                                  </label>
                                  {(item.em_quarentena ?? false) && (
                                    <Textarea
                                      value={item.quarentena_motivo || ''}
                                      onChange={(e) =>
                                        atualizarItem(item.id, 'quarentena_motivo', e.target.value || undefined)
                                      }
                                      placeholder="Motivo da quarentena"
                                      rows={2}
                                      className="mt-1"
                                    />
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>

                  {/* Resumo */}
                  <Card className="bg-gray-50">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Valor Total da Entrada:</span>
                        <span className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(calcularValorTotal())}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || itens.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {entradaParaEditar ? 'Confirmando...' : 'Criando...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {entradaParaEditar ? 'Confirmar' : 'Criar Entrada'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaEntradaModal;
