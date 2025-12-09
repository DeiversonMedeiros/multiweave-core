import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Ban, 
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  Building2
} from 'lucide-react';
import { Approval } from '@/services/approvals/approvalService';
import { RequisicaoCompraDetails } from './RequisicaoCompraDetails';

interface ApprovalModalProps {
  approval: Approval | null;
  isOpen: boolean;
  onClose: () => void;
  onProcess: (status: 'aprovado' | 'rejeitado' | 'cancelado', observacoes: string) => void;
  isLoading?: boolean;
}

export function ApprovalModal({ approval, isOpen, onClose, onProcess, isLoading }: ApprovalModalProps) {
  const [observacoes, setObservacoes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'aprovado' | 'rejeitado' | 'cancelado' | null>(null);

  const handleProcess = (status: 'aprovado' | 'rejeitado' | 'cancelado') => {
    setSelectedAction(status);
  };

  const handleConfirm = () => {
    if (selectedAction) {
      onProcess(selectedAction, observacoes);
      setObservacoes('');
      setSelectedAction(null);
    }
  };

  const handleClose = () => {
    setObservacoes('');
    setSelectedAction(null);
    onClose();
  };

  const getProcessoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'conta_pagar': 'Contas a Pagar',
      'requisicao_compra': 'Requisições de Compra',
      'cotacao_compra': 'Cotações de Compra',
      'solicitacao_saida_material': 'Saídas de Materiais',
      'solicitacao_transferencia_material': 'Transferências de Materiais'
    };
    return labels[tipo] || tipo;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!approval) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processar Aprovação
          </DialogTitle>
          <DialogDescription>
            Analise os detalhes e decida sobre esta aprovação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Aprovação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Processo</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{getProcessoLabel(approval.processo_tipo)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Nível</Label>
              <Badge variant="outline">Nível {approval.nivel_aprovacao}</Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Status Atual</Label>
              <Badge className={getStatusColor(approval.status)}>
                {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{new Date(approval.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Detalhes da Requisição de Compra */}
          {approval.processo_tipo === 'requisicao_compra' && (
            <div className="border-t pt-6">
              <RequisicaoCompraDetails requisicaoId={approval.processo_id} />
            </div>
          )}

          {/* Transferência de Aprovação */}
          {approval.transferido_em && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Aprovação Transferida</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Transferida em {new Date(approval.transferido_em).toLocaleDateString('pt-BR')}
              </p>
              {approval.motivo_transferencia && (
                <p className="text-sm text-blue-600 mt-1">
                  <strong>Motivo:</strong> {approval.motivo_transferencia}
                </p>
              )}
            </div>
          )}

          {/* Ações Disponíveis */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Escolha uma ação:</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Aprovar */}
              <Button
                variant={selectedAction === 'aprovado' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedAction === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                onClick={() => handleProcess('aprovado')}
              >
                <CheckCircle className="h-6 w-6" />
                <span className="font-medium">Aprovar</span>
                <span className="text-xs text-center">
                  Aprova e segue para o próximo nível
                </span>
              </Button>

              {/* Rejeitar */}
              <Button
                variant={selectedAction === 'rejeitado' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedAction === 'rejeitado' ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
                onClick={() => handleProcess('rejeitado')}
              >
                <XCircle className="h-6 w-6" />
                <span className="font-medium">Rejeitar</span>
                <span className="text-xs text-center">
                  Interrompe o fluxo e finaliza
                </span>
              </Button>

              {/* Cancelar */}
              <Button
                variant={selectedAction === 'cancelado' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedAction === 'cancelado' ? 'bg-gray-600 hover:bg-gray-700' : ''
                }`}
                onClick={() => handleProcess('cancelado')}
              >
                <Ban className="h-6 w-6" />
                <span className="font-medium">Cancelar</span>
                <span className="text-xs text-center">
                  Interrompe e desabilita edições
                </span>
              </Button>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">
              Observações {selectedAction === 'rejeitado' || selectedAction === 'cancelado' ? '*' : ''}
            </Label>
            <Textarea
              id="observacoes"
              placeholder={
                selectedAction === 'rejeitado' || selectedAction === 'cancelado'
                  ? "Obrigatório: Explique o motivo da rejeição/cancelamento..."
                  : "Adicione observações sobre sua decisão (opcional)..."
              }
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
            {(selectedAction === 'rejeitado' || selectedAction === 'cancelado') && !observacoes.trim() && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Observações são obrigatórias para rejeitar ou cancelar
              </p>
            )}
          </div>

          {/* Aviso sobre Cancelamento */}
          {selectedAction === 'cancelado' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Atenção: Cancelamento</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Ao cancelar esta aprovação, a solicitação será marcada como cancelada e 
                <strong> não poderá mais ser editada</strong>. Esta ação é irreversível.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedAction || isLoading || (selectedAction !== 'aprovado' && !observacoes.trim())}
            className={
              selectedAction === 'aprovado' ? 'bg-green-600 hover:bg-green-700' :
              selectedAction === 'rejeitado' ? 'bg-red-600 hover:bg-red-700' :
              selectedAction === 'cancelado' ? 'bg-gray-600 hover:bg-gray-700' : ''
            }
          >
            {isLoading ? 'Processando...' : 'Confirmar Ação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
