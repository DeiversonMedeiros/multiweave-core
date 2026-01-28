import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileText
} from 'lucide-react';
import { OnlineTrainingService, TrainingExam, TrainingExamQuestion, TrainingExamAlternative, TrainingExamAttempt } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { RequirePage } from '@/components/RequireAuth';

export default function TrainingExamPage() {
  const { trainingId, examId } = useParams<{ trainingId: string; examId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<TrainingExam | null>(null);
  const [questions, setQuestions] = useState<Array<{ question: TrainingExamQuestion; alternatives: TrainingExamAlternative[] }>>([]);
  const [attempt, setAttempt] = useState<TrainingExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, { alternative_id?: string; resposta_texto?: string; resposta_numerica?: number }>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Ref para evitar múltiplas execuções do useEffect
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  
  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  // Carregar prova e questões
  useEffect(() => {
    // Evitar múltiplas execuções
    if (hasLoadedRef.current || loadingRef.current) {
      console.log('[TrainingExamPage] Pulando carregamento - já carregado ou em progresso');
      return;
    }

    // Se já tem dados carregados, não recarregar
    if (exam && questions.length > 0) {
      console.log('[TrainingExamPage] Dados já carregados, pulando');
      hasLoadedRef.current = true;
      return;
    }

    const loadExam = async () => {
      if (!selectedCompany?.id || !examId || !employeeId) {
        console.log('[TrainingExamPage] Condições não atendidas', {
          hasCompany: !!selectedCompany?.id,
          hasExamId: !!examId,
          hasEmployeeId: !!employeeId
        });
        return;
      }
      
      console.log('[TrainingExamPage] Iniciando carregamento da prova');
      loadingRef.current = true;
      setLoading(true);
      
      try {
        // Carregar prova
        const examData = await OnlineTrainingService.getExam(selectedCompany.id, examId);
        if (!examData) {
          console.error('[TrainingExamPage] Prova não encontrada');
          toast({
            title: 'Erro',
            description: 'Prova não encontrada.',
            variant: 'destructive'
          });
          navigate(`/portal-colaborador/treinamentos/${trainingId}`);
          return;
        }
        setExam(examData);
        console.log('[TrainingExamPage] Prova carregada:', examData.titulo);

        // Carregar questões
        const questionsData = await OnlineTrainingService.listQuestions(selectedCompany.id, examId);
        console.log('[TrainingExamPage] Questões carregadas:', questionsData.length);
        
        const questionsWithAlternatives = await Promise.all(
          questionsData.map(async (question) => {
            const questionData = await OnlineTrainingService.getQuestionWithAlternatives(
              selectedCompany.id,
              question.id
            );
            return questionData || { question, alternatives: [] };
          })
        );
        setQuestions(questionsWithAlternatives);
        console.log('[TrainingExamPage] Questões com alternativas carregadas:', questionsWithAlternatives.length);

        // Verificar se já existe tentativa em andamento
        // Buscar tentativas existentes usando EntityService diretamente
        const { EntityService } = await import('@/services/generic/entityService');
        const existingAttemptsResult = await EntityService.list<TrainingExamAttempt>({
          schema: 'rh',
          table: 'training_exam_attempts',
          companyId: selectedCompany.id,
          filters: {
            exam_id: examId,
            employee_id: employeeId
          },
          orderBy: 'tentativa_numero',
          orderDirection: 'DESC'
        });
        
        const activeAttempt = existingAttemptsResult.data.find(a => a.status === 'em_andamento');
        console.log('[TrainingExamPage] Tentativa ativa encontrada:', !!activeAttempt);
        
        if (activeAttempt) {
          setAttempt(activeAttempt);
          // Carregar respostas existentes
          const existingAnswers = await OnlineTrainingService.getExamAttemptAnswers(selectedCompany.id, activeAttempt.id);
          const answersMap: Record<string, any> = {};
          existingAnswers.forEach(answer => {
            answersMap[answer.question_id] = {
              alternative_id: answer.alternative_id,
              resposta_texto: answer.resposta_texto,
              resposta_numerica: answer.resposta_numerica
            };
          });
          setAnswers(answersMap);
          console.log('[TrainingExamPage] Respostas existentes carregadas:', Object.keys(answersMap).length);
        } else {
          // Iniciar nova tentativa
          console.log('[TrainingExamPage] Criando nova tentativa');
          const newAttempt = await OnlineTrainingService.startExamAttempt(
            selectedCompany.id,
            examId,
            employeeId,
            trainingId || ''
          );
          setAttempt(newAttempt);
          console.log('[TrainingExamPage] Nova tentativa criada:', newAttempt.id);
        }
        
        hasLoadedRef.current = true;
      } catch (err) {
        console.error('[TrainingExamPage] Erro ao carregar prova:', err);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar prova.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
        loadingRef.current = false;
        console.log('[TrainingExamPage] Carregamento finalizado');
      }
    };

    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id, examId, employeeId, trainingId]); // Removido navigate e toast das dependências

  const handleAnswerChange = (questionId: string, value: { alternative_id?: string; resposta_texto?: string; resposta_numerica?: number }) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSaveAnswer = async (questionId: string) => {
    if (!selectedCompany?.id || !attempt) return;

    const answer = answers[questionId];
    if (!answer) return;

    try {
      await OnlineTrainingService.saveExamAnswer(
        selectedCompany.id,
        attempt.id,
        questionId,
        answer
      );
    } catch (err) {
      console.error('Erro ao salvar resposta:', err);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const currentQuestion = questions[currentQuestionIndex];
      handleSaveAnswer(currentQuestion.question.id);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      handleSaveAnswer(currentQuestion.question.id);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCompany?.id || !attempt) return;

    setSubmitting(true);
    try {
      // Salvar última resposta
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        await handleSaveAnswer(currentQuestion.question.id);
      }

      // Finalizar tentativa
      const result = await OnlineTrainingService.finishExamAttempt(selectedCompany.id, attempt.id);
      
      console.log('[TrainingExamPage] Resultado da prova:', result);

      // Navegar para a página de resultados
      navigate(`/portal-colaborador/treinamentos/${trainingId}/prova/${examId}/resultado/${attempt.id}`);
    } catch (err) {
      console.error('Erro ao finalizar prova:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar prova.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do funcionário...</p>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando prova...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>
            Prova não encontrada ou sem questões.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <RequirePage pagePath="/portal-colaborador/treinamentos*" action="read">
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
                {exam.titulo}
              </h1>
              <p className="text-muted-foreground mt-1">
                Questão {currentQuestionIndex + 1} de {questions.length}
              </p>
            </div>
          </div>
        </div>

        {/* Progresso */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso da Prova</span>
                <span>{currentQuestionIndex + 1} de {questions.length} questões</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Questão atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg font-semibold">Questão {currentQuestionIndex + 1}</span>
              <Badge variant="outline">{currentQuestion.question.pontuacao} pontos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-medium mb-4">{currentQuestion.question.pergunta}</p>
              
              {currentQuestion.question.tipo_questao === 'multipla_escolha' && (
                <div className="space-y-2">
                  {currentQuestion.alternatives.map((alternative) => (
                    <label
                      key={alternative.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.question.id}`}
                        value={alternative.id}
                        checked={answers[currentQuestion.question.id]?.alternative_id === alternative.id}
                        onChange={() => handleAnswerChange(currentQuestion.question.id, { alternative_id: alternative.id })}
                        className="w-4 h-4"
                      />
                      <span>{alternative.texto}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question.tipo_questao === 'verdadeiro_falso' && (
                <div className="space-y-2">
                  {currentQuestion.alternatives.map((alternative) => (
                    <label
                      key={alternative.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.question.id}`}
                        value={alternative.id}
                        checked={answers[currentQuestion.question.id]?.alternative_id === alternative.id}
                        onChange={() => handleAnswerChange(currentQuestion.question.id, { alternative_id: alternative.id })}
                        className="w-4 h-4"
                      />
                      <span>{alternative.texto}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question.tipo_questao === 'texto_livre' && (
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-lg"
                  placeholder="Digite sua resposta aqui..."
                  value={answers[currentQuestion.question.id]?.resposta_texto || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.question.id, { resposta_texto: e.target.value })}
                />
              )}

              {currentQuestion.question.tipo_questao === 'numerico' && (
                <input
                  type="number"
                  className="w-full p-3 border rounded-lg"
                  placeholder="Digite um número..."
                  value={answers[currentQuestion.question.id]?.resposta_numerica || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.question.id, { resposta_numerica: parseFloat(e.target.value) || undefined })}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navegação */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1} de {questions.length}
          </div>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Finalizar Prova'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
            >
              Próxima
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </RequirePage>
  );
}
