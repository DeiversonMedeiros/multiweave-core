import React, { useState, useEffect } from 'react';
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
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Loader2,
  X,
  Plus,
  XCircle
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';
import { useActivePartners } from '@/hooks/usePartners';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ApprovalService } from '@/services/approvals/approvalService';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar } from 'lucide-react';

interface CotacaoModalProps {
  cotacao: any;
  isOpen: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function CotacaoModal({ cotacao, isOpen, isEditMode, onClose, onSave }: CotacaoModalProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { data: partnersData } = useActivePartners();
  const partners = (partnersData as any)?.data || partnersData || [];
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  
  const getStatusBadge = (status: string) => {
    const statusValue = status || 'pendente';
    switch (statusValue) {
      case 'pendente':
      case 'aguardando_resposta':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'aprovada':
      case 'completa':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
      case 'rejeitada':
      case 'reprovada':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      case 'aberta':
      case 'em_cotacao':
        return <Badge variant="outline" className="text-blue-600"><Clock className="h-3 w-3 mr-1" />Aberta</Badge>;
      default:
        return <Badge variant="outline">{statusValue}</Badge>;
    }
  };
  
  // loading: carregando dados iniciais da cotação
  const [loading, setLoading] = useState(false);
  // saving: envio das alterações da cotação
  const [saving, setSaving] = useState(false);
  const [requisicaoData, setRequisicaoData] = useState<any>(null);
  const [requisicaoItens, setRequisicaoItens] = useState<any[]>([]);
  const [materiaisMap, setMateriaisMap] = useState<Map<string, { nome: string; imagem_url: string | null }>>(new Map());
  const [fornecedoresCotacao, setFornecedoresCotacao] = useState<any[]>([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('');
  const [approvalFlow, setApprovalFlow] = useState<any>(null);
  const [loadingApproval, setLoadingApproval] = useState(false);
  
  const [formData, setFormData] = useState({
    prazo_resposta: '',
    status: 'aberta',
    observacoes: '',
    subtotal: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    valor_total: 0,
  });

  useEffect(() => {
    if (!isOpen || !cotacao || !selectedCompany?.id) {
      setRequisicaoItens([]);
      setMateriaisMap(new Map());
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        if (selectedCompany?.id) {
          try {
            const fornecedoresResult = await EntityService.list({
              schema: 'compras',
              table: 'fornecedores_dados',
              companyId: selectedCompany.id,
              filters: { status: 'ativo' },
              page: 1,
              pageSize: 100,
            });
            setFornecedores(fornecedoresResult.data || []);
          } catch (error) {
            console.warn('Erro ao carregar fornecedores:', error);
          }
        }

        if (cotacao.requisicao_id) {
          const requisicao = await EntityService.getById({
            schema: 'compras',
            table: 'requisicoes_compra',
            id: cotacao.requisicao_id,
            companyId: selectedCompany.id,
          });
          setRequisicaoData(requisicao);

          const itensResult = await EntityService.list({
            schema: 'compras',
            table: 'requisicao_itens',
            companyId: selectedCompany.id,
            filters: { requisicao_id: cotacao.requisicao_id },
            page: 1,
            pageSize: 1000,
            skipCompanyFilter: true,
          });
          const itens = itensResult.data || [];
          setRequisicaoItens(itens);

          const materialIds = [...new Set(itens.map((item: any) => item.material_id).filter(Boolean))];
          
          if (materialIds.length > 0) {
            const materiaisMap = new Map<string, { nome: string; imagem_url: string | null }>();
            
            try {
              const materiaisResult = await EntityService.list({
                schema: 'almoxarifado',
                table: 'materiais_equipamentos',
                companyId: selectedCompany.id,
                filters: {},
                page: 1,
                pageSize: 1000,
              });

              if (materiaisResult.data) {
                const materialIdsStr = materialIds.map(id => String(id));
                
                materiaisResult.data.forEach((material: any) => {
                  const materialIdStr = String(material.id);
                  if (materialIdsStr.includes(materialIdStr)) {
                    materiaisMap.set(materialIdStr, {
                      nome: material.nome || material.descricao || 'Material sem nome',
                      imagem_url: material.imagem_url || null,
                    });
                  }
                });
              }

              materialIds.forEach((materialId: string) => {
                const materialIdStr = String(materialId);
                if (!materiaisMap.has(materialIdStr)) {
                  materiaisMap.set(materialIdStr, {
                    nome: 'Material não encontrado',
                    imagem_url: null,
                  });
                }
              });

              setMateriaisMap(materiaisMap);
            } catch (error) {
              console.error('Erro ao buscar materiais:', error);
              materialIds.forEach((materialId: string) => {
                materiaisMap.set(String(materialId), {
                  nome: 'Erro ao carregar',
                  imagem_url: null,
                });
              });
              setMateriaisMap(materiaisMap);
            }
          } else {
            setMateriaisMap(new Map());
          }
        }

        const fornecedoresResult = await EntityService.list({
          schema: 'compras',
          table: 'cotacao_fornecedores',
          companyId: selectedCompany.id,
          filters: { cotacao_id: cotacao.id },
          page: 1,
          pageSize: 100,
          skipCompanyFilter: true,
        });
        setFornecedoresCotacao(fornecedoresResult.data || []);

        setFormData({
          prazo_resposta: cotacao.prazo_resposta 
            ? new Date(cotacao.prazo_resposta).toISOString().split('T')[0]
            : '',
          status: cotacao.workflow_state || cotacao.status || 'aberta',
          observacoes: cotacao.observacoes || '',
          subtotal: cotacao.subtotal || 0,
          desconto_percentual: cotacao.desconto_percentual || 0,
          desconto_valor: cotacao.desconto_valor || 0,
          valor_total: cotacao.valor_total || 0,
        });

        // Carregar fluxo de aprovação
        if (selectedCompany?.id && cotacao.id) {
          try {
            setLoadingApproval(true);
            const flowData = await ApprovalService.getApprovalFlow(
              'cotacao_compra',
              cotacao.id,
              selectedCompany.id
            );
            setApprovalFlow(flowData);
          } catch (error) {
            console.error('Erro ao carregar fluxo de aprovação:', error);
            setApprovalFlow(null);
          } finally {
            setLoadingApproval(false);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da cotação:', error);
        // Usar toast apenas para feedback visual; não depende de mudanças reativas,
        // então não precisamos incluí-lo nas dependências do useEffect.
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da cotação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Dependemos apenas de isOpen e dos identificadores estáveis da empresa e da cotação
    // para evitar reexecuções infinitas causadas por mudanças de referência em objetos/funções.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedCompany?.id, cotacao?.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  if (!cotacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar' : 'Visualizar'} Cotação - {cotacao.numero_cotacao}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Edite todas as informações da cotação'
              : 'Visualize todas as informações da cotação'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="valores">Valores</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número da Cotação</Label>
                  <Input value={cotacao.numero_cotacao || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditMode ? (
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="completa">Completa</SelectItem>
                        <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="reprovada">Reprovada</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">{getStatusBadge(cotacao.workflow_state || cotacao.status)}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Data de Criação</Label>
                  <Input 
                    value={cotacao.created_at 
                      ? new Date(cotacao.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--'} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Resposta</Label>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={formData.prazo_resposta}
                      onChange={(e) => setFormData({...formData, prazo_resposta: e.target.value})}
                    />
                  ) : (
                    <Input 
                      value={cotacao.prazo_resposta
                        ? new Date(cotacao.prazo_resposta).toLocaleDateString('pt-BR')
                        : '--'} 
                      disabled 
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                {isEditMode ? (
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    placeholder="Observações adicionais"
                    rows={4}
                  />
                ) : (
                  <Textarea value={cotacao.observacoes || '--'} disabled rows={4} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="fornecedores" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prazo Entrega</TableHead>
                    <TableHead>Preço Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedoresCotacao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        Nenhum fornecedor adicionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedoresCotacao.map((fornecedor: any) => {
                      const fornecedorData = fornecedores.find((f: any) => f.id === fornecedor.fornecedor_id);
                      const partner = partners.find((p: any) => p.id === fornecedorData?.partner_id);
                      return (
                        <TableRow key={fornecedor.id}>
                          <TableCell>{partner?.nome || fornecedorData?.partner_id || fornecedor.fornecedor_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{fornecedor.status || 'pendente'}</Badge>
                          </TableCell>
                          <TableCell>
                            {fornecedor.prazo_entrega ? `${fornecedor.prazo_entrega} dias` : '--'}
                          </TableCell>
                          <TableCell>
                            {fornecedor.preco_total
                              ? `R$ ${Number(fornecedor.preco_total).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '--'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="itens" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Valor Unit. Estimado</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisicaoItens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    requisicaoItens.map((item: any) => {
                      const materialIdStr = item.material_id ? String(item.material_id) : null;
                      const material = materialIdStr ? materiaisMap.get(materialIdStr) : null;
                      const materialNome = material?.nome || item.material_nome || 'Sem material';
                      const materialImagem = material?.imagem_url;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 flex-shrink-0">
                                <AvatarImage 
                                  src={materialImagem || undefined} 
                                  alt={materialNome}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-muted">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{materialNome}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantidade}</TableCell>
                          <TableCell>{item.unidade_medida || 'UN'}</TableCell>
                          <TableCell>
                            {item.valor_unitario_estimado
                              ? `R$ ${Number(item.valor_unitario_estimado).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '--'}
                          </TableCell>
                          <TableCell>
                            {item.quantidade && item.valor_unitario_estimado
                              ? `R$ ${(item.quantidade * item.valor_unitario_estimado).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '--'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="valores" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  <Input 
                    value={`R$ ${formData.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input value={`${formData.desconto_percentual}%`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input 
                    value={`R$ ${formData.desconto_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input 
                    value={`R$ ${formData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    disabled 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="detalhes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Fluxo de Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingApproval ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : !approvalFlow || approvalFlow.approvalFlow.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhuma aprovação configurada para esta cotação
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Informações gerais */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Regra de Aprovação:</span>
                          <span className="text-sm font-semibold">{approvalFlow.rule || 'Regra de Aprovação'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Total de Níveis:</span>
                          <span className="text-sm font-semibold">{approvalFlow.totalLevels}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Status Geral:</span>
                          {approvalFlow.completed ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Alçada Concluída
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Em Andamento
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Timeline de aprovadores */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Sequência de Aprovadores</h3>
                        
                        {approvalFlow.approvalFlow.map((item: any, index: number) => {
                          const isLast = index === approvalFlow.approvalFlow.length - 1;
                          
                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'aprovado':
                                return <CheckCircle className="h-5 w-5 text-green-600" />;
                              case 'rejeitado':
                              case 'cancelado':
                                return <XCircle className="h-5 w-5 text-red-600" />;
                              case 'pendente':
                              default:
                                return <Clock className="h-5 w-5 text-gray-400" />;
                            }
                          };

                          const getStatusBadge = (status: string) => {
                            switch (status) {
                              case 'aprovado':
                                return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
                              case 'rejeitado':
                                return <Badge variant="destructive">Rejeitado</Badge>;
                              case 'cancelado':
                                return <Badge variant="destructive">Cancelado</Badge>;
                              case 'pendente':
                              default:
                                return <Badge variant="secondary">Pendente</Badge>;
                            }
                          };

                          const getItemBgColor = (status: string) => {
                            switch (status) {
                              case 'aprovado':
                                return 'bg-green-50 border-green-200';
                              case 'rejeitado':
                              case 'cancelado':
                                return 'bg-red-50 border-red-200';
                              case 'pendente':
                              default:
                                return 'bg-gray-50 border-gray-200';
                            }
                          };

                          const formatDateTime = (dateString: string | null): string => {
                            if (!dateString) return '--';
                            
                            try {
                              const date = new Date(dateString);
                              const day = date.getDate().toString().padStart(2, '0');
                              const month = (date.getMonth() + 1).toString().padStart(2, '0');
                              const year = date.getFullYear();
                              const hours = date.getHours().toString().padStart(2, '0');
                              const minutes = date.getMinutes().toString().padStart(2, '0');
                              const seconds = date.getSeconds().toString().padStart(2, '0');
                              
                              return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                            } catch (error) {
                              return '--';
                            }
                          };
                          
                          return (
                            <div key={`${item.level}-${item.approverId}`} className="relative">
                              {/* Linha conectora */}
                              {!isLast && (
                                <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200" />
                              )}
                              
                              {/* Card do aprovador */}
                              <div className={`relative p-4 rounded-lg border-2 ${getItemBgColor(item.status)}`}>
                                <div className="flex items-start gap-4">
                                  {/* Ícone de status */}
                                  <div className="flex-shrink-0 mt-0.5">
                                    {getStatusIcon(item.status)}
                                  </div>
                                  
                                  {/* Conteúdo */}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-semibold">{item.approverName}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          Nível {item.level} / {approvalFlow.totalLevels}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getStatusBadge(item.status)}
                                      </div>
                                    </div>
                                    
                                    {/* Data de aprovação */}
                                    {item.status === 'aprovado' && item.approvedAt && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                          Aprovado em: <span className="font-medium">{formatDateTime(item.approvedAt)}</span>
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Observações */}
                                    {item.observacoes && (
                                      <div className="text-sm text-muted-foreground bg-white/50 p-2 rounded border">
                                        <span className="font-medium">Observações: </span>
                                        {item.observacoes}
                                      </div>
                                    )}
                                    
                                    {/* Se pendente, mostrar que está aguardando */}
                                    {item.status === 'pendente' && (
                                      <div className="text-sm text-muted-foreground italic">
                                        Aguardando aprovação...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading || saving}>
            {isEditMode ? 'Cancelar' : 'Fechar'}
          </Button>
          {isEditMode && (
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






