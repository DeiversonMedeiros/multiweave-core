import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  RotateCcw,
  Award,
  FileText,
  AlertCircle
} from 'lucide-react';
import { OnlineTrainingService, TrainingExamAttempt, TrainingExam } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { RequireModule } from '@/components/RequireAuth';

export default function TrainingExamResultPage() {
  const { trainingId, examId, attemptId } = useParams<{ trainingId: string; examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [attempt, setAttempt] = useState<TrainingExamAttempt | null>(null);
  const [exam, setExam] = useState<TrainingExam | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  // Ref para evitar múltiplas execuções
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // Evitar múltiplas execuções
    if (hasLoadedRef.current) {
      return;
    }
    
    // Se já tem dados carregados, não recarregar
    if (attempt && exam) {
      hasLoadedRef.current = true;
      return;
    }
    
    const loadResult = async () => {
      if (!selectedCompany?.id || !examId || !attemptId || !employeeId) return;
      
      console.log('[TrainingExamResultPage] Carregando resultado da prova');
      hasLoadedRef.current = true;
      setLoading(true);
      try {
        // Carregar tentativa
        const attemptData = await OnlineTrainingService.getExamAttempt(selectedCompany.id, attemptId);
        if (!attemptData) {
          console.error('[TrainingExamResultPage] Tentativa não encontrada');
          toast({
            title: 'Erro',
            description: 'Tentativa não encontrada.',
            variant: 'destructive'
          });
          navigate(`/portal-colaborador/treinamentos/${trainingId}`);
          return;
        }
        setAttempt(attemptData);
        console.log('[TrainingExamResultPage] Tentativa carregada:', attemptData.id);

        // Carregar prova
        const examData = await OnlineTrainingService.getExam(selectedCompany.id, examId);
        setExam(examData);
        console.log('[TrainingExamResultPage] Prova carregada:', examData?.titulo);
      } catch (err) {
        console.error('[TrainingExamResultPage] Erro ao carregar resultado:', err);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar resultado da prova.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id, examId, attemptId, employeeId, trainingId]); // Removido navigate e toast das dependências

  const handleRetakeTraining = () => {
    // Navegar para a primeira aula do treinamento
    navigate(`/portal-colaborador/treinamentos/${trainingId}`);
  };

  const handleViewCompletion = () => {
    // Navegar para a página de conclusão do treinamento
    navigate(`/portal-colaborador/treinamentos/${trainingId}/conclusao`);
  };

  if (isLoadingEmployees || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando resultado...</p>
        </div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Funcionário não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!attempt || !exam) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>
            Resultado não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isApproved = attempt.aprovado || false;
  const percentCorrect = attempt.percentual_acerto || 0;
  const minimumScore = exam.nota_minima_aprovacao || 70;

  return (
    <RequireModule module="portal_colaborador" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/portal-colaborador/treinamentos/${trainingId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Resultado da Prova
              </h1>
              <p className="text-muted-foreground mt-1">
                {exam.titulo}
              </p>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <Card className={isApproved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isApproved ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-green-700">Prova Aprovada!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-red-700">Prova Reprovada</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Percentual de Acerto</p>
                <p className="text-2xl font-bold">{percentCorrect.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nota Mínima para Aprovação</p>
                <p className="text-2xl font-bold">{minimumScore}%</p>
              </div>
            </div>

            {attempt.nota_final !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Pontuação Total</p>
                <p className="text-xl font-semibold">{attempt.nota_final} pontos</p>
              </div>
            )}

            {attempt.tempo_gasto_segundos && (
              <div>
                <p className="text-sm text-muted-foreground">Tempo Gasto</p>
                <p className="text-lg">
                  {Math.floor(attempt.tempo_gasto_segundos / 60)} minutos e {attempt.tempo_gasto_segundos % 60} segundos
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              {isApproved ? (
                <div className="space-y-4">
                  <Alert className="bg-green-100 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Parabéns! Você foi aprovado na prova final. O treinamento foi concluído com sucesso!
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={handleViewCompletion}
                    className="w-full"
                    size="lg"
                  >
                    <Award className="h-5 w-5 mr-2" />
                    Ver Conclusão do Treinamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-red-100 border-red-200">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Você não atingiu a nota mínima de {minimumScore}% para aprovação. 
                      É necessário refazer o treinamento para tentar novamente.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={handleRetakeTraining}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Refazer Treinamento
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireModule>
  );
}
