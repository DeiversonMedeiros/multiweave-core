import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Check, 
  X, 
  Ban, 
  AlertTriangle,
  User,
  Calendar,
  Mail
} from 'lucide-react';

interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  data_inscricao: string;
  status: 'inscrito' | 'aprovado' | 'rejeitado' | 'cancelado';
  observacoes?: string;
  justificativa_cancelamento?: string;
  created_at: string;
  updated_at: string;
  training?: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim?: string;
    local?: string;
    vagas_totais: number;
    vagas_disponiveis: number;
  };
  employee?: {
    id: string;
    nome: string;
    email: string;
    cargo?: string;
    departamento?: string;
  };
}

interface EnrollmentActionsProps {
  enrollment: TrainingEnrollment;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCancel: (reason: string) => void;
  onClose: () => void;
}

const EnrollmentActions: React.FC<EnrollmentActionsProps> = ({
  enrollment,
  onApprove,
  onReject,
  onCancel,
  onClose
}) => {
  const [action, setAction] = useState<'reject' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (actionType: 'approve' | 'reject' | 'cancel') => {
    if (actionType === 'approve') {
      onApprove();
      onClose();
    } else {
      setAction(actionType);
    }
  };

  const handleConfirmAction = async () => {
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      if (action === 'reject') {
        onReject(reason);
      } else if (action === 'cancel') {
        onCancel(reason);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inscrito': return 'text-blue-600 bg-blue-100';
      case 'aprovado': return 'text-green-600 bg-green-100';
      case 'rejeitado': return 'text-red-600 bg-red-100';
      case 'cancelado': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'inscrito': return 'Inscrito';
      case 'aprovado': return 'Aprovado';
      case 'rejeitado': return 'Rejeitado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <>
      <Dialog open={!action} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ações da Inscrição
            </DialogTitle>
            <DialogDescription>
              Escolha uma ação para a inscrição de {enrollment.employee?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da Inscrição */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Detalhes da Inscrição</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{enrollment.employee?.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{enrollment.employee?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Inscrito em: {formatDate(enrollment.data_inscricao)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Treinamento:</span>
                  <span>{enrollment.training?.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(enrollment.status)}`}>
                    {getStatusText(enrollment.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Disponíveis */}
            <div className="space-y-2">
              <h4 className="font-medium">Ações Disponíveis</h4>
              
              {enrollment.status === 'inscrito' && (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleAction('approve')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Aprovar Inscrição
                  </Button>
                  
                  <Button
                    onClick={() => handleAction('reject')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Rejeitar Inscrição
                  </Button>
                </div>
              )}

              {(enrollment.status === 'aprovado' || enrollment.status === 'inscrito') && (
                <Button
                  onClick={() => handleAction('cancel')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Ban className="h-4 w-4 mr-2 text-orange-600" />
                  Cancelar Inscrição
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação com Justificativa */}
      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'reject' ? (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  Rejeitar Inscrição
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-orange-600" />
                  Cancelar Inscrição
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {action === 'reject' 
                ? 'Informe o motivo da rejeição da inscrição:'
                : 'Informe o motivo do cancelamento da inscrição:'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                {action === 'reject' ? 'Motivo da Rejeição' : 'Motivo do Cancelamento'} *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Digite o motivo da ${action === 'reject' ? 'rejeição' : 'cancelamento'}...`}
                rows={4}
                className="resize-none"
              />
            </div>

            {action && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Atenção:</p>
                    <p>
                      Esta ação {action === 'reject' ? 'rejeitará' : 'cancelará'} a inscrição de{' '}
                      <strong>{enrollment.employee?.nome}</strong> no treinamento{' '}
                      <strong>{enrollment.training?.nome}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAction(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={!reason.trim() || isSubmitting}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting ? 'Processando...' : action === 'reject' ? 'Rejeitar' : 'Cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnrollmentActions;
