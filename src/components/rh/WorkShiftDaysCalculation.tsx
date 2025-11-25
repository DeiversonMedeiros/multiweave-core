import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Calendar, Calculator } from 'lucide-react';
import { WorkShift } from '@/integrations/supabase/rh-types';

interface WorkShiftDaysCalculationProps {
  workShifts: WorkShift[];
  isLoading?: boolean;
}

interface CalculationResult {
  workShift: WorkShift;
  totalDays: number;
  workingDays: number;
  restDays: number;
  cycles: number;
  workingDaysByCycle: number;
}

/**
 * Calcula os dias de trabalho para uma escala em um período
 */
function calculateWorkDaysForShift(
  workShift: WorkShift,
  startDate: Date,
  endDate: Date
): CalculationResult {
  // Garantir que as datas estão corretas
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Calcular total de dias incluindo início e fim
  // Usar Math.floor para garantir precisão (não Math.ceil que pode adicionar dias extras)
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalDays = diffDays + 1; // +1 para incluir o dia inicial
  
  // Calcular ciclos completos no período
  const cycleLength = workShift.ciclo_dias || 7;
  const workingDaysPerCycle = workShift.dias_trabalho || 5;
  const restDaysPerCycle = workShift.dias_folga || 2;
  
  let totalWorkingDays = 0;
  let totalRestDays = 0;
  
  // Para escalas fixas, contar dia a dia baseado nos dias da semana
  if (workShift.tipo_escala === 'fixa') {
    const diasSemana = workShift.dias_semana || [1, 2, 3, 4, 5];
    
    // Iterar sobre cada dia do período
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(end);
    endDateOnly.setHours(0, 0, 0, 0);
    
    // Contar todos os dias do período (incluindo início e fim)
    while (current <= endDateOnly) {
      // Converter para formato: 1=Segunda, 2=Terça, etc.
      // JavaScript: 0=Domingo, 1=Segunda, etc.
      const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
      
      if (diasSemana.includes(dayOfWeek)) {
        totalWorkingDays++;
      } else {
        totalRestDays++;
      }
      
      // Avançar para o próximo dia (meia-noite)
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Para escalas rotativas, calcular baseado no ciclo
    // Número de ciclos completos
    const fullCycles = Math.floor(totalDays / cycleLength);
    const remainingDays = totalDays % cycleLength;
    
    // Dias de trabalho dos ciclos completos
    totalWorkingDays = fullCycles * workingDaysPerCycle;
    totalRestDays = fullCycles * restDaysPerCycle;
    
    // Calcular dias de trabalho nos dias restantes (proporcional)
    if (remainingDays > 0) {
      // Para escalas com padrão específico, aplicar proporção mais precisa
      const workingDaysRatio = workingDaysPerCycle / cycleLength;
      const additionalWorkingDays = Math.floor(remainingDays * workingDaysRatio);
      const additionalRestDays = remainingDays - additionalWorkingDays;
      
      totalWorkingDays += additionalWorkingDays;
      totalRestDays += additionalRestDays;
    }
  }
  
  const cycles = workShift.tipo_escala === 'fixa' 
    ? totalDays / cycleLength 
    : Math.ceil(totalDays / cycleLength);
  
  return {
    workShift,
    totalDays,
    workingDays: totalWorkingDays,
    restDays: totalRestDays,
    cycles: cycles,
    workingDaysByCycle: workingDaysPerCycle,
  };
}

/**
 * Obtém o label do tipo de escala
 */
function getEscalaLabel(tipo: string): string {
  const labels: Record<string, string> = {
    fixa: 'Escala Fixa',
    flexivel_6x1: 'Flexível 6x1',
    flexivel_5x2: 'Flexível 5x2',
    flexivel_4x3: 'Flexível 4x3',
    escala_12x36: '12x36',
    escala_24x48: '24x48',
    personalizada: 'Personalizada',
  };
  return labels[tipo] || tipo;
}

export function WorkShiftDaysCalculation({
  workShifts,
  isLoading = false
}: WorkShiftDaysCalculationProps) {
  const [periodType, setPeriodType] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Inicializar datas customizadas com o início e fim do mês atual
  const initializeCustomDates = () => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return { start, end };
  };
  
  const initialDates = useMemo(initializeCustomDates, []);
  const [customStartDate, setCustomStartDate] = useState(initialDates.start);
  const [customEndDate, setCustomEndDate] = useState(initialDates.end);

  // Calcular datas do período
  const { startDate, endDate } = useMemo(() => {
    let start: Date;
    let end: Date;

    if (periodType === 'month') {
      // Primeiro dia do mês às 00:00:00
      start = new Date(selectedYear, selectedMonth - 1, 1);
      start.setHours(0, 0, 0, 0);
      // Último dia do mês às 23:59:59
      end = new Date(selectedYear, selectedMonth, 0); // Último dia do mês (dia 0 do próximo mês)
      end.setHours(23, 59, 59, 999);
    } else {
      // Validar datas customizadas
      if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        // Garantir que a data fim seja posterior à data início
        if (end < start) {
          end = new Date(start);
        }
      } else {
        // Fallback para o mês atual
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }

    return { startDate: start, endDate: end };
  }, [periodType, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Calcular resultados para cada escala
  const calculations = useMemo(() => {
    if (isLoading || !workShifts.length) return [];

    return workShifts
      .filter(ws => ws.status === 'ativo') // Apenas escalas ativas
      .map(workShift => calculateWorkDaysForShift(workShift, startDate, endDate))
      .sort((a, b) => b.workingDays - a.workingDays); // Ordenar por dias trabalhados
  }, [workShifts, startDate, endDate, isLoading]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    if (!calculations.length) {
      return {
        totalShifts: 0,
        totalWorkingDays: 0,
        averageWorkingDays: 0,
        totalCycles: 0,
      };
    }

    const totalWorkingDays = calculations.reduce((sum, calc) => sum + calc.workingDays, 0);
    const totalCycles = calculations.reduce((sum, calc) => sum + calc.cycles, 0);

    return {
      totalShifts: calculations.length,
      totalWorkingDays,
      averageWorkingDays: Math.round((totalWorkingDays / calculations.length) * 100) / 100,
      totalCycles,
    };
  }, [calculations]);

  // Gerar lista de meses
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const date = new Date(selectedYear, i, 1);
    return {
      value: month,
      label: date.toLocaleDateString('pt-BR', { month: 'long' }),
    };
  });

  // Gerar lista de anos (últimos 5 anos e próximos 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="space-y-6">
      {/* Configuração do Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configuração do Período
          </CardTitle>
          <CardDescription>
            Selecione o período para calcular os dias de trabalho de cada escala
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo de Período</Label>
              <Select value={periodType} onValueChange={(value: 'month' | 'custom') => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mês Específico</SelectItem>
                  <SelectItem value="custom">Período Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'month' ? (
              <>
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Período selecionado: {startDate.toLocaleDateString('pt-BR')} a {endDate.toLocaleDateString('pt-BR')}
              {periodType === 'custom' && (
                <span className="ml-2 text-xs">
                  ({Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalas Analisadas</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              Escalas ativas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dias Trabalhados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkingDays}</div>
            <p className="text-xs text-muted-foreground">
              Soma de todas as escalas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Dias Trabalhados</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageWorkingDays}</div>
            <p className="text-xs text-muted-foreground">
              Por escala
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ciclos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCycles}</div>
            <p className="text-xs text-muted-foreground">
              Ciclos completos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados por Escala</CardTitle>
          <CardDescription>
            Cálculo detalhado dos dias de trabalho para cada escala no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando cálculos...
            </div>
          ) : calculations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma escala ativa encontrada
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escala</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dias Trabalho/Ciclo</TableHead>
                    <TableHead>Total de Dias</TableHead>
                    <TableHead>Dias Trabalhados</TableHead>
                    <TableHead>Dias de Folga</TableHead>
                    <TableHead>Ciclos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.workShift.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{calc.workShift.nome}</div>
                          {calc.workShift.codigo && (
                            <div className="text-xs text-muted-foreground">
                              {calc.workShift.codigo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getEscalaLabel(calc.workShift.tipo_escala)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {calc.workingDaysByCycle} dias
                      </TableCell>
                      <TableCell>{calc.totalDays}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {calc.workingDays}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {calc.restDays}
                      </TableCell>
                      <TableCell>
                        {calc.cycles.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

