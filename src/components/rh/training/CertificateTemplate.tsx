import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Award,
  Calendar,
  User,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Building,
  Mail,
  Hash
} from 'lucide-react';
import { useCertificate } from '@/hooks/rh/useCertificate';

interface CertificateTemplateProps {
  certificateId: string;
  onEdit: (certificate: any) => void;
  onBack: () => void;
}

interface TrainingCertificate {
  id: string;
  enrollment_id: string;
  data_emissao: string;
  url_certificado?: string;
  hash_verificacao: string;
  nota_final?: number;
  observacoes?: string;
  is_valid: boolean;
  data_validade?: string;
  created_at: string;
  updated_at: string;
  enrollment?: {
    id: string;
    training_id: string;
    employee_id: string;
    status: string;
    training?: {
      id: string;
      nome: string;
      data_inicio: string;
      data_fim?: string;
      local?: string;
      carga_horaria: number;
      instrutor?: string;
    };
    employee?: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
      cpf?: string;
    };
  };
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({ 
  certificateId, 
  onEdit, 
  onBack 
}) => {
  const { selectedCompany } = useCompany();
  const { certificates, isLoading, validateCertificate } = useCertificate(selectedCompany?.id || '');
  const [certificate, setCertificate] = useState<TrainingCertificate | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Buscar certificado
  React.useEffect(() => {
    if (certificates && certificateId) {
      const foundCertificate = certificates.find(c => c.id === certificateId);
      setCertificate(foundCertificate || null);
    }
  }, [certificates, certificateId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (isValid: boolean, dataValidade?: string) => {
    if (!isValid) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }

    if (dataValidade && new Date(dataValidade) < new Date()) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }

    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = (isValid: boolean, dataValidade?: string) => {
    if (!isValid) {
      return 'Inválido';
    }

    if (dataValidade && new Date(dataValidade) < new Date()) {
      return 'Expirado';
    }

    return 'Válido';
  };

  const getStatusColor = (isValid: boolean, dataValidade?: string) => {
    if (!isValid) {
      return 'destructive';
    }

    if (dataValidade && new Date(dataValidade) < new Date()) {
      return 'secondary';
    }

    return 'default';
  };

  const handleDownload = () => {
    if (certificate?.url_certificado) {
      window.open(certificate.url_certificado, '_blank');
    } else {
      // Gerar PDF do certificado
      console.log('Gerar PDF para:', certificate?.id);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Certificado - ${certificate?.enrollment?.training?.nome}`,
        text: `Certificado de conclusão do treinamento ${certificate?.enrollment?.training?.nome}`,
        url: window.location.href
      });
    } else {
      // Copiar link para área de transferência
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleValidate = async () => {
    if (!certificate) return;

    setIsValidating(true);
    try {
      const result = await validateCertificate(certificate.hash_verificacao);
      setValidationResult(result);
    } catch (error) {
      console.error('Erro ao validar certificado:', error);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Certificado não encontrado</p>
            <Button variant="outline" onClick={onBack} className="mt-4">
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isExpired = certificate.data_validade && new Date(certificate.data_validade) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Certificado</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={getStatusColor(certificate.is_valid, certificate.data_validade)}>
                {getStatusText(certificate.is_valid, certificate.data_validade)}
              </Badge>
              {isExpired && (
                <Badge variant="outline">Expirado</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
          <Button variant="outline" onClick={() => onEdit(certificate)}>
            <FileText className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Certificado Visual */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
            <div className="max-w-4xl mx-auto">
              {/* Cabeçalho */}
              <div className="text-center mb-8">
                <Award className="h-20 w-20 mx-auto text-blue-600 mb-4" />
                <h1 className="text-4xl font-bold text-gray-800 mb-2">CERTIFICADO</h1>
                <p className="text-xl text-gray-600">de Conclusão de Treinamento</p>
              </div>

              {/* Conteúdo Principal */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <div className="text-center">
                  <p className="text-lg text-gray-600 mb-6">
                    Certificamos que
                  </p>
                  
                  {/* Nome do Funcionário */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
                    <h2 className="text-3xl font-bold">
                      {certificate.enrollment?.employee?.nome}
                    </h2>
                    {certificate.enrollment?.employee?.cargo && (
                      <p className="text-lg opacity-90 mt-2">
                        {certificate.enrollment.employee.cargo}
                      </p>
                    )}
                  </div>

                  <p className="text-lg text-gray-600 mb-6">
                    concluiu com sucesso o treinamento
                  </p>

                  {/* Informações do Treinamento */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {certificate.enrollment?.training?.nome}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Início: {formatDate(certificate.enrollment?.training?.data_inicio || '')}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Carga: {certificate.enrollment?.training?.carga_horaria}h</span>
                      </div>
                      {certificate.enrollment?.training?.local && (
                        <div className="flex items-center justify-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{certificate.enrollment.training.local}</span>
                        </div>
                      )}
                      {certificate.enrollment?.training?.instrutor && (
                        <div className="flex items-center justify-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Instrutor: {certificate.enrollment.training.instrutor}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nota Final */}
                  {certificate.nota_final && certificate.nota_final > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                      <p className="text-lg text-gray-700">
                        Nota Final: <span className="font-bold text-2xl text-yellow-700">{certificate.nota_final}</span>
                      </p>
                    </div>
                  )}

                  {/* Data de Emissão e Validade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Emitido em: {formatDate(certificate.data_emissao)}</span>
                    </div>
                    {certificate.data_validade && (
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Válido até: {formatDate(certificate.data_validade)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé com Hash de Verificação */}
              <div className="text-center">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Hash de Verificação</p>
                  <div className="font-mono text-xs text-gray-600 bg-gray-100 rounded px-3 py-2 inline-block">
                    {certificate.hash_verificacao}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="mt-3"
                  >
                    {isValidating ? 'Validando...' : 'Verificar Autenticidade'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado da Validação */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Certificado Válido
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Certificado Inválido
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult ? (
              <div className="text-green-600">
                <p>Este certificado é autêntico e foi emitido pelo sistema.</p>
                <p className="text-sm mt-2">
                  Funcionário: {validationResult.enrollment?.employee?.nome}
                </p>
                <p className="text-sm">
                  Treinamento: {validationResult.enrollment?.training?.nome}
                </p>
              </div>
            ) : (
              <div className="text-red-600">
                <p>Este certificado não foi encontrado ou é inválido.</p>
                <p className="text-sm mt-2">
                  Verifique o hash de verificação ou entre em contato com o suporte.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {certificate.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{certificate.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CertificateTemplate;
