import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  User, 
  CheckCircle, 
  ArrowRight, 
  Building2, 
  DollarSign,
  Loader2
} from 'lucide-react';
import { Approval } from '@/services/approvals/approvalService';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCotacaoApprovalInfo } from '@/hooks/approvals/useCotacaoApprovalInfo';

interface CotacaoApprovalCardProps {
  approval: Approval;
  onProcess: (approval: Approval) => void;
  onTransfer: (approval: Approval) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (approval: Approval) => string;
}

export function CotacaoApprovalCard({
  approval,
  onProcess,
  onTransfer,
  getStatusColor,
  getPriorityColor
}: CotacaoApprovalCardProps) {
  const { data: cotacaoInfo, isLoading } = useCotacaoApprovalInfo(
    approval.processo_tipo === 'cotacao_compra' ? approval.processo_id : undefined
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  return (
    <Card className={getPriorityColor(approval)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4" />
            <div>
              <CardTitle className="text-lg">
                Cotações de Compra
              </CardTitle>
              <CardDescription>
                Nível {approval.nivel_aprovacao} • 
                Criado em {new Date(approval.created_at).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(approval.status)}>
              {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
            </Badge>
            {approval.transferido_em && (
              <Badge variant="outline" className="text-blue-600">
                Transferida
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando informações...</span>
              </div>
            ) : cotacaoInfo ? (
              <>
                {cotacaoInfo.numero_cotacao && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Número da Cotação:</span>
                    <span className="font-medium">{cotacaoInfo.numero_cotacao}</span>
                  </div>
                )}
                {cotacaoInfo.comprador_nome && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Comprador:</span>
                    <span className="font-medium">{cotacaoInfo.comprador_nome}</span>
                  </div>
                )}
                {(cotacaoInfo.valor_final !== undefined || cotacaoInfo.valor_total !== undefined) && (cotacaoInfo.valor_final ?? cotacaoInfo.valor_total ?? 0) >= 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor Final:</span>
                    <span className="font-semibold text-lg">{formatCurrency(cotacaoInfo.valor_final ?? cotacaoInfo.valor_total ?? 0)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>ID da Solicitação: {approval.processo_id?.slice(0, 8) || 'N/A'}...</span>
              </div>
            )}
            {approval.transferido_em && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <ArrowRight className="h-4 w-4" />
                <span>Transferida em {new Date(approval.transferido_em).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <PermissionButton
              page="/portal-gestor/aprovacoes*"
              action="edit"
              variant="outline"
              size="sm"
              onClick={() => onProcess(approval)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Processar
            </PermissionButton>
            <PermissionButton
              page="/portal-gestor/aprovacoes*"
              action="edit"
              variant="outline"
              size="sm"
              onClick={() => onTransfer(approval)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Transferir
            </PermissionButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CotacaoApprovalCard;
