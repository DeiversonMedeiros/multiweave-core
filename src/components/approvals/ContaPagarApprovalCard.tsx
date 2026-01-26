import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  User, 
  CheckCircle, 
  ArrowRight, 
  Building2, 
  FolderOpen, 
  FileText,
  Loader2
} from 'lucide-react';
import { Approval } from '@/services/approvals/approvalService';
import { PermissionButton } from '@/components/PermissionGuard';
import { useContaPagarApprovalInfo } from '@/hooks/approvals/useContaPagarApprovalInfo';

interface ContaPagarApprovalCardProps {
  approval: Approval;
  onProcess: (approval: Approval) => void;
  onTransfer: (approval: Approval) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (approval: Approval) => string;
}

export function ContaPagarApprovalCard({
  approval,
  onProcess,
  onTransfer,
  getStatusColor,
  getPriorityColor
}: ContaPagarApprovalCardProps) {
  const { data: contaInfo, isLoading } = useContaPagarApprovalInfo(
    approval.processo_tipo === 'conta_pagar' ? approval.processo_id : undefined
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className={getPriorityColor(approval)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4" />
            <div>
              <CardTitle className="text-lg">
                Contas a Pagar
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
            ) : contaInfo ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Número:</span>
                  <span className="font-medium">{contaInfo.numero_titulo}</span>
                </div>
                {contaInfo.fornecedor_nome && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="font-medium">{contaInfo.fornecedor_nome}</span>
                  </div>
                )}
                {contaInfo.centro_custo_nome && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Centro de Custo:</span>
                    <span className="font-medium">{contaInfo.centro_custo_nome}</span>
                  </div>
                )}
                {contaInfo.projeto_nome && (
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Projeto:</span>
                    <span className="font-medium">{contaInfo.projeto_nome}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-lg">{formatCurrency(contaInfo.valor_atual)}</span>
                </div>
                {contaInfo.created_by_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado por:</span>
                    <span className="font-medium">{contaInfo.created_by_name}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>ID: {approval.processo_id?.slice(0, 8) || 'N/A'}...</span>
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

