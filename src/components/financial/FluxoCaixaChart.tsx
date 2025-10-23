// =====================================================
// COMPONENTE: GRÁFICO DE FLUXO DE CAIXA
// =====================================================
// Data: 2025-01-15
// Descrição: Gráfico para visualizar fluxo de caixa
// Autor: Sistema MultiWeave Core

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FluxoCaixa } from '@/integrations/supabase/financial-types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FluxoCaixaChartProps {
  data: FluxoCaixa[];
  className?: string;
}

export function FluxoCaixaChart({ data, className }: FluxoCaixaChartProps) {
  // Processar dados para os últimos 30 dias
  const endDate = new Date();
  const startDate = subDays(endDate, 30);

  // Agrupar dados por dia
  const dailyData = data
    .filter(item => {
      const itemDate = new Date(item.data_projecao);
      return itemDate >= startDate && itemDate <= endDate;
    })
    .reduce((acc, item) => {
      const date = format(new Date(item.data_projecao), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          entradas: 0,
          saidas: 0,
          saldo: 0,
          movimentos: 0,
        };
      }
      
      if (item.tipo_movimento === 'entrada') {
        acc[date].entradas += item.valor;
      } else {
        acc[date].saidas += item.valor;
      }
      
      acc[date].saldo = acc[date].entradas - acc[date].saidas;
      acc[date].movimentos += 1;
      
      return acc;
    }, {} as Record<string, any>);

  // Criar array com todos os dias
  const chartData = [];
  for (let i = 0; i < 30; i++) {
    const date = subDays(endDate, 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dailyData[dateStr] || {
      date: dateStr,
      entradas: 0,
      saidas: 0,
      saldo: 0,
      movimentos: 0,
    };
    chartData.push(dayData);
  }

  // Calcular estatísticas
  const totalEntradas = chartData.reduce((sum, day) => sum + day.entradas, 0);
  const totalSaidas = chartData.reduce((sum, day) => sum + day.saidas, 0);
  const saldoLiquido = totalEntradas - totalSaidas;
  const mediaDiaria = saldoLiquido / 30;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
  };

  // Encontrar valores máximos para escala
  const maxValue = Math.max(
    ...chartData.map(day => Math.max(day.entradas, day.saidas, Math.abs(day.saldo)))
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Entradas</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(totalEntradas)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Saídas</p>
          <p className="text-lg font-semibold text-red-600">
            {formatCurrency(totalSaidas)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Saldo Líquido</p>
          <p className={`text-lg font-semibold ${saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldoLiquido)}
          </p>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Últimos 30 dias</span>
          <span>Média diária: {formatCurrency(mediaDiaria)}</span>
        </div>
        
        <div className="h-64 flex items-end gap-1">
          {chartData.map((day, index) => {
            const entradasHeight = (day.entradas / maxValue) * 100;
            const saidasHeight = (day.saidas / maxValue) * 100;
            const saldoHeight = (Math.abs(day.saldo) / maxValue) * 100;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center space-y-1">
                {/* Barras */}
                <div className="w-full flex flex-col items-center space-y-1">
                  {/* Entradas */}
                  {day.entradas > 0 && (
                    <div
                      className="w-full bg-green-500 rounded-t-sm"
                      style={{ height: `${entradasHeight}%` }}
                      title={`Entradas: ${formatCurrency(day.entradas)}`}
                    />
                  )}
                  
                  {/* Saídas */}
                  {day.saidas > 0 && (
                    <div
                      className="w-full bg-red-500 rounded-b-sm"
                      style={{ height: `${saidasHeight}%` }}
                      title={`Saídas: ${formatCurrency(day.saidas)}`}
                    />
                  )}
                  
                  {/* Saldo */}
                  {day.saldo !== 0 && (
                    <div
                      className={`w-full h-1 ${day.saldo >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                      title={`Saldo: ${formatCurrency(day.saldo)}`}
                    />
                  )}
                </div>
                
                {/* Data */}
                {index % 5 === 0 && (
                  <div className="text-xs text-muted-foreground transform -rotate-90 origin-center">
                    {formatDate(day.date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Entradas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Saídas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-green-600"></div>
          <span>Saldo Positivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-red-600"></div>
          <span>Saldo Negativo</span>
        </div>
      </div>

      {/* Resumo por Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Previstos</span>
              <Badge variant="secondary">
                {data.filter(f => f.status === 'previsto').length}
              </Badge>
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(
                data
                  .filter(f => f.status === 'previsto')
                  .reduce((sum, f) => sum + f.valor, 0)
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confirmados</span>
              <Badge variant="default">
                {data.filter(f => f.status === 'confirmado').length}
              </Badge>
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(
                data
                  .filter(f => f.status === 'confirmado')
                  .reduce((sum, f) => sum + f.valor, 0)
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Realizados</span>
              <Badge variant="success">
                {data.filter(f => f.status === 'realizado').length}
              </Badge>
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(
                data
                  .filter(f => f.status === 'realizado')
                  .reduce((sum, f) => sum + f.valor, 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
