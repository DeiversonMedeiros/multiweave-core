// =====================================================
// COMPONENTE: DETALHES DA CONCILIAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-01-15
// Descrição: Modal com detalhes da conciliação bancária
// Autor: Sistema MultiWeave Core

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  DollarSign,
  Calendar,
  Building
} from 'lucide-react';
import { ConciliacaoBancaria } from '@/integrations/supabase/financial-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConciliacaoDetailsProps {
  conciliacao: ConciliacaoBancaria;
  onClose: () => void;
  onProcess?: () => void;
  onDownload?: () => void;
}

export function ConciliacaoDetails({
  conciliacao,
  onClose,
  onProcess,
  onDownload,
}: ConciliacaoDetailsProps) {
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
      processando: { label: 'Processando', variant: 'default' as const, icon: RefreshCw },
      concluida: { label: 'Concluída', variant: 'success' as const, icon: CheckCircle },
      erro: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
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

  const fluxoLiquido = conciliacao.total_entradas - conciliacao.total_saidas;
  const diferencaSaldo = conciliacao.saldo_final - (conciliacao.saldo_inicial + fluxoLiquido);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Conciliação Bancária
              </CardTitle>
              <CardDescription>
                {formatDate(conciliacao.data_inicio)} - {formatDate(conciliacao.data_fim)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(conciliacao.status)}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(conciliacao.saldo_inicial)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(conciliacao.total_entradas)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(conciliacao.total_saidas)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(conciliacao.saldo_final)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Análise de Conciliação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Conciliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fluxo Líquido</Label>
                  <p className={`text-lg font-semibold ${fluxoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(fluxoLiquido)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entradas - Saídas
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Diferença de Saldo</Label>
                  <p className={`text-lg font-semibold ${diferencaSaldo === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(diferencaSaldo)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo Final - (Saldo Inicial + Fluxo Líquido)
                  </p>
                </div>
              </div>

              {diferencaSaldo !== 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Conciliação com divergências</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    Existe uma diferença de {formatCurrency(Math.abs(diferencaSaldo))} entre o saldo calculado e o saldo final.
                    Verifique os movimentos não conciliados.
                  </p>
                </div>
              )}

              {diferencaSaldo === 0 && conciliacao.status === 'concluida' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Conciliação perfeita</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Todos os movimentos foram conciliados corretamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movimentos Conciliados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movimentos Conciliados</CardTitle>
              <CardDescription>
                Lista de movimentos processados na conciliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Lista de movimentos em desenvolvimento</p>
                  <p className="text-sm">Esta funcionalidade será implementada na próxima versão</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movimentos Não Conciliados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movimentos Não Conciliados</CardTitle>
              <CardDescription>
                Movimentos que precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Lista de movimentos não conciliados em desenvolvimento</p>
                  <p className="text-sm">Esta funcionalidade será implementada na próxima versão</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {conciliacao.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{conciliacao.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <Separator />
          <div className="flex justify-end gap-2">
            {conciliacao.arquivo_extrato && onDownload && (
              <Button variant="outline" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Extrato
              </Button>
            )}
            {conciliacao.status === 'pendente' && onProcess && (
              <Button onClick={onProcess}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Processar Conciliação
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
