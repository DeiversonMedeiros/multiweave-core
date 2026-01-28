import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  User, 
  Stethoscope, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { MedicalCertificate } from '@/integrations/supabase/rh-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';

// =====================================================
// INTERFACE DO COMPONENTE
// =====================================================

interface MedicalCertificateCardProps {
  certificate: MedicalCertificate;
  onView?: (certificate: MedicalCertificate) => void;
  onApprove?: (certificate: MedicalCertificate) => void;
  onReject?: (certificate: MedicalCertificate) => void;
  onDownload?: (certificate: MedicalCertificate) => void;
  showActions?: boolean;
  isManager?: boolean;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const MedicalCertificateCard: React.FC<MedicalCertificateCardProps> = ({
  certificate,
  onView,
  onApprove,
  onReject,
  onDownload,
  showActions = true,
  isManager = false
}) => {
  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4" />;
      case 'pendente':
        return <Clock className="h-4 w-4" />;
      case 'em_andamento':
        return <AlertCircle className="h-4 w-4" />;
      case 'concluido':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  // Função para obter texto do tipo de atestado
  const getTipoText = (tipo: string) => {
    switch (tipo) {
      case 'medico':
        return 'Médico';
      case 'odontologico':
        return 'Odontológico';
      case 'psicologico':
        return 'Psicológico';
      default:
        return tipo;
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              Atestado {getTipoText(certificate.tipo_atestado)}
            </CardTitle>
          </div>
          <Badge className={getStatusColor(certificate.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(certificate.status)}
              {getStatusText(certificate.status)}
            </div>
          </Badge>
        </div>
        <CardDescription>
          {certificate.numero_atestado && `Nº ${certificate.numero_atestado}`}
          {certificate.employee?.nome && ` • ${certificate.employee.nome}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do Colaborador */}
        {certificate.employee && (
          <div className="space-y-2 pb-3 border-b">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-base">{certificate.employee.nome}</span>
            </div>
            {certificate.employee.matricula && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                <span>Matrícula: {certificate.employee.matricula}</span>
              </div>
            )}
          </div>
        )}

        {/* Informações do Médico */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{certificate.medico_nome || 'Não informado'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
            <span>CRM/CRMO: {certificate.crm_crmo || 'Não informado'}</span>
            {certificate.especialidade && (
              <>
                <span>•</span>
                <span>{certificate.especialidade}</span>
              </>
            )}
          </div>
        </div>

        {/* Período de Afastamento */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Período de Afastamento</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Início: {formatDateOnly(certificate.data_inicio)}</span>
            <span>Fim: {formatDateOnly(certificate.data_fim)}</span>
            <span className="font-medium text-blue-600">
              {certificate.dias_afastamento} dias
            </span>
          </div>
        </div>

        {/* Código CID */}
        {certificate.cid_codigo && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Código CID</div>
            <div className="text-sm text-muted-foreground">
              {certificate.cid_codigo}
              {certificate.cid_descricao && ` - ${certificate.cid_descricao}`}
            </div>
          </div>
        )}

        {/* Valor do Benefício */}
        {certificate.valor_beneficio > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Valor do Benefício</div>
            <div className="text-sm text-green-600 font-medium">
              {formatCurrency(certificate.valor_beneficio)}
            </div>
          </div>
        )}

        {/* Observações */}
        {certificate.observacoes && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Observações</div>
            <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
              {certificate.observacoes}
            </div>
          </div>
        )}

        {/* Informações de Aprovação */}
        {certificate.aprovado_por && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Aprovado por</div>
            <div className="text-sm text-muted-foreground">
              {certificate.aprovador?.nome || 'Usuário'}
              {certificate.aprovado_em && (
                <span className="ml-2">
                  em {formatDate(certificate.aprovado_em)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Anexos */}
        {certificate.attachments && certificate.attachments.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Anexos</div>
            <div className="flex flex-wrap gap-2">
              {certificate.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                >
                  <FileText className="h-3 w-3" />
                  {attachment.file_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {/* Botão Visualizar - sempre visível */}
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(certificate)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Visualizar
            </Button>
          )}

          {/* Outras ações - apenas quando showActions é true */}
          {showActions && (
            <>
              {onDownload && certificate.anexo_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(certificate)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}

              {/* Ações de gestor */}
              {isManager && certificate.status === 'pendente' && (
                <>
                  {onApprove && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onApprove(certificate)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onReject(certificate)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Data de Criação */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Criado em {formatDate(certificate.created_at)}
        </div>
      </CardContent>
    </Card>
  );
};

export default MedicalCertificateCard;
