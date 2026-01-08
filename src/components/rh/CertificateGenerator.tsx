import React, { useState } from 'react';
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

  const employees = employeesData?.data || [];
  const training = trainings.find(t => t.id === trainingId);
  const employee = employees.find((e: any) => e.id === employeeId);

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
    if (!selectedCompany?.id) return;

    setGenerating(true);
    try {
      // Gerar número do certificado
      const certificateNumber = generateCertificateNumber(trainingId, employeeId);

      // Buscar nota final e progresso (se disponível)
      // Por enquanto, vamos usar valores padrão
      const notaFinal = undefined; // Seria buscado do banco
      const percentualPresenca = 100; // Seria calculado

      // Salvar certificado no banco
      await saveCertificate(selectedCompany.id, {
        training_id: trainingId,
        employee_id: employeeId,
        numero_certificado: certificateNumber,
        nota_final: notaFinal,
        percentual_presenca_final: percentualPresenca
      });

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
        score: notaFinal
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



