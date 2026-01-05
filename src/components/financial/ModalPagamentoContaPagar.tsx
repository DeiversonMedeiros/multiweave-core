// =====================================================
// COMPONENTE: MODAL DE PAGAMENTO DE CONTA A PAGAR
// =====================================================
// Data: 2025-01-20
// Descrição: Modal para registrar pagamento de conta a pagar com opções de parcelas
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContaPagar, ContaPagarParcela } from '@/integrations/supabase/financial-types';
import { useContasPagarParcelas } from '@/hooks/financial/useContasPagarParcelas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';
import { DollarSign, Calendar, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

interface ModalPagamentoContaPagarProps {
  isOpen: boolean;
  onClose: () => void;
  conta: ContaPagar | null;
  onConfirm: (data: {
    valorPago: number;
    dataPagamento: string;
    parcelaId?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

type TipoPagamento = 'parcela' | 'valor_total' | 'valor_customizado';

export function ModalPagamentoContaPagar({
  isOpen,
  onClose,
  conta,
  onConfirm,
  isLoading = false,
}: ModalPagamentoContaPagarProps) {
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('valor_total');
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string>('');
  const [valorCustomizado, setValorCustomizado] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [erro, setErro] = useState<string | null>(null);

  // Buscar parcelas se a conta for parcelada
  const { data: parcelasData, isLoading: loadingParcelas } = useContasPagarParcelas(
    conta?.id || ''
  );
  const parcelas = parcelasData?.data || [];

  // Resetar estados quando o modal abrir/fechar ou conta mudar
  useEffect(() => {
    if (isOpen && conta) {
      // Se já pagou alguma parcela, não permitir pagar valor total
      const temParcelasPagas = conta.is_parcelada && parcelas.some(p => p.status === 'pago');
      if (temParcelasPagas && conta.is_parcelada && parcelas.length > 0) {
        setTipoPagamento('parcela');
      } else {
        setTipoPagamento(conta.is_parcelada && parcelas.length > 0 ? 'parcela' : 'valor_total');
      }
      setParcelaSelecionada('');
      setValorCustomizado('');
      setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
      setErro(null);
    }
  }, [isOpen, conta, parcelas]);

  // Calcular valor total
  const valorTotal = conta?.valor_original || conta?.valor_atual || 0;

  // Calcular valor já pago
  const valorJaPago = useMemo(() => {
    if (conta?.is_parcelada && parcelas.length > 0) {
      // Se for conta parcelada, somar valor das parcelas pagas
      return parcelas
        .filter(p => p.status === 'pago')
        .reduce((sum, p) => sum + (p.valor_pago || p.valor_atual || 0), 0);
    } else {
      // Se não for parcelada, usar valor_pago da conta
      return conta?.valor_pago || 0;
    }
  }, [conta, parcelas]);

  // Calcular valor restante
  const valorRestante = valorTotal - valorJaPago;

  // Verificar se já pagou alguma parcela
  const temParcelasPagas = conta?.is_parcelada && parcelas.some(p => p.status === 'pago');

  // Verificar se já pagou o valor total
  const valorTotalPago = valorJaPago >= valorTotal;

  // Calcular valor da parcela selecionada
  const valorParcelaSelecionada = parcelas.find(p => p.id === parcelaSelecionada)?.valor_atual || 0;

  // Calcular valor final baseado na seleção
  const valorFinal = (() => {
    switch (tipoPagamento) {
      case 'parcela':
        return valorParcelaSelecionada;
      case 'valor_total':
        return valorTotal;
      case 'valor_customizado':
        const valor = parseFloat(valorCustomizado.replace(/[^\d,.-]/g, '').replace(',', '.'));
        return isNaN(valor) ? 0 : valor;
      default:
        return 0;
    }
  })();

  // Validar formulário
  const validarFormulario = (): boolean => {
    setErro(null);

    if (!dataPagamento) {
      setErro('A data de pagamento é obrigatória.');
      return false;
    }

    if (tipoPagamento === 'parcela' && !parcelaSelecionada) {
      setErro('Selecione uma parcela para pagar.');
      return false;
    }

    if (tipoPagamento === 'valor_customizado') {
      const valor = parseFloat(valorCustomizado.replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (isNaN(valor) || valor <= 0) {
        setErro('Informe um valor válido.');
        return false;
      }
      if (valor > valorRestante) {
        setErro(`O valor não pode ser maior que o valor restante (${formatCurrency(valorRestante)}).`);
        return false;
      }
    }

    // Não permitir pagar valor total se já pagou alguma parcela
    if (tipoPagamento === 'valor_total' && temParcelasPagas) {
      setErro('Não é possível pagar o valor total quando já existem parcelas pagas. Selecione uma parcela específica.');
      return false;
    }

    if (valorFinal <= 0) {
      setErro('O valor do pagamento deve ser maior que zero.');
      return false;
    }

    return true;
  };

  // Formatar valor para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Formatar data para exibição
  const formatDate = (date: string) => {
    return formatDateOnly(date);
  };

  // Handler de confirmação
  const handleConfirm = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      await onConfirm({
        valorPago: valorFinal,
        dataPagamento,
        parcelaId: tipoPagamento === 'parcela' ? parcelaSelecionada : undefined,
      });
      onClose();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao registrar pagamento.');
    }
  };

  // Filtrar parcelas que podem ser pagas (pendentes, aprovadas ou vencidas, mas não pagas)
  const parcelasPendentes = parcelas.filter(
    p => p.status !== 'pago' && p.status !== 'cancelado'
  );

  if (!conta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento da conta: <strong>{conta.numero_titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações da Conta */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Informações da Conta</Label>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                <p className="text-sm font-medium">{conta.fornecedor_nome || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor Total</Label>
                <p className="text-sm font-medium text-primary">{formatCurrency(valorTotal)}</p>
              </div>
              {valorJaPago > 0 && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Já Pago</Label>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(valorJaPago)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Restante</Label>
                    <p className="text-sm font-medium text-orange-600">{formatCurrency(valorRestante)}</p>
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <p className="text-sm font-medium">{formatDate(conta.data_vencimento)}</p>
              </div>
              {conta.is_parcelada && (
                <div>
                  <Label className="text-xs text-muted-foreground">Parcelas</Label>
                  <p className="text-sm font-medium">
                    {conta.numero_parcelas || parcelas.length} parcela(s)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Opções de Pagamento */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Tipo de Pagamento</Label>
            <RadioGroup
              value={tipoPagamento}
              onValueChange={(value) => {
                setTipoPagamento(value as TipoPagamento);
                if (value !== 'parcela') {
                  setParcelaSelecionada('');
                }
                setErro(null);
              }}
            >
              {/* Opção: Pagar Parcela (se houver parcelas) */}
              {conta.is_parcelada && parcelasPendentes.length > 0 && (
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="parcela" id="parcela" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="parcela" className="cursor-pointer font-normal">
                      Pagar Parcela Específica
                    </Label>
                    {tipoPagamento === 'parcela' && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Selecione a parcela:
                        </Label>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {loadingParcelas ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : parcelasPendentes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma parcela pendente encontrada.
                            </p>
                          ) : (
                            parcelasPendentes.map((parcela) => (
                              <div
                                key={parcela.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  parcelaSelecionada === parcela.id
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted/50'
                                }`}
                                onClick={() => {
                                  setParcelaSelecionada(parcela.id);
                                  setTipoPagamento('parcela');
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setParcelaSelecionada(parcela.id);
                                        setTipoPagamento('parcela');
                                      }}
                                    >
                                      {parcelaSelecionada === parcela.id && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <div>
                                      <Label
                                        htmlFor={`parcela-${parcela.id}`}
                                        className="cursor-pointer font-medium"
                                      >
                                        Parcela {parcela.numero_parcela}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        Venc: {formatDate(parcela.data_vencimento)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">
                                      {formatCurrency(parcela.valor_atual)}
                                    </p>
                                    <Badge
                                      variant={
                                        parcela.status === 'pago'
                                          ? 'default'
                                          : parcela.status === 'vencido'
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {parcela.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Opção: Pagar Valor Total - Desabilitar se já pagou alguma parcela */}
              {!temParcelasPagas && (
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem 
                    value="valor_total" 
                    id="valor_total" 
                    className="mt-1" 
                    disabled={temParcelasPagas || valorTotalPago}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor="valor_total" 
                      className={`cursor-pointer font-normal ${temParcelasPagas || valorTotalPago ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Pagar Valor Total
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(valorTotal)}
                    </p>
                    {temParcelasPagas && (
                      <p className="text-xs text-orange-600 mt-1">
                        Não disponível: já existem parcelas pagas
                      </p>
                    )}
                    {valorTotalPago && (
                      <p className="text-xs text-green-600 mt-1">
                        Valor total já foi pago
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Opção: Valor Customizado */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="valor_customizado" id="valor_customizado" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="valor_customizado" className="cursor-pointer font-normal">
                    Digitar Valor Personalizado
                  </Label>
                  {tipoPagamento === 'valor_customizado' && (
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={valorCustomizado}
                        onChange={(e) => {
                          setValorCustomizado(e.target.value);
                          setErro(null);
                        }}
                        className="w-full"
                        max={valorRestante}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor máximo: {formatCurrency(valorRestante)}
                        {valorJaPago > 0 && (
                          <span className="text-orange-600 ml-1">
                            (Restante de {formatCurrency(valorTotal)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Data de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="data_pagamento" className="text-sm font-semibold">
              <Calendar className="h-4 w-4 inline mr-2" />
              Data de Pagamento
            </Label>
            <Input
              id="data_pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => {
                setDataPagamento(e.target.value);
                setErro(null);
              }}
              className="w-full"
            />
          </div>

          {/* Resumo do Pagamento */}
          {valorFinal > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Valor do Pagamento:</Label>
                <p className="text-lg font-bold text-primary">{formatCurrency(valorFinal)}</p>
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || valorFinal <= 0}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

