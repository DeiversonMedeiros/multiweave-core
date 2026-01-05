import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { OrdemProducao, OrdemServico, Lote } from '@/types/metalurgica';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProducaoChartsProps {
  ops: OrdemProducao[];
  os: OrdemServico[];
  lotes: Lote[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const ProducaoCharts: React.FC<ProducaoChartsProps> = ({ ops, os, lotes }) => {
  // Gráfico de Status de OPs
  const opsStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    ops.forEach(op => {
      statusCount[op.status] = (statusCount[op.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
    }));
  }, [ops]);

  // Gráfico de Produção Mensal
  const producaoMensalData = useMemo(() => {
    const meses: Record<string, { op: number; os: number; lotes: number }> = {};
    
    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const mesKey = format(date, 'MMM/yyyy', { locale: ptBR });
      meses[mesKey] = { op: 0, os: 0, lotes: 0 };
    }

    ops.forEach(op => {
      if (op.data_inicio_producao) {
        const mesKey = format(new Date(op.data_inicio_producao), 'MMM/yyyy', { locale: ptBR });
        if (meses[mesKey]) meses[mesKey].op++;
      }
    });

    os.forEach(osItem => {
      if (osItem.data_inicio_producao) {
        const mesKey = format(new Date(osItem.data_inicio_producao), 'MMM/yyyy', { locale: ptBR });
        if (meses[mesKey]) meses[mesKey].os++;
      }
    });

    lotes.forEach(lote => {
      const mesKey = format(new Date(lote.data_producao), 'MMM/yyyy', { locale: ptBR });
      if (meses[mesKey]) meses[mesKey].lotes++;
    });

    return Object.entries(meses).map(([mes, dados]) => ({
      mes,
      OPs: dados.op,
      OSs: dados.os,
      Lotes: dados.lotes,
    }));
  }, [ops, os, lotes]);

  // Gráfico de Peso Produzido
  const pesoProduzidoData = useMemo(() => {
    const meses: Record<string, number> = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const mesKey = format(date, 'MMM/yyyy', { locale: ptBR });
      meses[mesKey] = 0;
    }

    lotes.forEach(lote => {
      const mesKey = format(new Date(lote.data_producao), 'MMM/yyyy', { locale: ptBR });
      if (meses[mesKey] !== undefined) {
        meses[mesKey] += lote.peso_total_kg || 0;
      }
    });

    return Object.entries(meses).map(([mes, peso]) => ({
      mes,
      peso: Number(peso.toFixed(2)),
    }));
  }, [lotes]);

  // Gráfico de Status de Lotes
  const lotesStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    lotes.forEach(lote => {
      statusCount[lote.status] = (statusCount[lote.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
    }));
  }, [lotes]);

  const chartConfig = {
    ops: {
      label: 'OPs',
      color: 'hsl(var(--chart-1))',
    },
    os: {
      label: 'OSs',
      color: 'hsl(var(--chart-2))',
    },
    lotes: {
      label: 'Lotes',
      color: 'hsl(var(--chart-3))',
    },
    peso: {
      label: 'Peso (kg)',
      color: 'hsl(var(--chart-4))',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Status de OPs */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Ordens de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={opsStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {opsStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Produção Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Produção Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart data={producaoMensalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="OPs" fill="hsl(var(--chart-1))" />
              <Bar dataKey="OSs" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Lotes" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Peso Produzido */}
      <Card>
        <CardHeader>
          <CardTitle>Peso Total Produzido (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={pesoProduzidoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Status de Lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={lotesStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {lotesStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

