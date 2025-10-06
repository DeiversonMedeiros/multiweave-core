import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  Coffee, 
  CheckCircle, 
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { useTodayTimeRecord, useRegisterEntry, useRegisterExit, useRegisterLunchEntry, useRegisterLunchExit } from '@/hooks/rh/useTimeRecords';
import { useCompany } from '@/lib/company-context';
import { TimeRecord } from '@/integrations/supabase/rh-types';

// =====================================================
// INTERFACES
// =====================================================

interface TimeClockProps {
  employeeId: string;
  employeeName?: string;
  className?: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function TimeClock({ employeeId, employeeName, className = '' }: TimeClockProps) {
  const { selectedCompany } = useCompany();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Hooks
  const { data: todayRecord, isLoading: loadingRecord } = useTodayTimeRecord(employeeId);
  const registerEntryMutation = useRegisterEntry();
  const registerExitMutation = useRegisterExit();
  const registerLunchEntryMutation = useRegisterLunchEntry();
  const registerLunchExitMutation = useRegisterLunchExit();

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleRegisterEntry = async () => {
    setIsLoading(true);
    try {
      await registerEntryMutation.mutateAsync(employeeId);
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterExit = async () => {
    setIsLoading(true);
    try {
      await registerExitMutation.mutateAsync(employeeId);
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLunchEntry = async () => {
    setIsLoading(true);
    try {
      await registerLunchEntryMutation.mutateAsync(employeeId);
    } catch (error) {
      console.error('Erro ao registrar entrada do almoço:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLunchExit = async () => {
    setIsLoading(true);
    try {
      await registerLunchExitMutation.mutateAsync(employeeId);
    } catch (error) {
      console.error('Erro ao registrar saída do almoço:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Estados dos botões
  const canRegisterEntry = !todayRecord?.entrada;
  const canRegisterExit = todayRecord?.entrada && !todayRecord?.saida;
  const canRegisterLunchEntry = todayRecord?.entrada && !todayRecord?.entrada_almoco && !todayRecord?.saida;
  const canRegisterLunchExit = todayRecord?.entrada_almoco && !todayRecord?.saida_almoco && !todayRecord?.saida;

  // Calcular horas trabalhadas
  const calculateWorkedHours = () => {
    if (!todayRecord?.entrada || !todayRecord?.saida) {
      return 0;
    }

    const entrada = new Date(`2000-01-01T${todayRecord.entrada}`);
    const saida = new Date(`2000-01-01T${todayRecord.saida}`);
    
    let totalMinutes = (saida.getTime() - entrada.getTime()) / (1000 * 60);
    
    // Subtrair tempo de almoço se existir
    if (todayRecord.entrada_almoco && todayRecord.saida_almoco) {
      const entradaAlmoco = new Date(`2000-01-01T${todayRecord.entrada_almoco}`);
      const saidaAlmoco = new Date(`2000-01-01T${todayRecord.saida_almoco}`);
      const almocoMinutes = (saidaAlmoco.getTime() - entradaAlmoco.getTime()) / (1000 * 60);
      totalMinutes -= almocoMinutes;
    }
    
    return Math.max(0, totalMinutes / 60);
  };

  const workedHours = calculateWorkedHours();

  // Status do registro
  const getStatus = () => {
    if (!todayRecord) return 'Sem registro';
    if (todayRecord.status === 'aprovado') return 'Aprovado';
    if (todayRecord.status === 'rejeitado') return 'Rejeitado';
    return 'Pendente';
  };

  const getStatusColor = () => {
    if (!todayRecord) return 'secondary';
    if (todayRecord.status === 'aprovado') return 'default';
    if (todayRecord.status === 'rejeitado') return 'destructive';
    return 'outline';
  };

  if (loadingRecord) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Controle de Ponto
        </CardTitle>
        <CardDescription>
          {employeeName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {employeeName}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {currentTime.toLocaleDateString('pt-BR')}
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Relógio atual */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-primary">
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {currentTime.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Status do registro */}
        <div className="text-center">
          <Badge variant={getStatusColor() as any} className="text-sm">
            {getStatus()}
          </Badge>
        </div>

        {/* Registros do dia */}
        {todayRecord && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Entrada</div>
                <div className="font-mono">
                  {todayRecord.entrada || '--:--'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Saída</div>
                <div className="font-mono">
                  {todayRecord.saida || '--:--'}
                </div>
              </div>
            </div>

            {(todayRecord.entrada_almoco || todayRecord.saida_almoco) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium text-muted-foreground">Almoço - Entrada</div>
                  <div className="font-mono">
                    {todayRecord.entrada_almoco || '--:--'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-muted-foreground">Almoço - Saída</div>
                  <div className="font-mono">
                    {todayRecord.saida_almoco || '--:--'}
                  </div>
                </div>
              </div>
            )}

            {workedHours > 0 && (
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Horas Trabalhadas</div>
                <div className="text-2xl font-bold text-primary">
                  {workedHours.toFixed(1)}h
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="space-y-3">
          {/* Entrada/Saída */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleRegisterEntry}
              disabled={!canRegisterEntry || isLoading}
              className="h-12"
              variant={canRegisterEntry ? 'default' : 'outline'}
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Registrando...' : 'Entrada'}
            </Button>
            
            <Button
              onClick={handleRegisterExit}
              disabled={!canRegisterExit || isLoading}
              className="h-12"
              variant={canRegisterExit ? 'default' : 'outline'}
            >
              <Pause className="h-4 w-4 mr-2" />
              {isLoading ? 'Registrando...' : 'Saída'}
            </Button>
          </div>

          {/* Almoço */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleRegisterLunchEntry}
              disabled={!canRegisterLunchEntry || isLoading}
              className="h-10"
              variant={canRegisterLunchEntry ? 'secondary' : 'outline'}
            >
              <Coffee className="h-4 w-4 mr-2" />
              {isLoading ? 'Registrando...' : 'Almoço - Entrada'}
            </Button>
            
            <Button
              onClick={handleRegisterLunchExit}
              disabled={!canRegisterLunchExit || isLoading}
              className="h-10"
              variant={canRegisterLunchExit ? 'secondary' : 'outline'}
            >
              <Coffee className="h-4 w-4 mr-2" />
              {isLoading ? 'Registrando...' : 'Almoço - Saída'}
            </Button>
          </div>
        </div>

        {/* Observações */}
        {todayRecord?.observacoes && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Observações:</div>
                <div className="text-sm text-muted-foreground">
                  {todayRecord.observacoes}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TimeClock;
