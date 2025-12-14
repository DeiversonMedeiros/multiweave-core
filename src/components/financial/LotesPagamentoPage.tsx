// =====================================================
// COMPONENTE: PÁGINA DE LOTES DE PAGAMENTO
// =====================================================
// Data: 2025-12-12
// Descrição: Página para gerenciar lotes de pagamento
// Autor: Sistema MultiWeave Core
// Módulo: M2 - Contas a Pagar

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Calendar,
  Building,
  Package,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { useLotesPagamento } from '@/hooks/financial/useLotesPagamento';
import { useContasPagar } from '@/hooks/financial/useContasPagar';
import { LotePagamento, LotePagamentoItem, LotePagamentoFormData, ContaBancaria } from '@/integrations/supabase/financial-types';
import { EntityService } from '@/services/generic/entityService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { gerarCNAB240, gerarCNAB400, gerarOFXRemessa, downloadArquivo, CNABConfig } from '@/services/bancario/cnabGenerator';
import { useCompany } from '@/lib/company-context';

interface LotesPagamentoPageProps {
  className?: string;
}

export function LotesPagamentoPage({ className }: LotesPagamentoPageProps) {
  const { selectedCompany } = useCompany();
  const { lotes, loading, createLote, updateLote, deleteLote, adicionarTitulo, removerTitulo, getItensLote, aprovarLote, rejeitarLote, refresh } = useLotesPagamento();
  const { contasPagar } = useContasPagar();
  
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LotePagamento | null>(null);
  const [loteItens, setLoteItens] = useState<LotePagamentoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [formData, setFormData] = useState<LotePagamentoFormData>({
    descricao: '',
    conta_bancaria_id: undefined,
    data_prevista_pagamento: undefined,
    observacoes: undefined,
  });

  // Filtrar lotes
  const filteredLotes = lotes.filter(lote => {
    const matchSearch = lote.numero_lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       lote.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filtroStatus === 'all' || lote.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  // Carregar itens do lote
  const handleViewDetails = async (lote: LotePagamento) => {
    setSelectedLote(lote);
    const itens = await getItensLote(lote.id);
    setLoteItens(itens);
    setShowDetails(true);
  };

  // Criar novo lote
  const handleCreateLote = async () => {
    try {
      await createLote(formData);
      setShowForm(false);
      setFormData({
        descricao: '',
        conta_bancaria_id: undefined,
        data_prevista_pagamento: undefined,
        observacoes: undefined,
      });
    } catch (error) {
      console.error('Erro ao criar lote:', error);
    }
  };

  // Adicionar títulos ao lote
  const handleAdicionarTitulos = async (loteId: string, titulosIds: string[]) => {
    try {
      for (const tituloId of titulosIds) {
        await adicionarTitulo(loteId, tituloId);
      }
      toast.success(`${titulosIds.length} título(s) adicionado(s) ao lote`);
      if (selectedLote) {
        const itens = await getItensLote(loteId);
        setLoteItens(itens);
      }
    } catch (error) {
      console.error('Erro ao adicionar títulos:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      rascunho: { label: 'Rascunho', variant: 'secondary' as const },
      pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'default' as const },
      aprovado: { label: 'Aprovado', variant: 'default' as const },
      rejeitado: { label: 'Rejeitado', variant: 'destructive' as const },
      enviado: { label: 'Enviado', variant: 'default' as const },
      processado: { label: 'Processado', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'outline' as const },
    };
    const statusConfig = config[status as keyof typeof config] || config.rascunho;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lotes de Pagamento</h2>
          <p className="text-muted-foreground">
            Agrupe títulos a pagar em lotes para processamento em lote
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lote
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número do lote ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes de Pagamento</CardTitle>
          <CardDescription>
            {filteredLotes.length} lote(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filteredLotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lote encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Lote</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                    <TableCell>{lote.descricao || '-'}</TableCell>
                    <TableCell>{lote.quantidade_titulos}</TableCell>
                    <TableCell>{formatCurrency(lote.valor_total)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(lote.valor_liquido)}</TableCell>
                    <TableCell>{formatDate(lote.data_prevista_pagamento)}</TableCell>
                    <TableCell>{getStatusBadge(lote.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(lote)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {lote.status === 'rascunho' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLote(lote);
                                setFormData({
                                  descricao: lote.descricao,
                                  conta_bancaria_id: lote.conta_bancaria_id,
                                  data_prevista_pagamento: lote.data_prevista_pagamento,
                                  observacoes: lote.observacoes,
                                });
                                setShowForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Deseja realmente excluir este lote?')) {
                                  deleteLote(lote.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição de lote */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedLote ? 'Editar Lote' : 'Novo Lote de Pagamento'}
            </DialogTitle>
            <DialogDescription>
              Crie um novo lote para agrupar títulos a pagar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Lote de pagamentos - Dezembro 2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta Bancária</Label>
                <Select
                  value={formData.conta_bancaria_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, conta_bancaria_id: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: Carregar contas bancárias */}
                    <SelectItem value="none">Nenhuma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Prevista de Pagamento</Label>
                <Input
                  type="date"
                  value={formData.data_prevista_pagamento || ''}
                  onChange={(e) => setFormData({ ...formData, data_prevista_pagamento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLote}>
              {selectedLote ? 'Atualizar' : 'Criar Lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes do lote */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote: {selectedLote?.numero_lote}</DialogTitle>
            <DialogDescription>
              Gerencie os títulos incluídos neste lote
            </DialogDescription>
          </DialogHeader>
          {selectedLote && (
            <Tabs defaultValue="itens" className="w-full">
              <TabsList>
                <TabsTrigger value="itens">Itens do Lote ({loteItens.length})</TabsTrigger>
                <TabsTrigger value="adicionar">Adicionar Títulos</TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="itens">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número do Título</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor Título</TableHead>
                      <TableHead>Retenções</TableHead>
                      <TableHead>Valor Líquido</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteItens.map((item) => {
                      const conta = contasPagar.find(c => c.id === item.conta_pagar_id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{conta?.numero_titulo || '-'}</TableCell>
                          <TableCell>{conta?.fornecedor_nome || '-'}</TableCell>
                          <TableCell>{formatCurrency(item.valor_titulo)}</TableCell>
                          <TableCell>{formatCurrency(item.valor_retencoes)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(item.valor_liquido)}</TableCell>
                          <TableCell className="text-right">
                            {selectedLote.status === 'rascunho' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerTitulo(selectedLote.id, item.conta_pagar_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="adicionar">
                <LoteAdicionarTitulos
                  loteId={selectedLote.id}
                  onAdicionar={handleAdicionarTitulos}
                />
              </TabsContent>

              <TabsContent value="info">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Valor Total</Label>
                      <p className="text-lg font-semibold">{formatCurrency(selectedLote.valor_total)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Total Retenções</Label>
                      <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedLote.valor_total_retencoes)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Valor Líquido</Label>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedLote.valor_liquido)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Quantidade de Títulos</Label>
                      <p className="text-lg font-semibold">{selectedLote.quantidade_titulos}</p>
                    </div>
                  </div>
                  {selectedLote.status === 'rascunho' && (
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        await EntityService.update({
                          schema: 'financeiro',
                          table: 'lotes_pagamento',
                          companyId: selectedCompany?.id || '',
                          id: selectedLote.id,
                          data: { status: 'pendente_aprovacao' }
                        });
                        await refresh();
                        setShowDetails(false);
                      }}>
                        Enviar para Aprovação
                      </Button>
                    </div>
                  )}
                  {selectedLote.status === 'pendente_aprovacao' && (
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        aprovarLote(selectedLote.id);
                        setShowDetails(false);
                      }}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button variant="destructive" onClick={() => {
                        rejeitarLote(selectedLote.id);
                        setShowDetails(false);
                      }}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {selectedLote.status === 'aprovado' && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Gerar Arquivo de Remessa</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Gere o arquivo CNAB ou OFX para envio ao banco
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                if (!selectedLote.conta_bancaria_id) {
                                  toast.error('Selecione uma conta bancária no lote primeiro');
                                  return;
                                }

                                // Buscar dados da conta bancária usando EntityService
                                const contaBancariaResult = await EntityService.getById<ContaBancaria>({
                                  schema: 'financeiro',
                                  table: 'contas_bancarias',
                                  companyId: selectedCompany?.id || '',
                                  id: selectedLote.conta_bancaria_id,
                                });

                                if (!contaBancariaResult) {
                                  toast.error('Erro ao buscar dados da conta bancária');
                                  return;
                                }

                                const contaBancaria = contaBancariaResult as any;

                                // Buscar dados da empresa
                                const empresaResult = await EntityService.getById<any>({
                                  schema: 'public',
                                  table: 'companies',
                                  companyId: selectedCompany?.id || '',
                                  id: selectedCompany?.id || '',
                                });

                                if (!empresaResult) {
                                  toast.error('Erro ao buscar dados da empresa');
                                  return;
                                }

                                const empresa = empresaResult as any;

                                // Configurar CNAB
                                const config: CNABConfig = {
                                  banco: contaBancaria.banco_codigo || '001',
                                  agencia: contaBancaria.agencia || '',
                                  conta: contaBancaria.conta || '',
                                  digitoConta: contaBancaria.digito_conta || '',
                                  empresaNome: empresa.razao_social || empresa.nome_fantasia || '',
                                  empresaCnpj: empresa.cnpj?.replace(/\D/g, '') || '',
                                  tipoArquivo: '240',
                                  sequencialRemessa: parseInt(selectedLote.numero_lote.replace(/\D/g, '')) || 1,
                                };

                                // Enriquecer itens com dados das contas a pagar usando EntityService
                                const itensEnriquecidos = await Promise.all(
                                  loteItens.map(async (item) => {
                                    try {
                                      const contaPagarResult = await EntityService.getById<any>({
                                        schema: 'financeiro',
                                        table: 'contas_pagar',
                                        companyId: selectedCompany?.id || '',
                                        id: item.conta_pagar_id,
                                      });
                                      
                                      return {
                                        ...item,
                                        conta_pagar: contaPagarResult ? {
                                          numero_titulo: contaPagarResult.numero_titulo,
                                          data_vencimento: contaPagarResult.data_vencimento,
                                          fornecedor_nome: contaPagarResult.fornecedor_nome,
                                        } : undefined,
                                      };
                                    } catch {
                                      return {
                                        ...item,
                                        conta_pagar: undefined,
                                      };
                                    }
                                  })
                                );

                                // Gerar arquivo CNAB240
                                const arquivoCNAB = gerarCNAB240(selectedLote, itensEnriquecidos, contaBancaria, config);
                                const nomeArquivo = `REMESSA_${selectedLote.numero_lote}_${format(new Date(), 'yyyyMMdd')}.REM`;
                                
                                downloadArquivo(arquivoCNAB, nomeArquivo, 'cnab');
                                
                                // Atualizar status do lote usando EntityService
                                await EntityService.update({
                                  schema: 'financeiro',
                                  table: 'lotes_pagamento',
                                  companyId: selectedCompany?.id || '',
                                  id: selectedLote.id,
                                  data: {
                                    status: 'enviado',
                                    numero_remessa: nomeArquivo,
                                  } as any,
                                });
                                await refresh();

                                toast.success('Arquivo CNAB gerado com sucesso!');
                              } catch (error) {
                                console.error('Erro ao gerar arquivo CNAB:', error);
                                toast.error('Erro ao gerar arquivo CNAB');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Gerar CNAB 240
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                if (!selectedLote.conta_bancaria_id) {
                                  toast.error('Selecione uma conta bancária no lote primeiro');
                                  return;
                                }

                                // Buscar dados da conta bancária usando EntityService
                                const contaBancariaResult = await EntityService.getById<ContaBancaria>({
                                  schema: 'financeiro',
                                  table: 'contas_bancarias',
                                  companyId: selectedCompany?.id || '',
                                  id: selectedLote.conta_bancaria_id,
                                });

                                if (!contaBancariaResult) {
                                  toast.error('Erro ao buscar dados da conta bancária');
                                  return;
                                }

                                const contaBancaria = contaBancariaResult as any;

                                // Enriquecer itens com dados das contas a pagar usando EntityService
                                const itensEnriquecidos = await Promise.all(
                                  loteItens.map(async (item) => {
                                    try {
                                      const contaPagarResult = await EntityService.getById<any>({
                                        schema: 'financeiro',
                                        table: 'contas_pagar',
                                        companyId: selectedCompany?.id || '',
                                        id: item.conta_pagar_id,
                                      });
                                      
                                      return {
                                        ...item,
                                        conta_pagar: contaPagarResult ? {
                                          numero_titulo: contaPagarResult.numero_titulo,
                                          data_vencimento: contaPagarResult.data_vencimento,
                                          fornecedor_nome: contaPagarResult.fornecedor_nome,
                                        } : undefined,
                                      };
                                    } catch {
                                      return {
                                        ...item,
                                        conta_pagar: undefined,
                                      };
                                    }
                                  })
                                );

                                // Gerar arquivo OFX
                                const arquivoOFX = gerarOFXRemessa(selectedLote, itensEnriquecidos, contaBancaria);
                                const nomeArquivo = `REMESSA_${selectedLote.numero_lote}_${format(new Date(), 'yyyyMMdd')}.OFX`;
                                
                                downloadArquivo(arquivoOFX, nomeArquivo, 'ofx');
                                
                                // Atualizar status do lote usando EntityService
                                await EntityService.update({
                                  schema: 'financeiro',
                                  table: 'lotes_pagamento',
                                  companyId: selectedCompany?.id || '',
                                  id: selectedLote.id,
                                  data: {
                                    status: 'enviado',
                                    numero_remessa: nomeArquivo,
                                  } as any,
                                });
                                await refresh();

                                toast.success('Arquivo OFX gerado com sucesso!');
                              } catch (error) {
                                console.error('Erro ao gerar arquivo OFX:', error);
                                toast.error('Erro ao gerar arquivo OFX');
                              }
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar OFX
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente auxiliar para adicionar títulos ao lote
function LoteAdicionarTitulos({ 
  loteId, 
  onAdicionar 
}: { 
  loteId: string; 
  onAdicionar: (loteId: string, titulosIds: string[]) => Promise<void> 
}) {
  const { contasPagar } = useContasPagar();
  const [selectedTitulos, setSelectedTitulos] = useState<Set<string>>(new Set());

  // Filtrar apenas títulos que podem ser adicionados (aprovados e não em outro lote)
  const titulosDisponiveis = contasPagar.filter(c => 
    c.status === 'aprovado' && !c.conta_bancaria_id // Simplificado - na prática verificar se já está em lote
  );

  const handleToggleTitulo = (tituloId: string) => {
    const newSet = new Set(selectedTitulos);
    if (newSet.has(tituloId)) {
      newSet.delete(tituloId);
    } else {
      newSet.add(tituloId);
    }
    setSelectedTitulos(newSet);
  };

  const handleAdicionarSelecionados = async () => {
    if (selectedTitulos.size === 0) return;
    await onAdicionar(loteId, Array.from(selectedTitulos));
    setSelectedTitulos(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedTitulos.size} título(s) selecionado(s)
        </p>
        <Button onClick={handleAdicionarSelecionados} disabled={selectedTitulos.size === 0}>
          Adicionar Selecionados
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {titulosDisponiveis.map((titulo) => (
            <TableRow key={titulo.id}>
              <TableCell>
                <Checkbox
                  checked={selectedTitulos.has(titulo.id)}
                  onCheckedChange={() => handleToggleTitulo(titulo.id)}
                />
              </TableCell>
              <TableCell>{titulo.numero_titulo}</TableCell>
              <TableCell>{titulo.fornecedor_nome}</TableCell>
              <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(titulo.valor_atual)}</TableCell>
              <TableCell>{format(new Date(titulo.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

