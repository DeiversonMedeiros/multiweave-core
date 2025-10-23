// =====================================================
// COMPONENTE: DETALHES DA CONTA A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Modal com detalhes completos da conta a pagar
// Autor: Sistema MultiWeave Core

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  User
} from 'lucide-react';
import { ContaPagar } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaPagarDetailsProps {
  conta: ContaPagar;
  onClose: () => void;
  onEdit: (conta: ContaPagar) => void;
  onDelete: (conta: ContaPagar) => void;
  onApprove: (conta: ContaPagar) => void;
  onReject: (conta: ContaPagar) => void;
  onPay: (conta: ContaPagar) => void;
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
  onPay,
  canEdit,
  canDelete,
  canApprove,
}: ContaPagarDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      aprovado: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle },
      pago: { label: 'Pago', variant: 'success' as const, icon: CheckCircle },
      vencido: { label: 'Vencido', variant: 'destructive' as const, icon: AlertTriangle },
      cancelado: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle },
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
                  <Label className="text-sm font-medium text-muted-foreground">Fornecedor</Label>
                  <p className="text-sm">{conta.fornecedor_nome}</p>
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
                <CardTitle className="text-lg">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conta.forma_pagamento && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</Label>
                    <p className="text-sm capitalize">{conta.forma_pagamento}</p>
                  </div>
                )}
                {conta.departamento && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Departamento</Label>
                    <p className="text-sm">{conta.departamento}</p>
                  </div>
                )}
                {conta.classe_financeira && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Classe Financeira</Label>
                    <p className="text-sm">{conta.classe_financeira}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
          {conta.anexos && conta.anexos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anexos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conta.anexos.map((anexo, index) => (
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

          {/* Ações */}
          <Separator />
          <div className="flex justify-end gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => onEdit(conta)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {canApprove && conta.status === 'pendente' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onApprove(conta)}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onReject(conta)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </>
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
            {canDelete && (
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

