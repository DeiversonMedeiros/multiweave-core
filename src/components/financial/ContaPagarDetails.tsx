// =====================================================
// COMPONENTE: DETALHES DA CONTA A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Modal com detalhes completos da conta a pagar
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Calendar,
  Building,
  FileText,
  AlertTriangle,
  Clock,
  User,
  RotateCcw,
  Ban,
  CreditCard,
  Target,
  FolderKanban,
  Zap,
  Download,
  ExternalLink
} from 'lucide-react';
import { ContaPagar } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';
import { RetencoesFonteManager } from './RetencoesFonteManager';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useTesouraria } from '@/hooks/financial/useTesouraria';
import { useContasPagarParcelas } from '@/hooks/financial/useContasPagarParcelas';
import { useClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

interface ContaPagarDetailsProps {
  conta: ContaPagar;
  onClose: () => void;
  onEdit: (conta: ContaPagar) => void;
  onDelete: (conta: ContaPagar) => void;
  onApprove: (conta: ContaPagar) => void;
  onReject: (conta: ContaPagar) => void;
  onReprovar?: (conta: ContaPagar) => void;
  onSuspender?: (conta: ContaPagar) => void;
  onPay: (conta: ContaPagar) => void;
  onEstornar?: (conta: ContaPagar) => void;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export function ContaPagarDetails({
  conta,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onReprovar,
  onSuspender,
  onPay,
  onEstornar,
  canEdit,
  canDelete,
  canApprove,
}: ContaPagarDetailsProps) {
  const { selectedCompany } = useCompany();
  // Buscar dados relacionados
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  const { contasBancarias } = useTesouraria();
  const { data: parcelasData, isLoading: loadingParcelas } = useContasPagarParcelas(conta.id);
  const { data: classesFinanceirasData } = useClassesFinanceiras();
  const [classeFinanceiraNome, setClasseFinanceiraNome] = useState<string | undefined>(undefined);

  // Encontrar nomes dos relacionamentos
  const centroCusto = costCentersData?.data?.find(cc => cc.id === conta.centro_custo_id);
  const projeto = projectsData?.data?.find(p => p.id === conta.projeto_id);
  
  // Buscar conta bancária vinculada ou usar a primeira conta ativa como padrão
  let contaBancaria = contasBancarias?.find(cb => cb.id === conta.conta_bancaria_id);
  if (!contaBancaria && contasBancarias && contasBancarias.length > 0) {
    // Se não houver conta vinculada, usar a primeira conta ativa
    contaBancaria = contasBancarias.find(cb => cb.is_active !== false) || contasBancarias[0];
  }
  
  const parcelas = parcelasData?.data || [];

  // Buscar nome da classe financeira
  useEffect(() => {
    async function loadClasseFinanceiraNome() {
      if (!conta.classe_financeira || !selectedCompany?.id) {
        setClasseFinanceiraNome(undefined);
        return;
      }

      // Verificar se é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(conta.classe_financeira)) {
        try {
          // Tentar buscar na lista de classes financeiras primeiro (mais rápido)
          const classeEncontrada = classesFinanceirasData?.data?.find(
            cf => cf.id === conta.classe_financeira
          );
          
          if (classeEncontrada) {
            setClasseFinanceiraNome(classeEncontrada.nome || (classeEncontrada.codigo ? `${classeEncontrada.codigo} - ${classeEncontrada.nome}` : undefined));
            return;
          }

          // Se não encontrou na lista, buscar diretamente
          const classeFinanceira = await EntityService.getById<{ id: string; nome: string; codigo?: string }>({
            schema: 'financeiro',
            table: 'classes_financeiras',
            id: conta.classe_financeira,
            companyId: selectedCompany.id
          });
          setClasseFinanceiraNome(classeFinanceira?.nome || (classeFinanceira?.codigo ? `${classeFinanceira.codigo} - ${classeFinanceira.nome}` : undefined));
        } catch (err) {
          console.warn('Erro ao buscar classe financeira:', err);
          setClasseFinanceiraNome(conta.classe_financeira); // Fallback para o valor original
        }
      } else {
        // Se não for UUID, usar o valor diretamente como nome
        setClasseFinanceiraNome(conta.classe_financeira);
      }
    }

    loadClasseFinanceiraNome();
  }, [conta.classe_financeira, selectedCompany?.id, classesFinanceirasData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return formatDateOnly(date);
  };

  const getIntervaloLabel = (intervalo?: string) => {
    const labels: Record<string, string> = {
      diario: 'Diário',
      semanal: 'Semanal',
      quinzenal: 'Quinzenal',
      mensal: 'Mensal',
      bimestral: 'Bimestral',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual'
    };
    return intervalo ? labels[intervalo] || intervalo : '-';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      aprovado: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle },
      pago: { label: 'Pago', variant: 'success' as const, icon: CheckCircle },
      vencido: { label: 'Vencido', variant: 'destructive' as const, icon: AlertTriangle },
      cancelado: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle },
      estornado: { label: 'Estornado', variant: 'default' as const, icon: RotateCcw },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isVencida = new Date(conta.data_vencimento) < new Date() && conta.status !== 'pago';

  // Função helper para verificar se há pagamento na conta
  const temPagamento = (): boolean => {
    // Se for conta parcelada, verificar se há alguma parcela paga
    if (conta.is_parcelada && parcelas.length > 0) {
      return parcelas.some(p => p.status === 'pago' || (p.valor_pago ?? 0) > 0);
    }
    // Se não for parcelada, verificar se há valor pago
    return (conta.valor_pago ?? 0) > 0;
  };

  const hasPayment = temPagamento();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {conta.numero_titulo}
              </CardTitle>
              <CardDescription>
                Detalhes da conta a pagar
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(conta.status)}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alerta se vencida */}
          {isVencida && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Conta vencida!</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Esta conta está vencida há {Math.ceil((new Date().getTime() - new Date(conta.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))} dias.
              </p>
            </div>
          )}

          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Número do Título</Label>
                  <p className="text-sm font-semibold">{conta.numero_titulo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fornecedor</Label>
                  <p className="text-sm">{conta.fornecedor_nome || '-'}</p>
                </div>
                {conta.fornecedor_cnpj && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                    <p className="text-sm">{conta.fornecedor_cnpj}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{conta.descricao}</p>
                </div>
                {conta.categoria && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                    <p className="text-sm capitalize">{conta.categoria}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Valor Original</Label>
                  <p className="text-lg font-semibold">{formatCurrency(conta.valor_original)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Valor Atual</Label>
                  <p className="text-lg font-semibold">{formatCurrency(conta.valor_atual)}</p>
                </div>
                {conta.valor_desconto > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Desconto</Label>
                    <p className="text-sm text-green-600">-{formatCurrency(conta.valor_desconto)}</p>
                  </div>
                )}
                {conta.valor_juros > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Juros</Label>
                    <p className="text-sm text-red-600">+{formatCurrency(conta.valor_juros)}</p>
                  </div>
                )}
                {conta.valor_multa > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Multa</Label>
                    <p className="text-sm text-red-600">+{formatCurrency(conta.valor_multa)}</p>
                  </div>
                )}
                {conta.valor_pago > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Valor Pago</Label>
                    <p className="text-sm text-blue-600">{formatCurrency(conta.valor_pago)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Datas e Forma de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Emissão</Label>
                  <p className="text-sm">{formatDate(conta.data_emissao)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
                  <p className="text-sm">{formatDate(conta.data_vencimento)}</p>
                </div>
                {conta.data_pagamento && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Pagamento</Label>
                    <p className="text-sm">{formatDate(conta.data_pagamento)}</p>
                  </div>
                )}
                {conta.data_aprovacao && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Aprovação</Label>
                    <p className="text-sm">{formatDate(conta.data_aprovacao)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagamento e Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conta.forma_pagamento && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</Label>
                    <p className="text-sm capitalize">{conta.forma_pagamento}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Conta Bancária</Label>
                  {contaBancaria ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {contaBancaria.banco_nome} ({contaBancaria.banco_codigo})
                        {conta.conta_bancaria_id !== contaBancaria.id && (
                          <span className="text-xs text-muted-foreground ml-2">(Padrão)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Agência: {contaBancaria.agencia} | Conta: {contaBancaria.conta} | Tipo: {contaBancaria.tipo_conta === 'corrente' ? 'Corrente' : contaBancaria.tipo_conta === 'poupanca' ? 'Poupança' : 'Investimento'}
                      </p>
                      {contaBancaria.saldo_atual !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Saldo: R$ {contaBancaria.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm text-muted-foreground italic">Nenhuma conta bancária cadastrada</p>
                    </div>
                  )}
                </div>
                {classeFinanceiraNome && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Classe Financeira</Label>
                    <p className="text-sm">{classeFinanceiraNome}</p>
                  </div>
                )}
                {centroCusto && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Centro de Custo</Label>
                    <p className="text-sm">{centroCusto.codigo} - {centroCusto.nome}</p>
                  </div>
                )}
                {projeto && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Projeto</Label>
                    <p className="text-sm">{projeto.codigo} - {projeto.nome}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Informações de Parcelamento */}
          {conta.is_parcelada && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Parcelamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Conta Parcelada</Label>
                    <p className="text-sm font-semibold">Sim</p>
                  </div>
                  {conta.numero_parcelas && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Número de Parcelas</Label>
                      <p className="text-sm">{conta.numero_parcelas} parcela(s)</p>
                    </div>
                  )}
                  {conta.intervalo_parcelas && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Intervalo</Label>
                      <p className="text-sm">{getIntervaloLabel(conta.intervalo_parcelas)}</p>
                    </div>
                  )}
                </div>

                {/* Lista de Parcelas */}
                {loadingParcelas ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Carregando parcelas...
                  </div>
                ) : parcelas.length > 0 ? (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block">Parcelas</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Nº Título</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            {parcelas.some(p => p.valor_pago > 0) && (
                              <TableHead>Valor Pago</TableHead>
                            )}
                            {parcelas.some(p => p.data_pagamento) && (
                              <TableHead>Data Pagamento</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelas.map((parcela) => (
                            <TableRow key={parcela.id}>
                              <TableCell className="font-medium">
                                {parcela.numero_parcela}ª
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {parcela.numero_titulo || '-'}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(parcela.valor_atual)}
                              </TableCell>
                              <TableCell>
                                {formatDate(parcela.data_vencimento)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(parcela.status)}
                              </TableCell>
                              {parcelas.some(p => p.valor_pago > 0) && (
                                <TableCell>
                                  {parcela.valor_pago > 0 ? (
                                    <span className="text-green-600 font-medium">
                                      {formatCurrency(parcela.valor_pago)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                              {parcelas.some(p => p.data_pagamento) && (
                                <TableCell>
                                  {parcela.data_pagamento ? (
                                    formatDate(parcela.data_pagamento)
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {parcelas.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total das Parcelas:</span>
                          <span className="font-semibold">
                            {formatCurrency(parcelas.reduce((sum, p) => sum + p.valor_atual, 0))}
                          </span>
                        </div>
                        {parcelas.some(p => p.valor_pago > 0) && (
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-muted-foreground">Total Pago:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(parcelas.reduce((sum, p) => sum + p.valor_pago, 0))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nenhuma parcela encontrada
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informações de Urgência */}
          {conta.is_urgente && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                  <Zap className="h-5 w-5" />
                  Pagamento Urgente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-orange-700">Status</Label>
                  <p className="text-sm font-semibold text-orange-800">Pagamento Urgente</p>
                </div>
                {conta.motivo_urgencia && (
                  <div>
                    <Label className="text-sm font-medium text-orange-700">Motivo da Urgência</Label>
                    <p className="text-sm text-orange-900 whitespace-pre-wrap">{conta.motivo_urgencia}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Retenções na Fonte */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retenções na Fonte</CardTitle>
            </CardHeader>
            <CardContent>
              <RetencoesFonteManager 
                contaPagarId={conta.id} 
                valorTitulo={conta.valor_atual}
              />
            </CardContent>
          </Card>

          {/* Observações */}
          {conta.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{conta.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Anexos */}
          {(conta.anexo_boleto || conta.anexo_nota_fiscal || (conta.anexos && conta.anexos.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Anexos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Anexo de Boleto */}
                  {conta.anexo_boleto && (
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FileText className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-green-900">Boleto</Label>
                            <p className="text-xs text-green-700">Documento de pagamento anexado</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-green-700 border-green-300 hover:bg-green-100"
                          >
                            <a 
                              href={conta.anexo_boleto} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Visualizar
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-green-700 border-green-300 hover:bg-green-100"
                          >
                            <a 
                              href={conta.anexo_boleto} 
                              download
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anexo de Nota Fiscal */}
                  {conta.anexo_nota_fiscal && (
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-700" />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-blue-900">Nota Fiscal</Label>
                            <p className="text-xs text-blue-700">Documento fiscal anexado</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            <a 
                              href={conta.anexo_nota_fiscal} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Visualizar
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            <a 
                              href={conta.anexo_nota_fiscal} 
                              download
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anexos antigos (mantido para compatibilidade) */}
                  {conta.anexos && conta.anexos.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Outros Anexos</Label>
                      {conta.anexos.map((anexo, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Anexo {index + 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={anexo} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Visualizar
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={anexo} 
                                download
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <Separator />
          <div className="flex justify-end gap-2">
            {canEdit && !hasPayment && (
              <Button variant="outline" onClick={() => onEdit(conta)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {canApprove && onReprovar && (conta.status === 'aprovado' || conta.status === 'pendente' || conta.approval_status === 'em_aprovacao') && !hasPayment && (
              <Button 
                variant="outline" 
                onClick={() => onReprovar(conta)}
                className="text-orange-600 hover:text-orange-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reprovar
              </Button>
            )}
            {canApprove && onSuspender && (conta.status === 'aprovado' || conta.status === 'pendente' || conta.approval_status === 'em_aprovacao') && !hasPayment && (
              <Button 
                variant="outline" 
                onClick={() => onSuspender(conta)}
                className="text-red-600 hover:text-red-700"
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspender
              </Button>
            )}
            {canEdit && conta.status === 'aprovado' && (
              <Button 
                variant="outline" 
                onClick={() => onPay(conta)}
                className="text-blue-600 hover:text-blue-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Button>
            )}
            {canEdit && conta.status === 'pago' && onEstornar && (
              <Button 
                variant="outline" 
                onClick={() => onEstornar(conta)}
                className="text-orange-600 hover:text-orange-700"
                title="Estornar conta (após verificar no banco)"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Estornar
              </Button>
            )}
            {canDelete && !hasPayment && (
              <Button 
                variant="outline" 
                onClick={() => onDelete(conta)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

