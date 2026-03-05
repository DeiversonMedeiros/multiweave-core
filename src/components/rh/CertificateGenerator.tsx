import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Award, CheckCircle } from 'lucide-react';
import {
  generateCertificateNumber,
  downloadCertificate,
  saveCertificate,
  CertificateData
} from '@/services/rh/certificateService';
import { OnlineTrainingService } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { useTraining } from '@/hooks/rh/useTraining';
import { useEmployees } from '@/hooks/rh/useEmployees';

interface CertificateGeneratorProps {
  trainingId: string;
  employeeId: string;
  onCertificateGenerated?: () => void;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  trainingId,
  employeeId,
  onCertificateGenerated
}) => {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const { trainings, generateCertificate } = useTraining();
  const { data: employeesData } = useEmployees();
  const [generating, setGenerating] = useState(false);
  const [examStats, setExamStats] = useState<{
    hasExam: boolean;
    percentCorrect?: number;
    correctCount?: number;
    totalQuestions?: number;
    notaFinal?: number;
  } | null>(null);

  const employees = employeesData?.data || [];
  const training = trainings.find(t => t.id === trainingId);
  const employee = employees.find((e: any) => e.id === employeeId);

  useEffect(() => {
    const loadExamStats = async () => {
      if (!training || !employeeId || !selectedCompany?.id) return;

      try {
        const companyId = training.company_id || selectedCompany.id;

        const exams = await OnlineTrainingService.listExams(companyId, training.id);
        const finalExam = exams.find(
          (e) => e.tipo_avaliacao === 'final' && e.is_active
        );

        if (!finalExam) {
          return;
        }

        const attempts = await OnlineTrainingService.listExamAttempts(
          companyId,
          finalExam.id,
          employeeId
        );

        if (!attempts || attempts.length === 0) {
          return;
        }

        const approvedAttempt =
          attempts.find(
            (a) => a.status === 'finalizado' && a.aprovado === true
          ) || attempts[0];

        const answers = await OnlineTrainingService.getExamAttemptAnswers(
          companyId,
          approvedAttempt.id
        );

        const totalQuestions = answers.length;
        const correctCount = answers.filter((a) => a.is_correct).length;

        let percentCorrect =
          approvedAttempt.percentual_acerto !== undefined &&
          approvedAttempt.percentual_acerto !== null
            ? approvedAttempt.percentual_acerto
            : undefined;

        if (percentCorrect === undefined && totalQuestions > 0) {
          percentCorrect = (correctCount / totalQuestions) * 100;
        }

        setExamStats({
          hasExam: true,
          percentCorrect,
          correctCount,
          totalQuestions,
          notaFinal:
            approvedAttempt.nota_final !== undefined &&
            approvedAttempt.nota_final !== null
              ? approvedAttempt.nota_final
              : undefined
        });
      } catch (err) {
        console.error(
          '[CertificateGenerator] Erro ao carregar estatísticas da prova:',
          err
        );
      }
    };

    loadExamStats();
  }, [training?.id, training?.company_id, employeeId, selectedCompany?.id]);

  if (!training || !employee || !selectedCompany) {
    return (
      <Alert>
        <AlertDescription>
          Dados insuficientes para gerar certificado.
        </AlertDescription>
      </Alert>
    );
  }

  const handleGenerateCertificate = async () => {
    if (!selectedCompany?.id || !training) return;

    setGenerating(true);
    try {
      const companyId = training.company_id || selectedCompany.id;

      // Verificar se já existe certificado
      const { EntityService } = await import('@/services/generic/entityService');
      const existingResult = await EntityService.list({
        schema: 'rh',
        table: 'training_certificates',
        companyId,
        filters: {
          training_id: trainingId,
          employee_id: employeeId
        }
      });

      let certificateNumber: string;

      if (existingResult.data.length > 0) {
        // Usar certificado já existente
        const existing = existingResult.data[0] as any;
        certificateNumber = existing.numero_certificado;
      } else {
        // Gerar número do certificado
        certificateNumber = generateCertificateNumber(trainingId, employeeId);

        // Buscar nota final da prova (se tivermos nas estatísticas)
        const notaFinal = examStats?.notaFinal;
        const percentualPresenca = 100;

        // Salvar certificado no banco
        await saveCertificate(companyId, {
          training_id: trainingId,
          employee_id: employeeId,
          numero_certificado: certificateNumber,
          nota_final: notaFinal,
          percentual_presenca_final: percentualPresenca
        });
      }

      // Preparar dados para o certificado
      const certificateData: CertificateData = {
        trainingId,
        employeeId,
        employeeName: employee.nome,
        trainingName: training.nome,
        completionDate: new Date().toISOString(),
        certificateNumber,
        companyName: selectedCompany.razao_social || selectedCompany.nome_fantasia || 'Empresa',
        hours: training.carga_horaria || 0,
        score: examStats?.notaFinal
      };

      // Gerar e baixar certificado
      await downloadCertificate(certificateData);

      toast({
        title: 'Certificado gerado!',
        description: 'O certificado foi gerado e salvo com sucesso.',
      });

      if (onCertificateGenerated) {
        onCertificateGenerated();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao gerar certificado',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-500" />
              Certificado de Conclusão
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-4 w-4 mr-1" />
            Treinamento Concluído
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Parabéns, {employee.nome}!</strong>
            </p>
            <p className="text-sm text-gray-600">
              Você concluiu com sucesso o treinamento <strong>"{training.nome}"</strong>.
              Clique no botão abaixo para gerar e baixar seu certificado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Treinamento:</strong> {training.nome}
            </div>
            <div>
              <strong>Carga Horária:</strong> {training.carga_horaria || 0} horas
            </div>
            <div>
              <strong>Data de Conclusão:</strong> {new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Funcionário:</strong> {employee.nome}
            </div>
          </div>

          {examStats?.hasExam && (
            <div className="mt-2 text-sm space-y-1">
              <p className="font-medium">Resultado da prova final:</p>
              {examStats.correctCount !== undefined &&
                examStats.totalQuestions !== undefined && (
                  <p>
                    {examStats.correctCount} de {examStats.totalQuestions} questões
                    corretas
                  </p>
                )}
              {examStats.percentCorrect !== undefined && (
                <p>
                  Percentual de acerto:{' '}
                  {examStats.percentCorrect.toFixed(2)}%
                </p>
              )}
            </div>
          )}

          <Button
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Gerando certificado...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Gerar e Baixar Certificado
              </>
            )}
          </Button>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Nota:</strong> O certificado será gerado em formato HTML que pode ser impresso como PDF.
              Para gerar PDF diretamente, é necessário instalar as bibliotecas jsPDF e html2canvas.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};



