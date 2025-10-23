import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { DisciplinaryAction } from '@/integrations/supabase/rh-types';
import { formatDate, getActionTypeLabel, getActionTypeColor, getSeverityLabel, getSeverityColor } from '@/services/rh/disciplinaryActionsService';

interface DisciplinaryActionApprovalProps {
  action: DisciplinaryAction;
  onApprove: (id: string, comments: string) => void;
  onReject: (id: string, comments: string) => void;
  isLoading?: boolean;
}

export function DisciplinaryActionApproval({ 
  action, 
  onApprove, 
  onReject, 
  isLoading = false 
}: DisciplinaryActionApprovalProps) {
  const [comments, setComments] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(action.id, comments);
      setComments('');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(action.id, comments);
      setComments('');
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = !action.aprovado_por && action.status === 'active';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aprovação de Ação Disciplinar
          </CardTitle>
          <Badge className={getActionTypeColor(action.tipo_acao)}>
            {getActionTypeLabel(action.tipo_acao)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informações da Ação */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Funcionário:</span>
              <span>{action.employee_id}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data da Ocorrência:</span>
              <span>{formatDate(action.data_ocorrencia)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data de Aplicação:</span>
              <span>{formatDate(action.data_aplicacao)}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Gravidade:</span>
              <Badge className={getSeverityColor(action.gravidade)}>
                {getSeverityLabel(action.gravidade)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={isPending ? "secondary" : "default"}>
                {isPending ? "Pendente de Aprovação" : "Aprovado"}
              </Badge>
            </div>
            
            {action.aplicado_por && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Aplicado por:</span>
                <span>{action.aplicado_por}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes da Ação */}
        <div className="space-y-4">
          <div>
            <Label className="font-medium">Motivo:</Label>
            <p className="text-sm text-muted-foreground mt-1">{action.motivo}</p>
          </div>
          
          <div>
            <Label className="font-medium">Descrição da Ocorrência:</Label>
            <p className="text-sm text-muted-foreground mt-1">{action.descricao_ocorrencia}</p>
          </div>
          
          {action.medidas_corretivas && (
            <div>
              <Label className="font-medium">Medidas Corretivas:</Label>
              <p className="text-sm text-muted-foreground mt-1">{action.medidas_corretivas}</p>
            </div>
          )}

          {/* Campos específicos para suspensões */}
          {action.tipo_acao === 'suspensao' && (
            <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted rounded-lg">
              <div>
                <Label className="font-medium">Duração:</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {action.duration_days} dia(s)
                </p>
              </div>
              {action.start_date && (
                <div>
                  <Label className="font-medium">Data de Início:</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(action.start_date)}
                  </p>
                </div>
              )}
              {action.end_date && (
                <div>
                  <Label className="font-medium">Data de Fim:</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(action.end_date)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Área de Aprovação */}
        {isPending && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Aguardando Aprovação</span>
            </div>
            
            <div>
              <Label htmlFor="approval-comments">Comentários da Aprovação:</Label>
              <Textarea
                id="approval-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Adicione comentários sobre a aprovação ou rejeição..."
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={isLoading || isApproving}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isApproving ? 'Aprovando...' : 'Aprovar'}
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading || isRejecting}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                {isRejecting ? 'Rejeitando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        )}

        {/* Status de Aprovação */}
        {action.aprovado_por && (
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Aprovado por {action.aprovado_por} em {action.data_aprovacao ? formatDate(action.data_aprovacao) : 'N/A'}
            </span>
          </div>
        )}

        {/* Observações */}
        {action.observacoes && (
          <div>
            <Label className="font-medium">Observações:</Label>
            <p className="text-sm text-muted-foreground mt-1">{action.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
