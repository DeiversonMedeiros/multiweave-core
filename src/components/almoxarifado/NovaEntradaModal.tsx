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
import { Plus, X, Loader2, Trash2, Calculator, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateEntradaMaterial, useUpdateEntradaMaterial } from '@/hooks/almoxarifado/useEntradasMateriaisQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useActivePartners } from '@/hooks/usePartners';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

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
  lote?: string;
  validade?: string;
  observacoes?: string;
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
    data_entrada: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [itens, setItens] = useState<EntradaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialOpen, setMaterialOpen] = useState<{ [key: string]: boolean }>({});

  const createEntrada = useCreateEntradaMaterial();
  const updateEntrada = useUpdateEntradaMaterial();
  const { data: materiais = [] } = useMateriaisEquipamentos();
  const { data: partnersData } = useActivePartners();
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  const { data: almoxarifadosData } = useAlmoxarifados();

  const partners = partnersData?.data || [];
  const fornecedores = partners.filter((p: any) => 
    Array.isArray(p.tipo) && p.tipo.includes('fornecedor')
  );
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];
  const almoxarifados = almoxarifadosData?.data || [];

  useEffect(() => {
    if (isOpen) {
      if (entradaParaEditar) {
        // Carregar dados da pré-entrada para edição
        setFormData({
          fornecedor_id: entradaParaEditar.fornecedor_id || '',
          almoxarifado_id: '',
          numero_nota: entradaParaEditar.numero_nota || '',
          data_entrada: entradaParaEditar.data_entrada || new Date().toISOString().split('T')[0],
          observacoes: entradaParaEditar.observacoes || '',
        });
        
        // Carregar itens da entrada e buscar dados do pedido/requisição
        loadEntradaItens(entradaParaEditar.id).then(() => {
          if (entradaParaEditar.pedido_id) {
            loadDadosPedido(entradaParaEditar.pedido_id);
          }
        });
      } else {
        // Resetar formulário quando abrir para nova entrada
        setFormData({
          fornecedor_id: '',
          almoxarifado_id: '',
          numero_nota: '',
          data_entrada: new Date().toISOString().split('T')[0],
          observacoes: '',
        });
        setItens([]);
      }
    }
  }, [isOpen, entradaParaEditar]);

  const loadEntradaItens = async (entradaId: string) => {
    if (!selectedCompany?.id) {
      console.error('Empresa não selecionada');
      return;
    }

    try {
      console.log('🔍 [loadEntradaItens] Carregando itens da entrada:', entradaId);
      
      // Usar EntityService para buscar itens
      const result = await EntityService.list<any>({
        schema: 'almoxarifado',
        table: 'entrada_itens',
        companyId: selectedCompany.id,
        filters: { entrada_id: entradaId },
        orderBy: 'created_at',
        orderDirection: 'ASC',
        skipCompanyFilter: true // A tabela não tem company_id diretamente, mas validamos via entrada_id
      });
      
      console.log('✅ [loadEntradaItens] Itens encontrados:', result.data?.length || 0);
      
      if (result.data) {
        const itensMapeados = result.data.map((item: any) => ({
          id: item.id,
          material_equipamento_id: item.material_equipamento_id,
          quantidade_recebida: item.quantidade_recebida,
          quantidade_aprovada: item.quantidade_aprovada,
          valor_unitario: item.valor_unitario || 0,
          valor_total: item.valor_total || 0,
          centro_custo_id: item.centro_custo_id || '',
          projeto_id: item.projeto_id || '',
          lote: item.lote || '',
          validade: item.validade || '',
          observacoes: item.observacoes || '',
        }));
        
        console.log('📋 [loadEntradaItens] Itens mapeados:', itensMapeados);
        setItens(itensMapeados);
      }
    } catch (error) {
      console.error('❌ [loadEntradaItens] Erro ao carregar itens da entrada:', error);
      toast.error('Erro ao carregar itens da entrada');
    }
  };

  // Buscar dados do pedido e requisição para preencher automaticamente centro_custo, projeto e almoxarifado
  const loadDadosPedido = async (pedidoId: string) => {
    if (!selectedCompany?.id) {
      return;
    }

    try {
      console.log('🔍 [loadDadosPedido] Iniciando busca de dados do pedido:', pedidoId);
      
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
          console.log('📋 [loadDadosPedido] Requisição ID do cotacao_ciclos:', requisicaoId);
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
              console.log('📋 [loadDadosPedido] Requisição ID via cotacao.cotacao_ciclo_id:', requisicaoId);
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

        // Preencher centro_custo_id e projeto_id da requisição nos itens
        setItens(prevItens => {
          const novosItens = prevItens.map(item => ({
            ...item,
            centro_custo_id: requisicao.centro_custo_id || item.centro_custo_id || '',
            projeto_id: requisicao.projeto_id || item.projeto_id || '',
          }));
          console.log('✅ [loadDadosPedido] Itens atualizados com centro_custo e projeto:', novosItens);
          return novosItens;
        });
      } else {
        console.warn('⚠️ [loadDadosPedido] Requisição não encontrada com ID:', requisicaoId);
        return;
      }

      // Buscar almoxarifado_id dos itens da requisição
      if (requisicao?.id) {
        console.log('🔍 [loadDadosPedido] Verificando destino_almoxarifado_id na requisição:', requisicao.destino_almoxarifado_id);
        
        // Primeiro, verificar se a requisição tem destino_almoxarifado_id (fallback)
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
      lote: '',
      validade: '',
      observacoes: '',
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
    if (!formData.fornecedor_id) {
      toast.error('Selecione um fornecedor');
      return;
    }

    if (!formData.numero_nota) {
      toast.error('Informe o número da nota');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    // Validar itens
    for (const item of itens) {
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
    }

    try {
      setLoading(true);

      if (entradaParaEditar) {
        // Atualizar entrada existente (confirmar pré-entrada)
        const entradaData: any = {
          numero_nota: formData.numero_nota || null,
          data_entrada: formData.data_entrada,
          valor_total: calcularValorTotal(),
          status: 'inspecao', // Muda para inspeção após confirmar recebimento
          observacoes: formData.observacoes || null,
        };

        await updateEntrada.mutateAsync({
          id: entradaParaEditar.id,
          data: entradaData
        });

        // Atualizar itens da entrada usando EntityService
        if (!selectedCompany?.id) {
          throw new Error('Empresa não selecionada');
        }

        for (const item of itens) {
          await EntityService.update<any>({
            schema: 'almoxarifado',
            table: 'entrada_itens',
            companyId: selectedCompany.id,
            id: item.id,
            data: {
              quantidade_recebida: item.quantidade_recebida,
              quantidade_aprovada: item.quantidade_aprovada,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              centro_custo_id: item.centro_custo_id || null,
              projeto_id: item.projeto_id || null,
              lote: item.lote || null,
              validade: item.validade || null,
              observacoes: item.observacoes || null,
            },
            skipCompanyFilter: true // A tabela não tem company_id diretamente
          });
        }

        toast.success('Pré-entrada confirmada com sucesso!');
        onSuccess?.(entradaParaEditar.id);
        onClose();
        return;
      }

      // Criar nova entrada manual
      const entradaData: any = {
        fornecedor_id: formData.fornecedor_id || null,
        numero_nota: formData.numero_nota,
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
            {entradaParaEditar ? 'Confirmar Recebimento de Materiais' : 'Nova Entrada de Materiais'}
          </DialogTitle>
          <DialogDescription>
            {entradaParaEditar 
              ? 'Confirme os itens recebidos e suas quantidades. Ajuste conforme necessário.'
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
                  <Label htmlFor="numero_nota">Número da Nota {entradaParaEditar ? '' : '*'}</Label>
                  <Input
                    id="numero_nota"
                    value={formData.numero_nota}
                    onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                    placeholder="Número da nota fiscal"
                    required={!entradaParaEditar}
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
                  {itens.map((item, index) => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                              disabled={!!entradaParaEditar}
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
                              disabled={!!entradaParaEditar}
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
                            <Label>Lote</Label>
                            <Input
                              value={item.lote || ''}
                              onChange={(e) =>
                                atualizarItem(item.id, 'lote', e.target.value || undefined)
                              }
                              placeholder="Número do lote"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Validade</Label>
                            <Input
                              type="date"
                              value={item.validade || ''}
                              onChange={(e) =>
                                atualizarItem(item.id, 'validade', e.target.value || undefined)
                              }
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
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

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
                  {entradaParaEditar ? 'Confirmar Recebimento' : 'Criar Entrada'}
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
