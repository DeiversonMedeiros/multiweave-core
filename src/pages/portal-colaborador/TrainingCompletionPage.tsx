import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Award,
  CheckCircle,
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { OnlineTrainingService, Training } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { RequirePage } from '@/components/RequireAuth';
import { useTraining } from '@/hooks/rh/useTraining';
import { 
  generateCertificateNumber, 
  saveCertificate, 
  downloadCertificate,
  CertificateData 
} from '@/services/rh/certificateService';
import { useTrainingProgress } from '@/hooks/rh/useOnlineTraining';

export default function TrainingCompletionPage() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [certificateExists, setCertificateExists] = useState(false);
  const [examStats, setExamStats] = useState<{
    hasExam: boolean;
    percentCorrect?: number;
    correctCount?: number;
    totalQuestions?: number;
    notaFinal?: number;
  } | null>(null);
  const { trainings } = useTraining();
  const currentTraining = trainings.find(t => t.id === trainingId);
  
  const location = useLocation();
  const locationState = (location.state || {}) as { trainingCompanyId?: string };
  const effectiveCompanyId = locationState.trainingCompanyId || selectedCompany?.id || null;

  // Buscar employee_id do usuário
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  // Buscar progresso e estatísticas do treinamento
  const { stats } = useTrainingProgress(trainingId || '', employeeId || '', effectiveCompanyId || undefined);

  // Verificar se já existe certificado
  useEffect(() => {
    const checkCertificate = async () => {
      if (!effectiveCompanyId || !trainingId || !employeeId) return;
      
      try {
        console.log('[TrainingCompletionPage] Verificando certificado existente', {
          companyId: effectiveCompanyId,
          trainingId,
          employeeId
        });

        const { EntityService } = await import('@/services/generic/entityService');
        const result = await EntityService.list({
          schema: 'rh',
          table: 'training_certificates',
          companyId: effectiveCompanyId,
          filters: {
            training_id: trainingId,
            employee_id: employeeId
          }
        });
        
        setCertificateExists(result.data.length > 0);
      } catch (err) {
        console.error('Erro ao verificar certificado:', err);
      } finally {
        setLoading(false);
      }
    };

    checkCertificate();
  }, [effectiveCompanyId, trainingId, employeeId]);

  // Carregar estatísticas da prova final (quantidade e % de acerto)
  useEffect(() => {
    const loadExamStats = async () => {
      if (!effectiveCompanyId || !trainingId || !employeeId) return;

      try {
        console.log('[TrainingCompletionPage] Buscando estatísticas da prova final', {
          companyId: effectiveCompanyId,
          trainingId,
          employeeId
        });

        const exams = await OnlineTrainingService.listExams(effectiveCompanyId, trainingId);
        const finalExam = exams.find((e) => e.tipo_avaliacao === 'final' && e.is_active);
        if (!finalExam) {
          console.log('[TrainingCompletionPage] Nenhuma prova final encontrada para este treinamento');
          return;
        }

        const attempts = await OnlineTrainingService.listExamAttempts(
          effectiveCompanyId,
          finalExam.id,
          employeeId
        );

        if (!attempts || attempts.length === 0) {
          console.log('[TrainingCompletionPage] Nenhuma tentativa de prova encontrada');
          return;
        }

        // Preferir tentativa aprovada e finalizada; se não houver, pegar a última
        const approvedAttempt =
          attempts.find((a) => a.status === 'finalizado' && a.aprovado === true) || attempts[0];

        // Buscar respostas dessa tentativa para contar acertos
        const answers = await OnlineTrainingService.getExamAttemptAnswers(
          effectiveCompanyId,
          approvedAttempt.id
        );

        const totalQuestions = answers.length;
        const correctCount = answers.filter((a) => a.is_correct).length;

        console.log('[TrainingCompletionPage] Estatísticas da prova calculadas', {
          examId: finalExam.id,
          attemptId: approvedAttempt.id,
          totalQuestions,
          correctCount,
          percentCorrect: approvedAttempt.percentual_acerto,
          notaFinal: approvedAttempt.nota_final
        });

        setExamStats({
          hasExam: true,
          percentCorrect: approvedAttempt.percentual_acerto ?? undefined,
          correctCount,
          totalQuestions,
          notaFinal: approvedAttempt.nota_final ?? undefined
        });
      } catch (err) {
        console.error('[TrainingCompletionPage] Erro ao carregar estatísticas da prova:', err);
      }
    };

    loadExamStats();
  }, [effectiveCompanyId, trainingId, employeeId]);

  const handleBackToTrainings = () => {
    navigate('/portal-colaborador/treinamentos');
  };

  const handleDownloadCertificate = async () => {
    if (!effectiveCompanyId || !trainingId || !employeeId || !currentTraining || !employee) return;
    
    setGenerating(true);
    try {
      // Verificar se já existe certificado
      const { EntityService } = await import('@/services/generic/entityService');
      const existingResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId: effectiveCompanyId,
        filters: {
          training_id: trainingId,
          employee_id: employeeId
        }
      });

      let certificateNumber: string;
      let certificateId: string | undefined;

      if (existingResult.data.length > 0) {
        // Usar certificado existente
        const existing = existingResult.data[0];
        certificateNumber = existing.numero_certificado;
        certificateId = existing.id;
        console.log('[TrainingCompletionPage] Usando certificado existente:', certificateNumber);
      } else {
        // Gerar novo certificado
        certificateNumber = generateCertificateNumber(trainingId, employeeId);
        
        // Buscar nota final da prova (se houver)
        let notaFinal: number | undefined;
        try {
          const exams = await OnlineTrainingService.listExams(effectiveCompanyId, trainingId);
          const finalExam = exams.find(e => e.tipo_avaliacao === 'final' && e.is_active);
          if (finalExam) {
            const attempts = await OnlineTrainingService.listExamAttempts(
              effectiveCompanyId,
              finalExam.id,
              employeeId
            );
            const approvedAttempt = attempts.find(
              a => a.status === 'finalizado' && a.aprovado === true
            );
            if (approvedAttempt?.nota_final) {
              notaFinal = approvedAttempt.nota_final;
            }
          }
        } catch (err) {
          console.error('Erro ao buscar nota final:', err);
        }

        // Salvar certificado no banco
        const saved = await saveCertificate(effectiveCompanyId, {
          training_id: trainingId,
          employee_id: employeeId,
          numero_certificado: certificateNumber,
          nota_final: notaFinal,
          percentual_presenca_final: stats?.progress_percent || 100
        });
        
        certificateId = saved.id;
        setCertificateExists(true);
        console.log('[TrainingCompletionPage] Certificado criado:', certificateNumber);
      }

      // Preparar dados para o certificado
      const certificateData: CertificateData = {
        trainingId,
        employeeId,
        employeeName: employee.nome,
        trainingName: currentTraining.nome,
        completionDate: new Date().toISOString(),
        certificateNumber,
        companyName: selectedCompany?.razao_social || selectedCompany?.nome_fantasia || 'Empresa',
        hours: currentTraining.carga_horaria || 0,
        score: stats?.progress_percent
      };

      // Gerar e baixar certificado
      await downloadCertificate(certificateData);

      toast({
        title: 'Certificado gerado!',
        description: 'O certificado foi gerado e baixado com sucesso.',
      });
    } catch (err) {
      console.error('[TrainingCompletionPage] Erro ao gerar certificado:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao gerar certificado.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoadingEmployees || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
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

  return (
    <RequirePage pagePath="/portal-colaborador/treinamentos*" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToTrainings}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Treinamentos
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Award className="h-8 w-8 text-yellow-500" />
                Treinamento Concluído!
              </h1>
              <p className="text-muted-foreground mt-1">
                {currentTraining?.nome || 'Treinamento Online'}
              </p>
            </div>
          </div>
        </div>

        {/* Card de Conclusão */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-6 w-6" />
              Parabéns! Você concluiu o treinamento com sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium">Treinamento:</span>
                <span>{currentTraining?.nome || 'Treinamento Online'}</span>
              </div>
              
              {currentTraining?.descricao && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descrição:</p>
                  <p className="text-sm">{currentTraining.descricao}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="font-medium">Data de Conclusão:</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>

              {examStats?.hasExam && (
                <div className="mt-2 text-sm space-y-1">
                  <p className="font-medium">Desempenho na prova final:</p>
                  {examStats.correctCount !== undefined && examStats.totalQuestions !== undefined && (
                    <p>
                      {examStats.correctCount} de {examStats.totalQuestions} questões corretas
                    </p>
                  )}
                  {examStats.percentCorrect !== undefined && (
                    <p>Percentual de acerto: {examStats.percentCorrect.toFixed(2)}%</p>
                  )}
                  {examStats.notaFinal !== undefined && (
                    <p>Nota final: {examStats.notaFinal.toFixed(2)} pontos</p>
                  )}
                </div>
              )}
            </div>

            <Alert className="bg-green-100 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Você completou todas as aulas e foi aprovado na prova final. 
                O treinamento foi concluído com sucesso!
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleDownloadCertificate}
                variant="outline"
                className="flex-1"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {certificateExists ? 'Baixar Certificado' : 'Gerar e Baixar Certificado'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleBackToTrainings}
                className="flex-1"
              >
                Voltar para Treinamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequirePage>
  );
}
