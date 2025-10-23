import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { usePeriodicExams } from '@/hooks/rh/usePeriodicExams';
import { supabase } from '@/integrations/supabase/client';

interface AutomaticSchedulingProps {
  companyId: string;
  onScheduled?: (count: number) => void;
}

interface SchedulingResult {
  totalEmployees: number;
  scheduledExams: number;
  skippedExams: number;
  errors: string[];
}

export function AutomaticScheduling({ companyId, onScheduled }: AutomaticSchedulingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SchedulingResult | null>(null);
  const { toast } = useToast();
  
  // Usar hooks para buscar dados
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: existingExams = [] } = usePeriodicExams();

  const scheduleAutomaticExams = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Filtrar funcionários ativos
      const activeEmployees = employees.filter(emp => emp.status === 'ativo');

      const scheduledExams: any[] = [];
      const errors: string[] = [];
      let skippedCount = 0;

      for (const employee of activeEmployees) {
        try {
          // Verificar se já existe exame periódico agendado para o próximo ano
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);

          const hasExistingExam = existingExams.some(exam => 
            exam.employee_id === employee.id &&
            exam.tipo_exame === 'periodico' &&
            new Date(exam.data_agendamento) >= new Date() &&
            new Date(exam.data_agendamento) < nextYear
          );

          if (hasExistingExam) {
            skippedCount++;
            continue;
          }

          // Calcular data do próximo exame (1 ano após admissão ou último exame)
          const admissionDate = new Date(employee.data_admissao);
          const nextExamDate = new Date(admissionDate);
          nextExamDate.setFullYear(nextExamDate.getFullYear() + 1);

          // Se a data já passou, agendar para o próximo ano
          if (nextExamDate < new Date()) {
            nextExamDate.setFullYear(nextExamDate.getFullYear() + 1);
          }

          // Criar exame periódico usando o serviço correto
          const examData = {
            company_id: companyId,
            employee_id: employee.id,
            tipo_exame: 'periodico' as const,
            data_agendamento: nextExamDate.toISOString().split('T')[0],
            data_vencimento: nextExamDate.toISOString().split('T')[0],
            status: 'agendado' as const,
            observacoes: 'Exame periódico agendado automaticamente',
            custo: 200.00,
            pago: false
          };

          // Usar RPC function para criar o exame
          const { data: newExam, error: examError } = await supabase.rpc('create_periodic_exam', {
            p_company_id: companyId,
            p_employee_id: employee.id,
            p_tipo_exame: 'periodico',
            p_data_agendamento: nextExamDate.toISOString().split('T')[0],
            p_data_vencimento: nextExamDate.toISOString().split('T')[0],
            p_status: 'agendado',
            p_observacoes: 'Exame periódico agendado automaticamente',
            p_custo: 200.00,
            p_pago: false
          });

          if (examError) throw examError;

          scheduledExams.push({
            employee: employee.nome,
            examDate: nextExamDate.toISOString().split('T')[0],
            examId: newExam.id
          });

        } catch (error: any) {
          errors.push(`${employee.nome}: ${error.message}`);
        }
      }

      const result: SchedulingResult = {
        totalEmployees: activeEmployees.length,
        scheduledExams: scheduledExams.length,
        skippedExams: skippedCount,
        errors
      };

      setResult(result);

      toast({
        title: "Agendamento Concluído",
        description: `${scheduledExams.length} exames agendados automaticamente.`,
      });

      onScheduled?.(scheduledExams.length);

    } catch (error: any) {
      console.error('Erro no agendamento automático:', error);
      toast({
        title: "Erro no Agendamento",
        description: error.message || 'Erro ao agendar exames automaticamente',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamento Automático
        </CardTitle>
        <CardDescription>
          Agende exames periódicos automaticamente para todos os funcionários ativos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Exames Periódicos</p>
            <p className="text-xs text-muted-foreground">
              Serão agendados exames anuais baseados na data de admissão
            </p>
          </div>
          <Button
            onClick={scheduleAutomaticExams}
            disabled={isLoading || employeesLoading}
            className="flex items-center gap-2"
          >
            {isLoading || employeesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? 'Agendando...' : employeesLoading ? 'Carregando...' : 'Agendar Automaticamente'}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.totalEmployees}
                </div>
                <div className="text-xs text-muted-foreground">Funcionários</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.scheduledExams}
                </div>
                <div className="text-xs text-muted-foreground">Agendados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {result.skippedExams}
                </div>
                <div className="text-xs text-muted-foreground">Pulados</div>
              </div>
            </div>

            {result.scheduledExams > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.scheduledExams} exames periódicos foram agendados com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {result.skippedExams > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {result.skippedExams} funcionários já possuem exames agendados e foram pulados.
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Erros encontrados:</p>
                    {result.errors.map((error, index) => (
                      <p key={index} className="text-xs">{error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Exames são agendados para 1 ano após a admissão</p>
          <p>• Funcionários com exames já agendados são pulados</p>
          <p>• Apenas funcionários ativos são considerados</p>
        </div>
      </CardContent>
    </Card>
  );
}
