import React, { useEffect, useState } from 'react';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Building2, FolderOpen, Calendar, FileText, AlertTriangle, Clock, CheckCircle, XCircle, CreditCard, Target, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContaPagar } from '@/integrations/supabase/financial-types';

interface ContaPagarDetail {
  numero_titulo: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  descricao: string;
  valor_original: number;
  valor_atual: number;
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  valor_pago: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  data_aprovacao?: string;
  centro_custo_nome?: string;
  projeto_nome?: string;
  departamento?: string;
  classe_financeira?: string;
  classe_financeira_nome?: string;
  categoria?: string;
  forma_pagamento?: string;
  conta_bancaria_nome?: string;
  observacoes?: string;
  anexos?: string[];
  status: string;
  is_parcelada?: boolean;
  numero_parcelas?: number;
  intervalo_parcelas?: string;
  is_urgente?: boolean;
  motivo_urgencia?: string;
  parcelas?: Array<{
    id: string;
    numero_parcela: number;
    numero_titulo: string;
    valor_atual: number;
    data_vencimento: string;
    data_pagamento?: string;
    valor_pago: number;
    status: string;
  }>;
}

interface ContaPagarDetailsProps {
  contaPagarId: string;
}

export function ContaPagarDetails({ contaPagarId }: ContaPagarDetailsProps) {
  const { selectedCompany } = useCompany();
  const [contaDetail, setContaDetail] = useState<ContaPagarDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Função auxiliar para converter string de data em Date corretamente
  const parseDate = (date: string): Date => {
    if (!date) return new Date(NaN);
    try {
      // Se a data está em formato ISO (com ou sem timezone), usar parseISO
      // Caso contrário, tentar criar Date diretamente
      if (date.includes('T') || date.includes('Z') || date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parseISO(date);
      }
      return new Date(date);
    } catch (error) {
      console.error('Erro ao fazer parse da data:', date, error);
      return new Date(NaN);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      const dateObj = parseDate(date);
      
      // Verificar se a data é válida
      if (isNaN(dateObj.getTime())) {
        return '-';
      }
      
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', date, error);
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
      pago: { label: 'Pago', className: 'bg-blue-100 text-blue-800' },
      vencido: { label: 'Vencido', className: 'bg-red-100 text-red-800' },
      cancelado: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || statusConfig.pendente;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
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

  useEffect(() => {
    async function loadDetails() {
      if (!selectedCompany?.id || !contaPagarId) return;
      
      try {
        setLoading(true);
        
        // 1. Buscar conta a pagar principal
        const contaResult = await EntityService.getById<ContaPagar>({
          schema: 'financeiro',
          table: 'contas_pagar',
          id: contaPagarId,
          companyId: selectedCompany.id
        });

        if (!contaResult) {
          setLoading(false);
          return;
        }

        // 2. Buscar centro de custo
        let centroCustoNome: string | undefined;
        if (contaResult.centro_custo_id) {
          try {
            const centroCusto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'cost_centers',
              id: contaResult.centro_custo_id,
              companyId: selectedCompany.id
            });
            centroCustoNome = centroCusto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar centro de custo:', err);
          }
        }

        // 3. Buscar projeto
        let projetoNome: string | undefined;
        if (contaResult.projeto_id) {
          try {
            const projeto = await EntityService.getById<{ id: string; nome: string }>({
              schema: 'public',
              table: 'projects',
              id: contaResult.projeto_id,
              companyId: selectedCompany.id
            });
            projetoNome = projeto?.nome;
          } catch (err) {
            console.warn('Erro ao buscar projeto:', err);
          }
        }

        // 4. Buscar conta bancária
        let contaBancariaNome: string | undefined;
        if (contaResult.conta_bancaria_id) {
          try {
            const contaBancaria = await EntityService.getById<{ id: string; nome: string; banco?: string }>({
              schema: 'financeiro',
              table: 'contas_bancarias',
              id: contaResult.conta_bancaria_id,
              companyId: selectedCompany.id
            });
            contaBancariaNome = contaBancaria?.nome + (contaBancaria?.banco ? ` - ${contaBancaria.banco}` : '');
          } catch (err) {
            console.warn('Erro ao buscar conta bancária:', err);
          }
        }

        // 4.5. Buscar nome da classe financeira se for um UUID
        let classeFinanceiraNome: string | undefined;
        if (contaResult.classe_financeira) {
          // Verificar se é um UUID válido
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(contaResult.classe_financeira)) {
            try {
              const classeFinanceira = await EntityService.getById<{ id: string; nome: string; codigo?: string }>({
                schema: 'financeiro',
                table: 'classes_financeiras',
                id: contaResult.classe_financeira,
                companyId: selectedCompany.id
              });
              classeFinanceiraNome = classeFinanceira?.nome || (classeFinanceira?.codigo ? `${classeFinanceira.codigo} - ${classeFinanceira.nome}` : undefined);
            } catch (err) {
              console.warn('Erro ao buscar classe financeira:', err);
            }
          } else {
            // Se não for UUID, usar o valor diretamente como nome
            classeFinanceiraNome = contaResult.classe_financeira;
          }
        }

        // 5. Buscar parcelas se for conta parcelada
        let parcelas: ContaPagarDetail['parcelas'] = [];
        if (contaResult.is_parcelada) {
          try {
            const parcelasResult = await EntityService.list<{
              id: string;
              numero_parcela: number;
              numero_titulo: string;
              valor_atual: number;
              data_vencimento: string;
              data_pagamento?: string;
              valor_pago: number;
              status: string;
            }>({
              schema: 'financeiro',
              table: 'contas_pagar_parcelas',
              companyId: selectedCompany.id,
              filters: { conta_pagar_id: contaPagarId },
              page: 1,
              pageSize: 1000,
              skipCompanyFilter: true
            });
            parcelas = parcelasResult.data || [];
          } catch (err) {
            console.warn('Erro ao buscar parcelas:', err);
          }
        }

        setContaDetail({
          numero_titulo: contaResult.numero_titulo,
          fornecedor_nome: contaResult.fornecedor_nome,
          fornecedor_cnpj: contaResult.fornecedor_cnpj,
          descricao: contaResult.descricao,
          valor_original: contaResult.valor_original,
          valor_atual: contaResult.valor_atual,
          valor_desconto: contaResult.valor_desconto || 0,
          valor_juros: contaResult.valor_juros || 0,
          valor_multa: contaResult.valor_multa || 0,
          valor_pago: contaResult.valor_pago || 0,
          data_emissao: contaResult.data_emissao,
          data_vencimento: contaResult.data_vencimento,
          data_pagamento: contaResult.data_pagamento,
          data_aprovacao: contaResult.data_aprovacao,
          centro_custo_nome: centroCustoNome,
          projeto_nome: projetoNome,
          departamento: contaResult.departamento,
          classe_financeira: contaResult.classe_financeira,
          classe_financeira_nome: classeFinanceiraNome,
          categoria: contaResult.categoria,
          forma_pagamento: contaResult.forma_pagamento,
          conta_bancaria_nome: contaBancariaNome,
          observacoes: contaResult.observacoes,
          anexos: contaResult.anexos,
          status: contaResult.status,
          is_parcelada: contaResult.is_parcelada,
          numero_parcelas: contaResult.numero_parcelas,
          intervalo_parcelas: contaResult.intervalo_parcelas,
          is_urgente: contaResult.is_urgente,
          motivo_urgencia: contaResult.motivo_urgencia,
          parcelas
        });
      } catch (error) {
        console.error('Erro ao carregar detalhes da conta a pagar:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [contaPagarId, selectedCompany?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando detalhes...</span>
      </div>
    );
  }

  if (!contaDetail) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não foi possível carregar os detalhes da conta a pagar
      </div>
    );
  }

  const isVencida = parseDate(contaDetail.data_vencimento) < new Date() && contaDetail.status !== 'pago';

  return (
    <div className="space-y-4">
      {/* Alerta se vencida */}
      {isVencida && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Conta vencida!</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Esta conta está vencida há {Math.ceil((new Date().getTime() - parseDate(contaDetail.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))} dias.
          </p>
        </div>
      )}

      {/* Informações gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Número do Título:</span>
            <span className="font-medium">{contaDetail.numero_titulo}</span>
          </div>
          {contaDetail.fornecedor_nome && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fornecedor:</span>
              <span className="font-medium">{contaDetail.fornecedor_nome}</span>
            </div>
          )}
          {contaDetail.fornecedor_cnpj && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">CNPJ:</span>
              <span className="font-medium">{contaDetail.fornecedor_cnpj}</span>
            </div>
          )}
          {contaDetail.centro_custo_nome && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Centro de Custo:</span>
              <span className="font-medium">{contaDetail.centro_custo_nome}</span>
            </div>
          )}
          {contaDetail.projeto_nome && (
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Projeto:</span>
              <span className="font-medium">{contaDetail.projeto_nome}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            {getStatusBadge(contaDetail.status)}
          </div>
          {contaDetail.categoria && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Categoria:</span>
              <span className="font-medium capitalize">{contaDetail.categoria}</span>
            </div>
          )}
          {contaDetail.departamento && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Departamento:</span>
              <span className="font-medium">{contaDetail.departamento}</span>
            </div>
          )}
          {contaDetail.classe_financeira_nome && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Classe Financeira:</span>
              <span className="font-medium">{contaDetail.classe_financeira_nome}</span>
            </div>
          )}
        </div>
      </div>

      {/* Valores */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Valor Original</div>
              <div className="text-lg font-semibold">{formatCurrency(contaDetail.valor_original)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Valor Atual</div>
              <div className="text-lg font-semibold">{formatCurrency(contaDetail.valor_atual)}</div>
            </div>
            {contaDetail.valor_desconto > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Desconto</div>
                <div className="text-sm text-green-600">-{formatCurrency(contaDetail.valor_desconto)}</div>
              </div>
            )}
            {(contaDetail.valor_juros > 0 || contaDetail.valor_multa > 0) && (
              <div>
                <div className="text-sm text-muted-foreground">Juros/Multa</div>
                <div className="text-sm text-red-600">
                  +{formatCurrency(contaDetail.valor_juros + contaDetail.valor_multa)}
                </div>
              </div>
            )}
            {contaDetail.valor_pago > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Valor Pago</div>
                <div className="text-sm text-blue-600">{formatCurrency(contaDetail.valor_pago)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datas */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Emissão</div>
              <div className="text-sm font-medium">{formatDate(contaDetail.data_emissao)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="text-sm font-medium">{formatDate(contaDetail.data_vencimento)}</div>
            </div>
            {contaDetail.data_pagamento && (
              <div>
                <div className="text-sm text-muted-foreground">Pagamento</div>
                <div className="text-sm font-medium">{formatDate(contaDetail.data_pagamento)}</div>
              </div>
            )}
            {contaDetail.data_aprovacao && (
              <div>
                <div className="text-sm text-muted-foreground">Aprovação</div>
                <div className="text-sm font-medium">{formatDate(contaDetail.data_aprovacao)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forma de Pagamento */}
      {(contaDetail.forma_pagamento || contaDetail.conta_bancaria_nome) && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {contaDetail.forma_pagamento && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <span className="font-medium capitalize">{contaDetail.forma_pagamento}</span>
                </div>
              )}
              {contaDetail.conta_bancaria_nome && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Conta Bancária:</span>
                  <span className="font-medium">{contaDetail.conta_bancaria_nome}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descrição */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Descrição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm whitespace-pre-wrap">{contaDetail.descricao}</p>
        </CardContent>
      </Card>

      {/* Informações de Urgência */}
      {contaDetail.is_urgente && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex-shrink-0 border-b border-orange-200">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Zap className="h-5 w-5" />
              Pagamento Urgente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {contaDetail.motivo_urgencia && (
              <div>
                <div className="text-sm font-medium text-orange-700 mb-1">Motivo da Urgência:</div>
                <p className="text-sm text-orange-900 whitespace-pre-wrap">{contaDetail.motivo_urgencia}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parcelamento */}
      {contaDetail.is_parcelada && contaDetail.parcelas && contaDetail.parcelas.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Parcelas ({contaDetail.parcelas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-hidden">
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nº Título</TableHead>
                      <TableHead className="w-32">Valor</TableHead>
                      <TableHead className="w-32">Vencimento</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      {contaDetail.parcelas.some(p => p.valor_pago > 0) && (
                        <TableHead className="w-32">Valor Pago</TableHead>
                      )}
                      {contaDetail.parcelas.some(p => p.data_pagamento) && (
                        <TableHead className="w-32">Data Pagamento</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contaDetail.parcelas.map((parcela) => (
                      <TableRow key={parcela.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm text-muted-foreground font-medium">
                          {parcela.numero_parcela}ª
                        </TableCell>
                        <TableCell className="font-medium">
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
                        {contaDetail.parcelas!.some(p => p.valor_pago > 0) && (
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
                        {contaDetail.parcelas!.some(p => p.data_pagamento) && (
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
              </ScrollArea>
            </div>
            <div className="p-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total das Parcelas:</span>
                <span className="font-semibold">
                  {formatCurrency(contaDetail.parcelas.reduce((sum, p) => sum + p.valor_atual, 0))}
                </span>
              </div>
              {contaDetail.parcelas.some(p => p.valor_pago > 0) && (
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Total Pago:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(contaDetail.parcelas.reduce((sum, p) => sum + p.valor_pago, 0))}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {contaDetail.observacoes && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap">{contaDetail.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Anexos */}
      {contaDetail.anexos && contaDetail.anexos.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Anexos ({contaDetail.anexos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {contaDetail.anexos.map((anexo, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={anexo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Anexo {index + 1}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

